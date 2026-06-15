// ==================== KONFIGURASI ====================
const ROWS = 6;
const COLS = 7;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
let gameActive = true;
let currentPlayer = "player1"; // player1 = manusia, player2 = AI atau manusia (tergantung mode)
let gameMode = null; // "ai" atau "human"
let evaluatedNodes = 0;
let player1Wins = 0;
let player2Wins = 0;

// Backend configuration
const BACKEND_URL = "http://localhost:5000";  // Ganti nanti kalo sudah deploy

// DOM Elements
let modeModal, gameContainer, boardDiv;
let depthSlider, depthVal, algorithmSelect;
let resetBtn, menuBtn;
let nodeCountSpan, turnStatus, topStatus;
let player1Card, player2Card, player2NameSpan;
let player1WinsSpan, player2WinsSpan;
let timerDisplay;
let timerInterval = null;
let timerSeconds = 0;

// History & Stats DOM Elements
let gameHistoryList, refreshHistoryBtn;
let totalGamesSpan, playerWinCountSpan, aiWinCountSpan, drawCountSpan;

// Game Tree Visualization
let viewTreeBtn, closeTreeBtn, treeSection, gameTreeVisual;
let lastGameTreeData = null;

// ==================== INISIALISASI ====================
document.addEventListener("DOMContentLoaded", () => {
    // Ambil semua DOM
    modeModal = document.getElementById("modeModal");
    gameContainer = document.getElementById("gameContainer");
    boardDiv = document.getElementById("board");
    depthSlider = document.getElementById("depthSlider");
    depthVal = document.getElementById("depthVal");
    algorithmSelect = document.getElementById("algorithmSelect");
    resetBtn = document.getElementById("resetBtn");
    menuBtn = document.getElementById("menuBtn");
    nodeCountSpan = document.getElementById("nodeCount");
    turnStatus = document.getElementById("turnStatus");
    topStatus = document.getElementById("topStatus");
    player1Card = document.getElementById("player1Card");
    player2Card = document.getElementById("player2Card");
    player2NameSpan = document.getElementById("player2Name");
    player1WinsSpan = document.getElementById("player1Wins");
    player2WinsSpan = document.getElementById("player2Wins");
    timerDisplay = document.getElementById("timerDisplay");

    // History & Stats Elements
    gameHistoryList = document.getElementById("gameHistoryList");
    refreshHistoryBtn = document.getElementById("refreshHistoryBtn");
    totalGamesSpan = document.getElementById("totalGames");
    playerWinCountSpan = document.getElementById("playerWinCount");
    aiWinCountSpan = document.getElementById("aiWinCount");
    drawCountSpan = document.getElementById("drawCount");

    // Game Tree Elements
    viewTreeBtn = document.getElementById("viewTreeBtn");
    closeTreeBtn = document.getElementById("closeTreeBtn");
    treeSection = document.getElementById("treeSection");
    gameTreeVisual = document.getElementById("gameTreeVisual");

    // Event listener mode
    document.getElementById("modeAI").onclick = () => startGame("ai");
    document.getElementById("modeHuman").onclick = () => startGame("human");

    resetBtn.onclick = resetGame;
    menuBtn.onclick = backToMenu;

    if (depthSlider) {
        depthSlider.oninput = () => {
            if (depthVal) depthVal.textContent = depthSlider.value;
        };
    }

    // Refresh history button
    if (refreshHistoryBtn) {
        refreshHistoryBtn.onclick = () => {
            loadGameHistory();
            loadStats();
        };
    }

    // Game Tree buttons
    if (viewTreeBtn) viewTreeBtn.onclick = showGameTree;
    if (closeTreeBtn) closeTreeBtn.onclick = () => {
        if (treeSection) treeSection.style.display = "none";
    };
});

