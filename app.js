import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const scoreMap = {
  3: { high: 3, mid: 2, low: 1 },
  5: { high: 5, mid: 3, low: 1 },
  10: { high: 10, mid: 7, low: 4 }
};

const sheetData = {
  basic: {
    title: "초급 실기평가표",
    total: 100,
    items: [
      { category: "상황평가", behavior: "출동중 정보수집 및 임무공유", score: 3 },
      { category: "상황평가", behavior: "출동중 상황전파", score: 3 },
      { category: "상황평가", behavior: "최초 상황보고, 지휘형태 결정 및 지휘권 선언", score: 10 },
      { category: "상황평가", behavior: "인명정보 취득 및 전파", score: 5 },
      { category: "상황평가", behavior: "추가 소방력 판단", score: 3 },

      { category: "대응활동", behavior: "차량배치", score: 5 },
      { category: "대응활동", behavior: "표준대응활동", score: 5 },
      { category: "대응활동", behavior: "확대대 임무부여", score: 3 },
      { category: "대응활동", behavior: "위기대응 및 진행상황 관리", score: 5 },
      { category: "대응활동", behavior: "화재현장요소 파악 관리", score: 5 },
      { category: "대응활동", behavior: "단위지휘관 임무수행", score: 3 },

      { category: "화재전술", behavior: "소방용수", score: 5 },
      { category: "화재전술", behavior: "문개방 및 내부진입", score: 5 },
      { category: "화재전술", behavior: "수관전개 주수 및 관창배치", score: 5 },
      { category: "화재전술", behavior: "배연", score: 5 },

      { category: "의사교환", behavior: "무전교신 원칙", score: 5 },
      { category: "의사교환", behavior: "정보 전달력", score: 5 },
      { category: "의사교환", behavior: "지휘팀장 도착 후 상황보고", score: 5 },

      { category: "핵심목표", behavior: "인명구조 목표달성의 적절성", score: 10 },
      { category: "핵심목표", behavior: "출동대 안전관리", score: 5 }
    ]
  },

  intermediate: {
    title: "중급 실기평가표",
    total: 200,
    items: [
      { category: "상황평가", behavior: "출동중 정보수집 및 임무공유", score: 3 },
      { category: "상황평가", behavior: "선착대장 활동지원", score: 5 },
      { category: "상황평가", behavior: "지휘권 선언", score: 5 },
      { category: "상황평가", behavior: "최초 상황평가", score: 10 },
      { category: "상황평가", behavior: "중요정보 파악", score: 5 },

      { category: "지휘 의사결정", behavior: "선착대 대응활동 유효성 판단", score: 3 },
      { category: "지휘 의사결정", behavior: "현장 위험성 판단", score: 5 },
      { category: "지휘 의사결정", behavior: "핵심목표(대응 지침) 제시", score: 5 },
      { category: "지휘 의사결정", behavior: "1차 출동대 임무지시 및 조정", score: 10 },
      { category: "지휘 의사결정", behavior: "추가 자원 요청", score: 5 },
      { category: "지휘 의사결정", behavior: "차량배치 조정", score: 10 },

      { category: "대응활동", behavior: "소방활동구역 설정 및 통제", score: 5 },
      { category: "대응활동", behavior: "소방용수공급체계 구축", score: 5 },
      { category: "대응활동", behavior: "(단계별)소방력 배치 및 조정", score: 5 },
      { category: "대응활동", behavior: "현장통합 및 단위지휘관 운영", score: 5 },
      { category: "대응활동", behavior: "출동대 대기관리", score: 5 },
      { category: "대응활동", behavior: "대기장소 운영", score: 3 },
      { category: "대응활동", behavior: "전술상황판 기록", score: 5 },

      { category: "진행상황 관리", behavior: "진행상황 파악", score: 10 },
      { category: "진행상황 관리", behavior: "상황 미개선 및 악화시 대응조치", score: 5 },
      { category: "진행상황 관리", behavior: "우선순위보고 조치", score: 5 },
      { category: "진행상황 관리", behavior: "초진선언", score: 5 },
      { category: "진행상황 관리", behavior: "전술우선순위 관리", score: 5 },
      { category: "진행상황 관리", behavior: "완진절차 준수", score: 5 },

      { category: "의사교환", behavior: "대응초기 무전통제", score: 3 },
      { category: "의사교환", behavior: "무전망 분리운영", score: 3 },
      { category: "의사교환", behavior: "무전교신 원칙 준수", score: 5 },
      { category: "의사교환", behavior: "무전교신 불능 시 조치", score: 5 },
      { category: "의사교환", behavior: "효율적 의사교환", score: 10 },

      { category: "위기관리,리더십", behavior: "돌발 및 위기상황 대응", score: 5 },
      { category: "위기관리,리더십", behavior: "스트레스 관리", score: 5 },
      { category: "위기관리,리더십", behavior: "리더로서의 능숙한 작전 운영", score: 5 },
      { category: "위기관리,리더십", behavior: "인명구조 목표달성의 적절성", score: 10 },
      { category: "위기관리,리더십", behavior: "출동대 안전관리의 적절성", score: 10 },
      { category: "위기관리,리더십", behavior: "시민보호 및 피해최소화 작전의 적절성", score: 5 }
    ]
  }
};

