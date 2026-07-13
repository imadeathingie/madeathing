---
layout: post
title: "Blender Keyboard Generator"
category: cad
date: 2026-07-11
tags: [keyboards, 3d-printing, blender, python, openscad]
image: /assets/images/staggered-lattice.png
excerpt: "A Blender add-on that turns a handful of algebraic expressions into a fully 3D-printable keyboard case."
---

I've been building a generator for 3D-printable mechanical keyboard cases. You describe the board as JSON — a grid of keys, some algebraic expressions for how those keys are laid out in space, and a set of options for walls, skirts, baseplates, and threaded inserts — and it produces a watertight mesh you can slice and print.

This post walks through how it works: the coordinate system, the expression language that positions and tilts each key, and then a full reference for every JSON field.

## Overview

The project started life as an OpenSCAD generator and is now a standalone **Blender 5.x add-on** with a dependency-free Python geometry core. The split matters:

- **`core.py`** is pure Python (`import math` and nothing else). It does all the real geometry — the constant-thickness shell, the fused skirt, the baseplate, the insert holders, triangulation, convex hulls. Because it has no third-party dependencies, it runs anywhere.
- **`__init__.py`** is the thin Blender layer. It turns the vertex/face lists that `core.py` returns into Blender objects, runs the boolean operations Blender is good at, and provides the panel UI.
- **`keylist_gen.py`** expands a compact *keyboard definition* (a grid plus expressions) into an explicit *keylist* (one resolved entry per key) that the geometry core consumes.

The design goal throughout is a **single watertight solid** straight out of the generator — no manual mesh repair before slicing. The plate is built as a constant-thickness shell that follows the tilt of each key, walls and skirts are fused into that shell, and threaded-insert holders are unioned in so the whole thing prints as one piece.

## The coordinate system

Every key lives at a grid position `(x, y)` — think column and row — and those grid coordinates map into world space through expressions you control.

The important thing to internalise is **which quadrant we work in**. Coordinates come from the **bottom-right quadrant** of a graph: **x is positive, y is negative.** The top-left key of the board is the origin, x grows to the right, and y grows *downward* as a negative number. That's why the default vertical expression is `-y*key_1u` rather than `y*key_1u` — increasing the row index `y` should move a key *down* the board, which is the negative Y direction.

So for a board with `key_1u` (the 1-unit key pitch) of 19.05 mm, the key at grid `(2, 1)` lands at roughly world `(38.1, -19.05)`: two units right, one unit down.

Heights work the same way you'd expect — `z` is up — so tilting and doming the board is a matter of making the Z (and rotation) expressions depend on `x` and `y`.

## The x / y / z algorithms

The heart of the layout is six expressions, evaluated once per key:

| Field | Purpose | Default |
|---|---|---|
| `x_algo` | world X position | `x*key_1u` |
| `y_algo` | world Y position | `-y*key_1u` |
| `z_algo` | world Z position (height) | `10` |
| `x_rot_algo` | rotation about X, degrees | `0` |
| `y_rot_algo` | rotation about Y, degrees | `0` |
| `z_rot_algo` | rotation about Z, degrees | `0` |

Each expression is evaluated for every `(x, y)` in the grid, producing that key's position and orientation. Because they're just expressions, you get a lot of expressive power for free: a flat board is `z_algo: "10"`, a board that domes toward the middle row might be `z_algo: "abs(y-2)*5 + 6"`, and a thumb cluster that peels away can be gated behind a condition.

### Available variables

Inside any of the six expressions you can reference:

- **`x`** — the key's column index (0-based).
- **`y`** — the key's row index (0-based).
- **`z`** — always 0 in the position/rotation pass; present so expressions parse uniformly.
- **`width`** — the board's column count.
- **`height`** — the board's row count.
- **`key_1u`** — the 1-unit key pitch in mm (e.g. 19.05).

### Available functions

A small whitelist is exposed:

`abs`, `min`, `max`, `floor`, `ceil`, `round`

### Operators

Standard arithmetic (`+ - * / // % **`), comparisons (`== != < <= > >=`), boolean `and` / `or` / `not`, and — crucially — **ternary conditionals** (`A if cond else B`). The conditional is what makes per-region behaviour possible in a single line.