function startGame(mode) {
    gameMode = mode;
    modeModal.classList.add("hidden");
    gameContainer.classList.remove("hidden");

    if (mode === "ai") {
        player2NameSpan.textContent = "COMPUTER";
        currentPlayer = "player1";
        document.getElementById("aiControls").style.display = "flex";
    } else {
        player2NameSpan.textContent = "PLAYER 2";
        currentPlayer = "player1";
        document.getElementById("aiControls").style.display = "none";
    }

    resetGame();
    startTimer();

    // Load history & stats from backend
    loadGameHistory();
    loadStats();
}

function backToMenu() {
    stopTimer();
    gameContainer.classList.add("hidden");
    modeModal.classList.remove("hidden");
    resetGame();
    if (treeSection) treeSection.style.display = "none";
}

function startTimer() {
    stopTimer();
    timerSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    if (timerDisplay) {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// ==================== BACKEND API FUNCTIONS ====================

async function saveGameToBackend(winner, nodeCount) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                game_mode: gameMode,
                winner: winner,
                node_count: nodeCount,
                ai_depth: gameMode === "ai" ? parseInt(depthSlider.value) : null,
                algorithm_used: gameMode === "ai" ? algorithmSelect.value : null
            })
        });

        if (response.ok) {
            console.log('Game saved to backend!');
            loadGameHistory();
            loadStats();
        } else {
            console.error('Failed to save game');
        }
    } catch (error) {
        console.error('Error saving game:', error);
    }
}

async function loadGameHistory() {
    if (!gameHistoryList) return;

    try {
        const response = await fetch(`${BACKEND_URL}/api/games`);
        if (!response.ok) throw new Error('Failed to fetch history');

        const games = await response.json();

        if (games.length === 0) {
            gameHistoryList.innerHTML = '<div class="history-empty">Belum ada riwayat. Main dulu yuk!</div>';
            return;
        }

        gameHistoryList.innerHTML = games.map(game => {
            let winnerClass = '';
            let winnerText = '';
            if (game.winner === 'player1') {
                winnerClass = 'player1-win';
                winnerText = '🍬 Player 1';
            } else if (game.winner === 'player2') {
                winnerClass = 'player2-win';
                winnerText = game.game_mode === 'ai' ? '🤖 AI' : '🍭 Player 2';
            } else {
                winnerClass = 'draw';
                winnerText = '🤝 Draw';
            }

            const modeText = game.game_mode === 'ai' ? 'vs AI' : 'vs Human';
            const date = new Date(game.played_at);
            const timeStr = `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

            return `
                <div class="history-item">
                    <span class="history-time">${timeStr}</span>
                    <span class="history-mode">${modeText}</span>
                    <span class="history-winner ${winnerClass}">${winnerText}</span>
                    <span class="history-node">🔍${game.node_count}</span>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading history:', error);
        gameHistoryList.innerHTML = '<div class="history-empty">Gagal memuat riwayat. Pastikan backend berjalan.</div>';
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');

        const stats = await response.json();

        if (totalGamesSpan) totalGamesSpan.textContent = stats.total_games;
        if (playerWinCountSpan) playerWinCountSpan.textContent = stats.player_wins;
        if (aiWinCountSpan) aiWinCountSpan.textContent = stats.ai_wins;
        if (drawCountSpan) drawCountSpan.textContent = stats.draws;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ==================== FUNGSI DASAR BOARD ====================
function initBoardArray() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
}

function renderBoard() {
    if (!boardDiv) return;
    boardDiv.innerHTML = "";
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            const value = board[row][col];
            if (value === "player1") {
                cell.textContent = "🍬";
                cell.classList.add("player1");
            } else if (value === "player2") {
                cell.textContent = "🍭";
                cell.classList.add("player2");
            } else {
                cell.textContent = "⚪";
            }
            cell.dataset.col = col;
            cell.addEventListener("click", (function (c) {
                return function () { handleColumnClick(c); };
            })(col));
            boardDiv.appendChild(cell);
        }
    }
}

function getNextOpenRow(col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (!board[row][col]) return row;
    }
    return -1;
}

function makeMove(col, player) {
    const row = getNextOpenRow(col);
    if (row === -1) return false;
    board[row][col] = player;
    renderBoard();
    return true;
}

