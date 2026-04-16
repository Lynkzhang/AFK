import sys

REPO = 'C:/Users/haoyu.zhang/Desktop/company/.thebotcompany-demo/dev/src/github.com/Lynkzhang/AFK/repo/repo'

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    changes = 0
    for old, new, name in replacements:
        if old in content:
            content = content.replace(old, new, 1)
            changes += 1
            print(f'  OK: {name}')
        else:
            print(f'  SKIP (not found): {name}')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    return changes

# === UIManager.ts ===
print('Patching UIManager.ts...')
ui_path = REPO + '/src/core/ui/UIManager.ts'

with open(ui_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1.1 Add lastSlimeListSignature field
old = '  private quickHandlers: QuickActionHandlers | null = null;'
new = '  private quickHandlers: QuickActionHandlers | null = null;\n  /** 上次渲染的 slime 列表签名，用于脏检查 */\n  private lastSlimeListSignature: string = \'\';'
if old in content:
    content = content.replace(old, new, 1)
    print('  OK: 1.1 lastSlimeListSignature field')
else:
    print('  SKIP: 1.1')

# 1.2 Add computeSlimeSignature method
old = "    return map[rarity] ?? '#888';\n  }\n\n  render("
new = "    return map[rarity] ?? '#888';\n  }\n\n  private computeSlimeSignature(slimes: Slime[]): string {\n    return slimes.map(s => `${s.id}:${s.rarity}:${s.color}`).join('|');\n  }\n\n  render("
if old in content:
    content = content.replace(old, new, 1)
    print('  OK: 1.2 computeSlimeSignature')
else:
    print('  SKIP: 1.2')

# 1.3 Replace slime list block with dirty check
idx = content.find('this.slimeListEl.replaceChildren();\n    if (state.slimes.length > 0) {')
if idx >= 0:
    start = content.rfind('\n    //', 0, idx)
    end = content.find('\n    }\n', idx) + len('\n    }\n')
    new_block = '\n    // Update bottom slime list \u2014 dirty-check to avoid per-frame DOM rebuild\n    const newSig = this.computeSlimeSignature(state.slimes);\n    if (newSig !== this.lastSlimeListSignature) {\n      this.lastSlimeListSignature = newSig;\n      this.slimeListEl.replaceChildren();\n      for (const slime of state.slimes) {\n        this.slimeListEl.appendChild(this.renderSlimeCard(slime));\n      }\n    }\n'
    content = content[:start] + new_block + content[end:]
    print('  OK: 1.3 dirty check')
else:
    print('  SKIP: 1.3 (block not found)')

# 1.4 Add onQuickCull to interface
old = '  onQuickArchive: (id: string) => void;\n}'
new = '  onQuickArchive: (id: string) => void;\n  onQuickCull: (id: string) => void;\n}'
if old in content:
    content = content.replace(old, new, 1)
    print('  OK: 1.4 onQuickCull in interface')
else:
    print('  SKIP: 1.4')

# 1.5 Add cull button in renderSlimeCard
old = "    archiveBtn.title = '封存该史莱姆';\n\n    quickActions.append(viewBtn, sellBtn, archiveBtn);"
new = "    archiveBtn.title = '封存该史莱姆';\n\n    const cullBtn = document.createElement('button');\n    cullBtn.className = 'ui-slime-quick-btn ui-slime-quick-cull';\n    cullBtn.textContent = '剔除';\n    cullBtn.title = '永久删除该史莱姆（不可撤销）';\n\n    quickActions.append(viewBtn, sellBtn, archiveBtn, cullBtn);"
if old in content:
    content = content.replace(old, new, 1)
    print('  OK: 1.5 cullBtn in renderSlimeCard')
else:
    print('  SKIP: 1.5')

# 1.6 Add cull click delegation
old = "      } else if (target.classList.contains('ui-slime-quick-archive')) {\n        this.quickHandlers?.onQuickArchive(id);\n      }\n    });"
new = "      } else if (target.classList.contains('ui-slime-quick-archive')) {\n        this.quickHandlers?.onQuickArchive(id);\n      } else if (target.classList.contains('ui-slime-quick-cull')) {\n        this.quickHandlers?.onQuickCull(id);\n      }\n    });"
if old in content:
    content = content.replace(old, new, 1)
    print('  OK: 1.6 cull click delegation')
else:
    print('  SKIP: 1.6')

with open(ui_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('UIManager.ts written')

# === main.ts ===
print('\nPatching main.ts...')
main_path = REPO + '/src/main.ts'

with open(main_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find onQuickArchive block and add onQuickCull after it
# Look for the closing of onQuickArchive handler
old = "    onQuickArchive: function(id) {"
idx = content.find(old)
if idx >= 0:
    # Find the closing of this function
    brace_count = 0
    pos = idx + len(old)
    # Find opening brace
    for i in range(pos, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            if brace_count == 0:
                # This closes the function
                end_pos = i + 1
                break
            brace_count -= 1
    # Now find the comma after }
    comma_pos = content.find(',', end_pos)
    next_newline = content.find('\n', comma_pos)
    
    insert_text = "\n  onQuickCull: function(id) {\n    var slime = state.slimes.find(function(s) { return s.id === id; });\n    if (!slime) return;\n    if (!confirm('确定要剔除 ' + slime.name + ' 吗？此操作不可撤销。')) return;\n    state.slimes = state.slimes.filter(function(s) { return s.id !== id; });\n    QuestSystem.incrementCounter(state, 'daily_culls');\n    onboardingSystem.notifyEvent('cull');\n    ui.render(state, FacilitySystem.getMaxCapacity(state));\n  },"
    
    content = content[:next_newline] + insert_text + content[next_newline:]
    print('  OK: onQuickCull in main.ts')
else:
    print('  SKIP: onQuickArchive not found in main.ts')

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('main.ts written')

# === QuestUI.ts ===
print('\nPatching QuestUI.ts...')
quest_path = REPO + '/src/core/ui/QuestUI.ts'

with open(quest_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find "const title = document.createElement('h2');" and add className after
old = "    const title = document.createElement('h2');"
# Find the line after it and add className
idx = content.find(old)
if idx >= 0:
    end_of_line = content.find('\n', idx)
    insert = "\n    title.className = 'panel-title';"
    content = content[:end_of_line] + insert + content[end_of_line:]
    print('  OK: title.className in QuestUI')
else:
    print('  SKIP: QuestUI title not found')

with open(quest_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('QuestUI.ts written')

print('\nAll patches applied!')
