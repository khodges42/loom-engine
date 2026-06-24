/* Loom v0.2
   Static choice-based interactive fiction engine.
   Folder philosophy: one directory = one game.
*/

const STORY_FILE = "./story.yaml";
const urlParams = new URLSearchParams(window.location.search);
const DEBUG = urlParams.has("debug");
const SKIP_VALIDATION = urlParams.has("skipValidation");

const app = document.getElementById("app");

let story = null;
let state = null;
let validation = null;
let statusMessage = "";

initTheme();
main();

async function main() {
  try {
    story = await loadStory();
    validation = validateStory(story);

    if (validation.errors.length && !SKIP_VALIDATION) {
      renderFatalValidation();
      return;
    }

    state = createInitialState();
    renderStartScreen();
  } catch (error) {
    renderFatalError(error);
  }
}

function initTheme() {
  const saved = localStorage.getItem("loom:theme");
  const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (preferredDark ? "dark" : "light");
  document.body.dataset.theme = theme;
}

function toggleTheme() {
  const current = document.body.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.body.dataset.theme = next;
  localStorage.setItem("loom:theme", next);
  render();
}

function themeButtonHtml() {
  const isDark = document.body.dataset.theme === "dark";
  return `<button class="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle color theme">${isDark ? "Light" : "Dark"}</button>`;
}

function bindThemeButton() {
  const button = document.getElementById("theme-toggle");
  if (button) button.addEventListener("click", toggleTheme);
}

