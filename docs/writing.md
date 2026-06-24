# Loom Writing Guide

This is the practical syntax reference for writing a Loom story.

## Start

A story needs a title, a start passage, and a `passages` table.

```yaml
title: "The Tiny Door"
version: 1
start: foyer

passages:
  foyer:
    text: |
      You stand in the foyer.
```

## Passages

Each passage is keyed by an ID. The ID is what choices use in `goto`.

```yaml
passages:
  foyer:
    type: story
    title: "The Foyer"
    text: |
      Rain taps against the windows.
```

`type` is optional for normal story passages. Use `type: ending` for endings and `type: character` for character creation.

## Text Formatting

Plain paragraphs are written as normal text. Leave a blank line between paragraphs.

Loom supports a small Markdown-ish set of inline formatting:

```yaml
text: |
  This is **bold**.
  This is *italic*.
  This is __underlined__.
  This is [red|colored text].
```

Available text colors are `red`, `blue`, `green`, `gold`, `muted`, `gray`, and `grey`.

For an indented block, start each line with `>`:

```yaml
text: |
  > The letter is folded into a perfect square.
  > The ink is still wet.
```

For dialogue, start a paragraph with the speaker name, a colon, and the line:

```yaml
text: |
  Morgan: We should not open that door.

  You open it anyway.
```

Loom renders the speaker name as a highlighted label and indents the spoken line. This is intentionally simple; it is just text formatting, not a character system.

## Chapters

Most stories should stay in one `story.yaml` file. For longer stories, Loom can also load extra chapter files.

In `story.yaml`, list chapter files:

```yaml
chapters:
  - chapters/cellar.yaml
  - chapters/road.yaml
```

Each chapter file can define more passages:

```yaml
passages:
  cellar:
    title: "The Cellar"
    text: |
      The stairs end in a cold room.
```

Choices can `goto` passages from the main file or any loaded chapter. State is still global, so stats, flags, inventory, and endings can work across chapter files.

Chapter files may also add top-level `context`, `stats`, `flags`, and `inventory`. Duplicate passage IDs are errors.

Chapter loading needs a local server or hosted site. It will not work from the manual file picker fallback because browsers do not allow Loom to automatically read nearby files from disk.

## Choices

Choices are a list under a passage.

```yaml
choices:
  - text: "Open the door."
    goto: cellar
```

Loom validates that every `goto` points to an existing passage.

## Stats

Declare stats at the top level.

```yaml
stats:
  nerve: 0
  wit: 0
```

Change stats with effects:

```yaml
effects:
  stats:
    nerve: 1
    wit: -1
```

Stat effects are deltas, not replacements.

Stats are hidden from the player by default. To show them:

```yaml
ui:
  show_stats: true
```

## Flags

Declare flags at the top level.

```yaml
flags:
  opened_cellar: false
```

Set flags with effects:

```yaml
effects:
  flags:
    opened_cellar: true
```

## Inventory

Declare possible items at the top level.

```yaml
inventory:
  - lantern
  - old_key
```

Add or remove items with effects:

```yaml
effects:
  add_items:
    - old_key
  remove_items:
    - broken_key
```

Inventory is hidden from the player by default. To show it:

```yaml
ui:
  show_inventory: true
```

## Requirements

Use `requires` to show a choice only when the player meets a condition.

```yaml
requires:
  item: old_key
```

```yaml
requires:
  flag: opened_cellar
```

```yaml
requires:
  stat: nerve
  gte: 2
```

Combine requirements with `all` or `any`.

```yaml
requires:
  all:
    - item: lantern
    - flag: found_map
```

Supported stat comparisons are `gte`, `lte`, `gt`, `lt`, and `eq`.

## Character Fields

Character creation uses a passage with `type: character`.

```yaml
start: character

character:
  fields:
    name:
      type: text
      label: "Name"
      default: "Alex"
    first_instinct:
      type: choice
      label: "First instinct"
      default: "look for clues"
      options:
        - "look for clues"
        - "stay calm"

passages:
  character:
    type: character
    title: "Who Opens the Door?"
    goto: foyer
```

Use character values in text with double braces:

```yaml
text: |
  {{name}} steps into the hall.
```

## Endings

Use `type: ending` or `ending: true`.

```yaml
leave_ending:
  type: ending
  title: "Ending: Safe Enough"
  text: |
    You leave the house and stand in the rain.
```

Endings show a start-over button.

## Context Glossary

Declare context entries at the top level.

```yaml
context:
  old_key:
    label: "Old Key"
    text: "A little iron key with a paper tag."
```

Reference entries in passage text:

```yaml
text: |
  You find an [[Old Key]].
```

Use custom display text with an explicit ID:

```yaml
text: |
  You pick up [[the thing from your dream|old_key]].
```

The text before the pipe is displayed. The text after the pipe is the context ID.

## Saves

Loom stores saves in browser local storage. By default, Loom autosaves the current state whenever the game renders a passage.

When the page opens or refreshes, Loom shows the front page. If a compatible save exists, the front page includes an enabled Load Save button. If no save exists, the load button is disabled.

Saves are stamped with:

- the Loom engine version
- your story `version`
- a hash of the loaded story content

If any of those change, Loom treats the old save as outdated and disables Load Save instead of loading possibly broken state.

Set a top-level story version and bump it when story changes should invalidate old saves:

```yaml
title: "The Tiny Door"
version: 2
```

During play, the toolbar includes Restart by default.

Back is available as an author option:

```yaml
ui:
  show_back: true
```

When enabled, Back returns to the previous passage in the player's history.

Saves are keyed by `slug` when present, otherwise by story title.

To turn autosave off for a story, set:

```yaml
ui:
  auto_save: false
```

## Validation

Loom validates stories before play. Validation catches missing start passages, choices pointing to missing passages, unknown fields, unknown stats, undeclared items, and unreachable passages.

Use `?debug=1` to show the debug panel during play.

Use `?skipValidation=1` to temporarily ignore validation errors while editing.
