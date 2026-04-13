import type { GameState } from '../types';
import { CodexSystem } from '../systems/CodexSystem';

type CodexTab = 'rarity' | 'trait' | 'skill';

interface CodexUIHandlers {
  onBack: () => void;
}

export class CodexUI {
  readonly root: HTMLDivElement;
  private handlers: CodexUIHandlers | null = null;
  private activeTab: CodexTab = 'rarity';

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'codex-panel overlay-panel';
  }

  bind(handlers: CodexUIHandlers): void {
    this.handlers = handlers;
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  render(state: GameState): void {
    this.root.replaceChildren();

    const info = CodexSystem.getCodex(state);
    const completion = CodexSystem.getCompletion(state.codex);

    // Title + overall completion
    const title = document.createElement('h2');
const codexTitleIcon = document.createElement('img');
    codexTitleIcon.src = '/assets/icon-codex.png';
    codexTitleIcon.alt = '';
    codexTitleIcon.className = 'btn-icon';
    codexTitleIcon.onerror = () => { codexTitleIcon.style.display = 'none'; };
    title.append(codexTitleIcon, document.createTextNode('\u56fe\u9274'));
    this.root.appendChild(title);

    const overallEl = document.createElement('div');
    overallEl.className = 'codex-overall';
    overallEl.textContent = `\u603b\u8ba1: ${completion.overall.unlocked} / ${completion.overall.total} (${completion.overall.percent}%)`;
    this.root.appendChild(overallEl);

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'codex-tabs';
    const tabs: { key: CodexTab; label: string }[] = [
      { key: 'rarity', label: `\u7a00\u6709\u5ea6 (${completion.rarities.percent}%)` },
      { key: 'trait', label: `\u7279\u6027 (${completion.traits.percent}%)` },
      { key: 'skill', label: `\u6280\u80fd (${completion.skills.percent}%)` },
    ];

    for (const t of tabs) {
      const tab = document.createElement('button');
      tab.className = 'codex-tab' + (this.activeTab === t.key ? ' active' : '');
      tab.textContent = t.label;
      tab.dataset['category'] = t.key;
      tab.onclick = () => {
        this.activeTab = t.key;
        this.render(state);
      };
      tabBar.appendChild(tab);
    }
    this.root.appendChild(tabBar);

    // Content list
    const listEl = document.createElement('div');
    listEl.className = 'codex-list';

    if (this.activeTab === 'rarity') {
      for (const r of info.allRarities) {
        const unlocked = info.codex.unlockedRarities.includes(r);
        const entry = this.createEntry(r, unlocked);
        listEl.appendChild(entry);
      }
    } else if (this.activeTab === 'trait') {
      for (const t of info.allTraits) {
        const unlocked = info.codex.unlockedTraits.includes(t.id);
        const label = unlocked ? `${t.name} (${t.rarity})` : '???';
        const entry = this.createEntry(label, unlocked);
        entry.dataset['traitId'] = t.id;
        listEl.appendChild(entry);
      }
    } else if (this.activeTab === 'skill') {
      for (const s of info.allSkills) {
        const unlocked = info.codex.unlockedSkills.includes(s.id);
        const label = unlocked ? `${s.name} [${s.type}]` : '???';
        const entry = this.createEntry(label, unlocked);
        entry.dataset['skillId'] = s.id;
        listEl.appendChild(entry);
      }
    }

    this.root.appendChild(listEl);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.textContent = '\u8fd4\u56de';
    backBtn.onclick = () => this.handlers?.onBack();
    this.root.appendChild(backBtn);
  }

  private createEntry(label: string, unlocked: boolean): HTMLDivElement {
    const entry = document.createElement('div');
    entry.className = 'codex-entry' + (unlocked ? ' unlocked' : ' locked');
    entry.textContent = label;
    return entry;
  }
}