function storageKey() {
  const slug = story?.slug || slugify(story?.title || location.pathname);
  return `loom:${slug}:save`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function loadStory() {
  if (location.protocol === "file:") {
    return chooseStoryFile();
  }

  const response = await fetch(STORY_FILE, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${STORY_FILE}: ${response.status} ${response.statusText}`);
  }

  const yamlText = await response.text();
  return parseStoryYaml(yamlText);
}

function chooseStoryFile() {
  return new Promise((resolve, reject) => {
    app.innerHTML = `
      ${themeButtonHtml()}
      <section class="error-screen">
        <h1>Load story.yaml</h1>
        <p>Loom could not load <code>${escapeHtml(STORY_FILE)}</code> because this page was opened directly from your filesystem.</p>
        <p>Browsers block local YAML loading for security reasons. To preview through a local server, run:</p>
        <pre class="validator">python3 -m http.server 8000</pre>
        <p>Then open <code>http://localhost:8000</code>.</p>
        <p>You can also choose your story file manually:</p>
        <input class="file-picker" id="story-file-picker" type="file" accept=".yaml,.yml" />
      </section>
    `;
    bindThemeButton();

    const picker = document.getElementById("story-file-picker");
    picker.addEventListener("change", () => {
      const file = picker.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        try {
          resolve(parseStoryYaml(String(reader.result || "")));
        } catch (error) {
          reject(error);
        }
      });
      reader.addEventListener("error", () => reject(new Error(`Could not read ${file.name}.`)));
      reader.readAsText(file);
    });
  });
}

function parseStoryYaml(yamlText) {
  if (!window.jsyaml) {
    throw new Error("YAML parser not found. Make sure js-yaml is loaded before engine.js.");
  }

  try {
    return window.jsyaml.load(yamlText);
  } catch (error) {
    const mark = error.mark
      ? `\n\nYAML location: line ${error.mark.line + 1}, column ${error.mark.column + 1}`
      : "";
    const snippet = error.mark?.snippet ? `\n\n${error.mark.snippet}` : "";
    throw new Error(`Could not parse story.yaml.\n\n${error.reason || error.message}${mark}${snippet}`);
  }
}

function createInitialState() {
  return {
    scene: story.start,
    character: {},
    stats: { ...(story.stats || {}) },
    inventory: [],
    flags: { ...(story.flags || {}) },
    history: []
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    parsed.stats = { ...(story.stats || {}), ...(parsed.stats || {}) };
    parsed.flags = { ...(story.flags || {}), ...(parsed.flags || {}) };
    parsed.inventory = Array.isArray(parsed.inventory) ? parsed.inventory : [];
    parsed.character = parsed.character || {};
    parsed.history = Array.isArray(parsed.history) ? parsed.history : [];

    if (!story.passages?.[parsed.scene]) return null;
    return parsed;
  } catch {
    return null;
  }
}

function autoSaveGame() {
  if (story?.ui?.auto_save === false) return;
  writeSave();
}

function writeSave(message) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
    if (message !== undefined) statusMessage = message;
  } catch (error) {
    statusMessage = `Could not save: ${error.message || String(error)}`;
  }
}

function loadGame() {
  const saved = loadSave();

  if (!saved) {
    statusMessage = "No save found.";
    renderStartScreen();
    return;
  }

  state = saved;
  statusMessage = "Loaded.";
  render();
}

function startNewGame() {
  state = createInitialState();
  statusMessage = "";
  render();
}

function resetGame() {
  localStorage.removeItem(storageKey());
  state = createInitialState();
  statusMessage = "Restarted.";
  render();
}

function render() {
  autoSaveGame();

  const passage = story.passages[state.scene];

  if (!passage) {
    renderFatalError(new Error(`Missing passage: ${state.scene}`));
    return;
  }

  if (passage.type === "character") {
    renderCharacter(passage);
    return;
  }

  renderPassage(passage);
}

function renderHeader() {
  const author = story.author ? ` by ${escapeHtml(story.author)}` : "";
  return `
    ${themeButtonHtml()}
    <h1 class="book-title">${escapeHtml(story.title || "Untitled Story")}</h1>
    <p class="book-meta">${escapeHtml(story.description || "")}${author}</p>
  `;
}

function renderStartScreen() {
  const saved = loadSave();
  const loadDisabled = saved ? "" : "disabled";
  const loadLabel = saved ? "Load Save" : "No Save Found";

  app.innerHTML = `
    ${renderHeader()}
    ${renderDebugPanel()}
    <section class="front-page">
      <button class="primary-button" id="start-button" type="button">Start</button>
      <button class="secondary-button" id="load-button" type="button" ${loadDisabled}>${loadLabel}</button>
    </section>
  `;

  bindThemeButton();

  document.getElementById("start-button").addEventListener("click", startNewGame);
  document.getElementById("load-button").addEventListener("click", loadGame);
}

function renderDebugPanel() {
  if (!DEBUG) return "";

  const lines = [];
  lines.push("VALIDATION");
  lines.push(`Errors: ${validation.errors.length}`);
  lines.push(`Warnings: ${validation.warnings.length}`);
  for (const error of validation.errors) lines.push(`ERROR: ${error}`);
  for (const warning of validation.warnings) lines.push(`WARN: ${warning}`);
  lines.push("");
  lines.push("STATE");
  lines.push(`Scene: ${state.scene}`);
  lines.push(`Stats: ${JSON.stringify(state.stats)}`);
  lines.push(`Inventory: ${JSON.stringify(state.inventory)}`);
  lines.push(`Flags: ${JSON.stringify(state.flags)}`);
  lines.push(`Character: ${JSON.stringify(state.character)}`);
  lines.push(`History: ${state.history.join(" > ") || "(none)"}`);

  return `<section class="validator"><strong>Debug Panel</strong>\n\n${escapeHtml(lines.join("\n"))}</section>`;
}

function renderCharacter(passage) {
  const fields = story.character?.fields || {};
  const entries = Object.entries(fields);

  const inputs = entries.map(([id, field]) => {
    const label = field.label || id;
    const current = state.character[id] ?? field.default ?? "";

    if (field.type === "choice") {
      const options = (field.options || []).map(option => {
        const selected = option === current ? "selected" : "";
        return `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option)}</option>`;
      }).join("");

      return `
        <div class="field">
          <label for="field-${escapeHtml(id)}">${escapeHtml(label)}</label>
          <select id="field-${escapeHtml(id)}" name="${escapeHtml(id)}">${options}</select>
        </div>
      `;
    }

    return `
      <div class="field">
        <label for="field-${escapeHtml(id)}">${escapeHtml(label)}</label>
        <input id="field-${escapeHtml(id)}" name="${escapeHtml(id)}" value="${escapeHtml(current)}" />
      </div>
    `;
  }).join("");

  const next = passage.goto;
  app.innerHTML = `
    ${renderHeader()}
    ${renderDebugPanel()}
    <h2 class="passage-title">${escapeHtml(passage.title || "Character")}</h2>
    <div class="story-text">${markdownish(interpolate(passage.text || "Before the story begins, tell us who you are."))}</div>
    <form class="character-form" id="character-form">
      ${inputs}
      <button class="primary-button" type="submit">Begin</button>
    </form>
    ${renderToolbar(false)}
  `;

  bindThemeButton();

  document.getElementById("character-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    for (const [id] of entries) {
      state.character[id] = String(form.get(id) || "").trim();
    }

    goTo(next);
  });

  bindToolbar();
}

function renderPassage(passage) {
  const visibleChoices = (passage.choices || []).filter(choice => requirementsMet(choice.requires));

  const choicesHtml = visibleChoices.map((choice, index) => {
    return `<button class="choice-button" data-choice="${index}" type="button">${escapeHtml(choice.text)}</button>`;
  }).join("");

  const isEnding = passage.type === "ending" || passage.ending === true;
  const passageTitle = passage.title ? `<h2 class="passage-title">${escapeHtml(passage.title)}</h2>` : "";

  app.innerHTML = `
    ${renderHeader()}
    ${renderDebugPanel()}
    ${passageTitle}
    <article class="story-text">${markdownish(interpolate(passage.text || ""))}</article>
    ${isEnding ? `<div class="choices"><button class="primary-button" id="restart-ending" type="button">Start Over</button></div>` : ""}
    ${!isEnding ? `<section class="choices">${choicesHtml || "<p>No available choices.</p>"}</section>` : ""}
    ${renderStatus()}
    ${renderToolbar(true)}
  `;

  bindThemeButton();

  document.querySelectorAll("[data-choice]").forEach(button => {
    button.addEventListener("click", () => {
      const choice = visibleChoices[Number(button.dataset.choice)];
      applyEffects(choice.effects || {});
      if (choice.add_item) addItem(choice.add_item);
      if (choice.remove_item) removeItem(choice.remove_item);
      goTo(choice.goto);
    });
  });

  const restartEnding = document.getElementById("restart-ending");
  if (restartEnding) restartEnding.addEventListener("click", resetGame);

  bindToolbar();
}

function renderStatus() {
  const ui = story.ui || {};
  const showStats = ui.show_stats === true;
  const showInventory = ui.show_inventory === true;

  const stats = Object.entries(state.stats || {});
  const inventory = state.inventory || [];

  let html = `<aside class="status">`;

  if (showStats && stats.length) {
    html += `<section><h3>Stats</h3><ul class="status-list">`;
    html += stats.map(([key, value]) => `<li class="status-pill">${escapeHtml(labelize(key))}: ${escapeHtml(value)}</li>`).join("");
    html += `</ul></section>`;
  }

  if (showInventory) {
    html += `<section><h3>Inventory</h3>`;
    if (inventory.length) {
      html += `<ul class="status-list">`;
      html += inventory.map(item => `<li class="status-pill">${escapeHtml(labelize(item))}</li>`).join("");
      html += `</ul>`;
    } else {
      html += `<p>Empty</p>`;
    }
    html += `</section>`;
  }

  if (statusMessage) {
    html += `<p class="status-message" role="status">${escapeHtml(statusMessage)}</p>`;
  }

  html += `</aside>`;
  return html;
}

function renderToolbar(showBack = false) {
  const canShowBack = showBack && story.ui?.show_back === true;

  return `
    <nav class="toolbar">
      ${canShowBack ? `<button class="secondary-button" id="back-button" type="button">Back</button>` : ""}
      <button class="secondary-button" id="reset-button" type="button">Restart</button>
    </nav>
  `;
}

function bindToolbar() {
  const reset = document.getElementById("reset-button");
  if (reset) reset.addEventListener("click", resetGame);

  const back = document.getElementById("back-button");
  if (back) {
    back.disabled = state.history.length === 0;
    back.addEventListener("click", () => {
      const previous = state.history.pop();
      if (previous) {
        state.scene = previous;
        render();
      }
    });
  }
}

function goTo(sceneId) {
  if (!sceneId || !story.passages?.[sceneId]) {
    renderFatalError(new Error(`Cannot go to missing passage: ${sceneId}`));
    return;
  }

  if (state.scene !== sceneId) {
    state.history.push(state.scene);
  }

  state.scene = sceneId;
  render();
}

function requirementsMet(requires) {
  if (!requires) return true;

  if (requires.all) {
    return requires.all.every(requirementMet);
  }

  if (requires.any) {
    return requires.any.some(requirementMet);
  }

  return requirementMet(requires);
}

function requirementMet(req) {
  if (!req) return true;

  if (req.all) return req.all.every(requirementMet);

  if (req.any) return req.any.some(requirementMet);

  if (req.item) return state.inventory.includes(req.item);

  if (req.flag) return Boolean(state.flags[req.flag]);

  if (req.not_flag) return !Boolean(state.flags[req.not_flag]);

  if (req.stat) {
    const value = Number(state.stats[req.stat] || 0);
    if ("gte" in req) return value >= Number(req.gte);
    if ("lte" in req) return value <= Number(req.lte);
    if ("gt" in req) return value > Number(req.gt);
    if ("lt" in req) return value < Number(req.lt);
    if ("eq" in req) return value === Number(req.eq);
  }

  return false;
}

function applyEffects(effects) {
  if (effects.stats) {
    for (const [stat, delta] of Object.entries(effects.stats)) {
      const current = Number(state.stats[stat] || 0);
      state.stats[stat] = current + Number(delta);
    }
  }

  if (effects.add_items) {
    for (const item of effects.add_items) addItem(item);
  }

  if (effects.remove_items) {
    for (const item of effects.remove_items) removeItem(item);
  }

  if (effects.flags) {
    for (const [flag, value] of Object.entries(effects.flags)) {
      state.flags[flag] = Boolean(value);
    }
  }
}

function addItem(item) {
  if (!state.inventory.includes(item)) {
    state.inventory.push(item);
  }
}

function removeItem(item) {
  state.inventory = state.inventory.filter(existing => existing !== item);
}

function interpolate(text) {
  return String(text).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, path) => {
    const value = getValue(path);
    return value == null ? "" : String(value);
  });
}

function getValue(path) {
  const parts = path.split(".");

  if (parts.length === 1) {
    const key = parts[0];
    if (key in state.character) return state.character[key];
    if (key in state.stats) return state.stats[key];
    if (key in state.flags) return state.flags[key];
    return "";
  }

  let root;
  if (parts[0] === "character") root = state.character;
  if (parts[0] === "stats") root = state.stats;
  if (parts[0] === "flags") root = state.flags;

  return parts.slice(1).reduce((value, key) => value?.[key], root);
}

function markdownish(text) {
  return String(text)
    .split(/\n{2,}/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      if (trimmed.startsWith("# ")) {
        return `<h1>${inlineText(trimmed.slice(2), 0)}</h1>`;
      }

      if (trimmed.startsWith("## ")) {
        return `<h2>${inlineText(trimmed.slice(3), 0)}</h2>`;
      }

      return `<p>${inlineText(trimmed, 0).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

function inlineText(text, depth = 0) {
  return renderContextRefs(text, depth).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderContextRefs(text, depth) {
  if (!story?.context || depth > 4) return escapeHtml(text);

  const parts = [];
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text))) {
    parts.push(escapeHtml(text.slice(lastIndex, match.index)));

    const display = match[1].trim();
    const key = (match[2] || match[1]).trim();
    const entry = resolveContextEntry(key);

    if (!entry) {
      parts.push(escapeHtml(display));
    } else {
      const label = entry.label || display;
      const body = entry.text || "";
      parts.push(`<span class="context-term" tabindex="0">${escapeHtml(display)}<span class="context-box" role="tooltip"><strong>${escapeHtml(label)}</strong><span>${inlineText(body, depth + 1)}</span></span></span>`);
    }

    lastIndex = pattern.lastIndex;
  }

  parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join("");
}

