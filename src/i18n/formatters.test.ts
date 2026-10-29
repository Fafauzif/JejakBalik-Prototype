import { describe, expect, it } from 'vitest';
import { FORMATTER_CACHE_LIMIT, getDateFormatter, getNumberFormatter } from './formatters';

describe('reused localized formatters', () => {
  it('preserves Indonesian/English number, percent and rupiah output', () => {
    for (const locale of ['id-ID', 'en-GB']) {
      for (const options of [
        { maximumFractionDigits: 0 },
        { maximumFractionDigits: 2 },
        { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 },
        { style: 'percent', maximumFractionDigits: 1 },
      ] as Intl.NumberFormatOptions[]) {
        const formatter = getNumberFormatter(locale, options);
        for (const value of [0, 0.386, -100.125, 2_812, 1_234_567.89, NaN, Infinity])
          expect(formatter.format(value)).toBe(new Intl.NumberFormat(locale, options).format(value));
      }
    }
  });

  it('reuses equivalent option objects regardless of property order and keeps locale/options distinct', () => {
    const formatter = getNumberFormatter('id-ID', { style: 'currency', currency: 'IDR' });
    expect(getNumberFormatter('id-ID', { currency: 'IDR', style: 'currency' })).toBe(formatter);
    expect(getNumberFormatter('en-GB', { currency: 'IDR', style: 'currency' })).not.toBe(formatter);
    expect(getNumberFormatter('id-ID', { currency: 'USD', style: 'currency' })).not.toBe(formatter);
  });

  it('preserves Jakarta date defaults and explicit date/time-zone options', () => {
    const date = new Date('2026-10-19T18:30:00Z');
    for (const locale of ['id-ID', 'en-GB']) {
      for (const options of [
        { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' },
        { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' },
        { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false },
      ] as Intl.DateTimeFormatOptions[]) {
        const formatter = getDateFormatter(locale, options);
        expect(formatter.format(date)).toBe(new Intl.DateTimeFormat(locale, options).format(date));
        expect(getDateFormatter(locale, { ...options })).toBe(formatter);
      }
    }
  });

  it('bounds both caches and evicts the least recently used formatter', () => {
    const first = getNumberFormatter('en-GB', { style: 'currency', currency: 'XAA' });
    for (let i = 1; i <= FORMATTER_CACHE_LIMIT; i++)
      getNumberFormatter('en-GB', {
        style: 'currency',
        currency: `X${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
      });
    expect(getNumberFormatter('en-GB', { style: 'currency', currency: 'XAA' })).not.toBe(first);

    const date = getDateFormatter('en-GB', { timeZone: 'UTC' });
    const zones = [
      'Africa/Abidjan',
      'Africa/Accra',
      'Africa/Addis_Ababa',
      'Africa/Algiers',
      'Africa/Asmara',
      'Africa/Bamako',
      'Africa/Bangui',
      'Africa/Banjul',
      'Africa/Bissau',
      'Africa/Blantyre',
      'Africa/Brazzaville',
      'Africa/Bujumbura',
      'Africa/Cairo',
      'Africa/Casablanca',
      'Africa/Ceuta',
      'Africa/Conakry',
      'Africa/Dakar',
      'Africa/Dar_es_Salaam',
      'Africa/Djibouti',
      'Africa/Douala',
      'Africa/El_Aaiun',
      'Africa/Freetown',
      'Africa/Gaborone',
      'Africa/Harare',
      'Africa/Johannesburg',
      'Africa/Juba',
      'Africa/Kampala',
      'Africa/Khartoum',
      'Africa/Kigali',
      'Africa/Kinshasa',
      'Africa/Lagos',
      'Africa/Libreville',
    ];
    for (const timeZone of zones) getDateFormatter('en-GB', { timeZone });
    expect(zones).toHaveLength(FORMATTER_CACHE_LIMIT);
    expect(getDateFormatter('en-GB', { timeZone: 'UTC' })).not.toBe(date);
  });

  it('keeps native validation errors rather than caching invalid options', () => {
    expect(() => getNumberFormatter('en-GB', { style: 'currency' })).toThrow(TypeError);
    expect(() => getDateFormatter('id-ID', { timeZone: 'Not/A_Time_Zone' })).toThrow(RangeError);
    expect(getNumberFormatter('en-GB', { maximumFractionDigits: 0 }).format(1234)).toBe('1,234');
  });
});
