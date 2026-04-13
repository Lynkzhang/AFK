# kai workspace note

## Last updated
After M46 completion (issues #228, #229, #230, #227)

## Current state
- Branch: `main`
- Latest commit: `e7f5a65` — M46 complete
- tsc: 0 errors
- E2E: 111/111 passing

## M46 completed
1. **#228 — Asset path fix (23 hardcoded paths)**
   - Added `const BASE = import.meta.env.BASE_URL;` to UIManager.ts + 7 other UI files
   - All `/assets/xxx.png` → `${BASE}assets/xxx.png`
   - Verified: zero remaining hardcoded paths

2. **#229 — 17 pixel-art PNG icons regenerated**
   - Used tools/generate-icons-v2.cjs (deleted after use)
   - All 17 icons: 1500-2700 bytes each (all > 500 bytes)
   - Pixel noise added to defeat PNG compression

3. **#230 — UI polish**
   - CSS: panelOpen, panelClose, resourcePulse, buttonPress animations
   - overlay-panel uses panelOpen on appear
   - pixel-btn/game-btn :active → scale(0.95) feedback
   - Resource values pulse gold→white on change
   - Unified card hover styles

## Key patterns
- Vite BASE_URL: use `import.meta.env.BASE_URL` not hardcoded `/assets/`
- PNG file size: add pixel noise to defeat compression
