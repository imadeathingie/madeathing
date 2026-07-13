const { useState } = React;

function CrosswordBuilder() {
  const [gridSize, setGridSize] = useState({ rows: 10, cols: 10 });
  const [grid, setGrid] = useState(() =>
    Array(10).fill(null).map(() =>
      Array(10).fill(null).map(() => ({ letter: '', isBlack: false, number: null }))
    )
  );
  const [clues, setClues] = useState({ across: {}, down: {} });
  const [selectedCell, setSelectedCell] = useState(null);
  const [draggedLetter, setDraggedLetter] = useState(null);
  const [showClueEditor, setShowClueEditor] = useState(false);
  const [showWordFinder, setShowWordFinder] = useState(false);
  const [wordPattern, setWordPattern] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedData, setExportedData] = useState('');
  const [importData, setImportData] = useState('');

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const updateCell = (row, col, updates) => {
    setGrid(prev => {
      const newGrid = prev.map(r => r.map(c => ({ ...c })));
      newGrid[row][col] = { ...newGrid[row][col], ...updates };
      return newGrid;
    });
  };

  const handleCellClick = (row, col) => {
    setSelectedCell({ row, col });
  };

  const handleCellKeyDown = (e, row, col) => {
    if (e.key === ' ') {
      e.preventDefault();
      updateCell(row, col, { isBlack: !grid[row][col].isBlack, letter: '' });
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      updateCell(row, col, { letter: e.key.toUpperCase(), isBlack: false });
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      updateCell(row, col, { letter: '', isBlack: false });
    } else if (e.key === 'ArrowRight' && col < gridSize.cols - 1) {
      setSelectedCell({ row, col: col + 1 });
    } else if (e.key === 'ArrowLeft' && col > 0) {
      setSelectedCell({ row, col: col - 1 });
    } else if (e.key === 'ArrowDown' && row < gridSize.rows - 1) {
      setSelectedCell({ row: row + 1, col });
    } else if (e.key === 'ArrowUp' && row > 0) {
      setSelectedCell({ row: row - 1, col });
    }
  };

  const handleDragStart = (letter) => {
    setDraggedLetter(letter);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    if (draggedLetter) {
      updateCell(row, col, { letter: draggedLetter, isBlack: false });
      setDraggedLetter(null);
    }
  };

  const autoNumberGrid = () => {
    const newGrid = grid.map(r => r.map(c => ({ ...c, number: null })));
    let currentNumber = 1;

    for (let row = 0; row < gridSize.rows; row++) {
      for (let col = 0; col < gridSize.cols; col++) {
        if (newGrid[row][col].isBlack) continue;

        const startsAcross = (col === 0 || newGrid[row][col - 1].isBlack) &&
                            col < gridSize.cols - 1 &&
                            !newGrid[row][col + 1].isBlack;

        const startsDown = (row === 0 || newGrid[row - 1][col].isBlack) &&
                          row < gridSize.rows - 1 &&
                          !newGrid[row + 1][col].isBlack;

        if (startsAcross || startsDown) {
          newGrid[row][col].number = currentNumber;
          currentNumber++;
        }
      }
    }

    setGrid(newGrid);
  };

  const updateClue = (direction, number, text) => {
    setClues(prev => ({
      ...prev,
      [direction]: { ...prev[direction], [number]: text }
    }));
  };

  const getClueNumbers = () => {
    const numbers = { across: new Set(), down: new Set() };

    for (let row = 0; row < gridSize.rows; row++) {
      for (let col = 0; col < gridSize.cols; col++) {
        const cell = grid[row][col];
        if (cell.number) {
          const startsAcross = (col === 0 || grid[row][col - 1].isBlack) &&
                              col < gridSize.cols - 1 &&
                              !grid[row][col + 1].isBlack;
          const startsDown = (row === 0 || grid[row - 1][col].isBlack) &&
                            row < gridSize.rows - 1 &&
                            !grid[row + 1][col].isBlack;

          if (startsAcross) numbers.across.add(cell.number);
          if (startsDown) numbers.down.add(cell.number);
        }
      }
    }

    return {
      across: Array.from(numbers.across).sort((a, b) => a - b),
      down: Array.from(numbers.down).sort((a, b) => a - b)
    };
  };

  const clueNumbers = getClueNumbers();

  const searchWords = async () => {
    if (!wordPattern || wordPattern.length < 2) {
      alert('Please enter a pattern (use ? for unknown letters, e.g., "C?T")');
      return;
    }

    setIsSearching(true);
    setFoundWords([]);

    try {
      const length = wordPattern.length;

      const response = await fetch(
        `https://api.datamuse.com/words?sp=${wordPattern.replace(/\?/g, '?')}&max=100`
      );

      const data = await response.json();
      const words = data
        .map(item => item.word.toUpperCase())
        .filter(word => word.length === length && /^[A-Z]+$/.test(word));

      setFoundWords(words);
    } catch (error) {
      console.error('Error searching words:', error);
      alert('Error searching for words. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const fillWordInGrid = (word) => {
    if (!selectedCell) {
      alert('Please select a cell in the grid first to place the word');
      return;
    }

    const { row, col } = selectedCell;

    if (col + word.length <= gridSize.cols) {
      let canFill = true;
      for (let i = 0; i < word.length; i++) {
        if (grid[row][col + i].isBlack) {
          canFill = false;
          break;
        }
      }

      if (canFill) {
        const newGrid = grid.map(r => r.map(c => ({ ...c })));
        for (let i = 0; i < word.length; i++) {
          newGrid[row][col + i].letter = word[i];
          newGrid[row][col + i].isBlack = false;
        }
        setGrid(newGrid);
        return;
      }
    }

    if (row + word.length <= gridSize.rows) {
      let canFill = true;
      for (let i = 0; i < word.length; i++) {
        if (grid[row + i][col].isBlack) {
          canFill = false;
          break;
        }
      }

      if (canFill) {
        const newGrid = grid.map(r => r.map(c => ({ ...c })));
        for (let i = 0; i < word.length; i++) {
          newGrid[row + i][col].letter = word[i];
          newGrid[row + i][col].isBlack = false;
        }
        setGrid(newGrid);
        return;
      }
    }

    alert('Cannot fit word at selected position. Make sure there is enough space and no black cells in the way.');
  };

  const getWordAtPosition = (row, col, direction) => {
    let pattern = '';

    if (direction === 'across') {
      let startCol = col;
      while (startCol > 0 && !grid[row][startCol - 1].isBlack) {
        startCol--;
      }

      let c = startCol;
      while (c < gridSize.cols && !grid[row][c].isBlack) {
        pattern += grid[row][c].letter || '?';
        c++;
      }
    } else {
      let startRow = row;
      while (startRow > 0 && !grid[startRow - 1][col].isBlack) {
        startRow--;
      }

      let r = startRow;
      while (r < gridSize.rows && !grid[r][col].isBlack) {
        pattern += grid[r][col].letter || '?';
        r++;
      }
    }

    return pattern;
  };

  const findWordForCurrentCell = (direction) => {
    if (!selectedCell) {
      alert('Please select a cell in the grid first');
      return;
    }

    const pattern = getWordAtPosition(selectedCell.row, selectedCell.col, direction);
    if (pattern.length < 2) {
      alert('Selected cell is not part of a valid word position');
      return;
    }

    setWordPattern(pattern);
    setShowWordFinder(true);
    setTimeout(() => {
      const searchButton = document.getElementById('word-search-button');
      if (searchButton) searchButton.click();
    }, 100);
  };

  const exportCrossword = () => {
    const crosswordData = {
      gridSize,
      grid,
      clues,
      version: '1.0'
    };
    const jsonString = JSON.stringify(crosswordData, null, 2);
    setExportedData(jsonString);
    setShowExportModal(true);
  };

  const downloadCrossword = () => {
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crossword.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportedData).then(() => {
      alert('Copied to clipboard! Share this with others to let them solve your crossword.');
    });
  };

  const importCrossword = () => {
    try {
      const data = JSON.parse(importData);
      if (data.grid && data.gridSize && data.clues) {
        setGrid(data.grid);
        setGridSize(data.gridSize);
        setClues(data.clues);
        setImportData('');
        setShowExportModal(false);
        alert('Crossword imported successfully!');
      } else {
        alert('Invalid crossword data format');
      }
    } catch (error) {
      alert('Error importing crossword. Please check the data format.');
    }
  };

  // Generates a fully standalone, self-styled HTML file — no dependency
  // on this site's stylesheet — so the puzzle is portable and shareable
  // on its own. Mirrors the look of the site's embedded player without
  // reusing its CSS file directly, since a downloaded file can't rely on
  // an external stylesheet being reachable.
  const generateSharableHTML = () => {
    const solverGrid = grid.map(row =>
      row.map(cell => ({ ...cell, letter: '' }))
    );

    const gridData = JSON.stringify(grid);
    const solverGridData = JSON.stringify(solverGrid);
    const gridSizeData = JSON.stringify(gridSize);
    const cluesData = JSON.stringify(clues);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Crossword Puzzle</title>
<style>
  :root {
    --pegboard: #5B7065; --paper: #F7F2E7; --kraft: #E8DBC0;
    --ink: #2B2620; --pencil: #8A8071; --safety-orange: #E85D2C;
    --brass: #B98B3E; --font-display: 'Georgia', serif; --font-mono: monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, sans-serif; background: var(--kraft); color: var(--ink); padding: 40px 20px; }
  .wrap { max-width: 760px; margin: 0 auto; }
  h1 { text-align: center; text-transform: uppercase; letter-spacing: 0.03em; }
  .panel { background: var(--paper); border: 2px solid var(--ink); border-radius: 3px; padding: 20px; margin-bottom: 20px; box-shadow: 4px 4px 0 rgba(43,38,32,0.15); }
  button { font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; background: var(--kraft); color: var(--ink); border: 1px solid var(--ink); border-radius: 3px; padding: 8px 15px; cursor: pointer; margin-right: 8px; }
  button:hover { background: var(--paper); }
  .status { font-family: var(--font-mono); font-size: 0.78rem; color: var(--pencil); }
  .body-flex { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 16px; }
  .grid { display: inline-block; border: 3px solid var(--ink); background: var(--ink); }
  .row { display: flex; }
  .cell { width: 34px; height: 34px; background: var(--paper); border: 1px solid rgba(43,38,32,0.25); position: relative; }
  .cell.black { background: var(--ink); }
  .cell .num { position: absolute; top: 1px; left: 2px; font-family: var(--font-mono); font-size: 0.55rem; color: var(--brass); }
  .cell input { width: 100%; height: 100%; border: 0; background: transparent; text-align: center; text-transform: uppercase; font-size: 1.1rem; color: var(--ink); padding: 0; }
  .cell input:focus { outline: none; background: rgba(232,93,44,0.18); }
  .clues { flex: 1; min-width: 220px; display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  .clues h3 { border-bottom: 2px solid var(--ink); padding-bottom: 4px; }
  .clues p { font-size: 0.88rem; margin: 0 0 8px; }
  .clues strong { color: var(--brass); }
</style>
</head>
<body>
<div class="wrap">
<h1>Crossword Puzzle</h1>
<div class="panel">
  <div>
    <button onclick="checkAnswers()">Check Answers</button>
    <button onclick="revealAnswers()">Reveal Answers</button>
    <button onclick="clearGrid()">Clear Grid</button>
  </div>
  <p class="status" id="status"></p>
  <div class="body-flex">
    <div id="grid" class="grid"></div>
    <div class="clues">
      <div><h3>Across</h3><div id="across-clues"></div></div>
      <div><h3>Down</h3><div id="down-clues"></div></div>
    </div>
  </div>
</div>
</div>
<script>
const originalGrid = ${gridData};
const gridSize = ${gridSizeData};
const clues = ${cluesData};
let currentGrid = ${solverGridData};

function renderGrid() {
    const gridDiv = document.getElementById("grid");
    gridDiv.innerHTML = "";
    currentGrid.forEach((row, rowIndex) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row";
        row.forEach((cell, colIndex) => {
            const cellDiv = document.createElement("div");
            cellDiv.className = "cell" + (cell.isBlack ? " black" : "");
            if (!cell.isBlack) {
                if (cell.number) {
                    const numSpan = document.createElement("span");
                    numSpan.className = "num";
                    numSpan.textContent = cell.number;
                    cellDiv.appendChild(numSpan);
                }
                const input = document.createElement("input");
                input.type = "text";
                input.maxLength = 1;
                input.value = cell.letter || "";
                input.onkeydown = (e) => handleKeyDown(e, rowIndex, colIndex);
                input.oninput = (e) => {
                    currentGrid[rowIndex][colIndex].letter = e.target.value.toUpperCase();
                };
                cellDiv.appendChild(input);
            }
            rowDiv.appendChild(cellDiv);
        });
        gridDiv.appendChild(rowDiv);
    });
}

function handleKeyDown(e, row, col) {
    if (e.key === "ArrowRight" && col < gridSize.cols - 1) { e.preventDefault(); focusCell(row, col + 1); }
    else if (e.key === "ArrowLeft" && col > 0) { e.preventDefault(); focusCell(row, col - 1); }
    else if (e.key === "ArrowDown" && row < gridSize.rows - 1) { e.preventDefault(); focusCell(row + 1, col); }
    else if (e.key === "ArrowUp" && row > 0) { e.preventDefault(); focusCell(row - 1, col); }
}

function focusCell(row, col) {
    const inputs = document.querySelectorAll("#grid input");
    let index = 0;
    for (let r = 0; r < gridSize.rows; r++) {
        for (let c = 0; c < gridSize.cols; c++) {
            if (!currentGrid[r][c].isBlack) {
                if (r === row && c === col) { inputs[index].focus(); return; }
                index++;
            }
        }
    }
}

function checkAnswers() {
    let correct = 0, total = 0;
    currentGrid.forEach((row, r) => row.forEach((cell, c) => {
        if (!cell.isBlack) {
            total++;
            if (cell.letter && cell.letter === originalGrid[r][c].letter) correct++;
        }
    }));
    document.getElementById("status").textContent = correct + " / " + total + " letters correct (" + Math.round(correct / total * 100) + "%)";
}

function revealAnswers() {
    if (confirm("Are you sure you want to reveal all answers?")) {
        currentGrid = originalGrid.map(row => row.map(cell => ({...cell})));
        renderGrid();
    }
}

function clearGrid() {
    if (confirm("Are you sure you want to clear the grid?")) {
        currentGrid.forEach(row => row.forEach(cell => { if (!cell.isBlack) cell.letter = ""; }));
        renderGrid();
    }
}

function renderClues() {
    const acrossDiv = document.getElementById("across-clues");
    const downDiv = document.getElementById("down-clues");
    Object.entries(clues.across).forEach(([num, clue]) => {
        const p = document.createElement("p");
        p.innerHTML = "<strong>" + num + ".</strong> " + clue;
        acrossDiv.appendChild(p);
    });
    Object.entries(clues.down).forEach(([num, clue]) => {
        const p = document.createElement("p");
        p.innerHTML = "<strong>" + num + ".</strong> " + clue;
        downDiv.appendChild(p);
    });
}

renderGrid();
renderClues();
</script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crossword-puzzle.html';
    a.click();
    URL.revokeObjectURL(url);

    alert('Shareable HTML puzzle downloaded! Anyone can open this file in their browser to solve your crossword.');
  };

  return (
    <div className="cwb-wrap">
      <h1 className="cwb-heading">Crossword Builder</h1>

      <div className="cwb-panel">
        <div className="cwb-controls">
          <div className="cwb-field">
            <label>Rows:</label>
            <input
              type="number"
              min="3"
              max="20"
              value={gridSize.rows}
              onChange={(e) => {
                const rows = parseInt(e.target.value) || 3;
                setGridSize(prev => ({ ...prev, rows }));
                setGrid(Array(rows).fill(null).map((_, i) =>
                  Array(gridSize.cols).fill(null).map((_, j) =>
                    grid[i]?.[j] || { letter: '', isBlack: false, number: null }
                  )
                ));
              }}
              className="cwb-input-number"
            />
          </div>
          <div className="cwb-field">
            <label>Cols:</label>
            <input
              type="number"
              min="3"
              max="20"
              value={gridSize.cols}
              onChange={(e) => {
                const cols = parseInt(e.target.value) || 3;
                setGridSize(prev => ({ ...prev, cols }));
                setGrid(prev => prev.map(row =>
                  Array(cols).fill(null).map((_, j) =>
                    row[j] || { letter: '', isBlack: false, number: null }
                  )
                ));
              }}
              className="cwb-input-number"
            />
          </div>
          <button onClick={autoNumberGrid} className="cwb-btn cwb-btn--brass">
            Auto-Number
          </button>
          <button onClick={() => setShowClueEditor(!showClueEditor)} className="cwb-btn cwb-btn--pine">
            {showClueEditor ? 'Hide' : 'Show'} Clues
          </button>
          <button onClick={() => setShowWordFinder(!showWordFinder)} className="cwb-btn cwb-btn--pine">
            {showWordFinder ? 'Hide' : 'Show'} Word Finder
          </button>
          <button onClick={exportCrossword} className="cwb-btn cwb-btn--accent">
            Export / Share
          </button>
        </div>

        <p className="cwb-hint">
          Click a cell to select, type a letter, or press Space to toggle black cells. Use arrow keys to navigate.
        </p>

        <div className="cwb-grid-wrap">
          <div className="cwb-grid">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="cwb-row">
                {row.map((cell, colIndex) => (
                  <div
                    key={colIndex}
                    className={
                      'cwb-cell' +
                      (cell.isBlack ? ' is-black' : '') +
                      (selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? ' is-selected' : '')
                    }
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    tabIndex={0}
                  >
                    {cell.number && !cell.isBlack && (
                      <span className="cwb-cell-number">{cell.number}</span>
                    )}
                    {!cell.isBlack && (
                      <div className="cwb-cell-letter">{cell.letter}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="cwb-alphabet">
          <h3 className="cwb-subhead" style={{ border: 'none', fontSize: '0.95rem' }}>Drag letters to grid</h3>
          <div className="cwb-letter-row">
            {alphabet.map(letter => (
              <div
                key={letter}
                draggable
                onDragStart={() => handleDragStart(letter)}
                className="cwb-letter-tile"
              >
                {letter}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showWordFinder && (
        <div className="cwb-panel">
          <h2 className="cwb-panel-title">Word Finder</h2>

          <p className="cwb-body-text">
            Enter a pattern using letters and ? for unknown positions (e.g., "C?T" finds CAT, COT, CUT, etc.)
            <br />
            Or select a cell and click "Find Across" or "Find Down" to auto-detect the pattern.
          </p>

          <div className="cwb-controls" style={{ marginBottom: '10px' }}>
            <button
              onClick={() => findWordForCurrentCell('across')}
              className="cwb-btn cwb-btn--brass"
              disabled={!selectedCell}
            >
              Find Across
            </button>
            <button
              onClick={() => findWordForCurrentCell('down')}
              className="cwb-btn cwb-btn--brass"
              disabled={!selectedCell}
            >
              Find Down
            </button>
          </div>

          <div className="cwb-controls">
            <input
              type="text"
              value={wordPattern}
              onChange={(e) => setWordPattern(e.target.value.toUpperCase())}
              placeholder="Enter pattern (e.g., C?T)"
              className="cwb-input-text"
              style={{ flex: 1, minWidth: '180px' }}
              onKeyDown={(e) => e.key === 'Enter' && searchWords()}
            />
            <button
              id="word-search-button"
              onClick={searchWords}
              disabled={isSearching}
              className="cwb-btn cwb-btn--accent"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div>
            {isSearching ? (
              <div className="cwb-empty-state">
                <div className="cwb-spinner"></div>
                <p>Searching dictionary&hellip;</p>
              </div>
            ) : foundWords.length > 0 ? (
              <div>
                <h3 className="cwb-subhead" style={{ border: 'none' }}>
                  Found {foundWords.length} word{foundWords.length !== 1 ? 's' : ''}
                </h3>
                <div className="cwb-word-results">
                  {foundWords.map((word, idx) => (
                    <button
                      key={idx}
                      onClick={() => fillWordInGrid(word)}
                      className="cwb-word-chip"
                      title="Click to insert into grid at selected position"
                    >
                      {word}
                    </button>
                  ))}
                </div>
                <p className="cwb-hint" style={{ marginTop: '12px' }}>
                  Click any word to insert it at the selected cell position
                </p>
              </div>
            ) : wordPattern ? (
              <p className="cwb-empty-state">No words found matching "{wordPattern}". Try a different pattern.</p>
            ) : (
              <p className="cwb-empty-state">Enter a pattern and click Search to find matching words</p>
            )}
          </div>
        </div>
      )}

      {showClueEditor && (
        <div className="cwb-panel">
          <h2 className="cwb-panel-title">Clues</h2>

          <div className="cwb-clue-grid">
            <div>
              <h3 className="cwb-subhead">Across</h3>
              {clueNumbers.across.length === 0 ? (
                <p className="cwb-hint">No across clues yet. Add numbers first.</p>
              ) : (
                clueNumbers.across.map(num => (
                  <div key={num} className="cwb-clue-row">
                    <span className="cwb-clue-num">{num}.</span>
                    <textarea
                      value={clues.across[num] || ''}
                      onChange={(e) => updateClue('across', num, e.target.value)}
                      placeholder="Enter clue..."
                      className="cwb-clue-textarea"
                      rows="2"
                    />
                  </div>
                ))
              )}
            </div>

            <div>
              <h3 className="cwb-subhead">Down</h3>
              {clueNumbers.down.length === 0 ? (
                <p className="cwb-hint">No down clues yet. Add numbers first.</p>
              ) : (
                clueNumbers.down.map(num => (
                  <div key={num} className="cwb-clue-row">
                    <span className="cwb-clue-num">{num}.</span>
                    <textarea
                      value={clues.down[num] || ''}
                      onChange={(e) => updateClue('down', num, e.target.value)}
                      placeholder="Enter clue..."
                      className="cwb-clue-textarea"
                      rows="2"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="cwb-modal-backdrop">
          <div className="cwb-modal">
            <div className="cwb-modal-header">
              <h2 className="cwb-panel-title" style={{ margin: 0 }}>Export &amp; Share Crossword</h2>
              <button onClick={() => setShowExportModal(false)} className="cwb-modal-close">&times;</button>
            </div>

            <div className="cwb-modal-section">
              <h3>Share as Playable Puzzle</h3>
              <p className="cwb-body-text">
                Generate a standalone HTML file that others can open in their browser to solve your crossword.
                They won't see the answers until they check or reveal them.
              </p>
              <button onClick={generateSharableHTML} className="cwb-btn cwb-btn--accent">
                Download Playable Puzzle (HTML)
              </button>
            </div>

            <div className="cwb-modal-section">
              <h3>Export for Editing</h3>
              <p className="cwb-body-text">
                Save your crossword design as JSON to continue editing later, or drop it in
                <code> assets/crosswords/</code> and embed it in a post with
                <code>{'{% include crossword.html src="..." %}'}</code>.
              </p>
              <div className="cwb-controls">
                <button onClick={downloadCrossword} className="cwb-btn cwb-btn--brass">Download JSON</button>
                <button onClick={copyToClipboard} className="cwb-btn cwb-btn--pine">Copy to Clipboard</button>
              </div>
              {exportedData && (
                <textarea value={exportedData} readOnly className="cwb-textarea-mono" style={{ height: '128px', marginTop: '12px' }} />
              )}
            </div>

            <div>
              <h3>Import Crossword</h3>
              <p className="cwb-body-text">Paste crossword JSON data to load a saved design.</p>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste JSON data here..."
                className="cwb-textarea-mono"
                style={{ height: '128px', marginBottom: '10px' }}
              />
              <button onClick={importCrossword} className="cwb-btn cwb-btn--pine">Import Crossword</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<CrosswordBuilder />, document.getElementById('root'));
