import type { Scenario } from './types';
import { CATEGORY_CONFIG, DEVICE_CATEGORIES } from './seed';
import { pathKm, roadPath } from './model';
export const STORAGE_KEY = 'jejak-balik.recovery.v3';
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 120): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u0008]/.test(v);
const number = (v: unknown, min = 0, max = 10000000): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const point = (v: unknown): boolean =>
  Array.isArray(v) && v.length === 2 && v.every((n) => number(n, -36, 36) && n % 12 === 0);
const window = (v: unknown): boolean =>
  Array.isArray(v) && v.length === 2 && v.every((n) => number(n, 0, 1440)) && v[0] < v[1];
const handling = ['ordinary', 'bulky', 'specialist'];
const unique = (values: string[]) => new Set(values).size === values.length;
/** Imports carry fictional, local scenario records only. They cannot authorize an external action. */
export function importScenario(raw: string | unknown): Scenario | null {
  try {
    if (typeof raw === 'string' && raw.length > 500000) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const s = object(parsed) && parsed.format === 'jejak-balik-recovery-v3' ? parsed.scenario : parsed;
    if (
      !object(s) ||
      s.version !== 3 ||
      !number(s.revision, 1, 1000000) ||
      !Number.isInteger(s.revision) ||
      !number(s.budgetIdr) ||
      !number(s.serviceMinute, 0, 1440)
    )
      return null;
    if (
      !Array.isArray(s.providers) ||
      s.providers.length !== 3 ||
      !s.providers.every(
        (p) =>
          object(p) &&
          text(p.id) &&
          text(p.name) &&
          Array.isArray(p.description) &&
          p.description.length === 2 &&
          p.description.every((x) => text(x, 200)) &&
          typeof p.color === 'string' &&
          /^#[0-9a-f]{6}$/i.test(p.color),
      )
    )
      return null;
    if (
      !Array.isArray(s.receivers) ||
      s.receivers.length < 1 ||
      s.receivers.length > 10 ||
      !s.receivers.every(
        (r) =>
          object(r) &&
          text(r.id) &&
          text(r.name) &&
          point(r.position) &&
          ['reuse', 'material', 'specialist'].includes(String(r.kind)) &&
          Array.isArray(r.handling) &&
          r.handling.length > 0 &&
          r.handling.every((h) => handling.includes(String(h))) &&
          number(r.capacitySlots, 0, 200) &&
          window(r.window) &&
          typeof r.available === 'boolean',
      )
    )
      return null;
    const providerIds = s.providers.map((p) => p.id),
      receiverIds = s.receivers.map((r) => r.id);
    if (!unique(providerIds) || !unique(receiverIds)) return null;
    if (
      !Array.isArray(s.journeys) ||
      s.journeys.length < 1 ||
      s.journeys.length > 20 ||
      !s.journeys.every(
        (j) =>
          object(j) &&
          text(j.id) &&
          providerIds.includes(j.providerId) &&
          text(j.name) &&
          ['bike', 'van', 'truck'].includes(String(j.vehicle)) &&
          point(j.origin) &&
          point(j.destination) &&
          Array.isArray(j.stops) &&
          j.stops.length <= 20 &&
          j.stops.every(point) &&
          number(j.startMinute, 0, 1440) &&
          number(j.endMinute, 0, 1440) &&
          j.endMinute > j.startMinute &&
          number(j.capacityKg, 0, 1000) &&
          number(j.capacitySlots, 0, 200) &&
          Array.isArray(j.handling) &&
          j.handling.length > 0 &&
          j.handling.every((h) => handling.includes(String(h))) &&
          typeof j.available === 'boolean' &&
          number(j.maxExtraMinutes, 0, 500) &&
          number(j.dispatchIdr) &&
          number(j.perMinuteIdr),
      )
    )
      return null;
    const journeyIds = s.journeys.map((j) => j.id);
    if (!unique(journeyIds)) return null;
    if (
      !Array.isArray(s.requests) ||
      s.requests.length < 1 ||
      s.requests.length > 60 ||
      !s.requests.every(
        (r) =>
          object(r) &&
          text(r.id) &&
          text(r.label, 80) &&
          text(r.neighborhood) &&
          point(r.position) &&
          DEVICE_CATEGORIES.includes(r.category as never) &&
          number(r.massKg, 0.01, 1000) &&
          number(r.slots, 1, 100) &&
          handling.includes(String(r.handling)) &&
          typeof r.dataBearing === 'boolean' &&
          typeof r.consent === 'boolean' &&
          typeof r.dataCleared === 'boolean' &&
          window(r.window) &&
          receiverIds.includes(r.receiverId) &&
          ['reuse', 'repair', 'recycle'].includes(String(r.intent)) &&
          ['requested', 'assigned', 'collected', 'received', 'completed'].includes(String(r.phase)),
      )
    )
      return null;
    const ids = s.requests.map((r) => r.id);
    if (!unique(ids)) return null;
    if (
      !Array.isArray(s.events) ||
      s.events.length > 2000 ||
      !s.events.every(
        (e) =>
          object(e) &&
          text(e.id, 200) &&
          ids.includes(e.requestId) &&
          ['approved', 'collected', 'received', 'completed'].includes(String(e.kind)) &&
          number(e.atMinute, 0, 1440) &&
          text(e.actor) &&
          text(e.note, 500),
      )
    )
      return null;
    if (!unique(s.events.map((e) => e.id))) return null;
    const scenario = s as unknown as Scenario;
    let previousTime = -1;
    for (const event of scenario.events) {
      if (event.atMinute < previousTime || event.atMinute > scenario.serviceMinute) return null;
      previousTime = event.atMinute;
      const request = scenario.requests.find((r) => r.id === event.requestId)!;
      if (['approved', 'collected'].includes(event.kind) && !journeyIds.includes(event.actor)) return null;
      if (['received', 'completed'].includes(event.kind) && event.actor !== request.receiverId) return null;
    }
    for (const r of scenario.requests) {
      if (
        r.dataBearing !== CATEGORY_CONFIG[r.category].dataBearing ||
        r.handling !== CATEGORY_CONFIG[r.category].handling
      )
        return null;
      const events = scenario.events.filter((e) => e.requestId === r.id);
      const phaseIndex = ['requested', 'assigned', 'collected', 'received', 'completed'].indexOf(r.phase);
      for (const [kind, index] of [
        ['approved', 1],
        ['collected', 2],
        ['received', 3],
        ['completed', 4],
      ] as const)
        if (phaseIndex >= index && !events.some((e) => e.kind === kind)) return null;
      if (r.phase === 'completed' && (!r.consent || (r.dataBearing && !r.dataCleared))) return null;
      if (events.some((e) => e.kind === 'collected') && phaseIndex < 2) return null;
      if (events.some((e) => e.kind === 'received') && !events.some((e) => e.kind === 'collected'))
        return null;
      if (events.some((e) => e.kind === 'completed') && !events.some((e) => e.kind === 'received'))
        return null;
    }
    if (scenario.approvedPlan !== null) {
      const p = scenario.approvedPlan;
      if (
        !object(p) ||
        !text(p.id, 200) ||
        !number(p.revision, 1, scenario.revision) ||
        !Array.isArray(p.assignments) ||
        p.assignments.length > 60 ||
        !Array.isArray(p.routes) ||
        p.routes.length > 20 ||
        !Array.isArray(p.rejections)
      )
        return null;
      if (
        !p.assignments.every(
          (a) =>
            object(a) &&
            ids.includes(a.requestId) &&
            journeyIds.includes(a.journeyId) &&
            receiverIds.includes(a.receiverId) &&
            number(a.pickupMinute, 0, 1440) &&
            number(a.receivedMinute, 0, 1440) &&
            a.receivedMinute >= a.pickupMinute,
        ) ||
        !unique(p.assignments.map((a) => a.requestId))
      )
        return null;
      const metrics = [
        'totalCostIdr',
        'addedKm',
        'addedMinutes',
        'served',
        'baselineKm',
        'baselineCostIdr',
        'outstandingCostIdr',
      ] as const;
      if (!metrics.every((k) => number(p[k], 0, 100000000))) return null;
      if (
        !p.routes.every(
          (r) =>
            object(r) &&
            journeyIds.includes(r.journeyId) &&
            Array.isArray(r.originalPath) &&
            r.originalPath.length <= 500 &&
            r.originalPath.every(point) &&
            Array.isArray(r.path) &&
            r.path.length <= 500 &&
            r.path.every(point) &&
            Array.isArray(r.requestIds) &&
            r.requestIds.every((id) => ids.includes(id)) &&
            [
              'originalKm',
              'plannedKm',
              'addedKm',
              'addedMinutes',
              'driverPaymentIdr',
              'handlingCostIdr',
              'costIdr',
              'finishMinute',
            ].every((k) => number(r[k as keyof typeof r], 0, 100000000)),
        )
      )
        return null;
      if (
        !p.assignments.every(
          (a) => a.receiverId === scenario.requests.find((r) => r.id === a.requestId)!.receiverId,
        )
      )
        return null;
      for (const r of scenario.requests.filter((r) =>
        ['collected', 'received', 'completed'].includes(r.phase),
      )) {
        const a = p.assignments.find((a) => a.requestId === r.id);
        if (
          !a ||
          scenario.events.find((e) => e.requestId === r.id && e.kind === 'collected')?.actor !== a.journeyId
        )
          return null;
      }
      if (!unique(p.routes.map((r) => r.journeyId))) return null;
      for (const route of p.routes) {
        const journey = scenario.journeys.find((j) => j.id === route.journeyId)!;
        if (
          JSON.stringify(route.originalPath) !==
          JSON.stringify(roadPath([journey.origin, ...journey.stops, journey.destination]))
        )
          return null;
        if (
          route.plannedKm !== pathKm(route.path) ||
          route.originalKm !== pathKm(route.originalPath) ||
          Math.abs(route.addedKm - Math.max(0, route.plannedKm - route.originalKm)) > 0.011 ||
          route.costIdr !== route.driverPaymentIdr + route.handlingCostIdr
        )
          return null;
        if (
          JSON.stringify(route.path[0]) !== JSON.stringify(journey.origin) ||
          JSON.stringify(route.path.at(-1)) !== JSON.stringify(journey.destination)
        )
          return null;
        if (
          route.path.some(
            (point, index) =>
              index > 0 && point[0] !== route.path[index - 1][0] && point[1] !== route.path[index - 1][1],
          )
        )
          return null;
      }
      if (p.totalCostIdr !== p.routes.reduce((n, r) => n + r.costIdr, 0) || p.served !== p.assignments.length)
        return null;
      if (
        !p.rejections.every(
          (r) => object(r) && ids.includes(r.requestId) && text(r.code) && text(r.detail, 500),
        )
      )
        return null;
    } else if (scenario.requests.some((r) => r.phase !== 'requested')) return null;
    const restored = JSON.parse(JSON.stringify(scenario)) as Scenario;
    restored.revision += 1;
    restored.requests.forEach((r) => {
      if (r.phase === 'assigned') r.phase = 'requested';
    });
    // Imported records are never executable approvals. Retain physical custody as stale history only.
    if (!restored.requests.some((r) => ['collected', 'received', 'completed'].includes(r.phase)))
      restored.approvedPlan = null;
    return restored;
  } catch {
    return null;
  }
}
export function exportScenario(s: Scenario) {
  return JSON.stringify(
    {
      format: 'jejak-balik-recovery-v3',
      provenance: 'Fictional planning inputs and simulated custody events; not field results.',
      scenario: s,
    },
    null,
    2,
  );
}
export function saveScenario(s: Scenario): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, exportScenario(s));
    return true;
  } catch {
    return false;
  }
}
export function loadScenario(): Scenario | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? importScenario(value) : null;
  } catch {
    return null;
  }
}
