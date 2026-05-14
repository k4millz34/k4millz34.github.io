import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const isDashboardPath = window.location.pathname.replace(/\/+$/, "") === "/profil";
const VOLUME_STORAGE_KEY = "k4mlz-audio-volume";

const defaults = {
  username: "",
  display_name: "k4mlz",
  bio: "Profil k4mlz personnalisable.",
  avatar_url: "",
  name_color: "#7df9ff",
  name_size: 78,
  theme: "aqua",
  video_url: "",
  image_url: "",
  music_url: "",
  overlay: 0.52,
  blur: false,
  links: [],
};

let session = null;
let currentProfile = null;
let draftLinks = [];
let pendingAvatarObjectUrl = "";

const elements = {
  video: document.querySelector("#backgroundVideo"),
  image: document.querySelector("#backgroundImage"),
  overlay: document.querySelector("#readabilityOverlay"),
  statusPill: document.querySelector("#statusPill"),
  windowTitle: document.querySelector("#windowTitle"),
  avatarInitial: document.querySelector("#avatarInitial"),
  avatarImage: document.querySelector("#avatarImage"),
  avatarFallback: document.querySelector("#avatarFallback"),
  displayName: document.querySelector("#displayName"),
  displayBio: document.querySelector("#displayBio"),
  linksPreview: document.querySelector("#linksPreview"),
  audio: document.querySelector("#audioPlayer"),
  playPauseBtn: document.querySelector("#playPauseBtn"),
  playPauseIcon: document.querySelector("#playPauseIcon"),
  trackLabel: document.querySelector("#trackLabel"),
  volumeControl: document.querySelector("#volumeControl"),
  copyProfileBtn: document.querySelector("#copyProfileBtn"),
  topCopyBtn: document.querySelector("#topCopyBtn"),
  publicTopBar: document.querySelector("#publicTopBar"),
  accountPanel: document.querySelector("#accountPanel"),
  loginBox: document.querySelector("#loginBox"),
  loginForm: document.querySelector("#loginForm"),
  signupForm: document.querySelector("#signupForm"),
  showLogin: document.querySelector("#showLogin"),
  showSignup: document.querySelector("#showSignup"),
  authMessage: document.querySelector("#authMessage"),
  profileForm: document.querySelector("#profileForm"),
  logoutBtn: document.querySelector("#logoutBtn"),
  panelKicker: document.querySelector("#panelKicker"),
  panelTitle: document.querySelector("#panelTitle"),
  usernameInput: document.querySelector("#usernameInput"),
  displayNameInput: document.querySelector("#displayNameInput"),
  bioInput: document.querySelector("#bioInput"),
  avatarUrlInput: document.querySelector("#avatarUrlInput"),
  avatarFileInput: document.querySelector("#avatarFileInput"),
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
    if (isDashboardPath) {
      await maybeLoadEditor();
    }
    return;
  }

  if (!isDashboardPath) {
    window.location.replace("/profil/");
    return;
  }

  await loadDashboard();
}

function bindEvents() {
  elements.playPauseBtn.addEventListener("click", toggleAudio);
  elements.copyProfileBtn.addEventListener("click", copyProfileLink);
  elements.topCopyBtn.addEventListener("click", copyProfileLink);
  elements.volumeControl.addEventListener("input", (event) => {
    elements.audio.volume = Number(event.target.value);
    localStorage.setItem(VOLUME_STORAGE_KEY, event.target.value);
  });
  elements.showLogin.addEventListener("click", () => setAuthMode("login"));
  elements.showSignup.addEventListener("click", () => setAuthMode("signup"));
  elements.loginForm.addEventListener("submit", login);
  elements.signupForm.addEventListener("submit", signup);
  elements.audio.addEventListener("play", () => {
    elements.playPauseIcon.textContent = "II";
  });
  elements.audio.addEventListener("pause", () => {
    elements.playPauseIcon.textContent = "▶";
  });

  elements.logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/profil/";
  });

  elements.profileForm.addEventListener("submit", saveProfile);
  elements.addLinkBtn.addEventListener("click", addLink);
  elements.linkTitleInput.addEventListener("keydown", submitLinkWithEnter);
  elements.linkUrlInput.addEventListener("keydown", submitLinkWithEnter);
  elements.refreshAdminBtn.addEventListener("click", loadAdminPanel);

  elements.profileForm.querySelectorAll("input, textarea").forEach((input) => {
    if (input === elements.linkTitleInput || input === elements.linkUrlInput) return;
    if (input === elements.avatarFileInput) return;
    input.addEventListener("input", previewDraft);
    input.addEventListener("change", previewDraft);
  });

  elements.avatarFileInput.addEventListener("change", () => {
    const file = elements.avatarFileInput.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (pendingAvatarObjectUrl) {
      URL.revokeObjectURL(pendingAvatarObjectUrl);
    }
    pendingAvatarObjectUrl = URL.createObjectURL(file);
    renderAvatar(pendingAvatarObjectUrl, elements.displayNameInput.value || elements.usernameInput.value);
  });

  elements.themePresetBtns.forEach((button) => {
    button.addEventListener("click", () => applyThemePreset(button.dataset.theme));
  });
}

