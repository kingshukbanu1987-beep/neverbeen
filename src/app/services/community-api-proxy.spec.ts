import { afterEach, describe, expect, it, vi } from 'vitest';
import workerEntry from '../../../worker/index';

const worker = (workerEntry as { default?: typeof workerEntry }).default ?? workerEntry;
const ORIGIN = 'https://youneverbeen.kingshukbanu1987.workers.dev';
const ENV = {
  ASSETS: {
    fetch: async (request: Request) => new Response(`asset:${new URL(request.url).pathname}`),
  },
};

function call(request: Request, env: unknown = ENV) {
  return worker.fetch(request, env as never);
}

/**
 * The Angular app reaches the NeverBeen Web API (member sign-up, sign-in, profiles) through the
 * same-origin `/neverbeen-api/*` path; the Worker forwards those calls server-side so the browser
 * never has to deal with CORS or mixed content.
 */
describe('Worker — NeverBeen Web API proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards /neverbeen-api/* to the deployed API and returns its response', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      calls.push(input instanceof Request ? input.url : String(input));
      return new Response(JSON.stringify({ id: 7, fullName: 'Elena Rostova' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await call(
      new Request(`${ORIGIN}/neverbeen-api/api/registration`, {
        method: 'POST',
        headers: { authorization: 'Bearer jwt.token.value' },
        body: 'fullName=Elena+Rostova',
      }),
    );

    expect(calls).toEqual(['https://neverbeen-api-kingshuk.azurewebsites.net/api/registration']);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 7, fullName: 'Elena Rostova' });
  });

  it('keeps the query string and uses the NEVERBEEN_API_URL override', async () => {
    const calls: Array<{ url: string; authorization: string | null }> = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(String(input));
      calls.push({
        url: request.url,
        authorization: request.headers.get('authorization'),
      });
      return new Response('Healthy', { status: 200 });
    });

    const response = await call(
      new Request(`${ORIGIN}/neverbeen-api/api/lookup/countries/60/cities?search=par`, {
        headers: { authorization: 'Bearer jwt.token.value' },
      }),
      { ...ENV, NEVERBEEN_API_URL: 'https://api.example.test/' },
    );

    expect(calls[0].url).toBe('https://api.example.test/api/lookup/countries/60/cities?search=par');
    expect(calls[0].authorization).toBe('Bearer jwt.token.value');
    expect(await response.text()).toBe('Healthy');
  });
});
