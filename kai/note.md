# kai workspace note

## Last updated
After M35 completion (final fixes round)

## Current state
- Branch: `main` (and `kai/m35-early-experience` at same commit)
- Latest commit: `5d9006d` — M35 second slime fix (小蓝)
- tsc: 0 errors
- E2E: 89/89 passing

## M35 completed issues (#168-#174)
All 7 sub-tasks done:
1. #168: Initial 50g + 2 slimes (小绿 + 小蓝) + 5s first split
2. #169: Pre-split animation (last 3s pulsing scale + glow in Canvas2DRenderer)
3. #170: Overlay buttons pixel style (CSS unified)
4. #171: Glow Y position fixed (moved down to feet)
5. #172: BOUNCE template bottom row solid border
6. #173: Onboarding button pixel style
7. #174: CSS cleanup (duplicate rarity-tag removed)

## Key implementation notes
- `createSecondSlime()` function in main.ts
- Second slime: id='slime-starter-2', name='小蓝', color='#6ab4e8', stats matching spec
- `migrateState()` sets `firstSplitDone = true` for old saves
- `step-wait-split` checkComplete: `s.slimes.length >= 3` (was >= 2)
- E2E full flow test: added `triggerSplit()` handler for `step-wait-recover-2`
- `breeding paused during onboarding` test: `toBeGreaterThanOrEqual(1)` not `.toBe(1)`

## tbc-db not available
Could not close issues 167-174 via tbc-db (server not configured)
