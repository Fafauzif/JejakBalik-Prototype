import { describe, expect, it } from 'vitest';
import {
  canContinueJourney,
  journeyStepAtCursor,
  JOURNEY_STEPS,
} from '../../src/features/journey/journey-model';

describe('self-paced journey', () => {
  it('requires actual user decisions before moving past submission and review', () => {
    expect(canContinueJourney(0, [])).toBe(false);
    expect(canContinueJourney(0, ['submit_hero'])).toBe(true);
    expect(canContinueJourney(1, ['submit_hero'])).toBe(false);
    expect(canContinueJourney(1, ['submit_hero', 'retain_specialist_hold'])).toBe(true);
    expect(canContinueJourney(3, ['submit_hero', 'approve_specialist'])).toBe(false);
    expect(canContinueJourney(3, ['retain_data_hold'])).toBe(true);
  });
  it('keeps the no-gate collection stage explorable', () => {
    expect(canContinueJourney(2, [])).toBe(true);
    expect(JOURNEY_STEPS[2].scene).toBe('hub');
  });
  it('restores a bounded explanatory stage from the authored cursor', () => {
    expect(journeyStepAtCursor(0)).toBe(0);
    expect(journeyStepAtCursor(74)).toBe(1);
    expect(journeyStepAtCursor(130)).toBe(3);
    expect(journeyStepAtCursor(180)).toBe(4);
  });
});