function checkWin(boardState, lastRow, lastCol, player) {
    if (lastRow === undefined) return false;

    // Horizontal
    let count = 0;
    for (let c = 0; c < COLS; c++) {
        if (boardState[lastRow][c] === player) {
            count++;
            if (count === 4) return true;
        } else count = 0;
    }

    // Vertical
    count = 0;
    for (let r = 0; r < ROWS; r++) {
        if (boardState[r][lastCol] === player) {
            count++;
            if (count === 4) return true;
        } else count = 0;
    }

    // Diagonal \
    count = 0;
    let startRow = lastRow - Math.min(lastRow, lastCol);
    let startCol = lastCol - Math.min(lastRow, lastCol);
    for (let i = 0; startRow + i < ROWS && startCol + i < COLS; i++) {
        if (boardState[startRow + i][startCol + i] === player) {
            count++;
            if (count === 4) return true;
        } else count = 0;
    }

    // Diagonal /
    count = 0;
    startRow = lastRow + Math.min(ROWS - 1 - lastRow, lastCol);
    startCol = lastCol - Math.min(ROWS - 1 - lastRow, lastCol);
    for (let i = 0; startRow - i >= 0 && startCol + i < COLS; i++) {
        if (boardState[startRow - i][startCol + i] === player) {
            count++;
            if (count === 4) return true;
        } else count = 0;
    }

    return false;
}

function isBoardFull(boardState) {
    for (let c = 0; c < COLS; c++) {
        if (boardState[0][c] === null) return false;
    }
    return true;
}

function getAvailableCols(boardState) {
    const cols = [];
    for (let c = 0; c < COLS; c++) {
        if (boardState[0][c] === null) cols.push(c);
    }
    return cols;
}

function updateTurnUI() {
    if (gameMode === "ai") {
        if (currentPlayer === "player1") {
            player1Card.classList.add("active-turn");
            player2Card.classList.remove("active-turn");
            turnStatus.textContent = "🍬 Your turn";
            topStatus.innerHTML = "<span>🎮 YOUR TURN</span>";
        } else {
            player1Card.classList.remove("active-turn");
            player2Card.classList.add("active-turn");
            turnStatus.textContent = "🤖 AI is thinking...";
            topStatus.innerHTML = "<span>🧠 AI TURN</span>";
        }
    } else {
        if (currentPlayer === "player1") {
            player1Card.classList.add("active-turn");
            player2Card.classList.remove("active-turn");
            turnStatus.textContent = "🍬 Player 1 turn";
            topStatus.innerHTML = "<span>🎮 PLAYER 1</span>";
        } else {
            player1Card.classList.remove("active-turn");
            player2Card.classList.add("active-turn");
            turnStatus.textContent = "🍭 Player 2 turn";
            topStatus.innerHTML = "<span>🎮 PLAYER 2</span>";
        }
    }
}

function updateWinsUI() {
    if (player1WinsSpan) player1WinsSpan.textContent = player1Wins;
    if (player2WinsSpan) player2WinsSpan.textContent = player2Wins;
}

function endGame(winner) {
    gameActive = false;
    stopTimer();

    // Save to backend
    saveGameToBackend(winner, evaluatedNodes);

    if (winner === "player1") {
        player1Wins++;
        turnStatus.textContent = "🎉 PLAYER 1 WINS! 🎉";
        topStatus.innerHTML = "<span>🏆 PLAYER 1 WIN</span>";
    } else if (winner === "player2") {
        player2Wins++;
        if (gameMode === "ai") {
            turnStatus.textContent = "🤖 AI WINS! 🤖";
        } else {
            turnStatus.textContent = "🎉 PLAYER 2 WINS! 🎉";
        }
        topStatus.innerHTML = "<span>🏆 PLAYER 2 WIN</span>";
    } else if (winner === "draw") {
        turnStatus.textContent = "🤝 DRAW! 🤝";
        topStatus.innerHTML = "<span>🤝 DRAW</span>";
    }

    updateWinsUI();
}

