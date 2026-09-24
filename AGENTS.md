# AGENTS.md

Build and maintain the Yo-kai Watch 2 IV reverse calculator.

## Hard restrictions

Do not:
- configure Cloudflare
- deploy to any server
- use SSH
- use kubectl
- use Docker socket
- read .env files
- add telemetry or analytics
- add ROMs, extracted official assets, or game executables
- claim independent game-code verification that this repository did not perform
- silently reuse the Yo-kai Watch 1 IV model for Yo-kai Watch 2

Allowed:
- maintain the React + Vite + TypeScript app
- maintain Vitest tests
- maintain the Web Worker reverse search
- fetch the public YW2 base-stat table with scripts/sync-yokai-data.mjs
- maintain local Docker build files
- maintain GitHub Actions workflows

## YW2 invariants

- IV weighted total:
  - HP / 2 + Strength + Spirit + Defense + Speed = 40
  - HP IV must be an even integer from 0 through 80
  - other IVs are integers from 0 through 40
- EV weighted total:
  - HP / 2 + Strength + Spirit + Defense + Speed <= 20
- Sports Club:
  - at most five sessions total
  - Strength session: Strength +5, Defense -2
  - Spirit session: Spirit +5, Speed -2
  - Defense session: Defense +5, Speed -2
  - Speed session: Speed +5, Defense -2
- Reverse search:
  - derive candidates per stat first
  - combine only candidates whose weighted IV total is exactly 40
  - execute the search in a Web Worker
- Preserve float32 rounding order in the YW2 stat formula.

## Data

- Base A / Base B source: https://togenyanweb.appspot.com/Yokai/yw2/yokaiList.html
- The checked-in generated file is a fallback.
- npm run sync:yokai refreshes the generated dataset.
- Do not imply that every row in the source table is a normally obtainable playable Yo-kai.

## Quality bar

Before finishing:
- npm test
- npm run build

Keep the published Thornyan fixtures passing.
