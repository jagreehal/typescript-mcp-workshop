import { StoryReporter } from 'executable-stories-vitest/reporter';
import type { Reporter } from 'vitest/node';
import { defineConfig } from 'vitest/config';

// The HTML report is opt-in via `pnpm test:story`. A plain `pnpm test` stays
// quiet so the story reporter never gets in the way of a normal run.
const storyReporter = new StoryReporter({
  formats: ['html'],
  outputDir: 'reports',
  outputName: 'index',
  output: { mode: 'aggregated' },
  html: {
    title: 'MCP 2026-07-28, proved',
    darkMode: true,
    searchable: true,
    startCollapsed: false,
  },
}) as unknown as Reporter;

export default defineConfig({
  test: {
    // `*.story.ts` is the story suite; `*.test.ts` stays with node:test under
    // `pnpm test`. Two runners, two globs, neither collecting the other's files.
    include: ['**/*.story.ts'],
    reporters: process.env.STORY_REPORT ? ['default', storyReporter] : ['default'],
  },
});
