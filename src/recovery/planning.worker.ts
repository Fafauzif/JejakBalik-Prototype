/// <reference lib="webworker" />
import { journeyOptions, planScenario } from './model';
import type { Scenario } from './types';
self.onmessage = (
  event: MessageEvent<{
    sequence: number;
    scenario: Scenario;
    preferences: Record<string, string>;
    requestId: string | null;
  }>,
) => {
  const { sequence, scenario, preferences, requestId } = event.data;
  try {
    const plan = planScenario(scenario, preferences);
    const options = requestId ? journeyOptions(scenario, requestId) : [];
    self.postMessage({ sequence, plan, options });
  } catch {
    self.postMessage({ sequence, error: 'planning_failed' });
  }
};
export {};
