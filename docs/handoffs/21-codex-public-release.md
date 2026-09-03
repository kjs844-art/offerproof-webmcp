# Issue 21 handoff — public release foundation

## Scope

- Added the standard MIT license for the approved public source release.
- Linked the license from the repository README.
- Kept the existing `main`-only GitHub Pages workflow unchanged because the user moved visual design work to another AI.

## Changed paths

- `LICENSE`
- `README.md`
- `docs/handoffs/21-codex-public-release.md`

## Preserved boundaries

- No package, dependency, application, domain, privacy, or WebMCP implementation changes.
- No deployment or public URL is claimed until it is verified live.

## Verification

- `npm test`
- `npm run build`
- `npm audit --omit=dev`
- `git diff --check`

## Remaining release work

- Review and merge through `codex/firstvibe/integration`, then `main`.
- Change the repository to public only after the MIT license is visible on `main`.
- Enable GitHub Pages with GitHub Actions, run the workflow, and verify the public URL and top-level WebMCP registration.
