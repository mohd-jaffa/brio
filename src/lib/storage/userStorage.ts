/**
 * What this device keeps for the signed-in user — an order being built, say —
 * in `localStorage`, under a key that names the user. It is a convenience:
 * storage can be missing or refuse (a private window, a full disk), and every
 * call here then does nothing rather than failing the screen. Signing out
 * clears all of it (src/features/auth/AuthProvider.tsx), so the next person to
 * use the device never sees it.
 */
const PREFIX = "brio_user:";

const keyFor = (userId: string, name: string) => `${PREFIX}${userId}:${name}`;

export function readUserItem<T>(userId: string, name: string): T | null {
  try {
    const stored = localStorage.getItem(keyFor(userId, name));
    return stored === null ? null : (JSON.parse(stored) as T);
  } catch {
    return null;
  }
}

export function writeUserItem(userId: string, name: string, value: unknown): void {
  try {
    localStorage.setItem(keyFor(userId, name), JSON.stringify(value));
  } catch {
    // Kept for this visit only; nothing to tell anyone.
  }
}

export function removeUserItem(userId: string, name: string): void {
  try {
    localStorage.removeItem(keyFor(userId, name));
  } catch {
    // Nothing stored, or nothing to be done about it.
  }
}

const clearedListeners = new Set<() => void>();

/**
 * Runs `listener` whenever the user's items are cleared, so a copy held in
 * memory — a store behind a screen — is dropped with them.
 */
export function onUserItemsCleared(listener: () => void): () => void {
  clearedListeners.add(listener);
  return () => clearedListeners.delete(listener);
}

/** Everything any user kept on this device. */
export function clearUserItems(): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    for (const key of keys) if (key?.startsWith(PREFIX)) localStorage.removeItem(key);
  } catch {
    // As above.
  }
  for (const listener of clearedListeners) listener();
}
