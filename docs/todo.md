## TODO: Context-Based Hover Glossary

Add a context-based hover glossary system for story text.

Authors should be able to mark words or phrases in `story.yaml` so the engine highlights them in rendered story text. When the player hovers over a highlighted term, a small context box appears with a definition, explanation, or story-specific note.

This should keep Loom simple while allowing richer interactive fiction features like lore, character knowledge, changing relationships, discovered clues, and nested explanations.

### Goals

* Allow authors to define hoverable terms in `story.yaml`
* Highlight marked words or phrases in rendered passage text
* Show a small context box on hover/focus
* Allow CSS customization for:

  * highlighted word color
  * underline/background treatment
  * context box styling
  * context box animation/timing
* Include at least one glossary example in the starter story
* Update the README with author-facing documentation

### Proposed Author Syntax

Use double square brackets for glossary/context references:

```yaml
text: |
  You see [[Jack]] standing beside the old gate.
```

Support custom display text with an explicit context ID:

```yaml
text: |
  You see [[your old friend|jack]] standing beside the old gate.
```

In this example:

* `your old friend` is the rendered text
* `jack` is the glossary/context ID

### Proposed `story.yaml` Structure

Add a top-level context/glossary table:

```yaml
context:
  jack:
    label: "Jack"
    text: "Your best friend since childhood."

  old_gate:
    label: "Old Gate"
    text: "A rusted iron gate at the edge of town."
```

The engine should resolve:

```yaml
[[Jack]]
```

by matching a glossary label or ID.

The engine should resolve:

```yaml
[[your old friend|jack]]
```

by using `your old friend` as display text and `jack` as the context lookup key.

### Dynamic Context / Story Knowledge

Support definitions that can change based on story state.

This should probably be modeled as character/story knowledge, not repeated inline definitions.

Example:

```yaml
context:
  jack:
    label: "Jack"
    text: "Your best friend since childhood."
    states:
      married:
        text: "Your partner. Somehow, after everything, Jack stayed."
      betrayed:
        text: "Your former best friend. You are no longer sure what Jack wants."
```

Story choices could update the active context state:

```yaml
effects:
  context:
    jack: married
```

This lets authors update Jack once, instead of manually redefining Jack every time the name appears.

### Nested Context Boxes

Support “context-in-context” behavior inspired by Paradox-style nested tooltips.

If a glossary definition contains another glossary term, that term should also be hoverable inside the context box.

Example:

```yaml
context:
  jack:
    label: "Jack"
    text: "Your best friend. He grew up near the [[Old Gate|old_gate]]."
```

Hovering `Jack` opens a context box. Inside that box, hovering `Old Gate` opens another context box.

This probably requires:

* delayed hover opening
* delayed hover closing
* mouse tracking between parent and child context boxes
* a grace period so the box does not instantly disappear
* optional visual timer/indicator before closing
* keyboard/focus support for accessibility

### Implementation Notes

Likely files to update:

* `loom.js`

  * parse glossary markup in passage text
  * render hoverable context spans
  * resolve context IDs from `story.yaml`
  * support dynamic context state
  * support nested context rendering
  * avoid unsafe raw HTML injection

* `style.css`

  * add styling for highlighted glossary terms
  * add styling for hover context boxes
  * add positioning, transitions, and optional close-delay indicator

* `story.yaml`

  * add small example glossary table
  * add at least one passage using `[[term]]`
  * add at least one passage using `[[display text|context_id]]`
  * add at least one choice that changes a context definition

* `README.md`

  * document glossary syntax
  * document context table format
  * document dynamic context updates
  * document how to customize highlight/context box colors in CSS

### MVP Scope

Implement first:

* Static glossary definitions
* `[[term]]` syntax
* `[[display text|context_id]]` syntax
* Basic hover/focus context box
* CSS styling
* README docs
* Starter story example

### Later Scope

Add after MVP:

* Dynamic glossary state changes
* Nested context boxes
* Tooltip hover delay / close delay
* Visual close timer
* Better mobile/touch support
* Accessibility polish

### Acceptance Criteria

* A story passage can include `[[Jack]]` and render `Jack` as highlighted text
* Hovering or focusing the highlighted word displays Jack’s definition
* A story passage can include `[[your old friend|jack]]` and resolve to the `jack` context entry
* Glossary definitions are defined centrally in `story.yaml`
* The starter story includes a simple example
* README explains how authors use the feature
* README explains how to change the highlight/context box styling in CSS
* The implementation keeps Loom small, readable, and hackable


## Better validation errors

Before adding big features, make bad YAML less painful.

Example errors:

Passage "cellar" has a choice pointing to missing passage "basement".
Choice "Open the door" requires item "old_key", but old_key is not listed in inventory.

This is huge for making Loom friendly.

## Writing doc + syntax reference

One clear doc in docs/ with:

How to start
How passages work
How choices work
How stats work
How flags work
How inventory works
How endings work

Keep it practical. No big docs system yet. Link this from the readme.
Have a more formal syntax reference there too. Causal tutorial and then syntax reference. 


## Save / load state

Add browser local storage.

Tiny UI:

Save
Load
Restart

For choice games, this is a very “real engine” feature without making the engine conceptually bigger.



## Condition syntax cleanup

Make sure requirements are readable and consistent.

Something like:

requires:
  item: old_key
requires:
  stat: nerve
  gte: 2
requires:
  all:
    - item: lantern
    - flag: found_map

This is core engine ergonomics.

## Effects syntax cleanup

Make sure requirements are readable and consistent for changing state.

effects:
  stats:
    nerve: 1
    suspicion: -1
  flags:
    opened_cellar: true
  add_items:
    - old_key
  remove_items:
    - broken_key

Before adding more features, make this beautiful.

## Theme variables in CSS

Add a small set of CSS variables:

:root {
  --loom-bg: #111;
  --loom-text: #eee;
  --loom-link: #d6a657;
  --loom-choice-bg: #222;
  --loom-choice-border: #555;
  --loom-context-highlight: #ffd27d;
}

This lets people reskin the engine without touching layout code.

## Dir of styles
Should have a style directory that gets built with different theme options.
It may be a good point to have some way to update all of these when the main style gets updated, maybe we can have these be overrides to the main style? Consider the best options for this. I dont want a situation where changes require updating many files if we do it that way. However if we have the theme variables in the main CSS, we can just have a nice directory of just the variables, but the updating will be a pain still... hmm. 