# 路线图

## 已完成

### M1: 项目骨架 + 数据模型（完成）
- 清空旧 Unity 代码，只保留 spec.md
- Vite + TypeScript (strict) + Three.js 项目搭建
- 完整数据模型（types.ts）：Rarity, Stats, Trait, Skill, Slime, BreedingGround, Facility, GameState
- 默认游戏状态（3只初始史莱姆、1个培养场地、1个设施）
- SaveManager（localStorage）、SceneManager（Three.js 渲染）、GameLoop、UIManager
- PR #4 合并到 main，tsc --noEmit 零错误

### M1.1: 收尾（完成）
- 字段补齐（mut, rarity, effect, targetType, damage, facilityLevel, upgradeCost）
- 已合并

## 当前

### M2: 分裂/变异系统（预估 3 cycles）
- **目标**: 实现核心养成循环 — 史莱姆自动分裂、变异、特性/技能继承
- **交付物**:
  1. `BreedingSystem` 模块：自动分裂定时器、场地容量检查、分裂逻辑
  2. `MutationEngine` 模块：变异概率计算、特性/技能随机生成、属性浮动、稀有度决定
  3. 特性/技能数据表：至少 10 种特性、8 种技能的定义
  4. 亲代继承逻辑：后代继承部分亲代属性/特性 + 随机变异
  5. 场地 UI 更新：显示分裂倒计时、新生史莱姆动画、场地满提示
  6. 基础筛选：按稀有度/属性排序、手动剔除、批量出售
  7. 所有代码 tsc --noEmit 零错误
  8. 可在浏览器中运行，看到史莱姆自动分裂并出现新个体
- **验收标准**:
  - 打开页面后，史莱姆在场地内自动分裂
  - 分裂产生的后代有随机属性浮动和变异概率
  - 场地满时停止分裂
  - 可手动剔除/出售史莱姆
  - tsc 编译零错误

## 未来（按优先级排列）
1. **M3**: 培养场地管理进阶 — 多场地、环境效果、设施升级效果
2. **M4**: 战斗系统 — PVE 回合制战斗
3. **M5**: 经营系统 — 完善货币循环、道具、商店
4. **M6**: 封存与装备 — 封存库、饰品系统
5. **M7**: 任务与图鉴 — 任务系统、收集图鉴
6. **M8**: PVP — 异步竞技场
