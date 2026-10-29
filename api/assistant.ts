import { createAssistantService, parseInput } from '../server/assistant-core';
// Structural Node types avoid a new runtime dependency.
export type AssistantRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
export type AssistantResponse = {
  setHeader(name: string, value: string): unknown;
  status(code: number): AssistantResponse;
  json(value: unknown): unknown;
};
const service = createAssistantService({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  accessSecret: process.env.AI_DEMO_ACCESS_CODE ?? '',
  model: process.env.OPENROUTER_MODEL,
});
export default async function handler(req: AssistantRequest, res: AssistantResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const header = (key: string) => (typeof req.headers[key] === 'string' ? (req.headers[key] as string) : '');
  if (!/^application\/json(?:;|$)/i.test(header('content-type')))
    return res.status(415).json({ error: 'json_required' });
  if (Number(header('content-length')) > 5000) return res.status(413).json({ error: 'request_too_large' });
  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 5000) return res.status(413).json({ error: 'request_too_large' });
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'invalid_request' });
    }
  }
  if (body && typeof body === 'object' && JSON.stringify(body).length > 5000)
    return res.status(413).json({ error: 'request_too_large' });
  if (!parseInput(body)) return res.status(400).json({ error: 'invalid_request' });
  const result = await service(body, header('x-demo-access'));
  if (result.status === 429) res.setHeader('Retry-After', '3600');
  return res.status(result.status).json(result.body);
}
