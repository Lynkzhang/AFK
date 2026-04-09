# M2 — 分裂 + 变异 + 场地管理

## 本次新增文件

| 文件 | 路径 | 职责 |
|------|------|------|
| `SlimeInstance.cs` | `Assets/Scripts/Core/` | 运行时史莱姆实例（动态状态） |
| `MutationSystem.cs` | `Assets/Scripts/Systems/` | 变异逻辑（属性/特性/技能/稀有度） |
| `SlimeFactory.cs` | `Assets/Scripts/Systems/` | 史莱姆工厂（创建初始 & 分裂后代） |
| `BreedingGroundConfig.cs` | `Assets/Scripts/Systems/` | 场地配置 ScriptableObject |
| `BreedingGroundManager.cs` | `Assets/Scripts/Systems/` | 场地管理器（分裂计时 / 剔除 / 出售） |
| `BreedingGroundUI.cs` | `Assets/Scripts/UI/` | 场地 UI 控制器 + SlimeRowUI |
| `GameBootstrap.cs` | `Assets/Scripts/Systems/` | 游戏启动引导器 |

## 数据流

```
BreedingGroundConfig (SO)
       │
       ▼
GameBootstrap ──► BreedingGroundManager
                        │
                        ├─ SlimeFactory.CreateInitial()  ──► SlimeInstance (Gen 0)
                        │
                        ├─ SlimeFactory.Breed()
                        │       └─ MutationSystem.*
                        │               └─ SlimeInstance (Gen N+1)
                        │
                        └─ events: OnSlimesChanged / OnSlimeSold
                                        │
                                        ▼
                               BreedingGroundUI
```

## Unity 场景配置步骤

1. 创建 `BreedingGroundConfig` SO：`Assets > Create > SlimeEvolution > BreedingGroundConfig`
2. 在场景中创建 `GameBootstrap` GameObject，挂载 `GameBootstrap.cs`
3. 在场景中创建 `BreedingGround` GameObject，挂载 `BreedingGroundManager.cs`，指定 Config
4. 在场景中设置 Canvas，挂载 `BreedingGroundUI.cs`，绑定 Manager 和 UI 元素引用
5. 将 `SlimeData` SO 拖入 Config 的 `initialSlimes` 数组

## 验收检查点

- [x] 场地有上限（`maxCapacity`），满后停止分裂
- [x] 子代继承亲代属性并应用随机变异（`MutationSystem`）
- [x] 玩家可手动剔除史莱姆（`CullSlime`）
- [x] 玩家可出售史莱姆换取金币（`SellSlime`）
- [x] 不破坏 M1 核心数据模型（`SlimeData`, `SlimeStats`, `TraitData`, `SkillData`, `Rarity`）
