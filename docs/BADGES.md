# Sar AI — Milestones and badges

Home or Progress → tap the streak pill → **Milestones**: current streak, badges earned, longest streak, then every badge by group. Tap a badge for what it takes and when it was earned (or how far along you are).

- Rules: `src/domain/badges.ts` (tested in `domain/__tests__/badges.test.ts`). Worked out on the phone from meals, weights and the plan: no server, works offline.
- Streak and weight badges use the best ever reached, so a broken streak or a bad week never takes one away. Deleting meals can, since counts are recomputed.
- Weight-goal badges (*First 5 lb*, *Halfway There*, *Goal Reached*) are hidden while the goal is "stay the same".
- Names and rule text: `milestones.*` in `src/i18n/locales/en.ts` / `my.ts` (Burmese needs native review).

## The badges

| Group | Id | Name (EN / MY) | How to earn | Illustration |
|---|---|---|---|---|
| Streaks | `streak3` | First Spark / မီးပွား စပြီ | 3 days in a row | a tiny flame catching on a clay oil lamp |
| | `streak7` | Full Week / တစ်ပတ် ပြည့် | 7 days in a row | a small flame with seven sparks in an arc |
| | `streak30` | Full Moon / လပြည့် | 30 days in a row (a lunar month) | a flame in front of a pale full moon |
| | `streak100` | Hundred Days / ရာပြည့် | 100 days in a row | a tall flame with a pagoda *hti* (umbrella finial) above it |
| | `streak365` | Thingyan to Thingyan / သင်္ကြန်မှ သင်္ကြန် | 365 days in a row | a flame with water drops and two yellow padauk flowers |
| Logging | `meals1` | First Bite / ပထမ တစ်လုတ် | First meal logged | a spoon and fork crossed over a small plate of rice |
| | `meals10` | Getting the Taste / အရသာ တွေ့ပြီ | 10 meals | a bowl of rice with a small sparkle |
| | `meals50` | Habit Formed / အကျင့် ဖြစ်ပြီ | 50 meals | a stacked tiffin carrier (ထမင်းချိုင့်) |
| | `meals200` | Thick Notebook / မှတ်စု ထူပြီ | 200 meals | a thick notebook with a pencil |
| | `meals500` | Log Master / မှတ်တမ်း ဆရာ | 500 meals | a tiffin carrier with a small laurel sprig |
| | `threeMeals` | Three Square / သုံးနပ် ပြည့် | Breakfast, lunch and dinner on one day | three small bowls in a row |
| Ways to log | `firstScan` | Snap & Know / ရိုက်လိုက်၊ သိလိုက် | A meal logged by photo | a bowl of mohinga inside camera viewfinder corners |
| | `firstVoice` | Just Say It / ပြောရုံပဲ | A meal logged by speaking | a speech bubble with sound waves |
| | `sharedTable` | Shared Table / ဝိုင်းစား | 5 shared meals | top view of a round low table: rice in the middle, four curry bowls around |
| Myanmar favourites | `mohingaMorning` | Mohinga Morning / မနက်ခင်း မုန့်ဟင်းခါး | Mohinga before noon, 5 times | a bowl of mohinga (egg slices, fritter) with a small rising sun |
| | `teaShop` | Tea Shop Regular / လက်ဖက်ရည်ဆိုင် ဖောက်သည် | Tea 10 times | a glass of milk tea on a saucer with steam |
| | `laphetLover` | Laphet Lover / လက်ဖက်သုပ် ချစ်သူ | Laphet thoke 5 times | a plate of laphet thoke (tea leaves, beans, peanuts) |
| Balance | `riceInCheck` | Rice in Check / ထမင်း ချင့်စား | Within your rice plates, 7 days | a plate of rice with a small green check |
| | `onTarget` | On Target / ကယ်လိုရီ ကိုက် | Calories within 85–105 % of target, 7 days | a target with a small flame in the centre |
| | `proteinPower` | Protein Power / အသား အားဖြည့် | Protein target reached, 5 days | a chicken drumstick and a boiled egg |
| Body | `firstWeighIn` | On the Scale / ချိန်ခွင် တက်ပြီ | First weigh-in after onboarding | a round bathroom scale, top view |
| | `weeklyCheckIn` | Weekly Check-in / အပတ်စဉ် ချိန် | Weigh in during 4 different weeks | a calendar page with four green ticks |
| | `first5lb` | First 5 lb / ပထမ 5 ပေါင် | 5 lb toward the goal (lose or gain) | two footprints next to a small flag |
| | `halfway` | Halfway There / တစ်ဝက် ရောက်ပြီ | Half way to the goal weight | a small hill with a flag half way up |
| | `goalReached` | Goal Reached / ပန်းတိုင် ရောက်ပြီ | Goal weight reached | a small flag on a peak with sparkles |

Days only count once they're over (today never counts toward Balance badges). Feast days keep a streak alive.

## Illustrations

In the app every badge is a **grey circle** with the picture inside and its **number in an ink pill** below (drawn by the app, so digits stay crisp and follow the language).

**Style:** one soft-shaded object per badge, in the same family as the streak fire: simple rounded shapes, gentle 2–3 tone gradients, no outline, no frame, no text. Modern and quiet, close to the app's monochrome look; colour comes from the object only, and almost no gold. (A first try with gold lacquerware medallions felt too ornate and too gold.)

Only the **earned, full-colour** version is needed: the app shows locked badges as a faded greyscale copy of the same picture.

