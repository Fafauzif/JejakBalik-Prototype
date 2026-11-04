import type {
  Assignment,
  CustodyEvent,
  DeviceCategory,
  Journey,
  Plan,
  Point,
  RecoveryRequest,
  RoutePlan,
  Scenario,
} from './types';
import { CATEGORY_CONFIG, DEVICE_CATEGORIES, HANDLING_COSTS, createSeed } from './seed';
export { CATEGORY_CONFIG, DEVICE_CATEGORIES, HANDLING_COSTS } from './seed';
export const createScenario = (): Scenario => createSeed();
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const round = (n: number) => Math.round(n * 100) / 100;
const distance = (a: Point, b: Point) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) * 0.1;
const SPEED_KM_MIN = 0.4;
const close = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
export function roadPath(points: Point[]): Point[] {
  if (!points.length) return [];
  const result: Point[] = [[...points[0]]];
  for (let i = 1; i < points.length; i++) {
    let [x, z] = result[result.length - 1];
    const [tx, tz] = points[i];
    while (x !== tx) {
      x += Math.sign(tx - x) * Math.min(12, Math.abs(tx - x));
      result.push([x, z]);
    }
    while (z !== tz) {
      z += Math.sign(tz - z) * Math.min(12, Math.abs(tz - z));
      result.push([x, z]);
    }
  }
  return result;
}
export function pathKm(path: Point[]) {
  return round(path.slice(1).reduce((sum, p, i) => sum + distance(path[i], p), 0));
}
export function minuteLabel(minute: number) {
  const n = Math.round(9 * 60 + minute);
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
type Visit = { p: Point; kind: 'forward' | 'pickup' | 'receive'; requestId?: string };
type Evaluation = { ok: boolean; code: string; route: RoutePlan; assignments: Assignment[]; visits: Visit[] };
const caches = new WeakMap<
  Scenario,
  {
    requests: Scenario['requests'];
    receivers: Scenario['receivers'];
    requestById: Map<string, RecoveryRequest>;
    receiverById: Map<string, Scenario['receivers'][number]>;
    journeys: Map<Journey, { originalPath: Point[]; originalKm: number; originalFinish: number }>;
  }
>();
function context(s: Scenario) {
  let c = caches.get(s);
  if (!c || c.requests !== s.requests || c.receivers !== s.receivers) {
    c = {
      requests: s.requests,
      receivers: s.receivers,
      requestById: new Map(s.requests.map((r) => [r.id, r])),
      receiverById: new Map(s.receivers.map((r) => [r.id, r])),
      journeys: new Map(),
    };
    caches.set(s, c);
  }
  return c;
}
const physical = (r: RecoveryRequest) => ['collected', 'received', 'completed'].includes(r.phase);
function evaluate(s: Scenario, j: Journey, visits: Visit[], enforce = true): Evaluation {
  const cache = context(s),
    requests = cache.requestById;
  let original = cache.journeys.get(j);
  if (!original) {
    const originalPath = roadPath([j.origin, ...j.stops, j.destination]),
      originalKm = pathKm(originalPath);
    original = {
      originalPath,
      originalKm,
      originalFinish: j.startMinute + originalKm / SPEED_KM_MIN + j.stops.length * 3,
    };
    cache.journeys.set(j, original);
  }
  const { originalPath, originalKm, originalFinish } = original;
  let now = j.startMinute,
    previous = j.origin,
    kg = 0,
    slots = 0,
    code = '',
    handlingCost = 0,
    plannedDistance = 0;
  const assignments: Assignment[] = [],
    seen = new Set<string>();
  const fail = (reason: string) => {
    if (!code) code = reason;
  };
  if (!j.available) fail('carrier_unavailable');
  for (const visit of visits) {
    const leg = distance(previous, visit.p);
    plannedDistance += leg;
    now += leg / SPEED_KM_MIN;
    previous = visit.p;
    if (visit.kind === 'forward') {
      now += 3;
      continue;
    }
    const r = requests.get(visit.requestId!);
    if (!r) {
      fail('unknown_request');
      continue;
    }
    const receiver = cache.receiverById.get(r.receiverId);
    if (visit.kind === 'pickup') {
      if (seen.has(r.id)) fail('duplicate_pickup');
      seen.add(r.id);
      if (!r.consent) fail('owner_consent');
      if (!j.handling.includes(r.handling)) fail('handling_incompatible');
      if (!receiver || !receiver.handling.includes(r.handling)) fail('receiver_incompatible');
      now = Math.max(now, r.window[0]);
      if (now > r.window[1]) fail('pickup_window');
      if (!physical(r) && now < s.serviceMinute - 0.001) fail('journey_departed');
      kg += r.massKg;
      slots += r.slots;
      if (kg > j.capacityKg + 0.001 || slots > j.capacitySlots) fail('vehicle_capacity');
      assignments.push({
        requestId: r.id,
        journeyId: j.id,
        receiverId: r.receiverId,
        pickupMinute: round(now),
        receivedMinute: 0,
      });
      now += 2;
      handlingCost += HANDLING_COSTS[r.handling];
    } else {
      const a = assignments.find((x) => x.requestId === r.id);
      if (!a) fail('handoff_order');
      if (!receiver || !receiver.available) fail('receiver_unavailable');
      if (receiver) {
        now = Math.max(now, receiver.window[0]);
        if (now > receiver.window[1]) fail('receiver_window');
      }
      if (a) a.receivedMinute = round(now);
      kg -= r.massKg;
      slots -= r.slots;
      now += 2;
    }
  }
  const finalLeg = distance(previous, j.destination);
  plannedDistance += finalLeg;
  now += finalLeg / SPEED_KM_MIN;
  if (kg > 0.001 || slots > 0) fail('unreceived_load');
  if (now > j.endMinute) fail('journey_window');
  const addedMinutes = Math.max(0, now - originalFinish);
  if (addedMinutes > j.maxExtraMinutes + 0.001) fail('detour_limit');
  const path: Point[] = [],
    plannedKm = round(plannedDistance),
    active = assignments.length > 0;
  const driverPaymentIdr = active ? Math.round(j.dispatchIdr + addedMinutes * j.perMinuteIdr) : 0;
  return {
    ok: !enforce || !code,
    code,
    visits,
    assignments,
    route: {
      journeyId: j.id,
      originalPath,
      path,
      requestIds: assignments.map((a) => a.requestId),
      originalKm,
      plannedKm,
      addedKm: round(Math.max(0, plannedKm - originalKm)),
      addedMinutes: round(addedMinutes),
      driverPaymentIdr,
      handlingCostIdr: handlingCost,
      costIdr: driverPaymentIdr + handlingCost,
      finishMinute: round(now),
    },
  };
}
function originalVisits(j: Journey): Visit[] {
  return j.stops.map((p) => ({ p, kind: 'forward' }));
}
function insert(s: Scenario, j: Journey, visits: Visit[], request: RecoveryRequest): Evaluation {
  const receiver = s.receivers.find((x) => x.id === request.receiverId);
  let best: Evaluation | undefined, failed: Evaluation | undefined;
  const directFailure =
    s.serviceMinute > j.startMinute && !physical(request)
      ? 'journey_departed'
      : !receiver
        ? 'receiver_incompatible'
        : !j.available
          ? 'carrier_unavailable'
          : !request.consent
            ? 'owner_consent'
            : !j.handling.includes(request.handling)
              ? 'handling_incompatible'
              : !receiver.handling.includes(request.handling)
                ? 'receiver_incompatible'
                : !receiver.available
                  ? 'receiver_unavailable'
                  : request.massKg > j.capacityKg || request.slots > j.capacitySlots
                    ? 'vehicle_capacity'
                    : '';
  if (directFailure) return { ...evaluate(s, j, visits), ok: false, code: directFailure };
  for (let i = 0; i <= visits.length; i++)
    for (let k = i + 1; k <= visits.length + 1; k++) {
      const next = [...visits];
      next.splice(i, 0, { p: request.position, kind: 'pickup', requestId: request.id });
      next.splice(k, 0, { p: receiver!.position, kind: 'receive', requestId: request.id });
      const e = evaluate(s, j, next);
      if (
        e.ok &&
        (!best ||
          e.route.costIdr < best.route.costIdr ||
          (e.route.costIdr === best.route.costIdr && e.route.plannedKm < best.route.plannedKm))
      )
        best = e;
      if (!failed || e.route.addedMinutes < failed.route.addedMinutes) failed = e;
    }
  return best || failed!;
}
const REASONS: Record<string, string> = {
  carrier_unavailable: 'Penyedia perjalanan tidak tersedia.',
  owner_consent: 'Persetujuan pemilik belum diberikan.',
  handling_incompatible: 'Jenis penanganan tidak cocok dengan kendaraan.',
  receiver_incompatible: 'Tujuan tidak menerima jenis perangkat ini.',
  receiver_unavailable: 'Tujuan penerima tidak tersedia.',
  vehicle_capacity: 'Kapasitas kendaraan tidak cukup.',
  pickup_window: 'Jendela penjemputan tidak terpenuhi.',
  receiver_window: 'Waktu penerimaan tidak terpenuhi.',
  journey_window: 'Perjalanan akan melewati batas waktu.',
  detour_limit: 'Tambahan waktu melebihi batas penyedia.',
  receiver_capacity: 'Kapasitas penerima telah terpakai.',
  budget: 'Anggaran tidak cukup untuk kewajiban tambahan.',
  journey_departed: 'Waktu penjemputan pada perjalanan ini sudah berlalu.',
  no_journey: 'Belum ada perjalanan yang memenuhi semua syarat.',
  custody_locked: 'Perangkat tetap pada pembawa yang telah menerima serah terima.',
};
export function reasonText(code: string) {
  return REASONS[code] || REASONS.no_journey;
}
function receiverRemaining(s: Scenario, assigned: Assignment[], r: RecoveryRequest) {
  const receiver = s.receivers.find((x) => x.id === r.receiverId);
  const used = assigned
    .filter((a) => a.receiverId === r.receiverId)
    .reduce((n, a) => n + (s.requests.find((x) => x.id === a.requestId)?.slots || 0), 0);
  return !!receiver && used + r.slots <= receiver.capacitySlots;
}
function fingerprint(value: unknown) {
  let h = 2166136261;
  for (const c of JSON.stringify(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
function pooledBaseline(s: Scenario, requests: RecoveryRequest[]) {
  // Dedicated scheduled rounds use the same timing, dwell and receiving checks. Insufficient windows remain explicit.
  const baselineScenario = {
    ...s,
    serviceMinute: 0,
    requests: requests.map((r) => ({ ...r, phase: 'requested' as const })),
  };
  let km = 0,
    cost = 0,
    served = 0;
  for (const kind of ['ordinary', 'bulky', 'specialist'] as const) {
    const pending = requests
      .filter((r) => r.handling === kind)
      .sort((a, b) => a.window[1] - b.window[1] || a.id.localeCompare(b.id));
    let roundIndex = 0;
    while (pending.length) {
      const j: Journey = {
        id: `baseline-${kind}-${roundIndex++}`,
        providerId: 'baseline',
        name: 'Pengumpulan terjadwal',
        vehicle: kind === 'ordinary' ? 'van' : 'truck',
        origin: [0, 0],
        destination: [0, 0],
        stops: [],
        startMinute: 0,
        endMinute: 240,
        capacityKg: kind === 'ordinary' ? 20 : kind === 'bulky' ? 50 : 8,
        capacitySlots: kind === 'ordinary' ? 10 : kind === 'bulky' ? 12 : 4,
        handling: [kind],
        available: true,
        maxExtraMinutes: 240,
        dispatchIdr: kind === 'ordinary' ? 15000 : 25000,
        perMinuteIdr: kind === 'ordinary' ? 700 : 1000,
      };
      let evaluation = evaluate(baselineScenario, j, []),
        added = 0;
      for (let i = 0; i < pending.length;) {
        const e = insert(baselineScenario, j, evaluation.visits, pending[i]);
        if (e.ok) {
          evaluation = e;
          pending.splice(i, 1);
          added++;
        } else i++;
      }
      if (!added) break;
      km += evaluation.route.plannedKm;
      cost += evaluation.route.costIdr;
      served += added;
    }
  }
  return { km: round(km), cost, served, feasible: served === requests.length };
}
export function planScenario(s: Scenario, preferences: Record<string, string> = {}): Plan {
  caches.delete(s);
  if (s.approvedPlan?.revision === s.revision && !Object.keys(preferences).length)
    return clone(s.approvedPlan);
  const evaluations = new Map<string, Evaluation>();
  s.journeys.forEach((j) => evaluations.set(j.id, evaluate(s, j, originalVisits(j))));
  const assigned: Assignment[] = [],
    rejections: Plan['rejections'] = [];
  // Physical custody freezes its existing carrier route. Replanning never moves a collected device to a different carrier.
  const frozen = new Set<string>();
  const locked = s.requests.filter(physical);
  for (const j of s.journeys) {
    const retained = locked.flatMap(
      (r) => s.approvedPlan?.assignments.filter((a) => a.requestId === r.id && a.journeyId === j.id) || [],
    );
    if (!retained.length) continue;
    const prior = s.approvedPlan!.routes.find((r) => r.journeyId === j.id)!;
    const handling = retained.reduce(
      (n, a) => n + HANDLING_COSTS[s.requests.find((r) => r.id === a.requestId)!.handling],
      0,
    );
    const route = {
      ...clone(prior),
      requestIds: retained.map((a) => a.requestId),
      handlingCostIdr: handling,
      costIdr: prior.driverPaymentIdr + handling,
    };
    evaluations.set(j.id, { ok: true, code: '', visits: [], assignments: clone(retained), route });
    assigned.push(...retained);
    frozen.add(j.id);
  }
  for (const r of locked.filter((r) => !assigned.some((a) => a.requestId === r.id)))
    rejections.push({ requestId: r.id, code: 'custody_locked', detail: reasonText('custody_locked') });
  for (const r of s.requests
    .filter((r) => !physical(r))
    .sort((a, b) => a.window[1] - b.window[1] || a.id.localeCompare(b.id))) {
    let best: { j: Journey; e: Evaluation; increment: number } | undefined,
      failure = 'no_journey';
    if (!r.consent) failure = 'owner_consent';
    else if (!receiverRemaining(s, assigned, r)) failure = 'receiver_capacity';
    else
      for (const j of s.journeys) {
        if (preferences[r.id] && preferences[r.id] !== j.id) continue;
        if (frozen.has(j.id)) {
          failure = 'custody_locked';
          continue;
        }
        const old = evaluations.get(j.id)!;
        const e = insert(s, j, old.visits, r);
        if (!e.ok) {
          failure = e.code;
          continue;
        }
        const increment = e.route.costIdr - old.route.costIdr;
        const running = [...evaluations.values()].reduce((n, v) => n + v.route.costIdr, 0);
        if (running + increment > s.budgetIdr) {
          failure = 'budget';
          continue;
        }
        if (
          !best ||
          increment < best.increment ||
          (increment === best.increment && e.route.addedKm < best.e.route.addedKm)
        )
          best = { j, e, increment };
      }
    if (best) {
      evaluations.set(best.j.id, best.e);
      assigned.push(best.e.assignments.find((a) => a.requestId === r.id)!);
    } else rejections.push({ requestId: r.id, code: failure, detail: reasonText(failure) });
  }
  // Recalculate pickup timings after all insertions; retained physical event times are immutable.
  const assignments = [...evaluations.values()]
    .flatMap((e) => e.assignments)
    .map((a) => {
      const r = s.requests.find((r) => r.id === a.requestId)!;
      return physical(r) ? s.approvedPlan?.assignments.find((p) => p.requestId === r.id) || a : a;
    });
  const routes = [...evaluations.values()].map((e) =>
    frozen.has(e.route.journeyId)
      ? e.route
      : {
          ...e.route,
          path: roadPath([
            s.journeys.find((j) => j.id === e.route.journeyId)!.origin,
            ...e.visits.map((v) => v.p),
            s.journeys.find((j) => j.id === e.route.journeyId)!.destination,
          ]),
        },
  );
  const totalCostIdr = routes.reduce((n, r) => n + r.costIdr, 0);
  const accepted = s.requests.filter((r) => assignments.some((a) => a.requestId === r.id));
  const baseline = pooledBaseline(s, accepted);
  const result: Plan & { baselineServed: number; baselineFeasible: boolean } = {
    id: '',
    revision: s.revision,
    assignments,
    routes,
    rejections,
    totalCostIdr,
    addedKm: round(routes.reduce((n, r) => n + r.addedKm, 0)),
    addedMinutes: round(routes.reduce((n, r) => n + r.addedMinutes, 0)),
    served: assignments.length,
    baselineKm: baseline.km,
    baselineCostIdr: baseline.cost,
    baselineServed: baseline.served,
    baselineFeasible: baseline.feasible,
    outstandingCostIdr: accepted
      .filter((r) => r.phase !== 'completed')
      .reduce((n, r) => n + HANDLING_COSTS[r.handling], 0),
  };
  result.id = `plan-${s.revision}-${fingerprint(result)}`;
  return result;
}
export function journeyOptions(s: Scenario, requestId: string) {
  const r = s.requests.find((r) => r.id === requestId);
  if (!r) return [];
  return s.journeys.map((j) => {
    const candidate = planScenario(s, { [requestId]: j.id });
    const assignment = candidate.assignments.find((a) => a.requestId === requestId);
    const route = candidate.routes.find((x) => x.journeyId === j.id)!;
    const current = s.approvedPlan?.assignments.find((a) => a.requestId === requestId);
    const blocked =
      physical(r) &&
      (!j.available ||
        r.massKg > j.capacityKg ||
        r.slots > j.capacitySlots ||
        !s.receivers.find((x) => x.id === r.receiverId)?.available ||
        s.receivers.find((x) => x.id === r.receiverId)!.capacitySlots < r.slots);
    const code =
      physical(r) && (current?.journeyId !== j.id || blocked)
        ? 'custody_locked'
        : candidate.rejections.find((x) => x.requestId === requestId)?.code || '';
    return {
      journeyId: j.id,
      feasible: assignment?.journeyId === j.id && !code,
      reason: code ? reasonText(code) : 'Memenuhi kapasitas, jendela waktu, dan penerimaan.',
      addedKm: route?.addedKm || 0,
      addedMinutes: route?.addedMinutes || 0,
      costIdr: route?.costIdr || 0,
    };
  });
}
export function approvePlan(s: Scenario, plan: Plan): Scenario {
  if (plan.revision !== s.revision) throw Error('stale_plan');
  const prefs = Object.fromEntries(
    plan.assignments
      .filter((a) => !physical(s.requests.find((r) => r.id === a.requestId)!))
      .map((a) => [a.requestId, a.journeyId]),
  );
  const canonical = planScenario(s, prefs);
  if (fingerprint(canonical) !== fingerprint(plan)) throw Error('invalid_plan');
  const next = clone(s);
  next.approvedPlan = clone(plan);
  for (const a of plan.assignments) {
    const r = next.requests.find((r) => r.id === a.requestId)!;
    if (r.phase === 'requested') r.phase = 'assigned';
    const id = `approve-${plan.id}-${r.id}`;
    if (!next.events.some((e) => e.id === id))
      next.events.push({
        id,
        requestId: r.id,
        kind: 'approved',
        atMinute: next.serviceMinute,
        actor: a.journeyId,
        note: 'Rencana ilustratif disetujui pengguna.',
      });
  }
  return next;
}
const holdPlans = new WeakMap<Scenario, Plan>();
/** Logistics holds for existing physical custody. Data/owner review is represented separately. */
export function getPhysicalHoldReason(s: Scenario, request: RecoveryRequest): string | null {
  if (!['collected', 'received'].includes(request.phase)) return null;
  let plan = s.approvedPlan?.revision === s.revision ? s.approvedPlan : holdPlans.get(s);
  if (!plan) {
    plan = planScenario(s);
    holdPlans.set(s, plan);
  }
  // This is the current retained plan, not the stale full proposal that may include unrelated pending work.
  if (plan.totalCostIdr > s.budgetIdr) return 'budget';
  if (request.phase === 'received') return null;
  const assignment = plan.assignments.find((a) => a.requestId === request.id);
  if (!assignment) return 'custody_locked';
  const journey = s.journeys.find((j) => j.id === assignment.journeyId);
  const receiver = s.receivers.find((r) => r.id === assignment.receiverId);
  if (!journey?.available) return 'carrier_unavailable';
  if (!receiver?.available) return 'receiver_unavailable';
  const onboard = s.requests.filter(
    (r) =>
      r.phase === 'collected' &&
      plan!.assignments.some((a) => a.requestId === r.id && a.journeyId === journey.id),
  );
  if (
    onboard.reduce((n, r) => n + r.massKg, 0) > journey.capacityKg ||
    onboard.reduce((n, r) => n + r.slots, 0) > journey.capacitySlots
  )
    return 'vehicle_capacity';
  const receivedSlots = s.requests
    .filter((r) => ['received', 'completed'].includes(r.phase) && r.receiverId === receiver.id)
    .reduce((n, r) => n + r.slots, 0);
  if (receivedSlots + request.slots > receiver.capacitySlots) return 'receiver_capacity';
  if (Math.max(s.serviceMinute, assignment.receivedMinute) > receiver.window[1]) return 'receiver_window';
  return null;
}
export function advanceService(s: Scenario): Scenario {
  if (!s.approvedPlan || s.approvedPlan.revision !== s.revision || s.approvedPlan.totalCostIdr > s.budgetIdr)
    return s;
  const candidates: {
    a: Assignment;
    r: RecoveryRequest;
    kind: Exclude<CustodyEvent['kind'], 'approved'>;
    at: number;
    actor: string;
  }[] = [];
  for (const a of s.approvedPlan.assignments) {
    const r = s.requests.find((r) => r.id === a.requestId)!;
    if (r.phase === 'collected' && getPhysicalHoldReason(s, r)) continue;
    const j = s.journeys.find((j) => j.id === a.journeyId),
      receiver = s.receivers.find((x) => x.id === a.receiverId);
    const onboard = s.requests.filter(
      (x) =>
        x.phase === 'collected' &&
        s.approvedPlan!.assignments.some((a) => a.requestId === x.id && a.journeyId === j?.id),
    );
    const receivedSlots = s.requests
      .filter((x) => ['received', 'completed'].includes(x.phase) && x.receiverId === r.receiverId)
      .reduce((n, x) => n + x.slots, 0);
    const loadKg = onboard.reduce((n, x) => n + x.massKg, 0),
      loadSlots = onboard.reduce((n, x) => n + x.slots, 0);
    if (
      r.phase === 'assigned' &&
      j?.available &&
      receiver?.available &&
      r.consent &&
      Math.max(s.serviceMinute, a.pickupMinute) <= r.window[1] &&
      loadKg + r.massKg <= j.capacityKg &&
      loadSlots + r.slots <= j.capacitySlots
    )
      candidates.push({
        a,
        r,
        kind: 'collected',
        at: Math.max(s.serviceMinute, a.pickupMinute),
        actor: a.journeyId,
      });
    else if (
      r.phase === 'collected' &&
      j?.available &&
      receiver?.available &&
      loadKg <= j.capacityKg &&
      loadSlots <= j.capacitySlots &&
      receivedSlots + r.slots <= receiver.capacitySlots &&
      Math.max(s.serviceMinute, a.receivedMinute) <= receiver.window[1]
    )
      candidates.push({
        a,
        r,
        kind: 'received',
        at: Math.max(s.serviceMinute, a.receivedMinute),
        actor: a.receiverId,
      });
    else if (r.phase === 'received' && r.consent && (!r.dataBearing || r.dataCleared))
      candidates.push({
        a,
        r,
        kind: 'completed',
        at: Math.max(a.receivedMinute + 5, s.serviceMinute),
        actor: a.receiverId,
      });
  }
  if (!candidates.length) return s;
  const at = Math.min(...candidates.map((c) => c.at));
  const next = clone(s);
  let advanced = 0;
  for (const c of candidates
    .filter((c) => Math.abs(c.at - at) < 0.001)
    .sort((a, b) => a.r.id.localeCompare(b.r.id))) {
    const r = next.requests.find((r) => r.id === c.r.id)!;
    const journey = next.journeys.find((j) => j.id === c.a.journeyId)!,
      receiver = next.receivers.find((x) => x.id === c.a.receiverId)!;
    const onboard = next.requests.filter(
      (x) =>
        x.phase === 'collected' &&
        next.approvedPlan!.assignments.some((a) => a.requestId === x.id && a.journeyId === journey.id),
    );
    if (
      c.kind === 'collected' &&
      (onboard.reduce((n, x) => n + x.massKg, 0) + r.massKg > journey.capacityKg ||
        onboard.reduce((n, x) => n + x.slots, 0) + r.slots > journey.capacitySlots)
    )
      continue;
    if (
      c.kind === 'received' &&
      next.requests
        .filter((x) => ['received', 'completed'].includes(x.phase) && x.receiverId === receiver.id)
        .reduce((n, x) => n + x.slots, 0) +
        r.slots >
        receiver.capacitySlots
    )
      continue;
    const id = `${r.id}-${c.kind}`;
    if (!next.events.some((e) => e.id === id))
      next.events.push({
        id,
        requestId: r.id,
        kind: c.kind,
        atMinute: round(at),
        actor: c.actor,
        note: 'Peristiwa simulasi; bukan bukti penanganan lapangan.',
      });
    r.phase = c.kind;
    advanced++;
  }
  if (!advanced) return s;
  next.serviceMinute = round(at);
  next.approvedPlan!.outstandingCostIdr = next.requests
    .filter(
      (r) => r.phase !== 'completed' && next.approvedPlan!.assignments.some((a) => a.requestId === r.id),
    )
    .reduce((n, r) => n + HANDLING_COSTS[r.handling], 0);
  return next;
}
const structural = (s: Scenario) =>
  JSON.stringify({
    requests: s.requests.map(({ phase, dataCleared, consent, ...r }) => r),
    journeys: s.journeys,
    receivers: s.receivers,
    budget: s.budgetIdr,
  });
function validateInputs(s: Scenario) {
  const n = (v: number, min = 0, max = 10000000) => Number.isFinite(v) && v >= min && v <= max;
  const w = (v: [number, number]) => v.length === 2 && n(v[0], 0, 1440) && n(v[1], 0, 1440) && v[0] < v[1];
  if (
    !n(s.budgetIdr) ||
    s.journeys.some(
      (j) =>
        !n(j.capacityKg, 0, 1000) ||
        !n(j.capacitySlots, 0, 200) ||
        !Number.isInteger(j.capacitySlots) ||
        !n(j.dispatchIdr) ||
        !n(j.perMinuteIdr) ||
        !n(j.maxExtraMinutes, 0, 500) ||
        !n(j.startMinute, 0, 1440) ||
        !n(j.endMinute, 0, 1440) ||
        j.startMinute >= j.endMinute,
    ) ||
    s.receivers.some(
      (r) => !n(r.capacitySlots, 0, 200) || !Number.isInteger(r.capacitySlots) || !w(r.window),
    ) ||
    s.requests.some(
      (r) => !w(r.window) || !n(r.massKg, 0.01, 1000) || !n(r.slots, 1, 100) || !Number.isInteger(r.slots),
    )
  )
    throw Error('invalid_scenario_input');
}
export function changeScenario(s: Scenario, mutation: (draft: Scenario) => void): Scenario {
  const next = clone(s);
  mutation(next);
  for (const old of s.requests) {
    const r = next.requests.find((r) => r.id === old.id);
    if (old.phase === 'completed' && JSON.stringify(r) !== JSON.stringify(old))
      throw Error('completed_record_immutable');
    if (
      r &&
      physical(old) &&
      [
        'id',
        'category',
        'position',
        'massKg',
        'slots',
        'handling',
        'dataBearing',
        'receiverId',
        'intent',
      ].some(
        (k) =>
          JSON.stringify(r[k as keyof RecoveryRequest]) !== JSON.stringify(old[k as keyof RecoveryRequest]),
      )
    )
      throw Error('custody_record_immutable');
    if (r && r.intent !== old.intent && !physical(old)) r.receiverId = receiverFor(r.category, r.intent);
  }
  validateInputs(next);
  // Changing review decisions only does not silently rewind a physically received device.
  if (structural(s) !== structural(next)) {
    next.revision = s.revision + 1;
    next.requests.forEach((r) => {
      const old = s.requests.find((x) => x.id === r.id);
      if (old && physical(old)) {
        r.phase = old.phase;
        r.receiverId = old.receiverId;
      } else if (r.phase === 'assigned') r.phase = 'requested';
    });
    if (!next.requests.some(physical)) next.approvedPlan = null;
    // With physical custody, retain the stale plan as the carrier record. A fresh approval is required.
  } else if (s.requests.some((r) => r.consent !== next.requests.find((x) => x.id === r.id)?.consent)) {
    next.revision = s.revision + 1;
    next.requests.forEach((r) => {
      if (r.phase === 'assigned') r.phase = 'requested';
    });
    if (!next.requests.some(physical)) next.approvedPlan = null;
  }
  return next;
}
function receiverFor(category: DeviceCategory, intent: RecoveryRequest['intent']) {
  return CATEGORY_CONFIG[category].handling === 'specialist'
    ? 'jaga'
    : intent === 'recycle'
      ? 'material'
      : 'guna';
}
export function addRequest(
  s: Scenario,
  input: Partial<RecoveryRequest> & Pick<RecoveryRequest, 'category' | 'label' | 'position'>,
): Scenario {
  if (
    !DEVICE_CATEGORIES.includes(input.category as DeviceCategory) ||
    typeof input.label !== 'string' ||
    input.label.trim().length < 2 ||
    input.label.length > 80 ||
    !Array.isArray(input.position) ||
    input.position.length !== 2 ||
    input.position.some((n) => !Number.isFinite(n) || Math.abs(n) > 36)
  )
    throw Error('invalid_request');
  if (input.intent && !['reuse', 'repair', 'recycle'].includes(input.intent)) throw Error('invalid_intent');
  const window = input.window || [0, 185];
  if (
    window.length !== 2 ||
    window.some((n) => !Number.isFinite(n) || n < 0 || n > 240) ||
    window[0] >= window[1]
  )
    throw Error('invalid_window');
  if (s.requests.length >= 60) throw Error('request_limit');
  return changeScenario(s, (next) => {
    let serial = next.requests.length + 1;
    while (next.requests.some((r) => r.id === `JB-${String(serial).padStart(3, '0')}`)) serial++;
    const category = input.category,
      c = CATEGORY_CONFIG[category],
      intent =
        input.intent || (['phone', 'tablet', 'laptop', 'router'].includes(category) ? 'reuse' : 'recycle');
    next.requests.push({
      id: `JB-${String(serial).padStart(3, '0')}`,
      label: input.label.trim(),
      category,
      ...c,
      neighborhood:
        typeof input.neighborhood === 'string' &&
        input.neighborhood.trim().length > 0 &&
        input.neighborhood.length <= 80
          ? input.neighborhood.trim()
          : 'Titik tambahan',
      position: input.position.map((n) => Math.round(n / 12) * 12) as Point,
      window: [...window],
      intent,
      receiverId: receiverFor(category, intent),
      consent: input.consent === true,
      dataCleared: false,
      phase: 'requested',
      userAdded: true,
    });
  });
}
export function summarizeScenario(s: Scenario, plan = planScenario(s)) {
  return {
    requests: s.requests.length,
    matched: plan.served,
    completed: s.requests.filter((r) => r.phase === 'completed').length,
    collected: s.requests.filter(physical).length,
    held: s.requests.filter((r) => r.phase === 'received' && r.dataBearing && !r.dataCleared).length,
    costIdr: plan.totalCostIdr,
    fundingGapIdr: Math.max(0, plan.totalCostIdr - s.budgetIdr),
  };
}
