import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * True when this module is the file the process was started with.
 *
 * Each module is both a runnable demo (`pnpm example:08`) and a thing the
 * stories import. Guarding the demo's start-up on this lets the story import
 * the real server instead of a copy of it: a copy would prove the protocol
 * works, not that this module does.
 *
 * `realpathSync` matters — on macOS `/tmp` resolves to `/private/tmp`, and a
 * plain string compare against `process.argv[1]` reads false for a file that
 * really is the entrypoint.
 */
export function isEntrypoint(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return moduleUrl === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}
