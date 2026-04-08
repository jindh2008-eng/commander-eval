import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const ADMIN_EMAILS = [
  "jindh2008@gmail.com",
  "isail78@naver.com"
];

const authGate = document.getElementById("auth-gate");
const adminApp = document.getElementById("admin-app");
const loginBtn = document.getElementById("admin-login-btn");
const logoutBtn = document.getElementById("admin-logout-btn");
const authMessage = document.getElementById("auth-message");
const adminUserEmail = document.getElementById("admin-user-email");

function setMessage(message) {
  if (authMessage) {
    authMessage.textContent = message || "";
  }
}

function setAuthorizedUI(user) {
  if (authGate) authGate.style.display = "none";
  if (adminApp) adminApp.style.display = "block";
  if (adminUserEmail) adminUserEmail.textContent = user?.email || "";
  window.currentAdminUser = user;
}

function setBlockedUI(message = "") {
  if (authGate) authGate.style.display = "flex";
  if (adminApp) adminApp.style.display = "none";
  if (adminUserEmail) adminUserEmail.textContent = "";
  window.currentAdminUser = null;
  setMessage(message);
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || "").toLowerCase());
}

async function handleLogin() {
  try {
    setMessage("로그인 창을 여는 중입니다.");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Admin login error:", error);
    setMessage("로그인 중 오류가 발생했습니다.");
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Admin logout error:", error);
    setMessage("로그아웃 중 오류가 발생했습니다.");
  }
}

if (loginBtn) {
  loginBtn.addEventListener("click", handleLogin);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", handleLogout);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setBlockedUI("허용된 관리자 계정으로 로그인해 주세요.");
    return;
  }

  const email = String(user.email || "").toLowerCase();

  if (!isAdminEmail(email)) {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Unauthorized account sign-out error:", error);
    }
    setBlockedUI("이 계정은 관리자 접근 권한이 없습니다.");
    return;
  }

  setAuthorizedUI(user);

  if (typeof window.startAdminApp === "function") {
    await window.startAdminApp();
  }
});
