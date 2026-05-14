import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaults = {
  username: "",
  display_name: "k4mlz",
  bio: "Profil k4mlz personnalisable.",
  name_color: "#7df9ff",
  name_size: 78,
  video_url: "",
  image_url: "../9.jpg",
  music_url: "",
  overlay: 0.52,
  blur: false,
  links: [],
};

let session = null;
let currentProfile = null;
let draftLinks = [];

const elements = {
  video: document.querySelector("#backgroundVideo"),
  image: document.querySelector("#backgroundImage"),
  overlay: document.querySelector("#readabilityOverlay"),
  statusPill: document.querySelector("#statusPill"),
  windowTitle: document.querySelector("#windowTitle"),
  avatarInitial: document.querySelector("#avatarInitial"),
  displayName: document.querySelector("#displayName"),
  displayBio: document.querySelector("#displayBio"),
  linksPreview: document.querySelector("#linksPreview"),
  audio: document.querySelector("#audioPlayer"),
  playPauseBtn: document.querySelector("#playPauseBtn"),
  playPauseIcon: document.querySelector("#playPauseIcon"),
  trackLabel: document.querySelector("#trackLabel"),
  copyProfileBtn: document.querySelector("#copyProfileBtn"),
  loginBox: document.querySelector("#loginBox"),
  profileForm: document.querySelector("#profileForm"),
  logoutBtn: document.querySelector("#logoutBtn"),
  panelKicker: document.querySelector("#panelKicker"),
  panelTitle: document.querySelector("#panelTitle"),
  usernameInput: document.querySelector("#usernameInput"),
  displayNameInput: document.querySelector("#displayNameInput"),
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
  publicLink: document.querySelector("#publicLink"),
  saveMessage: document.querySelector("#saveMessage"),
  adminPanel: document.querySelector("#adminPanel"),
  adminList: document.querySelector("#adminList"),
  refreshAdminBtn: document.querySelector("#refreshAdminBtn"),
  themePresetBtns: document.querySelectorAll("[data-theme]"),
};

init();

async function init() {
  bindEvents();
  const { data } = await supabase.auth.getSession();
  session = data.session;

  const requestedUsername = getRequestedUsername();
  if (requestedUsername) {
    await loadPublicProfile(requestedUsername);
    await maybeLoadEditor();
    return;
  }

  await loadDashboard();
}

function bindEvents() {
  elements.playPauseBtn.addEventListener("click", toggleAudio);
  elements.copyProfileBtn.addEventListener("click", copyProfileLink);
  elements.audio.addEventListener("play", () => {
    elements.playPauseIcon.textContent = "II";
  });
  elements.audio.addEventListener("pause", () => {
    elements.playPauseIcon.textContent = "▶";
  });

  elements.logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  });

  elements.profileForm.addEventListener("submit", saveProfile);
  elements.addLinkBtn.addEventListener("click", addLink);
  elements.linkTitleInput.addEventListener("keydown", submitLinkWithEnter);
  elements.linkUrlInput.addEventListener("keydown", submitLinkWithEnter);
  elements.refreshAdminBtn.addEventListener("click", loadAdminPanel);

  elements.profileForm.querySelectorAll("input, textarea").forEach((input) => {
    if (input === elements.linkTitleInput || input === elements.linkUrlInput) return;
    input.addEventListener("input", previewDraft);
    input.addEventListener("change", previewDraft);
  });

  elements.themePresetBtns.forEach((button) => {
    button.addEventListener("click", () => applyThemePreset(button.dataset.theme));
  });
}

async function loadDashboard() {
  if (!session) {
    renderProfile(defaults);
    showLoggedOut();
    return;
  }

  currentProfile = await getMyProfile();
  if (!currentProfile) {
    currentProfile = createDefaultProfile();
  }

  renderProfile(currentProfile);
  renderEditor(currentProfile);
  showEditor();

  if (currentProfile.is_admin) {
    await loadAdminPanel();
  }
}