For example, this `z_algo` gives the last column of the bottom row one height, the far-right column another, one row a fixed height, and everything else a shallow dome:

```
17 if (x == 5 and y == 4) else 12 if (x == 6) else 9 if (y == 2) else abs(y-2)*5 + 6
```

### A note on safety

Expressions are **not** run through Python's `eval` blindly. They're parsed to an AST and every node is checked against the whitelist above — attribute access, arbitrary function calls, string literals, and anything else outside the allowed set are rejected before evaluation. So a keyboard definition shared as JSON can't smuggle in arbitrary code.

## JSON field reference

A keyboard definition is a JSON object (or a list of them). Below is every field, grouped by what it controls. Fields are optional unless noted, and defaults are given where they exist.

### Board basics

| Field | Meaning | Default |
|---|---|---|
| `name` | Board name, used for object/file naming | `"default"` |
| `width` | Number of columns | `6` |
| `height` | Number of rows | `4` |
| `key_1u` | 1-unit key pitch, mm | `19.05` |
| `hole_size` | Switch cutout size, mm (square) | `14.5` |
| `thickness` | Plate thickness, mm | `5` |

### Layout expressions

Covered in detail above. All optional; each falls back to its default.

| Field | Default |
|---|---|
| `x_algo` | `x*key_1u` |
| `y_algo` | `-y*key_1u` |
| `z_algo` | `10` |
| `x_rot_algo` | `0` |
| `y_rot_algo` | `0` |
| `z_rot_algo` | `0` |

### Occupancy: `ignored_keys`

A list of `[col, row]` pairs to omit from the grid — for non-rectangular boards, thumb clusters carved out of a block, and so on.

```json
"ignored_keys": [[0, 4], [1, 4], [6, 0], [6, 1]]
```

### Wider and taller keys: `u_diff`

By default every cell is 1u × 1u. `u_diff` widens or heightens specific keys and re-centres them so the enlarged cell stays visually anchored.

```json
"u_diff": [
  { "keys": [[3, 4]], "u_width": 2 },
  { "keys": [[0, 1]], "u_height": 1.5 }
]
```

- **`keys`** — the `[col, row]` cells this entry applies to.
- **`u_width`** — width in units. Values > 1 widen the key; the cell is repositioned so it stays centred. A **negative** `u_width` widens the key while anchoring it to the opposite side (useful when a wide key should grow leftward rather than rightward).
- **`u_height`** — height in units, re-centred vertically the same way.

### Explicit joins: `linked_keys`

For boards where keys don't sit on a clean grid — split layouts, staggered thumb clusters — `linked_keys` explicitly joins two keys so the shell bridges the gap between them. Each entry names the keys on each side of the join:

```json
"linked_keys": [
  { "l": [1, 3, "br"], "r": [2, 4] }
]
```

- **`l` / `r`** — the left and right keys of a horizontal join.
- **`t` / `b`** — the top and bottom keys of a vertical join.
- Each side value is `[col, row]`, or `[col, row, "corner"]` to pin the join to a specific corner (`tl`, `bl`, `br`, `tr`) of *that* key. The corner names a corner of the key that side refers to, letting you control exactly where the bridge attaches on an irregular layout.

### Wall settings

By default the plate is a bare constant-thickness shell. These fields turn its perimeter into a proper wall with a recess the plate seats into, or grow the plate's own edges into vertical walls.

| Field | Meaning | Default |
|---|---|---|
| `vertical_edges` | Drop the plate's perimeter straight down to `wall_base_z` instead of following the constant-thickness offset | `true` |
| `wall_base_z` | The floor height the walls drop to — the plane the case sits on | `0.0` |
| `wall_thickness` | Wall thickness at the top of the skirt (it can taper below) | `2.0` |
| `flange_offset` | Outward wall material beyond the plate edge, mm | `0` |
| `flange_z` | Recess depth — how far the plate top sits below the wall rim, mm | `0` |
| `plate_lip` | Width of the inward ledge the plate rests on, mm | `1.5` |
| `plate_gap` | Per-side clearance between plate and wall inner faces (print tolerance; total gap is `2 × plate_gap`), mm | `0.25` |

