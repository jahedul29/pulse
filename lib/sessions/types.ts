export type DeviceSession = {
  id: string;
  deviceName: string;
  userAgent?: string;
  issuedAt: number;
  expiresAt: number;
  current: boolean;
};
