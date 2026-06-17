import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

/* =========================
   1. Firebase 초기화
========================= */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   2. 화면 요소
========================= */
const tokenInput = document.getElementById("tokenInput");
const searchBtn = document.getElementById("searchBtn");
const messageBox = document.getElementById("messageBox");

const summarySection = document.getElementById("summarySection");
const itemsSection = document.getElementById("itemsSection");
const itemsContainer = document.getElementById("itemsContainer");

const summaryCourse = document.getElementById("summaryCourse");
const summaryRound = document.getElementById("summaryRound");
const summaryMyScore = document.getElementById("summaryMyScore");
const summaryAvgScore = document.getElementById("summaryAvgScore");
const summaryRank = document.getElementById("summaryRank");

let histogramChart = null;

/* =========================
   3. 평가표 순서 정의
========================= */
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

const COURSE_TO_LEVEL = {
  초급: "basic",
  중급: "intermediate"
};

/* =========================
   4. 공통 함수
========================= */
function setMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
}

function normalizeToken(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeGrade(value) {
  const v = String(value || "").trim();
  if (v === "상" || v === "high") return "상";
  if (v === "중" || v === "mid") return "중";
  if (v === "하" || v === "low") return "하";
  return "-";
}

function getBadgeClass(judgement) {
  if (judgement === "경고") return "is-danger";
  if (judgement === "주의") return "is-warning";
  return "is-normal";
}

function gradeClass(grade) {
  if (grade === "상") return "grade-high";
  if (grade === "중") return "grade-mid";
  if (grade === "하") return "grade-low";
  return "grade-none";
}

function percent(count, total) {
  if (!total) return 0;
  return (count / total) * 100;
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function judgeDistribution({ high, mid, low, total }) {
  if (!total) return "데이터 없음";

  const highPct = percent(high, total);
  if (highPct >= 90 && low > 0) return "소수 이탈";
  if (high > 0 && low > 0 && Math.abs(high - low) <= 1 && (high + low) / total >= 0.6) return "경고";
  if (high > 0 && low > 0) return "주의";
  return "정상";
}

function getLevelFromCourse(course) {
  return COURSE_TO_LEVEL[String(course || "").trim()] || null;
}

function activateToggle(groupName, btn) {
  document.querySelectorAll(`.toggle-btn[data-group="${groupName}"]`).forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

function getToggleValue(groupName) {
  const active = document.querySelector(`.toggle-btn.active[data-group="${groupName}"]`);
  return active ? active.dataset.value : "평가";
}

function hideSections() {
  summarySection.classList.add("hidden");
  itemsSection.classList.add("hidden");
}

function showSections() {
  summarySection.classList.remove("hidden");
  itemsSection.classList.remove("hidden");
}

function clearItems() {
  itemsContainer.innerHTML = "";
}

/* =========================
   5. Firestore 조회
========================= */
async function findTokenDoc(tokenValue) {
  const q = query(
    collection(db, "evaluationTokens"),
    where("tokenValue", "==", tokenValue),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return {
    id: docSnap.id,
    data: docSnap.data()
  };
}

async function findSubmissionByToken(tokenValue) {
  const q = query(
    collection(db, "evaluationSubmissions"),
    where("tokenValue", "==", tokenValue),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return {
    id: docSnap.id,
    data: docSnap.data()
  };
}

async function findAllSubmissionsByCourseRound(course, round) {
  const q = query(
    collection(db, "evaluationSubmissions"),
    where("course", "==", course),
    where("round", "==", round)
  );
  const snap = await getDocs(q);

  const results = [];
  snap.forEach((docSnap) => {
    results.push({
      id: docSnap.id,
      data: docSnap.data()
    });
  });
  return results;
}

/* =========================
   6. 데이터 가공
========================= */
function getEvaluationItems(course) {
  const level = getLevelFromCourse(course);
  return level ? sheetData[level].items : [];
}

function getMyAnswersMap(itemResults = []) {
  const map = new Map();

  itemResults.forEach((item) => {
    map.set(item.behavior, normalizeGrade(item.selectedGradeLabel || item.selectedGrade));
  });

  return map;
}

function calculateAverage(scores) {
  if (!scores.length) return 0;
  const sum = scores.reduce((acc, cur) => acc + cur, 0);
  return sum / scores.length;
}

function calculateRank(scores, myScore) {
  const sorted = [...scores].sort((a, b) => b - a);
  const rank = sorted.findIndex((score) => myScore >= score) + 1;
  return rank <= 0 ? sorted.length : rank;
}

function buildItemStats(course, allSubmissions) {
  const items = getEvaluationItems(course);

  return items.map((baseItem) => {
    let high = 0;
    let mid = 0;
    let low = 0;

    allSubmissions.forEach((submission) => {
      const itemResults = submission.data.itemResults || [];
      const matched = itemResults.find((x) => x.behavior === baseItem.behavior);

      if (!matched) return;

      const grade = normalizeGrade(matched.selectedGradeLabel || matched.selectedGrade);
      if (grade === "상") high += 1;
      if (grade === "중") mid += 1;
      if (grade === "하") low += 1;
    });

    const total = high + mid + low;

    return {
      category: baseItem.category,
      behavior: baseItem.behavior,
      score: baseItem.score,
      high,
      mid,
      low,
      total,
      judgement: judgeDistribution({ high, mid, low, total })
    };
  });
}

/* =========================
   7. 요약/차트 렌더링
========================= */
function renderSummary({ course, round, myScore, avgScore, rank, totalCount, totalPossible }) {
  summaryCourse.textContent = course || "-";

  if (String(round).includes("회차")) {
    summaryRound.textContent = round || "-";
  } else {
    summaryRound.textContent = round ? `${round}회차` : "-";
  }

  summaryMyScore.textContent = `${myScore.toFixed(1)} / ${totalPossible}점`;
  summaryAvgScore.textContent = `${avgScore.toFixed(1)} / ${totalPossible}점`;
  summaryRank.textContent = `${rank}위 / ${totalCount}명`;
}

function buildHistogramBins(scores, totalPossible) {
  const displayMax = totalPossible === 200 ? 100 : totalPossible;
  const normalizedScores =
    totalPossible === 200
      ? scores.map((s) => (safeNumber(s) / 200) * 100)
      : scores.map((s) => safeNumber(s));

  const bins = [];
  for (let start = 0; start < displayMax; start += 5) {
    const isLast = start + 5 >= displayMax;
    const end = isLast ? displayMax : start + 4;
    bins.push({
      label: `${start}~${end}`,
      min: start,
      max: end,
      count: 0
    });
  }

  normalizedScores.forEach((raw) => {
    const score = Math.max(0, Math.min(displayMax, Math.round(raw)));
    const index = score >= displayMax ? bins.length - 1 : Math.floor(score / 5);
    bins[Math.max(0, Math.min(index, bins.length - 1))].count += 1;
  });

  return { bins, displayMax };
}

function renderHistogram(scores, myScore, totalPossible) {
  const canvas = document.getElementById("scoreHistogram");
  const ctx = canvas.getContext("2d");
  const { bins, displayMax } = buildHistogramBins(scores, totalPossible);

  const normalizedMyScore =
    totalPossible === 200 ? (safeNumber(myScore) / 200) * 100 : safeNumber(myScore);

  if (histogramChart) {
    histogramChart.destroy();
  }

  histogramChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: bins.map((bin) => bin.label),
      datasets: [
        {
          label: "인원수",
          data: bins.map((bin) => bin.count),
          backgroundColor: "rgba(31,95,174,0.78)",
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `인원수: ${context.raw}명`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: totalPossible === 200 ? "100점 환산 점수 구간" : "점수 구간"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          },
          title: {
            display: true,
            text: "인원수"
          }
        }
      }
    },
    plugins: [
      {
        id: "myScoreLine",
        afterDatasetsDraw(chart) {
          const { ctx, chartArea, scales } = chart;
          const xScale = scales.x;
          const labels = chart.data.labels;

          let scoreIndex =
            normalizedMyScore >= displayMax
              ? labels.length - 1
              : Math.floor(normalizedMyScore / 5);

          scoreIndex = Math.max(0, Math.min(labels.length - 1, scoreIndex));

          const x = xScale.getPixelForValue(scoreIndex);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#cf3d3d";
          ctx.stroke();

          ctx.fillStyle = "#cf3d3d";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText("내 위치", x + 6, chartArea.top + 14);
          ctx.restore();
        }
      }
    ]
  });
}

/* =========================
   8. 항목 렌더링
========================= */
function groupByCategory(items) {
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  });
  return Array.from(groups.entries()).map(([category, catItems]) => ({ category, items: catItems }));
}

