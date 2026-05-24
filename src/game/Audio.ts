export class AudioFx {
  enabled = true;
  private ctx?: AudioContext;

  play(type: "move" | "rotate" | "drop" | "clear" | "gameover"): void {
    if (!this.enabled) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx ??= new Ctor();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const map = {
      move: [180, 0.035, "square", 0.025],
      rotate: [260, 0.045, "triangle", 0.03],
      drop: [95, 0.075, "sawtooth", 0.04],
      clear: [520, 0.13, "triangle", 0.05],
      gameover: [70, 0.32, "sawtooth", 0.045]
    } as const;
    const [freq, dur, wave, volume] = map[type];
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    osc.stop(this.ctx.currentTime + dur);
  }
}
