// script.js (Regenerated - Reads Layout Values from CSS for Responsiveness)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container');
    const pyramidContainer = document.getElementById('pyramid');
    const stockPile = document.getElementById('stock');
    const wastePile = document.getElementById('waste');
    const messageElement = document.getElementById('message');
    const newGameButton = document.getElementById('new-game-button');
    const undoButton = document.getElementById('undo-button');
    const rulesButton = document.getElementById('rules-button');
    const closeRulesButton = document.getElementById('close-rules-button');
    const rulesModal = document.getElementById('rules-modal');
    const winMessageElement = document.getElementById('win-message');
    const scoreValueElement = document.getElementById('score-value');
    const highScoreValueElement = document.getElementById('high-score-value');
    const gameOverTextElement = document.getElementById('game-over-text');

    // Verify essential elements
    if (!gameContainer || !pyramidContainer || !stockPile || !wastePile || !messageElement || !newGameButton || !undoButton || !rulesButton || !closeRulesButton || !rulesModal || !winMessageElement || !scoreValueElement || !highScoreValueElement || !gameOverTextElement) {
        console.error("CRITICAL ERROR: One or more HTML elements are missing. Check IDs in index.html.");
        if(messageElement) messageElement.textContent = "Error: HTML structure incorrect. See console (F12).";
        return;
    }

    // --- Constants ---
    const SUITS = ["hearts", "diams", "clubs", "spades"];
    const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const VALUES = { "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13 };
    const SUIT_SYMBOLS = { hearts: '♥', diams: '♦', clubs: '♣', spades: '♠' };
    const HIGH_SCORE_KEY = 'pyramidHighScore';

    // --- Game State ---
    let pyramidCardsData = [];
    let stockCardsData = [];
    let wasteCardsData = [];
    let pyramidElementsMap = {};
    let wasteElement = null;
    let selectedCardInfo = null;
    let stockResetsRemaining = 1;
    let isGameOver = false;
    let score = 0;
    let highScore = 0;
    let moveHistory = [];

    // --- State Management Functions (captureGameState, loadGameState, saveStateBeforeAction) ---
    // These remain the same as the previous version for Undo functionality
    function captureGameState() {
        const deepCopy = (arr) => JSON.parse(JSON.stringify(arr));
        return {
            pyramidCardsData: deepCopy(pyramidCardsData), stockCardsData: deepCopy(stockCardsData), wasteCardsData: deepCopy(wasteCardsData),
            stockResetsRemaining: stockResetsRemaining, isGameOver: isGameOver, score: score,
        };
    }
    function loadGameState(state) {
        if (!state) return;
        pyramidCardsData = state.pyramidCardsData; stockCardsData = state.stockCardsData; wasteCardsData = state.wasteCardsData;
        stockResetsRemaining = state.stockResetsRemaining; isGameOver = state.isGameOver; score = state.score; selectedCardInfo = null;
        console.log("Loading state. Score:", score, "Resets left:", stockResetsRemaining);

        pyramidContainer.innerHTML = ''; wastePile.innerHTML = ''; pyramidElementsMap = {}; wasteElement = null;

        // --- Get Dynamic Layout Values from CSS --- (Also needed in load state)
        const computedStyle = getComputedStyle(document.documentElement);
        const cardWidth = parseFloat(computedStyle.getPropertyValue('--card-width').trim()) || 70;
        const cardHeight = parseFloat(computedStyle.getPropertyValue('--card-height').trim()) || 100;
        const cardRevealVertical = parseFloat(computedStyle.getPropertyValue('--card-reveal-vertical').trim()) || 65;
        const cardHorizontalSpacing = parseFloat(computedStyle.getPropertyValue('--card-horizontal-spacing').trim()) || 80;
        const pyramidWidth = cardHorizontalSpacing * 7 - (cardHorizontalSpacing - cardWidth);

        // Recreate UI based on loaded data AND dynamic dimensions
        pyramidCardsData.forEach((rowCards, row) => {
            const cardsInRow = row + 1; const rowWidth = cardHorizontalSpacing * cardsInRow - (cardHorizontalSpacing - cardWidth); const rowStartX = (pyramidWidth / 2) - (rowWidth / 2);
            rowCards.forEach((cardData, col) => {
                if (!cardData.isRemoved) {
                    const cardElement = createCardElement(cardData); pyramidElementsMap[cardData.id] = cardElement;
                    const cardLeft = rowStartX + col * cardHorizontalSpacing; const cardTop = row * cardRevealVertical;
                    cardElement.style.left = `${cardLeft}px`; cardElement.style.top = `${cardTop}px`; cardElement.style.zIndex = row;
                    cardElement.classList.toggle('card-back', !cardData.isFaceUp); cardElement.classList.toggle('available', cardData.isAvailable);
                    cardElement.style.display = 'block'; cardElement.classList.remove('removing', 'selected', 'invalid-shake');
                    pyramidContainer.appendChild(cardElement);
                }
            });
        });
        if (wasteCardsData.length > 0) { const topWasteData = wasteCardsData[wasteCardsData.length - 1]; if(!topWasteData.isRemoved){ wasteElement = createCardElement(topWasteData); wasteElement.classList.remove('card-back'); wasteElement.classList.add('available'); wasteElement.style.position = 'relative'; wasteElement.style.left = '0'; wasteElement.style.top = '0'; wastePile.appendChild(wasteElement); } }
        updateStockPileVisual(); updateScoreDisplay(); updateHighScoreDisplay();
        gameContainer.classList.toggle('game-over', isGameOver); gameOverTextElement.textContent = '';
        undoButton.disabled = moveHistory.length === 0; messageElement.textContent = '';
    }
    function saveStateBeforeAction() { moveHistory.push(captureGameState()); undoButton.disabled = false; }

    // --- Core Functions ---
    function createDeck() { /* Unchanged */ const newDeck = []; SUITS.forEach(suit => { RANKS.forEach(rank => { newDeck.push({ suit: suit, rank: rank, value: VALUES[rank], id: `${rank}-${suit}`, isFaceUp: false, isAvailable: false, isRemoved: false, coveredBy: []}); }); }); return newDeck; }
    function shuffleDeck(deckToShuffle) { /* Unchanged */ for (let i = deckToShuffle.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]]; } }
    function createCardElement(cardData) { /* Unchanged */ const cardElement = document.createElement('div'); cardElement.classList.add('card', `suit-${cardData.suit}`, `rank-${cardData.rank}`); cardElement.id = cardData.id; cardElement.dataset.value = cardData.value; cardElement.dataset.rank = cardData.rank; cardElement.dataset.suit = cardData.suit; const suitSymbol = SUIT_SYMBOLS[cardData.suit]; const rankDisplay = cardData.rank; const topLeft = document.createElement('div'); topLeft.classList.add('corner', 'top-left'); topLeft.innerHTML = `<span class="rank">${rankDisplay}</span><span class="suit">${suitSymbol}</span>`; const centerSuit = document.createElement('div'); centerSuit.classList.add('center-suit'); centerSuit.textContent = suitSymbol; const bottomRight = document.createElement('div'); bottomRight.classList.add('corner', 'bottom-right'); bottomRight.innerHTML = `<span class="rank">${rankDisplay}</span><span class="suit">${suitSymbol}</span>`; cardElement.appendChild(topLeft); cardElement.appendChild(centerSuit); cardElement.appendChild(bottomRight); cardElement.classList.add('card-back'); cardElement.addEventListener('click', handleCardClick); return cardElement; }
    function calculateCoveredBy(pyramidRows) { /* Unchanged */ for (let r = 0; r < pyramidRows.length - 1; r++) { for (let c = 0; c < pyramidRows[r].length; c++) { pyramidRows[r][c].coveredBy = []; if (pyramidRows[r + 1]?.[c]) { pyramidRows[r][c].coveredBy.push(pyramidRows[r + 1][c].id); } if (pyramidRows[r + 1]?.[c + 1]) { pyramidRows[r][c].coveredBy.push(pyramidRows[r + 1][c + 1].id); } } } }
    function updateScoreDisplay() { /* Unchanged */ if (scoreValueElement) { scoreValueElement.textContent = score; } }
    function updateHighScoreDisplay() { /* Unchanged */ if (highScoreValueElement) { highScoreValueElement.textContent = highScore; } }
    function loadHighScore() { /* Unchanged */ highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0'); updateHighScoreDisplay(); }
    function saveHighScoreIfBeat() { /* Unchanged */ if (score > highScore) { highScore = score; localStorage.setItem(HIGH_SCORE_KEY, highScore); updateHighScoreDisplay(); } }

    function startGame() {
        console.log("Starting new game...");
        // Reset state variables
        pyramidCardsData = []; stockCardsData = []; wasteCardsData = []; pyramidElementsMap = {}; wasteElement = null; selectedCardInfo = null;
        stockResetsRemaining = 1; isGameOver = false; score = 0; moveHistory = [];

        updateScoreDisplay(); loadHighScore();
        gameContainer.classList.remove('game-over'); gameOverTextElement.textContent = '';
        pyramidContainer.innerHTML = ''; wastePile.innerHTML = '';
        stockPile.classList.add('card-back'); stockPile.classList.remove('empty', 'resettable'); stockPile.style.cursor = 'pointer';
        messageElement.textContent = ''; winMessageElement.textContent = ''; winMessageElement.style.display = 'none';
        undoButton.disabled = true;

        // --- Get Dynamic Layout Values from CSS ---
        const computedStyle = getComputedStyle(document.documentElement);
        // Provide fallback default values in case CSS variables are missing
        const cardWidth = parseFloat(computedStyle.getPropertyValue('--card-width').trim()) || 70;
        const cardHeight = parseFloat(computedStyle.getPropertyValue('--card-height').trim()) || 100; // Needed? Only for potential height calculations
        const cardRevealVertical = parseFloat(computedStyle.getPropertyValue('--card-reveal-vertical').trim()) || 65;
        const cardHorizontalSpacing = parseFloat(computedStyle.getPropertyValue('--card-horizontal-spacing').trim()) || (cardWidth + 10); // Calculate based on cardWidth if needed

        console.log(`Using dimensions: Width=${cardWidth}, RevealY=${cardRevealVertical}, SpacingX=${cardHorizontalSpacing}`);

        // Create and shuffle deck
        let currentDeck = createDeck(); shuffleDeck(currentDeck);

        // Deal Pyramid Data Structure
        let cardIndex = 0;
        for (let row = 0; row < 7; row++) { let rowCards = []; for (let col = 0; col <= row; col++) { if (cardIndex < 28) { const cardData = currentDeck[cardIndex]; rowCards.push(cardData); cardIndex++; } } pyramidCardsData.push(rowCards); }
        calculateCoveredBy(pyramidCardsData);

        // Deal Stock Data
        stockCardsData = currentDeck.slice(28);

        // Deal Pyramid UI (Using dynamic dimensions)
        // Calculate pyramid base width based on dynamic spacing
        const pyramidWidth = cardHorizontalSpacing * 7 - (cardHorizontalSpacing - cardWidth);
        pyramidCardsData.forEach((rowCards, row) => {
            const cardsInRow = row + 1;
            // Calculate row width based on dynamic spacing
            const rowWidth = cardHorizontalSpacing * cardsInRow - (cardHorizontalSpacing - cardWidth);
            const rowStartX = (pyramidWidth / 2) - (rowWidth / 2);
            rowCards.forEach((cardData, col) => {
                cardData.isAvailable = cardData.coveredBy.length === 0;
                cardData.isFaceUp = cardData.isAvailable;
                const cardElement = createCardElement(cardData);
                pyramidElementsMap[cardData.id] = cardElement;
                // Calculate position using dynamic dimensions
                const cardLeft = rowStartX + col * cardHorizontalSpacing;
                const cardTop = row * cardRevealVertical;
                cardElement.style.left = `${cardLeft}px`; cardElement.style.top = `${cardTop}px`; cardElement.style.zIndex = row;
                cardElement.classList.toggle('card-back', !cardData.isFaceUp); cardElement.classList.toggle('available', cardData.isAvailable);
                pyramidContainer.appendChild(cardElement);
            });
        });

        updateStockPileVisual();
        markWasteTopAvailable();
        messageElement.textContent = 'Select pairs adding to 13, or single Kings.';
    }


    function updateStockPileVisual() { /* Unchanged */ if (!stockPile) return; if (stockCardsData.length > 0) { stockPile.classList.add('card-back'); stockPile.classList.remove('empty', 'resettable'); stockPile.style.cursor = 'pointer'; } else { stockPile.classList.remove('card-back'); stockPile.classList.add('empty'); if (wasteCardsData.length > 0 && stockResetsRemaining > 0) { stockPile.style.cursor = 'pointer'; stockPile.classList.add('resettable'); } else { stockPile.style.cursor = 'default'; stockPile.classList.remove('resettable'); } } }

    function markWasteTopAvailable() { /* Unchanged */ wasteCardsData.forEach((card, index) => { const isTop = index === wasteCardsData.length - 1; card.isAvailable = isTop && !card.isRemoved; const element = (index === wasteCardsData.length - 1) ? wasteElement : null; if(element) element.classList.toggle('available', card.isAvailable); }); if (wasteCardsData.length === 0) wasteElement = null; else if(wastePile.lastChild) wasteElement = wastePile.lastChild; }

    function updateAvailability() { /* Unchanged - relies on pyramidCardsData state */
        let changed = false; pyramidCardsData.flat().forEach(card => { if (!card.isRemoved && !card.isFaceUp) { const coveringCardsRemoved = card.coveredBy.every(coverId => pyramidCardsData.flat().find(c => c.id === coverId)?.isRemoved); if (coveringCardsRemoved) { card.isFaceUp = true; card.isAvailable = true; changed = true; const element = pyramidElementsMap[card.id]; if (element) { element.classList.remove('card-back'); element.classList.add('available'); } } } else if (!card.isRemoved && card.isFaceUp) { const stillCovered = card.coveredBy.some(coverId => !pyramidCardsData.flat().find(c => c.id === coverId)?.isRemoved ); const shouldBeAvailable = card.isFaceUp && !stillCovered; if(card.isAvailable !== shouldBeAvailable){ card.isAvailable = shouldBeAvailable; changed = true; const element = pyramidElementsMap[card.id]; if(element) element.classList.toggle('available', card.isAvailable); } } else if (card.isRemoved) { if (card.isAvailable){ card.isAvailable = false; changed = true; const element = pyramidElementsMap[card.id]; if(element) element.classList.remove('available'); } } }); markWasteTopAvailable(); return changed;
    }


    function performRemoval(cardsToRemoveInfo) { /* Unchanged - uses state */
         if (isGameOver) return; saveStateBeforeAction();
         let pointsEarned = 0; if (cardsToRemoveInfo.length === 1 && cardsToRemoveInfo[0].data.value === 13) { pointsEarned = 10; } else if (cardsToRemoveInfo.length === 2) { pointsEarned = 5; } score += pointsEarned; updateScoreDisplay(); saveHighScoreIfBeat();
         cardsToRemoveInfo.forEach(info => { if (info.sourceElement && !info.data.isRemoved) { info.sourceElement.classList.add('removing'); info.sourceElement.classList.remove('selected', 'available'); } });
         setTimeout(() => { cardsToRemoveInfo.forEach(info => { const cardData = info.data; if (cardData && !cardData.isRemoved) { cardData.isRemoved = true; cardData.isAvailable = false; cardData.isFaceUp = false; if (wasteElement && wasteElement.id === cardData.id) { wasteElement = null; } } }); selectedCardInfo = null; updateAvailability(); if (!checkForWin()) { checkForLoss(); } }, 300);
     }

    function isPyramidClear() { /* Unchanged */ let pyramidCardCount = 0; const allRemoved = pyramidCardsData.flat().every(card => { pyramidCardCount++; return card.isRemoved; }); return pyramidCardCount === 28 && allRemoved; }

    function checkForWin() { /* Unchanged */ if (isPyramidClear()) { messageElement.textContent = 'Pyramid Cleared!'; winMessageElement.textContent = "Like a swan gliding silently over still waters, strength often hides beneath the surface—graceful, steady, and unseen."; winMessageElement.style.display = 'block'; score += 100; updateScoreDisplay(); saveHighScoreIfBeat(); isGameOver = true; gameContainer.classList.add('game-over'); gameOverTextElement.textContent = "You Win!"; stockPile.style.cursor = 'default'; undoButton.disabled = true; return true; } return false; }

    function checkForValidMoves() { /* Unchanged */ if (isGameOver) return false; const availableCards = []; pyramidCardsData.flat().forEach(card => { if (card.isAvailable && !card.isRemoved) availableCards.push(card); }); if (wasteCardsData.length > 0) { const topWaste = wasteCardsData[wasteCardsData.length - 1]; if (topWaste.isAvailable && !topWaste.isRemoved) availableCards.push(topWaste); } for (const card of availableCards) if (card.value === 13) return true; for (let i = 0; i < availableCards.length; i++) for (let j = i + 1; j < availableCards.length; j++) if (availableCards[i].value + availableCards[j].value === 13) return true; return false; }

    function checkForLoss() { /* Unchanged */ if (isGameOver) return; const noResetsLeft = stockResetsRemaining <= 0; const stockIsEmpty = stockCardsData.length === 0; if (stockIsEmpty && noResetsLeft && !checkForValidMoves()) { messageElement.textContent = 'Game Over - No more valid moves!'; isGameOver = true; gameContainer.classList.add('game-over'); gameOverTextElement.textContent = "Game Over"; stockPile.style.cursor = 'default'; undoButton.disabled = true; saveHighScoreIfBeat(); } }

    function triggerInvalidShake(element) { /* Unchanged */ if (!element) return; element.classList.add('invalid-shake'); setTimeout(() => { element.classList.remove('invalid-shake'); }, 400); }

    // --- Event Handlers ---

    function handleCardClick(event) { /* Unchanged */
        if (isGameOver) return; const clickedElement = event.currentTarget; const cardId = clickedElement.id; let cardData = pyramidCardsData.flat().find(c => c.id === cardId && !c.isRemoved); let isWasteCard = false; if (!cardData && wasteCardsData.length > 0 && wasteCardsData[wasteCardsData.length - 1].id === cardId) { cardData = wasteCardsData[wasteCardsData.length - 1]; isWasteCard = true; } if (!cardData || !cardData.isAvailable || cardData.isRemoved) return;
        messageElement.textContent = ''; if (selectedCardInfo && selectedCardInfo.data.id === cardId) { selectedCardInfo.sourceElement.classList.remove('selected'); selectedCardInfo = null; return; }
        if (selectedCardInfo) { const firstCard = selectedCardInfo.data; const secondCard = cardData; if (firstCard.value + secondCard.value === 13) { performRemoval([selectedCardInfo, { data: secondCard, sourceElement: clickedElement }]); selectedCardInfo = null; } else { messageElement.textContent = 'Selected cards do not sum to 13.'; triggerInvalidShake(selectedCardInfo.sourceElement); triggerInvalidShake(clickedElement); selectedCardInfo.sourceElement.classList.remove('selected'); selectedCardInfo = null; } }
        else { if (cardData.value === 13) { performRemoval([{ data: cardData, sourceElement: clickedElement }]); selectedCardInfo = null; } else { selectedCardInfo = { data: cardData, sourceElement: clickedElement }; clickedElement.classList.add('selected'); } }
    }

    function handleStockClick() { /* Unchanged */
         if (isGameOver) return; if (selectedCardInfo){ selectedCardInfo.sourceElement?.classList.remove('selected'); selectedCardInfo = null; messageElement.textContent = ''; }
         if (stockCardsData.length > 0) { saveStateBeforeAction(); const cardToMove = stockCardsData.pop(); cardToMove.isFaceUp = true; wasteCardsData.push(cardToMove); wastePile.innerHTML = ''; wasteElement = createCardElement(cardToMove); wasteElement.classList.remove('card-back'); wasteElement.classList.add('available', 'new-waste-card'); wasteElement.style.position = 'relative'; wasteElement.style.left = '0'; wasteElement.style.top = '0'; wastePile.appendChild(wasteElement); setTimeout(() => wasteElement?.classList.remove('new-waste-card'), 400); updateStockPileVisual(); markWasteTopAvailable(); checkForLoss(); }
         else if (wasteCardsData.length > 0 && stockResetsRemaining > 0) { saveStateBeforeAction(); console.log("Resetting stock..."); stockResetsRemaining--; messageElement.textContent = `Resetting waste to stock (${stockResetsRemaining} resets left).`; /* Optional: score -= 20; updateScoreDisplay(); */ stockCardsData = wasteCardsData.reverse(); stockCardsData.forEach(card => { card.isFaceUp = false; card.isAvailable = false; }); wasteCardsData = []; wastePile.innerHTML = ''; wasteElement = null; markWasteTopAvailable(); updateStockPileVisual(); checkForLoss(); }
         else { console.log("Stock is empty, no reset possible."); messageElement.textContent = 'Stock empty.'; checkForLoss(); }
    }

    function handleUndoClick() { /* Unchanged */ if (moveHistory.length > 0) { console.log("Undoing last move..."); const previousState = moveHistory.pop(); loadGameState(previousState); } else { console.log("No moves to undo."); } }

    function openRulesModal() { /* Unchanged */ rulesModal.style.display = "block"; }
    function closeRulesModal() { /* Unchanged */ rulesModal.style.display = "none"; }

    // --- Initialization ---
    newGameButton.addEventListener('click', startGame);
    stockPile.addEventListener('click', handleStockClick);
    undoButton.addEventListener('click', handleUndoClick);
    rulesButton.addEventListener('click', openRulesModal);
    closeRulesButton.addEventListener('click', closeRulesModal);
    window.addEventListener('click', (event) => { if (event.target == rulesModal) { closeRulesModal(); } });

    loadHighScore(); // Load high score initially
    startGame(); // Start the first game

}); // End DOMContentLoaded