let currentLevel = null;
let currentToken = null;
let tokenValidated = false;
let isSubmitting = false;
let viewMode = detectViewMode();
let collapsedCategories = new Set();

const sheetTitle = document.getElementById("sheetTitle");
const currentScoreEl = document.getElementById("currentScore");
const maxTotalScoreEl = document.getElementById("maxTotalScore");
const scoreTableEl = document.getElementById("scoreTable");
const commentEl = document.getElementById("comment");
const resetBtn = document.getElementById("resetBtn");
const submitBtn = document.getElementById("submitBtn");
const statusTextEl = document.getElementById("statusText");
const tokenInfoEl = document.getElementById("tokenInfo");
const topSummaryBar = document.getElementById("topSummaryBar");

function detectViewMode() {
  const isTouchDevice =
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  const isSmallScreen = window.innerWidth <= 1024;

  return (isTouchDevice || isSmallScreen) ? "app" : "web";
}

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

function setUiEnabled(enabled) {
  document.querySelectorAll(".item-grade").forEach((radio) => {
    radio.disabled = !enabled;
  });

  if (commentEl) commentEl.disabled = !enabled;
  if (resetBtn) resetBtn.disabled = !enabled;
  if (submitBtn) submitBtn.disabled = !enabled;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function gradeLabelToScore(maxScore, grade) {
  if (grade === "high") return scoreMap[maxScore].high;
  if (grade === "mid") return scoreMap[maxScore].mid;
  return scoreMap[maxScore].low;
}

function gradeLabelToKorean(grade) {
  if (grade === "high") return "상";
  if (grade === "mid") return "중";
  return "하";
}

function calculateCurrentScore() {
  let total = 0;

  document.querySelectorAll(".item-grade:checked").forEach((radio) => {
    total += gradeLabelToScore(Number(radio.dataset.score), radio.value);
  });

  currentScoreEl.textContent = total;
  return total;
}

function groupItemsByCategory(items) {
  const grouped = {};

  items.forEach((item, index) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ ...item, index });
  });

  return grouped;
}

function saveSelections() {
  const selections = {};

  document.querySelectorAll(".item-grade:checked").forEach((radio) => {
    selections[radio.name] = radio.value;
  });

  window.__savedSelections = selections;
}

function restoreSelections() {
  if (!window.__savedSelections) return;

  Object.entries(window.__savedSelections).forEach(([name, value]) => {
    const target = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (target) target.checked = true;
  });

  calculateCurrentScore();
}

function updateStickyOffset() {
  if (!topSummaryBar) return;

  const rect = topSummaryBar.getBoundingClientRect();
  const height = Math.ceil(rect.height);

  document.documentElement.style.setProperty("--top-summary-height", `${height}px`);
}

