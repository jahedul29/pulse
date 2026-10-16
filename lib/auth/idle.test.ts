import {
  formatCountdown,
  IDLE_TIMEOUT_MINUTES,
  IDLE_WARNING_SECONDS,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  idleLoginHref,
  idlePhase,
  LAST_ACTIVITY_KEY,
  readLastActivity,
  secondsUntilSignOut,
  writeLastActivity,
} from "./idle";

describe("idle timing", () => {
  const start = 1_000_000;

  const warningAt = IDLE_TIMEOUT_MS - IDLE_WARNING_MS;

  it("warns shortly before signing out", () => {
    expect(IDLE_TIMEOUT_MS).toBe(IDLE_TIMEOUT_MINUTES * 60_000);
    expect(IDLE_WARNING_MS).toBe(IDLE_WARNING_SECONDS * 1000);
    expect(idlePhase(start, start + warningAt - 1)).toBe("active");
    expect(idlePhase(start, start + warningAt)).toBe("warning");
    expect(idlePhase(start, start + IDLE_TIMEOUT_MS)).toBe("expired");
  });

  it("counts down the seconds left", () => {
    expect(secondsUntilSignOut(start, start + warningAt)).toBe(IDLE_WARNING_SECONDS);
    expect(secondsUntilSignOut(start, start + warningAt + 500)).toBe(IDLE_WARNING_SECONDS);
    expect(secondsUntilSignOut(start, start + IDLE_TIMEOUT_MS + 60_000)).toBe(0);
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(9)).toBe("0:09");
  });

  it("shares the last activity through local storage", () => {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    expect(readLastActivity()).toBeNull();
    writeLastActivity(start);
    expect(readLastActivity()).toBe(start);
    localStorage.setItem(LAST_ACTIVITY_KEY, "not a time");
    expect(readLastActivity()).toBeNull();
  });

  it("sends the user back to the page they were on after signing in again", () => {
    expect(idleLoginHref("/admin/roles?page=2")).toBe("/login?reason=idle&returnTo=%2Fadmin%2Froles%3Fpage%3D2");
  });
});
