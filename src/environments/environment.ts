/**
 * Runtime configuration for the NeverBeen website (development / `npm start`).
 *
 * `apiBaseUrl` is the base URL of the **NeverBeen Web API** — the ASP.NET Core
 * `neverbeen-api` service that stores the community (members, profiles, journey,
 * message book, companionships, …) in PostgreSQL / Supabase. **This is the single
 * switch for the API address: change it here and rebuild.**
 *
 * The browser calls the API directly, so the API must:
 *   1. be reachable over HTTPS from the visitor's browser, and
 *   2. allow this site's origin in `Cors:AllowedOrigins` (appsettings.json).
 *
 * Alternative — CORS-free same-origin mode: set `apiBaseUrl: '/neverbeen-api'`.
 * The Angular dev server (`proxy.conf.json`) and the Cloudflare Worker
 * (`worker/index.ts` / `NEVERBEEN_API_URL`, see `wrangler.jsonc`) then forward
 * `/neverbeen-api/*` to the API server-side, so no CORS entry is needed.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'https://neverbeen-api-kingshuk-cqexbcb5hqbqavdb.westus3-01.azurewebsites.net',
};