function resolveContextEntry(key) {
  const context = story?.context || {};
  if (context[key]) return context[key];

  const normalized = normalizeContextKey(key);
  if (context[normalized]) return context[normalized];

  return Object.values(context).find(entry => normalizeContextKey(entry?.label || "") === normalized);
}

function normalizeContextKey(key) {
  return String(key)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function validateStory(story) {
  const errors = [];
  const warnings = [];

  if (!story || typeof story !== "object") {
    return { errors: ["Story YAML must be an object."], warnings };
  }

  const topFields = new Set(["title", "slug", "author", "description", "version", "theme", "ui", "start", "character", "context", "stats", "inventory", "flags", "passages", "debug"]);
  warnUnknownFields(story, topFields, "top level", warnings);

  if (!story.title) warnings.push("Missing top-level title.");
  if (!story.start) errors.push("Missing top-level start passage.");
  if (!story.passages || typeof story.passages !== "object") errors.push("Missing top-level passages object.");

  const passages = story.passages || {};
  const passageIds = new Set(Object.keys(passages));
  const stats = new Set(Object.keys(story.stats || {}));
  const items = new Set(story.inventory || []);
  const flags = new Set(Object.keys(story.flags || {}));

  if (story.start && !passageIds.has(story.start)) {
    errors.push(`Start passage "${story.start}" does not exist.`);
  }

  for (const [id, passage] of Object.entries(passages)) {
    const allowed = new Set(["type", "title", "text", "choices", "goto", "ending"]);
    warnUnknownFields(passage || {}, allowed, `passage "${id}"`, warnings);

    if (!passage || typeof passage !== "object") {
      errors.push(`Passage "${id}" must be an object.`);
      continue;
    }

    if (!passage.type) warnings.push(`Passage "${id}" has no type. Assuming story.`);
    if (!passage.text && passage.type !== "character") warnings.push(`Passage "${id}" has no text.`);

    if (passage.type === "character") {
      if (!passage.goto) errors.push(`Character passage "${id}" needs goto.`);
      else if (!passageIds.has(passage.goto)) errors.push(`Character passage "${id}" goes to missing passage "${passage.goto}".`);
    }

    if (passage.choices) {
      if (!Array.isArray(passage.choices)) {
        errors.push(`Passage "${id}" choices must be a list.`);
      } else {
        passage.choices.forEach((choice, index) => {
          validateChoice(choice, index, id, passageIds, stats, items, flags, errors, warnings);
        });
      }
    }
  }

  warnUnreachable(story.start, passages, warnings);

  return { errors, warnings };
}

function validateChoice(choice, index, passageId, passageIds, stats, items, flags, errors, warnings) {
  const label = `choice ${index + 1} in passage "${passageId}"`;
  const allowed = new Set(["text", "goto", "requires", "effects", "add_item", "remove_item"]);
  warnUnknownFields(choice || {}, allowed, label, warnings);

  if (!choice.text) errors.push(`${label} is missing text.`);
  if (!choice.goto) errors.push(`${label} is missing goto.`);
  else if (!passageIds.has(choice.goto)) errors.push(`${label} goes to missing passage "${choice.goto}".`);

  validateRequirements(choice.requires, label, stats, items, flags, warnings);
  validateEffects(choice.effects, label, stats, items, flags, warnings);

  if (choice.add_item && !items.has(choice.add_item)) warnings.push(`${label} adds undeclared item "${choice.add_item}".`);
  if (choice.remove_item && !items.has(choice.remove_item)) warnings.push(`${label} removes undeclared item "${choice.remove_item}".`);
}

function validateRequirements(requires, label, stats, items, flags, warnings) {
  if (!requires) return;

  const reqs = [];
  collectRequirements(requires, reqs);

  for (const req of reqs) {
    if (req.stat && !stats.has(req.stat)) warnings.push(`${label} requires unknown stat "${req.stat}".`);
    if (req.item && !items.has(req.item)) warnings.push(`${label} requires undeclared item "${req.item}".`);
    if (req.flag && !flags.has(req.flag)) warnings.push(`${label} requires unknown flag "${req.flag}".`);
    if (req.not_flag && !flags.has(req.not_flag)) warnings.push(`${label} checks unknown flag "${req.not_flag}".`);
  }
}

function collectRequirements(node, out) {
  if (!node) return;
  if (node.all) node.all.forEach(child => collectRequirements(child, out));
  else if (node.any) node.any.forEach(child => collectRequirements(child, out));
  else out.push(node);
}

function validateEffects(effects, label, stats, items, flags, warnings) {
  if (!effects) return;

  if (effects.stats) {
    for (const stat of Object.keys(effects.stats)) {
      if (!stats.has(stat)) warnings.push(`${label} modifies unknown stat "${stat}".`);
    }
  }

  if (effects.add_items) {
    for (const item of effects.add_items) {
      if (!items.has(item)) warnings.push(`${label} adds undeclared item "${item}".`);
    }
  }

  if (effects.remove_items) {
    for (const item of effects.remove_items) {
      if (!items.has(item)) warnings.push(`${label} removes undeclared item "${item}".`);
    }
  }

  if (effects.flags) {
    for (const flag of Object.keys(effects.flags)) {
      if (!flags.has(flag)) warnings.push(`${label} modifies unknown flag "${flag}".`);
    }
  }
}

function warnUnknownFields(obj, allowed, context, warnings) {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      warnings.push(`Unknown field "${key}" in ${context}.`);
    }
  }
}

