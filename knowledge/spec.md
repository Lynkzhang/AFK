# 史莱姆进化 (Slime Evolution) — 内部规格摘要

## 核心信息
- **类型**: 放置策略养成 (Idle Strategy RPG)
- **平台**: Web 浏览器（单机）
- **技术栈**: Vite + TypeScript (strict) + Three.js
- **美术风格**: 3D 低多边形 (Low-Poly)

## 核心系统
1. **史莱姆生成与分裂** — 自动分裂、变异概率、数量上限
2. **变异系统** — 特性(Traits)、技能(Skills)、属性(Stats)、外形变异
3. **培养场地管理** — 格子上限、手动/自动剔除、筛选
4. **道具与定向变异** — 变异道具、培养道具
5. **封存与战斗** — 精英史莱姆封存、PVE/PVP 队伍
6. **经营** — 出售史莱姆、任务、设施升级

## 数据模型（规范定义）
- **Stats**: hp, atk, def, spd, mut
- **Trait**: id, name, description, rarity(Rarity), effect(string)
- **Skill**: id, name, description, type(attack/defense/support/heal), targetType, damage, cooldown
- **Slime**: id, name, stats, traits[], skills[], rarity, generation, parentId?, color, position
- **BreedingGround**: id, name, capacity, slimes(Slime[]), facilityLevel
- **Facility**: id, name, level, effect, upgradeCost
- **GameState**: slimes, breedingGrounds, facilities, currency, timestamp
- **Rarity**: Common, Uncommon, Rare, Epic, Legendary

## 源文档
详细 GDD 见仓库 `spec.md`。
