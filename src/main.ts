import Phaser from "phaser";
import "./styles.css";
import { GameScene } from "./game/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#07080d",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 1.05 },
      debug: false
    }
  },
  scene: [GameScene]
};

new Phaser.Game(config);
