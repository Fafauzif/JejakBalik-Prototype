/** Shared role vocabulary for map roofs, map badges, minimaps and entity lists. */
export const PARTNER_STYLES = {
  P01: { color: '#5a947c', ink: '#285a43', badge: '↻', role: { id: 'Guna ulang', en: 'Reuse' } },
  P02: { color: '#a18ac1', ink: '#624b83', badge: '▦', role: { id: 'Komponen', en: 'Components' } },
  P03: { color: '#c48764', ink: '#864d32', badge: '♺', role: { id: 'Material', en: 'Materials' } },
  P04: { color: '#bc9c53', ink: '#74541d', badge: '◆', role: { id: 'Khusus', en: 'Specialist' } },
} as const;
export function getPartnerStyle(id: string) {
  return PARTNER_STYLES[id as keyof typeof PARTNER_STYLES] || PARTNER_STYLES.P01;
}
