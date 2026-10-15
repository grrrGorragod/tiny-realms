import Phaser from "phaser";

export class DungeonScene extends Phaser.Scene {
    constructor() {
        super({ key: "DungeonScene" });
    }

    create() {
        this.cameras.main.setBackgroundColor("#11131b");

        this.add
            .text(400, 300, "Dungeon Scene", {
                fontSize: "32px",
                color: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
    }
}