The recess cross-section, top to bottom, is: an outer wall out at `flange_offset`, a rim at `plate_top_z + flange_z`, an inward ledge of width `plate_lip` for the plate to rest on, and the wall dropping to the `z = 0` base.

### Skirt settings

The skirt is the swept outer wall that drops from the plate perimeter down to `wall_base_z`. Enabling it forces `vertical_edges` and gives you a fully enclosed case; it's also the prerequisite for a baseplate.

| Field | Meaning | Default |
|---|---|---|
| `skirt` | Enable the fused skirt | `false` |
| `skirt_mode` | `"angle"` (constant draft angle) or `"flare"` (constant outward run) | `"angle"` |
| `skirt_angle` | Outward draft angle from vertical, degrees (angle mode) | `0.0` |
| `skirt_flare` | Outward run at the base, mm (flare mode) | `0.0` |
| `skirt_flange` | Outward offset applied to the skirt footprint | — |
| `skirt_profile` | A multi-segment cross-section (below); overrides the single-segment modes | — |

#### Multi-segment profiles: `skirt_profile`

For anything more shaped than a single straight run, `skirt_profile` is a list of segments walked from just below the plate down to `wall_base_z`:

```json
"skirt_profile": [
  { "fraction": 0.3, "angle": 5 },
  { "fraction": 0.0, "out": 2.0 },
  { "fraction": 0.7, "angle": -3 }
]
```

- **`fraction`** — this segment's share of the *local* drop height. It's a share, not an absolute mm — because the perimeter's height varies around a tilted board, fractions keep every step in proportion and guarantee the sweep lands exactly on `wall_base_z`. Fractions are normalised, so they don't need to sum to 1.
- **`angle`** — draft angle from vertical for the segment (positive = outward, negative = inward).
- **`out`** — an explicit outward run in mm. If both `angle` and `out` are given, `out` wins.
- A segment with `fraction: 0` is a **horizontal ledge** and must specify `out`.

#### The step generator

Rather than hand-writing a profile, you can have one generated by interpolating the draft angle from top to bottom across evenly-sized steps. These fields drive that generator (the resulting `skirt_profile` is what actually gets built):

| Field | Meaning | Default |
|---|---|---|
| `skirt_steps` | Number of rotation steps between plate and base (1 = a single straight run) | `1` |
| `skirt_angle_end` | Draft angle of the last step (the first uses `skirt_angle`) | `0.0` |
| `skirt_step_out` | Horizontal ledge inserted between steps (0 = smooth) | `0.0` |

### Baseplate

A flat bottom cover matching the skirt's outer footprint, extruded downward. Requires the skirt.

| Field | Meaning | Default |
|---|---|---|
| `baseplate_thickness` | Cover thickness, mm (must be > 0) | `2.0` |
| `insert_clearance_d` | Screw clearance-hole diameter cut through the baseplate, coaxial with each insert hole, mm | `3.0` |

### Threaded inserts

The board can carry threaded-insert holders — the little towers that a heat-set brass insert presses into, so the baseplate can be screwed on. Each holder is a **three-legged "wishbone"**: a central disc with three legs splaying out to reach nearby walls and corners, drilled through the middle for the insert.

The outline is the convex hull of the three leg tips plus the disc — one leg to the left, one to the centre, one to the right — with each leg's length set independently. The three legs let a holder tie into the surrounding walls for rigidity; when placing one, it's worth orienting it so its legs catch the **outer** corners of the case in preference to inner ones, since a leg anchored to an outer corner braces the holder far more.

Inserts are given as a list, each attached to a key by `col`/`row`:

```json
"inserts": [
  {
    "col": 0, "row": 0,
    "x": -8.5, "y": 9.5,
    "od": 8.0, "id": 4.0,
    "rot": 45.0,
    "leg_0": 4.0, "leg_1": 8.0, "leg_2": 4.0,
    "hole_x": 0, "hole_y": 0
  }
]
```

