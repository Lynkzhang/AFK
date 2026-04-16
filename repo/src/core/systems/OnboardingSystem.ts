import type { GameState, OnboardingState, FeatureUnlocks } from '../types';
import type { OnboardingUI } from '../ui/OnboardingUI';

export function createDefaultOnboarding(): OnboardingState {
  return {
    currentStep: 'step-welcome',
    completedSteps: [],
    unlocks: {
      breeding: true,
      sell: false,
      archive: false,
      battle: false,
      facility: false,
      shop: false,
      quest: false,
      codex: false,
      arena: false,
      accessories: false,
    },
  };
}

export function createAllUnlockedOnboarding(): OnboardingState {
  return {
    currentStep: null,
    completedSteps: [],
    unlocks: {
      breeding: true,
      sell: true,
      archive: true,
      battle: true,
      facility: true,
      shop: true,
      quest: true,
      codex: true,
      arena: true,
      accessories: true,
    },
  };
}

interface StepDef {
  id: string;
  text: string;
  buttonText?: string;
  autoDismissMs?: number;
  checkComplete: (state: GameState, events: Set<string>) => boolean;
  onShow?: (state: GameState) => void;
  onComplete?: (state: GameState) => void;
}

const STEPS: StepDef[] = [
  {
    id: 'step-welcome',
    text: '欢迎来到史莱姆世界！🌟\n\n这是你的第一批史莱姆——“小绿”和“小蓝”。\n它们看起来普通，但蕴藏着无限进化潜能。\n\n让我们一起见证它们的第一次分裂吧！',
    buttonText: '好的！',
    checkComplete: (_s, events) => events.has('dialog-ok'),
  },
  {
    id: 'step-wait-split',
    text: '⏰ 注意倒计时——当它归零时，小绿就会分裂产生新的史莱姆！\n\n耐心等待一下...',
    checkComplete: (s) => s.slimes.length >= 3,
  },
  {
    id: 'step-first-split',
    text: '🎉 恭喜！史莱姆成功分裂了！\n\n史莱姆会不断分裂，每次都可能产生变异。\n留下强的，淘汰弱的——这就是培养的核心！',
    buttonText: '明白了！',
    checkComplete: (_s, events) => events.has('dialog-ok'),
    onComplete: (s) => { s.onboarding.unlocks.sell = true; },
  },
  {
    id: 'step-teach-sell',
    text: '💰 出售史莱姆可以获得金币！\n\n稀有度越高、属性越强，卖价越高。\n\n试着出售一只不需要的史莱姆吧。',
    checkComplete: (_s, events) => events.has('sell'),
  },
  {
    id: 'step-wait-recover-2',
    text: '⏰ 史莱姆数量不够了...\n\n等待分裂恢复，然后我们学习最后一个管理操作——封存！',
    checkComplete: (s) => s.slimes.length >= 2,
  },
  {
    id: 'step-teach-archive',
    text: '📦 发现了不错的史莱姆？把它封存起来！\n\n封存的史莱姆不会被剔除，也不再分裂。\n但它们可以参加战斗！\n\n选一只你最满意的，点击 [封存]。',
    checkComplete: (_s, events) => events.has('archive'),
    onShow: (s) => { s.onboarding.unlocks.archive = true; },
  },
  {
    id: 'step-teach-battle',
    text: '⚔️ 是时候让你的史莱姆上战场了！\n\n点击 [战斗] 进入关卡选择。\n先挑战第一关试试水吧！',
    checkComplete: (_s, events) => events.has('battle-complete'),
    onShow: (s) => { s.onboarding.unlocks.battle = true; },
  },
  {
    id: 'step-first-victory',
    text: '🏆 太棒了！\n\n战斗可以获得金币和晶石作为奖励。\n通关后续关卡可以获得更多资源。\n\n接下来，让我们看看如何用金币提升实力。',
    buttonText: '继续',
    checkComplete: (_s, events) => events.has('dialog-ok'),
    onComplete: (s) => { s.onboarding.unlocks.facility = true; },
  },
  {
    id: 'step-teach-facility',
    text: '🏗 用金币升级设施来提升培养效率！\n\n推荐先升级 [场地扩展]，\n扩大容量意味着能同时培养更多史莱姆。\n\n点击 [设施] 按钮试试吧。',
    checkComplete: (_s, events) => events.has('facility-upgrade'),
    onShow: (s) => {
      // 保底金币：field-expansion lv1 升级费 = ceil(150 * 1 * 1.5) = 225
      const minGoldNeeded = 225;
      if (s.currency < minGoldNeeded) {
        s.currency = minGoldNeeded;
      }
    },
  },
  {
    id: 'step-teach-shop',
    text: '🛒 商店已开放！\n你可以在这里购买道具来增强变异效果。',
    buttonText: '知道了',
    checkComplete: (_s, events) => events.has('dialog-ok'),
    onComplete: (s) => { s.onboarding.unlocks.shop = true; },
  },
  {
    id: 'step-teach-quest',
    text: '📜 任务系统已开放！\n完成日常和成就任务可以获得额外奖励。\n\n点击 [任务] 按钮查看。',
    checkComplete: (_s, events) => events.has('quest-opened'),
    onShow: (s) => { s.onboarding.unlocks.quest = true; },
  },
  {
    id: 'step-complete',
    text: '🎓 引导完成！\n\n你已经掌握了史莱姆培养的基础。\n以下功能现已全部开放：\n\n📖 图鉴 — 收集所有史莱姆外形、特性和技能\n🏔 场地 — 购买不同环境，影响变异方向\n💎 饰品 — 装备饰品提升战斗力\n\n探索更多奥秘，培养最强史莱姆军团吧！',
    buttonText: '开始冒险！',
    checkComplete: (_s, events) => events.has('dialog-ok'),
    onComplete: (s) => {
      s.onboarding.unlocks.codex = true;
      s.onboarding.unlocks.arena = true;
      s.onboarding.unlocks.accessories = true;
      s.onboarding.currentStep = null;
    },
  },
];

