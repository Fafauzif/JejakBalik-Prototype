import { describe, it, expect } from 'vitest';
import {
  addRequest,
  advanceService,
  approvePlan,
  changeScenario,
  createScenario,
  journeyOptions,
  pathKm,
  planScenario,
  roadPath,
  HANDLING_COSTS,
  getPhysicalHoldReason,
} from '../../src/recovery/model';
import { exportScenario, importScenario, STORAGE_KEY } from '../../src/recovery/persistence';
import type { Scenario } from '../../src/recovery/types';
function run(s: Scenario, steps = 150) {
  let current = s;
  for (let i = 0; i < steps; i++) {
    const next = advanceService(current);
    if (next === current) return current;
    current = next;
  }
  return current;
}
function afterCollected(s: Scenario) {
  let current = approvePlan(s, planScenario(s));
  while (!current.requests.some((r) => r.phase === 'collected')) current = advanceService(current);
  return current;
}
describe('shared return journey planning', () => {
  it('recomputes a feasible deterministic cohort from three providers and fixed streets', () => {
    const s = createScenario(),
      before = JSON.stringify(s),
      p = planScenario(s);
    expect(s.providers).toHaveLength(3);
    expect(s.journeys).toHaveLength(6);
    expect(s.requests).toHaveLength(18);
    expect(p.served).toBeGreaterThan(10);
    expect(new Set(p.assignments.map((a) => a.requestId)).size).toBe(p.served);
    expect(planScenario(s)).toEqual(p);
    expect(JSON.stringify(s)).toBe(before);
    for (const route of p.routes) {
      const j = s.journeys.find((j) => j.id === route.journeyId)!;
      expect(route.originalPath).toEqual(roadPath([j.origin, ...j.stops, j.destination]));
      for (const point of [j.origin, ...j.stops, j.destination]) expect(route.path).toContainEqual(point);
      expect(route.addedKm).toBeCloseTo(route.plannedKm - route.originalKm, 2);
      expect(route.addedMinutes).toBeLessThanOrEqual(j.maxExtraMinutes);
      expect(route.finishMinute).toBeLessThanOrEqual(j.endMinute);
      expect(route.costIdr).toBe(route.driverPaymentIdr + route.handlingCostIdr);
      for (const [i, point] of route.path.entries()) {
        expect(point.every((n) => n % 12 === 0)).toBe(true);
        if (i) expect(point[0] === route.path[i - 1][0] || point[1] === route.path[i - 1][1]).toBe(true);
      }
    }
    expect(p.totalCostIdr).toBeLessThanOrEqual(s.budgetIdr);
    expect(p.totalCostIdr).toBe(p.routes.reduce((n, r) => n + r.costIdr, 0));
    for (const a of p.assignments) {
      const r = s.requests.find((r) => r.id === a.requestId)!,
        j = s.journeys.find((j) => j.id === a.journeyId)!,
        receiver = s.receivers.find((x) => x.id === a.receiverId)!;
      expect(j.handling).toContain(r.handling);
      expect(receiver.handling).toContain(r.handling);
      expect(a.pickupMinute).toBeGreaterThanOrEqual(r.window[0]);
      expect(a.pickupMinute).toBeLessThanOrEqual(r.window[1]);
      expect(a.receivedMinute).toBeGreaterThanOrEqual(receiver.window[0]);
      expect(a.receivedMinute).toBeLessThanOrEqual(receiver.window[1]);
      expect(a.receivedMinute).toBeGreaterThan(a.pickupMinute);
    }
    for (const receiver of s.receivers) {
      const reserved = p.assignments
        .filter((a) => a.receiverId === receiver.id)
        .reduce((n, a) => n + s.requests.find((r) => r.id === a.requestId)!.slots, 0);
      expect(reserved).toBeLessThanOrEqual(receiver.capacitySlots);
    }
  });
  it('honors unavailable providers, receiver capacity, mass limits and a zero budget', () => {
    const s = createScenario();
    const canceled = changeScenario(s, (d) =>
      d.journeys.forEach((j) => {
        if (j.providerId === 'lintas') j.available = false;
      }),
    );
    expect(planScenario(canceled).assignments.every((a) => !a.journeyId.startsWith('LP'))).toBe(true);
    const closed = changeScenario(s, (d) => d.receivers.forEach((r) => (r.capacitySlots = 0)));
    expect(planScenario(closed).served).toBe(0);
    const tiny = changeScenario(s, (d) => d.journeys.forEach((j) => (j.capacityKg = 0.01)));
    expect(planScenario(tiny).served).toBe(0);
    const zero = changeScenario(s, (d) => (d.budgetIdr = 0));
    expect(planScenario(zero).served).toBe(0);
    expect(planScenario(zero).totalCostIdr).toBe(0);
  });
  it('does not promise narrow time windows or unapproved owner requests', () => {
    const s = createScenario(),
      r = s.requests[0];
    const tight = changeScenario(s, (d) => {
      d.requests[0].window = [0, 0.1];
    });
    expect(planScenario(tight).assignments.some((a) => a.requestId === r.id)).toBe(false);
    const added = addRequest(s, { category: 'phone', label: 'Ponsel tambahan', position: [12, 0] });
    const fresh = added.requests.at(-1)!;
    expect(fresh.consent).toBe(false);
    expect(planScenario(added).rejections.find((x) => x.requestId === fresh.id)?.code).toBe('owner_consent');
    expect(() => addRequest(s, { category: 'phone', label: 'X', position: [12, 0] })).toThrow(
      'invalid_request',
    );
    expect(() =>
      addRequest(s, { category: 'phone', label: 'Ponsel', position: [12, 0], window: [40, 20] }),
    ).toThrow('invalid_window');
  });
  it('does not insert new stops into the traveled past of a departed journey', () => {
    const s = createScenario();
    s.serviceMinute = 40;
    const p = planScenario(s);
    expect(p.served).toBe(0);
    expect(p.rejections.every((r) => r.code === 'journey_departed' || r.code === 'receiver_capacity')).toBe(
      true,
    );
  });
  it('rejects invalid planning mutations without overwriting the original scenario', () => {
    const s = createScenario();
    expect(() =>
      changeScenario(s, (d) => {
        d.budgetIdr = NaN;
      }),
    ).toThrow('invalid_scenario_input');
    expect(() =>
      changeScenario(s, (d) => {
        d.journeys[0].capacityKg = -1;
      }),
    ).toThrow('invalid_scenario_input');
    expect(() =>
      changeScenario(s, (d) => {
        d.journeys[0].perMinuteIdr = Infinity;
      }),
    ).toThrow('invalid_scenario_input');
    expect(() =>
      changeScenario(s, (d) => {
        d.requests[0].window = [30, 10];
      }),
    ).toThrow('invalid_scenario_input');
    expect(s.budgetIdr).toBe(600000);
  });
  it('provides real carrier-specific option calculations', () => {
    const s = createScenario(),
      requestId = s.requests[0].id,
      options = journeyOptions(s, requestId);
    expect(options).toHaveLength(6);
    expect(options.some((o) => o.feasible)).toBe(true);
    for (const option of options.filter((o) => o.feasible)) {
      const p = planScenario(s, { [requestId]: option.journeyId });
      expect(p.assignments.find((a) => a.requestId === requestId)?.journeyId).toBe(option.journeyId);
      expect(option.costIdr).toBe(p.routes.find((r) => r.journeyId === option.journeyId)?.costIdr);
    }
  });
  it('compares against pooled collection loops and reconciles its accepted workload', () => {
    const s = createScenario(),
      p = planScenario(s);
    expect(p.baselineKm).toBeGreaterThan(0);
    expect(p.baselineCostIdr).toBeGreaterThan(0);
    const accepted = s.requests.filter((r) => p.assignments.some((a) => a.requestId === r.id));
    expect(p.outstandingCostIdr).toBe(accepted.reduce((n, r) => n + HANDLING_COSTS[r.handling], 0));
    expect(
      pathKm(
        roadPath([
          [-24, -24],
          [24, 24],
        ]),
      ),
    ).toBe(9.6);
  });
});
describe('approval, custody and exception authority', () => {
  it('rejects a stale or tampered proposal without changing state', () => {
    const s = createScenario(),
      p = planScenario(s),
      changed = changeScenario(s, (d) => (d.budgetIdr += 1));
    expect(() => approvePlan(changed, p)).toThrow('stale_plan');
    expect(() => approvePlan(s, { ...p, totalCostIdr: p.totalCostIdr - 1 })).toThrow('invalid_plan');
    expect(s.events).toHaveLength(0);
    expect(s.requests.every((r) => r.phase === 'requested')).toBe(true);
  });
  it('has chronological, idempotent physical events and never invents data clearance', () => {
    const s = createScenario(),
      p = planScenario(s),
      approved = approvePlan(s, p);
    expect(approvePlan(approved, p).events).toEqual(approved.events);
    const final = run(approved);
    const data = final.requests.filter(
      (r) => r.dataBearing && p.assignments.some((a) => a.requestId === r.id),
    );
    expect(data.every((r) => r.phase === 'received' && !r.dataCleared)).toBe(true);
    expect(final.requests.some((r) => r.phase === 'completed')).toBe(true);
    const times = final.events.map((e) => e.atMinute);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(final.events.map((e) => e.id)).size).toBe(final.events.length);
    expect(advanceService(final)).toBe(final);
    const cleared = changeScenario(final, (d) =>
      d.requests.forEach((r) => {
        if (r.phase === 'received') r.dataCleared = true;
      }),
    );
    expect(cleared.revision).toBe(final.revision);
    const done = run(cleared);
    expect(
      done.requests
        .filter((r) => p.assignments.some((a) => a.requestId === r.id))
        .every((r) => r.phase === 'completed'),
    ).toBe(true);
    expect(done.approvedPlan!.outstandingCostIdr).toBe(0);
  });
  it('holds physical custody when receiving capacity or funding is withdrawn', () => {
    const physical = afterCollected(createScenario()),
      r = physical.requests.find((r) => r.phase === 'collected')!;
    const closed = changeScenario(physical, (d) => {
      d.receivers.find((x) => x.id === r.receiverId)!.capacitySlots = 0;
    });
    const reapproved = approvePlan(closed, planScenario(closed));
    const held = run(reapproved);
    expect(held.requests.find((x) => x.id === r.id)!.phase).toBe('collected');
    const unfunded = changeScenario(physical, (d) => {
      d.budgetIdr = 0;
    });
    const plan = planScenario(unfunded);
    const approved = approvePlan(unfunded, plan);
    expect(advanceService(approved)).toBe(approved);
    expect(() =>
      changeScenario(physical, (d) => {
        d.requests.find((x) => x.id === r.id)!.massKg += 1;
      }),
    ).toThrow('custody_record_immutable');
  });
  it('reports exact logistics hold reasons without classifying delivered history as a carrier hold', () => {
    const physical = afterCollected(createScenario()),
      request = physical.requests.find((r) => r.phase === 'collected')!;
    expect(getPhysicalHoldReason(physical, request)).toBeNull();
    const carrier = physical.approvedPlan!.assignments.find((a) => a.requestId === request.id)!.journeyId;
    const unavailable = changeScenario(physical, (d) => {
      d.journeys.find((j) => j.id === carrier)!.available = false;
    });
    expect(
      getPhysicalHoldReason(
        unavailable,
        unavailable.requests.find((r) => r.id === request.id)!,
      ),
    ).toBe('carrier_unavailable');
    const closed = changeScenario(physical, (d) => {
      d.receivers.find((r) => r.id === request.receiverId)!.available = false;
    });
    expect(
      getPhysicalHoldReason(
        closed,
        closed.requests.find((r) => r.id === request.id)!,
      ),
    ).toBe('receiver_unavailable');
    const full = changeScenario(physical, (d) => {
      d.receivers.find((r) => r.id === request.receiverId)!.capacitySlots = 0;
    });
    expect(
      getPhysicalHoldReason(
        full,
        full.requests.find((r) => r.id === request.id)!,
      ),
    ).toBe('receiver_capacity');
    const noSpace = changeScenario(physical, (d) => {
      d.journeys.find((j) => j.id === carrier)!.capacityKg = 0;
    });
    expect(
      getPhysicalHoldReason(
        noSpace,
        noSpace.requests.find((r) => r.id === request.id)!,
      ),
    ).toBe('vehicle_capacity');
    const noBudget = changeScenario(physical, (d) => {
      d.budgetIdr = 0;
    });
    expect(
      getPhysicalHoldReason(
        noBudget,
        noBudget.requests.find((r) => r.id === request.id)!,
      ),
    ).toBe('budget');
    const progressed = run(physical);
    const received = progressed.requests.find((r) => r.phase === 'received')!;
    const receivedCarrier = progressed.approvedPlan!.assignments.find(
      (a) => a.requestId === received.id,
    )!.journeyId;
    const departed = changeScenario(progressed, (d) => {
      d.journeys.find((j) => j.id === receivedCarrier)!.available = false;
    });
    expect(
      getPhysicalHoldReason(
        departed,
        departed.requests.find((r) => r.id === received.id)!,
      ),
    ).toBeNull();
    const completed = progressed.requests.find((r) => r.phase === 'completed')!;
    expect(getPhysicalHoldReason(progressed, completed)).toBeNull();
    expect(getPhysicalHoldReason(createScenario(), createScenario().requests[0])).toBeNull();
  });
  it('revoking consent invalidates assignment approval and keeps physical custody', () => {
    const s = createScenario(),
      approved = approvePlan(s, planScenario(s));
    const revoked = changeScenario(approved, (d) => {
      d.requests[0].consent = false;
    });
    expect(revoked.requests.every((r) => r.phase !== 'assigned')).toBe(true);
    expect(advanceService(revoked)).toBe(revoked);
    const physical = afterCollected(s),
      r = physical.requests.find((r) => r.phase === 'collected')!,
      carrier = physical.approvedPlan!.assignments.find((a) => a.requestId === r.id)!.journeyId;
    const canceled = changeScenario(physical, (d) => {
      d.journeys.find((j) => j.id === carrier)!.available = false;
    });
    expect(canceled.requests.find((x) => x.id === r.id)!.phase).toBe('collected');
    expect(planScenario(canceled).assignments.find((a) => a.requestId === r.id)!.journeyId).toBe(carrier);
    expect(advanceService(canceled)).toBe(canceled);
    const reapproved = approvePlan(canceled, planScenario(canceled));
    const progressed = run(reapproved);
    expect(progressed.requests.find((x) => x.id === r.id)!.phase).toBe('collected');
  });
});
describe('versioned local scenario import', () => {
  it('round-trips authored and progressed states without touching legacy storage', () => {
    const s = createScenario();
    const restored = importScenario(exportScenario(s))!;
    expect(restored.requests).toEqual(s.requests);
    expect(restored.revision).toBe(s.revision + 1);
    const physical = run(approvePlan(s, planScenario(s)));
    const recovered = importScenario(exportScenario(physical))!;
    expect(recovered.requests).toEqual(physical.requests);
    expect(recovered.events).toEqual(physical.events);
    expect(advanceService(recovered)).toBe(recovered);
    expect(STORAGE_KEY).not.toContain('session.v1');
  });
  it('imports no executable approval from edited cached plans', () => {
    const s = createScenario(),
      approved = approvePlan(s, planScenario(s));
    approved.requests[0].massKg = 999;
    approved.journeys.forEach((j) => (j.capacityKg = 0));
    approved.budgetIdr = 0;
    approved.receivers.forEach((r) => (r.capacitySlots = 0));
    const imported = importScenario(exportScenario(approved))!;
    expect(imported).not.toBeNull();
    expect(imported.approvedPlan).toBeNull();
    expect(advanceService(imported)).toBe(imported);
    expect(planScenario(imported).served).toBe(0);
  });
  it('flags a comparison whose dedicated depot cannot meet the same pickup window', () => {
    const s = createScenario();
    s.requests = s.requests.slice(0, 1);
    s.requests[0].position = [-36, -36];
    s.requests[0].window = [0, 0.1];
    const p = planScenario(s);
    expect(p.served).toBe(1);
    expect(p.baselineFeasible).toBe(false);
    expect(p.baselineServed).toBe(0);
  });
  it('preserves completed data-clearance evidence and respects owner intent', () => {
    const s = createScenario(),
      approved = approvePlan(s, planScenario(s));
    let done = run(approved);
    done = changeScenario(done, (d) =>
      d.requests.forEach((r) => {
        if (r.phase === 'received') r.dataCleared = true;
      }),
    );
    done = run(done);
    const completed = done.requests.find((r) => r.phase === 'completed' && r.dataBearing)!;
    expect(() =>
      changeScenario(done, (d) => {
        d.requests.find((r) => r.id === completed.id)!.dataCleared = false;
      }),
    ).toThrow('completed_record_immutable');
    const recycled = addRequest(s, {
      category: 'phone',
      label: 'Ponsel daur ulang',
      position: [12, 0],
      intent: 'recycle',
    });
    expect(recycled.requests.at(-1)!.receiverId).toBe('material');
    const bulkyRepair = addRequest(s, {
      category: 'large_appliance',
      label: 'Mesin cuci perbaikan',
      position: [12, 0],
      intent: 'repair',
      consent: true,
    });
    const request = bulkyRepair.requests.at(-1)!;
    expect(planScenario(bulkyRepair).assignments.some((a) => a.requestId === request.id)).toBe(false);
  });
  it('rejects inconsistent custody, dangerous values, unknown references and malformed input', () => {
    const s = createScenario();
    expect(importScenario('{bad')).toBeNull();
    expect(importScenario({ version: 1 })).toBeNull();
    expect(importScenario({ ...s, budgetIdr: Infinity })).toBeNull();
    const forged = structuredClone(s);
    forged.requests[0].phase = 'completed';
    forged.requests[0].dataCleared = true;
    expect(importScenario(forged)).toBeNull();
    const unknown = structuredClone(s);
    unknown.requests[0].receiverId = 'missing';
    expect(importScenario(unknown)).toBeNull();
    const duplicates = structuredClone(s);
    duplicates.requests[1].id = duplicates.requests[0].id;
    expect(importScenario(duplicates)).toBeNull();
  });
});
