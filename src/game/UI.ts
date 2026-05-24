import type { GameSnapshot } from "./Game";
import type { Renderer } from "./Renderer";

export class UI {
  readonly root: HTMLDivElement;
  readonly gameArea: HTMLDivElement;
  readonly mobileControls: HTMLDivElement;
  private stats: Record<string, HTMLElement> = {};
  private holdCanvas: HTMLCanvasElement;
  private nextCanvases: HTMLCanvasElement[] = [];
  private overlay: HTMLDivElement;
  private overlayTitle: HTMLHeadingElement;
  private overlayText: HTMLParagraphElement;
  private overlayButton: HTMLButtonElement;

  constructor(parent: HTMLElement, private renderer: Renderer) {
    parent.innerHTML = "";
    this.root = document.createElement("div");
    this.root.className = "shell";
    this.gameArea = document.createElement("div");
    this.gameArea.className = "game-area";
    this.root.appendChild(this.gameArea);

    const panel = document.createElement("aside");
    panel.className = "side-panel";
    panel.innerHTML = `
      <section class="brand card">
        <p>Original Puzzle</p>
        <h1>Block Drop Puzzle</h1>
      </section>
      <section class="card stats">
        ${["score", "high", "level", "lines"].map((id) => `<div class="stat"><span class="label">${id}</span><strong data-stat="${id}">0</strong></div>`).join("")}
      </section>
      <section class="preview-row">
        <div class="card preview"><div class="label">Hold</div><canvas data-hold></canvas></div>
        <div class="card"><div class="label">Next</div><div class="queue">${[0, 1, 2].map((i) => `<canvas data-next="${i}"></canvas>`).join("")}</div></div>
      </section>
      <section class="card actions">
        <button data-action="pause">Pause</button>
        <button data-action="restart">Restart</button>
      </section>
      <section class="mobile-controls">
        <button data-action="left">Left</button>
        <button data-action="right">Right</button>
        <button data-action="down">Down</button>
        <button data-action="rotate">Rotate</button>
        <button data-action="drop">Drop</button>
        <button data-action="hold">Hold</button>
        <button data-action="pause">Pause</button>
        <button data-action="restart">Restart</button>
      </section>
    `;
    this.root.appendChild(panel);
    parent.appendChild(this.root);

    this.gameArea.appendChild(this.renderer.canvas);
    this.renderer.resize();
    this.holdCanvas = panel.querySelector("[data-hold]") as HTMLCanvasElement;
    this.nextCanvases = [...panel.querySelectorAll<HTMLCanvasElement>("[data-next]")];
    for (const el of panel.querySelectorAll<HTMLElement>("[data-stat]")) {
      this.stats[el.dataset.stat ?? ""] = el;
    }
    this.mobileControls = panel.querySelector(".mobile-controls") as HTMLDivElement;

    this.overlay = document.createElement("div");
    this.overlay.className = "overlay";
    this.overlay.innerHTML = `
      <div class="overlay-panel">
        <h2></h2>
        <p></p>
        <button>Start Game</button>
      </div>
    `;
    this.overlayTitle = this.overlay.querySelector("h2") as HTMLHeadingElement;
    this.overlayText = this.overlay.querySelector("p") as HTMLParagraphElement;
    this.overlayButton = this.overlay.querySelector("button") as HTMLButtonElement;
    this.gameArea.appendChild(this.overlay);
  }

  update(snapshot: GameSnapshot): void {
    this.stats.score.textContent = String(snapshot.score);
    this.stats.high.textContent = String(snapshot.highScore);
    this.stats.level.textContent = String(snapshot.level);
    this.stats.lines.textContent = String(snapshot.lines);
    this.renderer.drawMini(this.holdCanvas, snapshot.hold);
    snapshot.next.forEach((piece, i) => this.renderer.drawMini(this.nextCanvases[i], piece));
  }

  showOverlay(title: string, text: string, button: string, onClick: () => void): void {
    this.overlayTitle.textContent = title;
    this.overlayText.textContent = text;
    this.overlayButton.textContent = button;
    this.overlayButton.onclick = onClick;
    this.overlay.classList.remove("hidden");
  }

  hideOverlay(): void {
    this.overlay.classList.add("hidden");
  }
}
