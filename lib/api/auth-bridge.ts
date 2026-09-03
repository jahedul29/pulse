export interface AuthBridge {
  getAccessToken: () => string | null;
  refresh: () => Promise<boolean>;
  onAuthLost: () => void;
}

let bridge: AuthBridge | null = null;

export function registerAuthBridge(next: AuthBridge) {
  bridge = next;
}

export function getAuthBridge(): AuthBridge | null {
  return bridge;
}
