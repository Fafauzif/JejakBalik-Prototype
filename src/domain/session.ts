import type { DecisionAction, GateId, WindowSession, ScenarioId } from './types';
export const GATE_TIMES: Record<GateId, number> = { hero: 32, specialist: 74, data: 130 };
export const ACTION_GATE: Record<DecisionAction, GateId> = {
  submit_hero: 'hero',
  approve_specialist: 'specialist',
  retain_specialist_hold: 'specialist',
  approve_data_release: 'data',
  retain_data_hold: 'data',
};
export const makeSession = (
  scenarioId: ScenarioId = 'circular_day',
  batchId = 'canonical',
  windowId = '2026-10-19',
): WindowSession => ({
  scenarioId,
  batchId,
  windowId,
  cursor: 0,
  paused: true,
  revision: 0,
  decisions: [],
  reviewToken: null,
});
export const sessionKey = (session: Pick<WindowSession, 'scenarioId' | 'batchId' | 'windowId'>) =>
  `${session.scenarioId}/${session.batchId}/${session.windowId}`;
export function reviewGate(gateId: GateId, session: WindowSession): WindowSession {
  const revision = session.revision + 1;
  const cursor = GATE_TIMES[gateId];
  return {
    ...session,
    cursor,
    paused: true,
    revision,
    decisions: session.decisions.filter((d) => d.atSecond < cursor),
    reviewToken: {
      gateId,
      scenarioId: session.scenarioId,
      batchId: session.batchId,
      windowId: session.windowId,
      revision,
    },
  };
}
export function recordDecision(
  action: DecisionAction,
  session: WindowSession,
): { ok: true; session: WindowSession } | { ok: false; reason: 'needs_gate_review' } {
  const gateId = ACTION_GATE[action],
    token = session.reviewToken;
  if (
    !token ||
    !session.paused ||
    session.cursor !== GATE_TIMES[gateId] ||
    token.gateId !== gateId ||
    token.revision !== session.revision ||
    token.scenarioId !== session.scenarioId ||
    token.batchId !== session.batchId ||
    token.windowId !== session.windowId
  )
    return { ok: false, reason: 'needs_gate_review' };
  return {
    ok: true,
    session: {
      ...session,
      revision: session.revision + 1,
      reviewToken: null,
      decisions: [
        ...session.decisions,
        {
          id: `${sessionKey(session)}/${gateId}/${session.revision}`,
          scenarioId: session.scenarioId,
          batchId: session.batchId,
          windowId: session.windowId,
          atSecond: GATE_TIMES[gateId],
          action,
        },
      ],
    },
  };
}
