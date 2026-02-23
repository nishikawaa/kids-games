class FaceDetectionGame {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.modeSelect = document.getElementById('modeSelect');
        this.mirrorToggle = document.getElementById('mirrorToggle');
        this.cameraBtn = document.getElementById('cameraBtn');
        this.cameraSelect = document.getElementById('cameraSelect');
        this.helpBtn = document.getElementById('helpBtn');
        this.helpModal = document.getElementById('helpModal');
        this.helpCloseBtn = document.getElementById('helpCloseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.gameOverDiv = document.getElementById('gameOver');
        this.gameOverTitleEl = document.getElementById('gameOverTitle');
        this.finalLabelEl = document.getElementById('finalLabel');
        this.scoreEl = document.getElementById('score');
        this.levelEl = document.getElementById('level');
        this.timeEl = document.getElementById('time');
        this.finalScoreEl = document.getElementById('finalScore');

        this.dpr = window.devicePixelRatio || 1;
        this.logicalWidth = 0;
        this.logicalHeight = 0;
        this.availableCameras = [];
        this.selectedDeviceId = '';
        this.mirrorMode = false;
        this.startBtnDefaultText = this.startBtn.textContent;
        
        this.score = 0;
        this.level = 1;
        this.gameTime = 0;
        this.isGameRunning = false;
        this.isPaused = false;
        this.isHelpOpen = false;
        this.wasPausedBeforeHelp = false;
        this.isCountingDown = false;
        this.countdownStartTs = 0;
        this.countdownDurationMs = 3000;
        this.isCameraOn = false;
        this.faceDetector = null;
        this.faceBoxDetector = null;
        this.stream = null;
        this.lastFrameTs = 0;
        this.startTimeTs = 0;
        this.pausedTime = 0;  // 一時停止中の累積時間
        this.pauseStartTs = 0; // 一時停止開始時刻
        this.lastFaceDetectTs = 0;
        this.faceDetectIntervalMs = 120;
        this.isDetectingFace = false;
        this.lastFaceSeenTs = 0;
        this.lastFaceError = '';
        this.debugFace = null;
        this.flipHorizontal = false;
        this.lastDetectorUsed = '';

        // ゲームモード
        this.modeConfigs = {
            easy: {
                label: 'やさしい',
                enemySpawnIntervalMul: 1.35,
                enemySpeedMul: 0.85,
                bigEnemyChance: 0.10,
                timeLimitSec: 0,
                spawnCount: 1,
                allowScore: true,
                minEnemySpawnIntervalMs: 650
            },
            normal: {
                label: 'ふつう',
                enemySpawnIntervalMul: 1.0,
                enemySpeedMul: 1.0,
                bigEnemyChance: 0.18,
                timeLimitSec: 0,
                spawnCount: 1,
                allowScore: true,
                minEnemySpawnIntervalMs: 650
            },
            challenge: {
                label: 'チャレンジ',
                // 鬼モード: 出現数増 + 高速化
                enemySpawnIntervalMul: 0.42,
                enemySpeedMul: 2.2,
                bigEnemyChance: 0.55,
                timeLimitSec: 30,
                spawnCount: 5,
                allowScore: false,
                minEnemySpawnIntervalMs: 420
            }
        };
        this.gameMode = (this.modeSelect && this.modeSelect.value) ? this.modeSelect.value : 'normal';

        // 左右反転チェック: ONのとき「現実と逆（非ミラー）」の映像にする。
        // mirrorMode は「映像をミラー表示するか」を表す（チェックONではfalse）。
        if (this.mirrorToggle) {
            this.mirrorMode = !this.mirrorToggle.checked;
        }
        
        this.player = {
            x: 0,
            y: 0,
            size: 40,
            targetX: 0,
            targetY: 0
        };
        
        this.enemies = [];
        this.lastEnemySpawn = 0;
        this.enemySpawnInterval = 2000;
        this.enemyId = 0;
        this.baseEnemySize = 30;

        this.items = [];
        this.itemId = 0;
        this.lastItemSpawn = 0;
        this.itemSpawnInterval = 7000;
        this.itemLifetimeMs = 5000;

        this.clearEffectStartTs = 0;
        this.clearEffectDurationMs = 550;
        this.speedDebuffUntilTs = 0;

        // レベルアップ演出
        this.levelUpTs = 0;
        this.levelUpDurationMs = 1500;

        // ポジティブアイテム効果
        this.shieldUntilTs = 0;
        this.slowUntilTs = 0;
        this.bonusScoreTs = 0;
        this.bonusScoreDurationMs = 800;

        // 褒めメッセージ
        this.praiseMessages = [
            'すごい！', 'がんばってるね！', 'いいね！', 
            'さいこう！', 'ナイス！', 'かっこいい！'
        ];
        this.currentPraiseMsg = '';
        this.praiseTs = 0;
        this.praiseDurationMs = 1200;
        this.lastPraiseTriggerTime = 0;

        // パーティクル
        this.particles = [];
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.applyMirrorMode();
        this.resetGameState();
        this.render();
        this.refreshCameraDevices();
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    setupCanvas() {
        this.dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.logicalWidth = Math.max(1, Math.floor(rect.width));
        this.logicalHeight = Math.max(1, Math.floor(rect.height));

        const displayW = Math.floor(this.logicalWidth * this.dpr);
        const displayH = Math.floor(this.logicalHeight * this.dpr);
        if (this.canvas.width !== displayW) this.canvas.width = displayW;
        if (this.canvas.height !== displayH) this.canvas.height = displayH;

        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        if (!this.isGameRunning) {
            this.player.x = this.logicalWidth * 0.5;
            this.player.y = this.logicalHeight * 0.5;
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
        }
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        if (this.modeSelect) this.modeSelect.addEventListener('change', () => this.handleModeSelection());
        if (this.mirrorToggle) this.mirrorToggle.addEventListener('change', () => this.handleMirrorToggle());
        this.cameraBtn.addEventListener('click', () => this.toggleCamera());
        this.restartBtn.addEventListener('click', () => this.returnToStart());
        this.cameraSelect.addEventListener('change', () => this.handleCameraSelection());
        if (this.helpBtn) this.helpBtn.addEventListener('click', () => this.openHelp());
        if (this.helpCloseBtn) this.helpCloseBtn.addEventListener('click', () => this.closeHelp());
        if (this.helpModal) {
            this.helpModal.addEventListener('click', (e) => {
                if (e.target === this.helpModal) this.closeHelp();
            });
        }
        
        window.addEventListener('resize', () => this.setupCanvas());
        if (navigator.mediaDevices?.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', () => this.refreshCameraDevices());
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeHelp();
            }
            if (e.key === ' ' || e.key === 'Spacebar') { // スペースキーでも一時停止切り替え
                e.preventDefault();
                this.togglePause();
            }
        });
    }

    togglePause() {
        if (!this.isGameRunning || this.isCountingDown) return;
        
        const now = performance.now();
        if (!this.isPaused) {
            // 一時停止開始
            this.isPaused = true;
            this.pauseStartTs = now;
        } else {
            // 一時停止解除
            this.isPaused = false;
            // 一時停止していた時間を累積
            this.pausedTime += now - this.pauseStartTs;
        }
        this.updatePauseButton();
    }

    handleModeSelection() {
        if (!this.modeSelect) return;
        if (this.isGameRunning || this.isCountingDown) {
            // 念のため戻す（基本はdisabledで変更できない）
            this.modeSelect.value = this.gameMode;
            return;
        }
        const v = this.modeSelect.value;
        this.gameMode = (v && this.modeConfigs[v]) ? v : 'normal';
        this.modeSelect.value = this.gameMode;
        this.updateModeSelect();
    }

    getModeConfig() {
        const base = this.modeConfigs[this.gameMode] || this.modeConfigs.normal;

        // スマホは画面が小さく操作も難しいので、鬼モードだけ少し弱める（PCはそのまま）
        if (this.gameMode === 'challenge' && this.isMobileLike()) {
            return {
                ...base,
                enemySpawnIntervalMul: 0.55,
                enemySpeedMul: 1.8,
                bigEnemyChance: 0.45,
                spawnCount: 3,
                minEnemySpawnIntervalMs: 520
            };
        }

        return base;
    }

    isMobileLike() {
        // pointer:coarse はタッチ端末の判定に使える（iOS/Androidの想定）
        try {
            if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
        } catch (_) {
        }
        return (window.innerWidth || 0) <= 900;
    }

    handleMirrorToggle() {
        if (!this.mirrorToggle) return;
        // チェックON => 非ミラー（現実と逆） / チェックOFF => ミラー（鏡）
        this.mirrorMode = !this.mirrorToggle.checked;
        this.applyMirrorMode();
    }

    applyMirrorMode() {
        // 映像表示を左右反転。顔検出側も flipHorizontal を同期して“見た目と操作”を一致させる。
        if (this.video) {
            this.video.style.transform = this.mirrorMode ? 'scaleX(-1)' : 'none';
        }

        // デバッグ表示用（実際の flip は estimateFaces の引数で切り替える）
        this.flipHorizontal = this.mirrorMode;
    }

    openHelp() {
        if (!this.helpModal) return;
        this.isHelpOpen = true;
        this.wasPausedBeforeHelp = this.isPaused;
        if (!this.wasPausedBeforeHelp && this.isGameRunning && !this.isCountingDown) {
            this.isPaused = true;
            this.pauseStartTs = performance.now();
            this.updatePauseButton();
        }
        this.helpModal.classList.remove('hidden');
        this.updateStartButton();
    }

    closeHelp() {
        if (!this.helpModal) return;
        this.helpModal.classList.add('hidden');
        this.isHelpOpen = false;
        if (!this.wasPausedBeforeHelp && this.isPaused) {
            const now = performance.now();
            this.isPaused = false;
            this.pausedTime += now - this.pauseStartTs;
            this.updatePauseButton();
        }
        this.updateStartButton();
    }

    async refreshCameraDevices() {
        if (!navigator.mediaDevices?.enumerateDevices) return;

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter((d) => d.kind === 'videoinput');

            const currentId = this.getCurrentVideoDeviceId();
            if (!this.selectedDeviceId && currentId) {
                this.selectedDeviceId = currentId;
            }

            const prev = this.cameraSelect.value || this.selectedDeviceId;
            this.cameraSelect.innerHTML = '';

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'カメラ選択';
            this.cameraSelect.appendChild(placeholder);

            this.availableCameras.forEach((cam, idx) => {
                const opt = document.createElement('option');
                opt.value = cam.deviceId;
                opt.textContent = cam.label || `カメラ${idx + 1}`;
                this.cameraSelect.appendChild(opt);
            });

            const stillExists = this.availableCameras.some((c) => c.deviceId === prev);
            if (stillExists) {
                this.cameraSelect.value = prev;
                this.selectedDeviceId = prev;
            } else if (this.availableCameras.length > 0) {
                this.cameraSelect.value = this.availableCameras[0].deviceId;
                this.selectedDeviceId = this.availableCameras[0].deviceId;
            } else {
                this.cameraSelect.value = '';
                this.selectedDeviceId = '';
            }

            this.cameraSelect.disabled = this.availableCameras.length === 0;
        } catch (_) {
        }
    }

    getCurrentVideoDeviceId() {
        const track = this.stream?.getVideoTracks?.()[0];
        const settings = track?.getSettings?.();
        return settings?.deviceId || '';
    }

    async handleCameraSelection() {
        const id = this.cameraSelect.value;
        this.selectedDeviceId = id;

        if (this.isCameraOn) {
            await this.startCamera(id);
        }
    }

    resetGameState() {
        this.score = 0;
        this.level = 1;
        this.gameTime = 0;
        this.enemies = [];
        this.items = [];
        this.isPaused = false;
        this.isHelpOpen = false;
        this.wasPausedBeforeHelp = false;
        this.clearEffectStartTs = 0;
        this.speedDebuffUntilTs = 0;
        this.lastEnemySpawn = 0;
        this.enemySpawnInterval = 2000;
        this.enemyId = 0;
        this.lastItemSpawn = 0;
        this.itemId = 0;
        this.lastFrameTs = 0;
        this.startTimeTs = 0;
        this.pausedTime = 0;  // 一時停止中の累積時間をリセット
        this.pauseStartTs = 0; // 一時停止開始時刻をリセット
        this.lastFaceDetectTs = 0;
        // ポジティブアイテム関連リセット
        this.levelUpTs = 0;
        this.shieldUntilTs = 0;
        this.slowUntilTs = 0;
        this.bonusScoreTs = 0;
        this.currentPraiseMsg = '';
        this.praiseTs = 0;
        this.lastPraiseTriggerTime = 0;
        this.particles = [];
        this.updateUI();
        this.hideGameOver();
        this.updateStartButton();
        this.updatePauseButton();
        this.updateModeSelect();
    }

    updateStartButton() {
        if (this.isHelpOpen) {
            this.startBtn.disabled = true;
            this.startBtn.textContent = 'ヘルプ中';
            return;
        }

        if (this.isCountingDown) {
            this.startBtn.disabled = true;
            this.startBtn.textContent = 'スタート…';
            return;
        }

        if (this.isGameRunning) {
            this.startBtn.disabled = true;
            this.startBtn.textContent = 'プレイ中';
            return;
        }

        this.startBtn.disabled = false;
        this.startBtn.textContent = this.startBtnDefaultText;
    }

    updateModeSelect() {
        if (!this.modeSelect) return;
        this.modeSelect.disabled = this.isGameRunning || this.isCountingDown;
        this.modeSelect.value = this.gameMode;
    }

    updatePauseButton() {
        if (this.isGameRunning && !this.isCountingDown) {
            this.pauseBtn.classList.remove('hidden');
            this.pauseBtn.textContent = this.isPaused ? '再開' : '一時停止';
        } else {
            this.pauseBtn.classList.add('hidden');
        }
    }

    updateUI() {
        const cfg = this.getModeConfig();
        this.scoreEl.textContent = cfg.allowScore ? `スコア: ${Math.floor(this.score)}` : 'スコア: -';
        this.levelEl.textContent = cfg.allowScore ? `レベル: ${this.level}` : 'レベル: -';
        this.timeEl.textContent = `時間: ${Math.floor(this.gameTime)}s`;
    }

    showGameOver(titleText) {
        this.gameOverDiv.classList.remove('hidden');
        if (this.gameOverTitleEl && typeof titleText === 'string' && titleText) {
            this.gameOverTitleEl.textContent = titleText;
        }
        const cfg = this.getModeConfig();
        if (this.finalLabelEl) {
            this.finalLabelEl.textContent = cfg.allowScore ? '最終スコア' : '記録';
        }
        this.finalScoreEl.textContent = cfg.allowScore ? `${Math.floor(this.score)}` : `${Math.floor(this.gameTime)}秒`;
    }

    hideGameOver() {
        this.gameOverDiv.classList.add('hidden');
    }

    async toggleCamera() {
        if (this.isCameraOn) {
            this.stopCamera();
            return;
        }

        try {
            await this.startCamera();
        } catch (e) {
            const msg = (e && typeof e.message === 'string') ? e.message : String(e);
            alert(`カメラ/顔モデルを起動できませんでした。\n${msg}\n\nブラウザのカメラ許可やHTTPS/localhostで開いているか確認してください。`);
        }
    }

    async startCamera(deviceId) {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('getUserMedia not supported');
        }

        if (this.stream) {
            this.stopCamera();
        }

        const chosenId = deviceId || this.selectedDeviceId;
        this.selectedDeviceId = chosenId || this.selectedDeviceId;
        const videoConstraints = chosenId
            ? { deviceId: { exact: chosenId }, width: { ideal: 640 }, height: { ideal: 480 } }
            : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } };

        this.stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false
        });

        this.video.srcObject = this.stream;
        await new Promise((resolve) => {
            if (this.video.readyState >= 2) {
                resolve();
                return;
            }
            this.video.onloadedmetadata = () => resolve();
        });

        await this.video.play();
        this.isCameraOn = true;

        this.selectedDeviceId = this.getCurrentVideoDeviceId() || this.selectedDeviceId;
        await this.refreshCameraDevices();

        await this.loadFaceDetectorIfNeeded();
    }

    stopCamera() {
        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
        }

        this.stream = null;
        this.video.srcObject = null;
        this.isCameraOn = false;
    }

    async loadFaceDetectorIfNeeded() {
        if (this.faceDetector || this.faceBoxDetector) return;

        if (!window.tf) {
            throw new Error('TFJS not loaded');
        }

        if (!window.faceLandmarksDetection && !window.faceDetection) {
            throw new Error('faceLandmarksDetection / faceDetection not loaded');
        }

        if (window.faceDetection) {
            try {
                const fdModel = faceDetection.SupportedModels.MediaPipeFaceDetector;
                this.faceBoxDetector = await faceDetection.createDetector(fdModel, {
                    runtime: 'mediapipe',
                    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
                    maxFaces: 1
                });
            } catch (e) {
                this.faceBoxDetector = null;
            }
        }

        if (window.faceLandmarksDetection) {
            const lmModel = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;

            try {
                this.faceDetector = await faceLandmarksDetection.createDetector(lmModel, {
                    runtime: 'mediapipe',
                    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
                    maxFaces: 1,
                    refineLandmarks: false
                });
            } catch (e) {
                this.faceDetector = null;
            }

            if (!this.faceDetector) {
                try {
                    await tf.setBackend('webgl');
                } catch (_) {
                    await tf.setBackend('cpu');
                }
                await tf.ready();

                this.faceDetector = await faceLandmarksDetection.createDetector(lmModel, {
                    runtime: 'tfjs',
                    maxFaces: 1,
                    refineLandmarks: false
                });
            }
        }

        if (!this.faceDetector && !this.faceBoxDetector) {
            throw new Error('No face detector could be initialized');
        }
    }

    startGame() {
        if (this.isGameRunning || this.isCountingDown) return;
        this.resetGameState();

        this.isGameRunning = false;
        this.isCountingDown = true;
        this.countdownStartTs = performance.now();
        this.updateStartButton();
    }

    restartGame() {
        this.isGameRunning = false;
        this.isCountingDown = false;
        this.resetGameState();
        this.startGame();
    }

    returnToStart() {
        // 「最初にもどる」: 状態を初期化してスタート待ちに戻す（自動開始しない）
        this.isGameRunning = false;
        this.isCountingDown = false;

        if (this.isPaused) {
            const now = performance.now();
            this.isPaused = false;
            this.pausedTime += now - this.pauseStartTs;
        }

        this.resetGameState();
        this.hideGameOver();
        this.updateStartButton();
        this.updatePauseButton();
        this.updateModeSelect();
        this.render();
    }

    endGame() {
        this.isGameRunning = false;
        this.isCountingDown = false;
        if (this.isPaused) {
            const now = performance.now();
            this.isPaused = false;
            this.pausedTime += now - this.pauseStartTs;
        }
        this.isHelpOpen = false;
        const cfg = this.getModeConfig();
        const title = (cfg.timeLimitSec && this.gameTime >= cfg.timeLimitSec)
            ? `${cfg.timeLimitSec}秒クリア！`
            : 'ゲームオーバー!';
        this.showGameOver(title);
        this.updateStartButton();
        this.updatePauseButton();
        this.updateModeSelect();
    }

    gameLoop(ts) {
        const dt = this.lastFrameTs ? (ts - this.lastFrameTs) / 1000 : 0;
        this.lastFrameTs = ts;

        // 一時停止中はキャラクターの移動を停止
        if (!this.isPaused) {
            this.updateFaceTarget(ts);
            this.updatePlayer(dt);
        }

        if (this.isPaused) {
            this.render();
            requestAnimationFrame((nextTs) => this.gameLoop(nextTs));
            return;
        }

        if (this.isCountingDown) {
            const elapsed = ts - this.countdownStartTs;
            if (elapsed >= this.countdownDurationMs) {
                this.isCountingDown = false;
                this.isGameRunning = true;
                this.startTimeTs = ts;
                this.lastFrameTs = ts;
                this.updateStartButton();
                this.updatePauseButton();
            }
        }

        if (!this.isGameRunning) {
            this.render();
            requestAnimationFrame((nextTs) => this.gameLoop(nextTs));
            return;
        }

        this.gameTime = (ts - this.startTimeTs - this.pausedTime) / 1000;

        // チャレンジ（時間制限）
        const cfg = this.getModeConfig();
        if (cfg.timeLimitSec && this.gameTime >= cfg.timeLimitSec) {
            // クリアとして終了
            this.gameTime = cfg.timeLimitSec;
            this.updateUI();
            this.endGame();
            this.render();
            requestAnimationFrame((nextTs) => this.gameLoop(nextTs));
            return;
        }

        this.applyDifficulty();
        if (cfg.allowScore) {
            this.score += dt * (5 + this.level * 2);
        }
        this.spawnEnemies(ts);
        this.spawnItems(ts);
        this.updateEnemies(dt, ts);
        this.updateItems(ts);
        this.updateParticles(dt);
        this.checkItemCollisions(ts);

        if (this.checkCollisions()) {
            this.endGame();
        }

        this.updateUI();
        this.render();

        requestAnimationFrame((nextTs) => this.gameLoop(nextTs));
    }

    applyDifficulty() {
        const cfg = this.getModeConfig();
        const newLevel = Math.max(1, Math.floor(this.gameTime / 15) + 1);
        if (newLevel !== this.level) {
            this.level = newLevel;
            this.levelUpTs = performance.now();
            this.spawnLevelUpParticles();
        }

        const interval = 2000 - (this.level - 1) * 150;
        const minInterval = cfg.minEnemySpawnIntervalMs || 650;
        this.enemySpawnInterval = Math.max(minInterval, interval * cfg.enemySpawnIntervalMul);

        // 定期的に褒めメッセージ (10秒ごと)
        const praiseInterval = 10;
        if (Math.floor(this.gameTime / praiseInterval) > this.lastPraiseTriggerTime) {
            this.lastPraiseTriggerTime = Math.floor(this.gameTime / praiseInterval);
            this.triggerPraise();
        }
    }

    triggerPraise() {
        const idx = Math.floor(Math.random() * this.praiseMessages.length);
        this.currentPraiseMsg = this.praiseMessages[idx];
        this.praiseTs = performance.now();
    }

    spawnLevelUpParticles() {
        const cx = this.logicalWidth / 2;
        const cy = this.logicalHeight / 2;
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 120;
            this.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.6 + Math.random() * 0.4,
                size: 6 + Math.random() * 8,
                color: ['#ffd700', '#ff69b4', '#00ffff', '#7fff00'][Math.floor(Math.random() * 4)]
            });
        }
    }

    async updateFaceTarget(ts) {
        if (!this.isCameraOn || (!this.faceDetector && !this.faceBoxDetector)) return;
        if (ts - this.lastFaceDetectTs < this.faceDetectIntervalMs) return;
        if (this.isDetectingFace) return;
        if (!this.video.videoWidth || !this.video.videoHeight) return;

        this.lastFaceDetectTs = ts;
        this.isDetectingFace = true;

        try {
            let faces = [];
            let used = '';

            const flipHorizontal = !!this.mirrorMode;
            this.flipHorizontal = flipHorizontal;

            if (this.faceDetector) {
                faces = await this.faceDetector.estimateFaces(this.video, { flipHorizontal });
                if (faces && faces.length > 0) {
                    used = 'mesh';
                }
            }

            if ((!faces || faces.length === 0) && this.faceBoxDetector) {
                faces = await this.faceBoxDetector.estimateFaces(this.video, { flipHorizontal });
                if (faces && faces.length > 0) {
                    used = 'detector';
                }
            }

            if (!faces || faces.length === 0) return;

            const face = faces[0];
            const center = this.getFaceCenter(face);
            if (!center) return;

            if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return;

            let vx = center.x / this.video.videoWidth;
            const vy = center.y / this.video.videoHeight;

            if (!Number.isFinite(vx) || !Number.isFinite(vy)) return;

            // チェックON（mirrorMode=false）= 現実と逆（非ミラー）表示。
            // そのときはキャラのX移動も反転させて、映像の向きと操作を一致させる。
            if (!this.mirrorMode) {
                vx = 1 - vx;
            }

            this.player.targetX = Math.max(0, Math.min(this.logicalWidth, vx * this.logicalWidth));
            this.player.targetY = Math.max(0, Math.min(this.logicalHeight, vy * this.logicalHeight));
            this.lastFaceSeenTs = ts;
            this.lastFaceError = '';
            this.lastDetectorUsed = used;
            this.debugFace = {
                vx,
                vy,
                videoW: this.video.videoWidth,
                videoH: this.video.videoHeight,
                targetX: this.player.targetX,
                targetY: this.player.targetY
            };
        } catch (e) {
            const msg = (e && typeof e.message === 'string') ? e.message : String(e);
            this.lastFaceError = `顔検出エラー: ${msg}`;
            console.error('Face detection error:', e);
            this.debugFace = null;
            this.lastDetectorUsed = '';
        } finally {
            this.isDetectingFace = false;
        }
    }

    getFaceCenter(face) {
        if (face?.box && typeof face.box.xMin === 'number') {
            const x = (face.box.xMin + face.box.xMax) * 0.5;
            const y = (face.box.yMin + face.box.yMax) * 0.45;
            return { x, y };
        }

        if (face?.boundingBox?.topLeft && face?.boundingBox?.bottomRight) {
            const tl = Array.isArray(face.boundingBox.topLeft) ? face.boundingBox.topLeft : [face.boundingBox.topLeft.x, face.boundingBox.topLeft.y];
            const br = Array.isArray(face.boundingBox.bottomRight) ? face.boundingBox.bottomRight : [face.boundingBox.bottomRight.x, face.boundingBox.bottomRight.y];
            const x = (tl[0] + br[0]) * 0.5;
            const y = (tl[1] + br[1]) * 0.45;
            return { x, y };
        }

        if (Array.isArray(face?.keypoints) && face.keypoints.length > 0) {
            let xSum = 0;
            let ySum = 0;
            for (const kp of face.keypoints) {
                xSum += kp.x;
                ySum += kp.y;
            }
            return { x: xSum / face.keypoints.length, y: ySum / face.keypoints.length };
        }

        return null;
    }

    updatePlayer(dt) {
        const follow = 1 - Math.pow(0.001, dt);
        this.player.x += (this.player.targetX - this.player.x) * follow;
        this.player.y += (this.player.targetY - this.player.y) * follow;
    }

    spawnEnemies(ts) {
        if (!this.lastEnemySpawn) this.lastEnemySpawn = ts;
        if (ts - this.lastEnemySpawn < this.enemySpawnInterval) return;
        this.lastEnemySpawn = ts;

        const cfg = this.getModeConfig();

        const spawnCount = Math.max(1, Math.floor(cfg.spawnCount || 1));

        for (let i = 0; i < spawnCount; i++) {
            const side = Math.random() < 0.5 ? 'top' : 'bottom';
            const baseX = 30 + Math.random() * Math.max(1, (this.logicalWidth - 60));
            const isBig = Math.random() < cfg.bigEnemyChance;
            const size = Math.round(this.baseEnemySize * (isBig ? (1.55 + Math.random() * 0.15) : (0.95 + Math.random() * 0.1)));

            const speedBase = (60 + this.level * 10) * cfg.enemySpeedMul;
            const speed = speedBase * (0.9 + Math.random() * 0.25);

            const complexity = Math.min(4, Math.floor((this.level - 1) / 2));
            const amp1 = complexity >= 1 ? (10 + this.level * 2) : 0;
            const freq1 = complexity >= 1 ? (1.2 + this.level * 0.15) : 0;
            const amp2 = complexity >= 2 ? (6 + this.level * 1.2) : 0;
            const freq2 = complexity >= 2 ? (2.2 + this.level * 0.2) : 0;
            const amp3 = complexity >= 3 ? (4 + this.level * 0.8) : 0;
            const freq3 = complexity >= 3 ? (3.3 + this.level * 0.25) : 0;

            const enemy = {
                id: ++this.enemyId,
                x: baseX,
                y: side === 'top' ? -size : this.logicalHeight + size,
                baseX,
                size,
                isBig,
                direction: side === 'top' ? 1 : -1,
                speed,
                spawnTs: ts,
                phase1: Math.random() * Math.PI * 2,
                phase2: Math.random() * Math.PI * 2,
                phase3: Math.random() * Math.PI * 2,
                amp1,
                freq1,
                amp2,
                freq2,
                amp3,
                freq3
            };

            this.enemies.push(enemy);
        }
    }

    spawnItems(ts) {
        if (!this.lastItemSpawn) this.lastItemSpawn = ts;
        const jitter = 1000 * Math.random();
        if (ts - this.lastItemSpawn < this.itemSpawnInterval + jitter) return;
        this.lastItemSpawn = ts;

        const pad = 60;
        const x = pad + Math.random() * Math.max(1, (this.logicalWidth - pad * 2));
        const y = pad + Math.random() * Math.max(1, (this.logicalHeight - pad * 2));

        const cfg = this.getModeConfig();
        
        // アイテムタイプの確率
        const r = Math.random();
        let type, size;
        if (!cfg.allowScore) {
            // チャレンジはスコア概念なし（ボーナスは出さない）
            // clear 10%, shield 8%, slow 12%, speedup 70%
            if (r < 0.10) {
                type = 'clear';
                size = 34;
            } else if (r < 0.18) {
                type = 'shield';
                size = 32;
            } else if (r < 0.30) {
                type = 'slow';
                size = 32;
            } else {
                type = 'speedup';
                size = 28;
            }
        } else {
            // clear 30%, shield 25%, slow 20%, bonus 15%, speedup 10%
            if (r < 0.30) {
                type = 'clear';
                size = 34;
            } else if (r < 0.55) {
                type = 'shield';
                size = 32;
            } else if (r < 0.75) {
                type = 'slow';
                size = 32;
            } else if (r < 0.90) {
                type = 'bonus';
                size = 30;
            } else {
                type = 'speedup';
                size = 28;
            }
        }

        this.items.push({
            id: ++this.itemId,
            type,
            x,
            y,
            size,
            spawnTs: ts,
            expireTs: ts + this.itemLifetimeMs
        });
    }

    updateItems(ts) {
        const alive = [];
        for (const it of this.items) {
            if (ts <= it.expireTs) {
                alive.push(it);
            }
        }
        this.items = alive;
    }

    checkItemCollisions(ts) {
        const pr = this.player.size * 0.5;
        const keep = [];
        for (const it of this.items) {
            const ir = it.size * 0.5;
            const dx = it.x - this.player.x;
            const dy = it.y - this.player.y;
            const dist2 = dx * dx + dy * dy;
            const r = pr + ir;
            if (dist2 <= r * r) {
                this.applyItemEffect(it, ts);
                continue;
            }
            keep.push(it);
        }
        this.items = keep;
    }

    applyItemEffect(item, ts) {
        // アイテム取得時にパーティクル発生
        this.spawnItemParticles(item.x, item.y, item.type);

        const cfg = this.getModeConfig();

        if (item.type === 'clear') {
            this.enemies = [];
            this.clearEffectStartTs = ts;
            return;
        }

        if (item.type === 'shield') {
            this.shieldUntilTs = Math.max(this.shieldUntilTs, ts + 5000);
            return;
        }

        if (item.type === 'slow') {
            this.slowUntilTs = Math.max(this.slowUntilTs, ts + 5000);
            return;
        }

        if (item.type === 'bonus') {
            if (cfg.allowScore) {
                this.score += 100;
                this.bonusScoreTs = ts;
            }
            return;
        }

        if (item.type === 'speedup') {
            this.speedDebuffUntilTs = Math.max(this.speedDebuffUntilTs, ts + 5000);
        }
    }

    spawnItemParticles(x, y, type) {
        const colors = {
            clear: '#7bdff2',
            shield: '#a78bfa',
            slow: '#34d399',
            bonus: '#ffd700',
            speedup: '#ffd166'
        };
        const color = colors[type] || '#ffffff';
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 80;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.8 + Math.random() * 0.4,
                size: 4 + Math.random() * 6,
                color
            });
        }
    }

    updateEnemies(dt, ts) {
        let speedMul = 1;
        if (ts < this.speedDebuffUntilTs) speedMul = 2;
        if (ts < this.slowUntilTs) speedMul = 0.4;
        const alive = [];
        for (const e of this.enemies) {
            const t = (ts - e.spawnTs) / 1000;

            const dx =
                (e.amp1 ? e.amp1 * Math.sin(e.freq1 * t + e.phase1) : 0) +
                (e.amp2 ? e.amp2 * Math.sin(e.freq2 * t + e.phase2) : 0) +
                (e.amp3 ? e.amp3 * Math.sin(e.freq3 * t + e.phase3) : 0);

            e.x = e.baseX + dx;
            e.y += e.direction * e.speed * dt * speedMul;

            const margin = e.size * 2;
            const outTop = e.y < -margin;
            const outBottom = e.y > this.logicalHeight + margin;
            if (outTop || outBottom) {
                continue;
            }

            alive.push(e);
        }
        this.enemies = alive;
    }

    checkCollisions() {
        // シールド中は衝突しない
        if (performance.now() < this.shieldUntilTs) return false;

        const pr = this.player.size * 0.5;
        for (const e of this.enemies) {
            const er = e.size * 0.5;
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const dist2 = dx * dx + dy * dy;
            const r = pr + er;
            if (dist2 <= r * r) {
                return true;
            }
        }
        return false;
    }

    render() {
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

        // モード別 背景演出
        this.renderBackground();

        // パーティクル描画
        this.renderParticles();

        for (const e of this.enemies) {
            const color = e.isBig ? '#ff8a8a' : '#ff6b6b';
            const glow = e.isBig ? 22 : 15;
            this.drawCircle(e.x, e.y, e.size * 0.5, color, glow);
            this.drawEnemyFace(e);
        }

        for (const it of this.items) {
            this.drawItem(it);
        }

        // シールド中はプレイヤーを紫色に
        const now = performance.now();
        const isShielded = now < this.shieldUntilTs;
        const playerColor = isShielded ? '#a78bfa' : '#4ecdc4';
        const playerGlow = isShielded ? 30 : 20;
        this.drawCircle(this.player.x, this.player.y, this.player.size * 0.5, playerColor, playerGlow);
        this.drawPlayerFace(isShielded);

        // シールドリング
        if (isShielded) {
            this.drawShieldRing();
        }

        if (!this.isCameraOn) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('カメラをONにして顔で操作しよう', this.logicalWidth / 2, 30);
            this.ctx.restore();
        } else {
            const now = performance.now();
            const seenRecently = this.lastFaceSeenTs && (now - this.lastFaceSeenTs) < 1500;

            let msg = '';
            if (!this.faceDetector && !this.faceBoxDetector) {
                msg = '顔モデル読み込み中…';
            } else if (this.lastFaceError) {
                msg = this.lastFaceError;
            } else if (!seenRecently) {
                msg = '顔が見つかりません（明るい場所で顔をカメラ中央へ）';
            }

            const ready = (this.video.videoWidth && this.video.videoHeight) ? `video:${this.video.videoWidth}x${this.video.videoHeight}` : 'video:未準備';
            const d = this.debugFace ? ` vx:${this.debugFace.vx.toFixed(2)} vy:${this.debugFace.vy.toFixed(2)}` : '';
            const flip = ` flip:${this.flipHorizontal ? 'ON' : 'OFF'} mirror:${this.mirrorMode ? 'ON' : 'OFF'}`;
            const det = this.lastDetectorUsed ? ` det:${this.lastDetectorUsed}` : '';
            const loaded = ` loaded:${this.faceDetector ? 'mesh' : '-'}|${this.faceBoxDetector ? 'box' : '-'}`;
            const detail = `${ready}${d}${flip}${det}${loaded}`;

            if (msg) {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(0,0,0,0.45)';
                this.ctx.fillRect(10, 10, this.logicalWidth - 20, 52);
                this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(msg, this.logicalWidth / 2, 30);
                this.ctx.font = '12px Arial';
                this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
                this.ctx.fillText(detail, this.logicalWidth / 2, 48);
                this.ctx.restore();
            }
        }

        if (this.isCountingDown) {
            this.renderCountdown();
        }

        if (this.isPaused && this.isGameRunning) {
            this.renderPauseScreen();
        }

        this.renderEffects();
    }

    renderBackground() {
        const cfg = this.getModeConfig();
        if (!cfg?.timeLimitSec) return; // チャレンジ（鬼）だけ

        const now = performance.now();

        // 暗めのグラデーション
        this.ctx.save();
        const g = this.ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
        g.addColorStop(0, 'rgba(17, 24, 39, 0.55)');
        g.addColorStop(1, 'rgba(17, 24, 39, 0.25)');
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        // 斜めストライプ（薄く動く）
        this.ctx.globalAlpha = 0.18;
        this.ctx.fillStyle = 'rgba(239, 68, 68, 1)';
        const stripeW = 26;
        const stripeGap = 32;
        const total = stripeW + stripeGap;
        const offset = ((now / 25) % total);
        this.ctx.translate(-offset, 0);
        this.ctx.rotate(-Math.PI / 12);

        const diagW = this.logicalWidth * 1.8;
        const diagH = this.logicalHeight * 2.2;
        for (let x = -diagW; x < diagW; x += total) {
            this.ctx.fillRect(x, -diagH * 0.2, stripeW, diagH);
        }

        // 画面端のビネット
        const r = Math.max(this.logicalWidth, this.logicalHeight) * 0.8;
        const vg = this.ctx.createRadialGradient(
            this.logicalWidth / 2,
            this.logicalHeight / 2,
            r * 0.2,
            this.logicalWidth / 2,
            this.logicalHeight / 2,
            r
        );
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.38)');
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = vg;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.ctx.restore();
    }

    renderEffects() {
        const now = performance.now();

        // クリアエフェクト
        if (this.clearEffectStartTs) {
            const t = now - this.clearEffectStartTs;
            if (t <= this.clearEffectDurationMs) {
                const p = t / this.clearEffectDurationMs;
                const a = Math.max(0, 0.45 * (1 - p));
                this.ctx.save();
                this.ctx.fillStyle = `rgba(255,255,255,${a})`;
                this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
                this.ctx.restore();
            }
        }

        // レベルアップ演出
        if (this.levelUpTs) {
            const t = now - this.levelUpTs;
            if (t <= this.levelUpDurationMs) {
                const p = t / this.levelUpDurationMs;
                const scale = 1 + Math.sin(p * Math.PI) * 0.3;
                const alpha = Math.max(0, 1 - p);
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = '#ffd700';
                this.ctx.font = `bold ${Math.floor(48 * scale)}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.shadowColor = '#ffd700';
                this.ctx.shadowBlur = 20;
                this.ctx.fillText(`レベル ${this.level}！`, this.logicalWidth / 2, this.logicalHeight / 2 - 60);
                this.ctx.font = `bold ${Math.floor(28 * scale)}px Arial`;
                this.ctx.fillText('すごい！', this.logicalWidth / 2, this.logicalHeight / 2);
                this.ctx.restore();
            }
        }

        // 褒めメッセージ
        if (this.praiseTs && this.currentPraiseMsg) {
            const t = now - this.praiseTs;
            if (t <= this.praiseDurationMs) {
                const p = t / this.praiseDurationMs;
                const alpha = Math.max(0, 1 - p * p);
                const yOffset = -30 * p;
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = '#ff69b4';
                this.ctx.font = 'bold 32px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.shadowColor = '#ff69b4';
                this.ctx.shadowBlur = 15;
                this.ctx.fillText(this.currentPraiseMsg, this.logicalWidth / 2, 80 + yOffset);
                this.ctx.restore();
            }
        }

        // ボーナススコア表示
        if (this.bonusScoreTs) {
            const t = now - this.bonusScoreTs;
            if (t <= this.bonusScoreDurationMs) {
                const p = t / this.bonusScoreDurationMs;
                const alpha = Math.max(0, 1 - p);
                const yOffset = -40 * p;
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = '#ffd700';
                this.ctx.font = 'bold 28px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.shadowColor = '#ffd700';
                this.ctx.shadowBlur = 10;
                this.ctx.fillText('+100', this.player.x, this.player.y - 40 + yOffset);
                this.ctx.restore();
            }
        }

        // 効果表示エリア（右下）
        let effectY = this.logicalHeight - 16;
        const effectX = this.logicalWidth - 16;

        if (now < this.speedDebuffUntilTs) {
            const remain = Math.ceil((this.speedDebuffUntilTs - now) / 1000);
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255, 200, 0, 0.15)';
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
            this.ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`⚠️ 敵スピードUP: ${remain}s`, effectX, effectY);
            this.ctx.restore();
            effectY -= 20;
        }

        if (now < this.slowUntilTs) {
            const remain = Math.ceil((this.slowUntilTs - now) / 1000);
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(52, 211, 153, 0.15)';
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
            this.ctx.fillStyle = 'rgba(52, 211, 153, 0.95)';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`🐢 スロー: ${remain}s`, effectX, effectY);
            this.ctx.restore();
            effectY -= 20;
        }

        if (now < this.shieldUntilTs) {
            const remain = Math.ceil((this.shieldUntilTs - now) / 1000);
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(167, 139, 250, 0.95)';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`🛡️ シールド: ${remain}s`, effectX, effectY);
            this.ctx.restore();
        }
    }

    drawItem(item) {
        const itemStyles = {
            clear: { color: '#7bdff2', glow: 18, label: '💥' },
            shield: { color: '#a78bfa', glow: 18, label: '🛡️' },
            slow: { color: '#34d399', glow: 16, label: '🐢' },
            bonus: { color: '#ffd700', glow: 20, label: '⭐' },
            speedup: { color: '#ff6b6b', glow: 14, label: '⚠️' }
        };
        const style = itemStyles[item.type] || itemStyles.clear;
        
        this.drawCircle(item.x, item.y, item.size * 0.5, style.color, style.glow);

        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(style.label, item.x, item.y);
        this.ctx.restore();

        const remain = Math.max(0, item.expireTs - performance.now());
        const p = Math.min(1, remain / this.itemLifetimeMs);
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(item.x, item.y, item.size * 0.5 + 8, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * p);
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderCountdown() {
        const now = performance.now();
        const remainMs = Math.max(0, this.countdownDurationMs - (now - this.countdownStartTs));
        const remainSec = Math.ceil(remainMs / 1000);
        const text = remainSec > 0 ? `${remainSec}` : 'GO!';

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.fillText(text, this.logicalWidth / 2, this.logicalHeight / 2);
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
        this.ctx.fillText('スタート！', this.logicalWidth / 2, this.logicalHeight / 2 + 70);
        this.ctx.restore();
    }

    renderPauseScreen() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillText('一時停止中', this.logicalWidth / 2, this.logicalHeight / 2);
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
        this.ctx.fillText('「再開」ボタンまたはスペースキーで再開', this.logicalWidth / 2, this.logicalHeight / 2 + 60);
        this.ctx.restore();
    }

    drawCrosshair(x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 10, y);
        this.ctx.lineTo(x + 10, y);
        this.ctx.moveTo(x, y - 10);
        this.ctx.lineTo(x, y + 10);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawCircle(x, y, r, color, glow) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = glow;
        this.ctx.fill();
        this.ctx.restore();
    }

    drawPlayerFace(isShielded) {
        const x = this.player.x;
        const y = this.player.y;
        const r = this.player.size * 0.5;

        // 敵が近いか判定
        let nearestDist = Infinity;
        for (const e of this.enemies) {
            const dx = e.x - x;
            const dy = e.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) nearestDist = dist;
        }
        const isNervous = nearestDist < 80;

        this.ctx.save();
        // 目
        const eyeOffsetX = r * 0.3;
        const eyeOffsetY = -r * 0.15;
        const eyeSize = r * 0.18;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeSize * 1.4, 0, Math.PI * 2);
        this.ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize * 1.4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#333333';
        this.ctx.beginPath();
        this.ctx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        this.ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();

        // 口
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        if (isShielded) {
            // にっこり（自信満々）
            this.ctx.arc(x, y + r * 0.1, r * 0.35, 0.1 * Math.PI, 0.9 * Math.PI);
        } else if (isNervous) {
            // 焦り顔（への字口）
            this.ctx.moveTo(x - r * 0.25, y + r * 0.35);
            this.ctx.quadraticCurveTo(x, y + r * 0.25, x + r * 0.25, y + r * 0.35);
        } else {
            // 普通のにっこり
            this.ctx.arc(x, y + r * 0.15, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
        }
        this.ctx.stroke();

        // 汗（焦り時）
        if (isNervous && !isShielded) {
            this.ctx.fillStyle = 'rgba(100, 200, 255, 0.7)';
            this.ctx.beginPath();
            this.ctx.ellipse(x + r * 0.55, y - r * 0.3, r * 0.1, r * 0.18, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    drawEnemyFace(enemy) {
        const x = enemy.x;
        const y = enemy.y;
        const r = enemy.size * 0.5;

        this.ctx.save();
        // 目（怒り目）
        const eyeOffsetX = r * 0.3;
        const eyeOffsetY = -r * 0.1;
        const eyeSize = r * 0.2;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeSize * 1.3, 0, Math.PI * 2);
        this.ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize * 1.3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#333333';
        this.ctx.beginPath();
        this.ctx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        this.ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();

        // 眉毛（怒り）
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x - eyeOffsetX - r * 0.2, y + eyeOffsetY - r * 0.3);
        this.ctx.lineTo(x - eyeOffsetX + r * 0.15, y + eyeOffsetY - r * 0.15);
        this.ctx.moveTo(x + eyeOffsetX + r * 0.2, y + eyeOffsetY - r * 0.3);
        this.ctx.lineTo(x + eyeOffsetX - r * 0.15, y + eyeOffsetY - r * 0.15);
        this.ctx.stroke();

        // 口（ニヤリ）
        this.ctx.beginPath();
        this.ctx.arc(x, y + r * 0.25, r * 0.25, 0.2 * Math.PI, 0.8 * Math.PI);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawShieldRing() {
        const now = performance.now();
        const pulse = Math.sin(now / 150) * 0.15 + 1;
        const ringRadius = this.player.size * 0.5 + 12 * pulse;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(167, 139, 250, 0.7)';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#a78bfa';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, ringRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    updateParticles(dt) {
        const alive = [];
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
            if (p.life > 0) {
                alive.push(p);
            }
        }
        this.particles = alive;
    }

    renderParticles() {
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new FaceDetectionGame();
});
