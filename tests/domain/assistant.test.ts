import { describe, it, expect, vi } from 'vitest';
import { createAssistantService, parseInput, validateSuggestion } from '../../server/assistant-core';
const secret = 'test-demo-secret-at-least-24-chars';
const input = { task: 'intake', text: 'Laptop lama masih menyimpan foto.', locale: 'id' };
const result = {
  summary: 'Laptop perlu ditinjau.',
  category: 'laptop',
  missingFields: ['owner_intent'],
  nextStep: 'Konfirmasi tujuan pemilik.',
  flags: ['data_review'],
};
function service(fetcher = vi.fn()) {
  return {
    fetcher,
    run: createAssistantService({
      apiKey: 'test-upstream-key',
      accessSecret: secret,
      fetcher,
      now: () => 1000,
    }),
  };
}
describe('controlled assistant', () => {
  it('rejects client-selected models and injected message arrays', () => {
    expect(parseInput({ ...input, model: 'expensive/model' })).toBeNull();
    expect(parseInput({ ...input, messages: [] })).toBeNull();
  });
  it('rejects arrays and objects masquerading as literal task and locale', () => {
    expect(parseInput({ ...input, task: ['intake'] })).toBeNull();
    expect(parseInput({ ...input, locale: ['id'] })).toBeNull();
    expect(parseInput({ ...input, task: { toString: () => 'intake' } })).toBeNull();
  });
  it('rejects invalid and oversized inputs', () => {
    expect(parseInput({ ...input, text: 'a'.repeat(2001) })).toBeNull();
    expect(parseInput({ ...input, locale: 'fr' })).toBeNull();
    expect(parseInput({ ...input, task: 'approve_data_release' })).toBeNull();
    expect(parseInput(null)).toBeNull();
  });
  it('never calls a paid model without access', async () => {
    const { run, fetcher } = service();
    expect((await run(input, 'wrong')).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('fails closed when either secret is missing', async () => {
    const fetcher = vi.fn();
    const run = createAssistantService({ apiKey: '', accessSecret: secret, fetcher });
    expect((await run(input, secret)).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses a bounded fixed-model request and returns only a validated suggestion', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }), {
        status: 200,
      }),
    );
    const { run } = service(fetcher);
    const response = await run(input, secret);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ suggestion: result, source: 'ai' });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('google/gemini-2.5-flash-lite');
    expect(body.max_tokens).toBe(350);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[1].content).toContain(input.text);
  });
  it('does not retry or leak upstream errors', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('private upstream error', { status: 429 }));
    const { run } = service(fetcher);
    const response = await run(input, secret);
    expect(response.status).toBe(502);
    expect(JSON.stringify(response)).not.toContain('private');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed or unauthorized model fields', () => {
    expect(validateSuggestion({ ...result, approved: true })).toBeNull();
    expect(validateSuggestion({ ...result, category: 'certified_recycled' })).toBeNull();
    expect(validateSuggestion({ ...result, flags: ['approved'] })).toBeNull();
  });
  it('rate limits repeat calls before reaching upstream', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('error', { status: 500 }));
    const { run } = service(fetcher);
    for (let i = 0; i < 12; i++) await run(input, secret);
    expect((await run(input, secret)).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(12);
  });
});
