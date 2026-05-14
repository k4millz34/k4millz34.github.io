import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const title = document.querySelector("#site-title");
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const showLogin = document.querySelector("#showLogin");
const showSignup = document.querySelector("#showSignup");
const message = document.querySelector("#authMessage");

initHome();

function initHome() {
  bindTitleTilt();
  bindTabs();
  bindAuth();
}

function bindTitleTilt() {
  if (!title) return;

  title.addEventListener("pointermove", (event) => {
    const rect = title.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
    title.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${y}deg)`;
  });

  title.addEventListener("pointerleave", () => {
    title.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
  });
}

function bindTabs() {
  showLogin.addEventListener("click", () => setAuthMode("login"));
  showSignup.addEventListener("click", () => setAuthMode("signup"));
}

function bindAuth() {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("Connexion en cours...");

    const email = document.querySelector("#loginEmail").value.trim();
    const password = document.querySelector("#loginPassword").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message, "error");
      return;
    }

    window.location.href = "/k4mlz/";
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("Creation du compte...");

    const username = normalizeUsername(document.querySelector("#signupUsername").value);
    const email = document.querySelector("#signupEmail").value.trim();
    const password = document.querySelector("#signupPassword").value;

    if (!username) {
      setMessage("Choisis un pseudo avec lettres, chiffres ou tirets.", "error");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      setMessage(error.message, "error");
      return;
    }

    if (data.session) {
      await createProfileIfNeeded(data.user.id, username);
      window.location.href = "/k4mlz/";
      return;
    }

    setMessage("Compte cree. Confirme ton email si Supabase te le demande, puis connecte-toi.", "success");
  });
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  loginForm.classList.toggle("hidden", !isLogin);
  signupForm.classList.toggle("hidden", isLogin);
  showLogin.classList.toggle("active", isLogin);
  showSignup.classList.toggle("active", !isLogin);
  setMessage("");
}

async function createProfileIfNeeded(userId, username) {
  await supabase.from("profiles").upsert(
    {
      id: userId,
      username,
      display_name: username,
      bio: "Nouveau profil k4mlz.",
      image_url: "../9.jpg",
      links: [],
    },
    { onConflict: "id" },
  );
}

function normalizeUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}