function createDistRow(label, count, total, className) {
  const pct = percent(count, total);
  return `
    <div class="dist-row">
      <div class="dist-label">${label}</div>
      <div class="dist-bar-wrap">
        <div class="dist-bar ${className}" style="width: ${pct.toFixed(1)}%;"></div>
      </div>
      <div class="dist-value">${count}명 (${pct.toFixed(1)}%)</div>
    </div>
  `;
}

function buildItemCard(item, myAnswersMap, itemStats) {
  const myGrade = myAnswersMap.get(item.behavior) || "-";
  const stat = itemStats.find((s) => s.behavior === item.behavior);

  const card = document.createElement("article");
  card.className = "item-card";

  card.innerHTML = `
    <div class="item-head">
      <div class="item-title-wrap">
        <div class="item-title">${item.behavior}</div>
        <div class="item-score-meta">배점 ${item.score}점</div>
      </div>

      <div class="my-grade-box">
        <div class="my-grade-label">내 평가</div>
        <div class="my-grade-value ${gradeClass(myGrade)}">${myGrade}</div>
      </div>
    </div>

    <div class="dist-card">
      ${createDistRow("상", stat?.high || 0, stat?.total || 0, "high")}
      ${createDistRow("중", stat?.mid || 0, stat?.total || 0, "mid")}
      ${createDistRow("하", stat?.low || 0, stat?.total || 0, "low")}

      <div class="dist-footer">
        <div class="dist-total">총 평가: ${stat?.total || 0}명</div>
        <div class="dist-badge ${getBadgeClass(stat?.judgement || "정상")}">${stat?.judgement || "정상"}</div>
      </div>
    </div>
  `;

  return card;
}

