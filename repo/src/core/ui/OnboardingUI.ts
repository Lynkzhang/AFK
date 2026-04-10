export class OnboardingUI {
  readonly root: HTMLDivElement;
  private overlay: HTMLDivElement;
  private dialog: HTMLDivElement;
  private textEl: HTMLDivElement;
  private btnEl: HTMLButtonElement;
  private bubble: HTMLDivElement | null = null;
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;

  onDialogOk: (() => void) | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'onboarding-root';

    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';
    this.overlay.style.display = 'none';

    this.dialog = document.createElement('div');
    this.dialog.className = 'onboarding-dialog';

    this.textEl = document.createElement('div');
    this.textEl.className = 'onboarding-text';

    this.btnEl = document.createElement('button');
    this.btnEl.className = 'onboarding-btn';
    this.btnEl.onclick = () => {
      if (this.onDialogOk) this.onDialogOk();
    };

    this.dialog.append(this.textEl, this.btnEl);
    this.overlay.appendChild(this.dialog);
    this.root.appendChild(this.overlay);
  }

  showDialog(text: string, buttonText: string): void {
    this.dismissBubble();
    this.textEl.textContent = text;
    this.btnEl.textContent = buttonText;
    this.btnEl.style.display = '';
    this.overlay.style.display = 'flex';
  }

  showBubble(text: string, autoDismissMs?: number): void {
    this.overlay.style.display = 'none';
    this.dismissBubble();
    this.bubble = document.createElement('div');
    this.bubble.className = 'onboarding-bubble';
    this.bubble.textContent = text;
    this.root.appendChild(this.bubble);
    if (autoDismissMs) {
      this.bubbleTimer = setTimeout(() => this.dismissBubble(), autoDismissMs);
    }
  }

  dismiss(): void {
    this.overlay.style.display = 'none';
    this.dismissBubble();
  }

  private dismissBubble(): void {
    if (this.bubbleTimer) {
      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = null;
    }
    if (this.bubble) {
      this.bubble.remove();
      this.bubble = null;
    }
  }
}
