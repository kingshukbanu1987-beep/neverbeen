/** Shared native Gemini transport. Credentials never appear in request URLs or logs. */
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiGenerateContentUrl(model) {
  // ListModels returns resource names; accept those as well as bare model IDs.
  const id = model.trim().replace(/^models\//, '');
  return `${GEMINI_ENDPOINT}/${encodeURIComponent(id)}:generateContent`;
}

export function geminiHeaders(key) {
  return { 'content-type': 'application/json', 'x-goog-api-key': key };
}

/** Log only status and model, never upstream bodies (which can echo user data or secrets). */
export async function logGeminiFailure(scope, model, response) {
  const reason =
    response.status === 404
      ? 'model-not-found: check model availability for this project and API version'
      : response.status === 401 || response.status === 403
        ? 'authentication-or-permission: check the server secret and API restrictions'
        : response.status === 429
          ? 'quota-or-rate-limit'
          : 'upstream-failure';
  console.warn(`[${scope}] Gemini ${model} answered ${response.status}: ${reason}`);
}
