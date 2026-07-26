import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = 'cache:';

async function readPersisted<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

async function writePersisted<T>(key: string, entry: CacheEntry<T>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Best-effort — a persistence failure shouldn't break the fetch itself,
    // the in-memory cache still works for the rest of this session either way.
  }
}

/** Wraps an async fetcher with a TTL-aware cache. Checks in-memory first,
 * then AsyncStorage (so a cache built up during one session survives an
 * app restart, not just screen navigation within it), and only calls the
 * real fetcher on a genuine miss or expiry.
 *
 * Deliberately only caches successful results — if `fetcher` throws,
 * nothing gets stored, so a transient network error doesn't get "stuck"
 * as if it were real data for the whole TTL window. This is exactly why
 * caching lives here, at the single lowest-level fetch point, rather than
 * wrapped around higher-level functions that already have their own
 * try/catch-and-fall-back-to-empty-array logic — caching at that layer
 * would risk caching a swallowed failure as if it were a genuine "no data"
 * result. */
export async function withCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();

  const memHit = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memHit && memHit.expiresAt > now) {
    return memHit.value;
  }

  const persisted = await readPersisted<T>(key);
  if (persisted && persisted.expiresAt > now) {
    memoryCache.set(key, persisted);
    return persisted.value;
  }

  const value = await fetcher();
  const entry: CacheEntry<T> = { value, expiresAt: now + ttlMs };
  memoryCache.set(key, entry);
  void writePersisted(key, entry); // fire-and-forget — don't block the caller on persistence
  return value;
}

/** Clears every cached entry, memory and persisted. Not wired to any UI
 * yet — exists for future use (a "Clear cache" option in Settings > Data
 * would be the natural home, alongside the existing app-data clearing). */
export async function clearApiCache(): Promise<void> {
  memoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Best-effort — same reasoning as writePersisted above.
  }
}
