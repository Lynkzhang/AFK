本轮完成：
- 按 Issue #6 要求修改 repo/src/core/types.ts：
  - Rarity 增加 Uncommon/Legendary
  - Stats 增加 mut
  - Trait 增加 rarity/effect
  - Skill 改为 type/targetType/damage（移除 power）
  - BreedingGround 改为 slimes/facilityLevel（移除 assignedSlimeIds）
  - Facility 增加 effect/upgradeCost
- 同步修改 repo/src/main.ts 默认数据：
  - 所有 stats 增加 mut: 0.05
  - traits 增加 rarity: Rarity.Common, effect: 无特殊效果
  - skills 改为 type: attack, targetType: single, damage
  - breedingGround 使用 slimes: [], facilityLevel: 1
  - facility 增加 effect: 加速培育, upgradeCost: 50
- 编译验证：cd repo && npx tsc --noEmit 通过（零错误）
- 已提交并推送分支 kai/m1-scaffold，commit: c47d9d7
- 已创建 PR: https://github.com/Lynkzhang/AFK/pull/4
- 已执行 gh pr merge --merge --auto（命令成功返回）

注意：
- 尝试执行 tbc-db comment/issue-close 被 focused mode 拦截，无法关闭 issue #3/#6/#7。
