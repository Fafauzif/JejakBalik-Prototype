import { useMemo } from 'react';
import { useAppStore } from '../state/store';
import { getDateFormatter, getNumberFormatter } from './formatters';
import { translateKey } from './translate';
export function useLocale() {
  const locale = useAppStore((s) => s.locale);
  return useMemo(
    () => ({
      locale,
      t: (indonesian: string, english: string) => (locale === 'en' ? english : indonesian),
      tr: (key: string) => translateKey(locale, key),
      number: (value: number, options: number | Intl.NumberFormatOptions = 0) =>
        getNumberFormatter(
          locale === 'id' ? 'id-ID' : 'en-GB',
          typeof options === 'number' ? { maximumFractionDigits: options } : options,
        ).format(value),
      money: (value: number) =>
        getNumberFormatter(locale === 'id' ? 'id-ID' : 'en-GB', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(value),
      date: (value: string | Date, options?: Intl.DateTimeFormatOptions) =>
        getDateFormatter(locale === 'id' ? 'id-ID' : 'en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
          ...options,
        }).format(typeof value === 'string' ? new Date(value) : value),
    }),
    [locale],
  );
}
export const categoryNames: Record<string, [string, string]> = {
  phone: ['Ponsel', 'Phone'],
  laptop: ['Laptop', 'Laptop'],
  tablet: ['Tablet', 'Tablet'],
  router: ['Router', 'Router'],
  accessories: ['Kabel & aksesori', 'Cables & accessories'],
  cables: ['Kabel & aksesori', 'Cables & accessories'],
  small_appliance: ['Peralatan kecil', 'Small appliance'],
  monitor: ['Monitor', 'Monitor'],
  printer: ['Printer', 'Printer'],
  large_appliance: ['Peralatan besar', 'Large appliance'],
  battery: ['Baterai', 'Battery'],
};
export const statusNames: Record<string, [string, string]> = {
  draft: ['Draf', 'Draft'],
  requested: ['Diajukan', 'Requested'],
  validated: ['Ditinjau', 'Reviewed'],
  scheduled: ['Terjadwal', 'Scheduled'],
  assigned: ['Siap dijemput', 'Assigned'],
  collected: ['Dijemput', 'Collected'],
  received: ['Diterima di hub', 'At the hub'],
  triaged: ['Dipilah', 'Triaged'],
  routed: ['Diteruskan', 'Routed'],
  completed: ['Tuntas', 'Completed'],
  held: ['Menunggu tinjauan', 'Awaiting review'],
  deferred: ['Jadwal berikutnya', 'Next window'],
};
export const dispositionNames: Record<string, [string, string]> = {
  reuse: ['Pemanfaatan kembali', 'Reuse'],
  repair: ['Perbaikan', 'Repair'],
  refurbishment: ['Rekondisi', 'Refurbishment'],
  parts: ['Pemulihan komponen', 'Parts recovery'],
  material: ['Pemulihan material', 'Material recovery'],
  specialist: ['Penanganan khusus', 'Specialist treatment'],
};
export function localizedPair(map: Record<string, [string, string]>, key: string, locale: 'id' | 'en') {
  return map[key]?.[locale === 'en' ? 1 : 0] || key.replaceAll('_', ' ');
}
