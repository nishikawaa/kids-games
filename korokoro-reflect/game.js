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
        this.CIRCLE_TOOL_RADIUS = 24;
        this.STAR_TOOL_OUTER_RADIUS = 24;
        this.STAR_TOOL_INNER_RADIUS = 11;

        this.STAGE_BASE_WIDTH = 320;
        this.STAGE_BASE_HEIGHT = 420;
        this.BALL_RADIUS = 14;
        this.SPAWN_GUIDE_RADIUS = 18;
        this.STAGE_VARIATION_STEP = 17;
        this.STAGE_VARIATION_SPAN = 70;
        this.STAGE_VARIATION_CENTER = 35;
        this.STAGE_LEVEL_STEP = 20;
        this.SPAWN_SHIFT_RATE = 0.75;
        this.GOAL_SHIFT_RATE = 0.8;
        this.OBSTACLE_SHIFT_BASE = 0.4;
        this.OBSTACLE_SHIFT_STEP = 0.1;
        this.STAGE_UNLOCK_KEY = 'korokoroReflectUnlockedStageV1';
        this.STAGE_TOTAL = 100;
        this.CIRCLE_UNLOCK_STAGE = 4;
        this.STAR_UNLOCK_STAGE = 9;
        this.BLOCKS_DECREASE_INTERVAL = 6;
        this.MAX_EXTRA_OBSTACLES = 3;
        this.MIN_BLOCKS_PER_STAGE = 1;
        this.MIN_GOAL_RADIUS = 14;
        this.STAR_PHYSICS_RADIUS_SCALE = 0.8;
        this.STAR_SPRITE_SCALE = 0.4;
        this.DIFFICULTY_BASE_OBSTACLE_WIDTH = 94;
        this.DIFFICULTY_OBSTACLE_WIDTH_STEP = 3;
        this.DIFFICULTY_MIN_OBSTACLE_WIDTH = 56;
        this.DIFFICULTY_MAX_OBSTACLE_WIDTH = 104;
        this.STAR_TEXTURE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cpolygon points='60,6 74,43 114,43 82,66 94,106 60,82 26,106 38,66 6,43 46,43' fill='%23fbbf24' stroke='%23d97706' stroke-width='8' stroke-linejoin='round'/%3E%3C/svg%3E";
        this.FAIL_BADGE_DURATION = 3000;
        this.STUCK_BADGE_DURATION = 4300;
        this.MIN_REQUIRED_BLOCKS = 1;
        this.DEFAULT_AVAILABLE_TOOLS = ['rect'];
        this.BOUNCE_RIPPLE_MIN_INTERVAL_MS = 80;
        this.BLOCK_TAP_MOVE_THRESHOLD = 9;
        this.BLOCK_TAP_MOVE_THRESHOLD_SQUARED = this.BLOCK_TAP_MOVE_THRESHOLD * this.BLOCK_TAP_MOVE_THRESHOLD;
        this.CLEAR_OVERLAY_DELAY_MS = 650;

        this.stageText = document.getElementById('stageText');
        this.stockText = document.getElementById('stockText');
        this.stockMeter = document.getElementById('stockMeter');
        this.stockBar = document.getElementById('stockBar');
        this.fxBadge = document.getElementById('fxBadge');

        this.playArea = document.getElementById('playArea');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.deleteBtn = document.getElementById('deleteBtn');

        this.selectRectBtn = document.getElementById('selectRectBtn');
        this.selectCircleBtn = document.getElementById('selectCircleBtn');
        this.selectStarBtn = document.getElementById('selectStarBtn');
        this.toolButtons = {
            rect: this.selectRectBtn,
            circle: this.selectCircleBtn,
            star: this.selectStarBtn
        };

        this.stageListBtn = document.getElementById('stageListBtn');
        this.helpBtn = document.getElementById('helpBtn');
        this.menuBtn = document.getElementById('menuBtn');
        this.menuPanel = document.getElementById('menuPanel');
        this.stageSelectModal = document.getElementById('stageSelectModal');
        this.stageList = document.getElementById('stageList');
        this.closeStageListBtn = document.getElementById('closeStageListBtn');
        this.helpModal = document.getElementById('helpModal');
        this.closeHelpBtn = document.getElementById('closeHelpBtn');
        this.clearModal = document.getElementById('clearModal');
        this.clearNextBtn = document.getElementById('clearNextBtn');
        this.clearStageListBtn = document.getElementById('clearStageListBtn');

        this.Matter = window.Matter;
        this.engine = this.Matter.Engine.create();
        this.engine.gravity.y = 0;
        this.runner = this.Matter.Runner.create();

        this.render = null;
        this.world = this.engine.world;
        this.stages = this._buildStages(this.STAGE_TOTAL);
        this.stageIndex = 0;
        this.unlockedStageCount = this._loadUnlockedStageCount();
        this.stageButtons = [];

        this.selectedTool = 'rect';
        this.selectedBlock = null;
        this.placedBlocks = [];
        this.fixedBodies = [];
        this.goalSensor = null;
        this.spawnGuide = null;
        this.ball = null;

        this.isStarted = false;
        this.isCleared = false;
        this.draggingBlock = null;
        this.paletteDragTool = null;
        this.paletteDragPointerId = null;
        this.paletteDragSourceBtn = null;
        this.dragGhost = null;
        this.dragGhostShape = null;
        this.lastRippleAtMs = 0;
        this.stuckFrames = 0;
        this.fxTimerId = null;
        this.blockPointerState = null;
        this.previousControlDisabledStates = new Map();
        this.clearOverlayTimerId = null;
        this.clearOverlayGeneration = 0;
        this._onDocumentPointerDown = (event) => {
            if (!this.menuPanel || !this.menuBtn || this.menuPanel.classList.contains('hidden')) return;
            if (this.menuPanel.contains(event.target) || this.menuBtn.contains(event.target)) return;
            this._toggleHeaderMenu(false);
        };
        this._documentPointerListenerBound = false;

        this._initRenderer();
        this._bindEvents();
        this._registerCollision();
        this._renderStageListButtons();
        this._loadStage(0);

        this.Matter.Runner.run(this.runner, this.engine);
        this._tick();

        this._showHelpIfFirstTime();
        this._initToolDragGhost();
    }

    _buildStages(total) {
        const baseStages = [
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

        return Array.from({ length: total }, (_, index) => {
            const template = baseStages[index % baseStages.length];
            const offset = this._calculateStageOffset(index);
            const level = Math.floor(index / this.STAGE_LEVEL_STEP);

            const spawn = {
                x: this._clampValue(template.spawn.x + offset * this.SPAWN_SHIFT_RATE, 34, 286),
                y: this._clampValue(template.spawn.y + (index % 4), 32, 84)
            };
            const goal = {
                x: this._clampValue(template.goal.x - offset * this.GOAL_SHIFT_RATE, 34, 286),
                y: this._clampValue(template.goal.y - (index % 5) * 4, 300, 398),
                r: Math.max(this.MIN_GOAL_RADIUS, template.goal.r - level)
            };

            const obstacles = template.obstacles.map((obstacle, obstacleIndex) => ({
                ...obstacle,
                x: this._clampValue(
                    obstacle.x + offset * (this.OBSTACLE_SHIFT_BASE + obstacleIndex * this.OBSTACLE_SHIFT_STEP),
                    52,
                    268
                ),
                y: this._clampValue(obstacle.y + ((index + obstacleIndex) % 3) * 8, 120, 330)
            }));

            const extraObstacles = this._buildDifficultyObstacles(level, offset);
            const stageNumber = index + 1;
            const availableTools = stageNumber < this.CIRCLE_UNLOCK_STAGE
                ? ['rect']
                : stageNumber < this.STAR_UNLOCK_STAGE
                    ? ['rect', 'circle']
                    : ['rect', 'circle', 'star'];
            return {
                spawn,
                goal,
                maxBlocks: Math.max(this.MIN_BLOCKS_PER_STAGE, template.maxBlocks - Math.floor(level / this.BLOCKS_DECREASE_INTERVAL)),
                minRequiredBlocks: this.MIN_REQUIRED_BLOCKS,
                availableTools,
                obstacles: [...obstacles, ...extraObstacles]
            };
        });
    }

    _buildDifficultyObstacles(level, offset) {
        if (level <= 0) return [];
        const obstacles = [];
        const count = Math.min(this.MAX_EXTRA_OBSTACLES, level);
        for (let index = 0; index < count; index += 1) {
            obstacles.push({
                type: 'rect',
                x: this._clampValue(85 + index * 85 + offset * 0.2, 56, 264),
                y: this._clampValue(150 + index * 55, 120, 332),
                w: this._clampValue(
                    this.DIFFICULTY_BASE_OBSTACLE_WIDTH - level * this.DIFFICULTY_OBSTACLE_WIDTH_STEP,
                    this.DIFFICULTY_MIN_OBSTACLE_WIDTH,
                    this.DIFFICULTY_MAX_OBSTACLE_WIDTH
                ),
                h: 14,
                angle: ((index % 2 === 0 ? 1 : -1) * 0.15) + level * 0.02
            });
        }
        return obstacles;
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
        this.nextBtn.addEventListener('click', () => this._onNextStage());
        this.deleteBtn.addEventListener('click', () => this._deleteSelected());

        this._bindToolDragEvents(this.selectRectBtn, 'rect');
        this._bindToolDragEvents(this.selectCircleBtn, 'circle');
        this._bindToolDragEvents(this.selectStarBtn, 'star');

        this.menuBtn.addEventListener('click', () => {
            const isOpen = !this.menuPanel.classList.contains('hidden');
            this._toggleHeaderMenu(!isOpen);
        });
        this.stageListBtn.addEventListener('click', () => {
            this._toggleHeaderMenu(false);
            this._toggleModal(this.stageSelectModal, true);
        });
        this.closeStageListBtn.addEventListener('click', () => this._toggleModal(this.stageSelectModal, false));
        this.helpBtn.addEventListener('click', () => {
            this._toggleHeaderMenu(false);
            this._toggleModal(this.helpModal, true);
        });
        this.closeHelpBtn.addEventListener('click', () => this._closeHelp());
        this.clearNextBtn.addEventListener('click', () => {
            this._setClearOverlayVisible(false);
            this._onNextStage();
        });
        this.clearStageListBtn.addEventListener('click', () => {
            this._setClearOverlayVisible(false);
            this._toggleModal(this.stageSelectModal, true);
        });

        this.stageSelectModal.addEventListener('click', (event) => {
            if (event.target === this.stageSelectModal) this._toggleModal(this.stageSelectModal, false);
        });
        this.helpModal.addEventListener('click', (event) => {
            if (event.target === this.helpModal) this._closeHelp();
        });
        if (!this._documentPointerListenerBound) {
            document.addEventListener('pointerdown', this._onDocumentPointerDown);
            this._documentPointerListenerBound = true;
        }

        this.playArea.addEventListener('pointerdown', (event) => this._onPointerDown(event));
        this.playArea.addEventListener('pointermove', (event) => this._onPointerMove(event));
        this.playArea.addEventListener('pointerup', (event) => this._onPointerUp(event));
        this.playArea.addEventListener('pointercancel', (event) => this._onPointerUp(event));

        window.addEventListener('resize', () => this._resizeAndReload());
    }

    _bindToolDragEvents(button, tool) {
        button.addEventListener('pointerdown', (event) => this._onToolPointerDown(event, tool));
        button.addEventListener('pointermove', (event) => this._onToolPointerMove(event));
        button.addEventListener('pointerup', (event) => this._onToolPointerUp(event));
        button.addEventListener('pointercancel', (event) => this._onToolPointerCancel(event));
    }

    _renderStageListButtons() {
        const fragment = document.createDocumentFragment();
        this.stages.forEach((_, stageIndex) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'stage-item';
            button.textContent = String(stageIndex + 1);
            button.setAttribute('aria-label', `ステージ ${stageIndex + 1}`);
            button.addEventListener('click', () => {
                if (stageIndex + 1 > this.unlockedStageCount) {
                    this._showFxBadge('前のステージをクリアしてね', 'fail', 1100);
                    return;
                }
                this._toggleModal(this.stageSelectModal, false);
                this._loadStage(stageIndex);
            });
            fragment.appendChild(button);
            this.stageButtons.push(button);
        });
        this.stageList.appendChild(fragment);
        this._syncStageButtonsLock();
    }

    _showHelpIfFirstTime() {
        const key = 'korokoroReflectHelpSeenV1';
        let seen = false;
        try {
            seen = localStorage.getItem(key) === '1';
        } catch (_error) {
            seen = false;
        }
        if (!seen) {
            this._toggleModal(this.helpModal, true);
        }
    }

    _closeHelp() {
        try {
            localStorage.setItem('korokoroReflectHelpSeenV1', '1');
        } catch (_error) {}
        this._toggleModal(this.helpModal, false);
    }

    _toggleModal(modal, visible) {
        modal.classList.toggle('hidden', !visible);
        modal.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    _toggleHeaderMenu(visible) {
        if (!this.menuPanel || !this.menuBtn) return;
        this.menuPanel.classList.toggle('hidden', !visible);
        this.menuPanel.setAttribute('aria-hidden', visible ? 'false' : 'true');
        this.menuBtn.setAttribute('aria-expanded', visible ? 'true' : 'false');
    }

    _setClearOverlayVisible(visible) {
        if (!this.clearModal) return;
        this.clearModal.classList.toggle('hidden', !visible);
        this.clearModal.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (visible) {
            this._toggleHeaderMenu(false);
        }
        this._setClearActionsLock(visible);
    }

    _setClearActionsLock(locked) {
        const controls = [
            this.startBtn,
            this.resetBtn,
            this.deleteBtn,
            this.menuBtn,
            this.selectRectBtn,
            this.selectCircleBtn,
            this.selectStarBtn
        ].filter(Boolean);

        if (locked) {
            controls.forEach((control) => {
                this.previousControlDisabledStates.set(control, control.disabled);
                control.disabled = true;
            });
            return;
        }

        this.previousControlDisabledStates.forEach((prevDisabled, control) => {
            control.disabled = prevDisabled;
        });
        this.previousControlDisabledStates.clear();
    }

    _loadUnlockedStageCount() {
        try {
            const rawValue = localStorage.getItem(this.STAGE_UNLOCK_KEY);
            if (rawValue == null) return 1;
            const value = Number(rawValue);
            if (Number.isFinite(value)) {
                return this._clampValue(Math.floor(value), 1, this.stages.length);
            }
        } catch (_error) {}
        return 1;
    }

    _saveUnlockedStageCount() {
        try {
            localStorage.setItem(this.STAGE_UNLOCK_KEY, String(this.unlockedStageCount));
        } catch (_error) {}
    }

    _syncStageButtonsLock() {
        this.stageButtons.forEach((button, index) => {
            const stageNumber = index + 1;
            const isLocked = stageNumber > this.unlockedStageCount;
            const isCleared = stageNumber < this.unlockedStageCount;
            const isNextUnlocked = stageNumber === this.unlockedStageCount;
            button.disabled = isLocked;
            button.classList.toggle('cleared', isCleared);
            button.classList.toggle('next-unlocked', isNextUnlocked);
        });
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
        if (!this._isToolAvailable(tool)) return;
        this.selectedTool = tool;
        this.selectRectBtn.classList.toggle('active', tool === 'rect');
        this.selectCircleBtn.classList.toggle('active', tool === 'circle');
        this.selectStarBtn.classList.toggle('active', tool === 'star');
    }

    _isToolAvailable(tool) {
        return this.stage?.availableTools?.includes(tool);
    }

    _syncToolAvailability() {
        const availableTools = this.stage?.availableTools ?? this.DEFAULT_AVAILABLE_TOOLS;
        Object.entries(this.toolButtons).forEach(([tool, button]) => {
            const isAvailable = availableTools.includes(tool);
            button.disabled = !isAvailable;
            button.classList.toggle('tool-hidden', !isAvailable);
            button.tabIndex = isAvailable ? 0 : -1;
        });
        if (!availableTools.includes(this.selectedTool)) {
            this.selectedTool = availableTools[0];
        }
        this._setTool(this.selectedTool);
    }

    _loadStage(index) {
        this.stageIndex = index;
        this.stage = this.stages[index];

        this.isStarted = false;
        this.isCleared = false;
        this.ball = null;
        this.selectedBlock = null;
        this.placedBlocks = [];
        this.fixedBodies = [];
        this.draggingBlock = null;
        this.stuckFrames = 0;
        document.body.classList.remove('dragging-tool');
        this.clearOverlayGeneration += 1;
        if (this.clearOverlayTimerId) {
            clearTimeout(this.clearOverlayTimerId);
            this.clearOverlayTimerId = null;
        }

        this.engine.gravity.y = 0;
        this.Matter.World.clear(this.world, false);
        this._buildWalls();
        this._buildGoal();
        this._buildObstacles();
        this._buildSpawnGuide();

        this.stageText.textContent = `ステージ ${this.stageIndex + 1} / ${this.stages.length}`;
        this.startBtn.disabled = false;
        this._setNextButtonReady(false);
        this._setClearOverlayVisible(false);
        this.playArea.classList.remove('fail-flash', 'clear-flash', 'stuck-fail');
        if (this.fxTimerId) {
            clearTimeout(this.fxTimerId);
            this.fxTimerId = null;
        }
        this._hideFxBadge();

        this._updateBlockStock();
        this._syncToolAvailability();
        this._syncSelectionUI();
        this._syncStageListHighlight();
    }

    _syncStageListHighlight() {
        const buttons = this.stageList.querySelectorAll('.stage-item');
        buttons.forEach((button, index) => {
            button.classList.toggle('active', index === this.stageIndex);
        });
        this._syncStageButtonsLock();
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
        const scaledGoalPoint = this._scaledStagePoint(this.stage.goal);
        const scaledRadius = this._scaledStageRadius(this.stage.goal.r, this.BALL_RADIUS);
        const safePoint = this._clampCircleCenter(scaledGoalPoint, scaledRadius);
        this.goalSensor = this.Matter.Bodies.circle(safePoint.x, safePoint.y, scaledRadius, {
            isStatic: true,
            isSensor: true,
            label: 'goal',
            render: { fillStyle: '#22c55e', strokeStyle: '#15803d', lineWidth: 4 }
        });
        this.Matter.World.add(this.world, this.goalSensor);
    }

    _buildObstacles() {
        this.stage.obstacles.forEach((obstacle) => {
            if (obstacle.type !== 'rect') return;
            const point = this._scaledStagePoint(obstacle);
            const width = (obstacle.w / this.STAGE_BASE_WIDTH) * this.width;
            const height = (obstacle.h / this.STAGE_BASE_HEIGHT) * this.height;
            const body = this.Matter.Bodies.rectangle(point.x, point.y, width, height, {
                isStatic: true,
                angle: obstacle.angle || 0,
                restitution: 0.9,
                friction: 0.1,
                render: { fillStyle: '#f59e0b' }
            });
            this.fixedBodies.push(body);
        });
        this.Matter.World.add(this.world, this.fixedBodies);
    }

    _buildSpawnGuide() {
        const scaledSpawnPoint = this._scaledStagePoint(this.stage.spawn);
        const safePoint = this._clampCircleCenter(scaledSpawnPoint, this.SPAWN_GUIDE_RADIUS);
        this.spawnGuide = this.Matter.Bodies.circle(safePoint.x, safePoint.y, this.SPAWN_GUIDE_RADIUS, {
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
        if (this.isStarted) return;

        const point = this._eventToWorldPoint(event);
        if (!point) return;

        const hit = this.Matter.Query.point(this.placedBlocks, point)[0];
        if (hit) {
            if (typeof event.pointerId === 'number') {
                this.playArea.setPointerCapture(event.pointerId);
            }
            this.selectedBlock = hit;
            this.blockPointerState = {
                pointerId: event.pointerId,
                block: hit,
                startPoint: point,
                moved: false
            };
            this.draggingBlock = null;
            this._syncSelectionUI();
            return;
        }
        this.blockPointerState = null;
        this.selectedBlock = null;
        this._syncSelectionUI();
    }

    _createToolBody(tool, point) {
        const options = {
            isStatic: true,
            restitution: 0.92,
            friction: 0.04
        };

        if (tool === 'rect') {
            const safePoint = this._clampPointWithHalfExtents(
                point,
                this.BLOCK_WIDTH / 2,
                this.BLOCK_HEIGHT / 2
            );
            return this.Matter.Bodies.rectangle(safePoint.x, safePoint.y, this.BLOCK_WIDTH, this.BLOCK_HEIGHT, {
                ...options,
                label: 'tool-rect',
                render: { fillStyle: '#60a5fa', strokeStyle: '#2563eb', lineWidth: 1 }
            });
        }

        if (tool === 'circle') {
            const safePoint = this._clampCircleCenter(point, this.CIRCLE_TOOL_RADIUS);
            return this.Matter.Bodies.circle(safePoint.x, safePoint.y, this.CIRCLE_TOOL_RADIUS, {
                ...options,
                label: 'tool-circle',
                render: { fillStyle: '#38bdf8', strokeStyle: '#0284c7', lineWidth: 1 }
            });
        }

        if (tool === 'star') {
            const safePoint = this._clampCircleCenter(point, this.STAR_TOOL_OUTER_RADIUS);
            return this.Matter.Bodies.circle(safePoint.x, safePoint.y, this.STAR_TOOL_OUTER_RADIUS * this.STAR_PHYSICS_RADIUS_SCALE, {
                ...options,
                label: 'tool-star',
                render: {
                    fillStyle: 'transparent',
                    strokeStyle: '#d97706',
                    lineWidth: 1,
                    sprite: {
                        texture: this.STAR_TEXTURE,
                        xScale: this.STAR_SPRITE_SCALE,
                        yScale: this.STAR_SPRITE_SCALE
                    }
                }
            });
        }

        return null;
    }

    _onPointerMove(event) {
        if (event.cancelable) event.preventDefault();
        if (this.isStarted || !this.blockPointerState) return;
        if (this.blockPointerState.pointerId !== event.pointerId) return;

        const point = this._eventToWorldPoint(event);
        if (!point) return;

        if (!this.blockPointerState.moved) {
            const dx = point.x - this.blockPointerState.startPoint.x;
            const dy = point.y - this.blockPointerState.startPoint.y;
            const movedDistanceSquared = (dx * dx) + (dy * dy);
            if (movedDistanceSquared >= this.BLOCK_TAP_MOVE_THRESHOLD_SQUARED) {
                this.blockPointerState.moved = true;
                this.draggingBlock = this.blockPointerState.block;
            }
        }

        if (!this.blockPointerState.moved || !this.draggingBlock) return;
        const safePoint = this._clampBodyPosition(this.draggingBlock, point);
        this.Matter.Body.setPosition(this.draggingBlock, safePoint);
    }

    _onPointerUp(event) {
        if (event?.cancelable) event.preventDefault();
        if (
            typeof event?.pointerId === 'number'
            && this.playArea.hasPointerCapture(event.pointerId)
        ) {
            this.playArea.releasePointerCapture(event.pointerId);
        }
        if (
            !this.isStarted
            && this.blockPointerState
            && this.blockPointerState.pointerId === event?.pointerId
            && !this.blockPointerState.moved
            && this.blockPointerState.block
        ) {
            this._rotateBlock(this.blockPointerState.block);
        }
        this.blockPointerState = null;
        this.draggingBlock = null;
    }

    _onToolPointerDown(event, tool) {
        if (event.cancelable) event.preventDefault();
        if (this.isStarted) return;
        if (!this._isToolAvailable(tool)) return;
        if (this.placedBlocks.length >= this.stage.maxBlocks) {
            this._showFxBadge('これ以上は置けないよ！', 'fail', 900);
            return;
        }
        this._setTool(tool);
        this.paletteDragTool = tool;
        this.paletteDragPointerId = event.pointerId;
        this.paletteDragSourceBtn = event.currentTarget;
        if (
            typeof event.pointerId === 'number'
            && this.paletteDragSourceBtn?.setPointerCapture
        ) {
            this.paletteDragSourceBtn.setPointerCapture(event.pointerId);
        }
        document.body.classList.add('dragging-tool');
        this._updateToolDragGhost(event.clientX, event.clientY);
        this._setToolDragGhostVisible(true);
    }

    _onToolPointerMove(event) {
        if (event.cancelable) event.preventDefault();
        if (this.paletteDragPointerId !== event.pointerId || !this.paletteDragTool) return;
        this._updateToolDragGhost(event.clientX, event.clientY);
    }

    _onToolPointerUp(event) {
        if (event?.cancelable) event.preventDefault();
        if (this.paletteDragPointerId !== event.pointerId || !this.paletteDragTool) return;
        this._releasePaletteDragPointer(event);
        const dropPoint = this._clientToPlayAreaPoint(event.clientX, event.clientY);
        if (dropPoint) {
            this._placeToolAt(this.paletteDragTool, dropPoint);
        }
        this._endToolDrag();
    }

    _onToolPointerCancel(event) {
        if (this.paletteDragPointerId !== event.pointerId || !this.paletteDragTool) return;
        this._releasePaletteDragPointer(event);
        this._endToolDrag();
    }

    _releasePaletteDragPointer(event) {
        if (
            this.paletteDragSourceBtn
            && typeof event?.pointerId === 'number'
            && this.paletteDragSourceBtn.hasPointerCapture?.(event.pointerId)
        ) {
            this.paletteDragSourceBtn.releasePointerCapture(event.pointerId);
        }
    }

    _endToolDrag() {
        this.paletteDragTool = null;
        this.paletteDragPointerId = null;
        this.paletteDragSourceBtn = null;
        this._setToolDragGhostVisible(false);
        document.body.classList.remove('dragging-tool');
    }

    _eventToWorldPoint(event) {
        return this._clientToPlayAreaPoint(event.clientX, event.clientY);
    }

    _clientToPlayAreaPoint(clientX, clientY) {
        const rect = this.playArea.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        const x = clientX - rect.left;
        const y = clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

        return { x, y };
    }

    _placeToolAt(tool, point) {
        if (this.isStarted) return;
        if (!this._isToolAvailable(tool)) return;
        if (this.placedBlocks.length >= this.stage.maxBlocks) {
            this._showFxBadge('これ以上は置けないよ！', 'fail', 900);
            return;
        }
        const body = this._createToolBody(tool, point);
        if (!body) return;
        this.placedBlocks.push(body);
        this.Matter.World.add(this.world, body);
        this.selectedBlock = body;
        this._showPlacementSpark(body.position);
        this._syncSelectionUI();
        this._updateBlockStock();
    }

    _clampPointWithHalfExtents(point, halfWidth, halfHeight) {
        const marginX = Math.max(this.BLOCK_MOVE_MARGIN, halfWidth);
        const marginY = Math.max(this.BLOCK_MOVE_MARGIN, halfHeight);
        return {
            x: Math.min(this.width - marginX, Math.max(marginX, point.x)),
            y: Math.min(this.height - marginY, Math.max(marginY, point.y))
        };
    }

    _clampBodyPosition(body, point) {
        const width = body.bounds.max.x - body.bounds.min.x;
        const height = body.bounds.max.y - body.bounds.min.y;
        return this._clampPointWithHalfExtents(point, width / 2, height / 2);
    }

    _scaledStagePoint(point) {
        return {
            x: (point.x / this.STAGE_BASE_WIDTH) * this.width,
            y: (point.y / this.STAGE_BASE_HEIGHT) * this.height
        };
    }

    _scaledStageRadius(radius, minimumRadius = 0) {
        const scale = Math.min(
            this.width / this.STAGE_BASE_WIDTH,
            this.height / this.STAGE_BASE_HEIGHT
        );
        return Math.max(minimumRadius, radius * scale);
    }

    _clampCircleCenter(point, radius) {
        return {
            x: Math.min(this.width - radius, Math.max(radius, point.x)),
            y: Math.min(this.height - radius, Math.max(radius, point.y))
        };
    }

    _clampValue(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    _calculateStageOffset(index) {
        return ((index * this.STAGE_VARIATION_STEP) % this.STAGE_VARIATION_SPAN) - this.STAGE_VARIATION_CENTER;
    }

    _nextUnlockStageCount() {
        return Math.min(this.stages.length, this.stageIndex + 2);
    }

    _showPlacementSpark(point) {
        if (!this.playArea || !point) return;
        const spark = document.createElement('span');
        spark.className = 'placement-spark';
        spark.style.left = `${point.x}px`;
        spark.style.top = `${point.y}px`;
        spark.addEventListener('animationend', () => spark.remove(), { once: true });
        this.playArea.appendChild(spark);
    }

    _showBounceRipple(point) {
        if (!this.playArea || !point) return;
        const now = performance.now();
        if (now - this.lastRippleAtMs < this.BOUNCE_RIPPLE_MIN_INTERVAL_MS) return;
        this.lastRippleAtMs = now;
        const ripple = document.createElement('span');
        ripple.className = 'bounce-ripple';
        ripple.style.left = `${point.x}px`;
        ripple.style.top = `${point.y}px`;
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
        this.playArea.appendChild(ripple);
    }

    _initToolDragGhost() {
        this.dragGhost = document.createElement('span');
        this.dragGhost.className = 'tool-drag-ghost rect hidden';
        this.dragGhostShape = document.createElement('span');
        this.dragGhostShape.className = 'ghost-shape';
        this.dragGhost.appendChild(this.dragGhostShape);
        document.body.appendChild(this.dragGhost);
    }

    _setToolDragGhostVisible(visible) {
        if (!this.dragGhost) return;
        this.dragGhost.classList.toggle('hidden', !visible);
    }

    _updateToolDragGhost(clientX, clientY) {
        if (!this.dragGhost || !this.dragGhostShape || !this.paletteDragTool) return;
        this.dragGhost.style.left = `${clientX}px`;
        this.dragGhost.style.top = `${clientY}px`;
        this.dragGhost.classList.remove('rect', 'circle', 'star');
        this.dragGhost.classList.add(this.paletteDragTool);
        const canDrop = Boolean(this._clientToPlayAreaPoint(clientX, clientY));
        this.dragGhost.classList.toggle('can-drop', canDrop);
    }

    _showFxBadge(text, mode, durationMs) {
        if (!this.fxBadge) return;
        this.fxBadge.textContent = text;
        this.fxBadge.classList.remove('hidden', 'clear', 'fail');
        this.fxBadge.classList.add(mode === 'clear' ? 'clear' : 'fail');
        if (this.fxTimerId) {
            clearTimeout(this.fxTimerId);
        }
        this.fxTimerId = setTimeout(() => this._hideFxBadge(), durationMs);
    }

    _hideFxBadge() {
        if (!this.fxBadge) return;
        this.fxBadge.classList.remove('clear', 'fail');
        this.fxBadge.classList.add('hidden');
    }

    _flashPlayArea(className) {
        this.playArea.classList.remove('fail-flash', 'clear-flash');
        // force reflow so the same animation class can restart on repeated failures/clears
        void this.playArea.offsetWidth;
        this.playArea.classList.add(className);
    }

    _rotateBlock(block) {
        if (this.isStarted || !block) return;
        this.Matter.Body.rotate(block, this.ROTATION_INCREMENT);
    }

    _deleteSelected() {
        if (this.isStarted || !this.selectedBlock) return;
        this.Matter.World.remove(this.world, this.selectedBlock);
        this.placedBlocks = this.placedBlocks.filter((body) => body !== this.selectedBlock);
        this.selectedBlock = null;
        this._syncSelectionUI();
        this._updateBlockStock();
    }

    _updateBlockStock() {
        const remain = this.stage.maxBlocks - this.placedBlocks.length;
        this.stockText.textContent = `のこり: ${remain}`;
        if (this.stockMeter) {
            this.stockMeter.setAttribute('aria-valuemax', String(this.stage.maxBlocks));
            this.stockMeter.setAttribute('aria-valuenow', String(remain));
        }
        if (this.stockBar) {
            const ratio = this.stage.maxBlocks > 0 ? remain / this.stage.maxBlocks : 0;
            this.stockBar.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
        }
    }

    _syncSelectionUI() {
        this.placedBlocks.forEach((body) => {
            if (body === this.selectedBlock) {
                body.render.strokeStyle = '#0f172a';
                body.render.lineWidth = 3;
            } else {
                if (body.label === 'tool-rect') body.render.strokeStyle = '#2563eb';
                if (body.label === 'tool-circle') body.render.strokeStyle = '#0284c7';
                if (body.label === 'tool-star') body.render.strokeStyle = '#d97706';
                body.render.lineWidth = 1;
            }
        });
    }

    _startBall() {
        if (this.isStarted) return;
        const requiredBlocks = this.stage.minRequiredBlocks ?? this.MIN_REQUIRED_BLOCKS;
        if (this.placedBlocks.length < requiredBlocks) {
            this._showFxBadge(`ブロックを${requiredBlocks}つおいてからスタートしよう！`, 'fail', 1300);
            return;
        }

        this.isStarted = true;
        this.startBtn.disabled = true;
        this.playArea.classList.remove('stuck-fail');
        this._hideFxBadge();

        this.engine.gravity.y = 1.02;
        const safeSpawn = this._clampCircleCenter(this._scaledStagePoint(this.stage.spawn), this.BALL_RADIUS);
        this.ball = this.Matter.Bodies.circle(safeSpawn.x, safeSpawn.y, this.BALL_RADIUS, {
            label: 'ball',
            restitution: 0.8,
            friction: 0.01,
            frictionAir: 0.012,
            density: 0.002,
            render: { fillStyle: '#ef4444' }
        });
        this.Matter.World.add(this.world, this.ball);
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
                if (labels.includes('ball') && !labels.includes('goal')) {
                    this._showBounceRipple(this.ball.position);
                }
            }
        });
    }

    _onStageClear() {
        this.isCleared = true;
        this.isStarted = false;
        this.engine.gravity.y = 0;
        this.unlockedStageCount = Math.max(this.unlockedStageCount, this._nextUnlockStageCount());
        this._saveUnlockedStageCount();
        this._syncStageButtonsLock();
        this._showFxBadge('クリア！', 'clear', 1300);
        this._flashPlayArea('clear-flash');
        this._setNextButtonReady(false);
        const overlayGeneration = ++this.clearOverlayGeneration;
        this.clearOverlayTimerId = setTimeout(() => {
            if (this.clearOverlayGeneration !== overlayGeneration) return;
            this.clearOverlayTimerId = null;
            this._setClearOverlayVisible(true);
        }, this.CLEAR_OVERLAY_DELAY_MS);
        this.startBtn.disabled = true;
    }

    _onFail(reasonText, reasonType = 'generic') {
        this.isStarted = false;
        this.engine.gravity.y = 0;
        this.startBtn.disabled = false;
        this.playArea.classList.remove('stuck-fail');
        const durationMs = reasonType === 'stuck' ? this.STUCK_BADGE_DURATION : this.FAIL_BADGE_DURATION;
        this._showFxBadge(reasonText, 'fail', durationMs);
        this._flashPlayArea('fail-flash');
        if (reasonType === 'stuck') {
            this.playArea.classList.add('stuck-fail');
        }

        if (this.ball) {
            this.Matter.World.remove(this.world, this.ball);
            this.ball = null;
        }
    }

    _onNextStage() {
        if (this.stageIndex >= this.stages.length - 1) {
            this._showFxBadge('ぜんぶクリア！', 'clear', 1500);
            return;
        }
        if (this._nextUnlockStageCount() > this.unlockedStageCount) {
            this._showFxBadge('先にいまのステージをクリアしよう！', 'fail', 1100);
            return;
        }
        this._loadStage(this.stageIndex + 1);
    }

    _setNextButtonReady(isReady) {
        const canAdvance = isReady && this.stageIndex < this.stages.length - 1;
        this.nextBtn.disabled = !canAdvance;
        this.nextBtn.classList.toggle('ready', canAdvance);
    }

    _tick() {
        if (this.isStarted && this.ball) {
            const speed = this.ball.speed || 0;
            const y = this.ball.position.y;

            if (y > this.height + 26) {
                this._onFail('ボールがおちちゃった！リトライしよう。', 'fall');
            } else if (speed < this.STUCK_MIN_SPEED && y > this.height * this.STUCK_CHECK_HEIGHT_RATIO) {
                this.stuckFrames += 1;
                if (this.stuckFrames > this.STUCK_MAX_FRAMES) {
                    this._onFail('ボールがとまったよ。はいちをかえてみよう！', 'stuck');
                }
            } else {
                this.stuckFrames = 0;
            }
        }

        requestAnimationFrame(() => this._tick());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Matter) {
        const stageText = document.getElementById('stageText');
        if (stageText) stageText.textContent = '読み込みに失敗しました。再読み込みしてください。';
        return;
    }
    new KorokoroReflect();
});
