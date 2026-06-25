# Loom

> Weave interactive stories.

Loom is a tiny, hackable engine for choice-based games, interactive fiction, branching novels, and weird little narrative experiments.

It is meant to stay simple.

Four-ish files, one story file, and a web browser.

## What Is Loom?

Loom is a static-site adventure game engine.

A Loom game is not a big application. It is not a platform. It is not a framework you have to study for a week before writing anything.

A Loom game is a small folder of files.

You copy the engine, edit `story.yaml`, and open it in a browser.

That is the core idea.

## Getting Started

Copy the four files from `src/` into a new folder:

```text
my-story/
|-- index.html
|-- style.css
|-- engine.js
|-- story.yaml
`-- images/
```

Then edit:

```text
story.yaml
```

That is your game.

Open `index.html` in a browser to preview. If your browser blocks local YAML loading, Loom shows a file picker and a short explanation instead of a blank page.

You can also run a tiny local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

On Windows PowerShell, from the project folder:

```powershell
python -m http.server 8000
```

This repo also includes convenience wrappers, `serve.sh` and `serve.ps1`, that serve the bundled `src/` folder.

## The Files

A Loom project is intentionally small.

### `story.yaml`

This is the file you edit.

Your passages, choices, text, images, cover settings, credits, conditions, flags, stats, inventory, endings, character fields, and glossary notes live here.

Most authors should spend almost all of their time in `story.yaml`.

The default `story.yaml` is intentionally small. It is not meant to be an impressive game; it is meant to be the easiest possible file to edit first.

### `index.html`

The page shell.

You usually should not need to edit this unless you are changing how the game is embedded or loaded.

### `style.css`

The look and feel.

Change this if you want your game to look like a paperback novel, a terminal, a visual novel, a haunted website, a zine, or whatever else.

Loom exposes CSS variables such as `--loom-bg`, `--loom-text`, `--loom-accent`, and `--loom-context-highlight` so you can reskin the game without digging through layout code.

### `engine.js`

The engine.

This handles loading the story, validating it, rendering passages, showing choices, tracking state, autosaving, and resolving glossary notes.

It is meant to be readable.

If you want to hack the engine, you should be able to.

## Story Format

Loom stories are written in YAML.

A very small story might look something like this:

```yaml
title: Example Story
start: start

passages:
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

  blue_door:
    text: |
      The blue door opens into darkness.
```

At its simplest, a Loom story is:

```text
passage -> choices -> passage
```

Everything else grows from that.

For the practical author guide and syntax reference, see [docs/writing.md](docs/writing.md).

Dialogue can be written directly in passage text:

```yaml
text: |
  Morgan: We should not open that door.

  You open it anyway.
```

Loom highlights the speaker and indents the line, while keeping the source text easy to read.

Passage text also supports a small set of formatting:

```yaml
text: |
  This is **bold**, *italic*, and __underlined__.

  > This is an indented block.

  The warning is [red|not subtle].
```

The built-in color names are `red`, `blue`, `green`, `gold`, `muted`, `gray`, and `grey`.

## Built-In Features

- Passages and choices
- Simple text formatting for bold, italics, underline, color, quote blocks, and dialogue
- Image aliases, passage images, cover images, and credit images
- Character creation fields
- Optional stats, flags, and inventory
- Readable `requires` conditions
- Readable `effects`
- Endings
- Autosave by default, with Load Save on the front page when a compatible save exists
- Save compatibility checks using engine version, story version, and story content hash
- YAML validation with clear missing-passage and unknown-reference messages
- Context glossary notes with `[[term]]` and `[[display text|context_id]]`
- Optional chapter files for longer stories
- Theme variables in `style.css`
- Friendly local-file fallback when `story.yaml` cannot be fetched

## Context Notes

Define glossary entries once:

```yaml
context:
  old_key:
    label: "Old Key"
    text: "A little iron key with a paper tag."
```

Use them in passage text:

```yaml
text: |
  Beneath the mail, you find an [[Old Key]].
  The [[thing in your hand|old_key]] feels warm.
```

The highlighted text can be hovered or focused to show the note. Glossary text can include another glossary reference, but deeper tooltip behavior is intentionally basic for now.

## Philosophy

Loom is built around a few stubborn ideas.

### Simple Files Beat Complex Systems

A story should not need a backend, account system, asset pipeline, database, or build maze just to exist.

The default Loom workflow should be:

```text
copy files
edit story.yaml
open browser
```

That is the whole thing.

### The Engine Should Be Understandable

Loom is not trying to hide everything behind magic.

The code should be small enough that a curious person can open it, read it, change it, break it, fix it, and make it theirs.

That is the point.

### Expansion Should Come From Hacking

Loom should be expandable, but not bloated.

Stats, inventory, flags, conditions, character creation, custom UI, themes, saves, validation, glossary notes, and story-specific hacks can all exist without turning the engine into a giant framework.

The goal is not to include every feature.

The goal is to make the core simple enough that new features are easy to add.

### Stories Are Woven

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

- GitHub Pages
- Cloudflare Pages
- Netlify
- Neocities
- S3
- Any plain web server

Upload the files and serve the folder.

There is no backend required.

## License

Loom is licensed under the GNU General Public License v3.0.

That means Loom is free software.

You are free to use it, study it, modify it, and share it. If you distribute modified versions of the engine, those changes must also preserve the same freedoms for other people.

I believe we need more of this for creative communities.

Interactive fiction, zines, small games, fan works, personal tools, and experimental art all thrive when people can learn from each other, remix each other's tools, and build on shared infrastructure without that infrastructure disappearing into a private fork.

GPLv3 helps keep the engine part of the commons.

It does not mean every story written with Loom needs to be GPL. Your writing, art, characters, settings, and game content are yours. The license protects the engine code itself.

## Design Goals

Loom should remain:

- Small
- Free
- Hackable
- Static-first
- Easy to copy
- Easy to understand
- Easy to modify
- Friendly to non-engineers
- Useful for weird experiments

When in doubt, choose the simpler version.

When a feature makes Loom harder to understand, it should have to justify itself.
