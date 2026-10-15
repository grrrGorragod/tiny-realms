
import Phaser from "phaser";

type PlayerClass = "warrior" | "mage";

export class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: "LobbyScene" });
    }

    create() {
        const width = 800;
        const height = 500;

        // พื้นหลังธีม Dark Fantasy
        this.cameras.main.setBackgroundColor("#090b12");

        const background = this.add.graphics();

        background.fillGradientStyle(
            0x202033,
            0x202033,
            0x090b12,
            0x090b12,
            1
        );
        background.fillRect(0, 0, width, height);

        // กรอบหน้าจอ
        background.lineStyle(2, 0x6e6179, 0.8);
        background.strokeRect(18, 18, width - 36, height - 36);

        background.lineStyle(1, 0xd6b875, 0.5);
        background.strokeRect(25, 25, width - 50, height - 50);

        // ชื่อเกม
        this.add.text(width / 2, 48, "TINY REALMS", {
            fontFamily: "Georgia, serif",
            fontSize: "36px",
            fontStyle: "bold",
            color: "#f0d39a",
            letterSpacing: 5,
        }).setOrigin(0.5);

        this.add.text(width / 2, 88, "THE FORGOTTEN SANCTUM", {
            fontSize: "12px",
            color: "#aaa6bb",
            letterSpacing: 4,
        }).setOrigin(0.5);

        this.add.text(width / 2, 130, "CHOOSE YOUR CLASS", {
            fontSize: "18px",
            fontStyle: "bold",
            color: "#ffffff",
            letterSpacing: 2,
        }).setOrigin(0.5);

        // การ์ด Warrior
        this.createClassCard({
            x: 215,
            title: "WARRIOR",
            subtitle: "THE BLADE",
            description:
                "A fearless melee fighter.\nStrike enemies with powerful sword attacks.",
            color: 0xb85c50,
            symbol: "W",
            onSelect: () => this.startGame("warrior"),
        });

        // การ์ด Mage
        this.createClassCard({
            x: 585,
            title: "MAGE",
            subtitle: "THE ARCANE",
            description:
                "A master of ranged magic.\nLaunch arcane projectiles at your enemies.",
            color: 0x639de0,
            symbol: "M",
            onSelect: () => this.startGame("mage"),
        });

        this.add.text(
            width / 2,
            456,
            "CHOOSE YOUR PATH  •  ENTER THE DUNGEON",
            {
                fontSize: "11px",
                color: "#aaa6bb",
                letterSpacing: 1,
            }
        ).setOrigin(0.5);
    }

    private createClassCard(options: {
        x: number;
        title: string;
        subtitle: string;
        description: string;
        color: number;
        symbol: string;
        onSelect: () => void;
    }) {
        const {
            x,
            title,
            subtitle,
            description,
            color,
            symbol,
            onSelect,
        } = options;

        const y = 290;

        const card = this.add.rectangle(
            x,
            y,
            290,
            270,
            0x1b1d2a
        )
            .setStrokeStyle(2, 0x514c61)
            .setInteractive({ useHandCursor: true });

        const accent = this.add.rectangle(
            x,
            y - 132,
            286,
            5,
            color
        );

        const emblem = this.add.circle(
            x,
            y - 83,
            29,
            color,
            0.15
        ).setStrokeStyle(2, color);

        const icon = this.add.text(x, y - 83, symbol, {
            fontSize: "28px",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5);

        const titleText = this.add.text(x, y - 35, title, {
            fontSize: "24px",
            fontStyle: "bold",
            color: "#f0d39a",
            letterSpacing: 2,
        }).setOrigin(0.5);

        const subtitleText = this.add.text(x, y - 5, subtitle, {
            fontSize: "11px",
            color: "#aaa6bb",
            letterSpacing: 2,
        }).setOrigin(0.5);

        const descriptionText = this.add.text(
            x,
            y + 40,
            options.description,
            {
                fontSize: "12px",
                color: "#d0ceda",
                align: "center",
                lineSpacing: 7,
                wordWrap: { width: 245 },
            }
        ).setOrigin(0.5);

        const button = this.add.rectangle(
            x,
            y + 105,
            190,
            38,
            0x343144
        ).setStrokeStyle(1, color);

        const buttonText = this.add.text(
            x,
            y + 105,
            "SELECT CLASS",
            {
                fontSize: "12px",
                fontStyle: "bold",
                color: "#ffffff",
                letterSpacing: 1,
            }
        ).setOrigin(0.5);

        // รวมวัตถุทั้งหมดในกลุ่มเดียว เพื่อให้ Hover พร้อมกัน
        const elements = [
            card,
            accent,
            emblem,
            icon,
            titleText,
            subtitleText,
            descriptionText,
            button,
            buttonText,
        ];

        card.on("pointerover", () => {
            card.setFillStyle(0x292b3c);
            card.setStrokeStyle(2, color);
            button.setFillStyle(color);
            emblem.setFillStyle(color, 0.35);

            this.tweens.add({
                targets: elements,
                duration: 120,
                scale: 1.02,
                ease: "Sine.easeOut",
            });
        });

        card.on("pointerout", () => {
            card.setFillStyle(0x1b1d2a);
            card.setStrokeStyle(2, 0x514c61);
            button.setFillStyle(0x343144);
            emblem.setFillStyle(color, 0.15);

            this.tweens.add({
                targets: elements,
                duration: 120,
                scale: 1,
                ease: "Sine.easeOut",
            });
        });

        card.on("pointerdown", onSelect);
    }

    private startGame(playerClass: PlayerClass) {
        this.scene.start("DungeonScene", { playerClass });
    }
}
