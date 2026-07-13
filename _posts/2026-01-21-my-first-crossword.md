---
title: "My First Crossword"
category: crossword
tags: [puzzle]
image: /assets/images/my-first-crossword.svg
excerpt: "A drag-and-drop crossword builder with a dictionary word finder, plus a playable puzzle embedded right in this post."
custom_scripts:
  - /assets/js/crossword-player.js
---

I wanted a way to build crosswords by hand — click a cell, type a
letter, toggle black squares, and get live word suggestions when I'm
stuck filling a gap. So I built a small builder: a 10&times;10 grid
editor with auto-numbering, a clue editor, and a word finder that
queries a dictionary API for anything matching a pattern like `C?T`.

## How it works

The grid is just an array of cells (`letter`, `isBlack`, `number`).
Auto-numbering walks the grid once, marking any cell that starts an
across or down word using the standard crossword rule: a cell gets a
number if it's not black, and either the cell to its left is black (or
it's the first column) with a non-black cell to its right, or the same
vertically.

The word finder is the part I use most. Select a cell, hit "Find
Across" or "Find Down" to pull the current pattern (letters typed so
far, `?` for blanks), and it queries a dictionary API for matches —
click any result to drop it straight into the grid.

Finished puzzles export as JSON — grid, clue numbers, and clue text —
which is exactly the format the embed below reads.

## Try it: play the puzzle

This is the first crossword I made with it, embedded live via the
`custom_scripts` front matter on this post (see the README for how
that works on any page).

{% include crossword.html src="/assets/crosswords/my-first-crossword.json" %}

## What's next

The builder itself is a page on this site — [try the crossword
builder]({{ '/crossword/' | relative_url }}) if you want to make
your own. Next up: a proper symmetry-aware auto-numberer and saving
drafts to the browser instead of round-tripping JSON files by hand.
