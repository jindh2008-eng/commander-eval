import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* 반드시 본인 관리자 이메일로 수정 */
const ADMIN_EMAILS = [
  "youradmin@gmail.com"
];

const authStatusTextEl = document.getElementById("authStatusText");
const loginBtnEl = document.getElementById("loginBtn");
const logoutBtnEl = document.getElementById("logoutBtn");
const adminLayoutEl = document.getElementById("adminLayout");
const accessDeniedBoxEl = document.getElementById("accessDeniedBox");

const totalCountEl = document.getElementById("totalCount");
const basicCountEl = document.getElementById("basicCount");
const intermediateCountEl = document.getElementById("intermediateCount");
const averageScoreEl = document.getElementById("averageScore");

const levelFilterEl = document.getElementById("levelFilter");
const sortFilterEl = document.getElementById("sortFilter");
const searchInputEl = document.getElementById("searchInput");
const refreshBtnEl = document.getElementById("refreshBtn");
const downloadCsvBtnEl = document.getElementById("downloadCsvBtn");

const tokenLevelEl = document.getElementById("tokenLevel");
const tokenCountEl = document.getElementById("tokenCount");
const generateTokensBtnEl = document.getElementById("generateTokensBtn");
const refreshTokensBtnEl = document.getElementById("refreshTokensBtn");
const copyAllLinksBtnEl = document.getElementById("copyAllLinksBtn");
const tokenStatusTextEl = document.getElementById("tokenStatusText");
const tokenCountTextEl = document.getElementById("tokenCountText");
const tokenTableBodyEl = document.getElementById("tokenTableBody");

const gradeRatioTableBodyEl = document.getElementById("gradeRatioTableBody");
const deleteTableBodyEl = document.getElementById("deleteTableBody");
const deleteStatusTextEl = document.getElementById("deleteStatusText");
const deleteCountTextEl = document.getElementById("deleteCountText");
const detailListPanelEl = document.getElementById("detailListPanel");
const detailContainerEl = document.getElementById("detailContainer");

let allEvaluations = [];
let filteredEvaluations = [];
let allTokens = [];
let selectedEvaluationId = null;
let gradeDistributionChart = null;
let hasInitialized = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleString("ko-KR");
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("ko-KR");
  } catch {
    return "-";
  }
}

function levelLabel(level, levelTitle) {
  if (levelTitle) return levelTitle;
  if (level === "basic") return "초급";
  if (level === "intermediate") return "중급";
  return level || "-";
}

function getBaseAppUrl() {
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/admin\.html$/i, "index.html");
  return `${url.origin}${path}`;
}

function buildTokenLink(token) {
  return `${getBaseAppUrl()}?token=${encodeURIComponent(token)}`;
}

