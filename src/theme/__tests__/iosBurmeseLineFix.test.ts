import { buildTypeScale, iosBurmeseLineFix } from '../typography';

describe('iosBurmeseLineFix', () => {
  const my = buildTypeScale('my');

  it('gives Burmese its full line height and takes the extra back in the margins', () => {
    const title = my.title; // 24 px, lineHeight 37
    const fix = iosBurmeseLineFix({ ...title, marginTop: 40 })!;
    expect(fix.lineHeight).toBe(53); // ceil(24 × 2.184)
    expect(fix.marginTop).toBe(40 - 8);
    expect(fix.marginBottom).toBe(-8);
  });

  it('only changes the line height of an input', () => {
    expect(iosBurmeseLineFix(my.headline, false)).toEqual({ lineHeight: Math.ceil(18 * 2.184) });
  });

  it('leaves Latin text and tall enough lines alone', () => {
    expect(iosBurmeseLineFix(buildTypeScale('en').title)).toBeNull();
    expect(iosBurmeseLineFix({ ...my.body, lineHeight: 40 })).toBeNull();
  });
});
