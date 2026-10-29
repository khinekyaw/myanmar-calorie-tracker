/**
 * English strings. This file is the source of truth for translation keys:
 * `my.ts` must have exactly the same shape (TypeScript enforces it).
 *
 * Copy rules: one short headline per screen, no helper paragraphs.
 */
const en = {
  common: {
    continue: 'Continue',
    back: 'Back',
    close: 'Close',
    lb: 'lb',
    g: 'g',
    kcal: 'kcal',
  },
  language: {
    change: 'Change language',
  },
  welcome: {
    title: 'Snap it. Know it.',
    start: 'Get started',
    signIn: 'I have an account',
  },
  aboutYou: {
    title: 'About you',
    sex: 'Sex',
    male: 'Male',
    female: 'Female',
    birthYear: 'Birth year',
    height: 'Height',
    feet: 'Feet',
    inches: 'Inches',
    weight: 'Weight',
  },
  workday: {
    title: 'Your workday',
    office: 'Office / desk',
    shop: 'Shop / market',
    physical: 'Physical work',
    home: 'Home / school',
  },
  tabs: {
    home: 'Home',
    progress: 'Progress',
    settings: 'Settings',
    add: 'Add food',
  },
  home: {
    caloriesLeft: 'Calories left',
    rice: 'Rice plates',
    protein: 'Protein',
    fat: 'Fat',
    streak_one: '{{count}} day streak',
    streak_other: '{{count}} day streak',
    today: 'Today',
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },
  add: {
    title: 'Add food',
    photo: 'Photo',
    voice: 'Speak',
    search: 'Search',
    barcode: 'Barcode',
  },
  camera: {
    freeScans_one: '{{count}} free scan left today',
    freeScans_other: '{{count}} free scans left today',
    flash: 'Flash',
    gallery: 'Photos',
    shutter: 'Take photo',
    permissionTitle: 'Allow camera to scan food',
    permissionAllow: 'Allow camera',
  },
  progress: {
    title: 'Progress',
    weight: 'Weight',
    waist: 'Waist',
    trend: '{{value}} · {{weeks}} weeks',
    streak: 'Day streak',
    bmi: 'BMI',
    bmiUnder: 'Underweight',
    bmiNormal: 'Healthy',
    bmiOver: 'Overweight',
    bmiObese: 'Obese',
  },
  settings: {
    title: 'Settings',
    premium: 'Premium',
    sectionGoals: 'You',
    sectionDaily: 'Daily',
    sectionApp: 'App',
    goals: 'Goals',
    health: 'Health',
    uposatha: 'Vegetarian on Uposatha days',
    feastDay: 'Feast day today',
    reminders: 'Reminders',
    wifiOnly: 'Send photos on Wi-Fi only',
    language: 'Language',
  },
  paywall: {
    title: 'Premium',
    unlimitedScans: 'Unlimited photo scans',
    healthGoals: 'Blood sugar & pressure goals',
    weeklyReport: 'Weekly report',
    month1: '1 month',
    month3: '3 months',
    bestValue: 'Best value',
    price: '{{price}} Ks',
    noAutoRenew: 'No auto-renew',
  },
};

export default en;
