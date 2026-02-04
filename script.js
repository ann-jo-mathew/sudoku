let solution = [];
let puzzle = [];
let timer = 0;
let interval;
let hintCount = 0;
const MAX_HINTS = 6;
let warningShown = false;

// Difficulty Configuration (Cells to Remove)
const DIFFICULTY_LEVELS = {
    "Easy": 30,
    "Medium": 45,
    "Hard": 55
};

/* ================= GAME LOGIC ================= */

/**
 * Starts a new game with the selected difficulty.
 */
function newGame() {
    stopTimer();
    const difficulty = document.getElementById("difficulty").value;
    const cellsToRemove = DIFFICULTY_LEVELS[difficulty] || 45;

    solution = generateSolution();
    puzzle = createPuzzle(solution, cellsToRemove);

    hintCount = 0;
    warningShown = false;
    updateHintDisplay();
    setMessage("");

    // Clear any invalid states from previous game if DOM recycling happened (it won't, we rebuild grid)
    createGrid();
    startTimer();
}

/**
 * Resets the current game board to its initial state.
 * Clears user inputs but keeps the puzzle the same.
 */
function resetGame() {
    const inputs = document.querySelectorAll("input");
    inputs.forEach(input => {
        if (!input.classList.contains("prefilled")) {
            input.value = "";
            input.classList.remove("hint-cell", "highlighted", "same-number", "invalid-cell");
        }
    });

    hintCount = 0;
    warningShown = false;
    updateHintDisplay();
    setMessage("Game Reset.");
    startTimer();
}

/**
 * Validates the current grid against the solution AND structural constraints.
 */
function checkSolution() {
    const inputs = document.querySelectorAll("input");
    let isCorrect = true;
    let isComplete = true;

    // Check validity
    for (let input of inputs) {
        // Clear previous error marks first
        input.classList.remove("invalid-cell");

        if (input.value === "") {
            isComplete = false;
            // Don't break immediately, we might want to validate what IS there
            continue;
        }

        const r = parseInt(input.dataset.row);
        const c = parseInt(input.dataset.col);
        const val = parseInt(input.value);

        // Check against absolute solution
        if (val !== solution[r][c]) {
            isCorrect = false;
            input.classList.add("invalid-cell");
        }
    }

    if (!isComplete) {
        setMessage("The puzzle is not finished yet.");
    } else if (isCorrect) {
        stopTimer();
        setMessage(`✅ Sudoku solved correctly in ${formatTime(timer)}!`);
    } else {
        setMessage("❌ There are mistakes in the grid.");
    }
}

/**
 * Provides a hint by filling a random empty cell.
 */
function giveHint() {
    if (hintCount >= MAX_HINTS) {
        setMessage("⚠️ Try to solve it by yourself now.");
        return;
    }

    const emptyCells = Array.from(document.querySelectorAll("input"))
        .filter(i => i.value === "");

    if (emptyCells.length === 0) return;

    // Pick a random empty cell
    const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const r = cell.dataset.row;
    const c = cell.dataset.col;

    // Fill it
    cell.value = solution[r][c];
    cell.classList.add("hint-cell");

    // Remove invalid mark if it was previously wrong
    cell.classList.remove("invalid-cell");

    hintCount++;
    updateHintDisplay();

    // Highlight effect just for potential "same number" help
    highlight(cell);
}

function updateHintDisplay() {
    document.getElementById("hint-count-display").innerText = `${hintCount} / ${MAX_HINTS}`;
}

/* ================= LIVE VALIDATION LOGIC ================= */

function validateInput(activeInput) {
    if (!activeInput.value) {
        activeInput.classList.remove("invalid-cell");
        return;
    }

    const val = parseInt(activeInput.value);
    const r = parseInt(activeInput.dataset.row);
    const c = parseInt(activeInput.dataset.col);

    let conflict = false;

    // We check against the CURRENT board state (inputs), not the solution array,
    // to find logical duplicates visible to the user.
    const inputs = document.querySelectorAll("input");

    inputs.forEach(input => {
        if (input === activeInput) return; // Skip self
        if (input.value === "") return; // Skip empty

        const tr = parseInt(input.dataset.row);
        const tc = parseInt(input.dataset.col);
        const tval = parseInt(input.value);

        if (tval === val) {
            // Row Conflict
            if (tr === r) conflict = true;
            // Column Conflict
            if (tc === c) conflict = true;
            // 3x3 Box Conflict
            const startBr = Math.floor(r / 3) * 3;
            const startBc = Math.floor(c / 3) * 3;
            if (tr >= startBr && tr < startBr + 3 && tc >= startBc && tc < startBc + 3) {
                conflict = true;
            }
        }
    });

    if (conflict) {
        activeInput.classList.add("invalid-cell");
    } else {
        activeInput.classList.remove("invalid-cell");
    }
}


