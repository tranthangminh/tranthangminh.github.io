/**
 * Lucky Wheel - Winner Modal & Confetti Celebrations
 * (Separated from app.js)
 */

window.LuckyWheelWinnerModal = (function () {
    let winnerModal = null;
    let winnerNameEl = null;
    let modalSpinAgainBtn = null;
    let modalRemoveWinnerBtn = null;
    let winnerModalCloseBtn = null;

    let confettiEngine = null;
    let lastWinnerSlice = null;
    let onSpinAgainCallback = null;
    let onHideWinnerCallback = null;

    function init(options) {
        onSpinAgainCallback = options.onSpinAgain || function () {};
        onHideWinnerCallback = options.onHideWinner || function () {};

        const confettiCanvas = document.getElementById('confettiCanvas');
        if (confettiCanvas && window.ConfettiEngine) {
            confettiEngine = new window.ConfettiEngine(confettiCanvas);
        }

        winnerModal = document.getElementById('winnerModal');
        winnerNameEl = document.getElementById('winnerName');
        modalSpinAgainBtn = document.getElementById('modalSpinAgainBtn');
        modalRemoveWinnerBtn = document.getElementById('modalRemoveWinnerBtn');
        winnerModalCloseBtn = document.getElementById('winnerModalCloseBtn');

        if (modalSpinAgainBtn) {
            modalSpinAgainBtn.addEventListener('click', () => {
                close();
                if (confettiEngine) confettiEngine.stop();
                setTimeout(() => {
                    onSpinAgainCallback();
                }, 250);
            });
        }

        if (modalRemoveWinnerBtn) {
            modalRemoveWinnerBtn.addEventListener('click', () => {
                if (lastWinnerSlice) {
                    onHideWinnerCallback(lastWinnerSlice);
                }
                close();
                if (confettiEngine) confettiEngine.stop();
            });
        }

        if (winnerModalCloseBtn) {
            winnerModalCloseBtn.addEventListener('click', () => {
                close();
                if (confettiEngine) confettiEngine.stop();
            });
        }

        if (winnerModal) {
            winnerModal.addEventListener('click', (e) => {
                if (e.target === winnerModal) {
                    close();
                    if (confettiEngine) confettiEngine.stop();
                }
            });
        }
    }

    function show(winner, isEliminationMode) {
        lastWinnerSlice = winner;
        if (!winnerModal || !winnerNameEl) return;

        // Play celebrations
        if (confettiEngine) confettiEngine.fire(160);

        // Display Winner Modal
        winnerNameEl.textContent = winner.text;
        winnerNameEl.style.color = winner.color || '#e5c158';
        if (modalRemoveWinnerBtn) {
            modalRemoveWinnerBtn.style.display = isEliminationMode ? 'none' : 'block';
        }
        open();
    }

    function open() {
        if (winnerModal) winnerModal.classList.add('is-open');
    }

    function close() {
        if (winnerModal) winnerModal.classList.remove('is-open');
        if (confettiEngine) confettiEngine.stop();
    }

    function fireConfetti(count) {
        if (confettiEngine) confettiEngine.fire(count || 160);
    }

    function stopConfetti() {
        if (confettiEngine) confettiEngine.stop();
    }

    return {
        init,
        show,
        open,
        close,
        fireConfetti,
        stopConfetti
    };
})();
