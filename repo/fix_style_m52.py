CSS_PATH = 'C:/Users/haoyu.zhang/Desktop/company/.thebotcompany-demo/dev/src/github.com/Lynkzhang/AFK/repo/repo/src/style.css'

with open(CSS_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 4.1 Delete the duplicate quest-panel block (P0-1: Quest panel)
old_block = ("/* P0-1: Quest panel */\n"
             ".quest-panel {\n"
             "  position: absolute; top: 0; left: 0; width: 100%; height: 100%;\n"
             "  background: rgba(10,14,26,0.95); display: flex; flex-direction: column;\n"
             "  padding: 20px; overflow-y: auto; z-index: 100;\n"
             "  animation: pixelFadeIn 0.25s ease-out;\n"
             "}")

if old_block in content:
    content = content.replace(old_block, '', 1)
    print('OK: 4.1 removed duplicate quest-panel')
else:
    print('SKIP: 4.1 not found, checking...')
    idx = content.find('P0-1: Quest panel')
    if idx >= 0:
        print(repr(content[idx:idx+300]))

# 4.2 Add cull button hover after archive hover
old_archive_hover = (".ui-slime-quick-archive:hover {\n"
                     "  background: rgba(155, 89, 255, 0.2);\n"
                     "  color: #b388ff;\n"
                     "}")
new_archive_hover = (".ui-slime-quick-archive:hover {\n"
                     "  background: rgba(155, 89, 255, 0.2);\n"
                     "  color: #b388ff;\n"
                     "}\n"
                     ".ui-slime-quick-cull:hover {\n"
                     "  background: rgba(255, 80, 80, 0.25);\n"
                     "  color: #ff6b6b;\n"
                     "  border-color: #ff6b6b;\n"
                     "}")
if old_archive_hover in content:
    content = content.replace(old_archive_hover, new_archive_hover, 1)
    print('OK: 4.2 cull hover style')
else:
    print('SKIP: 4.2 not found')

# 4.3 Append M52 QuestUI styles at end
quest_css = """
/* ===== M52: QuestUI Polish ===== */

.quest-panel {
  gap: 0;
}

.quest-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  padding-right: 4px;
  margin-bottom: 8px;
}
.quest-list::-webkit-scrollbar { width: 4px; }
.quest-list::-webkit-scrollbar-track { background: rgba(255,215,0,0.05); }
.quest-list::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.3); border-radius: 2px; }

.quest-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 2px solid rgba(255,215,0,0.2);
  padding-bottom: 6px;
  flex-shrink: 0;
}
.quest-tab {
  flex: 1;
  padding: 5px 0;
  background: rgba(20,16,40,0.7);
  border: 1px solid rgba(255,215,0,0.2);
  color: #aab;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  border-radius: 0;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.quest-tab:hover {
  background: rgba(255,215,0,0.1);
  color: #e0d0a0;
  border-color: rgba(255,215,0,0.4);
}
.quest-tab.active {
  background: rgba(255,215,0,0.15);
  color: #ffd700;
  border-color: #ffd700;
  font-weight: bold;
}

.quest-card {
  background: rgba(20,16,40,0.85);
  border: 1px solid rgba(255,215,0,0.2);
  border-left: 3px solid rgba(255,215,0,0.4);
  padding: 10px 12px;
  transition: border-color 0.12s, background 0.12s, transform 0.1s;
}
.quest-card:hover {
  border-color: rgba(255,215,0,0.6);
  border-left-color: #ffd700;
  background: rgba(30,24,56,0.9);
  transform: translateX(2px);
}
.quest-card.completed {
  border-left-color: #56d364;
}
.quest-card.claimed {
  border-left-color: #4f8cff;
  opacity: 0.65;
}

.quest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.quest-name {
  font-size: 14px;
  color: #e0d0a0;
  font-weight: bold;
}
.quest-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 2px;
  font-weight: bold;
  background: rgba(255,255,255,0.08);
  color: #aab;
}
.quest-card.completed .quest-status {
  background: rgba(86,211,100,0.2);
  color: #56d364;
}
.quest-card.claimed .quest-status {
  background: rgba(79,140,255,0.2);
  color: #7aadff;
}

.quest-desc {
  font-size: 12px;
  color: #8899aa;
  margin-bottom: 6px;
  line-height: 1.4;
}

.quest-progress-container {
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 0;
  overflow: hidden;
  margin-bottom: 3px;
  border: 1px solid rgba(255,215,0,0.1);
}
.quest-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #c8a020 0%, #ffd700 100%);
  border-radius: 0;
  transition: width 0.3s ease-out;
  min-width: 2px;
}
.quest-card.completed .quest-progress-bar {
  background: linear-gradient(90deg, #38a840 0%, #56d364 100%);
}
.quest-card.claimed .quest-progress-bar {
  background: linear-gradient(90deg, #3060a0 0%, #4f8cff 100%);
}

.quest-progress-text {
  font-size: 11px;
  color: #7a8a9a;
  display: block;
  margin-bottom: 4px;
}

.quest-reward {
  font-size: 12px;
  color: #c8a020;
  margin-bottom: 6px;
}

.quest-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.quest-claim-btn {
  padding: 4px 14px;
  background: linear-gradient(180deg, #3a7a30 0%, #2a5a20 100%);
  color: #88ff88;
  border: 1px solid #56d364;
  font-family: inherit;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  border-radius: 0;
  transition: filter 0.1s, transform 0.1s;
}
.quest-claim-btn:hover {
  filter: brightness(1.2);
  transform: scale(1.04);
}
.quest-claim-btn:active {
  transform: scale(0.96);
  filter: brightness(0.9);
}

.quest-submit-btn {
  padding: 4px 12px;
  background: rgba(255,215,0,0.15);
  color: #ffd700;
  border: 1px solid rgba(255,215,0,0.5);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  border-radius: 0;
  transition: filter 0.1s, transform 0.1s;
}
.quest-submit-btn:hover {
  filter: brightness(1.2);
  transform: scale(1.04);
}
.bounty-slime-select {
  background: rgba(20,16,40,0.9);
  color: #c9d1d9;
  border: 1px solid rgba(255,215,0,0.3);
  font-family: inherit;
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 0;
}
.bounty-no-eligible {
  font-size: 12px;
  color: #7a6a5a;
  font-style: italic;
}

.quest-empty {
  text-align: center;
  padding: 20px;
  color: #5a6a7a;
  font-size: 13px;
}
"""

content = content + quest_css
print('OK: 4.3 appended M52 QuestUI CSS')

with open(CSS_PATH, 'w', encoding='utf-8') as f:
    f.write(content)
print('style.css written')
