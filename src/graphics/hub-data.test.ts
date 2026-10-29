import { describe, expect, it } from 'vitest';
import { getLiveOperationsFrame, getLiveVehiclePose, LIVE_PERIOD } from '../domain/live-operations';
import { getHubZoneAssets } from './hub-data';

const ids = (items: ReturnType<typeof getHubZoneAssets>) => items.map((item) => item.asset.id).sort();

describe('physical live hub queues', () => {
  it('keeps travelling collection and partner loads out of the hub docks', () => {
    const frame = getLiveOperationsFrame(0);
    expect(frame.snapshot.assetList.some((item) => item.status === 'collected')).toBe(true);
    expect(frame.snapshot.assetList.some((item) => item.status === 'routed')).toBe(true);
    expect(frame.vehicles.some((vehicle) => vehicle.phase === 'unloading')).toBe(false);
    expect(getHubZoneAssets(frame.snapshot, 'inbound', frame)).toEqual([]);
    expect(getHubZoneAssets(frame.snapshot, 'outbound', frame)).toEqual([]);
  });

  it('shows only the recovery records on vehicles actually unloading at the dock', () => {
    const at = Array.from({ length: LIVE_PERIOD }, (_, second) => second).find(
      (second) => getLiveVehiclePose('V01', second)?.phase === 'unloading',
    )!;
    const frame = getLiveOperationsFrame(at);
    const expected = frame.vehicles
      .filter((vehicle) => vehicle.phase === 'unloading')
      .flatMap((vehicle) => vehicle.loadAssetIds)
      .sort();
    expect(expected.length).toBeGreaterThan(0);
    expect(ids(getHubZoneAssets(frame.snapshot, 'inbound', frame))).toEqual(expected);
    const downstream = new Set(
      frame.vehicles
        .filter((vehicle) => ['delivering', 'partner_handoff'].includes(vehicle.phase))
        .flatMap((vehicle) => vehicle.loadAssetIds),
    );
    expect(
      getHubZoneAssets(frame.snapshot, 'outbound', frame).some((item) => downstream.has(item.asset.id)),
    ).toBe(false);
  });

  it('preserves the tutorial status-based queues when a live frame is not supplied', () => {
    const snapshot = getLiveOperationsFrame(0).snapshot;
    expect(ids(getHubZoneAssets(snapshot, 'inbound'))).toEqual(
      ids(snapshot.assetList.filter((item) => item.status === 'collected')),
    );
    expect(ids(getHubZoneAssets(snapshot, 'outbound'))).toEqual(
      ids(snapshot.assetList.filter((item) => item.status === 'routed')),
    );
  });
});
