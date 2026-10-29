export const CATEGORIES = [
  'phone',
  'laptop',
  'tablet',
  'router',
  'accessories',
  'appliance',
  'battery',
  'unknown',
] as const;
export const FLAGS = [
  'data_review',
  'specialist_review',
  'ownership_review',
  'condition_unknown',
  'capacity_review',
] as const;
export const MISSING_FIELDS = [
  'owner_intent',
  'ownership',
  'condition',
  'battery_condition',
  'data_backup',
  'quantity',
  'receiver_acceptance',
] as const;
export type Suggestion = {
  summary: string;
  category: (typeof CATEGORIES)[number];
  missingFields: (typeof MISSING_FIELDS)[number][];
  nextStep: string;
  flags: (typeof FLAGS)[number][];
};
export type AssistantInput = { task: 'intake' | 'explain_hold'; text: string; locale: 'id' | 'en' };
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
export function parseInput(value: unknown): AssistantInput | null {
  if (!object(value) || Object.keys(value).some((key) => !['task', 'text', 'locale'].includes(key)))
    return null;
  if (
    (value.task !== 'intake' && value.task !== 'explain_hold') ||
    (value.locale !== 'id' && value.locale !== 'en')
  )
    return null;
  if (typeof value.text !== 'string' || value.text.trim().length < 3 || value.text.length > 2000) return null;
  return {
    task: value.task as AssistantInput['task'],
    text: value.text.trim(),
    locale: value.locale as 'id' | 'en',
  };
}
export function validateSuggestion(value: unknown): Suggestion | null {
  if (
    !object(value) ||
    Object.keys(value).length !== 5 ||
    Object.keys(value).some(
      (key) => !['summary', 'category', 'missingFields', 'nextStep', 'flags'].includes(key),
    )
  )
    return null;
  if (
    typeof value.summary !== 'string' ||
    !value.summary.trim() ||
    value.summary.length > 500 ||
    typeof value.nextStep !== 'string' ||
    !value.nextStep.trim() ||
    value.nextStep.length > 500
  )
    return null;
  if (!CATEGORIES.includes(value.category as Suggestion['category'])) return null;
  if (
    !Array.isArray(value.flags) ||
    value.flags.length > FLAGS.length ||
    !value.flags.every((flag) => FLAGS.includes(flag))
  )
    return null;
  if (
    !Array.isArray(value.missingFields) ||
    value.missingFields.length > MISSING_FIELDS.length ||
    !value.missingFields.every((field) => MISSING_FIELDS.includes(field))
  )
    return null;
  return {
    summary: value.summary.trim(),
    category: value.category as Suggestion['category'],
    missingFields: [...new Set(value.missingFields)] as Suggestion['missingFields'],
    nextStep: value.nextStep.trim(),
    flags: [...new Set(value.flags)] as Suggestion['flags'],
  };
}
