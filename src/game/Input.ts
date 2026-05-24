export type Action = "left" | "right" | "down" | "rotate" | "rotateCCW" | "drop" | "hold" | "pause" | "restart";

export class Input {
  private repeatTimers = new Map<string, number>();

  constructor(private root: HTMLElement, private onAction: (action: Action) => void) {
    window.addEventListener("keydown", this.handleKey);
    root.addEventListener("pointerdown", this.handlePointerDown);
    root.addEventListener("pointerup", this.handlePointerUp);
    root.addEventListener("pointercancel", this.handlePointerUp);
    root.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  private handleKey = (event: KeyboardEvent): void => {
    const action = this.keyToAction(event);
    if (!action) return;
    event.preventDefault();
    this.onAction(action);
  };

  private handlePointerDown = (event: PointerEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    event.preventDefault();
    const action = target.dataset.action as Action;
    this.onAction(action);
    if (action === "left" || action === "right" || action === "down") {
      const id = `${event.pointerId}-${action}`;
      const timer = window.setInterval(() => this.onAction(action), action === "down" ? 70 : 115);
      this.repeatTimers.set(id, timer);
      target.setPointerCapture(event.pointerId);
    }
  };

  private handlePointerUp = (event: PointerEvent): void => {
    for (const [id, timer] of this.repeatTimers) {
      if (id.startsWith(`${event.pointerId}-`)) {
        clearInterval(timer);
        this.repeatTimers.delete(id);
      }
    }
  };

  private keyToAction(event: KeyboardEvent): Action | null {
    if (event.code === "ArrowLeft") return "left";
    if (event.code === "ArrowRight") return "right";
    if (event.code === "ArrowDown") return "down";
    if (event.code === "ArrowUp" || event.code === "KeyX") return "rotate";
    if (event.code === "KeyZ") return "rotateCCW";
    if (event.code === "Space") return "drop";
    if (event.code === "KeyC" || event.code === "ShiftLeft" || event.code === "ShiftRight") return "hold";
    if (event.code === "KeyP") return "pause";
    if (event.code === "KeyR") return "restart";
    return null;
  }
}
