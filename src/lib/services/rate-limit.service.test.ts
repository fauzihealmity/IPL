import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/services/rate-limit.service";

describe("checkRateLimit (spec §37)", () => {
  beforeEach(() => {
    resetRateLimit("test-key");
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("test-key", 5, 1000);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the request once the limit is exceeded", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("test-key", 5, 60_000);
    const sixth = checkRateLimit("test-key", 5, 60_000);
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
    expect(sixth.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks separate keys independently (e.g. different emails)", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("user-a@test.com", 5, 60_000);
    const blockedA = checkRateLimit("user-a@test.com", 5, 60_000);
    const allowedB = checkRateLimit("user-b@test.com", 5, 60_000);
    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
    resetRateLimit("user-a@test.com");
    resetRateLimit("user-b@test.com");
  });

  it("resets the bucket after the time window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    for (let i = 0; i < 5; i++) checkRateLimit("test-key", 5, 1000);
    expect(checkRateLimit("test-key", 5, 1000).allowed).toBe(false);

    vi.setSystemTime(1001);
    expect(checkRateLimit("test-key", 5, 1000).allowed).toBe(true);

    vi.useRealTimers();
  });
});
