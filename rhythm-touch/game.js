class RhythmTouch {
    constructor() {
        // DOM refs
        this.scoreEl      = document.getElementById('score');
        this.comboEl      = document.getElementById('combo');
        this.levelEl      = document.getElementById('level');
        this.startBtn     = document.getElementById('startBtn');
        this.pauseBtn     = document.getElementById('pauseBtn');
        this.helpBtn      = document.getElementById('helpBtn');
        this.helpModal    = document.getElementById('helpModal');
        this.helpCloseBtn = document.getElementById('helpCloseBtn');
        this.modeSelect   = document.getElementById('modeSelect');
        this.restartBtn   = document.getElementById('restartBtn');

        // screens
        this.startScreen     = document.getElementById('startScreen');
        this.countdownScreen = document.getElementById('countdownScreen');
        this.countdownNum    = document.getElementById('countdownNum');
        this.playScreen      = document.getElementById('playScreen');
        this.gameOverScreen  = document.getElementById('gameOver');

        // play screen elements
        this.targetArea  = document.getElementById('targetArea');
        this.feedbackEl  = document.getElementById('feedback');

        // result screen elements
        this.starDisplayEl = document.getElementById('starDisplay');
        this.finalScoreEl  = document.getElementById('finalScore');
        this.maxComboEl    = document.getElementById('maxCombo');

        // game state
        this.score         = 0;
        this.comboCount    = 0;
        this.maxComboCount = 0;
        this.beatIndex     = 0;
        this.isRunning     = false;
        this.isPaused      = false;
        this.isHelpOpen    = false;
        this.wasPausedBeforeHelp = false;

        // timing
        this.countdownTimerId = null;
        this.beatTimerId      = null;
        this.feedbackTimerId  = null;
        this.activeTargets    = [];

        // audio
        this.audioCtx = null;

        // animals
        this.animals = ['🐱','🐶','🐰','🐻','🐸','🐼','🐨','🦊','🐯','🐮'];

        // note frequencies (C major scale)
        this.noteFreqs = {
            C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
            G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25
        };

        // melodies for each difficulty
        this.melodies = {
            easy: [
                'C4','E4','G4','C5','G4','E4','C4','E4',
                'G4','C5','G4','E4'
            ],
            normal: [
                'C4','D4','E4','F4','G4','A4','B4','C5',
                'C5','B4','A4','G4','F4','E4','D4','C4'
            ],
            challenge: [
                'C4','E4','G4','C5','A4','F4','D4','B4',
                'G4','E4','C5','A4','F4','G4','A4','B4',
                'C5','G4','E4','C4'
            ]
        };

        // modes
        this.modeConfigs = {
            easy: {
                label:       'やさしい',
                bpm:         80,
                totalBeats:  12,
                targetSize:  110,
                displayTime: 1.5,
                perfectZone: 0.4,
                goodZone:    0.3
            },
            normal: {
                label:       'ふつう',
                bpm:         110,
                totalBeats:  16,
                targetSize:  90,
                displayTime: 1.0,
                perfectZone: 0.4,
                goodZone:    0.3
            },
            challenge: {
                label:       'チャレンジ',
                bpm:         140,
                totalBeats:  20,
                targetSize:  70,
                displayTime: 0.7,
                perfectZone: 0.4,
                goodZone:    0.3
            }
        };
        this.gameMode = this.modeSelect ? this.modeSelect.value : 'normal';

        this._bindEvents();
    }

    // ─── イベント ────────────────────────────────────────────────────────────

    _bindEvents() {
        this.startBtn.addEventListener('click', () => this._onStartClick());
        this.pauseBtn.addEventListener('click', () => this._togglePause());
        this.restartBtn.addEventListener('click', () => this._onStartClick());
        this.helpBtn.addEventListener('click', () => this._openHelp());
        this.helpCloseBtn.addEventListener('click', () => this._closeHelp());
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) this._closeHelp();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isHelpOpen) this._closeHelp();
        });
        this.modeSelect.addEventListener('change', () => {
            this.gameMode = this.modeSelect.value;
        });
    }

    _onStartClick() {
        this._resetState();
        this._showScreen('countdown');
        this._startCountdown();
    }

    _openHelp() {
        this.isHelpOpen = true;
        if (this.isRunning && !this.isPaused) {
            this.wasPausedBeforeHelp = false;
            this._pauseGame();
        } else {
            this.wasPausedBeforeHelp = this.isPaused;
        }
        this.helpModal.classList.remove('hidden');
    }

    _closeHelp() {
        this.isHelpOpen = false;
        this.helpModal.classList.add('hidden');
        if (this.isRunning && !this.wasPausedBeforeHelp) {
            this._resumeGame();
        }
    }

    _togglePause() {
        if (!this.isRunning) return;
        if (this.isPaused) {
            this._resumeGame();
        } else {
            this._pauseGame();
        }
    }

    // ─── ゲームフロー ────────────────────────────────────────────────────────

    _resetState() {
        this._clearAllTimers();
        this.score         = 0;
        this.comboCount    = 0;
        this.maxComboCount = 0;
        this.beatIndex     = 0;
        this.isPaused      = false;
        this.isRunning     = false;
        this.activeTargets = [];
        this.targetArea.innerHTML = '';
        this._updateHUD();
    }

    _startCountdown() {
        let count = 3;
        this.countdownNum.textContent = count;
        this.countdownTimerId = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(this.countdownTimerId);
                this.countdownTimerId = null;
                this._beginGame();
            } else {
                this.countdownNum.textContent = count;
            }
        }, 1000);
    }

    _beginGame() {
        this.isRunning = true;
        this.modeSelect.disabled = true;
        this.startBtn.classList.add('hidden');
        this.pauseBtn.classList.remove('hidden');
        this._initAudio();
        this._showScreen('play');
        this._scheduleNextBeat();
    }

    _pauseGame() {
        if (!this.isRunning || this.isPaused) return;
        this.isPaused = true;
        this.pauseBtn.textContent = '再開';
        clearTimeout(this.beatTimerId);
        this.beatTimerId = null;
        // Pause active target timers
        this.activeTargets.forEach(t => {
            if (t.timeoutId) {
                clearTimeout(t.timeoutId);
                t.timeoutId = null;
            }
            t.remainingTime = Math.max(0, t.expireTs - performance.now());
        });
    }

    _resumeGame() {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;
        this.pauseBtn.textContent = '一時停止';
        // Resume active target timers
        this.activeTargets.forEach(t => {
            t.expireTs = performance.now() + (t.remainingTime || 0);
            t.timeoutId = setTimeout(() => this._onTargetMiss(t), t.remainingTime || 0);
        });
        if (this.beatIndex < this._cfg().totalBeats) {
            this._scheduleNextBeat();
        }
    }

    _endGame() {
        this._clearAllTimers();
        this.isRunning = false;
        this.isPaused  = false;
        this.modeSelect.disabled = false;
        this.startBtn.classList.remove('hidden');
        this.pauseBtn.classList.add('hidden');
        this.pauseBtn.textContent = '一時停止';

        const cfg = this._cfg();
        const maxScore = cfg.totalBeats * 100;
        const ratio = maxScore > 0 ? this.score / maxScore : 0;

        let stars;
        if (ratio >= 0.9) {
            stars = 3;
        } else if (ratio >= 0.6) {
            stars = 2;
        } else {
            stars = 1;
        }
        this.starDisplayEl.textContent = '⭐'.repeat(stars);
        this.finalScoreEl.textContent  = this.score;
        this.maxComboEl.textContent    = this.maxComboCount;
        this._showScreen('gameover');
    }

    // ─── オーディオ ──────────────────────────────────────────────────────────

    _initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    _playNote(freq, duration) {
        if (!this.audioCtx) return;
        var osc = this.audioCtx.createOscillator();
        var gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.value = freq;

        var now = this.audioCtx.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    _playHitSound() {
        if (!this.audioCtx) return;
        var osc = this.audioCtx.createOscillator();
        var gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.value = 880;

        var now = this.audioCtx.currentTime;
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    _playMissSound() {
        if (!this.audioCtx) return;
        var osc = this.audioCtx.createOscillator();
        var gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.value = 150;

        var now = this.audioCtx.currentTime;
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    // ─── ビート・ターゲット ──────────────────────────────────────────────────

    _scheduleNextBeat() {
        if (!this.isRunning || this.isPaused) return;
        var cfg = this._cfg();
        if (this.beatIndex >= cfg.totalBeats) return;

        var beatInterval = 60000 / cfg.bpm;
        this.beatTimerId = setTimeout(() => {
            if (!this.isRunning || this.isPaused) return;
            this._showTarget();
            this.beatIndex++;
            this._updateHUD();
            if (this.beatIndex < cfg.totalBeats) {
                this._scheduleNextBeat();
            }
        }, this.beatIndex === 0 ? 300 : beatInterval);
    }

    _showTarget() {
        var cfg = this._cfg();
        var melody = this.melodies[this.gameMode];
        var noteKey = melody[this.beatIndex % melody.length];
        var freq = this.noteFreqs[noteKey];

        // Play the note
        this._playNote(freq, cfg.displayTime * 0.8);

        // Pick a random animal
        var animal = this.animals[Math.floor(Math.random() * this.animals.length)];

        // Random position within target area
        var areaRect = this.targetArea.getBoundingClientRect();
        var size = cfg.targetSize;
        var maxX = Math.max(0, areaRect.width - size);
        var maxY = Math.max(0, areaRect.height - size);
        var x = Math.floor(Math.random() * maxX);
        var y = Math.floor(Math.random() * maxY);

        // Create target element
        var el = document.createElement('div');
        el.className = 'target appearing';
        el.textContent = animal;
        el.style.width  = size + 'px';
        el.style.height = size + 'px';
        el.style.fontSize = (size * 0.55) + 'px';
        el.style.left = x + 'px';
        el.style.top  = y + 'px';
        this.targetArea.appendChild(el);

        var displayMs = cfg.displayTime * 1000;
        var appearedAt = performance.now();

        var targetObj = {
            el: el,
            appearedAt: appearedAt,
            displayMs: displayMs,
            expireTs: appearedAt + displayMs,
            remainingTime: displayMs,
            timeoutId: null,
            hit: false
        };

        // Transition to active after appear animation
        requestAnimationFrame(function() {
            if (!el.parentNode || targetObj.hit) return;
            el.classList.remove('appearing');
            el.classList.add('active');
        });

        // Handle click/tap
        var self = this;
        var handler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (targetObj.hit) return;
            targetObj.hit = true;
            clearTimeout(targetObj.timeoutId);
            self._onTargetClick(targetObj);
        };
        el.addEventListener('pointerdown', handler);

        // Schedule miss
        targetObj.timeoutId = setTimeout(function() {
            if (!targetObj.hit) {
                self._onTargetMiss(targetObj);
            }
        }, displayMs);

        this.activeTargets.push(targetObj);
    }

    _onTargetClick(target) {
        var cfg = this._cfg();
        var elapsed = performance.now() - target.appearedAt;
        var ratio = elapsed / target.displayMs;

        var points = 0;
        var msg = '';

        if (ratio <= cfg.perfectZone) {
            points = 100;
            msg = 'ぴったり！';
            target.el.className = 'target hit-perfect';
        } else if (ratio <= cfg.perfectZone + cfg.goodZone) {
            points = 50;
            msg = 'おしい！';
            target.el.className = 'target hit-good';
        } else {
            points = 25;
            msg = 'おそい！';
            target.el.className = 'target hit-good';
        }

        this.comboCount++;
        if (this.comboCount > this.maxComboCount) {
            this.maxComboCount = this.comboCount;
        }

        // Combo multiplier
        var multiplier = 1 + Math.floor(this.comboCount / 5) * 0.5;
        points = Math.round(points * multiplier);
        this.score += points;

        this._playHitSound();
        this._showFeedback(true, msg + ' +' + points);
        this._updateHUD();
        this._removeTarget(target);
        this._checkGameEnd();
    }

    _onTargetMiss(target) {
        if (target.hit) return;
        target.hit = true;
        target.el.className = 'target miss';
        this.comboCount = 0;
        this._playMissSound();
        this._showFeedback(false, 'ミス');
        this._updateHUD();
        this._removeTarget(target);
        this._checkGameEnd();
    }

    _removeTarget(target) {
        var el = target.el;
        var removalDelay = 400; // matches longest CSS hit/miss animation
        setTimeout(function() {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, removalDelay);
        var idx = this.activeTargets.indexOf(target);
        if (idx !== -1) this.activeTargets.splice(idx, 1);
    }

    _checkGameEnd() {
        var cfg = this._cfg();
        if (this.beatIndex >= cfg.totalBeats && this.activeTargets.length === 0) {
            setTimeout(() => this._endGame(), 500);
        }
    }

    _showFeedback(ok, msg) {
        this.feedbackEl.textContent = msg;
        this.feedbackEl.className = 'feedback ' + (ok ? 'ok' : 'ng');
        clearTimeout(this.feedbackTimerId);
        this.feedbackTimerId = setTimeout(() => {
            this.feedbackEl.className = 'feedback hidden';
        }, 800);
    }

    // ─── ユーティリティ ──────────────────────────────────────────────────────

    _cfg() { return this.modeConfigs[this.gameMode]; }

    _updateHUD() {
        var cfg = this._cfg();
        this.scoreEl.textContent = 'スコア: ' + this.score;
        this.comboEl.textContent = 'コンボ: ' + this.comboCount;
        this.levelEl.textContent = 'レベル: ' + cfg.label;
    }

    _showScreen(name) {
        this.startScreen.classList.add('hidden');
        this.countdownScreen.classList.add('hidden');
        this.playScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        if (name === 'start')     this.startScreen.classList.remove('hidden');
        if (name === 'countdown') this.countdownScreen.classList.remove('hidden');
        if (name === 'play')      this.playScreen.classList.remove('hidden');
        if (name === 'gameover')  this.gameOverScreen.classList.remove('hidden');
    }

    _clearAllTimers() {
        clearTimeout(this.beatTimerId);
        clearTimeout(this.feedbackTimerId);
        clearInterval(this.countdownTimerId);
        this.activeTargets.forEach(function(t) {
            if (t.timeoutId) clearTimeout(t.timeoutId);
        });
        this.beatTimerId      = null;
        this.feedbackTimerId  = null;
        this.countdownTimerId = null;
        this.activeTargets    = [];
        this.targetArea.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', function() { new RhythmTouch(); });
