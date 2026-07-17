---
layout: post
title: "Python Keyboard Generator"
date: 2026-05-13
category: cad
image: /assets/images/staggered-lattice.png
tags: [openscad, python, keyboards, generative-design]
excerpt: "A config file and a handful of algebraic expressions turn into a fully parametric keyboard case."
github: "https://github.com/imadeathingie/PythonKeyboardGenerator"
---

Hand-placing every key on a keyboard case gets old fast, especially once
you start tenting or column-staggering a layout — every key needs its
own x, y, z, and rotation, and changing one column means redoing the
math on every key after it. So instead of placing keys, I describe the
*layout* as a formula in terms of column and row, and let a script place
every key for me.

## The config

A keyboard is a JSON file with a size and six expressions — one each for
x, y, z position and x, y, z rotation, written in terms of `x` (column),
`y` (row), `width`, `height`, and `key_1u`:

```json
{
  "name": "6x4_staggered",
  "width": 6,
  "height": 4,
  "x_algo": "x*key_1u",
  "y_algo": "-y*key_1u",
  "z_algo": "abs(y-2)*4 + 10",
  "x_rot_algo": "(y-2)*-5",
  "z_rot_algo": "0"
}
```

That `z_algo` alone gives every row a different height based on its
distance from row 2, and `x_rot_algo` tilts each row by 5° per row away
from the center — a basic dish/tent, from two expressions instead of 24
hand-tuned key positions. `keylist.py` evaluates all six for every
`(x, y)` in the grid and writes out a fully expanded keylist — one entry
per key with a concrete position and rotation — which is what the actual
model generator reads.

## A parser, not an `eval()`

The expressions are user-authored text I then execute, which normally
means either writing a real parser or reaching for Python's `eval()` and
hoping nobody (including future me) puts something dangerous in a config
file. I did the former, but the cheap way: parse the expression with
Python's own `ast` module, walk the tree, and reject anything that isn't
on an explicit allow-list — arithmetic, comparisons, ternaries, and a
handful of functions (`abs`, `min`, `max`, `floor`, `ceil`, `round`) —
before ever calling `eval()` on it:

```python
def _check(node):
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in allowed_funcs:
            raise ValueError("Disallowed function")
        for a in node.args:
            _check(a)
        return
    if isinstance(node, ast.Name):
        if node.id not in names:
            raise ValueError("Disallowed name")
        return
    # ...similar checks for BinOp, Compare, BoolOp, UnaryOp, Constant
```

Only once every node in the tree passes does it get compiled and
evaluated with an empty `__builtins__`. It's maybe 40 lines, and it's
the difference between "config file" and "arbitrary code execution
waiting to happen."

## Config to OpenSCAD

`keyboard.py` takes that expanded keylist and writes OpenSCAD, split
into three files per keyboard: `_keys` (switch cutouts and per-key
geometry), `_base` (the plate itself, as a `difference()` of the outline
and every hole), and `_switches`. Keeping them separate means I can
re-render just the plate while iterating on baseplate shape, instead of
waiting on every switch cutout every time.

The plate also generates its own heat-set insert bosses — cylindrical
posts with a configurable inner/outer diameter and an angular sweep
(`start_angle` to `end_angle`) rather than a plain hole, so mounting
posts can hug a curved edge instead of always pointing straight down.

## Assembling split boards

The part I like most: a keyboard config can be an *assembly* of other
already-generated keyboards instead of a grid of keys —

```json
{
  "name": "6abcCombined",
  "items": [
    { "name": "6abcLeft",  "pos": [-100, 0, 0] },
    { "name": "6abcRight", "pos": [100, 0, 0], "mirror": [1, 0, 0] }
  ]
}
```

Each item is `translate()`d, `rotate()`d, and optionally `mirror()`d
into place in pure SCAD, referencing the halves' own already-rendered
files. The one wrinkle: every keyboard's OpenSCAD modules are named
`base()` and `inserts()` by default, so combining two would collide —
`keyboard.py` scopes every module to `{name}_base()` /
`{name}_inserts()` per keyboard, so a left and right half (or three, or
five) can share one file without stepping on each other.

## Running it

`main.sh` strings the whole pipeline together for a given config —
`keylist.py` to expand it, `keyboard.py` to write the SCAD, then
OpenSCAD's CLI (with the `manifold` backend, which is a lot faster than
the default CGAL backend for boolean-heavy plates like this) to render
STLs for the base, the keys, and the full assembly.

The `keyboards/imadeathingie/` folder currently has about fifteen
variants in it — staggered on x, staggered on y, gappy versions of both,
a standalone thumb cluster, a couple of abandoned `_2`/`_3` attempts —
which is really just what iterating on a layout by editing six
expressions and re-running a script looks like in practice.
