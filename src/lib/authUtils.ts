export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

/**
 * True when the backend throttled this request.
 *
 * The auth endpoints are rate limited per IP, and repeated sign-in failures
 * lock the account for 15 minutes. Both come back as 429 with a message that
 * says what to do. Showing those under a "Sign in failed" heading invites the
 * user to retry immediately, which is exactly the wrong move: it keeps the
 * limiter's window open and, on the lockout path, achieves nothing until the
 * window expires.
 */
export function isRateLimited(error: unknown): boolean {
  const err = error as { response?: { status?: number; data?: { error?: string } } };
  return err?.response?.status === 429 || err?.response?.data?.error === "TOO_MANY_REQUESTS";
}