async function maybeLoadEditor() {
  if (!session) return;
  currentProfile = await getMyProfile();

  if (!currentProfile) {
    currentProfile = createDefaultProfile();
  }

  renderEditor(currentProfile);
  showEditor();

  if (currentProfile.is_admin) {
    await loadAdminPanel();
  }
}

async function loadPublicProfile(username) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", normalizeUsername(username))
    .maybeSingle();

  if (error || !data || data.hidden) {
    renderProfile({
      ...defaults,
      display_name: "Profil introuvable",
      bio: "Ce profil n'existe pas ou a ete masque par moderation.",
      links: [],
    });
    showLoggedOut();
    return;
  }

  renderProfile(data);
  document.title = `${data.username} | k4mlz`;
}

async function getMyProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    setMessage(error.message, "error");
  }

  return data;
}

function createDefaultProfile() {
  const metadataUsername = normalizeUsername(session.user.user_metadata?.username || "");
  const fallback = normalizeUsername(session.user.email?.split("@")[0] || "user");

  return {
    ...defaults,
    id: session.user.id,
    username: metadataUsername || fallback,
    display_name: metadataUsername || fallback,
  };
}

function renderProfile(profile) {
  const safeProfile = { ...defaults, ...profile };
  const displayName = safeProfile.display_name || safeProfile.username || "k4mlz";
  const username = safeProfile.username || "";

  elements.statusPill.textContent = username ? `/${username}` : "k4mlz profile";
  elements.statusPill.dataset.username = username;
  elements.windowTitle.textContent = username ? `k4mlz://${username}` : "k4mlz://profile";
  elements.avatarInitial.textContent = getInitials(displayName);
  elements.displayName.textContent = displayName;
  elements.displayBio.textContent = safeProfile.bio || "Aucune bio pour le moment.";
  elements.displayName.style.color = safeProfile.name_color;
  document.documentElement.style.setProperty("--accent", safeProfile.name_color);
  document.documentElement.style.setProperty("--name-size", `${safeProfile.name_size}px`);

  elements.overlay.style.background = `rgba(2, 4, 12, ${safeProfile.overlay})`;
  elements.overlay.style.backdropFilter = safeProfile.blur ? "blur(8px)" : "blur(0)";
  elements.image.style.backgroundImage = safeProfile.image_url
    ? `linear-gradient(135deg, rgba(7, 10, 22, 0.1), rgba(7, 10, 22, 0.48)), url("${cssUrl(safeProfile.image_url)}")`
    : "";

  setVideo(safeProfile.video_url);
  setAudio(safeProfile.music_url);
  renderPreviewLinks(Array.isArray(safeProfile.links) ? safeProfile.links : []);
}

function renderPreviewLinks(links) {
  elements.linksPreview.innerHTML = "";

  links.forEach((link) => {
    const previewLink = document.createElement("a");
    previewLink.className = "profile-link";
    previewLink.href = normalizeUrl(link.url);
    previewLink.target = "_blank";
    previewLink.rel = "noreferrer";
    previewLink.innerHTML = `<span>${escapeHtml(link.title)}</span>`;
    elements.linksPreview.appendChild(previewLink);
  });
}

function renderEditor(profile) {
  const safeProfile = { ...defaults, ...profile };
  draftLinks = Array.isArray(safeProfile.links) ? [...safeProfile.links] : [];

  elements.usernameInput.value = safeProfile.username;
  elements.displayNameInput.value = safeProfile.display_name;
  elements.bioInput.value = safeProfile.bio;
  elements.nameColorInput.value = safeProfile.name_color;
  elements.nameSizeInput.value = safeProfile.name_size;
  elements.videoUrlInput.value = safeProfile.video_url;
  elements.imageUrlInput.value = safeProfile.image_url;
  elements.overlayInput.value = safeProfile.overlay;
  elements.blurInput.checked = safeProfile.blur;
  elements.musicUrlInput.value = safeProfile.music_url;
  elements.publicLink.href = safeProfile.username ? `/k4mlz/${safeProfile.username}` : "/k4mlz/";

  renderEditorLinks();
}

