import { keepBurmeseWords } from '../burmeseWrap';

const J = '⁠';

describe('keepBurmeseWords', () => {
  it('joins the syllables of each word, not across spaces', () => {
    expect(keepBurmeseWords('တစ်ရက် ပျမ်းမျှ ကယ်လိုရီ')).toBe(
      `တစ်${J}ရက် ပျမ်း${J}မျှ ကယ်${J}လို${J}ရီ`,
    );
  });

  it('keeps killed and stacked consonants in their syllable', () => {
    // င့် (dot below + asat) and the kinzi in သင်္ကြန် get no joiner before them.
    expect(keepBurmeseWords('သင့်အကြောင်း')).toBe(`သင့်${J}အ${J}ကြောင်း`);
    expect(keepBurmeseWords('သင်္ကြန်')).toBe('သင်္ကြန်');
  });

  it('leaves Latin text, digits and breaks after ၊ alone', () => {
    expect(keepBurmeseWords('Premium 1,920')).toBe('Premium 1,920');
    expect(keepBurmeseWords('ပါ၊ရက်')).toBe('ပါ၊ရက်');
  });
});