function isAdminUser(user) {
  return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

function setLoggedOutView() {
  adminLayoutEl.style.display = "none";
  accessDeniedBoxEl.style.display = "none";
  loginBtnEl.style.display = "inline-block";
  logoutBtnEl.style.display = "none";
  authStatusTextEl.textContent = "관리자 로그인이 필요합니다.";
}

function setDeniedView(user) {
  adminLayoutEl.style.display = "none";
  accessDeniedBoxEl.style.display = "block";
  loginBtnEl.style.display = "none";
  logoutBtnEl.style.display = "inline-block";
  authStatusTextEl.textContent = `접속 계정: ${user.email}`;
}

function setAdminView(user) {
  adminLayoutEl.style.display = "grid";
  accessDeniedBoxEl.style.display = "none";
  loginBtnEl.style.display = "none";
  logoutBtnEl.style.display = "inline-block";
  authStatusTextEl.textContent = `관리자 로그인: ${user.email}`;
}

function calculateSummary(data) {
  const totalCount = data.length;
  const basicCount = data.filter((item) => item.level === "basic").length;
  const intermediateCount = data.filter((item) => item.level === "intermediate").length;
  const totalScoreSum = data.reduce((sum, item) => sum + Number(item.totalScore || 0), 0);
  const averageScore = totalCount > 0 ? (totalScoreSum / totalCount).toFixed(1) : "0";

  totalCountEl.textContent = totalCount;
  basicCountEl.textContent = basicCount;
  intermediateCountEl.textContent = intermediateCount;
  averageScoreEl.textContent = averageScore;
}

function scoreToGradeLabel(item) {
  if (item.selectedGradeLabel) return item.selectedGradeLabel;
  if (item.selectedGrade === "high") return "상";
  if (item.selectedGrade === "mid") return "중";
  return "하";
}

function aggregateGradeDistribution(data) {
  const aggregated = {};

  data.forEach((docItem) => {
    const itemResults = Array.isArray(docItem.itemResults) ? docItem.itemResults : [];
    itemResults.forEach((item) => {
      const key = `${item.category}|||${item.behavior}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          category: item.category || "",
          behavior: item.behavior || "",
          high: 0,
          mid: 0,
          low: 0,
          total: 0
        };
      }

      const grade = scoreToGradeLabel(item);

      if (grade === "상") aggregated[key].high += 1;
      else if (grade === "중") aggregated[key].mid += 1;
      else aggregated[key].low += 1;

      aggregated[key].total += 1;
    });
  });

  return Object.values(aggregated);
}

function renderGradeRatioTable(rows) {
  if (!rows.length) {
    gradeRatioTableBodyEl.innerHTML = `
      <tr>
        <td colspan="10" class="empty">표시할 집계 데이터가 없습니다.</td>
      </tr>
    `;
    return;
  }

  gradeRatioTableBodyEl.innerHTML = rows.map((row) => {
    const highRatio = row.total ? ((row.high / row.total) * 100).toFixed(1) : "0.0";
    const midRatio = row.total ? ((row.mid / row.total) * 100).toFixed(1) : "0.0";
    const lowRatio = row.total ? ((row.low / row.total) * 100).toFixed(1) : "0.0";

    let dominant = "상";
    let dominantClass = "badge-high";
    let dominantCount = row.high;

    if (row.mid > dominantCount) {
      dominant = "중";
      dominantClass = "badge-mid";
      dominantCount = row.mid;
    }

    if (row.low > dominantCount) {
      dominant = "하";
      dominantClass = "badge-low";
    }

    return `
      <tr>
        <td>${escapeHtml(row.category)}</td>
        <td class="text-left">${escapeHtml(row.behavior)}</td>
        <td>${row.total}</td>
        <td>${row.high}</td>
        <td>${row.mid}</td>
        <td>${row.low}</td>
        <td>${highRatio}%</td>
        <td>${midRatio}%</td>
        <td>${lowRatio}%</td>
        <td><span class="badge ${dominantClass}">${dominant}</span></td>
      </tr>
    `;
  }).join("");
}

function renderGradeDistributionChart(rows) {
  const canvas = document.getElementById("gradeDistributionChart");

  if (gradeDistributionChart) {
    gradeDistributionChart.destroy();
    gradeDistributionChart = null;
  }

  if (!rows.length) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const labels = rows.map((row) => `${row.category} - ${row.behavior}`);
  const highData = rows.map((row) => row.high);
  const midData = rows.map((row) => row.mid);
  const lowData = rows.map((row) => row.low);

  gradeDistributionChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "상", data: highData, backgroundColor: "#2e7d32" },
        { label: "중", data: midData, backgroundColor: "#ef6c00" },
        { label: "하", data: lowData, backgroundColor: "#c62828" }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0 },
          title: { display: true, text: "평정 개수" }
        },
        y: { stacked: true }
      },
      plugins: {
        legend: { position: "top" }
      }
    }
  });
}

function renderDeleteTable(data) {
  deleteCountTextEl.textContent = `표시 건수: ${data.length}`;

  if (!data.length) {
    deleteTableBodyEl.innerHTML = `
      <tr>
        <td colspan="6" class="empty">조건에 맞는 데이터가 없습니다.</td>
      </tr>
    `;
    return;
  }

  deleteTableBodyEl.innerHTML = data.map((item) => {
    return `
      <tr>
        <td>${formatDateTime(item.submittedAt || item.createdAt)}</td>
        <td>${escapeHtml(levelLabel(item.level, item.levelTitle))}</td>
        <td>${escapeHtml(item.token || item.submissionId || "-")}</td>
        <td>${escapeHtml(item.totalScore)}</td>
        <td class="text-left">${escapeHtml(item.comment || "-")}</td>
        <td>
          <button class="small danger delete-eval-btn" data-id="${escapeHtml(item.id)}" data-token="${escapeHtml(item.token || item.id)}">
            삭제
          </button>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll(".delete-eval-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteEvaluation(btn.dataset.id, btn.dataset.token);
    });
  });
}

function renderDetailList(data) {
  if (!data.length) {
    detailListPanelEl.innerHTML = `<div class="empty">조건에 맞는 제출 데이터가 없습니다.</div>`;
    detailContainerEl.innerHTML = `<div class="empty">표시할 상세 내용이 없습니다.</div>`;
    return;
  }

  if (!selectedEvaluationId || !data.some((item) => item.id === selectedEvaluationId)) {
    selectedEvaluationId = data[0].id;
  }

  detailListPanelEl.innerHTML = data.map((item) => `
    <div class="record-item ${item.id === selectedEvaluationId ? "active" : ""}" data-id="${escapeHtml(item.id)}">
      <div class="record-title">${escapeHtml(item.token || item.submissionId || "-")}</div>
      <div class="record-sub">
        ${escapeHtml(levelLabel(item.level, item.levelTitle))}<br>
        제출: ${escapeHtml(formatDateTime(item.submittedAt || item.createdAt))}<br>
        총점: ${escapeHtml(item.totalScore)} / ${escapeHtml(item.totalPossible || "-")}
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".record-item").forEach((el) => {
    el.addEventListener("click", () => {
      selectedEvaluationId = el.dataset.id;
      renderDetailList(data);
      const selectedItem = data.find((item) => item.id === selectedEvaluationId);
      renderDetail(selectedItem);
    });
  });

  const selectedItem = data.find((item) => item.id === selectedEvaluationId);
  renderDetail(selectedItem);
}

function renderDetail(item) {
  if (!item) {
    detailContainerEl.innerHTML = `<div class="empty">선택된 데이터가 없습니다.</div>`;
    return;
  }

  const itemResults = Array.isArray(item.itemResults) ? item.itemResults : [];

  const detailRows = itemResults.length
    ? itemResults.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.category)}</td>
        <td class="text-left">${escapeHtml(row.behavior)}</td>
        <td>${escapeHtml(row.maxScore)}</td>
        <td>${escapeHtml(row.selectedGradeLabel || row.selectedGrade || "-")}</td>
        <td>${escapeHtml(row.selectedScore)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" class="empty">세부 점수 데이터가 없습니다.</td></tr>`;

  detailContainerEl.innerHTML = `
    <div class="detail-meta">
      <div class="meta-item">
        <div class="meta-label">과정</div>
        <div class="meta-value">${escapeHtml(levelLabel(item.level, item.levelTitle))}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">토큰</div>
        <div class="meta-value">${escapeHtml(item.token || item.submissionId || "-")}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">총점</div>
        <div class="meta-value">${escapeHtml(item.totalScore)} / ${escapeHtml(item.totalPossible || "-")}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">제출시각</div>
        <div class="meta-value">${escapeHtml(formatDateTime(item.submittedAt || item.createdAt))}</div>
      </div>
    </div>

    <div class="table-wrap" style="margin-bottom: 16px;">
      <table>
        <thead>
          <tr>
            <th style="width: 70px;">번호</th>
            <th style="width: 140px;">평가항목</th>
            <th>행동지표</th>
            <th style="width: 100px;">배점</th>
            <th style="width: 100px;">평정</th>
            <th style="width: 110px;">선택점수</th>
          </tr>
        </thead>
        <tbody>${detailRows}</tbody>
      </table>
    </div>

    <div>
      <div style="font-weight: 700; margin-bottom: 8px;">비고 / 메모</div>
      <div class="comment-area">${escapeHtml(item.comment || "-")}</div>
    </div>
  `;
}

function updateAnalysis(data) {
  const rows = aggregateGradeDistribution(data);
  rows.sort((a, b) => {
    if (a.category === b.category) {
      return a.behavior.localeCompare(b.behavior, "ko");
    }
    return a.category.localeCompare(b.category, "ko");
  });

  renderGradeDistributionChart(rows);
  renderGradeRatioTable(rows);
}

function applyFilters() {
  const levelFilter = levelFilterEl.value;
  const sortFilter = sortFilterEl.value;
  const keyword = searchInputEl.value.trim().toLowerCase();

  let result = [...allEvaluations];

  if (levelFilter !== "all") {
    result = result.filter((item) => item.level === levelFilter);
  }

  if (keyword) {
    result = result.filter((item) => {
      const text = [
        item.token,
        item.submissionId,
        item.levelTitle,
        item.comment
      ].join(" ").toLowerCase();
      return text.includes(keyword);
    });
  }

  if (sortFilter === "latest") {
    result.sort((a, b) => (b.submittedAt?.seconds || b.createdAt?.seconds || 0) - (a.submittedAt?.seconds || a.createdAt?.seconds || 0));
  } else if (sortFilter === "oldest") {
    result.sort((a, b) => (a.submittedAt?.seconds || a.createdAt?.seconds || 0) - (b.submittedAt?.seconds || b.createdAt?.seconds || 0));
  } else if (sortFilter === "scoreDesc") {
    result.sort((a, b) => Number(b.totalScore || 0) - Number(a.totalScore || 0));
  } else if (sortFilter === "scoreAsc") {
    result.sort((a, b) => Number(a.totalScore || 0) - Number(b.totalScore || 0));
  }

  filteredEvaluations = result;

  updateAnalysis(filteredEvaluations);
  renderDeleteTable(filteredEvaluations);
  renderDetailList(filteredEvaluations);

  deleteStatusTextEl.textContent = `총 ${filteredEvaluations.length}건 표시 중`;
}

async function loadEvaluations() {
  try {
    const q = query(collection(db, "evaluations"), orderBy("submittedAt", "desc"));
    const snapshot = await getDocs(q);

    allEvaluations = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    calculateSummary(allEvaluations);
    applyFilters();
  } catch (error) {
    console.error(error);
    deleteStatusTextEl.textContent = "제출 데이터 조회 중 오류가 발생했습니다.";
    deleteTableBodyEl.innerHTML = `<tr><td colspan="6" class="empty">데이터 조회 중 오류가 발생했습니다.</td></tr>`;
    detailListPanelEl.innerHTML = `<div class="empty">데이터 조회 중 오류가 발생했습니다.</div>`;
    gradeRatioTableBodyEl.innerHTML = `<tr><td colspan="10" class="empty">분석 데이터를 표시할 수 없습니다.</td></tr>`;
  }
}

function renderTokenTable(tokens) {
  tokenCountTextEl.textContent = `토큰 수: ${tokens.length}`;

  if (!tokens.length) {
    tokenTableBodyEl.innerHTML = `<tr><td colspan="7" class="empty">토큰이 없습니다.</td></tr>`;
    return;
  }

  tokenTableBodyEl.innerHTML = tokens.map((item) => {
    const link = buildTokenLink(item.id);
    return `
      <tr>
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(levelLabel(item.allowedLevel))}</td>
        <td>
          <span class="badge ${item.isUsed ? "badge-used" : "badge-unused"}">
            ${item.isUsed ? "사용됨" : "미사용"}
          </span>
        </td>
        <td>${formatDateTime(item.usedAt)}</td>
        <td class="text-left"><div class="token-link-box">${escapeHtml(link)}</div></td>
        <td><button class="small copy-token-link-btn" data-link="${escapeHtml(link)}">복사</button></td>
        <td><button class="small danger delete-token-btn" data-id="${escapeHtml(item.id)}">삭제</button></td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll(".copy-token-link-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(btn.dataset.link);
      alert("링크를 복사했습니다.");
    });
  });

  document.querySelectorAll(".delete-token-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteToken(btn.dataset.id);
    });
  });
}

async function loadTokens() {
  tokenStatusTextEl.textContent = "토큰 목록을 불러오는 중입니다...";

  try {
    const snapshot = await getDocs(collection(db, "inviteTokens"));
    allTokens = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    allTokens.sort((a, b) => a.id.localeCompare(b.id, "ko"));
    renderTokenTable(allTokens);
    tokenStatusTextEl.textContent = `총 ${allTokens.length}개의 토큰을 불러왔습니다.`;
  } catch (error) {
    console.error(error);
    tokenStatusTextEl.textContent = "토큰을 불러오지 못했습니다.";
    tokenTableBodyEl.innerHTML = `<tr><td colspan="7" class="empty">토큰 조회 중 오류가 발생했습니다.</td></tr>`;
  }
}

function createTokenId(level, seq) {
  const prefix = level === "basic" ? "basic" : "intermediate";
  return `${prefix}_${String(seq).padStart(3, "0")}`;
}

async function getNextSequence(level) {
  const prefix = level === "basic" ? "basic_" : "intermediate_";
  const tokens = allTokens.filter((item) => item.id.startsWith(prefix));

  let maxSeq = 0;
  tokens.forEach((item) => {
    const match = item.id.match(/_(\d+)$/);
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  });

  return maxSeq + 1;
}

async function generateTokens() {
  const level = tokenLevelEl.value;
  const count = Number(tokenCountEl.value);

  if (!count || count < 1) {
    alert("생성 개수를 1 이상 입력하세요.");
    return;
  }

  generateTokensBtnEl.disabled = true;
  generateTokensBtnEl.textContent = "생성 중...";

  try {
    let nextSeq = await getNextSequence(level);

    for (let i = 0; i < count; i++) {
      const tokenId = createTokenId(level, nextSeq + i);
      await setDoc(doc(db, "inviteTokens", tokenId), {
        token: tokenId,
        allowedLevel: level,
        isUsed: false,
        createdAt: new Date()
      });
    }

    await loadTokens();
    alert(`${count}개의 토큰을 생성했습니다.`);
  } catch (error) {
    console.error(error);
    alert("토큰 생성 중 오류가 발생했습니다.");
  } finally {
    generateTokensBtnEl.disabled = false;
    generateTokensBtnEl.textContent = "토큰 생성";
  }
}

async function copyAllLinks() {
  if (!allTokens.length) {
    alert("복사할 토큰이 없습니다.");
    return;
  }

  const text = allTokens
    .map((item) => `${item.id}\t${buildTokenLink(item.id)}`)
    .join("\n");

  await navigator.clipboard.writeText(text);
  alert("전체 링크를 복사했습니다.");
}

async function deleteToken(tokenId) {
  const ok = confirm(`토큰 ${tokenId} 를 삭제할까요?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "inviteTokens", tokenId));
    await loadTokens();
    alert("토큰을 삭제했습니다.");
  } catch (error) {
    console.error(error);
    alert("토큰 삭제 중 오류가 발생했습니다.");
  }
}

async function deleteEvaluation(evalId, token) {
  const ok = confirm(`제출 데이터 ${evalId} 를 삭제할까요?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "evaluations", evalId));

    const tokenRef = doc(db, "inviteTokens", token);
    const tokenSnap = await getDoc(tokenRef);

    if (tokenSnap.exists()) {
      await updateDoc(tokenRef, {
        isUsed: false,
        usedAt: null
      });
    }

    await loadEvaluations();
    await loadTokens();
    alert("제출 데이터를 삭제했습니다. 연결된 토큰은 다시 미사용 상태로 되돌렸습니다.");
  } catch (error) {
    console.error(error);
    alert("제출 데이터 삭제 중 오류가 발생했습니다.");
  }
}

function convertToCsvRows(data) {
  const headers = ["제출시각", "과정", "토큰", "총점", "비고"];
  const rows = data.map((item) => [
    formatDateTime(item.submittedAt || item.createdAt),
    levelLabel(item.level, item.levelTitle),
    item.token || item.submissionId || "",
    item.totalScore ?? "",
    item.comment || ""
  ]);
  return [headers, ...rows];
}

function rowsToCsv(rows) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function downloadCsv() {
  if (!filteredEvaluations.length) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const rows = convertToCsvRows(filteredEvaluations);
  const csv = rowsToCsv(rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `evaluations_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function setupSidebarMenu() {
  const menuButtons = document.querySelectorAll(".menu-btn[data-page]");
  const pages = document.querySelectorAll(".page");

  menuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      menuButtons.forEach((b) => b.classList.remove("active"));
      pages.forEach((page) => page.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(btn.dataset.page).classList.add("active");
    });
  });
}

function bindStaticEvents() {
  levelFilterEl.addEventListener("change", applyFilters);
  sortFilterEl.addEventListener("change", applyFilters);
  searchInputEl.addEventListener("input", applyFilters);
  refreshBtnEl.addEventListener("click", loadEvaluations);
  downloadCsvBtnEl.addEventListener("click", downloadCsv);

  generateTokensBtnEl.addEventListener("click", generateTokens);
  refreshTokensBtnEl.addEventListener("click", loadTokens);
  copyAllLinksBtnEl.addEventListener("click", copyAllLinks);

  setupSidebarMenu();
}

async function initializeAdminPage() {
  if (!hasInitialized) {
    bindStaticEvents();
    hasInitialized = true;
  }

  await loadEvaluations();
  await loadTokens();
}

loginBtnEl.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    alert("로그인 중 오류가 발생했습니다.");
  }
});

logoutBtnEl.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    alert("로그아웃 중 오류가 발생했습니다.");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setLoggedOutView();
    return;
  }

  if (!isAdminUser(user)) {
    setDeniedView(user);
    return;
  }

  setAdminView(user);
  await initializeAdminPage();
});
