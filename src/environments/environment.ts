/**
 * Runtime configuration for the NeverBeen website (development).
 *
 * `apiBaseUrl` is the base URL of the **NeverBeen Web API** — the ASP.NET Core
 * `neverbeen-api` service that stores the community (members, profiles, journey,
 * message book, friendships, …) in the PostgreSQL / Supabase database.
 *
 * The default is the same-origin `/neverbeen-api` path. The Angular dev server
 * (`proxy.conf.json`) and the Cloudflare Worker (`worker/index.ts`) both forward
 * that path to the deployed API, so the browser never has to deal with CORS or
 * mixed-content blocking:

 *   browser ──► /neverbeen-api/api/registration ──► https://neverbeen-api-kingshuk.azurewebsites.net/api/registration
 *
 * Point it at another host (for example `https://api.yourdomain.com`) to call a
 * different API deployment — remember to add this site's origin to that API's
 * `Cors:AllowedOrigins` setting.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/neverbeen-api',
};
