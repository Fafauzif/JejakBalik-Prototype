import type { ExplorationState, WindowSession, ScenarioId, Language, Selection } from './types';
import { ACTION_GATE, GATE_TIMES, sessionKey } from './session';
import { assets, requests, explorationTemplates, world } from './fixtures';
import {
  addExplorationRequest,
  buildExplorationContext,
  createExplorationState,
  markBatchStarted,
} from './exploration';
export const SCHEMA_VERSION = 1;
export interface PersistedSession {
  schemaVersion: 1;
  scenarioId: ScenarioId;
  activeBatchId: string;
  activeWindowId: string;
  sessions: Record<string, WindowSession>;
  exploration: ExplorationState;
  locale: Language;
  quality: 'auto' | 'high' | 'low';
  speed: number;
  reducedMotion: boolean;
  selection: Selection;
  serviceTimezone: 'Asia/Jakarta';
  savedAt: string;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown, max = 300): v is string => typeof v === 'string' && v.length <= max;
const unique = (list: unknown[]) => new Set(list).size === list.length;
const canonicalJson = (value: unknown): string =>
  JSON.stringify(
    Array.isArray(value)
      ? value.map((item) => JSON.parse(canonicalJson(item)))
      : object(value)
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, JSON.parse(canonicalJson(value[key]))]),
          )
        : value,
  );
const date = (v: unknown): v is string =>
  text(v, 10) && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
const validScenario = (v: unknown) =>
  ['circular_day', 'battery_review', 'capacity_shift', 'exploration'].includes(v as string);
