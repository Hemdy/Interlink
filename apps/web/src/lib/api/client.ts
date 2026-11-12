export interface JsonApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  errorMessage?: string;
}

/**
 * Sends a JSON POST request with same-origin credentials and parses responses safely,
 * surfacing clear error messages even if the server returns an empty or HTML error page.
 */
export async function postJson<T>(
  url: string,
  payload: unknown,
  fallbackError: string,
): Promise<JsonApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let parsed: { data?: T; error?: { message?: string } } | null = null;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as { data?: T; error?: { message?: string } };
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      errorMessage:
        parsed?.error?.message ??
        `${fallbackError} (HTTP ${res.status})`,
    };
  }

  return {
    ok: true,
    status: res.status,
    data: parsed?.data,
  };
}
