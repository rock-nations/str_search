import type { z } from "zod";

/** Browser-side base path. Requests are proxied to FastAPI by `app/api/backend`. */
export const API_BASE_PATH = "/api/backend";

/**
 * A failed API call, normalised from FastAPI's two error shapes:
 * `{"detail": "message"}` and the 422 `{"detail": [{loc, msg, type}]}`.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Validation messages keyed by payload path, e.g. `purchase_details.down_payment_pct`. */
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isNetworkError() {
    return this.status === 0 || this.status === 502 || this.status === 503;
  }
}

type ValidationIssue = { loc?: (string | number)[]; msg?: string };

function parseErrorBody(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return new ApiError(status, detail);

  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of detail as ValidationIssue[]) {
      const path = (issue.loc ?? []).filter((part) => part !== "body").join(".");
      if (path && issue.msg && !fieldErrors[path]) fieldErrors[path] = issue.msg;
    }
    const count = Object.keys(fieldErrors).length;
    return new ApiError(
      status,
      count === 1 ? "One field was rejected by the API." : `${count} fields were rejected by the API.`,
      fieldErrors,
    );
  }

  return new ApiError(status, `Request failed with status ${status}.`);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  signal?: AbortSignal;
};

export async function apiFetch<S extends z.ZodType>(
  path: string,
  schema: S,
  { method = "GET", body, signal }: RequestOptions = {},
): Promise<z.output<S>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Can't reach the training API. Check your connection and try again.");
  }

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) throw parseErrorBody(response.status, json);

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error(`Unexpected response shape from ${path}`, parsed.error);
    throw new ApiError(response.status, "The API returned data in an unexpected format.");
  }
  return parsed.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