// ==================== HEURISTIK & AI ====================
function evaluateBoard(boardState, aiPlayer) {
    let score = 0;
    const opponent = aiPlayer === "player2" ? "player1" : "player2";

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (boardState[r][c] === aiPlayer) score += 5;
            else if (boardState[r][c] === opponent) score -= 5;
        }
    }
    return score;
}

function checkWinnerState(boardState) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const val = boardState[r][c];
            if (!val) continue;
            if (c + 3 < COLS && val === boardState[r][c + 1] && val === boardState[r][c + 2] && val === boardState[r][c + 3]) return val;
            if (r + 3 < ROWS && val === boardState[r + 1][c] && val === boardState[r + 2][c] && val === boardState[r + 3][c]) return val;
            if (r + 3 < ROWS && c + 3 < COLS && val === boardState[r + 1][c + 1] && val === boardState[r + 2][c + 2] && val === boardState[r + 3][c + 3]) return val;
            if (r + 3 < ROWS && c - 3 >= 0 && val === boardState[r + 1][c - 1] && val === boardState[r + 2][c - 2] && val === boardState[r + 3][c - 3]) return val;
        }
    }
    return null;
}

function getNextOpenRowInState(boardState, col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (!boardState[row][col]) return row;
    }
    return -1;
}

function minimax(boardState, depth, isMaximizing, alpha, beta, useAlphaBeta, aiPlayer, humanPlayer) {
    const winner = checkWinnerState(boardState);
    if (winner === aiPlayer) return 10000 - depth;
    if (winner === humanPlayer) return -10000 + depth;
    if (isBoardFull(boardState) || depth === 0) return evaluateBoard(boardState, aiPlayer);

    evaluatedNodes++;

    const availableCols = getAvailableCols(boardState);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let col of availableCols) {
            const row = getNextOpenRowInState(boardState, col);
            if (row === -1) continue;
            boardState[row][col] = aiPlayer;
            const eval = minimax(boardState, depth - 1, false, alpha, beta, useAlphaBeta, aiPlayer, humanPlayer);
            boardState[row][col] = null;
            maxEval = Math.max(maxEval, eval);
            if (useAlphaBeta) {
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break;
            }
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let col of availableCols) {
            const row = getNextOpenRowInState(boardState, col);
            if (row === -1) continue;
            boardState[row][col] = humanPlayer;
            const eval = minimax(boardState, depth - 1, true, alpha, beta, useAlphaBeta, aiPlayer, humanPlayer);
            boardState[row][col] = null;
            minEval = Math.min(minEval, eval);
            if (useAlphaBeta) {
                beta = Math.min(beta, eval);
                if (beta <= alpha) break;
            }
        }
        return minEval;
    }
}

function getBestAIMove() {
    const depth = parseInt(depthSlider.value);
    const useAlphaBeta = algorithmSelect.value === "alphabeta";
    evaluatedNodes = 0;

    let bestCol = null;
    let bestValue = -Infinity;
    const availableCols = getAvailableCols(board);
    const aiPlayer = "player2";
    const humanPlayer = "player1";

    for (let col of availableCols) {
        const row = getNextOpenRow(col);
        if (row === -1) continue;
        board[row][col] = aiPlayer;
        const value = minimax(board, depth - 1, false, -Infinity, Infinity, useAlphaBeta, aiPlayer, humanPlayer);
        board[row][col] = null;
        if (value > bestValue) {
            bestValue = value;
            bestCol = col;
        }
    }

    nodeCountSpan.textContent = evaluatedNodes;
    return bestCol;
}

