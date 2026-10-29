import type { Translations } from '../types';

/**
 * Burmese strings. Spoken register ("…မယ်"), not formal "…သည်".
 * Every string needs native-speaker review before launch — see
 * docs/DECISIONS.md → "Copy review".
 *
 * Burmese has no plural forms, so `_one` and `_other` are identical.
 */
const my: Translations = {
  common: {
    continue: 'ဆက်မယ်',
    back: 'နောက်သို့',
    close: 'ပိတ်မယ်',
    lb: 'lb',
    g: 'g',
    kcal: 'ကယ်လိုရီ',
  },
  language: {
    change: 'ဘာသာစကား ပြောင်းမယ်',
  },
  welcome: {
    title: 'ရိုက်လိုက်၊ သိလိုက်',
    start: 'စမယ်',
    signIn: 'အကောင့် ဝင်မယ်',
  },
  aboutYou: {
    title: 'သင့်အကြောင်း',
    sex: 'ကျား / မ',
    male: 'ကျား',
    female: 'မ',
    birthYear: 'မွေးနှစ်',
    height: 'အရပ်',
    feet: 'ပေ',
    inches: 'လက်မ',
    weight: 'ကိုယ်အလေးချိန်',
  },
  workday: {
    title: 'နေ့စဉ် အလုပ်',
    office: 'ရုံးထိုင်',
    shop: 'ဆိုင် / ဈေး',
    physical: 'ကိုယ်လက် အလုပ်',
    home: 'အိမ် / ကျောင်း',
  },
  tabs: {
    home: 'ပင်မ',
    progress: 'တိုးတက်မှု',
    settings: 'ဆက်တင်',
    add: 'အစားအစာ ထည့်မယ်',
  },
  home: {
    caloriesLeft: 'ကယ်လိုရီ ကျန်',
    rice: 'ထမင်း',
    protein: 'အသား',
    fat: 'အဆီ',
    streak_one: 'ဆက်တိုက် {{count}} ရက်',
    streak_other: 'ဆက်တိုက် {{count}} ရက်',
    today: 'ဒီနေ့',
    weekdays: ['လာ', 'ဂါ', 'ဟူး', 'ကြာ', 'သော', 'နေ', 'နွေ'],
  },
  add: {
    title: 'အစားအစာ ထည့်မယ်',
    photo: 'ဓာတ်ပုံ',
    voice: 'ပြောမယ်',
    search: 'ရှာမယ်',
    barcode: 'ဘားကုဒ်',
  },
  camera: {
    freeScans_one: 'ဒီနေ့ အခမဲ့ {{count}} ကြိမ် ကျန်',
    freeScans_other: 'ဒီနေ့ အခမဲ့ {{count}} ကြိမ် ကျန်',
    flash: 'ဖလက်ရှ်',
    gallery: 'ဓာတ်ပုံများ',
    shutter: 'ဓာတ်ပုံ ရိုက်မယ်',
    permissionTitle: 'အစားအစာ ရိုက်ဖို့ ကင်မရာ ခွင့်ပြုပါ',
    permissionAllow: 'ကင်မရာ ခွင့်ပြုမယ်',
  },
  progress: {
    title: 'တိုးတက်မှု',
    weight: 'အလေး',
    waist: 'ခါး',
    trend: '{{value}} · {{weeks}} ပတ်',
    streak: 'ရက် ဆက်တိုက်',
    bmi: 'BMI',
    bmiUnder: 'အလေးချိန် နည်း',
    bmiNormal: 'ပုံမှန်',
    bmiOver: 'အလေးချိန် များ',
    bmiObese: 'အဝလွန်',
  },
  settings: {
    title: 'ဆက်တင်',
    premium: 'Premium',
    sectionGoals: 'ကိုယ်ပိုင်',
    sectionDaily: 'နေ့စဉ်',
    sectionApp: 'အက်ပ်',
    goals: 'ပန်းတိုင်',
    health: 'ကျန်းမာရေး',
    uposatha: 'ဥပုသ်နေ့ သက်သတ်လွတ်',
    feastDay: 'ဒီနေ့ အလှူ / ပွဲ',
    reminders: 'သတိပေးချက်',
    wifiOnly: 'Wi-Fi ရမှ ပို့',
    language: 'ဘာသာစကား',
  },
  paywall: {
    title: 'Premium',
    unlimitedScans: 'ဓာတ်ပုံ အကန့်အသတ်မရှိ',
    healthGoals: 'သွေးချို / သွေးတိုး',
    weeklyReport: 'အပတ်စဉ် အစီရင်ခံစာ',
    month1: '1 လ',
    month3: '3 လ',
    bestValue: 'ပိုတန်တယ်',
    price: '{{price}} ကျပ်',
    noAutoRenew: 'အလိုအလျောက် ငွေ မဖြတ်ဘူး',
  },
};

export default my;
