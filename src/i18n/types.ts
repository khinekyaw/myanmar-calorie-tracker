import type en from './locales/en';

type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? string[]
    : { [K in keyof T]: Widen<T[K]> };

/** Shape every locale must match. Missing or extra keys fail type-checking. */
export type Translations = Widen<typeof en>;
