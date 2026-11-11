/** Return useful diagnostics locally without exposing internals in production. */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV === 'production') return fallback;
  return error instanceof Error && error.message ? error.message : fallback;
}
