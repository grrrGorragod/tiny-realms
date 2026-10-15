
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
};


type PlayerClass = "warrior" | "mage";

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

    private walls: Phaser.Geom.Rectangle[] = [];
    private rooms = new Map<number, DungeonRoom>();
    private currentRoomId = 1;
    private nextRoomId = 2;

    private enemies: EnemyEntity[] = [];


    private playerClass: PlayerClass = "warrior";
    private projectiles: ProjectileEntity[] = [];

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
    private combatMessage!: Phaser.GameObjects.Text;

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

        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as typeof this.wasd;

        this.dodgeKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SHIFT
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

        this.playerHpText = this.add.text(16, 105, "", {
            fontSize: "12px",
            color: "#f0d7a0",
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
            if (pointer.leftButtonDown()) {
                this.attack(pointer.x, pointer.y);
            }
        });


        const firstRoom: DungeonRoom = {
            id: 1,
            type: "normal",
            doors: new Map(),
            cleared: false,
            enemies: this.createEnemyStates(3),
        };

        this.rooms.set(firstRoom.id, firstRoom);
        this.generateExitDoors(firstRoom);
        this.renderRoom();
    }

    update(_time: number, delta: number) {
        if (this.isDead) {
            return;
        }

        this.attackTimer = Math.max(0, this.attackTimer - delta);
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

        this.updateProjectiles(delta);


        this.updateEnemies(delta);
        this.updatePlayerUI();
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

        slash.lineStyle(7, 0xffe29a, 0.9);
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
                0xffe29a
            );

            this.damageEnemy(enemy, this.warriorDamage);
        }
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
                        0x8bd5ff
                    );

                    this.damageEnemy(enemy, projectile.damage);
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



    private updateEnemies(delta: number) {
        const speed = 55;

        for (const enemy of this.enemies) {
            const state = enemy.state;

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
            this.enterRoom(door.targetId, side);
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
        this.updatePlayerUI();
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
