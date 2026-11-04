export type Point = [number, number];
export type Handling = 'ordinary' | 'bulky' | 'specialist';
export type DeviceCategory =
  | 'phone'
  | 'laptop'
  | 'tablet'
  | 'router'
  | 'accessories'
  | 'small_appliance'
  | 'monitor'
  | 'printer'
  | 'large_appliance'
  | 'battery';
export type RequestPhase = 'requested' | 'assigned' | 'collected' | 'received' | 'completed';
export interface RecoveryRequest {
  id: string;
  label: string;
  neighborhood: string;
  position: Point;
  category: DeviceCategory;
  massKg: number;
  slots: number;
  handling: Handling;
  dataBearing: boolean;
  consent: boolean;
  dataCleared: boolean;
  window: [number, number];
  receiverId: string;
  intent: 'reuse' | 'repair' | 'recycle';
  phase: RequestPhase;
  userAdded?: boolean;
}
export interface Provider {
  id: string;
  name: string;
  description: [string, string];
  color: string;
}
export interface Journey {
  id: string;
  providerId: string;
  name: string;
  vehicle: 'bike' | 'van' | 'truck';
  origin: Point;
  destination: Point;
  stops: Point[];
  startMinute: number;
  endMinute: number;
  capacityKg: number;
  capacitySlots: number;
  handling: Handling[];
  available: boolean;
  maxExtraMinutes: number;
  dispatchIdr: number;
  perMinuteIdr: number;
}
export interface Receiver {
  id: string;
  name: string;
  position: Point;
  kind: 'reuse' | 'material' | 'specialist';
  handling: Handling[];
  capacitySlots: number;
  window: [number, number];
  available: boolean;
}
export interface CustodyEvent {
  id: string;
  requestId: string;
  kind: 'approved' | 'collected' | 'received' | 'completed';
  atMinute: number;
  actor: string;
  note: string;
}
export interface Assignment {
  requestId: string;
  journeyId: string;
  receiverId: string;
  pickupMinute: number;
  receivedMinute: number;
}
export interface RoutePlan {
  journeyId: string;
  originalPath: Point[];
  path: Point[];
  requestIds: string[];
  originalKm: number;
  plannedKm: number;
  addedKm: number;
  addedMinutes: number;
  driverPaymentIdr: number;
  handlingCostIdr: number;
  costIdr: number;
  finishMinute: number;
}
export interface Rejection {
  requestId: string;
  code: string;
  detail: string;
}
export interface Plan {
  id: string;
  revision: number;
  assignments: Assignment[];
  routes: RoutePlan[];
  rejections: Rejection[];
  totalCostIdr: number;
  addedKm: number;
  addedMinutes: number;
  served: number;
  baselineKm: number;
  baselineCostIdr: number;
  outstandingCostIdr: number;
  baselineServed?: number;
  baselineFeasible?: boolean;
}
export interface Scenario {
  version: 3;
  revision: number;
  requests: RecoveryRequest[];
  providers: Provider[];
  journeys: Journey[];
  receivers: Receiver[];
  budgetIdr: number;
  events: CustodyEvent[];
  approvedPlan: Plan | null;
  serviceMinute: number;
}
export type SelectedEntity = { kind: 'request' | 'journey' | 'receiver'; id: string } | null;
export interface RecoveryWorldProps {
  scenario: Scenario;
  plan: Plan;
  selected: SelectedEntity;
  onSelect: (entity: SelectedEntity) => void;
  locale: 'id' | 'en';
  reducedMotion: boolean;
  playing: boolean;
  time: number;
  view: 'city' | 'vehicle' | 'hub' | 'device';
  force2D?: boolean;
  quality?: 'auto' | 'low' | 'high';
}