async function login(event) {
  event.preventDefault();
  setAuthMessage("Connexion...");

  const email = document.querySelector("#loginEmail").value.trim();
  const password = document.querySelector("#loginPassword").value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }

  session = data.session;
  window.history.replaceState(null, "", "/profil/");
  await loadDashboard();
}

async function signup(event) {
  event.preventDefault();
  setAuthMessage("Creation du compte...");

  const username = normalizeUsername(document.querySelector("#signupUsername").value);
  const email = document.querySelector("#signupEmail").value.trim();
  const password = document.querySelector("#signupPassword").value;

  if (!username) {
    setAuthMessage("Choisis un pseudo avec lettres, chiffres, _ ou -.", "error");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }

  if (data.session) {
    session = data.session;
    await createProfileIfNeeded(data.user.id, username);
    window.history.replaceState(null, "", "/profil/");
    await loadDashboard();
    return;
  }

  setAuthMessage("Compte cree. Confirme ton email si Supabase te le demande, puis connecte-toi.", "success");
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  elements.loginForm.classList.toggle("hidden", !isLogin);
  elements.signupForm.classList.toggle("hidden", isLogin);
  elements.showLogin.classList.toggle("active", isLogin);
  elements.showSignup.classList.toggle("active", !isLogin);
  setAuthMessage("");
}

async function createProfileIfNeeded(userId, username) {
  await supabase.from("profiles").upsert(
    {
      id: userId,
      username,
      display_name: username,
      bio: "Nouveau profil k4mlz.",
      avatar_url: "",
      image_url: "",
      theme: "aqua",
      links: [],
    },
    { onConflict: "id" },
  );
}

async function loadDashboard() {
  setPublicMode(false);

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
  setPublicMode(true);

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
  document.title = `${data.display_name || data.username} | k4mlz`;
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

  elements.statusPill.textContent = username ? "profil public" : "k4mlz profile";
  elements.statusPill.dataset.username = username;
  elements.windowTitle.textContent = username ? "k4mlz://profile" : "k4mlz://preview";
  renderAvatar(safeProfile.avatar_url, displayName);
  elements.displayName.textContent = displayName;
  elements.displayBio.textContent = safeProfile.bio || "Aucune bio pour le moment.";
  elements.displayName.style.color = safeProfile.name_color;
  document.documentElement.style.setProperty("--accent", safeProfile.name_color);
  document.documentElement.style.setProperty("--name-size", `${safeProfile.name_size}px`);

  elements.overlay.style.background = `rgba(2, 4, 12, ${safeProfile.overlay})`;
  elements.overlay.style.backdropFilter = safeProfile.blur ? "blur(8px)" : "blur(0)";
  const backgroundImage = sanitizeLocalBackground(safeProfile.image_url);
  document.body.dataset.theme = safeProfile.theme || "aqua";
  elements.image.style.backgroundImage = backgroundImage
    ? `linear-gradient(135deg, rgba(7, 10, 22, 0.1), rgba(7, 10, 22, 0.48)), url("${cssUrl(backgroundImage)}")`
    : "";

  setVideo(safeProfile.video_url);
  setAudio(safeProfile.music_url);
  renderPreviewLinks(Array.isArray(safeProfile.links) ? safeProfile.links : []);
}

