/**
 * The store the protocol no longer keeps for you.
 *
 * 2026-07-28 removed sessions, so nothing expires when a connection does and
 * no instance holds anything between requests. Every handle a server mints —
 * a cart id (module 08), a job id (module 14) — has to live somewhere every
 * instance can reach, with a lifetime you chose.
 *
 * Three deliberate choices, and each one is the reason this file exists
 * rather than a `Map` in each module:
 *
 * 1. **The interface is async.** An in-memory `Map` is not, and neither is
 *    this, really. Writing it async anyway means swapping in Redis or
 *    Postgres later is a change to one factory call, not a refactor of every
 *    handler that touches it. The cost is a handful of `await`s today.
 *
 * 2. **A TTL is mandatory, not optional.** A store without eviction grows
 *    until the process falls over, and nothing else is going to expire these
 *    keys now that connections do not.
 *
 * 3. **Read, modify, write.** `get` returns the stored value, and mutating
 *    it changes nothing until you `set` it back. Against a real store that
 *    is the only thing that can work, so it is how this behaves too — a demo
 *    that relies on object identity teaches a habit that breaks on the first
 *    day it matters.
 */
export type Store<T> = {
  /** `undefined` for a key that never existed or has expired. Callers cannot tell the difference, and should not need to. */
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  /** Test and demo introspection. A real store would not offer this. */
  size(): Promise<number>;
};

export type StoreOptions = {
  /** How long a value survives its last write. */
  ttlMs: number;
  /** Injected in tests so expiry can be exercised without waiting. */
  now?: () => number;
};

export function createInMemoryStore<T>({ ttlMs, now = Date.now }: StoreOptions): Store<T> {
  const entries = new Map<string, { value: T; expiresAt: number }>();

  // ponytail: O(n) sweep on every write. Fine for a workshop and for a few
  // thousand keys; past that, let Redis do TTLs and delete this.
  const sweep = (): void => {
    const cutoff = now();
    for (const [key, entry] of entries) if (entry.expiresAt <= cutoff) entries.delete(key);
  };

  return {
    async get(key) {
      const entry = entries.get(key);
      if (!entry) return;
      // Expire on read as well as on sweep, so a value is never served past
      // its TTL just because nothing has written since.
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return;
      }
      // A copy, because Redis gives you one. Handing back the live object
      // would make `set` optional here and mandatory in production, which is
      // the kind of difference a workshop should not teach. Costs a clone per
      // read; a real backend pays serialisation for the same reason.
      return structuredClone(entry.value);
    },

    async set(key, value) {
      sweep();
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },

    async delete(key) {
      entries.delete(key);
    },

    async size() {
      sweep();
      return entries.size;
    },
  };
}