function previewDraft() {
  if (elements.profileForm.classList.contains("hidden")) return;

  renderProfile({
    ...currentProfile,
    username: normalizeUsername(elements.usernameInput.value),
    display_name: elements.displayNameInput.value.trim() || elements.usernameInput.value.trim(),
    bio: elements.bioInput.value.trim(),
    name_color: elements.nameColorInput.value,
    name_size: Number(elements.nameSizeInput.value),
    video_url: elements.videoUrlInput.value.trim(),
    image_url: elements.imageUrlInput.value.trim() || "../9.jpg",
    music_url: elements.musicUrlInput.value.trim(),
    overlay: Number(elements.overlayInput.value),
    blur: elements.blurInput.checked,
    links: draftLinks,
  });
}

function applyThemePreset(theme) {
  const themes = {
    aqua: { color: "#7df9ff", overlay: 0.52, blur: true },
    rose: { color: "#ff4fd8", overlay: 0.58, blur: true },
    volt: { color: "#b9ff5f", overlay: 0.5, blur: false },
    mono: { color: "#f7f8fb", overlay: 0.62, blur: true },
  };
  const selected = themes[theme] || themes.aqua;

  elements.nameColorInput.value = selected.color;
  elements.overlayInput.value = selected.overlay;
  elements.blurInput.checked = selected.blur;
  previewDraft();
}

function showEditor() {
  elements.loginBox.classList.add("hidden");
  elements.profileForm.classList.remove("hidden");
  elements.logoutBtn.classList.remove("hidden");
  elements.panelKicker.textContent = currentProfile?.is_admin ? "Admin connecte" : "Connecte";
  elements.panelTitle.textContent = "Mon profil";
}

function showLoggedOut() {
  elements.loginBox.classList.remove("hidden");
  elements.profileForm.classList.add("hidden");
  elements.logoutBtn.classList.add("hidden");
  elements.adminPanel.classList.add("hidden");
  elements.panelKicker.textContent = "Compte";
  elements.panelTitle.textContent = "Connexion";
}

async function saveProfile(event) {
  event.preventDefault();
  if (!session) return;

  const payload = {
    id: session.user.id,
    username: normalizeUsername(elements.usernameInput.value),
    display_name: elements.displayNameInput.value.trim() || elements.usernameInput.value.trim(),
    bio: elements.bioInput.value.trim(),
    name_color: elements.nameColorInput.value,
    name_size: Number(elements.nameSizeInput.value),
    video_url: elements.videoUrlInput.value.trim(),
    image_url: elements.imageUrlInput.value.trim() || "../9.jpg",
    music_url: elements.musicUrlInput.value.trim(),
    overlay: Number(elements.overlayInput.value),
    blur: elements.blurInput.checked,
    links: draftLinks,
  };

  if (!payload.username) {
    setMessage("Ton pseudo doit contenir lettres, chiffres, _ ou -.", "error");
    return;
  }

  setMessage("Sauvegarde...");
  const { data, error } = await supabase.from("profiles").upsert(payload).select("*").single();

  if (error) {
    setMessage(error.message, "error");
    return;
  }

  currentProfile = data;
  renderProfile(currentProfile);
  renderEditor(currentProfile);
  setMessage(`Sauvegarde OK. Ton lien : /k4mlz/${currentProfile.username}`, "success");
}

function addLink() {
  const title = elements.linkTitleInput.value.trim();
  const url = elements.linkUrlInput.value.trim();

  if (!title || !url) return;

  draftLinks.push({ title, url: normalizeUrl(url) });
  elements.linkTitleInput.value = "";
  elements.linkUrlInput.value = "";
  renderEditorLinks();
  previewDraft();
}

