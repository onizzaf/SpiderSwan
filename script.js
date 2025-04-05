// script.js (Regenerated - With Undo, High Score, Polish)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container');
    const pyramidContainer = document.getElementById('pyramid');
    const stockPile = document.getElementById('stock');
    const wastePile = document.getElementById('waste');
    const messageElement = document.getElementById('message');
    const newGameButton = document.getElementById('new-game-button');
    const undoButton = document.getElementById('undo-button'); // Added
    const rulesButton = document.getElementById('rules-button'); // Added
    const closeRulesButton = document.getElementById('close-rules-button'); // Added
    const rulesModal = document.getElementById('rules-modal'); // Added
    const winMessageElement = document.getElementById('win-message');
    const scoreValueElement = document.getElementById('score-value');
    const highScoreValueElement = document.getElementById('high-score-value'); // Added
    const gameOverTextElement = document.getElementById('game-over-text'); // Added

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
    const CARD_WIDTH = 70; const CARD_HEIGHT = 100; const CARD_REVEAL_VERTICAL = 65; const CARD_HORIZONTAL_SPACING = CARD_WIDTH + 10;
    const HIGH_SCORE_KEY = 'pyramidHighScore'; // Key for localStorage

    // --- Game State ---
    // Encapsulated in functions for easier saving/loading for Undo
    let pyramidCardsData = []; // Array of rows of card *data*
    let stockCardsData = [];
    let wasteCardsData = [];
    let pyramidElementsMap = {}; // Map ID to element (for quick access)
    let wasteElement = null; // Reference to the single element in waste pile
    let selectedCardInfo = null; // Store info { data, sourceElement } for ONE selected card
    let stockResetsRemaining = 1;
    let isGameOver = false;
    let score = 0;
    let highScore = 0;
    let moveHistory = []; // Stack for storing previous game states for Undo

    // --- State Management Functions (for Undo) ---

    // Creates a snapshot of the current game state
    function captureGameState() {
        // Need deep copies of arrays of objects
        const deepCopy = (arr) => JSON.parse(JSON.stringify(arr));

        return {
            pyramidCardsData: deepCopy(pyramidCardsData),
            stockCardsData: deepCopy(stockCardsData),
            wasteCardsData: deepCopy(wasteCardsData),
            stockResetsRemaining: stockResetsRemaining,
            isGameOver: isGameOver,
            score: score,
            // We don't save/restore selectedCardInfo - undo deselects
            // We don't save/restore elements map - it's rebuilt on load
        };
    }

    // Restores the game state AND updates the UI accordingly
    function loadGameState(state) {
        if (!state) return;

        pyramidCardsData = state.pyramidCardsData;
        stockCardsData = state.stockCardsData;
        wasteCardsData = state.wasteCardsData;
        stockResetsRemaining = state.stockResetsRemaining;
        isGameOver = state.isGameOver;
        score = state.score;
        selectedCardInfo = null; // Always deselect on load/undo

        console.log("Loading state. Score:", score, "Resets left:", stockResetsRemaining);

        // --- Rebuild UI from loaded state ---
        pyramidContainer.innerHTML = ''; // Clear old pyramid elements
        wastePile.innerHTML = ''; // Clear old waste element
        pyramidElementsMap = {}; // Clear element map
        wasteElement = null;

        // Recreate pyramid cards
        const pyramidWidth = CARD_HORIZONTAL_SPACING * 7 - (CARD_HORIZONTAL_SPACING - CARD_WIDTH);
        pyramidCardsData.forEach((rowCards, row) => {
            const cardsInRow = row + 1;
            const rowWidth = CARD_HORIZONTAL_SPACING * cardsInRow - (CARD_HORIZONTAL_SPACING - CARD_WIDTH);
            const rowStartX = (pyramidWidth / 2) - (rowWidth / 2);
            rowCards.forEach((cardData, col) => {
                // Only create element if card is not removed
                if (!cardData.isRemoved) {
                    const cardElement = createCardElement(cardData); // Recreate element
                    pyramidElementsMap[cardData.id] = cardElement; // Store ref

                    const cardLeft = rowStartX + col * CARD_HORIZONTAL_SPACING;
                    const cardTop = row * CARD_REVEAL_VERTICAL;
                    cardElement.style.left = `${cardLeft}px`;
                    cardElement.style.top = `${cardTop}px`;
                    cardElement.style.zIndex = row;

                    // Set visual state based on loaded data
                    cardElement.classList.toggle('card-back', !cardData.isFaceUp);
                    cardElement.classList.toggle('available', cardData.isAvailable);
                    cardElement.style.display = 'block'; // Ensure visible
                    cardElement.classList.remove('removing', 'selected', 'invalid-shake'); // Clean classes

                    pyramidContainer.appendChild(cardElement);
                }
            });
        });

        // Recreate waste card (if any)
        if (wasteCardsData.length > 0) {
            const topWasteData = wasteCardsData[wasteCardsData.length - 1];
             if(!topWasteData.isRemoved){ // Should not be removed, but check
                wasteElement = createCardElement(topWasteData);
                wasteElement.classList.remove('card-back');
                wasteElement.classList.add('available');
                wasteElement.style.position = 'relative';
                wasteElement.style.left = '0'; wasteElement.style.top = '0';
                wastePile.appendChild(wasteElement);
             }
        }

        // Update Stock pile appearance
        updateStockPileVisual();

        // Update Score displays
        updateScoreDisplay();
        updateHighScoreDisplay(); // High score doesn't change on undo, but good practice

        // Update Game Over state
        gameContainer.classList.toggle('game-over', isGameOver);
        gameOverTextElement.textContent = ''; // Clear specific text (re-set by win/loss check if needed)

        // Update Undo button state
        undoButton.disabled = moveHistory.length === 0;

        // Update message
        messageElement.textContent = ''; // Clear messages on undo/load
    }

    // Saves state BEFORE performing an action
    function saveStateBeforeAction() {
        moveHistory.push(captureGameState());
        undoButton.disabled = false; // Enable undo button
        // console.log("History length:", moveHistory.length); // For debugging
    }

    // --- Core Functions (Modified for State/Undo) ---

    function createDeck() { /* Unchanged */
        const newDeck = []; SUITS.forEach(suit => { RANKS.forEach(rank => { newDeck.push({ suit: suit, rank: rank, value: VALUES[rank], id: `${rank}-${suit}`, isFaceUp: false, isAvailable: false, isRemoved: false, coveredBy: []}); }); }); return newDeck;
    }
    function shuffleDeck(deckToShuffle) { /* Unchanged */
        for (let i = deckToShuffle.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]]; }
    }
    function createCardElement(cardData) { /* Unchanged */
        const cardElement = document.createElement('div'); cardElement.classList.add('card', `suit-${cardData.suit}`, `rank-${cardData.rank}`); cardElement.id = cardData.id; cardElement.dataset.value = cardData.value; cardElement.dataset.rank = cardData.rank; cardElement.dataset.suit = cardData.suit;
        const suitSymbol = SUIT_SYMBOLS[cardData.suit]; const rankDisplay = cardData.rank;
        const topLeft = document.createElement('div'); topLeft.classList.add('corner', 'top-left'); topLeft.innerHTML = `<span class="rank">${rankDisplay}</span><span class="suit">${suitSymbol}</span>`;
        const centerSuit = document.createElement('div'); centerSuit.classList.add('center-suit'); centerSuit.textContent = suitSymbol;
        const bottomRight = document.createElement('div'); bottomRight.classList.add('corner', 'bottom-right'); bottomRight.innerHTML = `<span class="rank">${rankDisplay}</span><span class="suit">${suitSymbol}</span>`;
        cardElement.appendChild(topLeft); cardElement.appendChild(centerSuit); cardElement.appendChild(bottomRight); cardElement.classList.add('card-back');
        cardElement.addEventListener('click', handleCardClick); // Add listener here
        return cardElement;
     }
    function calculateCoveredBy(pyramidRows) { /* Unchanged */
        for (let r = 0; r < pyramidRows.length - 1; r++) { for (let c = 0; c < pyramidRows[r].length; c++) { pyramidRows[r][c].coveredBy = []; if (pyramidRows[r + 1]?.[c]) { pyramidRows[r][c].coveredBy.push(pyramidRows[r + 1][c].id); } if (pyramidRows[r + 1]?.[c + 1]) { pyramidRows[r][c].coveredBy.push(pyramidRows[r + 1][c + 1].id); } } }
    }
    function updateScoreDisplay() { /* Unchanged */ if (scoreValueElement) { scoreValueElement.textContent = score; } }
    function updateHighScoreDisplay() { if (highScoreValueElement) { highScoreValueElement.textContent = highScore; } }
    function loadHighScore() { highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0'); updateHighScoreDisplay(); }
    function saveHighScoreIfBeat() { if (score > highScore) { highScore = score; localStorage.setItem(HIGH_SCORE_KEY, highScore); updateHighScoreDisplay(); } }

    function startGame() {
        console.log("Starting new game...");
        // Reset state variables directly
        pyramidCardsData = []; stockCardsData = []; wasteCardsData = [];
        pyramidElementsMap = {}; wasteElement = null; selectedCardInfo = null;
        stockResetsRemaining = 1; isGameOver = false; score = 0;
        moveHistory = []; // Clear history

        updateScoreDisplay();
        loadHighScore(); // Load high score on new game
        gameContainer.classList.remove('game-over');
        gameOverTextElement.textContent = '';
        pyramidContainer.innerHTML = ''; wastePile.innerHTML = '';
        stockPile.classList.add('card-back'); stockPile.classList.remove('empty', 'resettable'); stockPile.style.cursor = 'pointer';
        messageElement.textContent = '';
        winMessageElement.textContent = ''; winMessageElement.style.display = 'none';
        undoButton.disabled = true; // Disable undo at start

        // Create and shuffle deck
        let currentDeck = createDeck();
        shuffleDeck(currentDeck);

        // Deal Pyramid Data Structure
        let cardIndex = 0;
        for (let row = 0; row < 7; row++) { let rowCards = []; for (let col = 0; col <= row; col++) { if (cardIndex < 28) { const cardData = currentDeck[cardIndex]; rowCards.push(cardData); cardIndex++; } } pyramidCardsData.push(rowCards); }
        calculateCoveredBy(pyramidCardsData); // Calculate covers based on data

        // Deal Stock Data
        stockCardsData = currentDeck.slice(28);

        // Initial UI setup based on state (Similar to loadGameState)
        const pyramidWidth = CARD_HORIZONTAL_SPACING * 7 - (CARD_HORIZONTAL_SPACING - CARD_WIDTH);
        pyramidCardsData.forEach((rowCards, row) => {
            const cardsInRow = row + 1; const rowWidth = CARD_HORIZONTAL_SPACING * cardsInRow - (CARD_HORIZONTAL_SPACING - CARD_WIDTH); const rowStartX = (pyramidWidth / 2) - (rowWidth / 2);
            rowCards.forEach((cardData, col) => {
                // Determine initial state
                cardData.isAvailable = cardData.coveredBy.length === 0;
                cardData.isFaceUp = cardData.isAvailable;
                // Create element and add to map
                const cardElement = createCardElement(cardData);
                pyramidElementsMap[cardData.id] = cardElement;
                // Position element
                const cardLeft = rowStartX + col * CARD_HORIZONTAL_SPACING; const cardTop = row * CARD_REVEAL_VERTICAL;
                cardElement.style.left = `${cardLeft}px`; cardElement.style.top = `${cardTop}px`; cardElement.style.zIndex = row;
                // Apply initial visual state
                cardElement.classList.toggle('card-back', !cardData.isFaceUp);
                cardElement.classList.toggle('available', cardData.isAvailable);
                pyramidContainer.appendChild(cardElement);
            });
        });

        updateStockPileVisual();
        markWasteTopAvailable(); // Ensure waste availability is correct (none available initially)
        messageElement.textContent = 'Select pairs adding to 13, or single Kings.';
    }

    function updateStockPileVisual() { /* Unchanged */
         if (!stockPile) return; if (stockCardsData.length > 0) { stockPile.classList.add('card-back'); stockPile.classList.remove('empty', 'resettable'); stockPile.style.cursor = 'pointer'; } else { stockPile.classList.remove('card-back'); stockPile.classList.add('empty'); if (wasteCardsData.length > 0 && stockResetsRemaining > 0) { stockPile.style.cursor = 'pointer'; stockPile.classList.add('resettable'); } else { stockPile.style.cursor = 'default'; stockPile.classList.remove('resettable'); } }
     }

    function markWasteTopAvailable() {
         wasteCardsData.forEach((card, index) => {
             const isTop = index === wasteCardsData.length - 1;
             card.isAvailable = isTop && !card.isRemoved;
             // Update element if it exists (it should for the top card)
              const element = (index === wasteCardsData.length - 1) ? wasteElement : null; // Only top card has persistent element
              if(element) element.classList.toggle('available', card.isAvailable);
         });
          // Ensure the stored wasteElement reference is correct
          if (wasteCardsData.length === 0) wasteElement = null;
          else if(wastePile.lastChild) wasteElement = wastePile.lastChild; // Update ref just in case
    }


    function updateAvailability() {
        let changed = false;
        pyramidCardsData.flat().forEach(card => {
            if (!card.isRemoved && !card.isFaceUp) {
                const coveringCardsRemoved = card.coveredBy.every(coverId => {
                     // Find the card data in the pyramid structure to check its isRemoved status
                     const coveringCardData = pyramidCardsData.flat().find(c => c.id === coverId);
                     return coveringCardData?.isRemoved;
                });
                if (coveringCardsRemoved) {
                    card.isFaceUp = true; card.isAvailable = true; changed = true;
                    const element = pyramidElementsMap[card.id];
                    if (element) { element.classList.remove('card-back'); element.classList.add('available'); }
                }
            } else if (!card.isRemoved && card.isFaceUp) {
                 const stillCovered = card.coveredBy.some(coverId => {
                      const coveringCardData = pyramidCardsData.flat().find(c => c.id === coverId);
                      return !coveringCardData?.isRemoved;
                 });
                 const shouldBeAvailable = card.isFaceUp && !stillCovered;
                 if(card.isAvailable !== shouldBeAvailable){
                      card.isAvailable = shouldBeAvailable;
                      changed = true;
                      const element = pyramidElementsMap[card.id];
                      if(element) element.classList.toggle('available', card.isAvailable);
                 }
            } else if (card.isRemoved) { // Ensure removed cards aren't available
                 if (card.isAvailable){
                     card.isAvailable = false;
                     changed = true;
                     const element = pyramidElementsMap[card.id];
                      if(element) element.classList.remove('available');
                 }
            }
        });
         markWasteTopAvailable(); // Update waste card too
         return changed;
    }


    // Handles actual removal AFTER selection is confirmed
    function performRemoval(cardsToRemoveInfo) { // Expects array of { data, sourceElement }
         if (isGameOver) return;
         saveStateBeforeAction(); // Save state before removing

         let pointsEarned = 0;
         if (cardsToRemoveInfo.length === 1 && cardsToRemoveInfo[0].data.value === 13) { pointsEarned = 10; }
         else if (cardsToRemoveInfo.length === 2) { pointsEarned = 5; }
         score += pointsEarned;
         updateScoreDisplay();
         saveHighScoreIfBeat(); // Check high score after update

         // Apply animation class first
         cardsToRemoveInfo.forEach(info => {
             if (info.sourceElement && !info.data.isRemoved) {
                 info.sourceElement.classList.add('removing');
                 info.sourceElement.classList.remove('selected', 'available'); // Clean up other classes
             }
         });

         // Use timeout to allow animation
         setTimeout(() => {
             cardsToRemoveInfo.forEach(info => {
                 const cardData = info.data;
                 if (cardData && !cardData.isRemoved) {
                     cardData.isRemoved = true;
                     cardData.isAvailable = false;
                     cardData.isFaceUp = false; // Treat as logically gone

                     // We don't hide the element with display:none anymore,
                     // rely on animation's visibility:hidden and the fact
                     // that loadState won't recreate removed cards.
                     // If it was the waste card, clear the element reference
                     if (wasteElement && wasteElement.id === cardData.id) {
                         wasteElement = null; // Will be cleared visually on next update/load
                     }
                 }
             });
             selectedCardInfo = null; // Clear selection
             updateAvailability(); // Update AFTER marking as removed
             if (!checkForWin()) { checkForLoss(); } // Check status after move
         }, 300); // Animation duration
     }

    function isPyramidClear() { /* Unchanged */
        let pyramidCardCount = 0; const allRemoved = pyramidCardsData.flat().every(card => { pyramidCardCount++; return card.isRemoved; }); return pyramidCardCount === 28 && allRemoved;
    }

    function checkForWin() {
        if (isPyramidClear()) {
            messageElement.textContent = 'Pyramid Cleared!';
            winMessageElement.textContent = "Like a swan gliding silently over still waters, strength often hides beneath the surface—graceful, steady, and unseen.";
            winMessageElement.style.display = 'block';
            score += 100; updateScoreDisplay(); saveHighScoreIfBeat();
            isGameOver = true;
            gameContainer.classList.add('game-over');
            gameOverTextElement.textContent = "You Win!"; // Add text to overlay
            stockPile.style.cursor = 'default';
            undoButton.disabled = true; // No undo after win
            return true;
        }
        return false;
     }

     function checkForValidMoves() { /* Unchanged */
         if (isGameOver) return false;
         const availableCards = [];
         pyramidCardsData.flat().forEach(card => { if (card.isAvailable && !card.isRemoved) availableCards.push(card); });
         if (wasteCardsData.length > 0) { const topWaste = wasteCardsData[wasteCardsData.length - 1]; if (topWaste.isAvailable && !topWaste.isRemoved) availableCards.push(topWaste); }
         for (const card of availableCards) if (card.value === 13) return true;
         for (let i = 0; i < availableCards.length; i++) for (let j = i + 1; j < availableCards.length; j++) if (availableCards[i].value + availableCards[j].value === 13) return true;
         return false;
     }

     function checkForLoss() {
          if (isGameOver) return;
          const noResetsLeft = stockResetsRemaining <= 0;
          const stockIsEmpty = stockCardsData.length === 0;
          if (stockIsEmpty && noResetsLeft && !checkForValidMoves()) {
              messageElement.textContent = 'Game Over - No more valid moves!';
              isGameOver = true;
              gameContainer.classList.add('game-over');
              gameOverTextElement.textContent = "Game Over"; // Add text to overlay
              stockPile.style.cursor = 'default';
              undoButton.disabled = true; // No undo after loss
              saveHighScoreIfBeat(); // Save score on loss too
          }
     }

     function triggerInvalidShake(element) {
         if (!element) return;
         element.classList.add('invalid-shake');
         // Remove class after animation finishes
         setTimeout(() => {
             element.classList.remove('invalid-shake');
         }, 400); // Match CSS animation duration
     }

    // --- Event Handlers ---

    function handleCardClick(event) {
        if (isGameOver) return;
        const clickedElement = event.currentTarget;
        const cardId = clickedElement.id;
        let cardData = pyramidCardsData.flat().find(c => c.id === cardId && !c.isRemoved); // Find in pyramid data
        let isWasteCard = false;

        if (!cardData && wasteCardsData.length > 0 && wasteCardsData[wasteCardsData.length - 1].id === cardId) {
             cardData = wasteCardsData[wasteCardsData.length - 1];
             isWasteCard = true;
        }

        if (!cardData || !cardData.isAvailable || cardData.isRemoved) {
            console.log("Card not available:", cardId);
            return;
        }

        // --- Selection Logic (Simplified to one card selection) ---
        messageElement.textContent = ''; // Clear message

        // If clicking the already selected card, deselect it
        if (selectedCardInfo && selectedCardInfo.data.id === cardId) {
            selectedCardInfo.sourceElement.classList.remove('selected');
            selectedCardInfo = null;
            return;
        }

        // If another card was already selected, try to match
        if (selectedCardInfo) {
            const firstCard = selectedCardInfo.data;
            const secondCard = cardData;

            if (firstCard.value + secondCard.value === 13) {
                // Valid pair match
                performRemoval([selectedCardInfo, { data: secondCard, sourceElement: clickedElement }]);
                selectedCardInfo = null; // Clear selection after initiating removal
            } else {
                // Invalid pair
                messageElement.textContent = 'Selected cards do not sum to 13.';
                // Trigger shake animation on both cards
                triggerInvalidShake(selectedCardInfo.sourceElement);
                triggerInvalidShake(clickedElement);
                // Deselect the first card
                selectedCardInfo.sourceElement.classList.remove('selected');
                selectedCardInfo = null;
            }
        } else {
             // This is the first card being selected OR it's a King
             if (cardData.value === 13) {
                 // King selected - remove immediately
                 performRemoval([{ data: cardData, sourceElement: clickedElement }]);
                 selectedCardInfo = null; // Ensure selection cleared
             } else {
                 // Select this card
                 selectedCardInfo = { data: cardData, sourceElement: clickedElement };
                 clickedElement.classList.add('selected');
             }
        }
    } // End handleCardClick


    function handleStockClick() {
         if (isGameOver) return;

         // Deselect any card if stock is clicked
         if (selectedCardInfo){
              selectedCardInfo.sourceElement?.classList.remove('selected');
              selectedCardInfo = null;
              messageElement.textContent = '';
         }

         if (stockCardsData.length > 0) {
             // --- Deal card from stock to waste ---
             saveStateBeforeAction(); // Save state before drawing

             const cardToMove = stockCardsData.pop();
             cardToMove.isFaceUp = true;
             wasteCardsData.push(cardToMove);

             // Update UI - Animate the appearance in waste
             wastePile.innerHTML = '';
             wasteElement = createCardElement(cardToMove); // Store ref
             wasteElement.classList.remove('card-back');
             wasteElement.classList.add('available');
             wasteElement.style.position = 'relative';
             wasteElement.style.left = '0'; wasteElement.style.top = '0';
             wasteElement.classList.add('new-waste-card'); // Add animation class
             wastePile.appendChild(wasteElement);
             // Remove animation class shortly after to prevent re-animating on undo/redo
             setTimeout(() => wasteElement?.classList.remove('new-waste-card'), 400);

             updateStockPileVisual();
             markWasteTopAvailable(); // Update availability of previous waste (now unavailable)
             checkForLoss(); // Check if stuck after drawing last card

         } else if (wasteCardsData.length > 0 && stockResetsRemaining > 0) {
             // --- Reset waste back to stock ---
             saveStateBeforeAction(); // Save state before reset

             console.log("Resetting stock...");
             stockResetsRemaining--;
             messageElement.textContent = `Resetting waste to stock (${stockResetsRemaining} resets left).`;
             // Optional score penalty: score -= 20; updateScoreDisplay();

             stockCardsData = wasteCardsData.reverse(); // Move waste cards back
             stockCardsData.forEach(card => { card.isFaceUp = false; card.isAvailable = false; });
             wasteCardsData = []; // Clear waste array

             wastePile.innerHTML = ''; // Clear waste display
             wasteElement = null; // Clear waste element reference
             markWasteTopAvailable();
             updateStockPileVisual(); // Update stock (will show back)
             checkForLoss(); // Check if stuck after reset

         } else {
             // Stock empty, no reset possible
             console.log("Stock is empty, no reset possible.");
             messageElement.textContent = 'Stock empty.';
             checkForLoss(); // Should have already been called potentially, but safe to call again
         }
    } // End handleStockClick

    function handleUndoClick() {
        if (moveHistory.length > 0) {
            console.log("Undoing last move...");
            const previousState = moveHistory.pop();
            loadGameState(previousState); // Load the previous state (this handles UI update)
        } else {
            console.log("No moves to undo.");
        }
        // Update button state handled within loadGameState
    }

    // --- Rules Modal Logic ---
    function openRulesModal() { rulesModal.style.display = "block"; }
    function closeRulesModal() { rulesModal.style.display = "none"; }

    // --- Initialization ---
    newGameButton.addEventListener('click', startGame);
    stockPile.addEventListener('click', handleStockClick);
    undoButton.addEventListener('click', handleUndoClick); // Added listener
    rulesButton.addEventListener('click', openRulesModal); // Added listener
    closeRulesButton.addEventListener('click', closeRulesModal); // Added listener
    // Close modal if clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target == rulesModal) { closeRulesModal(); }
    });

    loadHighScore(); // Load high score initially
    startGame(); // Start the first game

}); // End DOMContentLoaded