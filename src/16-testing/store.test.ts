import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createInMemoryStore } from '../shared/store';

/**
 * The store behind modules 08 and 14.
 *
 * Two behaviours are worth pinning, and both are ones a `Map` does not have:
 * a value stops existing on its own, and mutating what you read changes
 * nothing until you write it back. A demo that gets the second one wrong
 * works perfectly until the day the store is Redis.
 *
 * `now` is injected so expiry can be exercised without a sleeping test.
 */
describe('createInMemoryStore', () => {
  const at = (clock: { ms: number }) => () => clock.ms;

  test('a value survives until its TTL, and not past it', async () => {
    const clock = { ms: 1000 };
    const store = createInMemoryStore<string>({ ttlMs: 100, now: at(clock) });

    await store.set('k', 'v');
    assert.equal(await store.get('k'), 'v');

    clock.ms += 99;
    assert.equal(await store.get('k'), 'v', 'still inside the TTL');

    clock.ms += 2;
    assert.equal(await store.get('k'), undefined, 'past the TTL');
  });

  test('expiry happens on read, not only on write', async () => {
    // The failure this catches: sweeping only on `set` leaves an expired
    // value readable indefinitely on a store nothing is writing to.
    const clock = { ms: 0 };
    const store = createInMemoryStore<string>({ ttlMs: 50, now: at(clock) });

    await store.set('k', 'v');
    clock.ms += 51;

    assert.equal(await store.get('k'), undefined);
  });

  test('a write extends the lifetime', async () => {
    const clock = { ms: 0 };
    const store = createInMemoryStore<number>({ ttlMs: 100, now: at(clock) });

    await store.set('k', 1);
    clock.ms += 80;
    await store.set('k', 2); // resets the clock on this key
    clock.ms += 80;

    assert.equal(await store.get('k'), 2, 'the second write pushed expiry out');
  });

  test('mutating what you read changes nothing until you write it back', async () => {
    // This is the habit the interface exists to enforce. Against Redis the
    // value you got back is a copy, so a push that is never `set` is lost.
    const store = createInMemoryStore<string[]>({ ttlMs: 10_000 });
    await store.set('cart', []);

    const cart = (await store.get('cart'))!;
    cart.push('otter plushie');

    // `get` hands back a copy, the way Redis does, so the push is lost until
    // it is written back. That is what makes this a test rather than a habit:
    // a demo that skips the `set` fails here instead of in production.
    assert.deepEqual(await store.get('cart'), [], 'the push is not stored yet');

    await store.set('cart', cart);
    assert.deepEqual(await store.get('cart'), ['otter plushie']);
  });

  test('expired entries are evicted, not just hidden', async () => {
    const clock = { ms: 0 };
    const store = createInMemoryStore<string>({ ttlMs: 10, now: at(clock) });

    for (const key of ['a', 'b', 'c']) await store.set(key, key);
    assert.equal(await store.size(), 3);

    clock.ms += 11;
    // Without eviction a long-running server grows until it falls over, which
    // is the failure that sessions used to hide by expiring with a connection.
    assert.equal(await store.size(), 0);
  });
});