function removeLink(index) {
  draftLinks.splice(index, 1);
  renderEditorLinks();
  previewDraft();
}

function renderEditorLinks() {
  elements.linksEditor.innerHTML = "";

  draftLinks.forEach((link, index) => {
    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML = `
      <a href="${escapeAttribute(normalizeUrl(link.url))}" target="_blank" rel="noreferrer">
        ${escapeHtml(link.title)}
      </a>
      <button type="button">Supprimer</button>
    `;
    row.querySelector("button").addEventListener("click", () => removeLink(index));
    elements.linksEditor.appendChild(row);
  });
}

async function loadAdminPanel() {
  if (!currentProfile?.is_admin) return;

  elements.adminPanel.classList.remove("hidden");
  elements.adminList.innerHTML = "<p class=\"helper-text\">Chargement...</p>";

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, hidden, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    elements.adminList.innerHTML = `<p class="message error">${escapeHtml(error.message)}</p>`;
    return;
  }

  elements.adminList.innerHTML = "";
  data.forEach((profile) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <a href="/k4mlz/${escapeAttribute(profile.username)}" target="_blank" rel="noreferrer">
        ${escapeHtml(profile.username)}${profile.hidden ? " (masque)" : ""}
      </a>
      <div class="admin-actions">
        <button type="button" data-action="toggle">${profile.hidden ? "Afficher" : "Masquer"}</button>
        <button type="button" data-action="delete">Supprimer</button>
      </div>
    `;
    row.querySelector('[data-action="toggle"]').addEventListener("click", () => toggleHidden(profile));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteProfile(profile));
    elements.adminList.appendChild(row);
  });
}

async function toggleHidden(profile) {
  await supabase.from("profiles").update({ hidden: !profile.hidden }).eq("id", profile.id);
  await loadAdminPanel();
}

async function deleteProfile(profile) {
  const ok = window.confirm(`Supprimer le profil ${profile.username} ?`);
  if (!ok) return;

  await supabase.from("profiles").delete().eq("id", profile.id);
  await loadAdminPanel();
}

function submitLinkWithEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    addLink();
  }
}

async function toggleAudio() {
  if (!elements.audio.getAttribute("src")) return;

  if (elements.audio.paused) {
    await elements.audio.play().catch(() => {});
  } else {
    elements.audio.pause();
  }
}

async function copyProfileLink() {
  const username = elements.statusPill.dataset.username;
  if (!username) return;

  const link = `${window.location.origin}/k4mlz/${username}`;
  await navigator.clipboard?.writeText(link).catch(() => {});
  elements.copyProfileBtn.textContent = "Copie";
  window.setTimeout(() => {
    elements.copyProfileBtn.textContent = "Copier le lien";
  }, 1400);
}

function setVideo(src) {
  if (elements.video.getAttribute("src") === src) return;

  if (src) {
    elements.video.src = src;
  } else {
    elements.video.removeAttribute("src");
    elements.video.load();
  }

  elements.video.style.display = src ? "block" : "none";
  if (src) {
    elements.video.play().catch(() => {});
  }
}

function setAudio(src) {
  if (elements.audio.getAttribute("src") === src) return;

  if (src) {
    elements.audio.src = src;
  } else {
    elements.audio.removeAttribute("src");
    elements.audio.load();
  }

  elements.trackLabel.textContent = src ? getFileName(src) : "Aucune musique";
}

function getRequestedUsername() {
  const fromQuery = new URLSearchParams(window.location.search).get("u");
  if (fromQuery) return normalizeUsername(fromQuery);

  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === "k4mlz" && parts[1]) {
    return normalizeUsername(parts[1]);
  }

  return "";
}

function getInitials(value) {
  const clean = value.trim();
  if (!clean) return "K";

  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]).join("").toUpperCase();
}

function normalizeUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);
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

function setMessage(text, type = "") {
  elements.saveMessage.textContent = text;
  elements.saveMessage.className = `message ${type}`.trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
