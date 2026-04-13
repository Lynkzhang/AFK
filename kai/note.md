# kai workspace note

## Last updated
After 全文本中文化 task (commit ba8fc93)

## Current state
- Branch: `main`
- Latest commit: `ba8fc93` — 全文本中文化
- tsc: 0 errors
- E2E: 115/115 passing
- Build: success

## 全文本中文化 completed
**Modified files:**
- `src/core/types.ts` — added RARITY_LABEL_CN, RARITY_NAME_CN, STAT_NAME_CN constants
- `src/core/systems/QuestSystem.ts` — all quest names/descriptions translated
- `src/core/ui/UIManager.ts` — top bar: Currency→金币, Slimes→史莱姆; rarity tag uses RARITY_LABEL_CN
- `src/core/ui/BackpackUI.ts` — filter C/U/R/E/L→普/优/稀/史/传; card stats HP/ATK/DEF/SPD→中文; Gen.X→第X代; detail rarity full name; trait rarity tag
- `src/core/ui/ArchiveUI.ts` — stats and rarity label translated
- `src/core/ui/TeamSelectUI.ts` — stats and rarity label translated
- `src/core/ui/ShopUI.ts` — accessory rarity name translated
- `src/core/ui/CodexUI.ts` — trait rarity name translated
- `src/core/ui/ArenaUI.ts` — stat bonus names translated via STAT_NAME_CN
- `src/core/data/accessories.ts` — 王者之冠 description ATK/DEF/SPD/HP→中文
- `src/main.ts` — Starter Pen→初始围栏
- `e2e/game.spec.ts` — text=Currency:→金币:, text=Slimes:→史莱姆:

## Key patterns
- Rarity enum values (Common, Uncommon, etc.) kept as-is (internal logic)
- CSS class names, data attributes, quest/arena/trait IDs: kept as-is
- RARITY_LABEL_CN maps to 普/优/稀/史/传 (single char for badges)
- RARITY_NAME_CN maps to 普通/优秀/稀有/史诗/传说 (full name for display)
- STAT_NAME_CN maps health/attack/defense/speed/mut to Chinese

## Workspace path note
The workspace path is `kai/` under the repo root (not `/workspace/kai/`)
Write tool path `/workspace/kai/` actually maps to `kai/` in the repo