function renderAvatar(avatarUrl, displayName) {
  const cleanUrl = avatarUrl?.trim();
  elements.avatarFallback.textContent = getInitials(displayName);
  elements.avatarImage.classList.toggle("visible", Boolean(cleanUrl));
  elements.avatarFallback.classList.toggle("hidden", Boolean(cleanUrl));

  if (cleanUrl) {
    elements.avatarImage.src = cleanUrl;
  } else {
    elements.avatarImage.removeAttribute("src");
  }
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
  elements.avatarUrlInput.value = safeProfile.avatar_url;
  elements.nameColorInput.value = safeProfile.name_color;
  elements.nameSizeInput.value = safeProfile.name_size;
  elements.videoUrlInput.value = safeProfile.video_url;
  elements.imageUrlInput.value = sanitizeLocalBackground(safeProfile.image_url);
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
    avatar_url: elements.avatarUrlInput.value.trim() || pendingAvatarObjectUrl || currentProfile?.avatar_url || "",
    name_color: elements.nameColorInput.value,
    name_size: Number(elements.nameSizeInput.value),
    theme: document.body.dataset.theme || "aqua",
    video_url: elements.videoUrlInput.value.trim(),
    image_url: sanitizeLocalBackground(elements.imageUrlInput.value.trim()),
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
    aurora: { color: "#8cf7b5", overlay: 0.48, blur: true },
    velvet: { color: "#c7a4ff", overlay: 0.64, blur: true },
    ghost: { color: "#dfe8f8", overlay: 0.72, blur: true },
    solar: { color: "#ffd166", overlay: 0.46, blur: false },
  };
  const selected = themes[theme] || themes.aqua;

  elements.nameColorInput.value = selected.color;
  elements.overlayInput.value = selected.overlay;
  elements.blurInput.checked = selected.blur;
  elements.imageUrlInput.value = "";
  document.body.dataset.theme = theme;
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

  const avatarUrl = await getAvatarUrlForSave();
  if (avatarUrl === null) return;

  const payload = {
    id: session.user.id,
    username: normalizeUsername(elements.usernameInput.value),
    display_name: elements.displayNameInput.value.trim() || elements.usernameInput.value.trim(),
    bio: elements.bioInput.value.trim(),
    avatar_url: avatarUrl,
    name_color: elements.nameColorInput.value,
    name_size: Number(elements.nameSizeInput.value),
    theme: document.body.dataset.theme || "aqua",
    video_url: elements.videoUrlInput.value.trim(),
    image_url: sanitizeLocalBackground(elements.imageUrlInput.value.trim()),
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
  elements.avatarFileInput.value = "";
  if (pendingAvatarObjectUrl) {
    URL.revokeObjectURL(pendingAvatarObjectUrl);
    pendingAvatarObjectUrl = "";
  }
  renderProfile(currentProfile);
  renderEditor(currentProfile);
  setMessage(`Sauvegarde OK. Ton lien : /k4mlz/${currentProfile.username}`, "success");
}

async function getAvatarUrlForSave() {
  const file = elements.avatarFileInput.files?.[0];
  if (!file) return elements.avatarUrlInput.value.trim();

  if (!file.type.startsWith("image/")) {
    setMessage("La photo doit etre une image.", "error");
    return null;
  }

  if (file.size > 5 * 1024 * 1024) {
    setMessage("La photo doit faire moins de 5 Mo.", "error");
    return null;
  }

  setMessage("Upload de la photo...");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "jpg";
  const path = `${session.user.id}/avatar-${Date.now()}.${safeExtension}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    setMessage("Upload impossible. Lance le fichier supabase-profile-upgrade.sql dans Supabase.", "error");
    return null;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  elements.avatarUrlInput.value = data.publicUrl;
  return data.publicUrl;
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
  elements.topCopyBtn.textContent = "Copie";
  window.setTimeout(() => {
    elements.copyProfileBtn.textContent = "Copier le lien";
    elements.topCopyBtn.textContent = "Copier";
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

  const savedVolume = Number(localStorage.getItem(VOLUME_STORAGE_KEY) || "0.65");
  elements.audio.volume = Number.isFinite(savedVolume) ? savedVolume : 0.65;
  elements.volumeControl.value = elements.audio.volume;
  elements.trackLabel.textContent = src ? "Musique du profil" : "Aucune musique";
}

function setPublicMode(isPublic) {
  document.body.classList.toggle("public-view", isPublic);
  elements.publicTopBar.classList.toggle("hidden", !isPublic);
  elements.accountPanel.classList.toggle("hidden", isPublic);
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

function sanitizeLocalBackground(url) {
  const clean = url.trim();
  if (/^\.\.\/\d+\.jpg$/i.test(clean)) return "";
  return clean;
}

function cssUrl(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function setMessage(text, type = "") {
  elements.saveMessage.textContent = text;
  elements.saveMessage.className = `message ${type}`.trim();
}

function setAuthMessage(text, type = "") {
  elements.authMessage.textContent = text;
  elements.authMessage.className = `message ${type}`.trim();
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