function renderItems(course, myItemResults, allSubmissions) {
  clearItems();

  const items = getEvaluationItems(course);
  const myAnswersMap = getMyAnswersMap(myItemResults);
  const itemStats = buildItemStats(course, allSubmissions);
  const groups = groupByCategory(items);
  const startCollapsed = window.innerWidth <= 1024;

  groups.forEach(({ category, items: groupItems }) => {
    const groupEl = document.createElement("div");
    groupEl.className = "category-group" + (startCollapsed ? " collapsed" : "");

    const headerEl = document.createElement("button");
    headerEl.type = "button";
    headerEl.className = "category-header";
    headerEl.innerHTML = `
      <div class="category-header-left">
        <span class="category-name">${category}</span>
        <span class="category-count">${groupItems.length}개 항목</span>
      </div>
      <span class="category-arrow">${startCollapsed ? "▸" : "▾"}</span>
    `;

    const bodyEl = document.createElement("div");
    bodyEl.className = "category-body";

    groupItems.forEach((item) => {
      bodyEl.appendChild(buildItemCard(item, myAnswersMap, itemStats));
    });

    headerEl.addEventListener("click", () => {
      const isCollapsed = groupEl.classList.toggle("collapsed");
      headerEl.querySelector(".category-arrow").textContent = isCollapsed ? "▸" : "▾";
    });

    groupEl.appendChild(headerEl);
    groupEl.appendChild(bodyEl);
    itemsContainer.appendChild(groupEl);
  });
}

/* =========================
   9. 메인 조회
========================= */
async function loadReviewByToken() {
  const tokenValue = normalizeToken(tokenInput.value);

  if (!tokenValue) {
    setMessage("토큰값을 입력해 주세요.", "error");
    hideSections();
    return;
  }

  hideSections();
  clearItems();
  setMessage("토큰 정보를 조회하는 중입니다...", "info");

  try {
    const tokenDoc = await findTokenDoc(tokenValue);

    if (!tokenDoc) {
      setMessage("존재하지 않는 토큰입니다.", "error");
      return;
    }

    const submissionDoc = await findSubmissionByToken(tokenValue);

    if (!submissionDoc) {
      setMessage("해당 토큰은 아직 제출된 평가 결과가 없습니다.", "error");
      return;
    }

    const course = submissionDoc.data.course || tokenDoc.data.course || "";
    const round = submissionDoc.data.round || tokenDoc.data.round || "";
    const type = submissionDoc.data.type || tokenDoc.data.type || "";
    const totalPossible = safeNumber(submissionDoc.data.totalPossible || 100);
    const myScore = safeNumber(submissionDoc.data.totalScore || 0);

    if (!course || !round) {
      setMessage("과정명 또는 회차 정보가 없습니다.", "error");
      return;
    }

    if (type) {
      const typeBtn = document.querySelector(`.toggle-btn[data-group="review-type"][data-value="${type}"]`);
      if (typeBtn) activateToggle("review-type", typeBtn);
    }

    const selectedType = getToggleValue("review-type");
    const rawSubmissions = await findAllSubmissionsByCourseRound(course, round);
    const allSubmissions = rawSubmissions.filter((s) => s.data.type === selectedType);
    const allScores = allSubmissions.map((s) => safeNumber(s.data.totalScore || 0));
    const avgScore = calculateAverage(allScores);
    const rank = calculateRank(allScores, myScore);

    renderSummary({
      course,
      round,
      myScore,
      avgScore,
      rank,
      totalCount: allScores.length,
      totalPossible
    });

    renderHistogram(allScores, myScore, totalPossible);
    renderItems(course, submissionDoc.data.itemResults || [], allSubmissions);

    showSections();
    setMessage("조회가 완료되었습니다.", "success");
  } catch (error) {
    console.error(error);
    setMessage("조회 중 오류가 발생했습니다. 콘솔을 확인해 주세요.", "error");
  }
}

/* =========================
   10. 이벤트
========================= */
searchBtn.addEventListener("click", loadReviewByToken);

tokenInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loadReviewByToken();
  }
});

document.querySelectorAll('.toggle-btn[data-group="review-type"]').forEach((btn) => {
  btn.addEventListener("click", () => {
    activateToggle("review-type", btn);
  });
});

(() => {
  const params = new URLSearchParams(window.location.search);
  const tokenFromQuery = normalizeToken(params.get("token"));

  if (tokenFromQuery) {
    tokenInput.value = tokenFromQuery;
    loadReviewByToken();
  }
})();