async function aiMove() {
    if (!gameActive || gameMode !== "ai" || currentPlayer !== "player2") return;

    turnStatus.textContent = "🤖 AI is thinking...";
    await new Promise(resolve => setTimeout(resolve, 50));

    const bestCol = getBestAIMove();
    if (bestCol !== null) {
        makeMove(bestCol, "player2");
        const lastRow = getNextOpenRow(bestCol) + 1;
        if (checkWin(board, lastRow, bestCol, "player2")) {
            endGame("player2");
            return;
        }
        if (isBoardFull(board)) {
            endGame("draw");
            return;
        }
        currentPlayer = "player1";
        updateTurnUI();
    }
}

// ==================== GAME TREE VISUALIZATION ====================

function copyBoardState(boardState) {
    return boardState.map(row => [...row]);
}

function buildGameTree(boardState, depth, isMaximizing, alpha, beta, useAlphaBeta, aiPlayer, humanPlayer) {
    const winner = checkWinnerState(boardState);
    if (winner === aiPlayer || winner === humanPlayer || depth === 0 || isBoardFull(boardState)) {
        let value = 0;
        if (winner === aiPlayer) value = 10000 - (4 - depth);
        else if (winner === humanPlayer) value = -10000 + (4 - depth);
        else value = evaluateBoard(boardState, aiPlayer);

        return {
            value: value,
            isLeaf: true,
            pruned: false
        };
    }

    const availableCols = getAvailableCols(boardState);
    const children = [];

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < availableCols.length; i++) {
            const col = availableCols[i];
            const row = getNextOpenRowInState(boardState, col);
            if (row === -1) continue;

            const newBoard = copyBoardState(boardState);
            newBoard[row][col] = aiPlayer;

            const result = buildGameTree(newBoard, depth - 1, false, alpha, beta, useAlphaBeta, aiPlayer, humanPlayer);

            children.push({
                col: col,
                value: result.value,
                childTree: result,
                pruned: false
            });

            maxEval = Math.max(maxEval, result.value);

            if (useAlphaBeta) {
                alpha = Math.max(alpha, result.value);
                if (beta <= alpha) {
                    for (let j = i + 1; j < availableCols.length; j++) {
                        children.push({
                            col: availableCols[j],
                            value: null,
                            pruned: true,
                            childTree: null
                        });
                    }
                    break;
                }
            }
        }
        return {
            value: maxEval !== -Infinity ? maxEval : 0,
            isLeaf: false,
            pruned: false,
            children: children,
            isMaxNode: true
        };
    } else {
        let minEval = Infinity;
        for (let i = 0; i < availableCols.length; i++) {
            const col = availableCols[i];
            const row = getNextOpenRowInState(boardState, col);
            if (row === -1) continue;

            const newBoard = copyBoardState(boardState);
            newBoard[row][col] = humanPlayer;

            const result = buildGameTree(newBoard, depth - 1, true, alpha, beta, useAlphaBeta, aiPlayer, humanPlayer);

            children.push({
                col: col,
                value: result.value,
                childTree: result,
                pruned: false
            });

            minEval = Math.min(minEval, result.value);

            if (useAlphaBeta) {
                beta = Math.min(beta, result.value);
                if (beta <= alpha) {
                    for (let j = i + 1; j < availableCols.length; j++) {
                        children.push({
                            col: availableCols[j],
                            value: null,
                            pruned: true,
                            childTree: null
                        });
                    }
                    break;
                }
            }
        }
        return {
            value: minEval !== Infinity ? minEval : 0,
            isLeaf: false,
            pruned: false,
            children: children,
            isMinNode: true
        };
    }
}

