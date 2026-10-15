
import Phaser from "phaser";

export class DungeonScene extends Phaser.Scene {
    // เก็บข้อมูลตัวละครและปุ่มควบคุมไว้ใช้ตลอดฉาก
    private player!: Phaser.GameObjects.Container;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };
    private walls: Phaser.Geom.Rectangle[] = [];

    constructor() {
        super({ key: "DungeonScene" });
    }

    create() {
        // 1. ตั้งค่าสีพื้นหลังของดันเจี้ยน
        this.cameras.main.setBackgroundColor("#090b12");

        // 2. วาดพื้นหินเป็นตาราง
        const floor = this.add.graphics();

        for (let y = 0; y < 500; y += 40) {
            for (let x = 0; x < 800; x += 40) {
                const alternate =
                    (x / 40 + y / 40) % 2 === 0;

                floor.fillStyle(
                    alternate ? 0x252735 : 0x20222f,
                    1
                );

                floor.fillRect(x, y, 38, 38);

                floor.lineStyle(1, 0x343644, 0.7);
                floor.strokeRect(x, y, 38, 38);
            }
        }

        // 3. เพิ่มชื่อดันเจี้ยน
        this.add
            .text(400, 24, "THE FORGOTTEN SANCTUM", {
                fontSize: "16px",
                color: "#e8c27a",
                fontStyle: "bold",
            })
            .setOrigin(0.5, 0);

        // 4. สร้างตัวละครจากรูปทรงสี่เหลี่ยม
        this.player = this.add.container(400, 260);

        // ลำตัวของตัวละคร
        const body = this.add.rectangle(
            0, 3, 16, 20, 0xc8a96b
        );

        // ศีรษะของตัวละคร
        const head = this.add.rectangle(
            0, -8, 10, 10, 0xf0d7a0
        );

        // เพิ่มชิ้นส่วนเข้าไปในตัวละครเดียวกัน
        this.player.add([body, head]);

        // ทำให้ตัวละครอยู่เหนือพื้นหิน
        this.player.setDepth(1);

        // สร้างเครื่องมือวาดกำแพง
        const wallGraphics = this.add.graphics();

        // กำหนดตำแหน่งกำแพง: x, y, ความกว้าง, ความสูง
        const wallPositions = [
            { x: 160, y: 120, width: 200, height: 30 },
            { x: 440, y: 160, width: 30, height: 160 },
            { x: 200, y: 340, width: 180, height: 30 },
        ];

        // วาดกำแพงแต่ละชิ้นและบันทึกพื้นที่สำหรับตรวจการชน
        for (const wall of wallPositions) {
            wallGraphics.fillStyle(0x55515b, 1);
            wallGraphics.fillRect(
                wall.x,
                wall.y,
                wall.width,
                wall.height
            );

            wallGraphics.lineStyle(2, 0x82798a, 1);
            wallGraphics.strokeRect(
                wall.x,
                wall.y,
                wall.width,
                wall.height
            );

            this.walls.push(
                new Phaser.Geom.Rectangle(
                    wall.x,
                    wall.y,
                    wall.width,
                    wall.height
                )
            );
        }

        // ให้กำแพงอยู่เหนือพื้น แต่ยังแสดงตัวละครได้
        wallGraphics.setDepth(2);

        // 5. เตรียมปุ่มลูกศร
        if (!this.input.keyboard) {
            throw new Error("Keyboard input is unavailable");
        }

        this.cursors = this.input.keyboard.createCursorKeys();

        // 6. เตรียมปุ่ม WASD
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as typeof this.wasd;

        // 7. แสดงคำแนะนำการควบคุม
        this.add
            .text(
                400,
                475,
                "MOVE: WASD / ARROW KEYS",
                {
                    fontSize: "12px",
                    color: "#a3a3b5",
                }
            )
            .setOrigin(0.5);
    }

    update(_time: number, delta: number) {
        // ความเร็วในการเดิน หน่วยเป็นพิกเซลต่อวินาที
        const speed = 180;

        let moveX = 0;
        let moveY = 0;

        // ตรวจสอบการกดปุ่มแนวนอน
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            moveX = -1;
        } else if (
            this.cursors.right.isDown ||
            this.wasd.right.isDown
        ) {
            moveX = 1;
        }

        // ตรวจสอบการกดปุ่มแนวตั้ง
        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            moveY = -1;
        } else if (
            this.cursors.down.isDown ||
            this.wasd.down.isDown
        ) {
            moveY = 1;
        }

        // ป้องกันไม่ให้เดินเฉียงเร็วกว่าการเดินตรง
        const direction = new Phaser.Math.Vector2(moveX, moveY);

        if (direction.length() > 0) {
            direction.normalize();

            // คำนวณตำแหน่งใหม่ที่ตัวละครต้องการเดินไป
            const nextX =
                this.player.x + direction.x * speed * (delta / 1000);

            const nextY =
                this.player.y + direction.y * speed * (delta / 1000);

            // ใช้กรอบตัวละครประมาณ 16 x 24 พิกเซล
            const playerBounds = new Phaser.Geom.Rectangle(
                nextX - 8,
                nextY - 12,
                16,
                24
            );

            // ตรวจว่าตำแหน่งใหม่ชนกำแพงหรือไม่
            const hitsWall = this.walls.some((wall) =>
                Phaser.Geom.Intersects.RectangleToRectangle(
                    playerBounds,
                    wall
                )
            );

            // ขยับตัวละครเฉพาะเมื่อไม่ชนกำแพง
            if (!hitsWall) {
                this.player.x = nextX;
                this.player.y = nextY;
            }
        }

        // จำกัดไม่ให้ตัวละครเดินออกนอกหน้าจอ
        this.player.x = Phaser.Math.Clamp(this.player.x, 10, 790);
        this.player.y = Phaser.Math.Clamp(this.player.y, 45, 455);
    }
}
