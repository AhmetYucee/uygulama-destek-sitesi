(() => {
  "use strict";

  const jewelTypes = [
    { name: "safir", symbol: "◆", background: "#dceafa", foreground: "#5084bd" },
    { name: "yakut", symbol: "●", background: "#f9dfe2", foreground: "#c65e68" },
    { name: "kehribar", symbol: "✦", background: "#f8e9c8", foreground: "#b48629" },
    { name: "zümrüt", symbol: "⬟", background: "#dceee0", foreground: "#508260" },
    { name: "ametist", symbol: "✧", background: "#eae1f7", foreground: "#8660b1" },
    { name: "inci", symbol: "●", background: "#f1e8df", foreground: "#a58365" },
  ];

  const chapters = [
    { name: "Gül Bahçesi", difficulty: "Başlangıç", size: 6, goal: 12, moves: 20, colors: 4, color: 0 },
    { name: "Ay Çeşmesi", difficulty: "Kolay", size: 6, goal: 15, moves: 19, colors: 5, color: 1 },
    { name: "Kehribar Kule", difficulty: "Orta", size: 7, goal: 17, moves: 19, colors: 5, color: 2 },
    { name: "Zümrüt Ormanı", difficulty: "Zor", size: 7, goal: 19, moves: 18, colors: 6, color: 3 },
    { name: "Ametist Sarayı", difficulty: "Usta", size: 8, goal: 21, moves: 18, colors: 6, color: 4 },
  ];

  const progressKey = "tac-bahcesi-progress-v1";
  const chapterList = document.querySelector("#chapter-list");
  const boardElement = document.querySelector("#jewel-board");
  const messageElement = document.querySelector("#puzzle-message");
  const dialog = document.querySelector("#match-dialog");
  const nextButton = document.querySelector("#next-chapter");
  const retryButton = document.querySelector("#retry-chapter");

  let unlocked = readProgress();
  let current = 0;
  let board = [];
  let collected = 0;
  let moves = 0;
  let selected = null;
  let busy = false;
  let finished = false;

  function readProgress() {
    try {
      const stored = Number.parseInt(localStorage.getItem(progressKey) ?? "1", 10);
      return Number.isInteger(stored) ? Math.max(1, Math.min(chapters.length, stored)) : 1;
    } catch (error) {
      console.warn("Bölüm ilerlemesi okunamadı; ilerleme bu oturumda tutulur.", error);
      return 1;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(progressKey, String(unlocked));
    } catch (error) {
      console.warn("Bölüm ilerlemesi bu cihazda saklanamadı.", error);
      messageElement.textContent = "İlerleme bu tarayıcıda kaydedilemedi.";
    }
  }

  function randomJewel() {
    const colorCount = chapters[current].colors;
    if (Math.random() < 0.32) return chapters[current].color;
    const choice = Math.floor(Math.random() * (colorCount - 1));
    return choice >= chapters[current].color ? choice + 1 : choice;
  }

  function createBoard() {
    const size = chapters[current].size;
    board = Array.from({ length: size }, () => Array(size).fill(0));

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        let value = randomJewel();
        while (
          (col >= 2 && board[row][col - 1] === value && board[row][col - 2] === value) ||
          (row >= 2 && board[row - 1][col] === value && board[row - 2][col] === value)
        ) {
          value = randomJewel();
        }
        board[row][col] = value;
      }
    }
    if (!hasPossibleMove()) createBoard();
  }

  function startChapter(index) {
    if (index < 0 || index >= unlocked) return;
    current = index;
    collected = 0;
    moves = chapters[current].moves;
    selected = null;
    busy = false;
    finished = false;
    createBoard();
    nextButton.hidden = true;
    retryButton.hidden = true;
    messageElement.textContent = "Bir mücevher seç, sonra yanındakiyle yer değiştir.";

    const chapter = chapters[current];
    const jewel = jewelTypes[chapter.color];
    document.querySelector("#chapter-title").textContent = chapter.name;
    document.querySelector("#chapter-difficulty").textContent =
      chapter.difficulty.toLocaleUpperCase("tr-TR");
    document.querySelector("#goal-title").textContent = `${jewel.name}leri topla`;
    document.querySelector("#goal-jewel").textContent = jewel.symbol;
    document.querySelector("#goal-jewel").style.setProperty("--goal-bg", jewel.background);
    document.querySelector("#goal-jewel").style.setProperty("--goal-fg", jewel.foreground);
    document.querySelector("#target-count").textContent = String(chapter.goal);
    renderStats();
    renderChapters();
    renderBoard();
  }

  function renderChapters() {
    chapterList.replaceChildren();
    chapters.forEach((chapter, index) => {
      const button = document.createElement("button");
      button.className = "chapter-button";
      button.type = "button";
      button.disabled = index + 1 > unlocked;
      button.setAttribute("aria-label", `Bölüm ${index + 1}: ${chapter.name}, ${chapter.difficulty}`);
      if (index === current) button.setAttribute("aria-current", "step");
      if (index + 1 < unlocked) button.classList.add("is-complete");

      const number = document.createElement("span");
      number.className = "chapter-index";
      number.textContent = index + 1 < unlocked ? "✓" : String(index + 1);
      const detail = document.createElement("span");
      const name = document.createElement("span");
      name.className = "chapter-name";
      name.textContent = chapter.name;
      const difficulty = document.createElement("span");
      difficulty.className = "chapter-level";
      difficulty.textContent = chapter.difficulty;
      detail.append(name, difficulty);
      button.append(number, detail);
      button.addEventListener("click", () => startChapter(index));
      chapterList.append(button);
    });
    document.querySelector("#chapter-progress").textContent = `${unlocked} / ${chapters.length} açık`;
  }

  function renderStats() {
    const chapter = chapters[current];
    document.querySelector("#collected-count").textContent = String(collected);
    document.querySelector("#target-count").textContent = String(chapter.goal);
    document.querySelector("#moves-count").textContent = String(moves);
    document.querySelector("#collection-fill").style.width =
      `${Math.min(100, (collected / chapter.goal) * 100)}%`;
  }

  function renderBoard() {
    const size = chapters[current].size;
    boardElement.style.setProperty("--board-size", String(size));
    boardElement.replaceChildren();

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const value = board[row][col];
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "jewel";
        tile.dataset.row = String(row);
        tile.dataset.col = String(col);
        tile.setAttribute("role", "gridcell");
        tile.setAttribute("aria-pressed", String(selected?.row === row && selected?.col === col));
        tile.setAttribute(
          "aria-label",
          `Satır ${row + 1}, sütun ${col + 1}: ${jewelTypes[value]?.name ?? "boş"}`,
        );
        tile.style.setProperty("--jewel-bg", jewelTypes[value]?.background ?? "transparent");
        tile.style.setProperty("--jewel-fg", jewelTypes[value]?.foreground ?? "transparent");
        tile.textContent = jewelTypes[value]?.symbol ?? "";
        if (selected?.row === row && selected?.col === col) tile.classList.add("is-selected");
        tile.disabled = busy || finished;
        tile.addEventListener("click", onJewelClick);
        boardElement.append(tile);
      }
    }
  }

  function onJewelClick(event) {
    if (busy || finished) return;
    const position = {
      row: Number(event.currentTarget.dataset.row),
      col: Number(event.currentTarget.dataset.col),
    };

    if (!selected) {
      selected = position;
      renderBoard();
      boardElement.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`)?.focus();
      messageElement.textContent = "Şimdi yanındaki mücevheri seç.";
      return;
    }

    if (selected.row === position.row && selected.col === position.col) {
      selected = null;
      renderBoard();
      messageElement.textContent = "Bir mücevher seç, sonra yanındakiyle yer değiştir.";
      return;
    }

    if (Math.abs(selected.row - position.row) + Math.abs(selected.col - position.col) !== 1) {
      selected = position;
      renderBoard();
      boardElement.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`)?.focus();
      messageElement.textContent = "Mücevherler yalnızca yan yana değiştirilebilir.";
      return;
    }

    attemptSwap(selected, position);
  }

  function attemptSwap(a, b) {
    [board[a.row][a.col], board[b.row][b.col]] = [board[b.row][b.col], board[a.row][a.col]];
    selected = null;

    if (findMatches().size === 0) {
      [board[a.row][a.col], board[b.row][b.col]] = [board[b.row][b.col], board[a.row][a.col]];
      renderBoard();
      messageElement.textContent = "Bu eşleşme oluşturmadı; başka bir hamle dene.";
      return;
    }

    moves -= 1;
    busy = true;
    renderStats();
    messageElement.textContent = "Güzel hamle! Mücevherler eşleşiyor…";
    resolveMatches();
  }

  function findMatches() {
    const matches = new Set();
    const size = board.length;

    for (let row = 0; row < size; row += 1) {
      let start = 0;
      while (start < size) {
        let end = start + 1;
        while (end < size && board[row][end] === board[row][start]) end += 1;
        if (board[row][start] >= 0 && end - start >= 3) {
          for (let col = start; col < end; col += 1) matches.add(`${row},${col}`);
        }
        start = end;
      }
    }

    for (let col = 0; col < size; col += 1) {
      let start = 0;
      while (start < size) {
        let end = start + 1;
        while (end < size && board[end][col] === board[start][col]) end += 1;
        if (board[start][col] >= 0 && end - start >= 3) {
          for (let row = start; row < end; row += 1) matches.add(`${row},${col}`);
        }
        start = end;
      }
    }
    return matches;
  }

  function resolveMatches(chain = 0) {
    const matches = findMatches();
    if (matches.size === 0) {
      finishTurn();
      return;
    }

    const targetColor = chapters[current].color;
    let found = 0;
    for (const key of matches) {
      const [row, col] = key.split(",").map(Number);
      if (board[row][col] === targetColor) found += 1;
      board[row][col] = -1;
    }
    collected += found;
    renderStats();
    renderBoard();

    const bonus = chain > 0 ? ` ${chain + 1}. zincir!` : "";
    messageElement.textContent =
      `${matches.size} mücevher eşleşti.${found ? ` ${found} hedef mücevher topladın.` : ""}${bonus}`;

    window.setTimeout(() => {
      dropJewels();
      renderBoard();
      window.setTimeout(() => resolveMatches(chain + 1), 120);
    }, 130);
  }

  function dropJewels() {
    const size = board.length;
    for (let col = 0; col < size; col += 1) {
      const remaining = [];
      for (let row = size - 1; row >= 0; row -= 1) {
        if (board[row][col] >= 0) remaining.push(board[row][col]);
      }
      for (let row = size - 1; row >= 0; row -= 1) {
        const index = size - 1 - row;
        board[row][col] = index < remaining.length ? remaining[index] : randomJewel();
      }
    }
  }

  function finishTurn() {
    busy = false;
    renderBoard();

    if (collected >= chapters[current].goal) {
      finished = true;
      unlocked = Math.max(unlocked, Math.min(chapters.length, current + 2));
      saveProgress();
      renderChapters();
      if (current < chapters.length - 1) {
        messageElement.textContent = `${chapters[current].name} tamamlandı! Yeni bölüm açıldı.`;
        nextButton.hidden = false;
      } else {
        messageElement.textContent = "Harika! Taç Bahçesi'ndeki beş bölümün tamamı bitti.";
      }
      renderBoard();
      return;
    }

    if (moves <= 0) {
      finished = true;
      messageElement.textContent = "Hamlelerin bitti. Bölümü yeniden deneyebilirsin.";
      retryButton.hidden = false;
      renderBoard();
      return;
    }

    if (!hasPossibleMove()) {
      createBoard();
      renderBoard();
      messageElement.textContent = "Taşlar yeniden düzenlendi. Devam et!";
    } else {
      messageElement.textContent = "Bir mücevher seç, sonra yanındakiyle yer değiştir.";
    }
  }

  function hasPossibleMove() {
    const size = board.length;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const nextRow = row + dr;
          const nextCol = col + dc;
          if (nextRow >= size || nextCol >= size) continue;
          [board[row][col], board[nextRow][nextCol]] = [board[nextRow][nextCol], board[row][col]];
          const matched = findMatches().size > 0;
          [board[row][col], board[nextRow][nextCol]] = [board[nextRow][nextCol], board[row][col]];
          if (matched) return true;
        }
      }
    }
    return false;
  }

  document.querySelector("#restart-chapter").addEventListener("click", () => startChapter(current));
  document.querySelector("#retry-chapter").addEventListener("click", () => startChapter(current));
  document.querySelector("#next-chapter").addEventListener("click", () => startChapter(current + 1));
  document.querySelector("#match-help").addEventListener("click", () => dialog.showModal());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  startChapter(0);
})();