function renderGameTree(treeData) {
    if (!treeData || treeData.pruned) {
        return `<div class="tree-node pruned"><div class="tree-node-value">✂️ PRUNED</div></div>`;
    }

    if (treeData.isLeaf) {
        let valueClass = '';
        if (treeData.value > 0) valueClass = 'max-node';
        else if (treeData.value < 0) valueClass = 'min-node';

        return `<div class="tree-node leaf ${valueClass}">
                    <div class="tree-node-value">${treeData.value}</div>
                    <div class="tree-node-label">Leaf</div>
                </div>`;
    }

    if (treeData.children && treeData.children.length > 0) {
        const nodeClass = treeData.isMaxNode ? 'max-node' : 'min-node';
        const nodeLabel = treeData.isMaxNode ? 'MAX' : 'MIN';

        const childrenHtml = treeData.children.map(child => {
            if (child.pruned) {
                return `<div class="tree-branch">
                            <div class="tree-branch-label">Col ${child.col}</div>
                            <div class="tree-node pruned">
                                <div class="tree-node-value">✂️ PRUNED</div>
                            </div>
                        </div>`;
            }
            return `<div class="tree-branch">
                        <div class="tree-branch-label">Col ${child.col}</div>
                        ${renderGameTree(child.childTree)}
                    </div>`;
        }).join('');

        return `<div class="tree-node ${nodeClass}">
                    <div class="tree-node-value">${treeData.value !== undefined && treeData.value !== null ? treeData.value : '?'}</div>
                    <div class="tree-node-label">${nodeLabel}</div>
                    <div class="tree-children">
                        ${childrenHtml}
                    </div>
                </div>`;
    }

    return `<div class="tree-node"><div class="tree-node-value">?</div></div>`;
}

function showGameTree() {
    if (!gameTreeVisual) return;

    // Kalo game udah selesai dan ada data tree sebelumnya
    if (!gameActive && lastGameTreeData) {
        gameTreeVisual.innerHTML = `<div class="tree-container">${renderGameTree(lastGameTreeData)}</div>`;
        treeSection.style.display = "block";
        return;
    }

    const depth = 3;
    const useAlphaBeta = algorithmSelect.value === "alphabeta";
    const aiPlayer = "player2";
    const humanPlayer = "player1";

    gameTreeVisual.innerHTML = '<div class="tree-placeholder">🌳 Generating game tree...</div>';
    treeSection.style.display = "block";

    setTimeout(() => {
        const currentBoard = copyBoardState(board);
        const treeData = buildGameTree(currentBoard, depth, true, -Infinity, Infinity, useAlphaBeta, aiPlayer, humanPlayer);
        lastGameTreeData = treeData;

        const html = renderGameTree(treeData);
        gameTreeVisual.innerHTML = `<div class="tree-container">${html}</div>`;
    }, 100);
}

// ==================== HANDLE KLIK ====================
async function handleColumnClick(col) {
    if (!gameActive) return;

    if (gameMode === "human") {
        if (currentPlayer === "player1") {
            if (makeMove(col, "player1")) {
                const row = getNextOpenRow(col) + 1;
                if (checkWin(board, row, col, "player1")) {
                    endGame("player1");
                    return;
                }
                if (isBoardFull(board)) {
                    endGame("draw");
                    return;
                }
                currentPlayer = "player2";
                updateTurnUI();
            }
        } else {
            if (makeMove(col, "player2")) {
                const row = getNextOpenRow(col) + 1;
                if (checkWin(board, row, col, "player2")) {
                    endGame("player2");
                    return;
                }
                if (isBoardFull(board)) {
                    endGame("draw");
                    return;
                }
                currentPlayer = "player1";
                updateTurnUI();
            }
        }
    }
    else if (gameMode === "ai") {
        if (currentPlayer !== "player1") return;
        if (makeMove(col, "player1")) {
            const row = getNextOpenRow(col) + 1;
            if (checkWin(board, row, col, "player1")) {
                endGame("player1");
                return;
            }
            if (isBoardFull(board)) {
                endGame("draw");
                return;
            }
            currentPlayer = "player2";
            updateTurnUI();
            await aiMove();
        }
    }
}

function resetGame() {
    initBoardArray();
    gameActive = true;
    evaluatedNodes = 0;
    nodeCountSpan.textContent = "0";

    if (gameMode === "ai") {
        currentPlayer = "player1";
    } else {
        currentPlayer = "player1";
    }

    updateTurnUI();
    renderBoard();

    stopTimer();
    startTimer();

    // Reset game tree data
    lastGameTreeData = null;
    if (treeSection) treeSection.style.display = "none";
}