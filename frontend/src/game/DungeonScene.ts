
import Phaser from "phaser";

// ทิศทางของกำแพงทั้งสี่ด้าน
type Side = "top" | "bottom" | "left" | "right";

// ข้อมูลประตูที่เชื่อมระหว่างห้อง
type Door = {
    side: Side;
    targetId: number | null;
    locked: boolean;
    isReturn: boolean;
};

// ข้อมูลของห้องแต่ละห้อง
type DungeonRoom = {
    id: number;
    type: "normal" | "boss";
    doors: Map<Side, Door>;
    cleared: boolean;
};

export class DungeonScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Container;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private wasd!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };

    // เก็บกำแพงเพื่อใช้ตรวจสอบการชน
    private walls: Phaser.Geom.Rectangle[] = [];

    // เก็บห้องทุกห้องที่สร้างขึ้น ไม่สร้างทับห้องเดิม
    private rooms = new Map<number, DungeonRoom>();
    private currentRoomId = 1;
    private nextRoomId = 2;

    private roomGraphics!: Phaser.GameObjects.Graphics;
    private roomTitle!: Phaser.GameObjects.Text;
    private roomInfo!: Phaser.GameObjects.Text;
    private helpText!: Phaser.GameObjects.Text;

    private readonly roomWidth = 800;
    private readonly roomHeight = 500;
    private readonly wallThickness = 20;
    private readonly doorWidth = 64;

    constructor() {
        super({ key: "DungeonScene" });
    }

    create() {
        this.cameras.main.setBackgroundColor("#090b12");

        this.roomGraphics = this.add.graphics();

        // สร้างตัวละคร
        this.player = this.add.container(400, 260);

        const body = this.add.rectangle(
            0, 3, 16, 20, 0xc8a96b
        );

        const head = this.add.rectangle(
            0, -8, 10, 10, 0xf0d7a0
        );

        this.player.add([body, head]);
        this.player.setDepth(5);

        // ตั้งค่าปุ่มควบคุม
        if (!this.input.keyboard) {
            throw new Error("Keyboard input is unavailable");
        }

        this.cursors = this.input.keyboard.createCursorKeys();

        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as typeof this.wasd;

        // ข้อความแสดงสถานะ
        this.roomTitle = this.add.text(400, 25, "", {
            fontSize: "16px",
            color: "#e8c27a",
            fontStyle: "bold",
        }).setOrigin(0.5).setDepth(10);

        this.roomInfo = this.add.text(16, 40, "", {
            fontSize: "12px",
            color: "#d0c8bd",
            lineSpacing: 5,
        }).setDepth(10);

        this.helpText = this.add.text(
            400, 475,
            "MOVE: WASD / ARROWS   |   E: CLEAR ROOM (TEST)",
            {
                fontSize: "11px",
                color: "#a3a3b5",
            }
        ).setOrigin(0.5).setDepth(10);

        // ห้องแรกยังไม่มีระบบมอนสเตอร์
        // จึงใช้ปุ่ม E จำลองการเคลียร์ห้องสำหรับทดสอบ
        this.input.keyboard.on("keydown-E", () => {
            this.clearCurrentRoom();
        });

        // สร้างห้องเริ่มต้น
        const firstRoom: DungeonRoom = {
            id: 1,
            type: "normal",
            doors: new Map(),
            cleared: false,
        };

        this.rooms.set(firstRoom.id, firstRoom);
        this.generateExitDoors(firstRoom);

        this.renderRoom();
    }

    update(_time: number, delta: number) {
        const speed = 180;

        let moveX = 0;
        let moveY = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            moveX = -1;
        } else if (
            this.cursors.right.isDown || this.wasd.right.isDown
        ) {
            moveX = 1;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            moveY = -1;
        } else if (
            this.cursors.down.isDown || this.wasd.down.isDown
        ) {
            moveY = 1;
        }

        const direction = new Phaser.Math.Vector2(moveX, moveY);

        if (direction.length() > 0) {
            direction.normalize();

            const amountX = direction.x * speed * delta / 1000;
            const amountY = direction.y * speed * delta / 1000;

            // ตรวจการชนแยกแกน เพื่อให้เดินเลียบกำแพงได้
            const nextX = this.player.x + amountX;

            const boundsX = new Phaser.Geom.Rectangle(
                nextX - 8,
                this.player.y - 12,
                16,
                24
            );

            const blockedX = this.walls.some((wall) =>
                Phaser.Geom.Intersects.RectangleToRectangle(
                    boundsX, wall
                )
            );

            if (!blockedX) {
                this.player.x = nextX;
            }

            const nextY = this.player.y + amountY;

            const boundsY = new Phaser.Geom.Rectangle(
                this.player.x - 8,
                nextY - 12,
                16,
                24
            );

            const blockedY = this.walls.some((wall) =>
                Phaser.Geom.Intersects.RectangleToRectangle(
                    boundsY, wall
                )
            );

            if (!blockedY) {
                this.player.y = nextY;
            }
        }

        // จำกัดตำแหน่งไว้ภายในห้องก่อน
        this.player.x = Phaser.Math.Clamp(this.player.x, 10, 790);
        this.player.y = Phaser.Math.Clamp(this.player.y, 10, 490);

        this.tryEnterDoor();
    }

    // สุ่มทางออก 1-3 ฝั่ง โดยไม่ซ้ำฝั่งกัน
    private generateExitDoors(room: DungeonRoom, exclude?: Side) {
        const sides: Side[] = ["top", "bottom", "left", "right"];

        const candidates = Phaser.Utils.Array.Shuffle(
            sides.filter((side) => side !== exclude)
        );

        // ห้องทั่วไปมีทางออกใหม่ 1-3 ทาง
        const count = Phaser.Math.Between(
            1,
            Math.min(3, candidates.length)
        );

        for (const side of candidates.slice(0, count)) {
            room.doors.set(side, {
                side,
                targetId: null,
                locked: true,
                isReturn: false,
            });
        }
    }

    // เคลียร์ห้อง: ปลดล็อกประตูไปห้องใหม่ทั้งหมด
    private clearCurrentRoom() {
        const room = this.rooms.get(this.currentRoomId);

        if (!room || room.cleared) {
            return;
        }

        room.cleared = true;

        for (const door of room.doors.values()) {
            door.locked = false;
        }

        this.renderRoom();
    }

    private tryEnterDoor() {
        const room = this.rooms.get(this.currentRoomId);

        if (!room) return;

        const x = this.player.x;
        const y = this.player.y;
        const centerX = this.roomWidth / 2;
        const centerY = this.roomHeight / 2;

        let side: Side | null = null;

        if (
            y <= 25 &&
            Math.abs(x - centerX) < this.doorWidth / 2
        ) {
            side = "top";
        } else if (
            y >= 475 &&
            Math.abs(x - centerX) < this.doorWidth / 2
        ) {
            side = "bottom";
        } else if (
            x <= 25 &&
            Math.abs(y - centerY) < this.doorWidth / 2
        ) {
            side = "left";
        } else if (
            x >= 775 &&
            Math.abs(y - centerY) < this.doorWidth / 2
        ) {
            side = "right";
        }

        if (!side) return;

        const door = room.doors.get(side);

        // ไม่มีประตู หรือประตูยังล็อกอยู่ ก็เข้าไม่ได้
        if (!door || door.locked) return;

        // ถ้าเป็นประตูที่เคยเชื่อมไว้แล้ว ให้กลับห้องเดิม
        if (door.targetId !== null) {
            this.enterRoom(door.targetId, side);
            return;
        }

        // สร้างห้องใหม่เฉพาะเมื่อผ่านประตูใหม่เป็นครั้งแรก
        this.createConnectedRoom(room, door);
    }

    private createConnectedRoom(
        fromRoom: DungeonRoom,
        exitDoor: Door
    ) {
        const opposite: Record<Side, Side> = {
            top: "bottom",
            bottom: "top",
            left: "right",
            right: "left",
        };

        const newId = this.nextRoomId++;

        const newRoom: DungeonRoom = {
            id: newId,
            type: "normal",
            doors: new Map(),
            cleared: false,
        };

        // ประตูที่เชื่อมกลับห้องเดิมจะเปิดใช้งานได้เสมอ
        const returnSide = opposite[exitDoor.side];

        newRoom.doors.set(returnSide, {
            side: returnSide,
            targetId: fromRoom.id,
            locked: false,
            isReturn: true,
        });

        // สุ่มทางออกอื่นโดยไม่ทับกับประตูทางกลับ
        this.generateExitDoors(newRoom, returnSide);

        // บันทึกความเชื่อมโยงทั้งสองด้าน
        exitDoor.targetId = newId;

        this.rooms.set(newId, newRoom);

        this.enterRoom(newId, returnSide);
    }

    private enterRoom(roomId: number, enteredFrom: Side) {
        this.currentRoomId = roomId;

        // วางตัวละครใกล้ประตูที่ใช้เข้ามา
        switch (enteredFrom) {
            case "top":
                this.player.setPosition(400, 55);
                break;
            case "bottom":
                this.player.setPosition(400, 445);
                break;
            case "left":
                this.player.setPosition(55, 250);
                break;
            case "right":
                this.player.setPosition(745, 250);
                break;
        }

        this.renderRoom();
    }

    private renderRoom() {
        const room = this.rooms.get(this.currentRoomId);

        if (!room) return;

        this.walls = [];
        this.roomGraphics.clear();

        // วาดพื้นหิน
        for (let y = 0; y < 500; y += 40) {
            for (let x = 0; x < 800; x += 40) {
                const alternate = (x / 40 + y / 40) % 2 === 0;

                this.roomGraphics.fillStyle(
                    alternate ? 0x252735 : 0x20222f,
                    1
                );

                this.roomGraphics.fillRect(x, y, 38, 38);
                this.roomGraphics.lineStyle(1, 0x343644, 0.7);
                this.roomGraphics.strokeRect(x, y, 38, 38);
            }
        }

        // สร้างกำแพงโดยเว้นช่องไว้เฉพาะจุดที่มีประตู
        const wall = this.wallThickness;
        const halfDoor = this.doorWidth / 2;
        const cx = this.roomWidth / 2;
        const cy = this.roomHeight / 2;

        this.addWall(0, 0, cx - halfDoor, wall);
        this.addWall(cx + halfDoor, 0, cx - halfDoor, wall);

        this.addWall(0, 480, cx - halfDoor, wall);
        this.addWall(cx + halfDoor, 480, cx - halfDoor, wall);

        this.addWall(0, 0, wall, cy - halfDoor);
        this.addWall(0, cy + halfDoor, wall, cy - halfDoor);

        this.addWall(780, 0, wall, cy - halfDoor);
        this.addWall(780, cy + halfDoor, wall, cy - halfDoor);

        // วาดประตูแต่ละฝั่ง
        for (const door of room.doors.values()) {
            this.drawDoor(door);
        }

        // แสดงข้อมูลห้อง
        this.roomTitle.setText(
            room.type === "boss"
                ? `BOSS ROOM #${room.id}`
                : `THE FORGOTTEN SANCTUM · ROOM ${room.id}`
        );

        this.roomInfo.setText([
            `Room: ${room.id}`,
            `Status: ${room.cleared ? "CLEARED" : "LOCKED"}`,
            `Doors: ${room.doors.size}`,
        ]);

        this.helpText.setText(
            room.cleared
                ? "MOVE: WASD / ARROWS"
                : "MOVE: WASD / ARROWS   |   E: CLEAR ROOM (TEST)"
        );
    }

    private addWall(
        x: number,
        y: number,
        width: number,
        height: number
    ) {
        this.roomGraphics.fillStyle(0x55515b, 1);
        this.roomGraphics.fillRect(x, y, width, height);

        this.roomGraphics.lineStyle(2, 0x82798a, 1);
        this.roomGraphics.strokeRect(x, y, width, height);

        this.walls.push(
            new Phaser.Geom.Rectangle(x, y, width, height)
        );
    }

    private drawDoor(door: Door) {
        const cx = this.roomWidth / 2;
        const cy = this.roomHeight / 2;
        const halfDoor = this.doorWidth / 2;

        // ประตูล็อกเป็นสีแดง ประตูที่เปิดแล้วเป็นสีทอง
        const color = door.locked ? 0x9b4646 : 0xe8c27a;

        this.roomGraphics.fillStyle(color, 1);

        switch (door.side) {
            case "top":
                this.roomGraphics.fillRect(
                    cx - halfDoor, 3, this.doorWidth, 14
                );
                break;
            case "bottom":
                this.roomGraphics.fillRect(
                    cx - halfDoor, 483, this.doorWidth, 14
                );
                break;
            case "left":
                this.roomGraphics.fillRect(
                    3, cy - halfDoor, 14, this.doorWidth
                );
                break;
            case "right":
                this.roomGraphics.fillRect(
                    783, cy - halfDoor, 14, this.doorWidth
                );
                break;
        }
    }
}