| Field | Meaning | Default |
|---|---|---|
| `col`, `row` | The key this insert is attached to | — |
| `x`, `y` | Disc-centre offset from that key's centre, scaled by the key's unit size | — |
| `od` | Disc diameter, mm; radius is `od/2` | `8.0` |
| `id` | Insert hole diameter, mm (the heat-set insert's press-fit bore) | `4.0` |
| `height` | Holder height above the base plane, mm | `4.2` |
| `rot` | Holder rotation about Z, degrees | `0` |
| `leg_0` | Left leg length (tip distance from disc centre), mm | `5.0` |
| `leg_1` | Centre leg length, mm | `7.0` |
| `leg_2` | Right leg length, mm | `5.0` |
| `hole_x`, `hole_y` | Hole-centre offset from the disc centre, mm (clamped to stay inside the disc) | `0`, `0` |
| `clearance_d` | Per-insert override for the baseplate clearance-hole diameter | inherits `insert_clearance_d` |

### Meshing resolution

| Field | Meaning | Default |
|---|---|---|
| `insert_hole_segments` | Number of segments used to facet insert holes and circular cuts | `32` |

### Assembly entries

The top-level JSON can be a list, mixing buildable keyboard definitions with **combined/assembly entries** — objects with an `items` list that reference other boards by name and place them with a position, rotation, and optional mirror (for laying out a split keyboard's two halves together, for instance).

```json
{
  "name": "MyBoard-Combined",
  "items": [
    { "name": "MyBoard", "pos": [-120, 0, 0], "rot": [0, 0, -20] },
    { "name": "MyBoard", "pos": [120, 0, 0], "rot": [0, 0, 20], "mirror": [1, 0, 0] }
  ]
}
```

## Wrapping up

The whole thing is deliberately layered: a compact JSON definition, expanded into an explicit per-key list, turned into pure-Python geometry, and finally handed to Blender for the boolean-heavy assembly. The expression language is where most of the character of a board lives — a few conditionals in the Z and rotation algos is enough to describe a domed, tilted, split layout — while the field reference above covers everything else you'd reach for to make it printable.

{% include stl-viewer.html src="/assets/models/staggered.stl" color="#43554B" caption="staggered.stl" %}

```json
[
    {
    "name": "Staggered_6x5_stepped",
    "width": 7,
    "height": 5,
    "hole_size": 14.5,
    "key_1u": 19.05,
    "thickness": 4,
    "x_algo": "(x*key_1u+16-x) if (x >= 5 and y == 4) else x*key_1u",
    "y_algo": "-4*key_1u-14-(x-5)*0.5*key_1u if (x >= 5 and y == 4) else (-y)-y*key_1u-(12 if x == 0 else (10 if x == 1 else (2 if x == 2 else (4 if x >= 4 else 0))))",
    "z_algo": "17 if (x == 5 and y == 4) else 12 if (x == 6) else 9 if (y == 2) else abs(y-2)*(5)+6",
    "x_rot_algo": "x*3 if (x >= 5 and y == 4) else ((y-2)*(-10))",
    "y_rot_algo": "20 if (x == 6) else 10 if (x == 5 and y == 4) else 0",
    "z_rot_algo": "-30 if (x == 6) else -20 if (x == 5 and y == 4) else 0",
    "flange_offset": 3.0,
    "flange_z": 0.0,
    "plate_lip": 1.5,
    "plate_gap": 0.0,
    "wall_base_z": 0.0,
    "vertical_edges": false,
    "ignored_keys": [
      [ 0, 4 ],
      [ 1, 4 ],
      [ 6, 0 ],
      [ 6, 1 ],
      [ 6, 2 ],
      [ 6, 3 ]
    ],
    "linked_keys": [
      {"l": [ 1, 3, "br" ], "r": [ 2, 4 ]
      }
    ],
    "u_diff": [],
    "wall_thickness": 2.0,
    "skirt_flange": 1.4,
    "skirt_mode": "angle",
    "skirt_angle": 30.0,
    "skirt_flare": 0.0,
    "skirt": true,
    "skirt_steps": 8,
    "skirt_angle_end": 5.0,
    "skirt_step_out": 0.5,
    "constant_thickness_walls": true,
    "skirt_profile": [
      {
        "fraction": 0.125,
        "angle": 30.0
      },
      {
        "fraction": 0.0,
        "out": 0.5
      },
      {
        "fraction": 0.125,
        "angle": 26.0
      },
      {
        "fraction": 0.0,
        "out": 0.5
      },
      {
        "fraction": 0.125,
        "angle": 22.0
      },
      {
        "fraction": 0.0,
        "out": 0.5
      },
      {
        "fraction": 0.125,
        "angle": 19.0
      },
      {
        "fraction": 0.0,
        "out": 0.5
      },
      {
        "fraction": 0.125,
        "angle": 15.0
      },
      {
        "fraction": 0.0,
        "out": 0.5
      },
      {
        "fraction": 0.125,
        "angle": 12.0
      },
      {
        "fraction": 0.0,
        "out": 0.5
      },
      {
        "fraction": 0.125,
        "angle": 8.0
      },
      {
        "fraction": 0.125,
        "angle": 0.0
      }
    ],
    "inserts": [
      {
        "col": 3,
        "row": 0,
        "x": 0,
        "y": 13,
        "od": 8.0,
        "id": 4.0,
        "rot": 0,
        "hole_x": 0,
        "hole_y": 0,
        "leg_0": 4.0,
        "leg_1": 4.0,
        "leg_2": 4.0
      },
      {
        "col": 0,
        "row": 0,
        "x": -9,
        "y": 10,
        "od": 8.0,
        "id": 4.0,
        "rot": 45.0,
        "hole_x": 0,
        "hole_y": 0,
        "leg_0": 3.5,
        "leg_1": 7.0,
        "leg_2": 4.0
      },
      {
        "col": 0,
        "row": 3,
        "x": -8,
        "y": -8,
        "od": 8.0,
        "id": 4.0,
        "rot": 135.0,
        "hole_x": 0,
        "hole_y": 0,
        "leg_0": 4.0,
        "leg_1": 8.0,
        "leg_2": 4.0
      },
      {
        "col": 2,
        "row": 4,
        "x": -9,
        "y": -11,
        "od": 8.0,
        "id": 4.0,
        "rot": 135,
        "hole_x": 0,
        "hole_y": 0,
        "leg_0": 3.0,
        "leg_1": 7.0,
        "leg_2": 3.0
      },
      {
        "col": 5,
        "row": 4,
        "x": -13,
        "y": -8,
        "od": 8.0,
        "id": 4.0,
        "rot": 175,
        "hole_x": 0,
        "hole_y": 0,
        "leg_0": 4.0,
        "leg_1": 4.0,
        "leg_2": 4.0
      },
      {
        "col": 4,
        "row": 4,
        "x": 13,
        "y": -14,
        "od": 8.0,
        "id": 4.0,
        "rot": 175,
        "hole_x": 0,
        "hole_y": 0,
        "leg_0": 4.0,
        "leg_1": 4.0,
        "leg_2": 4.0
      },
      {
        "col": 5,
        "row": 1,
        "x": 10,
        "y": 0,
        "od": 8.0,
        "id": 4.0,
        "rot": 270.0,
        "hole_x": 0,
        "hole_y": 0,
        "leg_0": 4.0,
        "leg_1": 4.0,
        "leg_2": 4.0
      },
      {
        "col": 5,
        "row": 4,
        "x": 12,
        "y": 8,
        "od": 8.0,
        "id": 4.0,
        "rot": 325.0,
        "hole_x": 0,
        "hole_y": 0,
        "leg_0": 4.0,
        "leg_1": 4.0,
        "leg_2": 4.0
      }
    ],
    "baseplate_thickness": 2.0,
    "insert_clearance_d": 3.0
  },
{
    "name": "Staggered_6x5-Combined",
    "items": [
        {"name": "Staggered_6x5_stepped", "pos": [-120,0,0], "rot": [0,0,-20]},
        {"name": "Staggered_6x5_stepped", "pos": [120,0,0], "rot": [0,0,20], "mirror": [1,0,0]}
    ]
}
]
```