export class OnboardingSystem {
  private state: GameState;
  private ui: OnboardingUI;
  private pendingEvents = new Set<string>();
  private currentStepShown = false;
  private stepIndex: number;

  constructor(state: GameState, ui: OnboardingUI) {
    this.state = state;
    this.ui = ui;
    this.stepIndex = STEPS.findIndex(s => s.id === state.onboarding.currentStep);
    if (this.stepIndex < 0 && state.onboarding.currentStep !== null) {
      this.stepIndex = 0;
    }
    this.currentStepShown = false;

    this.ui.onDialogOk = () => {
      this.pendingEvents.add('dialog-ok');
    };
  }

  notifyEvent(event: string): void {
    this.pendingEvents.add(event);
  }

  tick(): void {
    if (!this.state.onboarding || this.state.onboarding.currentStep === null) {
      this.ui.dismiss();
      return;
    }

    const step = STEPS[this.stepIndex];
    if (!step) {
      this.state.onboarding.currentStep = null;
      this.ui.dismiss();
      return;
    }

    if (!this.currentStepShown) {
      this.state.onboarding.currentStep = step.id;
      if (step.onShow) {
        step.onShow(this.state);
      }
      if (step.buttonText) {
        this.ui.showDialog(step.text, step.buttonText);
      } else if (step.autoDismissMs) {
        this.ui.showBubble(step.text, step.autoDismissMs);
      } else {
        this.ui.showBubble(step.text);
      }
      this.currentStepShown = true;
    }

    if (step.checkComplete(this.state, this.pendingEvents)) {
      this.state.onboarding.completedSteps.push(step.id);
      if (step.onComplete) {
        step.onComplete(this.state);
      }
      this.pendingEvents.clear();
      this.ui.dismiss();

      this.stepIndex++;
      this.currentStepShown = false;

      if (this.stepIndex >= STEPS.length) {
        this.state.onboarding.currentStep = null;
      } else {
        this.state.onboarding.currentStep = STEPS[this.stepIndex]!.id;
      }
    }
  }

  skip(): void {
    const u = this.state.onboarding.unlocks;
    (Object.keys(u) as (keyof FeatureUnlocks)[]).forEach(k => { u[k] = true; });
    this.state.onboarding.currentStep = null;
    this.pendingEvents.clear();
    this.ui.dismiss();
  }

  reset(): void {
    const ob = createDefaultOnboarding();
    this.state.onboarding.currentStep = ob.currentStep;
    this.state.onboarding.completedSteps = ob.completedSteps;
    this.state.onboarding.unlocks = ob.unlocks;
    this.stepIndex = 0;
    this.currentStepShown = false;
    this.pendingEvents.clear();
    this.ui.dismiss();
  }

  goToStep(stepId: string): boolean {
    const idx = STEPS.findIndex(s => s.id === stepId);
    if (idx < 0) return false;
    this.state.onboarding.currentStep = stepId;
    this.stepIndex = idx;
    this.currentStepShown = false;
    this.pendingEvents.clear();
    this.ui.dismiss();
    return true;
  }

  getState(): OnboardingState {
    return this.state.onboarding;
  }

  setState(state: GameState): void {
    this.state = state;
    this.stepIndex = STEPS.findIndex(s => s.id === state.onboarding.currentStep);
    if (this.stepIndex < 0 && state.onboarding.currentStep !== null) {
      this.stepIndex = 0;
    }
    this.currentStepShown = false;
  }
}
