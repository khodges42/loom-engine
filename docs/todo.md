# Loom Todo

This list only tracks work that still needs a decision or implementation. Completed items were removed or moved to `docs/devlog.md`.
# todo
## when a context window is on a bolded word the whole context seems to be bolded, could be inaccurate but thats my test shows that
# Stretch
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

## front page image for the cover image.
Also a feature for a credits page

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

## Images

Consider a simple way to include images in passage text or passage metadata.

Keep this static-file friendly. No asset pipeline unless there is a very strong reason.

## Library Option

Maybe add a front page that lists multiple stories from a folder and lets the player choose one.

This is future work. It should not complicate the default one-folder, one-story workflow.
