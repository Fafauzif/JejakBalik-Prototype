import type { AssistantInput, Suggestion } from './contract';
export function localSuggestion(input: AssistantInput): Suggestion {
  const text = input.text.toLowerCase();
  const category: Suggestion['category'] = /laptop|notebook/.test(text)
    ? 'laptop'
    : /tablet|ipad/.test(text)
      ? 'tablet'
      : /ponsel|phone|handphone|hape/.test(text)
        ? 'phone'
        : /router|modem/.test(text)
          ? 'router'
          : /baterai|battery/.test(text)
            ? 'battery'
            : /kabel|cable|charger|mouse|keyboard/.test(text)
              ? 'accessories'
              : 'unknown';
  const flags: Suggestion['flags'] = [];
  if (['laptop', 'phone', 'tablet', 'router'].includes(category)) flags.push('data_review');
  if (/bengkak|swollen|bocor|leak|panas|overheat|terbakar/.test(text) || category === 'battery')
    flags.push('specialist_review');
  const en = input.locale === 'en';
  return {
    category,
    summary: en
      ? 'A preliminary review is ready. Device condition and the owner’s intent still need confirmation.'
      : 'Tinjauan awal siap. Kondisi perangkat dan tujuan pemilik masih perlu dikonfirmasi.',
    flags: [...flags, 'condition_unknown'],
    missingFields: flags.includes('data_review')
      ? ['owner_intent', 'ownership', 'data_backup']
      : ['owner_intent', 'ownership', 'condition'],
    nextStep: flags.includes('specialist_review')
      ? en
        ? 'Ask a qualified handling partner to review the item before collection. Do not open or dismantle it.'
        : 'Minta mitra penanganan yang sesuai meninjau barang sebelum penjemputan. Jangan membuka atau membongkarnya.'
      : en
        ? 'Confirm whether the owner wants repair, valuation, or recycling. Check receiver acceptance before offering a slot.'
        : 'Konfirmasi apakah pemilik ingin perbaikan, penilaian, atau daur ulang. Periksa penerimaan mitra sebelum menawarkan jadwal.',
  };
}
