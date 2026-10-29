import { describe, expect, it } from 'vitest';
import { translateKey } from './translate';
import id from './id.json';
import en from './en.json';

describe('lightweight bilingual dictionary', () => {
  it('keeps every shipped key available in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
    for (const [locale, dictionary] of [
      ['id', id],
      ['en', en],
    ] as const)
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim().length).toBeGreaterThan(0);
        expect(translateKey(locale, key)).toBe(value);
      }
    expect(translateKey('id', 'nav.network')).toBe('Jaringan');
    expect(translateKey('en', 'nav.network')).toBe('Network');
  });

  it('returns missing keys as plain text without consulting the object prototype', () => {
    for (const locale of ['id', 'en'] as const)
      for (const key of ['missing.translation', '__proto__', 'constructor', 'toString', ''])
        expect(translateKey(locale, key)).toBe(key);
  });
});
