Yeah, fair. Here’s the corrected README draft based on the actual shape: **copy `src/`, edit `story.yaml`, keep it tiny.**

# Loom

> Weave interactive stories.

Loom is a tiny, hackable engine for choice-based games, interactive fiction, branching novels, and weird little narrative experiments.

It is meant to stay simple.

Just 4-ish files, one story file, and a web browser.

## What is Loom?

Loom is a static-site adventure game engine.

A Loom game is not a big application. It is not a platform. It is not a framework you have to study for a week before writing anything.

A Loom game is a small folder of files.

You copy the engine, edit `story.yaml`, and open it in a browser.

That is the core idea.

## Getting Started

Copy the files from `src/` into a new folder:

Then edit:

```text
story.yaml
```

That is your game.

To preview it locally, you should just be able to click `index.html` and open in your browser. 

If that gives you trouble for some reason, you may want to launch a simple file server with python:


```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```


## The Files

A Loom project is intentionally small.

```text
my-story/
├── index.html
├── style.css
├── loom.js
└── story.yaml
```

The exact file names may change over time, but the philosophy should not.

### `story.yaml`

This is the file you edit.

Your scenes, choices, text, conditions, flags, stats, inventory, and story structure live here.

Most authors should spend almost all of their time in `story.yaml`.

The default `story.yaml` is intentionally small. It is not meant to be an impressive game; it is meant to be the easiest possible file to edit first.

For a larger example, see `examples/werewolves-vs-vamps.story.yaml`.


### `index.html`

The page shell.

You usually should not need to edit this unless you are changing how the game is embedded or loaded.

### `style.css`

The look and feel.

Change this if you want your game to look like a paperback novel, a terminal, a visual novel, a haunted website, a zine, or whatever else.

### `loom.js`

The engine.

This handles loading the story, rendering scenes, showing choices, tracking state, and moving the player through the story.

It is meant to be readable.

If you want to hack the engine, you should be able to.

## Story Format

Loom stories are written in YAML.

A very small story might look something like this:

```yaml
title: Example Story
start: start

scenes:
  start:
    text: |
      You wake up in a room with two doors.

    choices:
      - text: Open the red door.
        goto: red_door

      - text: Open the blue door.
        goto: blue_door

  red_door:
    text: |
      The red door opens into a warm hallway.

    choices:
      - text: Go back.
        goto: start

  blue_door:
    text: |
      The blue door opens into darkness.

    choices:
      - text: Step inside.
        goto: darkness

  darkness:
    text: |
      Something in the dark remembers you.
```

At its simplest, a Loom story is just:

```text
scene → choices → scene
```

Everything else grows from that.

## Philosophy

Loom is built around a few stubborn ideas.

### Simple files beat complex systems

A story should not need a backend, account system, asset pipeline, database, or build maze just to exist.

The default Loom workflow should be:

```text
copy files
edit story.yaml
open browser
```

That is the whole thing.

### The engine should be understandable

Loom is not trying to hide everything behind magic.

The code should be small enough that a curious person can open it, read it, change it, break it, fix it, and make it theirs.

That is the point.

### Expansion should come from hacking

Loom should be expandable, but not bloated.

Stats, inventory, flags, conditions, character creation, custom UI, themes, saves, and validation can all exist without turning the engine into a giant framework.

The goal is not to include every feature.

The goal is to make the core simple enough that new features are easy to add.

### Stories are woven

Most choice games are described as branching trees.

But stories do not only branch.

They loop.
They remember.
They collapse.
They reconnect.
They echo.

A loom takes simple threads and turns them into a pattern.

That is the metaphor.

## Hosting

Loom games are static websites.

You can host them almost anywhere:

* GitHub Pages
* Cloudflare Pages
* Netlify
* Neocities
* S3
* Any plain web server

Upload the files and serve the folder.

There is no backend required.

## License

Loom is licensed under the GNU General Public License v3.0.

That means Loom is free software.

You are free to use it, study it, modify it, and share it. If you distribute modified versions of the engine, those changes must also preserve the same freedoms for other people.

I believe we need more of this for creative communities.

Interactive fiction, zines, small games, fan works, personal tools, and experimental art all thrive when people can learn from each other, remix each other’s tools, and build on shared infrastructure without that infrastructure disappearing into a private fork.

GPLv3 helps keep the engine part of the commons.

It does not mean every story written with Loom needs to be GPL. Your writing, art, characters, settings, and game content are yours. The license protects the engine code itself.

## Design Goals

Loom should remain:

* Small
* Free
* Hackable
* Static-first
* Easy to copy
* Easy to understand
* Easy to modify
* Friendly to non-engineers
* Useful for weird experiments

When in doubt, choose the simpler version.

When a feature makes Loom harder to understand, it should have to justify itself.

