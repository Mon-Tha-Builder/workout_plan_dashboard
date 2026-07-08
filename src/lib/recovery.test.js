import { describe, it, expect } from 'vitest';
import { scoreReadiness } from './recovery.js';

describe('scoreReadiness', () => {
  it('scores great recovery inputs into the green zone', () => {
    const result = scoreReadiness({ sleepQuality: 9, energy: 9, soreness: 2, stress: 2, pain: '', timeAvailable: 60 });
    expect(result.zone).toBe('green');
    expect(result.score).toBeGreaterThanOrEqual(65);
  });

  it('scores poor recovery inputs into the red zone', () => {
    const result = scoreReadiness({ sleepQuality: 2, energy: 2, soreness: 9, stress: 9, pain: '', timeAvailable: 45 });
    expect(result.zone).toBe('red');
    expect(result.score).toBeLessThan(35);
  });

  it('scores middling inputs into the yellow zone', () => {
    const result = scoreReadiness({ sleepQuality: 6, energy: 5, soreness: 6, stress: 5, pain: '', timeAvailable: 45 });
    expect(result.zone).toBe('yellow');
  });

  it('penalizes reported pain, potentially downgrading the zone', () => {
    const withoutPain = scoreReadiness({ sleepQuality: 7, energy: 7, soreness: 4, stress: 4, pain: '', timeAvailable: 45 });
    const withPain = scoreReadiness({ sleepQuality: 7, energy: 7, soreness: 4, stress: 4, pain: 'neck', timeAvailable: 45 });
    expect(withPain.score).toBeLessThan(withoutPain.score);
    expect(withPain.recommendation).toMatch(/pain noted/i);
  });

  it('treats "none" as no pain (case-insensitive, no penalty)', () => {
    const explicitNone = scoreReadiness({ sleepQuality: 7, energy: 7, soreness: 4, stress: 4, pain: 'None', timeAvailable: 45 });
    const empty = scoreReadiness({ sleepQuality: 7, energy: 7, soreness: 4, stress: 4, pain: '', timeAvailable: 45 });
    expect(explicitNone.score).toBe(empty.score);
  });

  it('reduces score under heavy recent training load', () => {
    const rested = scoreReadiness({ sleepQuality: 7, energy: 7, soreness: 4, stress: 4, pain: '' }, 0);
    const overloaded = scoreReadiness({ sleepQuality: 7, energy: 7, soreness: 4, stress: 4, pain: '' }, 3);
    expect(overloaded.score).toBeLessThan(rested.score);
  });

  it('clamps out-of-range and missing inputs to sane defaults instead of throwing', () => {
    expect(() => scoreReadiness({})).not.toThrow();
    const clampedHigh = scoreReadiness({ sleepQuality: 999, energy: -5, soreness: 4, stress: 4, pain: '' });
    expect(clampedHigh.score).toBeGreaterThanOrEqual(0);
    expect(clampedHigh.score).toBeLessThanOrEqual(100);
  });

  it('never returns a score outside 0-100', () => {
    const min = scoreReadiness({ sleepQuality: 1, energy: 1, soreness: 10, stress: 10, pain: 'everything' }, 3);
    const max = scoreReadiness({ sleepQuality: 10, energy: 10, soreness: 1, stress: 1, pain: '' }, 0);
    expect(min.score).toBeGreaterThanOrEqual(0);
    expect(max.score).toBeLessThanOrEqual(100);
  });
});
