export type AssetStatus =
  | 'draft'
  | 'requested'
  | 'validated'
  | 'scheduled'
  | 'assigned'
  | 'collected'
  | 'received'
  | 'triaged'
  | 'routed'
  | 'completed';
export type HandlingClass = 'ordinary' | 'bulky' | 'specialist';
export type Disposition = 'reuse' | 'repair' | 'refurbishment' | 'parts' | 'material' | 'specialist';
export type ScenarioId = 'circular_day' | 'battery_review' | 'capacity_shift' | 'exploration';
export type Language = 'id' | 'en';
export type Vec2 = readonly [number, number];
export type GateId = 'hero' | 'specialist' | 'data';
export interface Asset {
  id: string;
  requestId: string;
  householdId: string;
  category: string;
  catalogVariant: number;
  massKg: number;
  baseRecoveredValueIdr: number;
  components: string[];
  plannedDisposition: Disposition;
  dataBearing: boolean;
  batteryRisk: 'none' | 'damaged' | 'specialist';
  handlingClass: HandlingClass;
  condition: string;
  destinationId: string;
  initialStatus: AssetStatus;
  scenarioRecordId: string;
  routeId: string;
  collectionStorySecond: number;
  receivedStorySecond: number;
}
export interface RequestRecord {
  id: string;
  householdId: string;
  assetIds: string[];
  pickupWindow: string;
  date: string;
  timezone: 'Asia/Jakarta';
  initiallySubmitted: boolean;
  hero: boolean;
  addressAlias: string;
  contactAlias: string;
  batchId?: string;
  windowIds?: string[];
}
export interface Vehicle {
  id: string;
  label: string;
  handlingClass: HandlingClass;
  capacityKg: number;
  capacityAssets: number;
  ratePerKmIdr: number;
  dispatchFeeIdr: number;
}
export interface RouteStop {
  householdId: string;
  position: Vec2;
  distanceFromStartUnits: number;
  assetIds: string[];
  arrivalStorySecond: number;
}
export interface RouteRecord {
  id: string;
  vehicleId: string;
  handlingClass: HandlingClass;
  mode: 'backhaul' | 'route_compatible' | 'grouped_reverse' | 'specialist';
  assetIds: string[];
  stops: RouteStop[];
  path: Vec2[];
  distanceKm: number;
  startStorySecond: number;
  endStorySecond: number;
  loadKg: number;
  guard: 'specialist_approved' | null;
}
export type Guard = 'hero_submitted' | 'specialist_approved' | 'data_release_approved';
export interface StoryEvent {
  id: string;
  atSecond: number;
  kind: string;
  assetId: string | null;
  guard: Guard | null;
  payload: Record<string, unknown>;
}
export type DecisionAction =
  | 'submit_hero'
  | 'approve_specialist'
  | 'retain_specialist_hold'
  | 'approve_data_release'
  | 'retain_data_hold';
export interface Decision {
  id: string;
  scenarioId: ScenarioId;
  batchId: string;
  windowId: string;
  atSecond: number;
  action: DecisionAction;
}
export interface GateReviewToken {
  gateId: GateId;
  scenarioId: ScenarioId;
  batchId: string;
  windowId: string;
  revision: number;
}
export interface WindowSession {
  batchId: string;
  windowId: string;
  scenarioId: ScenarioId;
  cursor: number;
  paused: boolean;
  revision: number;
  decisions: Decision[];
  reviewToken: GateReviewToken | null;
}
export interface Scenario {
  id: ScenarioId;
  labelId: string;
  durationSeconds: number;
  deferredRequestIds: string[];
  startingApprovalFlags: Record<string, never>;
}
export interface DerivationContext {
  batchId: string;
  windowId: string;
  serviceDate: string;
  seed: readonly Asset[];
  requests: readonly RequestRecord[];
  activeRoutes: readonly RouteRecord[];
  eventOverrides: readonly StoryEvent[];
  events: readonly StoryEvent[];
  eligibleAssetIds: string[];
  destinationCapacity: Record<string, number>;
  funding: { serviceContractFeeIdr: number; communityAccessSponsorIdr: number };
  gates: GateId[];
}
export interface AssetSnapshot {
  asset: Asset;
  status: AssetStatus;
  held: boolean;
  holdReason: 'safety' | 'data' | null;
  deferred: boolean;
  dataCleared: boolean;
  custodyEventIds: string[];
  custodyEvents: StoryEvent[];
}
export interface Metrics {
  requests: number;
  batchAssets: number;
  windowEligibleAssets: number;
  householdsServed: number;
  collectedAssets: number;
  completedAssets: number;
  collectedMassKg: number;
  massKg: number;
  assets: number;
  completedDispositions: Record<Disposition, number>;
  dispositions: Record<Disposition, number>;
  dataBearingAssets: number;
  dataClearedAssets: number;
  collectedDataBearingAssets: number;
  valueRetainedAssets: number;
  valueRetentionPercent: number | null;
  groupedRouteSegments: number;
  vehicles: number;
  groupedDistanceKm: number;
  groupedCollectionCostIdr: number;
  dedicatedTrips: number;
  dedicatedDistanceKm: number;
  dedicatedCollectionCostIdr: number;
  grossRecoveredValueIdr: number;
  platformRecoveredValueShare: number;
  recoveredValueIdr: number;
  processingCostIdr: number;
  dataClearanceCostIdr: number;
  serviceContractFeeIdr: number;
  communityAccessSponsorIdr: number;
  batchOperatingContributionIdr: number;
  collectionCoveragePercent: number | null;
  currentWindowFulfillmentPercent: number | null;
  custodyCompletionCollectedPercent: number | null;
  distanceReductionPercent: number | null;
  collectionCostReductionPercent: number | null;
  deferredAssets: number;
  heldUncollected: number;
  heldAtHub: number;
}
export interface Snapshot {
  scenarioId: ScenarioId;
  batchId: string;
  windowId: string;
  serviceDate: string;
  cursor: number;
  assets: Record<string, AssetSnapshot>;
  assetList: AssetSnapshot[];
  submittedRequestIds: string[];
  requests: RequestRecord[];
  pendingCheckpoint: GateId | null;
  metrics: Metrics;
  decisions: Decision[];
  routes: RouteRecord[];
  context: DerivationContext;
}
export interface ExplorationItemInput {
  category: string;
  condition: string;
}
export interface ExplorationRequestInput {
  items: ExplorationItemInput[];
  addressId?: string;
  addressAlias?: string;
  contactAlias?: string;
}
export interface ExplorationWindow {
  id: string;
  date: string;
  assetIds: string[];
}
export interface ExplorationBatch {
  id: string;
  started: boolean;
  requests: RequestRecord[];
  assets: Asset[];
  windows: ExplorationWindow[];
}
export interface CapacityReservation {
  batchId: string;
  windowId: string;
  date: string;
  assetIds: string[];
}
export interface ExplorationState {
  batches: ExplorationBatch[];
  reservations: CapacityReservation[];
  requestCount: number;
}
export type Selection = {
  type: 'asset' | 'route' | 'household' | 'agent' | 'hub' | 'partner' | 'vehicle';
  id: string;
} | null;