function warnUnreachable(start, passages, warnings) {
  if (!start || !passages?.[start]) return;

  const visited = new Set();

  function walk(id) {
    if (visited.has(id) || !passages[id]) return;
    visited.add(id);

    const passage = passages[id];
    if (passage.goto) walk(passage.goto);

    for (const choice of passage.choices || []) {
      if (choice.goto) walk(choice.goto);
    }
  }

  walk(start);

  for (const id of Object.keys(passages)) {
    if (!visited.has(id)) warnings.push(`Passage "${id}" is unreachable from start.`);
  }
}

function renderFatalValidation() {
  const report = [
    "Story validation failed.",
    "",
    ...validation.errors.map(error => `ERROR: ${error}`),
    "",
    "Add ?skipValidation=1 to the URL to ignore validation errors temporarily.",
    "Add ?debug=1 to see the full debug panel during play."
  ].join("\n");

  app.innerHTML = `
    ${themeButtonHtml()}
    ${renderHeader()}
    <section class="error-screen">
      <h2>Validation Error</h2>
      <pre class="validator">${escapeHtml(report)}</pre>
    </section>
  `;
  bindThemeButton();
}

function renderFatalError(error) {
  app.innerHTML = `
    ${themeButtonHtml()}
    <section class="error-screen">
      <h1>Something broke</h1>
      <pre class="validator">${escapeHtml(error.stack || error.message || String(error))}</pre>
    </section>
  `;
  bindThemeButton();
}

function labelize(key) {
  return String(key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
