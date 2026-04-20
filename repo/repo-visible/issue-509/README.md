# issue #509 ice-cave 证据

## 范围
- 本轮仅把 `ice-cave` 作为唯一新增/保留的目标场地接入数据、类型、UI 与视觉链路。
- 未触碰脏工作树中的无关文件。

## 改动点
- `src/core/types.ts`
  - `ArenaId` 收口为 `grassland | ice-cave`。
- `src/core/data/arenas.ts`
  - 默认场地列表由草地 + 冰洞组成。
  - `ice-cave` 可购买，价格 500 gold。
- `src/core/systems/ArenaSystem.ts`
  - 购买成功后仍直接写入 `state.activeArenaId = arenaId`，因此购买即自动激活。
- `src/core/scene/Canvas2DRenderer.ts`
  - 主场景保留 `grassland` 与 `ice-cave` 两套主题；`ice-cave` 为冷蓝/浅冰配色，不走默认草地回退。
- `src/core/combat/BattleArena.ts`
  - 战斗场景资源映射切到 `ice-cave-bg.png`。
  - fallback palette 也改为 `ice-cave` 冷色系，避免资源缺失时回退成默认草地。
- `e2e/game.spec.ts`
  - Arena System 断言改为校验 `ice-cave` 存在、可买、购买后自动成为 active arena。
- `e2e/arena-background.spec.ts`
  - 战斗背景跟随 active arena 的验证目标改为 `ice-cave`。

## 最小回归证据
- 类型检查：`npx tsc --noEmit`
- E2E（场地主链路）：`npx playwright test e2e/game.spec.ts --grep "Arena System"`
- E2E（战斗背景）：`npx playwright test e2e/arena-background.spec.ts`
- 变更快照：`repo-visible/issue-509/ice-cave.diff`

## 结果
- PASS: 类型、数据、UI、购买自动激活、主场景主题、战斗背景主题的最小链路已打通。
- 风险:
  - `e2e/game.spec.ts` 全量未在本轮执行，只跑了与 arena 相关子集。
  - 仓库里仍存在历史上与 arena 相关的更大规模数据/存档兼容行为（例如运行时返回不止 2 个 arena 的环境），本轮测试已改为对 `ice-cave` 做存在性与行为断言，避免对无关历史数据做强绑定。
