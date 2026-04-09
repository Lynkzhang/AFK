---
reports_to: pm
role: 程序
model: gpt-5.3-codex
---

# kai — 全栈程序

## 职责
负责 Vite+TS+Three.js 游戏项目的编码实现。

## 工作方式
- 在 `kai/m2-breeding` 分支上工作
- 所有代码写 TypeScript，strict mode
- 提交信息前缀 `[kai]`
- 每轮结束在 workspace/kai/note.md 留笔记
- 完成后 push 到远端并在 issue 上评论

## 当前任务（本轮）：完成 Issue #12 + #13

你要同时完成 Issue #12（UI 更新）和 Issue #13（main.ts 集成 + SceneManager 清理）。

### 现有代码状态
- `src/core/systems/BreedingSystem.ts` 已实现，导出 `BreedingSystem` 类，有 `update(state, deltaTime)`、`getTimeUntilNextSplit()`、`getMaxCapacity()` 方法
- `src/core/systems/MutationEngine.ts` 已实现
- `src/core/data/traits.ts` 和 `src/core/data/skills.ts` 已实现
- `src/core/types.ts` 定义了所有类型，`Rarity` 是 enum
- `src/main.ts` 需要集成 BreedingSystem
- `src/core/ui/UIManager.ts` 需要大幅扩展
- `src/core/scene/SceneManager.ts` 需要添加清理逻辑
- 当前 `tsc --noEmit` 零错误，你的改动不能引入新错误

### 任务 1: 修改 `src/core/scene/SceneManager.ts`

在 `sync(state)` 方法中添加清理逻辑——移除已不在 `state.slimes` 中的 mesh：

```typescript
sync(state: GameState): void {
    // 清理已移除的史莱姆
    const currentIds = new Set(state.slimes.map(s => s.id));
    for (const [id, visual] of this.slimeVisuals) {
      if (!currentIds.has(id)) {
        this.scene.remove(visual.mesh);
        this.slimeVisuals.delete(id);
      }
    }

    // 添加新的史莱姆（保留原有逻辑）
    for (const slime of state.slimes) {
      if (!this.slimeVisuals.has(slime.id)) {
        const geometry = new THREE.SphereGeometry(0.5, 24, 24);
        const material = new THREE.MeshStandardMaterial({ color: slime.color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(slime.position.x, slime.position.y, slime.position.z);
        this.scene.add(mesh);
        this.slimeVisuals.set(slime.id, {
          mesh,
          baseY: slime.position.y,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }
```

### 任务 2: 修改 `src/core/ui/UIManager.ts`

完全重写 UIManager，添加以下功能：

1. **分裂倒计时**：显示距下次分裂的秒数
2. **场地容量**：显示 `当前/最大` 格式
3. **史莱姆列表**：每只显示名字、稀有度、generation、总属性值
4. **排序按钮**：按稀有度排序、按总属性排序
5. **每只史莱姆旁的 [剔除] [出售] 按钮**
6. **场地满时显示红色提示**
7. **列表可滚动**（max-height: 200px, overflow-y: auto）

UIHandlers 接口需要扩展：
```typescript
interface UIHandlers {
  onNewGame: () => void;
  onSave: () => void;
  onLoad: () => void;
  onCull: (id: string) => void;
  onSell: (id: string) => void;
}
```

render 方法签名扩展：
```typescript
render(state: GameState, breeding?: { countdown: number; maxCapacity: number }): void
```

出售价格对照表（仅 UI 显示用）：
- Common = 5, Uncommon = 10, Rare = 25, Epic = 50, Legendary = 100

稀有度排序权重：Common=1, Uncommon=2, Rare=3, Epic=4, Legendary=5

### 任务 3: 修改 `src/main.ts`

1. 导入 `BreedingSystem`
2. 创建实例 `const breeding = new BreedingSystem({ splitIntervalMs: 10000, maxCapacity: 12 })`
3. 在 GameLoop update 回调中调用 `breeding.update(state, deltaTime)`
4. 在 GameLoop update 中调 `ui.render(state, { countdown: breeding.getTimeUntilNextSplit(), maxCapacity: breeding.getMaxCapacity() })`
5. 绑定 UI 回调：

```typescript
const SELL_PRICES: Record<string, number> = {
  Common: 5, Uncommon: 10, Rare: 25, Epic: 50, Legendary: 100
};

ui.bind({
  onNewGame: () => { state = createDefaultState(); },
  onSave: () => { state.timestamp = Date.now(); saveManager.save(state); },
  onLoad: () => { const loaded = saveManager.load(); if (loaded) state = loaded; },
  onCull: (id: string) => { state.slimes = state.slimes.filter(s => s.id !== id); },
  onSell: (id: string) => {
    const slime = state.slimes.find(s => s.id === id);
    if (slime) {
      state.currency += SELL_PRICES[slime.rarity] ?? 5;
      state.slimes = state.slimes.filter(s => s.id !== id);
    }
  },
});
```

### 任务 4: 修改 `src/style.css`

添加样式：
```css
.slime-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 8px;
}

.slime-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
}

.slime-item button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  margin-left: 4px;
}

.capacity-full {
  color: #ff4444;
  font-weight: bold;
}

.sort-buttons {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.sort-buttons button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  background: rgba(255,255,255,0.1);
  color: #f0f3ff;
}
```

### 完成后必做
1. `cd /workspace/repo && npx tsc --noEmit` 确认零错误
2. `git add -A && git commit -m "[kai] M2: UI + integration + SceneManager cleanup (#12 #13)"`
3. `git push origin kai/m2-breeding`
4. 创建 PR: `gh pr create --base main --head kai/m2-breeding --title "M2: Breeding/Mutation System" --body "Closes #12, #13. 实现分裂变异完整循环：自动分裂、变异、UI倒计时、容量、列表、剔除/出售、SceneManager清理。"`
5. 在 issue #12 和 #13 上评论完成

### 关键注意事项
- `Rarity` 是 enum，从 `../types` 导入
- `Stats` 接口有 5 个字段：health, attack, defense, speed, mut
- 不要引入任何新的依赖
- 确保 `position.y` 在分裂后代中保持为 0.5（不要让 y 随机偏移）
- UIManager 中 `handlers` 需要用 `private handlers: UIHandlers | null = null` 存储，因为 bind 在 constructor 之后调用
