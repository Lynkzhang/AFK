# 美术资源规范 — 史莱姆进化

> 版本 1.0 | 2025-04 | 作者: yue (主美)

## 1. 文件命名规范

### 1.1 通用命名规则

- **全部小写**，单词之间用下划线 `_` 分隔
- **前缀标识类型**，后缀标识变体/状态
- **禁止使用**：空格、中文、特殊符号（除 `_` 和 `-`）
- **禁止使用**：无意义编号（如 `new1`, `final2`, `test`）

### 1.2 命名模板

```
{类型前缀}_{类别}_{名称}_{变体/状态}.{扩展名}
```

### 1.3 类型前缀表

| 前缀 | 类型 | 示例 |
|------|------|------|
| `mdl_` | 3D 模型 (FBX) | `mdl_slime_verdant.fbx` |
| `mat_` | 材质 (Material) | `mat_slime_verdant.mat` |
| `tex_` | 贴图 (Texture) | `tex_env_grass_color.png` |
| `anim_` | 动画 (Animation Clip) | `anim_slime_idle.anim` |
| `fx_` | 特效 (Particle/VFX) | `fx_split_green.prefab` |
| `ui_` | UI 图片/图标 | `ui_icon_gold.png` |
| `sfx_` | 音效 | `sfx_split_pop.wav` |
| `bgm_` | 背景音乐 | `bgm_breeding_ground.ogg` |
| `pf_` | 预制体 (Prefab) | `pf_slime_verdant.prefab` |
| `so_` | ScriptableObject | `so_trait_tough_skin.asset` |
| `scene_` | 场景文件 | `scene_breeding_meadow.unity` |

### 1.4 史莱姆命名示例

```
mdl_slime_verdant.fbx              # 翠绿凝胶模型
mdl_slime_ember.fbx                # 琥珀烈焰模型
mdl_slime_frost.fbx                # 晶蓝霜冻模型
mdl_slime_part_horn_single.fbx     # 附加部件-单角
mdl_slime_part_wings_mini.fbx      # 附加部件-迷你翅膀
mat_slime_verdant.mat              # 翠绿凝胶材质
mat_slime_ember.mat                # 琥珀烈焰材质
anim_slime_idle.anim               # 通用待机动画
anim_slime_split.anim              # 通用分裂动画
fx_split_green.prefab              # 绿色分裂粒子特效
fx_split_orange.prefab             # 橙色分裂粒子特效
pf_slime_verdant.prefab            # 翠绿凝胶预制体
```

### 1.5 UI 资源命名示例

```
ui_icon_gold.png                   # 金币图标
ui_icon_crystal.png                # 晶石图标
ui_icon_hp.png                     # HP 图标
ui_icon_atk.png                    # ATK 图标
ui_btn_primary.png                 # 主按钮背景
ui_btn_danger.png                  # 危险按钮背景
ui_panel_card.png                  # 卡片面板 9-slice
ui_badge_rarity_common.png         # 普通稀有度标签
ui_badge_rarity_rare.png           # 稀有稀有度标签
```

---

## 2. 目录结构

```
Assets/
├── Art/
│   ├── Models/
│   │   ├── Slimes/                # 史莱姆模型
│   │   │   ├── Base/              # 基础形态
│   │   │   └── Parts/             # 附加部件
│   │   ├── Environment/           # 环境模型
│   │   │   ├── Meadow/            # 丰饶草地
│   │   │   ├── Flame/             # 火焰之地
│   │   │   ├── Ice/               # 寒冰洞穴
│   │   │   └── Forest/            # 神秘森林
│   │   ├── Accessories/           # 饰品模型
│   │   └── UI3D/                  # UI 用 3D 图标
│   ├── Materials/
│   │   ├── Slimes/                # 史莱姆材质
│   │   ├── Environment/           # 环境材质
│   │   └── Effects/               # 特效材质
│   ├── Textures/                  # 贴图（如有）
│   ├── Animations/
│   │   ├── Slimes/                # 史莱姆动画
│   │   └── UI/                    # UI 动画
│   ├── VFX/
│   │   ├── Split/                 # 分裂特效
│   │   ├── Mutation/              # 变异特效
│   │   ├── Combat/                # 战斗技能特效
│   │   └── UI/                    # UI 特效
│   └── Audio/
│       ├── SFX/                   # 音效
│       └── BGM/                   # 背景音乐
├── UI/
│   ├── Icons/                     # 图标
│   │   ├── Navigation/            # 导航图标
│   │   ├── Stats/                 # 属性图标
│   │   ├── Currency/              # 货币图标
│   │   └── Actions/               # 操作图标
│   ├── Panels/                    # 面板背景/9-slice
│   ├── Buttons/                   # 按钮素材
│   ├── Badges/                    # 标签/Badge
│   └── Fonts/                     # 字体文件
├── Prefabs/
│   ├── Slimes/                    # 史莱姆预制体
│   ├── Environment/               # 环境预制体
│   ├── UI/                        # UI 预制体
│   └── VFX/                       # 特效预制体
└── Scenes/                        # 场景文件
```

---

## 3. 模型导出规格

