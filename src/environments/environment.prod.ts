/**
 * Runtime configuration for the NeverBeen website (production build).
 *
 * The Cloudflare Worker that serves the built site proxies `/neverbeen-api/*`
 * to the deployed NeverBeen Web API (see `worker/index.ts` and `wrangler.jsonc`,
 * where the target can be overridden with the `NEVERBEEN_API_URL` variable), so
 * the production site keeps using the same same-origin API path as development.
 *
 * Change `apiBaseUrl` to the API's own origin (for example
 * `https://api.yourdomain.com`) when the API is hosted elsewhere — that host
 * must list this site's origin in `Cors:AllowedOrigins`.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/neverbeen-api',
};