function renderTable(level) {
  const data = sheetData[level];

  sheetTitle.textContent = data.title;
  maxTotalScoreEl.textContent = data.total;
  currentScoreEl.textContent = "0";
  statusTextEl.textContent = "";

  const grouped = groupItemsByCategory(data.items);

  const html = `
    <div class="score-list">
      ${Object.entries(grouped).map(([category, items]) => {
        const isCollapsed = viewMode === "app" && collapsedCategories.has(category);

        return `
          <div class="group-card ${isCollapsed ? "collapsed" : ""}" data-category="${escapeHtml(category)}">
            <button
              type="button"
              class="group-header ${viewMode === "app" ? "app-collapsible" : ""}"
              data-category="${escapeHtml(category)}"
            >
              <span>${escapeHtml(category)}</span>
              <span class="group-arrow">${viewMode === "app" ? (isCollapsed ? "▸" : "▾") : ""}</span>
            </button>

            <div class="group-body">
              ${items.map((item) => `
                <div class="score-item">
                  <div class="score-item-head">
                    <div class="behavior-title">${escapeHtml(item.behavior)}</div>
                    <div class="score-meta">배점: ${item.score}점</div>
                  </div>

                  <div class="grade-buttons">
                    <label class="grade-option high">
                      <input
                        type="radio"
                        class="item-grade"
                        name="item_${item.index}"
                        value="high"
                        data-score="${item.score}"
                      />
                      <span class="grade-label">상</span>
                    </label>

                    <label class="grade-option mid">
                      <input
                        type="radio"
                        class="item-grade"
                        name="item_${item.index}"
                        value="mid"
                        data-score="${item.score}"
                      />
                      <span class="grade-label">중</span>
                    </label>

                    <label class="grade-option low">
                      <input
                        type="radio"
                        class="item-grade"
                        name="item_${item.index}"
                        value="low"
                        data-score="${item.score}"
                      />
                      <span class="grade-label">하</span>
                    </label>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  scoreTableEl.innerHTML = html;

  document.querySelectorAll(".item-grade").forEach((radio) => {
    radio.addEventListener("change", () => {
      calculateCurrentScore();
      updateStickyOffset();
    });
  });

  document.querySelectorAll(".group-header.app-collapsible").forEach((header) => {
    header.addEventListener("click", () => {
      const category = header.dataset.category;

      saveSelections();

      if (collapsedCategories.has(category)) {
        collapsedCategories.delete(category);
      } else {
        collapsedCategories.add(category);
      }

      renderTable(currentLevel);
      restoreSelections();
      setUiEnabled(tokenValidated);

      requestAnimationFrame(updateStickyOffset);
    });
  });

  requestAnimationFrame(updateStickyOffset);
}

function setViewMode(mode) {
  viewMode = mode;

  if (mode === "web") {
    collapsedCategories.clear();
  }

  saveSelections();
  renderTable(currentLevel);
  restoreSelections();
  setUiEnabled(tokenValidated);

  requestAnimationFrame(updateStickyOffset);
}

function validateAllSelected() {
  const itemCount = sheetData[currentLevel].items.length;

  for (let i = 0; i < itemCount; i++) {
    if (!document.querySelector(`input[name="item_${i}"]:checked`)) return false;
  }

  return true;
}

function collectItemResults() {
  return sheetData[currentLevel].items.map((item, index) => {
    const checked = document.querySelector(`input[name="item_${index}"]:checked`);
    const selectedGrade = checked.value;

    return {
      category: item.category,
      behavior: item.behavior,
      maxScore: item.score,
      selectedGrade,
      selectedGradeLabel: gradeLabelToKorean(selectedGrade),
      selectedScore: gradeLabelToScore(item.score, selectedGrade)
    };
  });
}

function clearSelections() {
  document.querySelectorAll(".item-grade").forEach((radio) => {
    radio.checked = false;
  });

  commentEl.value = "";
  currentScoreEl.textContent = "0";
  statusTextEl.textContent = "";
  window.__savedSelections = {};

  updateStickyOffset();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function validateTokenAndSetup() {
  currentToken = getTokenFromUrl();

  if (!currentToken) {
    tokenInfoEl.textContent = "유효한 접속 토큰이 없습니다. 관리자에게 링크를 다시 받으세요.";
    tokenInfoEl.style.color = "red";
    setUiEnabled(false);
    return;
  }

  const tokenRef = doc(db, "inviteTokens", currentToken);
  const tokenSnap = await getDoc(tokenRef);

  if (!tokenSnap.exists()) {
    tokenInfoEl.textContent = "존재하지 않는 토큰입니다.";
    tokenInfoEl.style.color = "red";
    setUiEnabled(false);
    return;
  }

  const tokenData = tokenSnap.data();

  if (tokenData.isUsed) {
    tokenInfoEl.textContent = "이미 사용 완료된 링크입니다. 재제출은 허용되지 않습니다.";
    tokenInfoEl.style.color = "red";
    setUiEnabled(false);
    return;
  }

  if (!tokenData.allowedLevel || !sheetData[tokenData.allowedLevel]) {
    tokenInfoEl.textContent = "토큰에 과정 정보가 없습니다. 관리자에게 문의하세요.";
    tokenInfoEl.style.color = "red";
    setUiEnabled(false);
    return;
  }

  currentLevel = tokenData.allowedLevel;
  viewMode = detectViewMode();

  renderTable(currentLevel);
  setUiEnabled(true);
  tokenValidated = true;

  tokenInfoEl.textContent = `토큰 확인 완료 · ${currentLevel === "basic" ? "초급" : "중급"} 평가 진행 가능`;
  tokenInfoEl.style.color = "#7a5a00";

  requestAnimationFrame(updateStickyOffset);
}

resetBtn.addEventListener("click", clearSelections);

submitBtn.addEventListener("click", async () => {
  if (!tokenValidated || isSubmitting || !currentLevel) return;

  if (!validateAllSelected()) {
    statusTextEl.textContent = "모든 평가항목에 대해 상 / 중 / 하 중 하나를 선택하세요.";
    statusTextEl.style.color = "red";
    return;
  }

  const itemResults = collectItemResults();
  const totalScore = itemResults.reduce((sum, item) => sum + item.selectedScore, 0);
  const totalPossible = sheetData[currentLevel].total;
  const comment = commentEl.value.trim();

  isSubmitting = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "제출 중...";

  try {
    await runTransaction(db, async (transaction) => {
      const tokenRef = doc(db, "inviteTokens", currentToken);
      const evalRef = doc(db, "evaluations", currentToken);

      const tokenSnap = await transaction.get(tokenRef);

      if (!tokenSnap.exists()) {
        throw new Error("토큰이 존재하지 않습니다.");
      }

      const tokenData = tokenSnap.data();

      if (tokenData.isUsed) {
        throw new Error("이미 제출 완료된 토큰입니다.");
      }

      transaction.set(evalRef, {
        submissionId: currentToken,
        token: currentToken,
        level: currentLevel,
        levelTitle: sheetData[currentLevel].title,
        totalPossible,
        totalScore,
        comment,
        itemResults,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      transaction.update(tokenRef, {
        isUsed: true,
        usedAt: serverTimestamp()
      });
    });

    statusTextEl.textContent = `제출 완료되었습니다. 현재 총점: ${totalScore} / ${totalPossible}`;
    statusTextEl.style.color = "green";
    tokenInfoEl.textContent = "제출 완료된 링크입니다. 재제출은 허용되지 않습니다.";
    tokenInfoEl.style.color = "green";
    setUiEnabled(false);

    updateStickyOffset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error(error);
    statusTextEl.textContent = error.message || "제출 중 오류가 발생했습니다.";
    statusTextEl.style.color = "red";
    submitBtn.disabled = false;
    submitBtn.textContent = "제출";
  } finally {
    isSubmitting = false;
  }
});

window.addEventListener("resize", () => {
  const nextMode = detectViewMode();

  if (nextMode !== viewMode && currentLevel) {
    setViewMode(nextMode);
  } else {
    updateStickyOffset();
  }
});

window.addEventListener("load", updateStickyOffset);

setUiEnabled(false);

validateTokenAndSetup().catch((error) => {
  console.error(error);
  tokenInfoEl.textContent = "토큰 확인 중 오류가 발생했습니다.";
  tokenInfoEl.style.color = "red";
  setUiEnabled(false);
});
