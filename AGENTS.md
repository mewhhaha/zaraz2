# Repository Guidelines

## Project Structure & Module Organization
- `web/` Cloudflare Worker app and UI. `web/app/` holds routes/components/assets, `web/worker/main.ts` is the Worker entry, `web/types/` keeps shared types, and `web/wrangler.toml` is the deployment config.
- `packages/passkey/` shared passkey helpers (ESM entry `packages/passkey/src/passkey.mts`).
- `packages/eslint-plugin-url-exists/` custom ESLint plugin (source in `packages/eslint-plugin-url-exists/src/`, build output in `packages/eslint-plugin-url-exists/dist/`).
- `pnpm-workspace.yaml` defines the monorepo workspace layout.

## Build, Test, and Development Commands
Run these from the repo root.
- `pnpm install` installs workspace dependencies.
- `pnpm --filter web dev` runs the Worker locally with live reload (Wrangler).
- `pnpm --filter web build` bundles the Worker via `rolldown.config.ts`.
- `pnpm --filter web typecheck` runs TypeScript without emitting files.
- `pnpm --filter web lint` runs ESLint (Tailwind + URL checks included).
- `pnpm --filter web format` formats with Prettier.
- `pnpm --filter web test` runs Vitest.
- `pnpm --filter @mewhhaha/eslint-plugin-url-exists build` builds the ESLint plugin.
- `pnpm --filter @mewhhaha/eslint-plugin-url-exists lint` runs oxlint for the plugin.
- `pnpm --filter web deploy` deploys with Wrangler.

## Coding Style & Naming Conventions
- TypeScript ESM throughout; keep module files as `.ts`/`.tsx` and use `.mts` where the package already does.
- Formatting is Prettier‑driven; use the default 2‑space indentation and avoid manual alignment. Run `pnpm --filter web format` before pushing.
- Follow ESLint configs at `web/eslint.config.mjs` and `packages/eslint-plugin-url-exists/eslint.config.mjs`.
- Route modules follow existing naming under `web/app/routes` (e.g. `_index.tsx`, dot/underscore segments). Keep new route names consistent with adjacent files.

## Testing Guidelines
- Vitest is wired for `web/`. Add tests as `*.test.ts` or `*.spec.ts` and run `pnpm --filter web test`.
- No repo‑wide coverage thresholds are configured; add focused tests for new logic where practical.

## Commit & Pull Request Guidelines
- Commit history is informal and single‑line; some messages use a `fix:` prefix, but no strict convention is enforced. Prefer clear, imperative summaries (example: `fix: handle empty passkey list`).
- PRs should include a short summary, key commands run (or note “not run”), and screenshots for UI changes under `web/app`.
- If you touch Wrangler bindings or env vars, call it out explicitly and document any new secrets. Use `wrangler secret put` and never commit secrets.
