# Loom Todo

This list only tracks work that still needs a decision or implementation. Completed items were removed or moved to `docs/devlog.md`.

# todo

# Bloom
These are for the visual editor which we are not yet building.

## Build condition and effect editor concepts

Bloom should treat conditions and effects as first-class editable structures instead of raw YAML blobs.

The target authoring experience should feel like rows:

- show this choice if flag `x` is true
- show this choice if stat `nerve` is at least `2`
- add `1` to stat `connection`
- set flag `intro_outlet_discord` to true
- give item `old_key`

This is one of Bloom's most important quality-of-life features.

## Add strict authoring validation

Keep runtime Loom forgiving, but add stricter validation for authoring tools and debug workflows.

Strict mode should catch things like:

- mixing `requires` and `conditions` on the same choice
- unknown fields
- duplicate aliases
- impossible or malformed stat checks
- effects targeting undeclared state
- choices with missing or placeholder targets

This should support Bloom and advanced users without making the simple hand-authored runtime workflow brittle.


## Bloom passage preview

Bloom should first support a focused passage preview, not a full live game preview.

The preview should render the passage text, formatting, images, and choices from the editor state without requiring the whole story to be complete and valid. Full story preview can come later.

## Improve story graph analysis

Expand validation into graph analysis that can power Bloom's map view.

It should identify:

- reachable and unreachable passages
- dead ends
- endings
- missing targets
- loops
- gated choices
- passages reachable only through conditions

This can start as simple analysis in the editor or debug tooling. It does not need to become a complex runtime feature.

## Define Bloom's canonical story model

Bloom needs a normalized in-memory model for editing stories, even if Loom keeps accepting convenient YAML shorthand.

The model should cover:

- passages
- choices
- conditions
- effects
- context
- images
- stats
- flags
- inventory
- chapters or source files, if loaded

This should not force runtime Loom into extra files or heavy abstractions. The goal is a clear schema Bloom can use internally and write back to readable YAML.



# Stretch

## Nested context interactions

Context entries can already contain rendered inline text, but nested interactive context boxes are likely to get messy quickly.

Desired behavior would be something like: click `Pine`, then click `Forest` inside that box, and close the previous box or limit the stack to one or two open boxes.

Move cautiously. This may require real tooltip state management instead of CSS-only hover/focus behavior. If it turns into a larger interaction system, keep it here rather than forcing it into the core todo list.

## Character sheet feature.

Author should define explitily which things the player sees on their character sheet, and WHEN they show up. This could get messy.


## Chapter ownership and build tools

Multi-chapter stories are useful for large projects and LLM-assisted generation, but they complicate editing and saving.

Possible paths:

- Bloom edits one all-in-one story file by default
- Bloom imports multiple chapter files into one editing context
- A helper compiles chaptered projects into one story file
- A helper validates chaptered projects without changing the simple runtime workflow

The simple one-folder, one-story workflow should remain the core. Larger-project tooling should be optional.

## Bloom export and packaging

Initial Bloom export should probably focus on YAML: either a chapter file or an all-in-one story file.

Stretch export ideas:

- complete playable folder
- one-file HTML bundle with engine, style, and story included
- compiled story object embedded directly in JavaScript

The one-file bundle may be useful, but think through debugging, asset paths, image handling, and whether it makes stories harder to inspect or modify.

## Full story preview in Bloom

After passage preview works, consider a full playable preview mode inside Bloom.

This is more complex because editor state can be incomplete, invalid, or mid-edit. It should wait until the canonical model and strict validation are solid.

## Image and cover follow-ups

Basic image support should stay static-file friendly.

Possible follow-ups:

- Figure-level links or click-to-enlarge
- Per-image placement options beyond centered block images
- Optional raw Markdown image syntax if authors strongly prefer it

## Context glossary polish

Remaining possible work:

- Hover open/close delays
- More accessibility polish beyond basic focus support
- Better touch behavior after the mobile dismissal bug is fixed

Keep this scoped carefully. Basic glossary notes are useful; a complex tooltip engine is probably not worth it unless Bloom or real stories prove the need.

## Hot Reload

Consider a preview-only hot reload helper, but only if it stays simple.

Risk: automatic reload can be annoying when an author is deep in a story path. A better version may reload assets only, or ask before restarting story state.

## Theme Packs

Theme variables are implemented in `src/style.css`.

Possible future work:

- Add a `themes/` directory containing small CSS variable override files
- Keep the main layout in one stylesheet
- Avoid duplicated full stylesheets that must be updated in parallel

This should wait until the base style settles.

## Library Option

Maybe add a front page that lists multiple stories from a folder and lets the player choose one.

This is future work. It should not complicate the default one-folder, one-story workflow.
