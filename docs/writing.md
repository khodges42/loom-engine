# Loom Writing Guide

This is the practical syntax reference for writing a Loom story.

## Start

A story needs a title, a start passage, and a `passages` table.

```yaml
title: "The Tiny Door"
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

When the page opens or refreshes, Loom shows the front page. If a save exists, the front page includes an enabled Load Save button. If no save exists, the load button is disabled.

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
