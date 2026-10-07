/**
 * Runtime configuration for the NeverBeen website (production build / deployed site).
 *
 * `apiBaseUrl` is the base URL of the **NeverBeen Web API** — the ASP.NET Core
 * `neverbeen-api` service that stores the community (members, profiles, journey,
 * message book, companionships, …) in PostgreSQL / Supabase. **This is the single
 * switch for the API address: change it here and rebuild.**
 *
 * The browser calls the API directly, so the API must:
 *   1. be reachable over HTTPS from the visitor's browser, and
 *   2. allow this site's origin in `Cors:AllowedOrigins` (appsettings.json) —
 *      e.g. `https://youneverbeen.kingshukbanu1987.workers.dev`.
 *
 * Alternative — CORS-free same-origin mode: set `apiBaseUrl: '/neverbeen-api'`.
 * The Cloudflare Worker then forwards `/neverbeen-api/*` to the API server-side
 * (`NEVERBEEN_API_URL` in `wrangler.jsonc`), so the browser never talks to the
 * API host at all.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://neverbeen-api-kingshuk-cqexbcb5hqbqavdb.westus3-01.azurewebsites.net',
};