### Prompt (ChatGPT image generation, 3 runs)

Paste the style block, then one batch.

```
Create ONE square 1024×1024 PNG with a fully TRANSPARENT background (real alpha channel: no white, no checkerboard, no floor, no shadow).

Layout: a 3×3 grid of 9 separate icons, read left to right, top to bottom. Each icon is centred in its own cell, all the same visual size, with lots of empty space around it. No grid lines, no frames, no circles or badge shapes behind them, no labels, no numbers, no text of any kind.

Style (identical for all 9):
- ONE single object per icon, drawn as a modern app illustration: simple rounded geometric shapes, soft 2–3 tone gradients for gentle volume (like Apple or Microsoft Fluent emoji, but flatter and calmer), no outlines.
- Matte, clean and friendly. No gloss highlights, no metal, no bevel, no heavy 3D, no drop shadows, no background shape.
- Limited palette, used sparingly: warm orange #E3883A to #F2A04A, pale yellow #FCEAB0, amber #EDB75A, coral #E5674B, violet #8B5CF6, blue #3E7BFA, green #30A46C, cream #FCF8F2, cool grey #D4D4D8, near-black #111217 only for tiny details. Avoid gold.
- Colours are clear and warm, never washed out: no large cream, beige or pale areas (they disappear on a light grey background).
- Front or slight three-quarter view. The object fills about 70% of its cell and reads clearly at 60 px.
```

**Batch 1**
```
The 9 icons:
1. A tiny flame just catching on a small clay oil lamp
2. A small flame with seven little sparks above it in an arc
3. A flame in front of a pale full moon
4. A tall, proud flame with a small golden pagoda umbrella finial (hti) floating above it
5. A flame with a splash of water drops and two small yellow padauk flowers
6. A spoon and fork crossed over a small plate of white rice
7. A bowl of white rice with a little sparkle
8. A three-tier metal tiffin carrier with a side handle
9. A thick green notebook with a pencil
```

**Batch 2**
```
The 9 icons:
1. A three-tier tiffin carrier in bright teal-blue enamel with a small green laurel sprig
2. Three small bowls in a row: an orange one, a coral one and a blue one
3. A bowl of mohinga noodle soup (orange-brown broth, yellow egg slices) inside black camera viewfinder corner brackets
4. A blue speech bubble with three orange sound-wave lines beside it
5. A round low wooden table seen from above: white rice in the middle, four small curry bowls (orange, coral, green, yellow) around it
6. A bowl of mohinga (orange-brown fish broth, sliced boiled egg, a crispy golden fritter) with a small orange rising sun behind it
7. A small glass of Burmese milk tea (warm caramel colour) on a blue saucer, with a wisp of steam
8. A plate of laphet thoke: dark green pickled tea leaves, yellow beans, peanuts, a red chilli
9. A plate of white rice on a blue plate with a round green check-mark badge beside it
```

**Batch 3** (7 icons: leave the last two cells empty)
```
The 7 icons (cells 8 and 9 stay completely empty and transparent):
1. A red-and-white target with a small orange flame in the centre
2. An orange-brown roast chicken drumstick and a halved boiled egg with a bright yellow yolk
3. A round bathroom scale seen from the top: blue body, white dial, small orange needle
4. A calendar page with an orange top bar and four green check marks
5. Two blue footprints next to a small orange flag
6. A green hill with a winding path and an orange flag planted half way up
7. A green peak with a small orange flag on top and yellow sparkles
```

Tips:
- If ChatGPT draws a checkerboard instead of transparency, ask "make the background truly transparent (alpha channel)".
- If one icon drifts in style, regenerate the whole batch rather than mixing.
- Want a bit more depth? Replace the first style bullet with "soft matte clay 3D (like smooth plasticine), pastel studio light, no shine". Keep everything else.

### Adding the art

All 25 badges have art (2026-10-31). Batch 1 came as SVGs; batches 2 and 3 were generated as grids, cut into one PNG per cell, then traced to SVG with `scripts/trace_badges.py` (open-source vtracer, no Figma needed):

1. Save one PNG per badge, white background, named `<id>.png` (ids below).
2. Trace: `.venv-trace/bin/python scripts/trace_badges.py <png folder> <scratch folder> assets/badges` (setup in the script's header). It removes the white background, crops to the icon, and writes `assets/badges/<id>.svg` (about 20–190 KB each, 1 MB for all 25).
3. Check them on the grey circle, then make sure `ART` in `src/features/milestones/BadgeArt.tsx` lists the id (it must: the type requires every badge).

Watch white-on-white subjects (rice, eggs, glass): the background removal can bite into them; lower the threshold argument if it does.

Cell order → file name:
- Batch 1: `streak3`, `streak7`, `streak30`, `streak100`, `streak365`, `meals1`, `meals10`, `meals50`, `meals200`
- Batch 2: `meals500`, `threeMeals`, `firstScan`, `firstVoice`, `sharedTable`, `mohingaMorning`, `teaShop`, `laphetLover`, `riceInCheck`
- Batch 3: `onTarget`, `proteinPower`, `firstWeighIn`, `weeklyCheckIn`, `first5lb`, `halfway`, `goalReached`

The "badges earned" picture on the Milestones hero is a holographic coin drawn in code (`features/milestones/DiamondBadge.tsx`): faceted pastel disc with a star, a shine sweeping across every few seconds and a twinkling sparkle; grey and still before the first badge.
