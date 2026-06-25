# Loom Todo

This list only tracks work that still needs a decision or implementation. Completed items were removed or moved to `docs/devlog.md`.
# todo

## Context tooltip inside bold text

When a context window is on a bolded word, the whole context box seems to become bold. Likely caused by nested `<strong>` styling or inherited font weight in the tooltip. Test with `**[[Tiny Door|tiny_door]]**`.

# Stretch

## Image and cover follow-ups

Basic image support should stay static-file friendly:

- Define top-level image aliases in `images`
- Store image files in `images/`
- Reference passage images with `![[image_id]]`
- Support `small`, `medium`, `large`, and `full` sizes
- Constrain images to the page width and viewport height
- Support `cover.image` for the front page
- Support `credits` with text and image entries

After implementation, possible follow-ups:

- Figure-level links or click-to-enlarge
- Per-image placement options beyond centered block images
- Optional raw Markdown image syntax if authors strongly prefer it

## Context Glossary Follow-Ups

Basic context notes are implemented with:

- `[[term]]`
- `[[display text|context_id]]`
- top-level `context`
- hover/focus glossary boxes
- starter story examples

Remaining possible work:

- Dynamic context states, for example `effects.context.jack: married`
- More polished nested tooltip behavior
- Hover open/close delays
- Mobile/touch behavior
- Accessibility polish beyond basic focus support

Keep this scoped carefully. Basic glossary notes are useful; a complex tooltip engine is probably not worth it yet.

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



## Example Stories

Add a small `examples/` set when there are enough stable patterns to demonstrate.

Possible examples:

- Minimal story
- Character-creation story
- Inventory puzzle
- Stats/checks story
- Mystery with context glossary notes

The examples should be starting points, not a second documentation system.

## Library Option

Maybe add a front page that lists multiple stories from a folder and lets the player choose one.

This is future work. It should not complicate the default one-folder, one-story workflow.
