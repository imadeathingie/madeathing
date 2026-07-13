// Playable crossword embed. Finds every .crossword[data-src] on the page,
// fetches its puzzle JSON, and wires up a fill-in grid with check/reveal/
// clear controls. Multiple puzzles per page are safe.
(function () {
  function initPuzzle(root) {
    if (root.dataset.initialized) return;
    root.dataset.initialized = "true";

    var src = root.dataset.src;
    var gridEl = root.querySelector('[data-role="grid"]');
    var acrossEl = root.querySelector('[data-role="across-clues"]');
    var downEl = root.querySelector('[data-role="down-clues"]');
    var toolbar = root.querySelector(".crossword-toolbar");

    var originalGrid, gridSize, clues, currentGrid;

    fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        originalGrid = data.grid;
        gridSize = data.gridSize;
        clues = data.clues;
        currentGrid = originalGrid.map(function (row) {
          return row.map(function (cell) {
            return { letter: "", isBlack: cell.isBlack, number: cell.number };
          });
        });
        renderGrid();
        renderClues();
        wireToolbar();
      })
      .catch(function (err) {
        gridEl.innerHTML = '<p class="crossword-error">Couldn\u2019t load this puzzle.</p>';
        console.error("Crossword failed to load " + src, err);
      });

    function renderGrid() {
      gridEl.innerHTML = "";
      currentGrid.forEach(function (row, rowIndex) {
        var rowDiv = document.createElement("div");
        rowDiv.className = "crossword-row";
        row.forEach(function (cell, colIndex) {
          var cellDiv = document.createElement("div");
          cellDiv.className = "crossword-cell" + (cell.isBlack ? " is-black" : "");
          if (!cell.isBlack) {
            if (cell.number) {
              var numSpan = document.createElement("span");
              numSpan.className = "crossword-cell-number";
              numSpan.textContent = cell.number;
              cellDiv.appendChild(numSpan);
            }
            var input = document.createElement("input");
            input.type = "text";
            input.maxLength = 1;
            input.value = cell.letter || "";
            input.className = "crossword-cell-input";
            input.setAttribute(
              "aria-label",
              "row " + (rowIndex + 1) + " column " + (colIndex + 1)
            );
            input.addEventListener("keydown", function (e) {
              handleKeyDown(e, rowIndex, colIndex);
            });
            input.addEventListener("input", function (e) {
              var val = (e.target.value || "").toUpperCase().slice(-1);
              currentGrid[rowIndex][colIndex].letter = val;
              e.target.value = val;
              if (val && colIndex < gridSize.cols - 1 && !currentGrid[rowIndex][colIndex + 1].isBlack) {
                focusCell(rowIndex, colIndex + 1);
              }
            });
            cellDiv.appendChild(input);
          }
          rowDiv.appendChild(cellDiv);
        });
        gridEl.appendChild(rowDiv);
      });
    }

    function handleKeyDown(e, row, col) {
      if (e.key === "ArrowRight" && col < gridSize.cols - 1) {
        e.preventDefault();
        focusCell(row, col + 1);
      } else if (e.key === "ArrowLeft" && col > 0) {
        e.preventDefault();
        focusCell(row, col - 1);
      } else if (e.key === "ArrowDown" && row < gridSize.rows - 1) {
        e.preventDefault();
        focusCell(row + 1, col);
      } else if (e.key === "ArrowUp" && row > 0) {
        e.preventDefault();
        focusCell(row - 1, col);
      } else if (e.key === "Backspace" && !currentGrid[row][col].letter && col > 0) {
        e.preventDefault();
        focusCell(row, col - 1);
      }
    }

    function focusCell(row, col) {
      var inputs = gridEl.querySelectorAll("input");
      var index = 0;
      for (var r = 0; r < gridSize.rows; r++) {
        for (var c = 0; c < gridSize.cols; c++) {
          if (!currentGrid[r][c].isBlack) {
            if (r === row && c === col) {
              inputs[index].focus();
              return;
            }
            index++;
          }
        }
      }
    }

    function checkAnswers() {
      var correct = 0;
      var total = 0;
      currentGrid.forEach(function (row, r) {
        row.forEach(function (cell, c) {
          if (!cell.isBlack) {
            total++;
            if (cell.letter && cell.letter === originalGrid[r][c].letter) correct++;
          }
        });
      });
      var pct = total ? Math.round((correct / total) * 100) : 0;
      showStatus(correct + " / " + total + " letters correct (" + pct + "%)");
    }

    function revealAnswers() {
      currentGrid = originalGrid.map(function (row) {
        return row.map(function (cell) {
          return Object.assign({}, cell);
        });
      });
      renderGrid();
      showStatus("Answers revealed.");
    }

    function clearGrid() {
      currentGrid.forEach(function (row) {
        row.forEach(function (cell) {
          if (!cell.isBlack) cell.letter = "";
        });
      });
      renderGrid();
      showStatus("Grid cleared.");
    }

    function showStatus(msg) {
      var statusEl = root.querySelector(".crossword-status");
      if (!statusEl) {
        statusEl = document.createElement("p");
        statusEl.className = "crossword-status";
        toolbar.insertAdjacentElement("afterend", statusEl);
      }
      statusEl.textContent = msg;
    }

    function renderClues() {
      renderClueList(acrossEl, clues.across);
      renderClueList(downEl, clues.down);
    }

    function renderClueList(container, list) {
      Object.keys(list)
        .sort(function (a, b) { return Number(a) - Number(b); })
        .forEach(function (num) {
          var p = document.createElement("p");
          p.className = "crossword-clue";
          var strong = document.createElement("strong");
          strong.textContent = num + ". ";
          p.appendChild(strong);
          p.appendChild(document.createTextNode(list[num]));
          container.appendChild(p);
        });
    }

    function wireToolbar() {
      toolbar.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var action = btn.dataset.action;
          if (action === "check") checkAnswers();
          else if (action === "reveal") {
            if (confirm("Reveal all answers?")) revealAnswers();
          } else if (action === "clear") {
            if (confirm("Clear the grid?")) clearGrid();
          }
        });
      });
    }
  }

  function scan() {
    document.querySelectorAll(".crossword[data-src]").forEach(initPuzzle);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
})();
