export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T = Record<string, unknown>>(
  url: string,
  opts: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined || opts.form ? 'POST' : 'GET');
  const res = await fetch(url, {
    method,
    headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `요청에 실패했어요 (${res.status})`, res.status, data.code, data);
  return data as T;
}

export function download(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