| 属性 | 规格 |
|------|------|
| 格式 | FBX 2020 (Binary) |
| 坐标系 | Y-Up, 右手坐标系 (Unity 默认) |
| 单位 | 1 单位 = 1 米 |
| 缩放 | 导出时 Scale Factor = 1.0 |
| 法线 | 导出法线（Import Normals） |
| UV | 单套 UV（UV0），环境模型可无 UV（用 Vertex Color） |
| 骨骼 | 史莱姆含骨骼；环境物件不含 |
| 动画 | 与模型分离导出为独立 .anim 文件 |
| 面数检查 | 导入后在 Inspector 确认三角面数不超预算 |

---

## 4. 贴图规格

### 4.1 尺寸标准

| 用途 | 最大尺寸 | 推荐尺寸 | 格式 |
|------|---------|---------|------|
| 史莱姆（如有） | 256×256 | 128×128 | PNG |
| 环境（如有） | 512×512 | 256×256 | PNG |
| UI 图标 | 256×256 | 64×64 或 128×128 | PNG-24 |
| UI 面板/按钮 | 128×128 (9-slice) | 64×64 (9-slice) | PNG-24 |
| 粒子贴图 | 128×128 | 64×64 | PNG-24 (含 Alpha) |

### 4.2 贴图规则

- **尺寸必须是 2 的幂次方**（32, 64, 128, 256, 512）
- **使用最小够用尺寸**，Low-Poly 风格不需要高分辨率贴图
- **压缩设置**：
  - Android: ETC2
  - PC: DXT5 (含 Alpha) 或 DXT1 (无 Alpha)
- **Mipmap**：3D 物体贴图开启；UI 贴图关闭
- **Filter Mode**：3D 物体用 Bilinear；像素风 UI 用 Point

---

## 5. UI 资源导出规格

| 属性 | 规格 |
|------|------|
| 格式 | PNG-24，透明背景 |
| 色彩空间 | sRGB |
| DPI | 72（屏幕用途） |
| 9-Slice | 面板和按钮背景使用 9-slice，在 Unity Sprite Editor 中设置 Border |
| Sprite Atlas | 同一界面的 UI 图片打入同一 Sprite Atlas，减少 Draw Call |
| 命名 | 遵循 `ui_` 前缀规则 |

---

## 6. 动画导出规格

| 属性 | 规格 |
|------|------|
| 帧率 | 30 FPS |
| 格式 | Unity Animation Clip (.anim) |
| 循环标记 | 循环动画设置 Loop Time = true |
| 命名 | `anim_{对象}_{动作}.anim` |
| Blend Shape 命名 | `bs_{描述}`，如 `bs_squash`, `bs_stretch`, `bs_smile` |

---

## 7. 音频规格

| 属性 | SFX | BGM |
|------|-----|-----|
| 格式 | WAV (源) → OGG (Unity) | OGG |
| 采样率 | 44100 Hz | 44100 Hz |
| 声道 | Mono | Stereo |
| 时长 | < 3 秒 | 60–180 秒（可循环） |
| 响度 | -14 LUFS 基准 | -18 LUFS 基准 |
| 命名 | `sfx_{描述}.wav` | `bgm_{场景}.ogg` |

---

## 8. 性能预算

### 8.1 单帧渲染预算（目标 60 FPS）

| 指标 | 预算 |
|------|------|
| 总三角面数（屏幕可见） | < 100,000 tris |
| Draw Calls | < 100 |
| 活跃粒子数 | < 500 |
| 材质种类 | < 30 |
| 实时光源 | 1 方向光 + ≤2 点光源 |

### 8.2 内存预算

| 资源类型 | 预算 |
|----------|------|
| 贴图总量 | < 64 MB |
| 模型总量 | < 32 MB |
| 音频总量 | < 48 MB |
| UI 图集总量 | < 16 MB |

### 8.3 场景预算

| 场景 | 同屏史莱姆上限 | 环境物件上限 |
|------|--------------|-------------|
| 培养场地 | 20 只（超出用 LOD 或隐藏） | 30 个 |
| 战斗场景 | 6 只（3v3） | 15 个 |
| 主界面 | 5 只（预览） | 10 个 |

---

## 9. 版本管理规则

- 美术资源与代码同仓库，遵循 Git LFS 规则
- **Git LFS 追踪的文件类型**：`.fbx`, `.png`, `.wav`, `.ogg`, `.psd`, `.blend`, `.unity`
- 提交信息格式：`[Art] {简要描述}`，如 `[Art] add verdant slime base model`
- 美术 WIP 文件不入库，在本地或共享盘暂存
- 每个美术资源入库前需通过面数 / 尺寸 / 命名检查

---

## 10. 质量检查清单

提交美术资源前，逐项确认：

- [ ] 文件命名符合规范（前缀正确、小写、下划线分隔）
- [ ] 文件放置在正确目录下
- [ ] 模型面数不超过预算上限
- [ ] 模型坐标原点在底部中心
- [ ] 模型默认朝向 Z+ 轴
- [ ] 贴图尺寸为 2 的幂次方
- [ ] 贴图尺寸不超过用途最大值
- [ ] UI 图片为 PNG-24 透明背景
- [ ] 动画帧率 30 FPS
- [ ] 循环动画已标记 Loop
- [ ] 材质参数符合风格指南（透明度、Smoothness 等）
- [ ] 音频响度符合标准
- [ ] Git LFS 已追踪二进制文件
