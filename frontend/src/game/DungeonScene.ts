
import Phaser from "phaser";

type Side = "top" | "bottom" | "left" | "right";

type Door = {
    side: Side;
    targetId: number | null;
    locked: boolean;
    isReturn: boolean;
};

type EnemyState = {
    id: number;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    damage: number;
    attackCooldown: number;
    alive: boolean;

    //BURN
    burnTimer: number;
    burnTickTimer: number;
};

type EnemyEntity = {
    state: EnemyState;
    sprite: Phaser.GameObjects.Container;
    hpBar: Phaser.GameObjects.Graphics;
};

type DungeonRoom = {
    id: number;
    type: "normal" | "boss";
    doors: Map<Side, Door>;
    cleared: boolean;
    enemies: EnemyState[];

    chestSpawned: boolean;
    chestOpened: boolean;
};


type PlayerClass = "warrior" | "mage";
type SwordElement = "normal" | "fire" | "lightning" | "healing" | "warp";

type ProjectileEntity = {
    sprite: Phaser.GameObjects.Arc;
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    traveled: number;
    maxDistance: number;
    hitEnemyIds: Set<number>;
};


type FireWaveEntity = {
    sprite: Phaser.GameObjects.Arc;
    x: number;
    y: number;
    vx: number;
    vy: number;
    traveled: number;
    maxDistance: number;
    damage: number;
    hitEnemyIds: Set<number>;
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

    private dodgeKey!: Phaser.Input.Keyboard.Key;
    private fireSwordKey!: Phaser.Input.Keyboard.Key;

    private walls: Phaser.Geom.Rectangle[] = [];
    private rooms = new Map<number, DungeonRoom>();
    private currentRoomId = 1;
    private nextRoomId = 2;

    private enemies: EnemyEntity[] = [];


    private playerClass: PlayerClass = "warrior";
    private swordElement: SwordElement = "normal";
    private projectiles: ProjectileEntity[] = [];

    private fireWaves: FireWaveEntity[] = [];

    private warriorDamage = 25;
    private warriorRange = 76;
    private warriorArc = Math.PI / 3;

    private mageDamage = 20;
    private mageProjectileSpeed = 360;
    private mageProjectileRange = 420;

    private classKey1!: Phaser.Input.Keyboard.Key;
    private classKey2!: Phaser.Input.Keyboard.Key;


    private roomGraphics!: Phaser.GameObjects.Graphics;
    private roomTitle!: Phaser.GameObjects.Text;
    private roomInfo!: Phaser.GameObjects.Text;
    private helpText!: Phaser.GameObjects.Text;
    private playerHpBar!: Phaser.GameObjects.Graphics;
    private playerHpText!: Phaser.GameObjects.Text;
    private playerXpText!: Phaser.GameObjects.Text;
    private warriorStaminaBar!: Phaser.GameObjects.Graphics;
    private combatMessage!: Phaser.GameObjects.Text;

    private interactKey!: Phaser.Input.Keyboard.Key;

    private chestVisual?: Phaser.GameObjects.Container;
    private chestPrompt?: Phaser.GameObjects.Text;

    // ================================
    // ระบบเลเวล Warrior
    // ================================

    // เลเวลปัจจุบันของผู้เล่น
    private playerLevel = 1;

    // XP ปัจจุบัน
    private playerXp = 0;

    // จำนวน XP ที่ใช้สำหรับเลเวลถัดไป
    private xpToNextLevel = 30;

    // เก็บจำนวนครั้งที่ผู้เล่นเลือกอัปเกรดแล้ว
    private upgradeChoicesMade = 0;

    // สถานะว่ากำลังรอผู้เล่นเลือกอัปเกรดหรือไม่
    private isChoosingUpgrade = false;
    //UI
    private upgradePanel?: Phaser.GameObjects.Container;
    private upgradeButtons: Phaser.GameObjects.Container[] = [];

    // ระดับการอัปเกรดพลังโจมตี
    private warriorDamageLevel = 0;

    // สถานะปลดล็อกสกิลชาร์จฟันวงกว้าง
    private hasChargedSlash = false;

    // ระดับการอัปเกรดสกิลชาร์จ
    private chargedSlashLevel = 0;

    // ================================
    // ระบบความเหนื่อยของ Warrior
    // ================================

    // ความเหนื่อยสูงสุด
    private warriorMaxStamina = 100;

    // ความเหนื่อยปัจจุบัน
    private warriorStamina = 100;

    // อัตราฟื้นฟูความเหนื่อยต่อวินาที
    private warriorStaminaRegen = 10;


    // อัตราการใช้ Stamina ขณะเปิดโหมดดาบธาตุ (ต่อวินาที)
    private swordElementStaminaDrain = 7.5;


    // ระดับอัปเกรดความเร็วฟื้นฟูความเหนื่อย
    private warriorStaminaRegenLevel = 0;

    // ระดับอัปเกรดความจุความเหนื่อย
    private warriorStaminaCapacityLevel = 0;

    // ระดับอัปเกรดการประหยัดความเหนื่อย
    private warriorStaminaEfficiencyLevel = 0;



    /** กำลังชาร์จสกิลฟันดาบอยู่หรือไม่ */
    private isChargingSlash = false;

    /** ระยะเวลาที่กดชาร์จ หน่วยมิลลิวินาที */
    private slashChargeTime = 0;

    /** ระยะเวลาชาร์จขั้นต่ำก่อนฟันเต็มกำลัง */
    private readonly minSlashChargeTime = 700;

    /** ระยะเวลาชาร์จสูงสุด */
    private readonly maxSlashChargeTime = 1800;


    private readonly roomWidth = 800;
    private readonly roomHeight = 500;
    private readonly wallThickness = 20;
    private readonly doorWidth = 64;

    private readonly playerMaxHp = 100;
    private playerHp = 100;
    private readonly playerDamage = 25;
    private readonly attackRange = 68;
    private readonly attackCooldown = 350;

    private attackTimer = 0;
    private dodgeTimer = 0;
    private invulnerableTimer = 0;
    private enemyId = 1;

    private isDead = false;
    private isDying = false;

    constructor() {
        super({ key: "DungeonScene" });
    }

        init(data: { playerClass?: PlayerClass }) {
        this.playerClass = data.playerClass ?? "warrior";
    }

    create() {
        this.cameras.main.setBackgroundColor("#090b12");
        this.roomGraphics = this.add.graphics();

        this.player = this.add.container(400, 260);

        const body = this.add.rectangle(0, 3, 16, 20, 0xc8a96b);
        const head = this.add.rectangle(0, -8, 10, 10, 0xf0d7a0);

        this.player.add([body, head]);
        this.player.setDepth(5);

        if (!this.input.keyboard) {
            throw new Error("Keyboard input is unavailable");
        }

        this.cursors = this.input.keyboard.createCursorKeys();

        this.interactKey = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );

        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as typeof this.wasd;

        this.dodgeKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SHIFT
        );

        this.fireSwordKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.X
        );

        this.classKey1 = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ONE
        );

        this.classKey2 = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.TWO
        );


        this.roomTitle = this.add.text(400, 25, "", {
            fontSize: "16px",
            color: "#e8c27a",
            fontStyle: "bold",
        }).setOrigin(0.5).setDepth(20);

        this.roomInfo = this.add.text(16, 45, "", {
            fontSize: "12px",
            color: "#d0c8bd",
            lineSpacing: 5,
        }).setDepth(20);

        this.playerHpBar = this.add.graphics().setDepth(20);
        this.warriorStaminaBar = this.add.graphics().setDepth(20);

        this.playerHpText = this.add.text(16, 105, "", {
            fontSize: "12px",
            color: "#f0d7a0",
        }).setDepth(20);

        this.playerXpText = this.add.text(16, 125, "", {
            fontSize: "12px",
            color: "#8bd5ff",
        }).setDepth(20);

        this.combatMessage = this.add.text(400, 80, "", {
            fontSize: "14px",
            color: "#e8c27a",
            fontStyle: "bold",
            align: "center",
        }).setOrigin(0.5).setDepth(25);

        this.helpText = this.add.text(
            400,
            475,
            "WASD / ARROWS: MOVE  |  CLICK: ATTACK  |  SHIFT: DODGE |  1: WARRIOR  |  2: MAGE",
            {
                fontSize: "11px",
                color: "#a3a3b5",
            }
        ).setOrigin(0.5).setDepth(20);

        
            
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (!pointer.leftButtonDown()) {
                return;
            }

            // ถ้าเป็น Warrior และปลดล็อกสกิลชาร์จแล้ว
            // ให้เริ่มจับเวลาชาร์จแทนการโจมตีทันที
            if (
                this.playerClass === "warrior" &&
                this.hasChargedSlash
            ) {
                if (this.isDead || this.isChoosingUpgrade || this.attackTimer > 0) {
                    return;
                }

                this.isChargingSlash = true;
                this.slashChargeTime = 0;
                return;
            }

            // หากยังไม่ปลดล็อกสกิล ให้โจมตีแบบเดิม
            this.attack(pointer.x, pointer.y);
        });


        this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            // ถ้าไม่ได้กำลังชาร์จ ไม่ต้องทำอะไร
            if (!this.isChargingSlash) {
                return;
            }

            this.isChargingSlash = false;

            // ถ้าชาร์จไม่ถึงเวลาขั้นต่ำ ให้ฟันปกติแทน
            if (this.slashChargeTime < this.minSlashChargeTime) {
                this.attack(pointer.x, pointer.y);
                this.slashChargeTime = 0;
                return;
            }

            // ป้องกันการใช้สกิลระหว่างตายหรือเลือกอัปเกรด
            if (this.isDead || this.isChoosingUpgrade) {
                this.slashChargeTime = 0;
                return;
            }

            // คำนวณทิศทางจากตัวละครไปยังตำแหน่งเมาส์
            const angle = Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                pointer.x,
                pointer.y
            );

            // ใช้คูลดาวน์เดียวกับการโจมตีปกติ
            this.attackTimer = this.attackCooldown;

            // ปล่อยคลื่นดาบ
            this.chargedSlash(angle);

            // รีเซ็ตเวลาชาร์จ
            this.slashChargeTime = 0;
        });




        const firstRoom: DungeonRoom = {
            id: 1,
            type: "normal",
            doors: new Map(),
            cleared: false,
            enemies: this.createEnemyStates(3),
            chestSpawned: false,
            chestOpened: false,
        };

        this.rooms.set(firstRoom.id, firstRoom);
        this.generateExitDoors(firstRoom);
        this.renderRoom();
    }

    update(_time: number, delta: number) {
        if (this.isDead) {
            return;
        }
        if (this.isChoosingUpgrade) {
            return;
        }

        this.attackTimer = Math.max(0, this.attackTimer - delta);


        
        // จัดการ Stamina ของ Warrior
        if (this.playerClass === "warrior") {
            if (this.swordElement !== "normal") {
                // เปิดโหมดดาบธาตุ: ใช้ Stamina ต่อเนื่อง
                this.warriorStamina = Math.max(
                    0,
                    this.warriorStamina -
                        (this.swordElementStaminaDrain * delta) / 1000
                );

                // Stamina หมด: ปิดโหมดดาบธาตุอัตโนมัติ
                if (this.warriorStamina <= 0) {
                    this.swordElement = "normal";
                    this.showMessage("หมด Stamina! ปิดโหมดดาบธาตุ");
                }
            } else {
                // ปิดโหมดดาบธาตุ: ฟื้นฟู Stamina
                this.warriorStamina = Math.min(
                    this.warriorMaxStamina,
                    this.warriorStamina +
                        (this.warriorStaminaRegen * delta) / 1000
                );
            }
        }

        this.updatePlayerUI();




        // นับเวลาขณะที่กำลังชาร์จสกิลดาบ
        if (this.isChargingSlash) {
            this.slashChargeTime = Math.min(
                this.maxSlashChargeTime,
                this.slashChargeTime + delta
            );
        }



        this.dodgeTimer = Math.max(0, this.dodgeTimer - delta);
        this.invulnerableTimer = Math.max(
            0,
            this.invulnerableTimer - delta
        );

        this.movePlayer(delta);

        if (Phaser.Input.Keyboard.JustDown(this.dodgeKey)) {
            this.dodge();
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.classKey1)) {
            this.playerClass = "warrior";
            this.showMessage("CLASS: WARRIOR");
        }

        if (Phaser.Input.Keyboard.JustDown(this.classKey2)) {
            this.playerClass = "mage";
            this.showMessage("CLASS: MAGE");
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.fireSwordKey) &&
            this.playerClass === "warrior"
        ) {
            if (this.swordElement === "normal") {
                this.swordElement = "fire";
                this.showMessage("🔥 เปิดใช้งานดาบไฟ!");
            } else {
                this.swordElement = "normal";
                this.showMessage("⚔️ กลับสู่ดาบปกติ");
            }
        }


        this.updateProjectiles(delta);
        this.updateFireWaves(delta);


        
        this.updateEnemies(delta);
        this.updatePlayerUI();

        // ตรวจสอบว่าผู้เล่นเข้าใกล้หีบหรือไม่
        this.updateChestPrompt();

        // กด E เพื่อเปิดหีบ
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.tryOpenChest();
        }

        this.tryEnterDoor();

    }

    private movePlayer(delta: number) {
        const speed = this.dodgeTimer > 0 ? 420 : 180;

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

            this.moveWithWallCollision(amountX, amountY);
        }

        this.player.x = Phaser.Math.Clamp(this.player.x, 10, 790);
        this.player.y = Phaser.Math.Clamp(this.player.y, 10, 490);
    }

    private moveWithWallCollision(amountX: number, amountY: number) {
        const nextX = this.player.x + amountX;

        const boundsX = new Phaser.Geom.Rectangle(
            nextX - 8,
            this.player.y - 12,
            16,
            24
        );

        if (!this.walls.some((wall) =>
            Phaser.Geom.Intersects.RectangleToRectangle(boundsX, wall)
        )) {
            this.player.x = nextX;
        }

        const nextY = this.player.y + amountY;

        const boundsY = new Phaser.Geom.Rectangle(
            this.player.x - 8,
            nextY - 12,
            16,
            24
        );

        if (!this.walls.some((wall) =>
            Phaser.Geom.Intersects.RectangleToRectangle(boundsY, wall)
        )) {
            this.player.y = nextY;
        }
    }

    private dodge() {
        if (this.dodgeTimer > 0 || this.invulnerableTimer > 0) {
            return;
        }

        let dx = 0;
        let dy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) dx = -1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) dx = 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) dy = -1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) dy = 1;

        // ถ้าไม่ได้กดทิศทาง ให้กลิ้งไปทางที่ตัวละครหันหน้าไป
        if (dx === 0 && dy === 0) {
            dx = 1;
        }

        const direction = new Phaser.Math.Vector2(dx, dy).normalize();

        this.dodgeTimer = 180;
        this.invulnerableTimer = 280;

        this.moveWithWallCollision(
            direction.x * 72,
            direction.y * 72
        );

        this.player.setAlpha(0.45);

        this.time.delayedCall(280, () => {
            if (this.player.active && !this.isDead) {
                this.player.setAlpha(1);
            }
        });
    }

    
    private attack(mouseX: number, mouseY: number) {
        if (this.isDead || this.attackTimer > 0) {
            return;
        }

        this.attackTimer = this.attackCooldown;

        const angle = Phaser.Math.Angle.Between(
            this.player.x,
            this.player.y,
            mouseX,
            mouseY
        );

        if (this.playerClass === "warrior") {
            this.warriorAttack(angle);
        } else {
            this.mageAttack(angle);
        }
    }

    
    private warriorAttack(angle: number) {

        const range = this.warriorRange;
        const startAngle = angle - this.warriorArc / 2;
        const endAngle = angle + this.warriorArc / 2;

        // เส้นฟันดาบ
        const slash = this.add.graphics().setDepth(10);

        slash.lineStyle(
            7,
            this.swordElement === "fire" ? 0xff5a1f : 0xffe29a,
            0.9
        );
        slash.beginPath();
        slash.arc(
            this.player.x,
            this.player.y,
            range,
            startAngle,
            endAngle,
            false
        );
        slash.strokePath();

        // เส้นแสงชั้นใน
        slash.lineStyle(2, 0xffffff, 1);
        slash.beginPath();
        slash.arc(
            this.player.x,
            this.player.y,
            range - 5,
            startAngle,
            endAngle,
            false
        );
        slash.strokePath();

        this.tweens.add({
            targets: slash,
            alpha: 0,
            duration: 160,
            onComplete: () => slash.destroy(),
        });

        // สะบัดตัวไปตามทิศที่ฟัน
        const originalX = this.player.x;
        const originalY = this.player.y;
        const lunge = 5;

        this.tweens.add({
            targets: this.player,
            x: originalX + Math.cos(angle) * lunge,
            y: originalY + Math.sin(angle) * lunge,
            duration: 65,
            yoyo: true,
            ease: "Quad.Out",
        });

        // ตรวจศัตรูที่อยู่ในระยะและมุมการฟัน
        for (const enemy of this.enemies) {
            if (!enemy.state.alive) continue;

            const distance = Phaser.Math.Distance.Between(
                originalX,
                originalY,
                enemy.state.x,
                enemy.state.y
            );

            if (distance > range) continue;

            const enemyAngle = Phaser.Math.Angle.Between(
                originalX,
                originalY,
                enemy.state.x,
                enemy.state.y
            );

            const angleDifference = Math.abs(
                Phaser.Math.Angle.Wrap(enemyAngle - angle)
            );

            if (angleDifference > this.warriorArc / 2) {
                continue;
            }

            
            this.playHitEffect(
                enemy.state.x,
                enemy.state.y,
                this.swordElement === "fire"
                    ? 0xff5a1f
                    : 0xffe29a
            );

            this.damageEnemy(enemy, this.warriorDamage);

            // 🔥 ดาบไฟทำให้ศัตรูติด Burn 3 วินาที
            if (
                this.swordElement === "fire" &&
                enemy.state.alive
            ) {
                enemy.state.burnTimer = 3000;
                enemy.state.burnTickTimer = 500;
            }

        }
    }


    private chargedSlash(angle: number) {


        // ตรวจสอบว่าความเหนื่อยเพียงพอสำหรับใช้สกิลหรือไม่
        const staminaCost = Math.max(
            10,
            30 - this.warriorStaminaEfficiencyLevel * 5
        );

        if (this.warriorStamina < staminaCost) {
            this.showMessage("NOT ENOUGH STAMINA!");

            this.slashChargeTime = 0;
            return;
        }

        // หักความเหนื่อยเมื่อใช้สกิล
        this.warriorStamina -= staminaCost;


        // คำนวณพลังจากเวลาที่ชาร์จ ตั้งแต่ 0 ถึง 1
        const chargeRatio = Phaser.Math.Clamp(
            this.slashChargeTime / this.maxSlashChargeTime,
            0,
            1
        );

        // ดาเมจเพิ่มตามระดับสกิลและเวลาชาร์จ
        const damage = Math.round(
            this.warriorDamage *
            (1.5 + chargeRatio + this.chargedSlashLevel * 0.25)
        );

        // ระยะโจมตีเพิ่มตามเวลาชาร์จ
        const range = this.warriorRange + 35 + chargeRatio * 45;

        // วงฟันกว้างกว่าการโจมตีปกติ
        const arc = Math.PI * 0.9;
        const startAngle = angle - arc / 2;
        const endAngle = angle + arc / 2;

        // เลือกสีตามธาตุดาบ
        const isFire = this.swordElement === "fire";
        const slashColor = isFire ? 0xff5a1f : 0x70eaff;
        const slashHighlight = isFire ? 0xffc247 : 0xffffff;

        // วาดคลื่นดาบ
        const slash = this.add.graphics().setDepth(15);

        slash.lineStyle(12, slashColor, 0.9);

        slash.beginPath();
        slash.arc(
            this.player.x,
            this.player.y,
            range,
            startAngle,
            endAngle,
            false
        );
        slash.strokePath();

        slash.lineStyle(4, slashHighlight, 1);
        slash.beginPath();
        slash.arc(
            this.player.x,
            this.player.y,
            range - 8,
            startAngle,
            endAngle,
            false
        );
        slash.strokePath();

        this.tweens.add({
            targets: slash,
            alpha: 0,
            scale: 1.15,
            duration: 300,
            onComplete: () => slash.destroy(),
        });

        // ตรวจศัตรูที่อยู่ในระยะและมุมของคลื่นดาบ
        const originX = this.player.x;
        const originY = this.player.y;

        for (const enemy of this.enemies) {
            if (!enemy.state.alive) continue;

            const distance = Phaser.Math.Distance.Between(
                originX,
                originY,
                enemy.state.x,
                enemy.state.y
            );

            if (distance > range) continue;

            const enemyAngle = Phaser.Math.Angle.Between(
                originX,
                originY,
                enemy.state.x,
                enemy.state.y
            );

            const angleDifference = Math.abs(
                Phaser.Math.Angle.Wrap(enemyAngle - angle)
            );

            if (angleDifference > arc / 2) continue;

            this.playHitEffect(
                enemy.state.x,
                enemy.state.y,
                isFire ? 0xff5a1f : 0x70eaff
            );

            this.damageEnemy(enemy, damage);

            // 🔥 ดาบไฟทำให้ศัตรูติด Burn นาน 3 วินาที
            if (isFire && enemy.state.alive) {
                enemy.state.burnTimer = 3000;
                enemy.state.burnTickTimer = 500;
            }
        }


       this.showMessage(
            `${isFire ? "🔥 FIRE CHARGED SLASH" : "CHARGED SLASH"}! ${damage} DAMAGE`
        );
    }
    
    private mageAttack(angle: number) {
        const startX = this.player.x;
        const startY = this.player.y;

        // วงแสงชาร์จพลังที่ตัวละคร
        const charge = this.add.circle(
            startX,
            startY,
            9,
            0x55bbff,
            0.45
        ).setStrokeStyle(2, 0xc5f2ff, 1).setDepth(9);

        this.tweens.add({
            targets: charge,
            scale: 1.8,
            alpha: 0,
            duration: 180,
            onComplete: () => charge.destroy(),
        });

        // แสงแฟลชตรงจุดปล่อยเวท
        const originX = startX + Math.cos(angle) * 15;
        const originY = startY + Math.sin(angle) * 15;

        const flash = this.add.circle(
            originX,
            originY,
            5,
            0xffffff,
            1
        ).setDepth(11);

        this.tweens.add({
            targets: flash,
            scale: 2.5,
            alpha: 0,
            duration: 120,
            onComplete: () => flash.destroy(),
        });

        // กระสุนเวท
        const projectile = this.add.circle(
            originX,
            originY,
            6,
            0x8bd5ff
        ).setStrokeStyle(2, 0xe3f8ff, 1).setDepth(8);

        const speed = this.mageProjectileSpeed;

        this.projectiles.push({
            sprite: projectile,
            x: originX,
            y: originY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage: this.mageDamage,
            traveled: 0,
            maxDistance: this.mageProjectileRange,
            hitEnemyIds: new Set<number>(),
        });
    }


    // 🔥 ปล่อยคลื่นเพลิงไปยังตำแหน่งเมาส์
    private castFireWave(angle: number) {
        if (this.isDead || this.isDying) {
            return;
        }

        const speed = 320;
        const startX = this.player.x + Math.cos(angle) * 28;
        const startY = this.player.y + Math.sin(angle) * 28;

        const sprite = this.add.circle(
            startX,
            startY,
            14,
            0xff5a1f,
            0.95
        );

        sprite.setStrokeStyle(3, 0xffc247, 1);
        sprite.setDepth(10);

        this.fireWaves.push({
            sprite: sprite as unknown as Phaser.GameObjects.Arc,
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            traveled: 0,
            maxDistance: 360,
            damage: this.warriorDamage,
            hitEnemyIds: new Set<number>(),
        });
 
        this.showMessage("🔥 คลื่นเพลิง!");
    }

    private damageEnemy(enemy: EnemyEntity, damage: number) {
        if (!enemy.state.alive) return;

        enemy.state.hp = Math.max(0, enemy.state.hp - damage);

        this.showDamageNumber(
            enemy.state.x,
            enemy.state.y - 22,
            damage,
            "#ffe29a"
        );

        enemy.sprite.setAlpha(0.45);

        this.time.delayedCall(90, () => {
            if (enemy.sprite.active && enemy.state.alive) {
                enemy.sprite.setAlpha(1);
            }
        });

        this.updateEnemyHealthBar(enemy);

        if (enemy.state.hp <= 0) {
            this.killEnemy(enemy);
        }
    }


    private updateProjectiles(delta: number) {
        const seconds = delta / 1000;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            const moveX = projectile.vx * seconds;
            const moveY = projectile.vy * seconds;

            projectile.x += moveX;
            projectile.y += moveY;

            projectile.traveled += Math.hypot(moveX, moveY);

            projectile.sprite.setPosition(
                projectile.x,
                projectile.y
            );


            const trail = this.add.circle(
                projectile.x,
                projectile.y,
                3,
                0x8bd5ff,
                0.55
            ).setDepth(7);

            this.tweens.add({
                targets: trail,
                scale: 0,
                alpha: 0,
                duration: 180,
                onComplete: () => trail.destroy(),
            });


            let hit = false;

            for (const enemy of this.enemies) {
                if (!enemy.state.alive) continue;

                if (projectile.hitEnemyIds.has(enemy.state.id)) {
                    continue;
                }

                const distance = Phaser.Math.Distance.Between(
                    projectile.x,
                    projectile.y,
                    enemy.state.x,
                    enemy.state.y
                );

                                
                if (distance <= 16) {
                    projectile.hitEnemyIds.add(enemy.state.id);

                    
                    this.playHitEffect(
                        enemy.state.x,
                        enemy.state.y,
                        this.swordElement === "fire" ? 0xff5a1f : 0xffe29a
                    );

                    this.damageEnemy(enemy, this.warriorDamage);

                    // 🔥 เปิดโหมดดาบไฟแล้วฟันโดน จะทำให้ศัตรูติด Burn
                    if (this.swordElement === "fire" && enemy.state.alive) {
                        enemy.state.burnTimer = 3000;
                        enemy.state.burnTickTimer = 500;
                    }


                    hit = true;
                    break;
                }

            }

            const outsideRoom =
                projectile.x < 0 ||
                projectile.x > this.roomWidth ||
                projectile.y < 0 ||
                projectile.y > this.roomHeight;

            if (
                hit ||
                outsideRoom ||
                projectile.traveled >= projectile.maxDistance
            ) {
                projectile.sprite.destroy();
                this.projectiles.splice(i, 1);
            }
        }
    }


    // 🔥 อัปเดตคลื่นเพลิง เคลื่อนที่ ชนศัตรู และทำให้ติดไฟ
    private updateFireWaves(delta: number) {
        const seconds = delta / 1000;

        for (let i = this.fireWaves.length - 1; i >= 0; i--) {
            const wave = this.fireWaves[i];

            const moveX = wave.vx * seconds;
            const moveY = wave.vy * seconds;

            wave.x += moveX;
            wave.y += moveY;
            wave.traveled += Math.hypot(moveX, moveY);

            wave.sprite.setPosition(wave.x, wave.y);

            // สร้างประกายไฟตามทางที่คลื่นเคลื่อนที่
            const trail = this.add.circle(
                wave.x,
                wave.y,
                Phaser.Math.Between(3, 6),
                0xff8c32,
                0.8
            ).setDepth(9);

            this.tweens.add({
                targets: trail,
                scale: 0,
                alpha: 0,
                duration: 250,
                onComplete: () => trail.destroy(),
            });

            // คลื่นไฟโดนศัตรูได้หลายตัว แต่ไม่ทำดาเมจซ้ำตัวเดิม
            for (const enemy of this.enemies) {
                const state = enemy.state;

                if (!state.alive || wave.hitEnemyIds.has(state.id)) {
                    continue;
                }

                const distance = Phaser.Math.Distance.Between(
                    wave.x,
                    wave.y,
                    state.x,
                    state.y
                );

                if (distance <= 28) {
                    wave.hitEnemyIds.add(state.id);

                    this.playHitEffect(
                        state.x,
                        state.y,
                        0xff6b24
                    );

                    this.damageEnemy(enemy, wave.damage);

                    // ติดไฟ 3 วินาที
                    if (state.alive) {
                        state.burnTimer = 3000;
                        state.burnTickTimer = 500;
                    }
                }
            }

            const outsideRoom =
                wave.x < 0 ||
                wave.x > this.roomWidth ||
                wave.y < 0 ||
                wave.y > this.roomHeight;

            if (
                outsideRoom ||
                wave.traveled >= wave.maxDistance
            ) {
                wave.sprite.destroy();
                this.fireWaves.splice(i, 1);
            }
        }
    }




    private updateEnemies(delta: number) {
        const speed = 55;

        for (const enemy of this.enemies) {
            const state = enemy.state;

            if (!state.alive) {
                continue;
            }


            // 🔥 ระบบ Burn: ศัตรูติดไฟและเสียเลือดต่อเนื่อง
            if (state.burnTimer > 0) {
                state.burnTimer -= delta;
                state.burnTickTimer -= delta;

                // สร้างความเสียหายจากไฟทุก ๆ 500 มิลลิวินาที
                while (
                    state.burnTickTimer <= 0 &&
                    state.burnTimer > 0 &&
                    state.alive
                ) {
                    state.burnTickTimer += 500;
                    this.damageEnemy(enemy, 4);
                }

                // หยุดสถานะติดไฟเมื่อหมดเวลา
                if (state.burnTimer <= 0) {
                    state.burnTimer = 0;
                    state.burnTickTimer = 0;
                }
            }

            // หากศัตรูตายจากไฟ ไม่ต้องให้เดินหรือโจมตีต่อ
            if (!state.alive) {
                continue;
            }


            state.attackCooldown = Math.max(
                0,
                state.attackCooldown - delta
            );

            const distance = Phaser.Math.Distance.Between(
                state.x,
                state.y,
                this.player.x,
                this.player.y
            );

            if (distance > 30) {
                const direction = new Phaser.Math.Vector2(
                    this.player.x - state.x,
                    this.player.y - state.y
                ).normalize();

                const amountX = direction.x * speed * delta / 1000;
                const amountY = direction.y * speed * delta / 1000;

                this.moveEnemyWithWallCollision(enemy, amountX, amountY);
            } else if (
                state.attackCooldown <= 0 &&
                this.invulnerableTimer <= 0
            ) {
                this.damagePlayer(state.damage);
                state.attackCooldown = 1000;
            }

            enemy.sprite.setPosition(state.x, state.y);
            this.updateEnemyHealthBar(enemy);
        }
    }

    private moveEnemyWithWallCollision(
        enemy: EnemyEntity,
        amountX: number,
        amountY: number
    ) {
        const state = enemy.state;
        const radius = 10;

        const boundsX = new Phaser.Geom.Rectangle(
            state.x + amountX - radius,
            state.y - radius,
            radius * 2,
            radius * 2
        );

        if (!this.walls.some((wall) =>
            Phaser.Geom.Intersects.RectangleToRectangle(boundsX, wall)
        )) {
            state.x += amountX;
        }

        const boundsY = new Phaser.Geom.Rectangle(
            state.x - radius,
            state.y + amountY - radius,
            radius * 2,
            radius * 2
        );

        if (!this.walls.some((wall) =>
            Phaser.Geom.Intersects.RectangleToRectangle(boundsY, wall)
        )) {
            state.y += amountY;
        }

        state.x = Phaser.Math.Clamp(state.x, 30, 770);
        state.y = Phaser.Math.Clamp(state.y, 30, 470);
    }

    private damagePlayer(amount: number) {
        if (this.invulnerableTimer > 0 || this.isDead) {
            return;
        }

        this.playerHp = Math.max(0, this.playerHp - amount);
        this.invulnerableTimer = 650;

        this.showDamageNumber(
            this.player.x,
            this.player.y - 25,
            amount,
            "#ff7777"
        );

        this.player.setAlpha(0.35);

        this.time.delayedCall(180, () => {
            if (this.player.active && !this.isDead) {
                this.player.setAlpha(1);
            }
        });

        if (this.playerHp <= 0) {
            this.handlePlayerDeath();
        }
    }

    private handlePlayerDeath() {
        if (this.isDying || this.isDead) {
            return;
        }

        this.isDying = true;
        this.combatMessage.setText("YOU HAVE FALLEN");

        this.helpText.setText("PRESS R TO RETRY");

        if (this.input.keyboard) {
            this.input.keyboard.once("keydown-R", () => {
                this.scene.restart();
            });
        }

        this.time.delayedCall(500, () => {
            this.isDead = true;
            this.isDying = false;
        });
    }

    private createEnemyStates(count: number): EnemyState[] {
        const states: EnemyState[] = [];

        for (let i = 0; i < count; i++) {
            states.push({
                id: this.enemyId++,
                x: Phaser.Math.Between(170, 630),
                y: Phaser.Math.Between(140, 390),
                hp: 50,
                maxHp: 50,
                damage: 8,
                attackCooldown: Phaser.Math.Between(300, 900),
                alive: true,

                //BURN
                burnTimer: 0,
                burnTickTimer: 0,
            });
        }

        return states;
    }

    private spawnEnemyVisuals(room: DungeonRoom) {
        this.clearEnemyVisuals();

        for (const state of room.enemies) {
            if (!state.alive) {
                continue;
            }

            const sprite = this.add.container(state.x, state.y);

            const body = this.add.rectangle(0, 2, 18, 20, 0x9b4646);
            const head = this.add.rectangle(0, -9, 12, 12, 0xd76c62);

            const eyes = this.add.rectangle(0, -9, 6, 3, 0x24151b);

            sprite.add([body, head, eyes]);
            sprite.setDepth(4);

            const hpBar = this.add.graphics().setDepth(6);

            const enemy: EnemyEntity = {
                state,
                sprite,
                hpBar,
            };

            this.enemies.push(enemy);
            this.updateEnemyHealthBar(enemy);
        }
    }

    private clearEnemyVisuals() {
        for (const enemy of this.enemies) {
            enemy.sprite.destroy();
            enemy.hpBar.destroy();
        }

        this.enemies = [];
    }

    private updateEnemyHealthBar(enemy: EnemyEntity) {
        const { state, hpBar } = enemy;

        hpBar.clear();

        const width = 28;
        const height = 4;
        const x = state.x - width / 2;
        const y = state.y - 24;
        const ratio = Phaser.Math.Clamp(state.hp / state.maxHp, 0, 1);

        hpBar.fillStyle(0x24151b, 1);
        hpBar.fillRect(x, y, width, height);

        hpBar.fillStyle(0xe85c64, 1);
        hpBar.fillRect(x, y, width * ratio, height);
    }

    private killEnemy(enemy: EnemyEntity) {
        if (!enemy.state.alive) {
            return;
        }

        enemy.state.alive = false;
        enemy.sprite.destroy();
        enemy.hpBar.destroy();

        this.gainXp(10);

        this.showMessage("ENEMY DEFEATED");

        const room = this.rooms.get(this.currentRoomId);

        if (
            room &&
            room.enemies.every((state) => !state.alive)
        ) {
            this.clearCurrentRoom();
        }
    }

    private showDamageNumber(
        x: number,
        y: number,
        amount: number,
        color: string
    ) {
        const text = this.add.text(x, y, `-${amount}`, {
            fontSize: "14px",
            color,
            fontStyle: "bold",
            stroke: "#090b12",
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(30);

        this.tweens.add({
            targets: text,
            y: y - 24,
            alpha: 0,
            duration: 550,
            onComplete: () => text.destroy(),
        });
    }


    private playHitEffect(
        x: number,
        y: number,
        color: number
    ) {
        // วงแสงกระแทกเมื่อโจมตีโดน
        const flash = this.add.circle(
            x,
            y,
            5,
            color,
            0.95
        ).setDepth(15);

        this.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            duration: 180,
            onComplete: () => flash.destroy(),
        });

        // ประกายแสงกระจายออกจากจุดที่โดน
        const sparks = this.add.graphics().setDepth(15);

        sparks.lineStyle(2, color, 1);

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const startX = x + Math.cos(angle) * 5;
            const startY = y + Math.sin(angle) * 5;
            const endX = x + Math.cos(angle) * 17;
            const endY = y + Math.sin(angle) * 17;

            sparks.beginPath();
            sparks.moveTo(startX, startY);
            sparks.lineTo(endX, endY);
            sparks.strokePath();
        }

        this.tweens.add({
            targets: sparks,
            alpha: 0,
            duration: 160,
            onComplete: () => sparks.destroy(),
        });
    }


    private showMessage(message: string) {
        this.combatMessage.setText(message);

        this.time.delayedCall(900, () => {
            if (this.combatMessage.active) {
                this.combatMessage.setText("");
            }
        });
    }


    private getXpRequired(level: number): number {
        // XP ที่ต้องใช้เพิ่มขึ้นตามเลเวล
        return level * 30;
    }

    private gainXp(amount: number) {
        this.playerXp += amount;

        // เลเวลอัปได้หลายครั้ง หากได้รับ XP มากพอ
        while (this.playerXp >= this.xpToNextLevel) {
            this.playerXp -= this.xpToNextLevel;
            this.playerLevel++;

            this.xpToNextLevel = this.getXpRequired(
                this.playerLevel
            );

            this.showMessage(
                `LEVEL UP! LEVEL ${this.playerLevel}`
            );

            if (
                this.playerLevel % 3 === 0 &&
                this.playerLevel >= 3
            ) {
                this.upgradeChoicesMade++;
                this.isChoosingUpgrade = true;
                this.showUpgradeChoices();
            }
        }

        this.updatePlayerUI();
    }

        
    private showUpgradeChoices() {
        if (this.upgradePanel) {
            this.upgradePanel.destroy();
        }

        this.upgradeButtons = [];

        const panel = this.add.container(400, 250)
            .setDepth(100)
            .setScrollFactor(0);

        this.upgradePanel = panel;

        // พื้นหลังหน้าต่าง
        const background = this.add.rectangle(
            0, 0, 660, 300, 0x111522, 0.97
        );

        background.setStrokeStyle(2, 0xe8c27a);

        const title = this.add.text(
            0, -120, `WARRIOR LEVEL ${this.playerLevel}`,
            {
                fontSize: "24px",
                color: "#e8c27a",
                fontStyle: "bold",
            }
        ).setOrigin(0.5);

        const subtitle = this.add.text(
            0, -85, "เลือกอัปเกรด 1 อย่าง",
            {
                fontSize: "15px",
                color: "#ffffff",
            }
        ).setOrigin(0.5);

        panel.add([background, title, subtitle]);

        const upgrades = [
            {
                id: "sword",
                name: "ดาบทรงพลัง",
                description: "เพิ่มระยะการฟันดาบ",
            },
            {
                id: "damage",
                name: "พลังโจมตี",
                description: "เพิ่มความเสียหายของดาบ",
            },
            {
                id: "charged",
                name: this.hasChargedSlash
                    ? "ชาร์จฟันวงกว้าง"
                    : "ปลดล็อกชาร์จฟัน",
                description: this.hasChargedSlash
                    ? "พัฒนาความสามารถสกิลชาร์จ"
                    : "ปลดล็อกสกิลโจมตีแบบชาร์จ",
            },
        ] as const;

        upgrades.forEach((upgrade, index) => {
            const x = (index - 1) * 210;

            const button = this.add.container(x, 25);

            const card = this.add.rectangle(
                0, 0, 190, 135, 0x252d40
            ).setInteractive({ useHandCursor: true });

            card.setStrokeStyle(1, 0x8f9bb3);

            const name = this.add.text(
                0, -35, upgrade.name,
                {
                    fontSize: "17px",
                    color: "#ffe29a",
                    fontStyle: "bold",
                    align: "center",
                    wordWrap: { width: 170 },
                }
            ).setOrigin(0.5);

            const description = this.add.text(
                0, 15, upgrade.description,
                {
                    fontSize: "13px",
                    color: "#ffffff",
                    align: "center",
                    wordWrap: { width: 165 },
                }
            ).setOrigin(0.5);

            button.add([card, name, description]);
            panel.add(button);
            this.upgradeButtons.push(button);

            card.on("pointerover", () => {
                card.setFillStyle(0x3b4964);
            });

            card.on("pointerout", () => {
                card.setFillStyle(0x252d40);
            });

            card.on("pointerdown", () => {
                this.chooseUpgrade(upgrade.id);
            });
        });
    }

    private chooseUpgrade(
        upgrade: "sword" | "damage" | "charged"
    ) {
        if (!this.isChoosingUpgrade) {
            return;
        }

        switch (upgrade) {
            case "sword":
                this.warriorRange += 10;
                this.showMessage("SWORD RANGE UP!");
                break;

            case "damage":
                this.warriorDamage += 5;
                this.warriorDamageLevel++;
                this.showMessage("WARRIOR DAMAGE UP!");
                break;

            case "charged":
                if (!this.hasChargedSlash) {
                    this.hasChargedSlash = true;
                    this.showMessage("CHARGED SLASH UNLOCKED!");
                } else {
                    this.chargedSlashLevel++;
                    this.warriorDamage += 3;
                    this.showMessage("CHARGED SLASH UPGRADED!");
                }
                break;
        }

        this.isChoosingUpgrade = false;

        this.upgradePanel?.destroy();
        this.upgradePanel = undefined;
        this.upgradeButtons = [];

        this.updatePlayerUI();
    }


    
    private updatePlayerUI() {
        const ratio = this.playerHp / this.playerMaxHp;

        // ตำแหน่งแถบเลือดมุมขวาบน
        const barWidth = 150;
        const barHeight = 12;
        const marginRight = 16;
        const barX = 800 - marginRight - barWidth;
        const barY = 82;

        this.playerHpBar.clear();

        // พื้นหลังแถบเลือด
        this.playerHpBar.fillStyle(0x24151b, 1);
        this.playerHpBar.fillRect(
            barX,
            barY,
            barWidth,
            barHeight
        );

        // สีเลือด: เขียวเมื่อเลือดมากกว่า 30% และแดงเมื่อเลือดต่ำ
        this.playerHpBar.fillStyle(
            ratio > 0.3 ? 0x6eaf78 : 0xe85c64,
            1
        );
        this.playerHpBar.fillRect(
            barX,
            barY,
            barWidth * ratio,
            barHeight
        );

        // ตัวเลขเลือดชิดขวา
        this.playerHpText.setText(
            `HP: ${this.playerHp} / ${this.playerMaxHp}`
        );

        this.playerHpText.setPosition(
            800 - marginRight - barWidth,
            barY - 22
        );

        this.playerXpText.setText(`XP: ${this.playerXp}`);


        // แสดงหลอด Stamina ของ Warrior
        this.warriorStaminaBar.clear();

        if (this.playerClass === "warrior") {
            const staminaRatio = Phaser.Math.Clamp(
                this.warriorStamina / this.warriorMaxStamina,
                0,
                1
            );

            const staminaBarWidth = 150;
            const staminaBarHeight = 8;
            const staminaBarX = 800 - 16 - staminaBarWidth;
            const staminaBarY = 112;

            // พื้นหลังหลอด
            this.warriorStaminaBar.fillStyle(0x241f15, 1);
            this.warriorStaminaBar.fillRect(
                staminaBarX,
                staminaBarY,
                staminaBarWidth,
                staminaBarHeight
            );

            // แถบความเหนื่อยสีทอง
            this.warriorStaminaBar.fillStyle(0xe5a33d, 1);
            this.warriorStaminaBar.fillRect(
                staminaBarX,
                staminaBarY,
                staminaBarWidth * staminaRatio,
                staminaBarHeight
            );

            this.playerXpText.setText(
                `LV ${this.playerLevel} | XP: ${this.playerXp} | STA: ${Math.floor(this.warriorStamina)} / ${this.warriorMaxStamina}`
            );
        }

    }


    private generateExitDoors(room: DungeonRoom, exclude?: Side) {
        const sides: Side[] = ["top", "bottom", "left", "right"];

        const candidates = Phaser.Utils.Array.Shuffle(
            sides.filter((side) => side !== exclude)
        );

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

    private clearCurrentRoom() {
        const room = this.rooms.get(this.currentRoomId);

        if (!room || room.cleared) {
            return;
        }

        room.cleared = true;
        room.chestSpawned = true;

        for (const door of room.doors.values()) {
            door.locked = false;
        }

        this.showMessage("ROOM CLEARED");
        this.renderRoom();
    }

    private tryEnterDoor() {
        const room = this.rooms.get(this.currentRoomId);

        if (!room || this.isDead) {
            return;
        }

        const x = this.player.x;
        const y = this.player.y;
        const centerX = this.roomWidth / 2;
        const centerY = this.roomHeight / 2;

        let side: Side | null = null;

        if (y <= 25 && Math.abs(x - centerX) < this.doorWidth / 2) {
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

        if (!door || door.locked) return;

        if (door.targetId !== null) {
            const opposite: Record<Side, Side> = {
                top: "bottom",
                bottom: "top",
                left: "right",
                right: "left",
            };

            this.enterRoom(door.targetId, opposite[side]);
            return;
        }

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
        const returnSide = opposite[exitDoor.side];

        const newRoom: DungeonRoom = {
            id: newId,
            type: "normal",
            doors: new Map(),
            cleared: false,
            enemies: this.createEnemyStates(Phaser.Math.Between(3, 4)),
            chestSpawned: false,
            chestOpened: false,
        };

        newRoom.doors.set(returnSide, {
            side: returnSide,
            targetId: fromRoom.id,
            locked: true,
            isReturn: true,
        });

        this.generateExitDoors(newRoom, returnSide);
        exitDoor.targetId = newId;

        this.rooms.set(newId, newRoom);
        this.enterRoom(newId, returnSide);
    }

    
    private enterRoom(roomId: number, enteredFrom: Side) {
        this.currentRoomId = roomId;

        // enteredFrom คือด้านประตูที่ผู้เล่นเข้ามาในห้องปลายทาง
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
        for (let y = 0; y < this.roomHeight; y += 40) {
            for (let x = 0; x < this.roomWidth; x += 40) {
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

        // วาดกำแพงจริง เฉพาะด้านที่มีประตูจึงเว้นช่อง
        this.drawWallSide(room, "top");
        this.drawWallSide(room, "bottom");
        this.drawWallSide(room, "left");
        this.drawWallSide(room, "right");

        for (const door of room.doors.values()) {
            this.drawDoor(door);
        }

        this.roomTitle.setText(
            room.type === "boss"
                ? `BOSS ROOM #${room.id}`
                : `THE FORGOTTEN SANCTUM · ROOM ${room.id}`
        );

        const aliveCount = room.enemies.filter(
            (enemy) => enemy.alive
        ).length;

        this.roomInfo.setText([
            `Room: ${room.id}`,
            `Status: ${room.cleared ? "CLEARED" : "IN COMBAT"}`,
            `Enemies: ${aliveCount}`,
            `Doors: ${room.doors.size}`,
        ]);

        this.helpText.setText(
            "MOVE: WASD / ARROWS   |   CLICK: ATTACK   |   SHIFT: DODGE"
        );

        this.spawnEnemyVisuals(room);
        this.renderChest(room);
        this.updatePlayerUI();
    }

    

    // แสดงหีบสมบัติเมื่อห้องถูกเคลียร์แล้ว
    private renderChest(room: DungeonRoom) {
        // ลบภาพหีบและข้อความเก่าก่อน ป้องกันการสร้างซ้ำ
        this.chestVisual?.destroy();
        this.chestVisual = undefined;
        this.chestPrompt?.destroy();
        this.chestPrompt = undefined;
        // ยังไม่มีหีบ หรือเปิดหีบไปแล้ว ไม่ต้องแสดง
        if (!room.chestSpawned || room.chestOpened) {
            return;
        }
        // วางหีบไว้บริเวณกลางห้อง
        const chestX = 400;
        const chestY = 250;
        const chest = this.add.container(chestX, chestY);
        // ตัวหีบ
        const body = this.add.rectangle(
            0, 5, 34, 24, 0x9b5b2e
        ).setStrokeStyle(2, 0x4b2a16);
        // ฝาหีบ
        const lid = this.add.rectangle(
            0, -8, 38, 10, 0xd49a45
        ).setStrokeStyle(2, 0x4b2a16);
        // ตัวล็อกสีทอง
        const lock = this.add.rectangle(
            0, 5, 6, 9, 0xffdf70
        ).setStrokeStyle(1, 0x6b481b);
        chest.add([body, lid, lock]);
        chest.setDepth(8);
        this.chestVisual = chest;
        // ข้อความจะแสดงเมื่อผู้เล่นเข้าใกล้หีบ
        this.chestPrompt = this.add.text(
            chestX,
            chestY - 30,
            "กด E เพื่อเปิดหีบ",
            {
                fontSize: "12px",
                color: "#ffe7a3",
                backgroundColor: "#38251acc",
                padding: { x: 6, y: 4 },
            }
        ).setOrigin(0.5).setDepth(20);
        this.chestPrompt.setVisible(false);
    }


    private updateChestPrompt() {
        const room = this.rooms.get(this.currentRoomId);

        if (!room || !room.chestSpawned || room.chestOpened) {
            this.chestPrompt?.setVisible(false);
            return;
        }

        if (!this.chestVisual || !this.chestPrompt) {
            return;
        }

        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.chestVisual.x,
            this.chestVisual.y
        );

        this.chestPrompt.setVisible(distance <= 55);
    }



    private tryOpenChest() {
        const room = this.rooms.get(this.currentRoomId);

        // ไม่มีหีบ หรือเปิดรับรางวัลไปแล้ว
        if (
            !room ||
            !room.chestSpawned ||
            room.chestOpened ||
            !this.chestVisual
        ) {
            return;
        }

        // ตรวจสอบระยะห่างระหว่างผู้เล่นกับหีบ
        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.chestVisual.x,
            this.chestVisual.y
        );

        if (distance > 55) {
            this.showMessage("TOO FAR FROM CHEST");
            return;
        }

        // บันทึกสถานะก่อนให้รางวัล เพื่อป้องกันการรับซ้ำ
        room.chestOpened = true;

        // ลบภาพหีบและข้อความ
        this.chestVisual.destroy();
        this.chestVisual = undefined;

        this.chestPrompt?.destroy();
        this.chestPrompt = undefined;

        // มอบ XP โบนัส
        this.playerXp += 25;
        this.updatePlayerUI();

        this.showMessage("CHEST OPENED! +25 XP");
    }


    private drawWallSide(room: DungeonRoom, side: Side) {
        const wall = this.wallThickness;
        const halfDoor = this.doorWidth / 2;
        const cx = this.roomWidth / 2;
        const cy = this.roomHeight / 2;

        // ถ้าไม่มีประตู ให้ปิดกำแพงเต็มด้าน
        if (!room.doors.has(side)) {
            switch (side) {
                case "top":
                    this.addWall(0, 0, this.roomWidth, wall);
                    break;
                case "bottom":
                    this.addWall(0, 480, this.roomWidth, wall);
                    break;
                case "left":
                    this.addWall(0, 0, wall, this.roomHeight);
                    break;
                case "right":
                    this.addWall(780, 0, wall, this.roomHeight);
                    break;
            }

            return;
        }

        // ถ้ามีประตู ให้เว้นช่องตรงกลาง
        switch (side) {
            case "top":
                this.addWall(0, 0, cx - halfDoor, wall);
                this.addWall(cx + halfDoor, 0, cx - halfDoor, wall);
                break;
            case "bottom":
                this.addWall(0, 480, cx - halfDoor, wall);
                this.addWall(cx + halfDoor, 480, cx - halfDoor, wall);
                break;
            case "left":
                this.addWall(0, 0, wall, cy - halfDoor);
                this.addWall(0, cy + halfDoor, wall, cy - halfDoor);
                break;
            case "right":
                this.addWall(780, 0, wall, cy - halfDoor);
                this.addWall(780, cy + halfDoor, wall, cy - halfDoor);
                break;
        }
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
