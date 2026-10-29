import rawAssets from './data/ASSETS.json';
import rawRequests from './data/REQUESTS.json';
import rawRoutes from './data/ROUTES.json';
import rawVehicles from './data/VEHICLES.json';
import rawEvents from './data/EVENTS.json';
import rawScenarios from './data/SCENARIOS.json';
import rawWorld from './data/WORLD.json';
import rawPartners from './data/PARTNERS.json';
import rawTemplates from './data/EXPLORATION_TEMPLATES.json';
import type {
  Asset,
  RequestRecord,
  RouteRecord,
  Vehicle,
  StoryEvent,
  Scenario,
  Vec2,
  Disposition,
  HandlingClass,
} from './types';
export { default as catalog } from './data/DEVICE_CATALOG.json';
export { default as agents } from './data/AGENTS.json';
export { default as financialAssumptions } from './data/FINANCIAL_ASSUMPTIONS.json';
export { default as scenarioPlanOverrides } from './data/SCENARIO_PLAN_OVERRIDES.json';
export const assets = rawAssets as Asset[];
export const requests = rawRequests as RequestRecord[];
export const routes = rawRoutes as unknown as RouteRecord[];
export const vehicles = rawVehicles as Vehicle[];
export const events = rawEvents as StoryEvent[];
export const scenarios = rawScenarios as Scenario[];
export const world = rawWorld as typeof rawWorld & {
  hub: { id: string; name: string; position: Vec2 };
  households: Array<{ id: string; districtId: string; label: string; position: Vec2; active: boolean }>;
};
export const partners = rawPartners;
export const explorationTemplates = rawTemplates as unknown as Omit<typeof rawTemplates, 'templates'> & {
  templates: Array<{
    category: string;
    massKg: number;
    baseRecoveredValueIdr: number;
    components: string[];
    dataBearing: boolean;
    handlingClass: HandlingClass;
    conditionToDisposition: Record<string, Disposition>;
    destinationByDisposition: Record<Disposition, string>;
  }>;
};
