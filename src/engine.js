/* Loom v0.3
   Static choice-based interactive fiction engine.
   Folder philosophy: one directory = one game.
*/

const LOOM_ENGINE_VERSION = "0.3.0";
const STORY_FILE = "./story.yaml";
const urlParams = new URLSearchParams(window.location.search);
const DEBUG = urlParams.has("debug");
const SKIP_VALIDATION = urlParams.has("skipValidation");

const app = document.getElementById("app");

let story = null;
let state = null;
let validation = null;
let statusMessage = "";
let storyFingerprint = "";

initTheme();
main();

async function main() {
  try {
    story = await loadStory();
    storyFingerprint = fingerprintStory(story);
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
  updateThemeButton();
}

function themeButtonHtml() {
  const isDark = document.body.dataset.theme === "dark";
  return `<button class="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle color theme">${isDark ? "Light" : "Dark"}</button>`;
}

function bindThemeButton() {
  const button = document.getElementById("theme-toggle");
  if (button) button.addEventListener("click", toggleTheme);
}

function updateThemeButton() {
  const button = document.getElementById("theme-toggle");
  if (!button) return;

  const isDark = document.body.dataset.theme === "dark";
  button.textContent = isDark ? "Light" : "Dark";
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
  const loadedStory = parseStoryYaml(yamlText);
  await loadChapters(loadedStory);
  return loadedStory;
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
          const loadedStory = parseStoryYaml(String(reader.result || ""));
          if (loadedStory.chapters) {
            throw new Error("Chapter files need to be loaded through a local server. Run python3 -m http.server 8000, then open http://localhost:8000.");
          }
          resolve(loadedStory);
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

async function loadChapters(loadedStory) {
  const files = chapterFiles(loadedStory.chapters);
  if (!files.length) return;

  for (const file of files) {
    const response = await fetch(file, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load chapter ${file}: ${response.status} ${response.statusText}`);
    }

    const chapter = parseStoryYaml(await response.text());
    mergeChapter(loadedStory, chapter, file);
  }
}

function chapterFiles(chapters) {
  if (!chapters) return [];

  if (Array.isArray(chapters)) {
    return chapters.map(chapterFile).filter(Boolean);
  }

  if (typeof chapters === "object") {
    return Object.values(chapters).map(chapterFile).filter(Boolean);
  }

  return [];
}

function chapterFile(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.file || value.path || "";
  return "";
}

function mergeChapter(base, chapter, source) {
  if (!chapter || typeof chapter !== "object") {
    throw new Error(`Chapter ${source} must be a YAML object.`);
  }

  base.passages ||= {};

  for (const [id, passage] of Object.entries(chapter.passages || {})) {
    if (base.passages[id]) {
      throw new Error(`Chapter ${source} defines duplicate passage "${id}".`);
    }
    base.passages[id] = passage;
  }

  mergeObject(base, chapter, "context");
  mergeObject(base, chapter, "images");
  mergeObject(base, chapter, "stats");
  mergeObject(base, chapter, "flags");

  if (Array.isArray(chapter.inventory)) {
    const existing = new Set(base.inventory || []);
    base.inventory = [...existing, ...chapter.inventory.filter(item => !existing.has(item))];
  }
}

function mergeObject(base, extra, key) {
  if (!extra[key]) return;
  base[key] = { ...(base[key] || {}), ...extra[key] };
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
    const savedState = parsed.state || parsed;
    const meta = parsed.state ? parsed.meta || {} : legacySaveMeta();

    if (!saveMatches(meta)) return null;

    savedState.stats = { ...(story.stats || {}), ...(savedState.stats || {}) };
    savedState.flags = { ...(story.flags || {}), ...(savedState.flags || {}) };
    savedState.inventory = Array.isArray(savedState.inventory) ? savedState.inventory : [];
    savedState.character = savedState.character || {};
    savedState.history = Array.isArray(savedState.history) ? savedState.history : [];

    if (!story.passages?.[savedState.scene]) return null;
    return savedState;
  } catch {
    return null;
  }
}

function loadSaveInfo() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { exists: false, loadable: false, reason: "" };

    const parsed = JSON.parse(raw);
    const meta = parsed.state ? parsed.meta || {} : legacySaveMeta();

    if (saveMatches(meta)) return { exists: true, loadable: true, reason: "" };

    return { exists: true, loadable: false, reason: staleSaveReason(meta) };
  } catch {
    return { exists: true, loadable: false, reason: "Save data is unreadable." };
  }
}

function legacySaveMeta() {
  return {
    engineVersion: "legacy",
    storyVersion: "",
    storyHash: ""
  };
}

function saveMatches(meta) {
  return meta.engineVersion === LOOM_ENGINE_VERSION
    && meta.storyVersion === storyVersion()
    && meta.storyHash === storyFingerprint;
}

function staleSaveReason(meta) {
  if (meta.engineVersion !== LOOM_ENGINE_VERSION) return "Save is from a different engine version.";
  if (meta.storyVersion !== storyVersion()) return "Save is from a different story version.";
  if (meta.storyHash !== storyFingerprint) return "Save is from different story content.";
  return "Save is not compatible.";
}

function storyVersion() {
  return String(story?.version ?? "1");
}

function saveEnvelope() {
  return {
    meta: {
      engineVersion: LOOM_ENGINE_VERSION,
      storyVersion: storyVersion(),
      storyHash: storyFingerprint,
      savedAt: new Date().toISOString()
    },
    state
  };
}

function autoSaveGame() {
  if (story?.ui?.auto_save === false) return;
  writeSave();
}

function writeSave(message) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(saveEnvelope()));
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

function renderCoverHeader() {
  const cover = story.cover || {};
  const title = cover.title || story.title || "Untitled Story";
  const subtitle = cover.subtitle || story.description || "";
  const author = cover.author || story.author || "";
  const image = cover.image ? renderImage(cover.image, cover.image_size || "large", "cover") : "";

  return `
    ${themeButtonHtml()}
    <header class="cover-page">
      <div class="cover-title-group">
        <h1 class="book-title">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="cover-subtitle">${escapeHtml(subtitle)}</p>` : ""}
      </div>
      ${image}
      ${author ? `<p class="cover-author">${escapeHtml(author)}</p>` : ""}
    </header>
  `;
}

function renderStartScreen() {
  const saveInfo = loadSaveInfo();
  const loadDisabled = saveInfo.loadable ? "" : "disabled";
  const loadLabel = saveInfo.loadable ? "Load Save" : saveInfo.exists ? "Save Outdated" : "No Save Found";
  const saveNote = saveInfo.exists && !saveInfo.loadable
    ? `<p class="save-note">${escapeHtml(saveInfo.reason)}</p>`
    : "";
  const creditsButton = hasCredits() ? `<button class="secondary-button" id="credits-button" type="button">Credits</button>` : "";

  app.innerHTML = `
    ${renderCoverHeader()}
    ${renderDebugPanel()}
    <section class="front-page">
      <button class="primary-button" id="start-button" type="button">Start</button>
      <button class="secondary-button" id="load-button" type="button" ${loadDisabled}>${loadLabel}</button>
      ${creditsButton}
      ${saveNote}
    </section>
  `;

  bindThemeButton();

  document.getElementById("start-button").addEventListener("click", startNewGame);
  document.getElementById("load-button").addEventListener("click", loadGame);
  const credits = document.getElementById("credits-button");
  if (credits) credits.addEventListener("click", renderCredits);
  scrollToTop();
}

function hasCredits() {
  const credits = story.credits;
  if (!credits) return false;
  if (typeof credits === "string") return Boolean(credits.trim());
  if (Array.isArray(credits)) return credits.length > 0;
  return Boolean(credits.text || credits.title || credits.entries?.length);
}

function renderCredits() {
  const credits = story.credits || {};
  const title = typeof credits === "object" && !Array.isArray(credits) ? credits.title || "Credits" : "Credits";
  const text = typeof credits === "string" ? credits : credits.text || "";
  const entries = Array.isArray(credits) ? credits : credits.entries || [];
  const entriesHtml = entries.map(renderCreditEntry).join("");

  app.innerHTML = `
    ${themeButtonHtml()}
    ${renderDebugPanel()}
    <h2 class="passage-title">${escapeHtml(title)}</h2>
    ${text ? `<article class="story-text">${markdownish(interpolate(text))}</article>` : ""}
    ${entriesHtml ? `<section class="credits-list">${entriesHtml}</section>` : ""}
    <nav class="toolbar">
      <button class="secondary-button" id="front-page-button" type="button">Front Page</button>
    </nav>
  `;

  bindThemeButton();
  document.getElementById("front-page-button").addEventListener("click", renderStartScreen);
  scrollToTop();
}

function renderCreditEntry(entry) {
  if (typeof entry === "string") {
    return `<p>${inlineText(entry, 0)}</p>`;
  }

  if (!entry || typeof entry !== "object") return "";

  const image = entry.image ? renderImage(entry.image, entry.size, "credit") : "";
  const text = entry.text ? `<p>${inlineText(entry.text, 0)}</p>` : "";
  const label = entry.label ? `<h3>${escapeHtml(entry.label)}</h3>` : "";

  return `<article class="credit-entry">${image}<div>${label}${text}</div></article>`;
}

function renderDebugPanel() {
  if (!DEBUG) return "";

  const lines = [];
  lines.push("VALIDATION");
  lines.push(`Errors: ${validation.errors.length}`);
  lines.push(`Warnings: ${validation.warnings.length}`);
  lines.push(`Engine: ${LOOM_ENGINE_VERSION}`);
  lines.push(`Story version: ${storyVersion()}`);
  lines.push(`Story hash: ${storyFingerprint}`);
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
    ${themeButtonHtml()}
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
  scrollToTop();
}

function renderPassage(passage) {
  const visibleChoices = (passage.choices || []).filter(choice => requirementsMet(choice.requires));

  const choicesHtml = visibleChoices.map((choice, index) => {
    return `<button class="choice-button" data-choice="${index}" type="button">${escapeHtml(choice.text)}</button>`;
  }).join("");

  const isEnding = passage.type === "ending" || passage.ending === true;
  const passageTitle = passage.title ? `<h2 class="passage-title">${escapeHtml(passage.title)}</h2>` : "";

  app.innerHTML = `
    ${themeButtonHtml()}
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
  scrollToTop();
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

      if (trimmed.startsWith("> ")) {
        const quote = trimmed
          .split("\n")
          .map(line => line.replace(/^>\s?/, ""))
          .join("\n");
        return `<blockquote>${inlineText(quote, 0).replace(/\n/g, "<br>")}</blockquote>`;
      }

      const image = imageBlockParts(trimmed);
      if (image) {
        return renderImage(image.id, image.size);
      }

      const dialogue = dialogueParts(trimmed);
      if (dialogue) {
        return `
          <p class="dialogue">
            <span class="dialogue-speaker">${inlineText(dialogue.speaker, 0)}</span>
            <span class="dialogue-line">${inlineText(dialogue.line, 0).replace(/\n/g, "<br>")}</span>
          </p>
        `;
      }

      return `<p>${inlineText(trimmed, 0).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

function imageBlockParts(block) {
  const match = block.match(/^!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
  if (!match) return null;

  return {
    id: match[1].trim(),
    size: match[2]?.trim()
  };
}

function renderImage(id, sizeOverride, context = "story") {
  const entry = resolveImageEntry(id);
  if (!entry) return "";

  const size = imageSize(sizeOverride || entry.size);
  const caption = entry.label || entry.caption || "";
  const alt = entry.alt || caption || id;
  const src = imageSource(entry);

  if (!src) return "";

  return `
    <figure class="loom-image loom-image-${size} loom-image-${escapeHtml(context)}">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />
      ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
    </figure>
  `;
}

function resolveImageEntry(id) {
  const images = story?.images || {};
  const entry = images[id];

  if (typeof entry === "string") {
    return { location: entry };
  }

  return entry && typeof entry === "object" ? entry : null;
}

function imageSource(entry) {
  return entry.location || entry.path || entry.src || "";
}

function imageSize(size) {
  const normalized = String(size || "medium").toLowerCase();
  const sizes = new Set(["small", "medium", "large", "full"]);
  return sizes.has(normalized) ? normalized : "medium";
}

function dialogueParts(block) {
  const match = block.match(/^((?:\[[a-z]+\|[^\]]+\])|[A-Z][A-Za-z0-9 ._'-]{0,40}):\s+([\s\S]+)/);
  if (!match) return null;

  return {
    speaker: match[1].trim(),
    line: match[2].trim()
  };
}

function inlineText(text, depth = 0) {
  return renderInlineFormatting(renderContextRefs(text, depth));
}

function renderInlineFormatting(html) {
  return html
    .replace(/\[([a-z]+)\|(.+?)\]/g, (_, color, content) => {
      const safeColor = textColor(color);
      return safeColor ? `<span class="text-${safeColor}">${content}</span>` : `[${color}|${content}]`;
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, '<span class="underline">$1</span>')
    .replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>");
}

function textColor(color) {
  const colors = new Set(["red", "blue", "green", "gold", "muted", "gray", "grey"]);
  return colors.has(color) ? color : "";
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

  const topFields = new Set(["title", "slug", "author", "description", "version", "theme", "ui", "cover", "credits", "start", "chapters", "character", "context", "images", "stats", "inventory", "flags", "passages", "debug"]);
  warnUnknownFields(story, topFields, "top level", warnings);

  if (!story.title) warnings.push("Missing top-level title.");
  if (!story.start) errors.push("Missing top-level start passage.");
  if (!story.passages || typeof story.passages !== "object") errors.push("Missing top-level passages object.");

  const passages = story.passages || {};
  const passageIds = new Set(Object.keys(passages));
  const imageIds = new Set(Object.keys(story.images || {}));
  const stats = new Set(Object.keys(story.stats || {}));
  const items = new Set(story.inventory || []);
  const flags = new Set(Object.keys(story.flags || {}));

  validateImages(story.images, errors, warnings);
  validateCover(story.cover, imageIds, warnings);
  validateCredits(story.credits, imageIds, warnings);

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
    validateImageRefs(passage.text, `passage "${id}"`, imageIds, warnings);

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

function validateImages(images, errors, warnings) {
  if (!images) return;

  if (typeof images !== "object" || Array.isArray(images)) {
    errors.push("Top-level images must be an object.");
    return;
  }

  const allowed = new Set(["label", "caption", "alt", "location", "path", "src", "size"]);

  for (const [id, entry] of Object.entries(images)) {
    if (typeof entry === "string") continue;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`Image "${id}" must be a path string or an object.`);
      continue;
    }

    warnUnknownFields(entry, allowed, `image "${id}"`, warnings);
    if (!imageSource(entry)) warnings.push(`Image "${id}" has no location, path, or src.`);
    if (entry.size && imageSize(entry.size) !== String(entry.size).toLowerCase()) {
      warnings.push(`Image "${id}" has unknown size "${entry.size}". Use small, medium, large, or full.`);
    }
  }
}

function validateCover(cover, imageIds, warnings) {
  if (!cover) return;
  if (typeof cover !== "object" || Array.isArray(cover)) {
    warnings.push("Cover should be an object.");
    return;
  }

  const allowed = new Set(["title", "subtitle", "author", "image", "image_size"]);
  warnUnknownFields(cover, allowed, "cover", warnings);
  if (cover.image && !imageIds.has(cover.image)) warnings.push(`Cover references unknown image "${cover.image}".`);
  if (cover.image_size && imageSize(cover.image_size) !== String(cover.image_size).toLowerCase()) {
    warnings.push(`Cover image_size "${cover.image_size}" should be small, medium, large, or full.`);
  }
}

function validateCredits(credits, imageIds, warnings) {
  if (!credits) return;
  if (typeof credits === "string") return;
  if (typeof credits !== "object") {
    warnings.push("Credits should be text, a list, or an object.");
    return;
  }

  if (!Array.isArray(credits)) {
    warnUnknownFields(credits, new Set(["title", "text", "entries"]), "credits", warnings);
  }

  const entries = Array.isArray(credits) ? credits : credits.entries || [];

  if (!Array.isArray(entries)) {
    warnings.push("Credits entries should be a list.");
    return;
  }

  for (const [index, entry] of entries.entries()) {
    const label = `credit entry ${index + 1}`;
    if (typeof entry === "string") continue;
    if (!entry || typeof entry !== "object") {
      warnings.push(`${label} should be text or an object.`);
      continue;
    }

    warnUnknownFields(entry, new Set(["label", "text", "image", "size"]), label, warnings);
    if (entry.image && !imageIds.has(entry.image)) warnings.push(`${label} references unknown image "${entry.image}".`);
    if (entry.size && imageSize(entry.size) !== String(entry.size).toLowerCase()) {
      warnings.push(`${label} size "${entry.size}" should be small, medium, large, or full.`);
    }
  }
}

function validateImageRefs(text, label, imageIds, warnings) {
  if (!text) return;

  const pattern = /^\s*!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*$/gm;
  let match;

  while ((match = pattern.exec(String(text)))) {
    const id = match[1].trim();
    const size = match[2]?.trim();

    if (!imageIds.has(id)) warnings.push(`${label} references unknown image "${id}".`);
    if (size && imageSize(size) !== size.toLowerCase()) {
      warnings.push(`${label} uses unknown image size "${size}". Use small, medium, large, or full.`);
    }
  }
}

function fingerprintStory(value) {
  return hashString(stableStringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashString(value) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
