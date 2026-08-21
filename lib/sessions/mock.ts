const DAY = 86_400_000;

type SeedSession = {
  id: string;
  deviceName: string | null;
  userAgent: string;
  issuedOffsetMs: number;
  ttlMs: number;
};

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

export const SEED_OTHER_SESSIONS: SeedSession[] = [
  { id: "sess-2", deviceName: "iPhone 15", userAgent: IPHONE, issuedOffsetMs: 2 * DAY, ttlMs: 30 * DAY },
  { id: "sess-3", deviceName: null, userAgent: WINDOWS, issuedOffsetMs: 9 * DAY, ttlMs: 30 * DAY },
  { id: "sess-4", deviceName: "Pixel 8", userAgent: ANDROID, issuedOffsetMs: 20 * DAY, ttlMs: 22 * DAY },
];
