const STORAGE_KEY = "k4millz-k4mlz-profile";

const defaults = {
  name: "k4mlz",
  bio: "Bio personnalisable, liens styles, musique et ambiance cyber pour une page statique prete a publier.",
  nameColor: "#7df9ff",
  nameSize: 78,
  videoSrc: "",
  imageSrc: "../9.jpg",
  musicSrc: "",
  musicLabel: "",
  overlay: 0.52,
  blur: false,
  volume: 0.55,
  links: [
    { title: "Instagram", url: "https://instagram.com" },
    { title: "TikTok", url: "https://tiktok.com" },
    { title: "YouTube", url: "https://youtube.com" },
  ],
};

let state = loadState();

const elements = {
  video: document.querySelector("#backgroundVideo"),
  image: document.querySelector("#backgroundImage"),
  overlay: document.querySelector("#readabilityOverlay"),
  displayName: document.querySelector("#displayName"),
  displayBio: document.querySelector("#displayBio"),
  linksPreview: document.querySelector("#linksPreview"),
  audio: document.querySelector("#audioPlayer"),
  playPauseBtn: document.querySelector("#playPauseBtn"),
  playPauseIcon: document.querySelector("#playPauseIcon"),
  trackLabel: document.querySelector("#trackLabel"),
  volume: document.querySelector("#volumeControl"),
  resetBtn: document.querySelector("#resetBtn"),
  nameInput: document.querySelector("#nameInput"),
  bioInput: document.querySelector("#bioInput"),
  nameColorInput: document.querySelector("#nameColorInput"),
  nameSizeInput: document.querySelector("#nameSizeInput"),
  videoUrlInput: document.querySelector("#videoUrlInput"),
  imageUrlInput: document.querySelector("#imageUrlInput"),
  overlayInput: document.querySelector("#overlayInput"),
  blurInput: document.querySelector("#blurInput"),
  musicUrlInput: document.querySelector("#musicUrlInput"),
  linkTitleInput: document.querySelector("#linkTitleInput"),
  linkUrlInput: document.querySelector("#linkUrlInput"),
  addLinkBtn: document.querySelector("#addLinkBtn"),
  linksEditor: document.querySelector("#linksEditor"),
};

init();

function init() {
  bindEvents();
  render();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaults, ...saved, links: saved?.links || defaults.links };
  } catch {
    return { ...defaults };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  elements.nameInput.addEventListener("input", (event) => {
    state.name = event.target.value;
    commit();
  });

  elements.bioInput.addEventListener("input", (event) => {
    state.bio = event.target.value;
    commit();
  });

  elements.nameColorInput.addEventListener("input", (event) => {
    state.nameColor = event.target.value;
    commit();
  });

  elements.nameSizeInput.addEventListener("input", (event) => {
    state.nameSize = Number(event.target.value);
    commit();
  });

  elements.videoUrlInput.addEventListener("change", (event) => {
    state.videoSrc = event.target.value.trim();
    commit();
  });

  elements.imageUrlInput.addEventListener("change", (event) => {
    state.imageSrc = event.target.value.trim();
    commit();
  });

  elements.overlayInput.addEventListener("input", (event) => {
    state.overlay = Number(event.target.value);
    commit();
  });

  elements.blurInput.addEventListener("change", (event) => {
    state.blur = event.target.checked;
    commit();
  });

  elements.musicUrlInput.addEventListener("change", (event) => {
    state.musicSrc = event.target.value.trim();
    state.musicLabel = state.musicSrc ? getFileName(state.musicSrc) : "";
    commit();
  });

  elements.volume.addEventListener("input", (event) => {
    state.volume = Number(event.target.value);
    elements.audio.volume = state.volume;
    saveState();
  });

  elements.playPauseBtn.addEventListener("click", toggleAudio);
  elements.audio.addEventListener("play", () => {
    elements.playPauseIcon.textContent = "II";
  });
  elements.audio.addEventListener("pause", () => {
    elements.playPauseIcon.textContent = "▶";
  });

  elements.addLinkBtn.addEventListener("click", addLink);
  elements.linkTitleInput.addEventListener("keydown", submitLinkWithEnter);
  elements.linkUrlInput.addEventListener("keydown", submitLinkWithEnter);

  elements.resetBtn.addEventListener("click", () => {
    state = { ...defaults, links: [...defaults.links] };
    localStorage.removeItem(STORAGE_KEY);
    render();
  });
}

function submitLinkWithEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    addLink();
  }
}

function commit() {
  saveState();
  render();
}

function render() {
  renderInputs();
  renderProfile();
  renderMedia();
  renderLinks();
}

function renderInputs() {
  elements.nameInput.value = state.name;
  elements.bioInput.value = state.bio;
  elements.nameColorInput.value = state.nameColor;
  elements.nameSizeInput.value = state.nameSize;
  elements.videoUrlInput.value = state.videoSrc;
  elements.imageUrlInput.value = state.imageSrc;
  elements.overlayInput.value = state.overlay;
  elements.blurInput.checked = state.blur;
  elements.musicUrlInput.value = state.musicSrc;
  elements.volume.value = state.volume;
}

function renderProfile() {
  elements.displayName.textContent = state.name.trim() || "k4mlz";
  elements.displayBio.textContent = state.bio.trim() || "Ajoute une bio pour personnaliser cette zone.";
  elements.displayName.style.color = state.nameColor;
  document.documentElement.style.setProperty("--accent", state.nameColor);
  document.documentElement.style.setProperty("--name-size", `${state.nameSize}px`);
}

function renderMedia() {
  elements.overlay.style.background = `rgba(2, 4, 12, ${state.overlay})`;
  elements.overlay.style.backdropFilter = state.blur ? "blur(8px)" : "blur(0)";

  elements.image.style.backgroundImage = state.imageSrc
    ? `linear-gradient(135deg, rgba(7, 10, 22, 0.1), rgba(7, 10, 22, 0.48)), url("${cssUrl(state.imageSrc)}")`
    : "";

  if (elements.video.getAttribute("src") !== state.videoSrc) {
    if (state.videoSrc) {
      elements.video.src = state.videoSrc;
    } else {
      elements.video.removeAttribute("src");
      elements.video.load();
    }
    elements.video.style.display = state.videoSrc ? "block" : "none";
    if (state.videoSrc) {
      elements.video.play().catch(() => {});
    }
  }

  if (elements.audio.getAttribute("src") !== state.musicSrc) {
    const wasPlaying = !elements.audio.paused;
    if (state.musicSrc) {
      elements.audio.src = state.musicSrc;
    } else {
      elements.audio.removeAttribute("src");
      elements.audio.load();
    }
    elements.audio.volume = state.volume;
    if (wasPlaying && state.musicSrc) {
      elements.audio.play().catch(() => {});
    }
  }

  elements.trackLabel.textContent = state.musicLabel || "Aucune musique";
}

function renderLinks() {
  elements.linksPreview.innerHTML = "";
  elements.linksEditor.innerHTML = "";

  state.links.forEach((link, index) => {
    const previewLink = document.createElement("a");
    previewLink.className = "profile-link";
    previewLink.href = normalizeUrl(link.url);
    previewLink.target = "_blank";
    previewLink.rel = "noreferrer";
    previewLink.innerHTML = `<span>${escapeHtml(link.title)}</span>`;
    elements.linksPreview.appendChild(previewLink);

    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML = `
      <a href="${escapeAttribute(normalizeUrl(link.url))}" target="_blank" rel="noreferrer">
        ${escapeHtml(link.title)}
      </a>
      <button type="button" data-index="${index}">Supprimer</button>
    `;
    row.querySelector("button").addEventListener("click", () => removeLink(index));
    elements.linksEditor.appendChild(row);
  });
}

function addLink() {
  const title = elements.linkTitleInput.value.trim();
  const url = elements.linkUrlInput.value.trim();

  if (!title || !url) return;

  state.links.push({ title, url: normalizeUrl(url) });
  elements.linkTitleInput.value = "";
  elements.linkUrlInput.value = "";
  commit();
}

function removeLink(index) {
  state.links.splice(index, 1);
  commit();
}

async function toggleAudio() {
  if (!state.musicSrc) return;

  if (elements.audio.paused) {
    await elements.audio.play().catch(() => {});
  } else {
    elements.audio.pause();
  }
}

function normalizeUrl(url) {
  if (!url) return "#";
  if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(url)) return url;
  return `https://${url}`;
}

function getFileName(url) {
  try {
    return new URL(normalizeUrl(url)).pathname.split("/").filter(Boolean).pop() || "Musique URL";
  } catch {
    return "Musique URL";
  }
}

function cssUrl(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
