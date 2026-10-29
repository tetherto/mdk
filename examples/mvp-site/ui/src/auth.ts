import { MdkFetchError, passwordAuth } from "@tetherto/mdk-ui-foundation";

// Password sign-in through the Gateway (/auth/login), which proxies the
// Kernel's token issuer. The access token is short-lived; the refresh token is
// an httpOnly cookie, renewed on a 401 and restored once on reload.
export const auth = passwordAuth();

// Same-origin: the Gateway serves the UI, and the Vite dev proxy forwards /site and /auth.
export function post<T>(base: string, path: string, body: unknown): Promise<T> {
  return auth.fetcher<T>(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// The Gateway and app runtime answer `{ message: "ERR_…: …" }`; a refusal is a 403.
export function errorMessage(err: unknown): string {
  if (err instanceof MdkFetchError) {
    const message = (err.body as { message?: unknown } | undefined)?.message;
    const text = typeof message === "string" ? message : err.message;
    return err.status === 403 ? `Not permitted — ${text}` : text;
  }
  return (err as Error)?.message ?? String(err);
}
