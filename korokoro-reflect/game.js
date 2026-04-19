const KOROKORO_STAGE_TOTAL = 100;

function isValidStageDefinitions(stageDefinitions, expectedCount = KOROKORO_STAGE_TOTAL) {
    return Array.isArray(stageDefinitions) && stageDefinitions.length === expectedCount;
}

function resolveAssetPath(basePath, assetName) {
    const normalizedBase = (basePath || './');
    const withTrailingSlash = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`;
    return `${withTrailingSlash}${assetName}`;
}

class KorokoroReflect {
    constructor(options = {}) {
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
        this.STAGE_VARIATION_STEP = 17;
        this.STAGE_VARIATION_SPAN = 70;
        this.STAGE_VARIATION_CENTER = 35;
        this.STAGE_TUNING_SEED_MULTIPLIER = 37;
        this.OBSTACLE_STAGE_SEED_MULTIPLIER = 29;
        this.OBSTACLE_INDEX_SEED_MULTIPLIER = 17;
        this.BALL_RADIUS = 14;
        this.MOBILE_BALL_RADIUS_SCALE = 2 / 3;
        this.MIN_MOBILE_BALL_RADIUS = 6;
        this.MOBILE_LAYOUT_MAX_WIDTH = 768;
        this.SPAWN_GUIDE_RADIUS = 18;
        this.STAGE_LEVEL_STEP = 20;
        this.STAGE_UNLOCK_KEY = 'korokoroReflectUnlockedStageV1';
        this.STAGE_TOTAL = KOROKORO_STAGE_TOTAL;
        this.DEFAULT_SPAWN_DIRECTION = 'down';
        this.CIRCLE_UNLOCK_STAGE = 4;
        this.STAR_UNLOCK_STAGE = 9;
        this.BLOCKS_DECREASE_INTERVAL = 6;
        this.MAX_EXTRA_OBSTACLES = 3;
        this.MIN_BLOCKS_PER_STAGE = 1;
        this.REACHABLE_GOAL_MIN_DROP = 52;
        this.HORIZONTAL_SPAWN_DROP_ADJUSTMENT = 16;
        this.MIN_GOAL_RADIUS = 14;
        this.MIN_OBSTACLE_RADIUS = 9;
        this.MIN_OBSTACLE_INNER_RADIUS = 4;
        this.BUMPER_UNLOCK_STAGE = 5;
        this.BUMPER_RESTITUTION = 1.16;
        this.BUMPER_BASE_X = 106;
        this.BUMPER_X_VARIATION_STEP = 13;
        this.BUMPER_X_VARIATION_SPAN = 130;
        this.BUMPER_BASE_Y = 178;
        this.BUMPER_Y_VARIATION_STEP = 17;
        this.BUMPER_Y_VARIATION_SPAN = 154;
        this.BUMPER_X_JITTER_SCALE = 0.18;
        this.BUMPER_Y_JITTER_SCALE = 0.12;
        this.BUMPER_VARIATION_PERIOD = 5;
        this.BUMPER_VARIATION_OFFSET = 2;
        this.BUMPER_ROUTE_ALLOWANCE_BONUS = 18;
        this.BUMPER_BASE_RADIUS = 16;
        this.BUMPER_RADIUS_BONUS = 2;
        this.BUMPER_RADIUS_DECREASE_INTERVAL = 3;
        this.BUMPER_PATH_RATIO_MIN = 0.32;
        this.BUMPER_PATH_RATIO_MAX = 0.78;
        this.BUMPER_PATH_RATIO_BASE = 0.56;
        this.BUMPER_PATH_RATIO_VARIATION = 0.16;
        this.STAR_PHYSICS_RADIUS_SCALE = 0.8;
        this.STAR_SPRITE_SCALE = 0.4;
        this.SPAWN_SPEED_HORIZONTAL = 2.6;
        this.SPAWN_SPEED_VERTICAL = 2.2;
        this.SPAWN_VERTICAL_BIAS = -0.08;
        this.SPAWN_DOWNWARD_SCALE = 0.08;
        this.DOWNHILL_ACCEL_FACTOR = 1.003;
        this.DOWNHILL_MIN_VERTICAL_SPEED = 0.2;
        this.DOWNHILL_MIN_HORIZONTAL_SPEED = 0.1;
        this.DOWNHILL_MAX_HORIZONTAL_SPEED = 9;
        this.OBSTACLE_VARIATION_MULTIPLIER = 7;
        this.OBSTACLE_VARIATION_SPAN = 11;
        this.OBSTACLE_VARIATION_CENTER = 5;
        this.OBSTACLE_MIN_SPAWN_CLEARANCE = 54;
        this.OBSTACLE_MIN_GOAL_CLEARANCE = 52;
        this.OBSTACLE_ROUTE_BAND_BASE = 86;
        this.OBSTACLE_ROUTE_BAND_MIN = 52;
        this.OBSTACLE_ROUTE_BAND_DECREASE_RATE = 4;
        this.OBSTACLE_MIN_SEPARATION = 32;
        this.OBSTACLE_CENTER_DISTANCE_WEIGHT = 0.1;
        this.NON_BUMPER_GUARANTEE_STAGE_LIMIT = 12;
        this.STAGE4_MIN_BLOCKS = 3;
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
        // small tolerance so dragging slightly outside the frame feels like a natural delete gesture
        this.DRAG_DELETE_OUTSIDE_MARGIN = 6;
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
        const providedStageDefinitions = this._areValidExternalStageDefinitions(options.stageDefinitions)
            ? options.stageDefinitions
            : null;
        if (providedStageDefinitions) {
            this.stageDefinitionOverrides = {};
            this.stages = this._buildStages(providedStageDefinitions);
        } else {
            const generatedStageDefinitions = this._buildStageDefinitions(this.STAGE_TOTAL, {});
            this.stageDefinitionOverrides = this._buildStageDefinitionOverrides(this.STAGE_TOTAL, generatedStageDefinitions);
            this.stages = this._buildStages(generatedStageDefinitions.map((definition, index) => (
                this._mergeStageDefinition(definition, this.stageDefinitionOverrides[index + 1], index + 1)
            )));
        }
        this.stageIndex = 0;
        this.unlockedStageCount = this._loadUnlockedStageCount();
        this.stageButtons = [];

        this.selectedTool = 'rect';
        this.selectedBlock = null;
        this.placedBlocks = [];
        this.fixedBodies = [];
        this.goalSensor = null;
        this.spawnGuide = null;
        this.spawnDirectionArrow = null;
        this.ball = null;
        this.currentBallRadius = this.BALL_RADIUS;

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
        this._updateBallRadiusForViewport();
        this._bindEvents();
        this._registerCollision();
        this._renderStageListButtons();
        this._loadStage(0);

        this.Matter.Runner.run(this.runner, this.engine);
        this._tick();

        this._showHelpIfFirstTime();
        this._initToolDragGhost();
    }

    _buildStageDefinitions(total, overrides = {}) {
        const templates = [
            {
                spawn: { x: 70, y: 36 },
                spawnDirection: 'down',
                goal: { x: 270, y: 390, r: 24 },
                maxBlocks: 1,
                obstacles: []
            },
            {
                spawn: { x: 250, y: 40 },
                spawnDirection: 'down',
                goal: { x: 66, y: 390, r: 24 },
                maxBlocks: 2,
                obstacles: [
                    { type: 'rect', x: 160, y: 210, w: 110, h: 16, angle: -0.2 }
                ]
            },
            {
                spawn: { x: 26, y: 170 },
                spawnDirection: 'right',
                goal: { x: 280, y: 338, r: 22 },
                maxBlocks: 2,
                obstacles: [
                    { type: 'circle', x: 142, y: 222, r: 20 },
                    { type: 'rect', x: 222, y: 142, w: 84, h: 14, angle: 0.26 }
                ]
            },
            {
                spawn: { x: 296, y: 186 },
                spawnDirection: 'left',
                goal: { x: 42, y: 338, r: 22 },
                maxBlocks: 2,
                obstacles: [
                    { type: 'rect', x: 166, y: 206, w: 84, h: 14, angle: 0.2 }
                ]
            },
            {
                spawn: { x: 162, y: 396 },
                spawnDirection: 'left',
                goal: { x: 58, y: 44, r: 22 },
                maxBlocks: 2,
                obstacles: [
                    { type: 'circle', x: 92, y: 268, r: 18 },
                    { type: 'star', x: 236, y: 236, outerR: 22, innerR: 9, angle: -0.2 }
                ]
            }
        ];

        return Array.from({ length: total }, (_, index) => {
            const template = templates[index % templates.length];
            const variationStep = ((index * this.STAGE_VARIATION_STEP) % this.STAGE_VARIATION_SPAN) - this.STAGE_VARIATION_CENTER;
            const level = Math.floor(index / this.STAGE_LEVEL_STEP);
            const stageNumber = index + 1;

            const availableTools = stageNumber < this.CIRCLE_UNLOCK_STAGE
                ? ['rect']
                : stageNumber < this.STAR_UNLOCK_STAGE
                    ? ['rect', 'circle']
                    : ['rect', 'circle', 'star'];

            const spawn = {
                x: this._clampValue(template.spawn.x + variationStep * 0.55, 24, 296),
                y: this._clampValue(template.spawn.y + ((index % 5) - 2) * 5, 24, 396)
            };
            const goal = this._ensureReachableGoal(spawn, {
                x: this._clampValue(template.goal.x - variationStep * 0.58, 26, 294),
                y: this._clampValue(template.goal.y - ((index + 2) % 4) * 6, 30, 398),
                r: Math.max(this.MIN_GOAL_RADIUS, template.goal.r - Math.floor(level / 2))
            }, template.spawnDirection);
            const reducedBlockCount = template.maxBlocks - Math.floor(level / this.BLOCKS_DECREASE_INTERVAL);
            const stageMaxBlocks = stageNumber === 4
                ? Math.max(this.STAGE4_MIN_BLOCKS, reducedBlockCount)
                : Math.max(this.MIN_BLOCKS_PER_STAGE, reducedBlockCount);
            const generatedObstacles = [
                ...template.obstacles.map((obstacle, obstacleIndex) => (
                    this._createStageObstacleVariant(obstacle, index, obstacleIndex, level)
                )),
                ...this._buildDifficultyObstacles(level, index)
            ];
            if (stageNumber >= this.BUMPER_UNLOCK_STAGE) {
                generatedObstacles.push(this._buildBumperObstacle(index, level, spawn, goal));
            }
            const obstacles = this._balanceStageObstacles({
                obstacles: generatedObstacles,
                spawn,
                goal,
                stageNumber,
                level
            });

            const generatedDefinition = {
                spawn,
                spawnDirection: template.spawnDirection,
                spawnSpeed: ['left', 'right'].includes(template.spawnDirection)
                    ? this.SPAWN_SPEED_HORIZONTAL
                    : this.SPAWN_SPEED_VERTICAL,
                goal,
                maxBlocks: stageMaxBlocks,
                minRequiredBlocks: this.MIN_REQUIRED_BLOCKS,
                availableTools,
                obstacles
            };
            const stageOverride = overrides[stageNumber];
            return stageOverride
                ? this._mergeStageDefinition(generatedDefinition, stageOverride, stageNumber)
                : generatedDefinition;
        });
    }

    _buildStageDefinitionOverrides(total, generatedDefinitions) {
        const overrides = {};
        for (let index = 0; index < total; index += 1) {
            const stageNumber = index + 1;
            overrides[stageNumber] = this._buildTunedStageOverride(stageNumber, generatedDefinitions[index]);
        }
        return overrides;
    }

    _buildTunedStageOverride(stageNumber, generatedDefinition) {
        const stageProgress = (stageNumber - 1) / Math.max(1, this.STAGE_TOTAL - 1);
        const difficultyTier = Math.floor((stageNumber - 1) / 10);
        const seed = stageNumber * this.STAGE_TUNING_SEED_MULTIPLIER;
        const spawn = {
            x: this._clampValue(
                generatedDefinition.spawn.x + (((seed % 9) - 4) * 1.6),
                24,
                296
            ),
            y: this._clampValue(
                generatedDefinition.spawn.y + ((((seed >> 2) % 9) - 4) * 1.3),
                24,
                396
            )
        };
        const goalRadius = this._clampValue(
            generatedDefinition.goal.r - Math.floor(difficultyTier / 2) + ((stageNumber % 3) - 1),
            this.MIN_GOAL_RADIUS,
            24
        );
        const goal = this._ensureReachableGoal(
            spawn,
            {
                x: this._clampValue(
                    generatedDefinition.goal.x + ((((seed >> 1) % 11) - 5) * 1.4),
                    26,
                    294
                ),
                y: this._clampValue(
                    generatedDefinition.goal.y + ((((seed >> 3) % 11) - 5) * 1.4),
                    30,
                    398
                ),
                r: goalRadius
            },
            generatedDefinition.spawnDirection
        );
        const tunedMaxBlocks = this._tuneStageMaxBlocks(stageNumber, generatedDefinition.maxBlocks);
        const obstacles = this._tuneStageObstaclesForOverride({
            stageNumber,
            obstacles: generatedDefinition.obstacles,
            spawn,
            goal,
            difficultyTier
        });
        const availableTools = stageNumber < this.CIRCLE_UNLOCK_STAGE
            ? ['rect']
            : stageNumber < this.STAR_UNLOCK_STAGE
                ? ['rect', 'circle']
                : ['rect', 'circle', 'star'];
        const speedBias = 0.92 + (stageProgress * 0.18);
        const baseSpeed = generatedDefinition.spawnSpeed || (
            ['left', 'right'].includes(generatedDefinition.spawnDirection)
                ? this.SPAWN_SPEED_HORIZONTAL
                : this.SPAWN_SPEED_VERTICAL
        );

        return {
            spawn,
            spawnDirection: generatedDefinition.spawnDirection,
            spawnSpeed: Number((baseSpeed * speedBias).toFixed(3)),
            goal,
            maxBlocks: tunedMaxBlocks,
            minRequiredBlocks: 1,
            availableTools,
            obstacles
        };
    }

    _tuneStageMaxBlocks(stageNumber, baseMaxBlocks) {
        if (stageNumber <= 4) return Math.max(2, Math.min(3, baseMaxBlocks + 1));
        if (stageNumber <= 15) return Math.max(2, Math.min(3, baseMaxBlocks));
        if (stageNumber <= 40) return Math.max(1, Math.min(3, baseMaxBlocks));
        if (stageNumber <= 75) return Math.max(1, Math.min(2, baseMaxBlocks));
        return 1;
    }

    _tuneStageObstaclesForOverride({ stageNumber, obstacles, spawn, goal, difficultyTier }) {
        if (!Array.isArray(obstacles) || obstacles.length === 0) return [];
        if (stageNumber === 1) return [];

        const maxObstacles = this._getObstacleCapForStage(stageNumber);
        const seeded = obstacles.map((obstacle, index) => {
            const seed = (
                (stageNumber * this.OBSTACLE_STAGE_SEED_MULTIPLIER)
                + (index * this.OBSTACLE_INDEX_SEED_MULTIPLIER)
            );
            const routeRatio = (index + 1) / (obstacles.length + 1);
            const routeX = spawn.x + ((goal.x - spawn.x) * routeRatio);
            const routeY = spawn.y + ((goal.y - spawn.y) * routeRatio);
            const blendWeight = stageNumber <= 8 ? 0.34 : 0.52;
            const lateral = ((seed % 7) - 3) * (stageNumber <= 20 ? 3.2 : 4.6);
            const tuned = {
                ...obstacle,
                x: this._clampValue((obstacle.x * (1 - blendWeight)) + (routeX * blendWeight), 24, 296),
                y: this._clampValue((obstacle.y * (1 - blendWeight)) + (routeY * blendWeight) + lateral, 44, 396),
                angle: (obstacle.angle || 0) + ((((seed >> 1) % 5) - 2) * 0.03)
            };

            if (tuned.type === 'rect') {
                tuned.w = this._clampValue(
                    tuned.w - difficultyTier * 1.4,
                    this.DIFFICULTY_MIN_OBSTACLE_WIDTH,
                    this.DIFFICULTY_MAX_OBSTACLE_WIDTH
                );
            } else if (tuned.type === 'circle' || tuned.type === 'bumper') {
                tuned.r = Math.max(this.MIN_OBSTACLE_RADIUS, (tuned.r || 16) - Math.floor(difficultyTier / 2));
            } else if (tuned.type === 'star') {
                tuned.outerR = Math.max(this.MIN_OBSTACLE_RADIUS + 4, (tuned.outerR || 20) - Math.floor(difficultyTier / 2));
                tuned.innerR = Math.max(this.MIN_OBSTACLE_INNER_RADIUS, (tuned.innerR || 8) - Math.floor(difficultyTier / 3));
            }
            return tuned;
        });

        const balanced = this._balanceStageObstacles({
            obstacles: seeded,
            spawn,
            goal,
            stageNumber,
            level: difficultyTier
        }).slice(0, maxObstacles);

        if (stageNumber >= this.BUMPER_UNLOCK_STAGE && !balanced.some((obstacle) => obstacle.type === 'bumper')) {
            balanced.push(this._buildBumperObstacle(stageNumber - 1, difficultyTier, spawn, goal));
        }

        if (stageNumber === 4) {
            return [
                { type: 'rect', x: 166, y: 214, w: 72, h: 14, angle: 0.14 }
            ];
        }

        return balanced;
    }

    _mergeStageDefinition(base, override, stageNumber = null) {
        if (!override || typeof override !== 'object') return base;
        if (Array.isArray(override)) {
            const stageLabel = (stageNumber === null || stageNumber === undefined) ? '' : ` for stage ${stageNumber}`;
            console.warn(`Invalid stage override format${stageLabel}: expected object but received array.`);
            return base;
        }
        const mergedSpawn = this._mergeObject(base.spawn, override.spawn);
        const mergedGoal = this._mergeObject(base.goal, override.goal);
        const mergedObstacles = Array.isArray(override.obstacles)
            ? override.obstacles.map((obstacle) => this._cloneValue(obstacle))
            : base.obstacles.map((obstacle) => this._cloneValue(obstacle));
        const mergedTools = Array.isArray(override.availableTools)
            ? [...override.availableTools]
            : [...base.availableTools];

        return {
            ...base,
            ...override,
            spawn: mergedSpawn,
            goal: mergedGoal,
            obstacles: mergedObstacles,
            availableTools: mergedTools
        };
    }

    _mergeObject(baseValue, overrideValue) {
        if (!overrideValue || typeof overrideValue !== 'object' || Array.isArray(overrideValue)) {
            return { ...baseValue };
        }
        return { ...baseValue, ...overrideValue };
    }

    _cloneValue(value) {
        if (value === null || value === undefined || typeof value !== 'object') return value;
        if (typeof structuredClone === 'function') return structuredClone(value);
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_error) {
            return Array.isArray(value) ? [...value] : { ...value };
        }
    }

    _ensureReachableGoal(spawn, goal, spawnDirection) {
        const minDrop = ['left', 'right'].includes(spawnDirection)
            ? this.REACHABLE_GOAL_MIN_DROP - this.HORIZONTAL_SPAWN_DROP_ADJUSTMENT
            : this.REACHABLE_GOAL_MIN_DROP;
        return {
            ...goal,
            y: this._clampValue(Math.max(goal.y, spawn.y + minDrop), 30, 398)
        };
    }

    _buildBumperObstacle(stageIndex, level, spawn, goal) {
        const ratioVariation = (
            ((stageIndex % this.BUMPER_VARIATION_PERIOD) - this.BUMPER_VARIATION_OFFSET)
            / this.BUMPER_VARIATION_OFFSET
        ) * this.BUMPER_PATH_RATIO_VARIATION;
        const progress = this._clampValue(
            this.BUMPER_PATH_RATIO_BASE + ratioVariation,
            this.BUMPER_PATH_RATIO_MIN,
            this.BUMPER_PATH_RATIO_MAX
        );
        const baseX = spawn.x + ((goal.x - spawn.x) * progress);
        const baseY = spawn.y + ((goal.y - spawn.y) * progress);
        return {
            type: 'bumper',
            x: this._clampValue(
                baseX + ((((stageIndex * this.BUMPER_X_VARIATION_STEP) % this.BUMPER_X_VARIATION_SPAN) - (this.BUMPER_X_VARIATION_SPAN / 2)) * this.BUMPER_X_JITTER_SCALE),
                36,
                284
            ),
            y: this._clampValue(
                baseY + ((((stageIndex * this.BUMPER_Y_VARIATION_STEP) % this.BUMPER_Y_VARIATION_SPAN) - (this.BUMPER_Y_VARIATION_SPAN / 2)) * this.BUMPER_Y_JITTER_SCALE),
                78,
                386
            ),
            r: Math.max(
                this.MIN_OBSTACLE_RADIUS + this.BUMPER_RADIUS_BONUS,
                this.BUMPER_BASE_RADIUS - Math.floor(level / this.BUMPER_RADIUS_DECREASE_INTERVAL)
            )
        };
    }

    _balanceStageObstacles({ obstacles, spawn, goal, stageNumber, level }) {
        if (!Array.isArray(obstacles) || obstacles.length === 0) return [];
        const routeBand = this._clampValue(
            this.OBSTACLE_ROUTE_BAND_BASE - (level * this.OBSTACLE_ROUTE_BAND_DECREASE_RATE),
            this.OBSTACLE_ROUTE_BAND_MIN,
            this.OBSTACLE_ROUTE_BAND_BASE
        );
        const spawnClearance = this.OBSTACLE_MIN_SPAWN_CLEARANCE;
        const goalClearance = this.OBSTACLE_MIN_GOAL_CLEARANCE;
        const maxObstacles = this._getObstacleCapForStage(stageNumber);

        const meaningful = obstacles
            .filter((obstacle) => {
                const point = { x: obstacle.x, y: obstacle.y };
                const distanceFromSpawn = this._distanceBetweenPoints(point, spawn);
                const distanceFromGoal = this._distanceBetweenPoints(point, goal);
                const distanceToRoute = this._distancePointToSegment(point, spawn, goal);
                const routeAllowance = obstacle.type === 'bumper'
                    ? routeBand + this.BUMPER_ROUTE_ALLOWANCE_BONUS
                    : routeBand;
                return (
                    distanceFromSpawn >= spawnClearance
                    && distanceFromGoal >= goalClearance
                    && distanceToRoute <= routeAllowance
                );
            });
        if (
            stageNumber <= this.NON_BUMPER_GUARANTEE_STAGE_LIMIT
            && meaningful.every((obstacle) => obstacle.type === 'bumper')
        ) {
            const fallbackNonBumper = obstacles
                .filter((obstacle) => obstacle.type !== 'bumper')
                .sort((a, b) => this._obstacleScore(a, spawn, goal) - this._obstacleScore(b, spawn, goal))[0];
            if (fallbackNonBumper) {
                meaningful.push(fallbackNonBumper);
            }
        }
        if (stageNumber >= this.BUMPER_UNLOCK_STAGE && !meaningful.some((obstacle) => obstacle.type === 'bumper')) {
            meaningful.push(this._buildBumperObstacle(stageNumber - 1, level, spawn, goal));
        }
        meaningful.sort((a, b) => this._obstacleScore(a, spawn, goal) - this._obstacleScore(b, spawn, goal));

        const selected = [];
        let bumperAdded = false;
        meaningful.forEach((obstacle) => {
            if (selected.length >= maxObstacles) return;
            const point = { x: obstacle.x, y: obstacle.y };
            const tooClose = selected.some((picked) => {
                const pickedPoint = { x: picked.x, y: picked.y };
                return this._distanceBetweenPoints(point, pickedPoint) < this.OBSTACLE_MIN_SEPARATION;
            });
            if (tooClose) return;
            if (obstacle.type === 'bumper') {
                if (bumperAdded) return;
                bumperAdded = true;
            }
            selected.push(obstacle);
        });

        if (stageNumber >= this.BUMPER_UNLOCK_STAGE && selected.length < maxObstacles) {
            if (!bumperAdded) {
                const bumper = meaningful.find((obstacle) => obstacle.type === 'bumper');
                if (bumper) {
                    selected.push(bumper);
                }
            }
            if (selected.length < maxObstacles) {
                const nonBumper = meaningful.find((obstacle) => obstacle.type !== 'bumper' && !selected.includes(obstacle));
                if (nonBumper) {
                    selected.push(nonBumper);
                }
            }
        }

        if (selected.length === 0) {
            return obstacles.slice(0, Math.min(maxObstacles, 1));
        }
        return selected;
    }

    _obstacleScore(obstacle, spawn, goal) {
        const point = { x: obstacle.x, y: obstacle.y };
        const routeDistance = this._distancePointToSegment(point, spawn, goal);
        const centerDistance = Math.abs(this._distanceBetweenPoints(point, spawn) - this._distanceBetweenPoints(point, goal));
        const bumperBias = obstacle.type === 'bumper' ? 2 : 0;
        return routeDistance + (centerDistance * this.OBSTACLE_CENTER_DISTANCE_WEIGHT) + bumperBias;
    }

    _getObstacleCapForStage(stageNumber) {
        if (stageNumber <= 1) return 0;
        if (stageNumber <= 4) return 1;
        if (stageNumber <= 8) return 2;
        if (stageNumber <= 20) return 3;
        if (stageNumber <= 50) return 4;
        return 5;
    }

    _distanceBetweenPoints(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
    }

    _distancePointToSegment(point, segmentStart, segmentEnd) {
        const segmentX = segmentEnd.x - segmentStart.x;
        const segmentY = segmentEnd.y - segmentStart.y;
        const segmentLengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
        if (!segmentLengthSquared) return this._distanceBetweenPoints(point, segmentStart);

        const projection = (
            ((point.x - segmentStart.x) * segmentX)
            + ((point.y - segmentStart.y) * segmentY)
        ) / segmentLengthSquared;
        const t = this._clampValue(projection, 0, 1);
        const closest = {
            x: segmentStart.x + (segmentX * t),
            y: segmentStart.y + (segmentY * t)
        };
        return this._distanceBetweenPoints(point, closest);
    }

    _buildStages(stageDefinitions) {
        return stageDefinitions.map((definition) => ({
            spawn: { ...definition.spawn },
            spawnDirection: this._resolveSpawnDirection(definition),
            spawnSpeed: definition.spawnSpeed,
            goal: { ...definition.goal },
            maxBlocks: definition.maxBlocks,
            minRequiredBlocks: definition.minRequiredBlocks ?? this.MIN_REQUIRED_BLOCKS,
            availableTools: [...(definition.availableTools ?? this.DEFAULT_AVAILABLE_TOOLS)],
            obstacles: (definition.obstacles ?? []).map((obstacle) => ({ ...obstacle }))
        }));
    }

    _resolveSpawnDirection(definition) {
        const direction = definition.spawnDirection || this.DEFAULT_SPAWN_DIRECTION;
        if (direction !== 'up') return direction;
        const spawnX = Number(definition?.spawn?.x);
        const goalX = Number(definition?.goal?.x);
        if (!Number.isFinite(spawnX) || !Number.isFinite(goalX)) {
            console.warn('Invalid stage coordinates for upward spawn; falling back to default spawn direction.', definition);
            return this.DEFAULT_SPAWN_DIRECTION;
        }
        return goalX < spawnX ? 'left' : 'right';
    }

    _areValidExternalStageDefinitions(stageDefinitions) {
        return isValidStageDefinitions(stageDefinitions, this.STAGE_TOTAL);
    }

    _createStageObstacleVariant(obstacle, stageIndex, obstacleIndex, level) {
        const offset = ((stageIndex + obstacleIndex * this.OBSTACLE_VARIATION_MULTIPLIER) % this.OBSTACLE_VARIATION_SPAN) - this.OBSTACLE_VARIATION_CENTER;
        const base = {
            ...obstacle,
            x: this._clampValue(obstacle.x + offset * 4, 24, 296),
            y: this._clampValue(obstacle.y + ((stageIndex + obstacleIndex) % 3) * 10, 44, 396),
            angle: (obstacle.angle || 0) + (((stageIndex + obstacleIndex) % 2 === 0 ? 1 : -1) * level * 0.01)
        };

        if (obstacle.type === 'rect') {
            return {
                ...base,
                w: this._clampValue(
                    obstacle.w - level * this.DIFFICULTY_OBSTACLE_WIDTH_STEP,
                    this.DIFFICULTY_MIN_OBSTACLE_WIDTH,
                    this.DIFFICULTY_MAX_OBSTACLE_WIDTH
                ),
                h: obstacle.h
            };
        }

        if (obstacle.type === 'circle') {
            return {
                ...base,
                r: Math.max(this.MIN_OBSTACLE_RADIUS, obstacle.r - Math.floor(level / 2))
            };
        }

        if (obstacle.type === 'star') {
            return {
                ...base,
                outerR: Math.max(this.MIN_OBSTACLE_RADIUS + 4, obstacle.outerR - Math.floor(level / 2)),
                innerR: Math.max(this.MIN_OBSTACLE_INNER_RADIUS, obstacle.innerR - Math.floor(level / 3))
            };
        }

        if (obstacle.type === 'bumper') {
            return {
                ...base,
                r: Math.max(this.MIN_OBSTACLE_RADIUS + 2, (obstacle.r || 16) - Math.floor(level / 3))
            };
        }

        return base;
    }

    _buildDifficultyObstacles(level, stageIndex) {
        if (level <= 0) return [];
        const obstacles = [];
        const count = Math.min(this.MAX_EXTRA_OBSTACLES, level);
        for (let index = 0; index < count; index += 1) {
            const shapeSelector = (stageIndex + index) % 3;
            if (shapeSelector === 0) {
                obstacles.push({
                    type: 'rect',
                    x: this._clampValue(76 + index * 92 + (stageIndex % 4) * 4, 26, 294),
                    y: this._clampValue(146 + index * 54, 54, 394),
                    w: this._clampValue(
                        this.DIFFICULTY_BASE_OBSTACLE_WIDTH - level * this.DIFFICULTY_OBSTACLE_WIDTH_STEP,
                        this.DIFFICULTY_MIN_OBSTACLE_WIDTH,
                        this.DIFFICULTY_MAX_OBSTACLE_WIDTH
                    ),
                    h: 14,
                    angle: ((index % 2 === 0 ? 1 : -1) * 0.15) + level * 0.02
                });
            } else if (shapeSelector === 1) {
                obstacles.push({
                    type: 'circle',
                    x: this._clampValue(92 + index * 86 + (stageIndex % 3) * 6, 28, 292),
                    y: this._clampValue(170 + index * 52, 56, 392),
                    r: Math.max(this.MIN_OBSTACLE_RADIUS, 18 - Math.floor(level / 2))
                });
            } else {
                obstacles.push({
                    type: 'star',
                    x: this._clampValue(102 + index * 88 + (stageIndex % 4) * 5, 30, 290),
                    y: this._clampValue(178 + index * 50, 58, 390),
                    outerR: Math.max(this.MIN_OBSTACLE_RADIUS + 4, 22 - Math.floor(level / 2)),
                    innerR: Math.max(this.MIN_OBSTACLE_INNER_RADIUS, 9 - Math.floor(level / 3)),
                    angle: (index % 2 === 0 ? 1 : -1) * 0.2
                });
            }
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
        this._updateBallRadiusForViewport();
        this.render.canvas.width = newWidth;
        this.render.canvas.height = newHeight;
        this.render.options.width = newWidth;
        this.render.options.height = newHeight;
        this._loadStage(this.stageIndex);
    }

    _updateBallRadiusForViewport() {
        const isMobile = window.matchMedia(`(max-width: ${this.MOBILE_LAYOUT_MAX_WIDTH}px)`).matches;
        const mobileBallRadius = Math.max(this.MIN_MOBILE_BALL_RADIUS, Math.round(this.BALL_RADIUS * this.MOBILE_BALL_RADIUS_SCALE));
        this.currentBallRadius = isMobile ? mobileBallRadius : this.BALL_RADIUS;
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
            const point = this._scaledStagePoint(obstacle);
            let body = null;
            if (obstacle.type === 'rect') {
                const width = (obstacle.w / this.STAGE_BASE_WIDTH) * this.width;
                const height = (obstacle.h / this.STAGE_BASE_HEIGHT) * this.height;
                body = this.Matter.Bodies.rectangle(point.x, point.y, width, height, {
                    isStatic: true,
                    angle: obstacle.angle || 0,
                    restitution: 0.9,
                    friction: 0.1,
                    render: { fillStyle: '#f59e0b' }
                });
            } else if (obstacle.type === 'circle') {
                const radius = this._scaledStageRadius(obstacle.r, this.MIN_OBSTACLE_RADIUS);
                body = this.Matter.Bodies.circle(point.x, point.y, radius, {
                    isStatic: true,
                    restitution: 0.9,
                    friction: 0.08,
                    render: { fillStyle: '#0ea5e9' }
                });
            } else if (obstacle.type === 'star') {
                const outerRadius = this._scaledStageRadius(obstacle.outerR, this.MIN_OBSTACLE_RADIUS + 4);
                const innerRadius = this._scaledStageRadius(obstacle.innerR, this.MIN_OBSTACLE_INNER_RADIUS);
                const vertices = this._createStarVertices(outerRadius, innerRadius);
                body = this.Matter.Bodies.fromVertices(point.x, point.y, [vertices], {
                    isStatic: true,
                    restitution: 0.9,
                    friction: 0.08,
                    render: { fillStyle: '#f59e0b' }
                }, true);
                if (Array.isArray(body)) {
                    [body] = body;
                }
                if (body && obstacle.angle) {
                    this.Matter.Body.setAngle(body, obstacle.angle);
                }
            } else if (obstacle.type === 'bumper') {
                const radius = this._scaledStageRadius(obstacle.r, this.MIN_OBSTACLE_RADIUS + 2);
                body = this.Matter.Bodies.circle(point.x, point.y, radius, {
                    isStatic: true,
                    restitution: this.BUMPER_RESTITUTION,
                    friction: 0.02,
                    render: { fillStyle: '#ec4899', strokeStyle: '#9d174d', lineWidth: 3 }
                });
            }
            if (!body) return;
            this.fixedBodies.push(body);
        });
        this.Matter.World.add(this.world, this.fixedBodies);
    }

    _createStarVertices(outerRadius, innerRadius, points = 5) {
        const vertices = [];
        const step = Math.PI / points;
        for (let index = 0; index < points * 2; index += 1) {
            const radius = index % 2 === 0 ? outerRadius : innerRadius;
            const angle = (index * step) - (Math.PI / 2);
            vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        return vertices;
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
        this._updateSpawnDirectionArrow(safePoint);
    }

    _updateSpawnDirectionArrow(point) {
        if (!this.spawnDirectionArrow) {
            this.spawnDirectionArrow = document.createElement('div');
            this.spawnDirectionArrow.className = 'spawn-direction-arrow';
            this.playArea.appendChild(this.spawnDirectionArrow);
        }
        const direction = this.stage.spawnDirection || this.DEFAULT_SPAWN_DIRECTION;
        const symbols = {
            up: '↑',
            down: '↓',
            left: '←',
            right: '→'
        };
        this.spawnDirectionArrow.textContent = symbols[direction] || symbols.down;
        this.spawnDirectionArrow.style.left = `${point.x}px`;
        this.spawnDirectionArrow.style.top = `${point.y}px`;
    }

    _onPointerDown(event) {
        if (event.cancelable) event.preventDefault();
        if (this.isStarted) return;

        const point = this._clientToPlayAreaPoint(event.clientX, event.clientY);
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
                moved: false,
                isOutside: false
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

        const rawPoint = this._clientToPlayAreaPointRaw(event.clientX, event.clientY);
        if (!rawPoint) return;

        if (!this.blockPointerState.moved) {
            const dx = rawPoint.x - this.blockPointerState.startPoint.x;
            const dy = rawPoint.y - this.blockPointerState.startPoint.y;
            const movedDistanceSquared = (dx * dx) + (dy * dy);
            if (movedDistanceSquared >= this.BLOCK_TAP_MOVE_THRESHOLD_SQUARED) {
                this.blockPointerState.moved = true;
                this.draggingBlock = this.blockPointerState.block;
            }
        }

        if (!this.blockPointerState.moved || !this.draggingBlock) return;
        this.blockPointerState.isOutside = this._isPointOutsidePlayArea(rawPoint, this.DRAG_DELETE_OUTSIDE_MARGIN);
        const safePoint = this._clampBodyPosition(this.draggingBlock, rawPoint);
        this.Matter.Body.setPosition(this.draggingBlock, safePoint);
        this.draggingBlock.render.opacity = this.blockPointerState.isOutside ? 0.45 : 1;
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
        } else if (
            !this.isStarted
            && this.blockPointerState
            && this.blockPointerState.pointerId === event?.pointerId
            && this.blockPointerState.moved
            && this.blockPointerState.block
            && this.blockPointerState.isOutside
        ) {
            this._removePlacedBlock(this.blockPointerState.block);
        }
        if (this.blockPointerState?.block) {
            this.blockPointerState.block.render.opacity = 1;
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
        const point = this._clientToPlayAreaPointRaw(clientX, clientY);
        if (!point) return null;
        if (this._isPointOutsidePlayArea(point)) return null;
        return point;
    }

    /**
     * Returns pointer coordinates in play-area local space without bounds checks.
     * Use `_clientToPlayAreaPoint` when the pointer must be inside the play area.
     */
    _clientToPlayAreaPointRaw(clientX, clientY) {
        const rect = this.playArea.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return { x, y };
    }

    _isPointOutsidePlayArea(point, margin = 0) {
        // Margin allows treating points just beyond the visible frame as "outside"
        // (used for drag-to-delete without requiring a large off-screen movement).
        return (
            point.x < -margin
            || point.y < -margin
            || point.x > this.width + margin
            || point.y > this.height + margin
        );
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

    _removePlacedBlock(block) {
        if (!block) return;
        this.Matter.World.remove(this.world, block);
        this.placedBlocks = this.placedBlocks.filter((body) => body !== block);
        if (this.selectedBlock === block) {
            this.selectedBlock = null;
        }
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
        const ballRadius = this.currentBallRadius || this.BALL_RADIUS;
        const safeSpawn = this._clampCircleCenter(this._scaledStagePoint(this.stage.spawn), ballRadius);
        this.ball = this.Matter.Bodies.circle(safeSpawn.x, safeSpawn.y, ballRadius, {
            label: 'ball',
            restitution: 0.8,
            friction: 0.008,
            frictionAir: 0.009,
            density: 0.002,
            render: { fillStyle: '#ef4444' }
        });
        this.Matter.World.add(this.world, this.ball);
        const initialVelocity = this._getSpawnInitialVelocity();
        if (initialVelocity.x !== 0 || initialVelocity.y !== 0) {
            this.Matter.Body.setVelocity(this.ball, initialVelocity);
        }
    }

    _getSpawnInitialVelocity() {
        const direction = this.stage.spawnDirection || this.DEFAULT_SPAWN_DIRECTION;
        const speed = Math.max(0.1, this.stage.spawnSpeed || this.SPAWN_SPEED_VERTICAL);
        if (direction === 'right') {
            return { x: Math.abs(speed), y: this.SPAWN_VERTICAL_BIAS };
        }
        if (direction === 'left') {
            return { x: -Math.abs(speed), y: this.SPAWN_VERTICAL_BIAS };
        }
        if (direction === 'up') {
            return { x: 0, y: -Math.abs(speed) };
        }
        return { x: 0, y: Math.abs(speed) * this.SPAWN_DOWNWARD_SCALE };
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
        this.clearOverlayGeneration += 1;
        const overlayGeneration = this.clearOverlayGeneration;
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
            const horizontalSpeed = Math.abs(this.ball.velocity.x);
            if (
                this.ball.velocity.y > this.DOWNHILL_MIN_VERTICAL_SPEED
                && horizontalSpeed > this.DOWNHILL_MIN_HORIZONTAL_SPEED
                && horizontalSpeed < this.DOWNHILL_MAX_HORIZONTAL_SPEED
            ) {
                this.Matter.Body.setVelocity(this.ball, {
                    x: this.ball.velocity.x * this.DOWNHILL_ACCEL_FACTOR,
                    y: this.ball.velocity.y
                });
            }
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
    (async () => {
        let stageDefinitions = null;
        try {
            const response = await fetch(resolveAssetPath(window.__assetBase, 'stages.json'));
            if (!response.ok) {
                throw new Error(`Failed to fetch stage definitions: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (!isValidStageDefinitions(data)) {
                throw new Error('Invalid stage definitions format');
            }
            stageDefinitions = data;
        } catch (error) {
            console.warn('Using built-in stage definitions because stages.json could not be loaded.', error);
        }

        new KorokoroReflect({ stageDefinitions });
    })();
});
