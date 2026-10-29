import { describe, expect, it } from 'vitest';
import { buildBatchReport } from './report';
import { canonicalContext } from '../../domain/context';
import { deriveSnapshot } from '../../domain/engine';
import { makeSession, recordDecision, reviewGate } from '../../domain/session';
import type { DecisionAction, GateId } from '../../domain/types';

function snapshot(holdData = false) {
  let session = makeSession();
  const choices: Array<[GateId, DecisionAction]> = [
    ['hero', 'submit_hero'],
    ['specialist', 'approve_specialist'],
    ['data', holdData ? 'retain_data_hold' : 'approve_data_release'],
  ];
  for (const [gate, action] of choices) {
    const decision = recordDecision(action, reviewGate(gate, session));
    if (!decision.ok) throw Error('gate failed');
    session = decision.session;
  }
  const context = canonicalContext('circular_day');
  return deriveSnapshot(context.seed, context.events, session.decisions, 180, 'circular_day', context);
}
describe('localized batch reports', () => {
  it('exports completed totals and platform share once, never the share ratio as revenue', () => {
    const s = snapshot();
    const html = buildBatchReport(s, 'en');
    expect(html).toContain('189.64 kg');
    expect(html).toContain('48/48');
    expect(html).toContain('3,048,874');
    expect(html).toContain('1,678,174');
    expect(html).toContain('15,244,370');
    expect((html.match(/<td>JB-A\d+/g) || []).length).toBe(s.metrics.batchAssets);
    expect(html).toContain('Print / save PDF');
    expect(html).toContain('Main operations · 19 October 2026');
    expect(html).toContain('A circular day');
    expect(html).toContain('src="/brand/logo.svg"');
    expect(html.split('</header>')[0]).not.toContain('circular_day');
    expect(html.split('</header>')[0]).not.toContain('canonical');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });
  it('retains held status and shows only actual completed outcomes', () => {
    const s = snapshot(true);
    const html = buildBatchReport(s, 'en');
    expect(html).toContain('Held');
    expect(html).toContain('Not complete');
    expect(html).toContain(`${s.metrics.completedAssets}/${s.metrics.collectedAssets}`);
    const number = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(s.metrics.batchOperatingContributionIdr);
    expect(html).toContain(number);
    expect(s.metrics.completedAssets).toBeLessThan(s.metrics.collectedAssets);
  });
  it('does not include an unsubmitted hero asset in the submitted batch table', () => {
    const context = canonicalContext('circular_day');
    const s = deriveSnapshot(context.seed, context.events, [], 0, 'circular_day', context);
    const html = buildBatchReport(s, 'id');
    expect((html.match(/<td>JB-A\d+/g) || []).length).toBe(s.metrics.batchAssets);
    expect(html).toContain('Cetak / simpan PDF');
    expect(html).toContain('Belum selesai');
  });
  it('escapes imported text so a report cannot execute a record as markup', () => {
    const s = snapshot();
    s.assetList[0] = {
      ...s.assetList[0],
      asset: { ...s.assetList[0].asset, category: '<img src=x onerror=alert(1)>' },
    };
    const html = buildBatchReport(s, 'en');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img src=x');
  });
});