/** Imported JSON is a bounded data model. No functions, live review tokens, arbitrary entity IDs or capacity grants survive. */
export function validateImportedSession(
  value: unknown,
): { ok: true; session: PersistedSession } | { ok: false; reason: string } {
  try {
    if (!object(value) || value.schemaVersion !== SCHEMA_VERSION)
      return { ok: false, reason: 'unsupported_schema' };
    if (
      !validScenario(value.scenarioId) ||
      !text(value.activeBatchId, 60) ||
      !text(value.activeWindowId, 60) ||
      !object(value.sessions) ||
      !object(value.exploration)
    )
      return { ok: false, reason: 'invalid_session' };
    const exp = value.exploration;
    if (
      !Array.isArray(exp.batches) ||
      exp.batches.length > 6 ||
      !Array.isArray(exp.reservations) ||
      exp.reservations.length > 54 ||
      !finite(exp.requestCount) ||
      exp.requestCount < 0 ||
      exp.requestCount > 6
    )
      return { ok: false, reason: 'invalid_exploration' };
    const batchIds = new Set<string>(),
      assetIds = new Set<string>(),
      requestIds = new Set<string>();
    let requestCount = 0;
    let lastDate = '2026-10-20';
    for (const b of exp.batches) {
      if (
        !object(b) ||
        !text(b.id, 60) ||
        batchIds.has(b.id) ||
        typeof b.started !== 'boolean' ||
        !Array.isArray(b.requests) ||
        !Array.isArray(b.assets) ||
        !Array.isArray(b.windows) ||
        b.windows.length < 1 ||
        b.windows.length > 18 ||
        b.requests.length < 1 ||
        b.assets.length > 18
      )
        return { ok: false, reason: 'invalid_batch' };
      batchIds.add(b.id);
      requestCount += b.requests.length;
      const bAssets = new Map<string, Record<string, unknown>>();
      for (const a of b.assets) {
        if (
          !object(a) ||
          !text(a.id, 80) ||
          assetIds.has(a.id) ||
          !text(a.requestId, 80) ||
          !text(a.householdId, 80) ||
          !text(a.category, 30) ||
          !text(a.condition, 30) ||
          !Array.isArray(a.components)
        )
          return { ok: false, reason: 'invalid_asset' };
        const template = explorationTemplates.templates.find((t) => t.category === a.category);
        const disposition = template?.conditionToDisposition[a.condition];
        if (
          !template ||
          !disposition ||
          a.massKg !== template.massKg ||
          a.baseRecoveredValueIdr !== template.baseRecoveredValueIdr ||
          a.plannedDisposition !== disposition ||
          a.dataBearing !== template.dataBearing ||
          a.handlingClass !== template.handlingClass ||
          a.destinationId !== template.destinationByDisposition[disposition] ||
          JSON.stringify(a.components) !== JSON.stringify(template.components) ||
          a.initialStatus !== 'requested'
        )
          return { ok: false, reason: 'modified_template' };
        if (
          !world.households.some((h) => h.id === a.householdId) ||
          !text(a.routeId, 100) ||
          !text(a.scenarioRecordId, 100) ||
          !finite(a.collectionStorySecond) ||
          !finite(a.receivedStorySecond) ||
          !finite(a.catalogVariant) ||
          !['none', 'damaged', 'specialist'].includes(a.batteryRisk as string)
        )
          return { ok: false, reason: 'invalid_asset' };
        assetIds.add(a.id);
        bAssets.set(a.id, a);
      }
      for (const r of b.requests) {
        if (
          !object(r) ||
          !text(r.id, 80) ||
          requestIds.has(r.id) ||
          !Array.isArray(r.assetIds) ||
          r.assetIds.length < 1 ||
          r.assetIds.length > 3 ||
          !unique(r.assetIds) ||
          !r.assetIds.every((id) => typeof id === 'string' && bAssets.get(id)?.requestId === r.id) ||
          !text(r.addressAlias) ||
          !text(r.contactAlias) ||
          !date(r.date) ||
          r.timezone !== 'Asia/Jakarta' ||
          r.hero !== false ||
          r.initiallySubmitted !== true ||
          !text(r.pickupWindow, 40)
        )
          return { ok: false, reason: 'invalid_request' };
        requestIds.add(r.id);
      }
      const batchRequests = b.requests;
      if (
        [...bAssets.values()].some(
          (a) => !batchRequests.some((r: Record<string, unknown>) => r.id === a.requestId),
        )
      )
        return { ok: false, reason: 'missing_request' };
      const scheduled = new Set<string>();
      let previous = lastDate;
      for (const w of b.windows) {
        if (
          !object(w) ||
          !text(w.id, 60) ||
          !date(w.date) ||
          w.date <= previous ||
          !Array.isArray(w.assetIds) ||
          !w.assetIds.length ||
          !unique(w.assetIds) ||
          !w.assetIds.every((id) => typeof id === 'string' && bAssets.has(id) && !scheduled.has(id))
        )
          return { ok: false, reason: 'invalid_reservations' };
        previous = w.date;
        const counts: Record<string, number> = {},
          mass: Record<string, number> = {},
          dest: Record<string, number> = {};
        for (const id of w.assetIds as string[]) {
          scheduled.add(id);
          const a = bAssets.get(id)!;
          const c = a.handlingClass as 'ordinary' | 'bulky' | 'specialist';
          counts[c] = (counts[c] ?? 0) + 1;
          mass[c] = (mass[c] ?? 0) + (a.massKg as number);
          dest[a.destinationId as string] = (dest[a.destinationId as string] ?? 0) + 1;
          if (
            counts[c] > explorationTemplates.availableVehicleSlotsPerWindow[c] ||
            mass[c] > (c === 'bulky' ? 800 : 200)
          )
            return { ok: false, reason: 'capacity_exceeded' };
        }
        if (
          Object.entries(dest).some(
            ([id, n]) =>
              n > (explorationTemplates.availableDestinationSlotsPerWindow as Record<string, number>)[id],
          )
        )
          return { ok: false, reason: 'receiving_capacity_exceeded' };
        const reservation = exp.reservations.find(
          (r: unknown) => object(r) && r.batchId === b.id && r.windowId === w.id,
        );
        if (
          !object(reservation) ||
          reservation.date !== w.date ||
          JSON.stringify(reservation.assetIds) !== JSON.stringify(w.assetIds)
        )
          return { ok: false, reason: 'reservation_mismatch' };
      }
      if (scheduled.size !== bAssets.size) return { ok: false, reason: 'missing_allocation' };
      lastDate = previous;
    }
    if (
      requestCount !== exp.requestCount ||
      requestCount > 6 ||
      exp.reservations.length !==
        exp.batches.reduce((n: number, b: { windows: unknown[] }) => n + b.windows.length, 0)
    )
      return { ok: false, reason: 'request_limit' };
    // Reconstruct accepted templates and FIFO reservations; do not trust imported
    // physical fields, ID generation, date allocation, or a caller's claimed caps.
    let reconstructed = createExplorationState();
    for (const b of exp.batches as unknown as ExplorationState['batches']) {
      for (const request of b.requests) {
        const itemAssets = request.assetIds.map((id) => b.assets.find((a) => a.id === id)!);
        const result = addExplorationRequest(reconstructed, {
          items: itemAssets.map((a) => ({ category: a.category, condition: a.condition })),
          addressId: request.householdId,
          addressAlias: request.addressAlias,
          contactAlias: request.contactAlias,
        });
        if (!result.ok || result.batchId !== b.id || result.requestId !== request.id)
          return { ok: false, reason: 'invalid_creation_order' };
        reconstructed = result.state;
      }
      if (b.started) reconstructed = markBatchStarted(reconstructed, b.id);
      const rebuilt = reconstructed.batches.find((batch) => batch.id === b.id)!;
      if (canonicalJson(rebuilt) !== canonicalJson(b))
        return { ok: false, reason: 'invalid_allocated_batch' };
    }
    const cleanSessions: Record<string, WindowSession> = {};
    if (Object.keys(value.sessions).length > 60) return { ok: false, reason: 'too_many_sessions' };
    for (const [key, s] of Object.entries(value.sessions)) {
      if (
        !object(s) ||
        !validScenario(s.scenarioId) ||
        !text(s.batchId, 60) ||
        !text(s.windowId, 60) ||
        !finite(s.cursor) ||
        s.cursor < 0 ||
        s.cursor > 180 ||
        typeof s.paused !== 'boolean' ||
        !finite(s.revision) ||
        !Number.isInteger(s.revision) ||
        s.revision < 0 ||
        !Array.isArray(s.decisions) ||
        s.decisions.length > 3
      )
        return { ok: false, reason: 'invalid_window' };
      if (s.batchId === 'canonical') {
        if (s.scenarioId === 'exploration' || s.windowId !== '2026-10-19')
          return { ok: false, reason: 'invalid_context' };
      } else if (
        s.scenarioId !== 'exploration' ||
        !exp.batches.some(
          (b: Record<string, unknown>) =>
            b.id === s.batchId && (b.windows as Array<{ id: string }>).some((w) => w.id === s.windowId),
        )
      )
        return { ok: false, reason: 'missing_context' };
      const gates = new Set<string>();
      let previous = -1;
      for (const d of s.decisions) {
        if (
          !object(d) ||
          !text(d.id, 160) ||
          !text(d.action, 40) ||
          !Object.hasOwn(ACTION_GATE, d.action) ||
          d.scenarioId !== s.scenarioId ||
          d.batchId !== s.batchId ||
          d.windowId !== s.windowId
        )
          return { ok: false, reason: 'invalid_decision' };
        const gate = ACTION_GATE[d.action as keyof typeof ACTION_GATE];
        if (gates.has(gate) || d.atSecond !== GATE_TIMES[gate] || (d.atSecond as number) < previous)
          return { ok: false, reason: 'invalid_decision_time' };
        gates.add(gate);
        previous = d.atSecond as number;
      }
      if (s.scenarioId === 'exploration') {
        const batch = reconstructed.batches.find((b) => b.id === s.batchId)!;
        if ((s.cursor > 0 || s.decisions.length > 0) && !batch.started)
          return { ok: false, reason: 'unstarted_history' };
        const context = buildExplorationContext(reconstructed, s.batchId, s.windowId);
        if (
          s.decisions.some((d) => !context.gates.includes(ACTION_GATE[d.action as keyof typeof ACTION_GATE]))
        )
          return { ok: false, reason: 'irrelevant_decision' };
      }
      const clean = {
        scenarioId: s.scenarioId,
        batchId: s.batchId,
        windowId: s.windowId,
        cursor: s.cursor,
        paused: true,
        revision: s.revision,
        decisions: s.decisions,
        reviewToken: null,
      } as unknown as WindowSession;
      if (key !== sessionKey(clean)) return { ok: false, reason: 'session_key_mismatch' };
      cleanSessions[key] = clean;
    }
    const activeKey = sessionKey({
      scenarioId: value.scenarioId as ScenarioId,
      batchId: value.activeBatchId,
      windowId: value.activeWindowId,
    });
    if (!cleanSessions[activeKey]) return { ok: false, reason: 'missing_active_session' };
    let selection: Selection = null;
    if (
      object(value.selection) &&
      text(value.selection.id, 100) &&
      ['asset', 'route', 'household', 'agent', 'hub', 'partner', 'vehicle'].includes(
        value.selection.type as string,
      )
    )
      selection = value.selection as Selection;
    if (
      selection?.type === 'asset' &&
      !assets.some((a) => a.id === selection!.id) &&
      !assetIds.has(selection.id)
    )
      selection = null;
    if (
      selection?.type === 'household' &&
      !world.households.some((h) => h.id === selection!.id) &&
      !requests.some((r) => r.id === selection!.id)
    )
      selection = null;
    return {
      ok: true,
      session: {
        schemaVersion: 1,
        scenarioId: value.scenarioId as ScenarioId,
        activeBatchId: value.activeBatchId,
        activeWindowId: value.activeWindowId,
        sessions: cleanSessions,
        exploration: reconstructed,
        locale: value.locale === 'en' ? 'en' : 'id',
        quality: ['auto', 'high', 'low'].includes(value.quality as string)
          ? (value.quality as 'auto' | 'high' | 'low')
          : 'auto',
        speed:
          typeof value.speed === 'number' && [0.5, 1, 2, 5, 10, 30].includes(value.speed) ? value.speed : 1,
        reducedMotion: value.reducedMotion === true,
        selection,
        serviceTimezone: 'Asia/Jakarta',
        savedAt: typeof value.savedAt === 'string' ? value.savedAt : '',
      },
    };
  } catch {
    return { ok: false, reason: 'invalid_json_structure' };
  }
}
export function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
export function encodeCsv(rows: unknown[][]): string {
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