/* ================= SUB-FUNCTIONS ================= */

function startTimer() {
    stopTimer();
    timer = 0;
    updateTimerDisplay();
    interval = setInterval(() => {
        timer++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    clearInterval(interval);
}

function updateTimerDisplay() {
    document.getElementById("timer").innerText = `Time: ${formatTime(timer)}`;
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

function setMessage(msg) {
    document.getElementById("message").innerText = msg;
}

function toggleTheme() {
    document.body.classList.toggle("dark");

    const moon = document.getElementById("moon-icon");
    const sun = document.getElementById("sun-icon");

    if (document.body.classList.contains("dark")) {
        moon.style.display = "none";
        sun.style.display = "block";
    } else {
        moon.style.display = "block";
        sun.style.display = "none";
    }
}

/* ================= GRID & EVENTS ================= */

function createGrid() {
    const grid = document.getElementById("sudoku-grid");
    grid.innerHTML = "";

    puzzle.forEach((row, r) => {
        row.forEach((cellValue, c) => {
            const input = document.createElement("input");
            input.dataset.row = r;
            input.dataset.col = c;
            input.maxLength = 1;
            input.autocomplete = "off";

            if (cellValue !== "") {
                input.value = cellValue;
                input.disabled = true;
                input.classList.add("prefilled");
            } else {
                // Input constraints
                input.addEventListener('beforeinput', (e) => {
                    // Allow only 1-9
                    if (e.data && !/^[1-9]$/.test(e.data)) {
                        e.preventDefault();
                    }
                });

                input.addEventListener('input', (e) => {
                    // Fallback sanitization
                    if (!/^[1-9]$/.test(input.value)) {
                        input.value = "";
                    }
                    highlight(input);
                    validateInput(input); // Live validation
                });
            }

            // Highlighting Events
            input.addEventListener('focus', () => highlight(input));
            input.addEventListener('blur', clearHighlights);

            grid.appendChild(input);
        });
    });
}

function highlight(activeInput) {
    // Clear previous highlights
    document.querySelectorAll("input").forEach(i => {
        i.classList.remove("highlighted", "same-number");
    });

    if (!activeInput) return;

    const r = parseInt(activeInput.dataset.row);
    const c = parseInt(activeInput.dataset.col);
    const val = activeInput.value;

    const inputs = document.querySelectorAll("input");

    inputs.forEach(input => {
        const tr = parseInt(input.dataset.row);
        const tc = parseInt(input.dataset.col);

        // Highlight Row & Column
        if (tr === r || tc === c) {
            input.classList.add("highlighted");
        }

        // Highlight 3x3 Box
        const startBr = Math.floor(r / 3) * 3;
        const startBc = Math.floor(c / 3) * 3;

        if (tr >= startBr && tr < startBr + 3 && tc >= startBc && tc < startBc + 3) {
            input.classList.add("highlighted");
        }

        // Highlight Same Numbers (if value exists)
        if (val && input.value === val) {
            input.classList.add("same-number");
        }
    });
}

function clearHighlights() {
    // We can keep highlights for better UX, or clear them. 
    // Requirement said "Highlighted row and column: pale pastel blue".
    // Usually standard to clear on click outside, but focusing keeps them.
    // We'll leave this empty or minimal if we want to rely on focus/blur.
}

/* ================= GENERATOR ================= */

function generateSolution() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillBoard(board);
    return board;
}

function fillBoard(board) {
    function solve(r, c) {
        if (r === 9) return true;
        if (c === 9) return solve(r + 1, 0);
        if (board[r][c] !== 0) return solve(r, c + 1);

        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let n of nums) {
            if (isSafe(board, r, c, n)) {
                board[r][c] = n;
                if (solve(r, c + 1)) return true;
                board[r][c] = 0;
            }
        }
        return false;
    }
    solve(0, 0);
}

function isSafe(board, r, c, n) {
    for (let i = 0; i < 9; i++) {
        if (board[r][i] === n) return false;
        if (board[i][c] === n) return false;

        const br = 3 * Math.floor(r / 3) + Math.floor(i / 3);
        const bc = 3 * Math.floor(c / 3) + i % 3;
        if (board[br][bc] === n) return false;
    }
    return true;
}

function createPuzzle(solution, removeCount) {
    const board = solution.map(row => [...row]);
    let removed = 0;
    while (removed < removeCount) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (board[r][c] !== "") {
            board[r][c] = "";
            removed++;
        }
    }
    return board;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Start immediately
newGame();
