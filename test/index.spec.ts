// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.

describe('Hello World worker', () => {
  it('responds with Hello World! (integration style)', async () => {
    const response = await SELF.fetch('https://example.com');
    expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
  });
});
