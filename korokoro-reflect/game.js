class KorokoroReflect {
    constructor() {
        this.RESIZE_THRESHOLD = 4;
        this.ROTATION_INCREMENT = Math.PI / 12;
        this.STUCK_MIN_SPEED = 0.08;
        this.STUCK_CHECK_HEIGHT_RATIO = 0.68;
        this.STUCK_MAX_FRAMES = 140;
        this.BLOCK_WIDTH = 96;
        this.BLOCK_HEIGHT = 18;
        this.BLOCK_MOVE_MARGIN = 20;
        this.STAGE_BASE_WIDTH = 320;
        this.STAGE_BASE_HEIGHT = 420;

        this.stageText = document.getElementById('stageText');
        this.starText = document.getElementById('starText');
        this.stateText = document.getElementById('stateText');
        this.messageText = document.getElementById('messageText');
        this.stockText = document.getElementById('stockText');

        this.playArea = document.getElementById('playArea');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.rotateBtn = document.getElementById('rotateBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.selectRectBtn = document.getElementById('selectRectBtn');

        this.Matter = window.Matter;
        this.engine = this.Matter.Engine.create();
        this.engine.gravity.y = 0;
        this.runner = this.Matter.Runner.create();

        this.render = null;
        this.world = this.engine.world;
        this.stageIndex = 0;
        this.clearCount = 0;
        this.selectedTool = 'rect';
        this.selectedBlock = null;
        this.placedBlocks = [];
        this.fixedBodies = [];
        this.goalSensor = null;
        this.spawnGuide = null;
        this.ball = null;
        this.isStarted = false;
        this.isPaused = false;
        this.isCleared = false;
        this.draggingBlock = null;
        this.stuckFrames = 0;
        this.rafId = null;

        this.stages = [
            // obstacle angle values are radians
            {
                spawn: { x: 70, y: 36 },
                goal: { x: 270, y: 390, r: 24 },
                maxBlocks: 1,
                obstacles: []
            },
            {
                spawn: { x: 250, y: 40 },
                goal: { x: 66, y: 390, r: 24 },
                maxBlocks: 2,
                obstacles: [
                    { type: 'rect', x: 160, y: 210, w: 110, h: 16, angle: -0.2 }
                ]
            },
            {
                spawn: { x: 80, y: 38 },
                goal: { x: 250, y: 360, r: 24 },
                maxBlocks: 2,
                obstacles: [
                    { type: 'rect', x: 110, y: 230, w: 90, h: 16, angle: 0.36 },
                    { type: 'rect', x: 220, y: 170, w: 84, h: 16, angle: -0.28 }
                ]
            }
        ];

        this._initRenderer();
        this._bindEvents();
        this._registerCollision();
        this._loadStage(0);

        this.Matter.Runner.run(this.runner, this.engine);
        this._tick();
    }

    _initRenderer() {
        const width = this.playArea.clientWidth;
        const height = this.playArea.clientHeight;
        this.width = width;
        this.height = height;

        this.render = this.Matter.Render.create({
            element: this.playArea,
            engine: this.engine,
            options: {
                width,
                height,
                background: '#f8fdff',
                wireframes: false,
                pixelRatio: window.devicePixelRatio || 1
            }
        });

        this.Matter.Render.run(this.render);
    }

    _bindEvents() {
        this.startBtn.addEventListener('click', () => this._startBall());
        this.resetBtn.addEventListener('click', () => this._loadStage(this.stageIndex));
        this.pauseBtn.addEventListener('click', () => this._togglePause());
        this.nextBtn.addEventListener('click', () => this._onNextStage());
        this.rotateBtn.addEventListener('click', () => this._rotateSelected());
        this.deleteBtn.addEventListener('click', () => this._deleteSelected());
        this.selectRectBtn.addEventListener('click', () => this._setTool('rect'));

        this.playArea.addEventListener('pointerdown', (e) => this._onPointerDown(e));
        this.playArea.addEventListener('pointermove', (e) => this._onPointerMove(e));
        this.playArea.addEventListener('pointerup', (e) => this._onPointerUp(e));
        this.playArea.addEventListener('pointercancel', (e) => this._onPointerUp(e));

        window.addEventListener('resize', () => this._resizeAndReload());
    }

    _resizeAndReload() {
        const newWidth = this.playArea.clientWidth;
        const newHeight = this.playArea.clientHeight;
        if (!newWidth || !newHeight) return;
        if (
            Math.abs(newWidth - this.width) < this.RESIZE_THRESHOLD
            && Math.abs(newHeight - this.height) < this.RESIZE_THRESHOLD
        ) return;

        this.width = newWidth;
        this.height = newHeight;
        this.render.canvas.width = newWidth;
        this.render.canvas.height = newHeight;
        this.render.options.width = newWidth;
        this.render.options.height = newHeight;
        this._loadStage(this.stageIndex);
    }

    _setTool(tool) {
        this.selectedTool = tool;
        this.selectRectBtn.classList.toggle('active', tool === 'rect');
    }

    _loadStage(index) {
        const wasPaused = this.isPaused;
        this.stageIndex = index;
        this.stage = this.stages[index];
        this.isStarted = false;
        this.isPaused = false;
        this.isCleared = false;
        this.ball = null;
        this.selectedBlock = null;
        this.placedBlocks = [];
        this.fixedBodies = [];
        this.draggingBlock = null;
        this.stuckFrames = 0;

        this.engine.gravity.y = 0;
        this.Matter.World.clear(this.world, false);
        this._buildWalls();
        this._buildGoal();
        this._buildObstacles();
        this._buildSpawnGuide();
        if (wasPaused) {
            this.Matter.Runner.run(this.runner, this.engine);
        }

        this.stageText.textContent = `ステージ ${this.stageIndex + 1} / ${this.stages.length}`;
        this.stateText.textContent = '配置中';
        this.messageText.textContent = '赤い輪がスタート、緑の円がゴールだよ。ブロックを置いて「スタート」を押そう！';

        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = '一時停止';
        this.nextBtn.disabled = true;

        this._updateBlockStock();
        this._syncSelectionUI();
    }

    _buildWalls() {
        const wallColor = '#9ca3af';
        const bodies = [
            this.Matter.Bodies.rectangle(this.width / 2, this.height + 12, this.width + 30, 24, {
                isStatic: true,
                render: { fillStyle: wallColor }
            }),
            this.Matter.Bodies.rectangle(-12, this.height / 2, 24, this.height, {
                isStatic: true,
                render: { fillStyle: wallColor }
            }),
            this.Matter.Bodies.rectangle(this.width + 12, this.height / 2, 24, this.height, {
                isStatic: true,
                render: { fillStyle: wallColor }
            }),
            this.Matter.Bodies.rectangle(this.width / 2, -12, this.width + 30, 24, {
                isStatic: true,
                render: { fillStyle: wallColor }
            })
        ];
        this.Matter.World.add(this.world, bodies);
    }

    _buildGoal() {
        const g = this.stage.goal;
        const point = this._scaledStagePoint(g);
        const r = this._scaledStageRadius(g.r, 14);
        const safePoint = this._clampCircleCenter(point, r);
        this.goalSensor = this.Matter.Bodies.circle(safePoint.x, safePoint.y, r, {
            isStatic: true,
            isSensor: true,
            label: 'goal',
            render: { fillStyle: '#22c55e', strokeStyle: '#15803d', lineWidth: 4 }
        });
        this.Matter.World.add(this.world, this.goalSensor);
    }

    _buildObstacles() {
        this.stage.obstacles.forEach((obs) => {
            if (obs.type !== 'rect') return;
            const body = this.Matter.Bodies.rectangle(obs.x, obs.y, obs.w, obs.h, {
                isStatic: true,
                angle: obs.angle || 0,
                restitution: 0.9,
                friction: 0.1,
                render: { fillStyle: '#f59e0b' }
            });
            this.fixedBodies.push(body);
        });
        this.Matter.World.add(this.world, this.fixedBodies);
    }

    _buildSpawnGuide() {
        const point = this._scaledStagePoint(this.stage.spawn);
        const safePoint = this._clampCircleCenter(point, 18);
        this.spawnGuide = this.Matter.Bodies.circle(safePoint.x, safePoint.y, 18, {
            isStatic: true,
            isSensor: true,
            label: 'spawn-guide',
            collisionFilter: { mask: 0 },
            render: { fillStyle: 'rgba(239, 68, 68, 0.15)', strokeStyle: '#dc2626', lineWidth: 3 }
        });
        this.Matter.World.add(this.world, this.spawnGuide);
    }

    _onPointerDown(event) {
        if (event.cancelable) event.preventDefault();
        if (this.isStarted || this.isPaused) return;
        const point = this._eventToWorldPoint(event);
        if (!point) return;
        if (typeof event.pointerId === 'number') {
            this.playArea.setPointerCapture(event.pointerId);
        }

        const hit = this.Matter.Query.point(this.placedBlocks, point)[0];
        if (hit) {
            this.selectedBlock = hit;
            this.draggingBlock = hit;
            this._syncSelectionUI();
            return;
        }

        if (this.selectedTool !== 'rect') return;
        if (this.placedBlocks.length >= this.stage.maxBlocks) {
            this.messageText.textContent = 'これ以上は置けないよ！';
            return;
        }

        const safePoint = this._clampBlockPosition(point);
        const block = this.Matter.Bodies.rectangle(safePoint.x, safePoint.y, this.BLOCK_WIDTH, this.BLOCK_HEIGHT, {
            isStatic: true,
            restitution: 0.92,
            friction: 0.04,
            render: { fillStyle: '#60a5fa', strokeStyle: '#2563eb', lineWidth: 1 }
        });
        this.placedBlocks.push(block);
        this.Matter.World.add(this.world, block);
        this.selectedBlock = block;

        this._syncSelectionUI();
        this._updateBlockStock();
    }

    _onPointerMove(event) {
        if (event.cancelable) event.preventDefault();
        if (!this.draggingBlock || this.isStarted || this.isPaused) return;
        const point = this._eventToWorldPoint(event);
        if (!point) return;

        this.Matter.Body.setPosition(this.draggingBlock, this._clampBlockPosition(point));
    }

    _onPointerUp(event) {
        if (event?.cancelable) event.preventDefault();
        if (
            typeof event?.pointerId === 'number'
            && this.playArea.hasPointerCapture(event.pointerId)
        ) {
            this.playArea.releasePointerCapture(event.pointerId);
        }
        this.draggingBlock = null;
    }

    _eventToWorldPoint(event) {
        const rect = this.playArea.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
        return { x, y };
    }

    _clampBlockPosition(point) {
        const marginX = Math.max(this.BLOCK_MOVE_MARGIN, this.BLOCK_WIDTH / 2);
        const marginY = Math.max(this.BLOCK_MOVE_MARGIN, this.BLOCK_HEIGHT / 2);
        const x = Math.min(this.width - marginX, Math.max(marginX, point.x));
        const y = Math.min(this.height - marginY, Math.max(marginY, point.y));
        return { x, y };
    }

    _scaledStagePoint(point) {
        return {
            x: (point.x / this.STAGE_BASE_WIDTH) * this.width,
            y: (point.y / this.STAGE_BASE_HEIGHT) * this.height
        };
    }

    _scaledStageRadius(radius, minRadius = 0) {
        const scale = Math.min(
            this.width / this.STAGE_BASE_WIDTH,
            this.height / this.STAGE_BASE_HEIGHT
        );
        return Math.max(minRadius, radius * scale);
    }

    _clampCircleCenter(point, radius) {
        return {
            x: Math.min(this.width - radius, Math.max(radius, point.x)),
            y: Math.min(this.height - radius, Math.max(radius, point.y))
        };
    }

    _rotateSelected() {
        if (this.isStarted || !this.selectedBlock) return;
        this.Matter.Body.rotate(this.selectedBlock, this.ROTATION_INCREMENT);
    }

    _deleteSelected() {
        if (this.isStarted || !this.selectedBlock) return;
        this.Matter.World.remove(this.world, this.selectedBlock);
        this.placedBlocks = this.placedBlocks.filter((b) => b !== this.selectedBlock);
        this.selectedBlock = null;
        this._syncSelectionUI();
        this._updateBlockStock();
    }

    _updateBlockStock() {
        const remain = this.stage.maxBlocks - this.placedBlocks.length;
        this.stockText.textContent = `のこり: ${remain}`;
    }

    _syncSelectionUI() {
        this.placedBlocks.forEach((body) => {
            if (body === this.selectedBlock) {
                body.render.strokeStyle = '#0f172a';
                body.render.lineWidth = 3;
            } else {
                body.render.strokeStyle = '#2563eb';
                body.render.lineWidth = 1;
            }
        });
    }

    _startBall() {
        if (this.isStarted || this.isPaused) return;

        this.isStarted = true;
        this.stateText.textContent = 'プレイ中';
        this.messageText.textContent = 'ボールをゴールへ導こう！';
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;

        this.engine.gravity.y = 1.02;
        const safeSpawn = this._clampCircleCenter(this._scaledStagePoint(this.stage.spawn), 14);
        this.ball = this.Matter.Bodies.circle(safeSpawn.x, safeSpawn.y, 14, {
            label: 'ball',
            restitution: 0.8,
            friction: 0.01,
            frictionAir: 0.012,
            density: 0.002,
            render: { fillStyle: '#ef4444' }
        });
        this.Matter.World.add(this.world, this.ball);
    }

    _togglePause() {
        if (!this.isStarted || this.isCleared) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.Matter.Runner.stop(this.runner);
            this.stateText.textContent = '一時停止';
            this.pauseBtn.textContent = '再開';
        } else {
            this.Matter.Runner.run(this.runner, this.engine);
            this.stateText.textContent = 'プレイ中';
            this.pauseBtn.textContent = '一時停止';
        }
    }

    _registerCollision() {
        this.Matter.Events.on(this.engine, 'collisionStart', (event) => {
            if (!this.ball || !this.isStarted || this.isCleared) return;
            for (const pair of event.pairs) {
                const labels = [pair.bodyA.label, pair.bodyB.label];
                if (labels.includes('goal') && labels.includes('ball')) {
                    this._onStageClear();
                    break;
                }
            }
        });
    }

    _onStageClear() {
        this.isCleared = true;
        this.isStarted = false;
        this.engine.gravity.y = 0;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = '一時停止';
        this.stateText.textContent = 'クリア！';
        this.messageText.textContent = 'やったね！ゴール成功！';
        this.nextBtn.disabled = this.stageIndex >= this.stages.length - 1;
        this.startBtn.disabled = true;

        this.clearCount = Math.max(this.clearCount, this.stageIndex + 1);
        this.starText.textContent = `⭐ ${this.clearCount}`;
    }

    _onFail(reasonText) {
        this.isStarted = false;
        this.engine.gravity.y = 0;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = '一時停止';
        this.startBtn.disabled = false;
        this.stateText.textContent = 'しっぱい';
        this.messageText.textContent = reasonText;

        if (this.ball) {
            this.Matter.World.remove(this.world, this.ball);
            this.ball = null;
        }
    }

    _onNextStage() {
        if (this.stageIndex >= this.stages.length - 1) {
            this.messageText.textContent = 'ぜんぶクリア！もう一度あそぼう！';
            return;
        }
        this._loadStage(this.stageIndex + 1);
    }

    _tick() {
        if (this.isStarted && !this.isPaused && this.ball) {
            const speed = this.ball.speed || 0;
            const y = this.ball.position.y;

            if (y > this.height + 26) {
                this._onFail('ボールが落ちちゃった！リトライしよう。');
            } else if (speed < this.STUCK_MIN_SPEED && y > this.height * this.STUCK_CHECK_HEIGHT_RATIO) {
                this.stuckFrames += 1;
                if (this.stuckFrames > this.STUCK_MAX_FRAMES) {
                    this._onFail('ボールが止まったよ。配置を変えてみよう！');
                }
            } else {
                this.stuckFrames = 0;
            }
        }

        this.rafId = requestAnimationFrame(() => this._tick());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Matter) {
        const text = document.getElementById('messageText');
        if (text) text.textContent = '物理エンジンの読み込みに失敗しました。ページを再読み込みしてください。';
        return;
    }
    new KorokoroReflect();
});
