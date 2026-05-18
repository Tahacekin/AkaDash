/**
 * Tiny fetch wrapper:
 * - Always sends cookies (`credentials: 'include'`) so the JWT session works.
 * - Lets callers pass any of the usual fetch options.
 * - Throws an Error whose `.status` is the HTTP status when not 2xx; the body
 *   (parsed JSON when possible) is attached as `.payload` for the caller to use.
 */
export async function apiFetch(input, init = {}) {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init.headers || {}),
    },
  });

  let payload = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  } else {
    try {
      payload = await res.text();
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const err = new Error(
      (payload && payload.error) ||
        (typeof payload === 'string' ? payload : '') ||
        `Request failed: ${res.status}`
    );
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

export const api = {
  get: (url) => apiFetch(url),
  post: (url, body) =>
    apiFetch(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
};
