import { useMemo } from 'react';
import { create } from 'zustand';
import { canonicalContext } from '../domain/context';
import { deriveSnapshot } from '../domain/engine';
import { JOURNEY_INTERACTIONS, nextProgressionTime, PLAYBACK_SPEEDS } from '../domain/playback';
import {
  GATE_TIMES,
  ACTION_GATE,
  makeSession,
  sessionKey,
  reviewGate as reviewSession,
  recordDecision,
} from '../domain/session';
import {
  addExplorationRequest,
  buildExplorationContext,
  createExplorationState,
  markBatchStarted,
} from '../domain/exploration';
import { validateImportedSession, encodeCsv, type PersistedSession } from '../domain/persistence';
import type {
  AssetSnapshot,
  DecisionAction,
  ExplorationState,
  ExplorationRequestInput,
  GateId,
  Language,
  RequestRecord,
  ScenarioId,
  Selection,
  Snapshot,
  WindowSession,
  ExplorationWindow,
} from '../domain/types';

type ActionResult = { ok: boolean; reason?: string; requestId?: string; batchId?: string };
export interface AdvanceResult {
  ok: boolean;
  reason?: 'checkpoint' | 'complete' | 'interaction';
  gate?: GateId;
  cursor: number;
}
export interface AppState {
  locale: Language;
  scenarioId: ScenarioId;
  cursor: number;
  paused: boolean;
  speed: number;
  quality: 'auto' | 'high' | 'low';
  selection: Selection;
  sceneMode: 'city' | 'hub' | 'device';
  journeyActive: boolean;
  journeyCuesAcknowledged: number[];
  reducedMotion: boolean;
  activeBatchId: string;
  activeWindowId: string;
  session: WindowSession;
  sessions: Record<string, WindowSession>;
  exploration: ExplorationState;
  restoreNotice: string | null;
  tick: (deltaSeconds: number) => void;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  advanceNext: (requestId?: string) => AdvanceResult;
  acknowledgeJourneyCue: (at: number) => void;
  setScenario: (scenarioId: ScenarioId) => void;
  reset: () => void;
  reviewGate: (gate: GateId) => void;
  decide: (action: DecisionAction) => ActionResult;
  submitHero: () => ActionResult;
  select: (selection: Selection) => void;
  setSceneMode: (mode: 'city' | 'hub' | 'device') => void;
  setLocale: (locale: Language) => void;
  setQuality: (quality: 'auto' | 'high' | 'low') => void;
  setSpeed: (speed: number) => void;
  setJourneyActive: (active: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  clearRestoreNotice: () => void;
  addRequest: (input: ExplorationRequestInput) => ActionResult;
  selectBatch: (batchId: string, windowId?: string) => void;
  resetExploration: () => void;
  importSession: (raw: unknown) => ActionResult;
}
export const STORAGE_KEY = 'jejak-balik.session.v1';
const initialSession = makeSession();
function initialData() {
  return {
    locale: 'id' as Language,
    scenarioId: 'circular_day' as ScenarioId,
    cursor: 0,
    paused: true,
    speed: 1,
    quality: 'auto' as const,
    selection: null,
    sceneMode: 'city' as const,
    journeyActive: false,
    journeyCuesAcknowledged: [] as number[],
    reducedMotion:
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    activeBatchId: 'canonical',
    activeWindowId: '2026-10-19',
    session: initialSession,
    sessions: { [sessionKey(initialSession)]: initialSession },
    exploration: createExplorationState(),
    restoreNotice: null as string | null,
  };
}
function contextFor(s: Pick<AppState, 'scenarioId' | 'activeBatchId' | 'activeWindowId' | 'exploration'>) {
  return s.activeBatchId === 'canonical'
    ? canonicalContext(s.scenarioId)
    : buildExplorationContext(s.exploration, s.activeBatchId, s.activeWindowId);
}
function commitSession(state: AppState, session: WindowSession): Partial<AppState> {
  return {
    session,
    cursor: session.cursor,
    paused: session.paused,
    scenarioId: session.scenarioId,
    activeBatchId: session.batchId,
    activeWindowId: session.windowId,
    sessions: { ...state.sessions, [sessionKey(session)]: session },
  };
}
function deactivate(state: AppState) {
  return {
    ...state.sessions,
    [sessionKey(state.session)]: {
      ...state.session,
      paused: true,
      reviewToken: null,
      revision: state.session.revision + 1,
    },
  };
}
function restoreData() {
  const defaults = initialData();
  try {
    if (typeof localStorage === 'undefined') return defaults;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const result = validateImportedSession(JSON.parse(raw));
    if (!result.ok) return { ...defaults, restoreNotice: 'recovered' };
    const saved = result.session;
    const session =
      saved.sessions[
        sessionKey({
          scenarioId: saved.scenarioId,
          batchId: saved.activeBatchId,
          windowId: saved.activeWindowId,
        })
      ];
    return {
      ...defaults,
      ...saved,
      session,
      cursor: session.cursor,
      paused: true,
      restoreNotice: 'restored',
    };
  } catch {
    return { ...defaults, restoreNotice: 'recovered' };
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  ...restoreData(),
  tick: (delta) => {
    const s = get();
    if (s.paused || !Number.isFinite(delta) || delta <= 0) return;
    if (typeof document !== 'undefined' && document.hidden) {
      get().pause();
      return;
    }
    const context = contextFor(s);
    const proposed = Math.min(180, s.cursor + Math.min(delta, 0.5) * s.speed);
    const gate = context.gates.find(
      (g) =>
        GATE_TIMES[g] >= s.cursor &&
        GATE_TIMES[g] <= proposed &&
        !s.session.decisions.some((d) => ACTION_GATE[d.action] === g),
    );
    const interaction = s.journeyActive
      ? JOURNEY_INTERACTIONS.find(
          (at) => at >= s.cursor && at <= proposed && !s.journeyCuesAcknowledged.includes(at),
        )
      : undefined;
    if (gate && (interaction === undefined || GATE_TIMES[gate] <= interaction)) {
      set(commitSession(s, reviewSession(gate, s.session)));
      return;
    }
    if (interaction !== undefined) {
      set(commitSession(s, { ...s.session, cursor: interaction, paused: true, reviewToken: null }));
      return;
    }
    set(commitSession(s, { ...s.session, cursor: proposed, paused: proposed >= 180, reviewToken: null }));
  },
  play: () => {
    const s = get();
    if (s.cursor >= 180) return;
    const context = contextFor(s);
    const unresolved = context.gates.find(
      (g) => GATE_TIMES[g] <= s.cursor && !s.session.decisions.some((d) => ACTION_GATE[d.action] === g),
    );
    if (unresolved) {
      set(commitSession(s, reviewSession(unresolved, s.session)));
      return;
    }
    const exploration =
      s.activeBatchId === 'canonical' ? s.exploration : markBatchStarted(s.exploration, s.activeBatchId);
    set({ ...commitSession(s, { ...s.session, paused: false, reviewToken: null }), exploration });
  },
  pause: () => {
    const s = get();
    set(commitSession(s, { ...s.session, paused: true }));
  },
  seek: (seconds) => {
    if (!Number.isFinite(seconds)) return;
    const s = get();
    const cursor = Math.min(180, Math.max(0, seconds));
    set({
      ...commitSession(s, {
        ...s.session,
        cursor,
        paused: true,
        reviewToken: null,
        revision: s.session.revision + 1,
      }),
      exploration:
        s.activeBatchId === 'canonical' || cursor === 0
          ? s.exploration
          : markBatchStarted(s.exploration, s.activeBatchId),
    });
  },
  acknowledgeJourneyCue: (at) =>
    set((state) => ({ journeyCuesAcknowledged: [...new Set([...state.journeyCuesAcknowledged, at])] })),
  advanceNext: (requestId) => {
    const s = get();
    const context = contextFor(s);
    const snapshot = snapshotForState(s);
    let target = nextProgressionTime(snapshot, requestId, s.journeyActive);
    const gate = context.gates.find(
      (candidate) =>
        GATE_TIMES[candidate] <= target &&
        !s.session.decisions.some((decision) => ACTION_GATE[decision.action] === candidate),
    );
    const interaction = s.journeyActive
      ? JOURNEY_INTERACTIONS.find(
          (at) => at >= s.cursor && at <= target && !s.journeyCuesAcknowledged.includes(at),
        )
      : undefined;
    if (gate && (interaction === undefined || GATE_TIMES[gate] <= interaction)) {
      get().reviewGate(gate);
      return { ok: false, reason: 'checkpoint', gate, cursor: GATE_TIMES[gate] };
    }
    if (interaction !== undefined) target = interaction;
    if (s.cursor >= 180 && !gate) return { ok: false, reason: 'complete', cursor: 180 };
    get().seek(target);
    return {
      ok: true,
      ...(interaction === undefined ? {} : { reason: 'interaction' as const }),
      cursor: target,
    };
  },
  setScenario: (scenarioId) => {
    if (scenarioId === 'exploration') return;
    const s = get();
    const sessions = deactivate(s);
    const key = sessionKey({ scenarioId, batchId: 'canonical', windowId: '2026-10-19' });
    const session = { ...(sessions[key] ?? makeSession(scenarioId)), paused: true, reviewToken: null };
    set({ ...commitSession({ ...s, sessions }, session), selection: null, sceneMode: 'city' });
  },
  reset: () => {
    const s = get();
    const session = makeSession(s.scenarioId, s.activeBatchId, s.activeWindowId);
    set({
      ...commitSession(s, session),
      selection: null,
      sceneMode: 'city',
      journeyActive: false,
      journeyCuesAcknowledged: [],
      restoreNotice: null,
    });
  },
  reviewGate: (gate) => {
    const s = get();
    if (!contextFor(s).gates.includes(gate)) return;
    set({
      ...commitSession(s, reviewSession(gate, s.session)),
      exploration:
        s.activeBatchId === 'canonical' ? s.exploration : markBatchStarted(s.exploration, s.activeBatchId),
    });
  },
  decide: (action) => {
    const s = get();
    if (!contextFor(s).gates.includes(ACTION_GATE[action])) return { ok: false, reason: 'needs_gate_review' };
    const result = recordDecision(action, s.session);
    if (result.ok) set(commitSession(s, result.session));
    return result.ok ? { ok: true } : result;
  },
  submitHero: () => get().decide('submit_hero'),
  select: (selection) => set({ selection }),
  setSceneMode: (sceneMode) => set({ sceneMode }),
  setLocale: (locale) => set({ locale }),
  setQuality: (quality) => set({ quality }),
  setSpeed: (speed) => {
    if ((PLAYBACK_SPEEDS as readonly number[]).includes(speed)) set({ speed });
  },
  setJourneyActive: (journeyActive) => set({ journeyActive }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  clearRestoreNotice: () => set({ restoreNotice: null }),
  addRequest: (input) => {
    const s = get();
    const result = addExplorationRequest(s.exploration, input);
    if (!result.ok) return result;
    set({ exploration: result.state });
    return { ok: true, requestId: result.requestId, batchId: result.batchId };
  },
  selectBatch: (batchId, windowId) => {
    const s = get();
    if (batchId === 'canonical') {
      get().setScenario(s.scenarioId === 'exploration' ? 'circular_day' : s.scenarioId);
      return;
    }
    const batch = s.exploration.batches.find((b) => b.id === batchId);
    const window = batch?.windows.find((w) => w.id === (windowId ?? batch.windows[0]?.id));
    if (!batch || !window) return;
    const sessions = deactivate(s);
    const key = sessionKey({ scenarioId: 'exploration', batchId, windowId: window.id });
    const session = {
      ...(sessions[key] ?? makeSession('exploration', batchId, window.id)),
      paused: true,
      reviewToken: null,
    };
    set({
      ...commitSession({ ...s, sessions }, session),
      selection: null,
      journeyActive: false,
      sceneMode: 'city',
    });
  },
  resetExploration: () => {
    const s = get();
    const sessions = Object.fromEntries(
      Object.entries(s.sessions).filter(([, session]) => session.batchId === 'canonical'),
    );
    const session =
      s.activeBatchId === 'canonical'
        ? { ...s.session, paused: true, reviewToken: null }
        : (sessions['circular_day/canonical/2026-10-19'] ?? makeSession());
    set({
      ...commitSession({ ...s, sessions }, session),
      exploration: createExplorationState(),
      selection: null,
    });
  },
  importSession: (raw) => {
    const result = validateImportedSession(raw);
    if (!result.ok) return result;
    const saved = result.session;
    const session =
      saved.sessions[
        sessionKey({
          scenarioId: saved.scenarioId,
          batchId: saved.activeBatchId,
          windowId: saved.activeWindowId,
        })
      ];
    set({
      ...saved,
      session,
      cursor: session.cursor,
      paused: true,
      journeyActive: false,
      sceneMode: 'city',
      restoreNotice: 'imported',
    });
    return { ok: true };
  },
}));

export function snapshotForState(
  state: Pick<AppState, 'session' | 'scenarioId' | 'activeBatchId' | 'activeWindowId' | 'exploration'>,
): Snapshot {
  const context = contextFor(state);
  return deriveSnapshot(
    context.seed,
    context.events,
    state.session.decisions,
    state.session.cursor,
    state.session.scenarioId,
    context,
  );
}
export function useSnapshot(): Snapshot {
  const session = useAppStore((s) => s.session),
    exploration = useAppStore((s) => s.exploration);
  return useMemo(
    () =>
      snapshotForState({
        session,
        exploration,
        scenarioId: session.scenarioId,
        activeBatchId: session.batchId,
        activeWindowId: session.windowId,
      }),
    [session, exploration],
  );
}

export interface RequestDirectoryEntry {
  request: RequestRecord;
  batchId: string;
  windows: ExplorationWindow[];
  assets: AssetSnapshot[];
  completed: number;
  total: number;
}
export function requestDirectory(
  state: Pick<AppState, 'sessions' | 'scenarioId' | 'exploration'>,
): RequestDirectoryEntry[] {
  const canonicalScenario = state.scenarioId === 'exploration' ? 'circular_day' : state.scenarioId;
  const canonicalSession =
    state.sessions[`${canonicalScenario}/canonical/2026-10-19`] ?? makeSession(canonicalScenario);
  const cc = canonicalContext(canonicalScenario);
  const canonical = deriveSnapshot(
    cc.seed,
    cc.events,
    canonicalSession.decisions,
    canonicalSession.cursor,
    canonicalScenario,
    cc,
  );
  const directory: RequestDirectoryEntry[] = canonical.requests.map((request) => {
    const items = request.assetIds.map((id) => canonical.assets[id]);
    return {
      request,
      batchId: 'canonical',
      windows: [{ id: '2026-10-19', date: request.date, assetIds: request.assetIds }],
      assets: items,
      completed: items.filter((a) => a.status === 'completed').length,
      total: items.length,
    };
  });
  for (const batch of state.exploration.batches) {
    const perAsset: Record<string, AssetSnapshot> = {};
    for (const window of batch.windows) {
      const session =
        state.sessions[`exploration/${batch.id}/${window.id}`] ??
        makeSession('exploration', batch.id, window.id);
      const context = buildExplorationContext(state.exploration, batch.id, window.id);
      const snapshot = deriveSnapshot(
        context.seed,
        context.events,
        session.decisions,
        session.cursor,
        'exploration',
        context,
      );
      window.assetIds.forEach((id) => {
        perAsset[id] = snapshot.assets[id];
      });
    }
    for (const request of batch.requests) {
      const items = request.assetIds.map((id) => perAsset[id]);
      directory.push({
        request,
        batchId: batch.id,
        windows: batch.windows.filter((w) => w.assetIds.some((id) => request.assetIds.includes(id))),
        assets: items,
        completed: items.filter((a) => a.status === 'completed').length,
        total: items.length,
      });
    }
  }
  return directory;
}
export function useRequestDirectory() {
  const sessions = useAppStore((s) => s.sessions),
    scenarioId = useAppStore((s) => s.scenarioId),
    exploration = useAppStore((s) => s.exploration);
  return useMemo(
    () => requestDirectory({ sessions, scenarioId, exploration }),
    [sessions, scenarioId, exploration],
  );
}
export function useRequestView(requestId: string) {
  return useRequestDirectory().find((entry) => entry.request.id === requestId);
}
export function serializeSession(state: AppState = useAppStore.getState()): PersistedSession {
  return {
    schemaVersion: 1,
    scenarioId: state.scenarioId,
    activeBatchId: state.activeBatchId,
    activeWindowId: state.activeWindowId,
    sessions: Object.fromEntries(
      Object.entries(state.sessions).map(([key, s]) => [key, { ...s, reviewToken: null }]),
    ),
    exploration: state.exploration,
    locale: state.locale,
    quality: state.quality,
    speed: state.speed,
    reducedMotion: state.reducedMotion,
    selection: state.selection,
    serviceTimezone: 'Asia/Jakarta',
    savedAt: new Date().toISOString(),
  };
}
export function exportSessionJson(): string {
  return JSON.stringify(serializeSession(), null, 2);
}
export function importSessionJson(raw: string): ActionResult {
  if (raw.length > 1_000_000) return { ok: false, reason: 'file_too_large' };
  try {
    return useAppStore.getState().importSession(JSON.parse(raw));
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }
}
export function exportAssetsCsv(snapshot: Snapshot = snapshotForState(useAppStore.getState())): string {
  return encodeCsv([
    [
      'batch_id',
      'window_id',
      'service_date',
      'asset_id',
      'request_id',
      'category',
      'mass_kg',
      'status',
      'held',
      'deferred',
      'data_cleared',
      'planned_disposition',
      'completed_disposition',
      'destination_id',
    ],
    ...snapshot.assetList.map((s) => [
      snapshot.batchId,
      snapshot.windowId,
      snapshot.serviceDate,
      s.asset.id,
      s.asset.requestId,
      s.asset.category,
      s.asset.massKg,
      s.status,
      s.held,
      s.deferred,
      s.dataCleared,
      s.asset.plannedDisposition,
      s.status === 'completed' ? s.asset.plannedDisposition : '',
      s.asset.destinationId,
    ]),
  ]);
}
export function exportCustodyCsv(snapshot: Snapshot = snapshotForState(useAppStore.getState())): string {
  return encodeCsv([
    ['batch_id', 'window_id', 'asset_id', 'event_id', 'story_second', 'event'],
    ...snapshot.assetList.flatMap((s) =>
      s.custodyEvents.map((e) => [snapshot.batchId, snapshot.windowId, s.asset.id, e.id, e.atSecond, e.kind]),
    ),
  ]);
}
let persistenceTimer: ReturnType<typeof setTimeout> | undefined;
if (typeof window !== 'undefined') {
  useAppStore.subscribe(() => {
    if (persistenceTimer) return;
    persistenceTimer = setTimeout(() => {
      persistenceTimer = undefined;
      try {
        localStorage.setItem(STORAGE_KEY, exportSessionJson());
      } catch {
        /* Local session remains usable when browser storage is full or unavailable. */
      }
    }, 750);
  });
  window.addEventListener('pagehide', () => {
    try {
      localStorage.setItem(STORAGE_KEY, exportSessionJson());
    } catch {
      /* Browser storage is optional. */
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) useAppStore.getState().pause();
  });
}
