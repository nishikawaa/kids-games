class FlashSanzan {
    constructor() {
        // DOM refs
        this.scoreEl      = document.getElementById('score');
        this.levelEl      = document.getElementById('level');
        this.timeEl       = document.getElementById('time');
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
        this.problemScreen   = document.getElementById('problemScreen');
        this.gameOverScreen  = document.getElementById('gameOver');

        // problem screen elements
        this.problemDisplay = document.getElementById('problemDisplay');
        this.timerFill      = document.getElementById('timerFill');
        this.choicesGrid    = document.getElementById('choicesGrid');
        this.feedbackEl     = document.getElementById('feedback');

        // result screen elements
        this.starDisplayEl  = document.getElementById('starDisplay');
        this.correctCountEl = document.getElementById('correctCount');
        this.totalCountEl   = document.getElementById('totalCount');

        // game state
        this.correctCount  = 0;
        this.questionIndex = 0;   // 現在の問題番号（0始まり）
        this.isRunning     = false;
        this.isPaused      = false;
        this.isHelpOpen    = false;
        this.wasPausedBeforeHelp = false;

        // timing
        this.pausedTime      = 0;
        this.pauseStartTs    = 0;
        this.problemTimerId  = null;
        this.feedbackTimerId = null;
        this.countdownTimerId = null;

        // modes: totalQuestions × problemTimeSec ≈ 30〜50秒
        this.modeConfigs = {
            easy: {
                label:          'やさしい',
                ops:            ['+'],
                maxNum:         5,
                totalQuestions: 5,
                problemTimeSec: 3
            },
            normal: {
                label:          'ふつう',
                ops:            ['+', '-'],
                maxNum:         10,
                totalQuestions: 8,
                problemTimeSec: 2.5
            },
            challenge: {
                label:          'チャレンジ',
                ops:            ['+', '-'],
                maxNum:         15,
                totalQuestions: 10,
                problemTimeSec: 2
            }
        };
        this.gameMode = this.modeSelect ? this.modeSelect.value : 'normal';

        // current problem
        this.currentAnswer  = 0;
        this.problemStartTs = 0;
        this.problemRafId   = null;
        this.answeredCurrent = false;

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
        this.correctCount  = 0;
        this.questionIndex = 0;
        this.isPaused      = false;
        this.isRunning     = false;
        this.pausedTime    = 0;
        this.pauseStartTs  = 0;
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
        this.pausedTime = 0;
        this.modeSelect.disabled = true;
        this.startBtn.classList.add('hidden');
        this.pauseBtn.classList.remove('hidden');
        this._showScreen('problem');
        this._nextProblem();
    }

    _pauseGame() {
        if (!this.isRunning || this.isPaused) return;
        this.isPaused = true;
        this.pauseStartTs = performance.now();
        this.pauseBtn.textContent = '再開';
        if (this.problemRafId) {
            cancelAnimationFrame(this.problemRafId);
            this.problemRafId = null;
        }
        clearTimeout(this.problemTimerId);
        this.problemTimerId = null;
    }

    _resumeGame() {
        if (!this.isRunning || !this.isPaused) return;
        const pauseDuration = performance.now() - this.pauseStartTs;
        this.pausedTime += pauseDuration;
        this.problemStartTs += pauseDuration;
        this.isPaused = false;
        this.pauseBtn.textContent = '一時停止';
        if (!this.answeredCurrent) {
            this._animateProblemTimer();
            this._scheduleProblemTimeout();
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

        const total = this._cfg().totalQuestions;
        // ⭐評価
        let stars;
        if (this.correctCount === total) {
            stars = 3;
        } else if (this.correctCount >= Math.ceil(total / 2)) {
            stars = 2;
        } else {
            stars = 1;
        }
        this.starDisplayEl.textContent = '⭐'.repeat(stars);
        this.correctCountEl.textContent = this.correctCount;
        this.totalCountEl.textContent   = total;
        this._showScreen('gameover');
    }

    // ─── 問題 ────────────────────────────────────────────────────────────────

    _nextProblem() {
        if (!this.isRunning) return;
        const cfg = this._cfg();

        // 全問終了チェック
        if (this.questionIndex >= cfg.totalQuestions) {
            this._endGame();
            return;
        }

        this.answeredCurrent = false;
        this.feedbackEl.classList.add('hidden');
        this.feedbackEl.className = 'feedback hidden';
        this._updateHUD();

        const { a, b, op, answer } = this._generateProblem();
        this.currentAnswer = answer;

        const opSymbol = op === '+' ? '＋' : '－';
        this.problemDisplay.textContent = `${a} ${opSymbol} ${b} ＝ ？`;

        this._renderChoices(answer);

        // タイマーバー
        this.timerFill.style.transition = 'none';
        this.timerFill.style.width = '100%';
        this.timerFill.classList.remove('warning');
        this.problemStartTs = performance.now();
        requestAnimationFrame(() => {
            this._animateProblemTimer();
            this._scheduleProblemTimeout();
        });
    }

    _generateProblem() {
        const cfg = this._cfg();
        const op  = cfg.ops[Math.floor(Math.random() * cfg.ops.length)];
        const max = cfg.maxNum;

        let a, b, answer;
        if (op === '+') {
            a = this._randInt(1, max);
            b = this._randInt(1, max);
            answer = a + b;
        } else {
            a = this._randInt(1, max);
            b = this._randInt(1, a); // 答えが0以上になるよう
            answer = a - b;
        }
        return { a, b, op, answer };
    }

    _renderChoices(correct) {
        const choices = this._makeChoices(correct);
        this.choicesGrid.innerHTML = '';
        choices.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = val;
            btn.addEventListener('click', () => this._onChoiceClick(btn, val));
            this.choicesGrid.appendChild(btn);
        });
    }

    _makeChoices(correct) {
        const set = new Set([correct]);
        const cfg = this._cfg();
        const range = Math.max(cfg.maxNum, correct + 5);
        while (set.size < 4) {
            const delta = this._randInt(-4, 4);
            const cand  = correct + delta;
            if (cand !== correct && cand >= 0 && cand <= range + 5) set.add(cand);
        }
        return this._shuffle([...set]);
    }

    _animateProblemTimer() {
        if (this.isPaused || !this.isRunning || this.answeredCurrent) return;
        const cfg = this._cfg();
        const totalMs = cfg.problemTimeSec * 1000;
        const elapsed = performance.now() - this.problemStartTs;
        const ratio   = Math.max(0, 1 - elapsed / totalMs);
        this.timerFill.style.transition = 'none';
        this.timerFill.style.width = (ratio * 100) + '%';
        if (ratio < 0.35) {
            this.timerFill.classList.add('warning');
        }
        if (ratio > 0) {
            this.problemRafId = requestAnimationFrame(() => this._animateProblemTimer());
        }
    }

    _scheduleProblemTimeout() {
        const cfg = this._cfg();
        const totalMs   = cfg.problemTimeSec * 1000;
        const elapsed   = performance.now() - this.problemStartTs;
        const remaining = Math.max(0, totalMs - elapsed);
        this.problemTimerId = setTimeout(() => {
            if (!this.answeredCurrent && this.isRunning && !this.isPaused) {
                this._onTimeout();
            }
        }, remaining);
    }

    _onTimeout() {
        this._disableChoices();
        // 正解ボタンを光らせる
        this.choicesGrid.querySelectorAll('.choice-btn').forEach(b => {
            if (Number(b.textContent) === this.currentAnswer) b.classList.add('correct');
        });
        this._showFeedback(false, '⏰ じかんきれ！');
        this.questionIndex++;
        this._scheduleNext(1200);
    }

    _onChoiceClick(btn, val) {
        if (this.answeredCurrent || this.isPaused || !this.isRunning) return;
        this.answeredCurrent = true;
        clearTimeout(this.problemTimerId);
        if (this.problemRafId) {
            cancelAnimationFrame(this.problemRafId);
            this.problemRafId = null;
        }

        const correct = val === this.currentAnswer;
        this._disableChoices();
        btn.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
            // 正解ボタンも光らせる（まちがえてもペナルティなし）
            this.choicesGrid.querySelectorAll('.choice-btn').forEach(b => {
                if (Number(b.textContent) === this.currentAnswer) b.classList.add('correct');
            });
        }

        if (correct) {
            this.correctCount++;
            this._showFeedback(true, '⭕ せいかい！');
        } else {
            this._showFeedback(false, '✖ まちがい');
        }

        this.questionIndex++;
        this._scheduleNext(900);
    }

    _disableChoices() {
        this.choicesGrid.querySelectorAll('.choice-btn').forEach(b => { b.disabled = true; });
    }

    _showFeedback(ok, msg) {
        this.feedbackEl.textContent = msg;
        this.feedbackEl.className = 'feedback ' + (ok ? 'ok' : 'ng');
    }

    _scheduleNext(delayMs) {
        clearTimeout(this.feedbackTimerId);
        this.feedbackTimerId = setTimeout(() => {
            if (this.isRunning && !this.isPaused) this._nextProblem();
        }, delayMs);
    }

    // ─── ユーティリティ ──────────────────────────────────────────────────────

    _cfg() { return this.modeConfigs[this.gameMode]; }

    _randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    _updateHUD() {
        const cfg = this._cfg();
        this.scoreEl.textContent = `もんだい: ${this.questionIndex + 1}/${cfg.totalQuestions}`;
        this.levelEl.textContent = `せいかい: ${this.correctCount}`;
        this.timeEl.textContent  = `のこり: ${cfg.totalQuestions - this.questionIndex}もん`;
    }

    _showScreen(name) {
        this.startScreen.classList.add('hidden');
        this.countdownScreen.classList.add('hidden');
        this.problemScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        if (name === 'start')     this.startScreen.classList.remove('hidden');
        if (name === 'countdown') this.countdownScreen.classList.remove('hidden');
        if (name === 'problem')   this.problemScreen.classList.remove('hidden');
        if (name === 'gameover')  this.gameOverScreen.classList.remove('hidden');
    }

    _clearAllTimers() {
        clearTimeout(this.problemTimerId);
        clearTimeout(this.feedbackTimerId);
        clearInterval(this.countdownTimerId);
        if (this.problemRafId) cancelAnimationFrame(this.problemRafId);
        this.problemTimerId   = null;
        this.feedbackTimerId  = null;
        this.countdownTimerId = null;
        this.problemRafId     = null;
    }
}

document.addEventListener('DOMContentLoaded', () => { new FlashSanzan(); });
