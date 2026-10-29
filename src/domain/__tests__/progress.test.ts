import { axisTicks, goalProgress } from '../progress';

describe('goalProgress', () => {
  it('measures weight loss toward the target', () => {
    expect(goalProgress('lose', 145, 138, 125)).toBeCloseTo(0.35);
  });
  it('measures weight gain toward the target', () => {
    expect(goalProgress('gain', 110, 115, 120)).toBeCloseTo(0.5);
  });
  it('clamps to 0–1', () => {
    expect(goalProgress('lose', 145, 150, 125)).toBe(0);
    expect(goalProgress('lose', 145, 120, 125)).toBe(1);
  });
  it('is null when maintaining or without a goal', () => {
    expect(goalProgress('maintain', 140, 139, 140)).toBeNull();
    expect(goalProgress(null, 140, 139, 130)).toBeNull();
  });
});

describe('axisTicks', () => {
  it('covers the range with round steps', () => {
    const ticks = axisTicks(137.4, 145.6);
    expect(ticks[0]).toBeLessThanOrEqual(137.4);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(145.6);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(6);
  });
});
