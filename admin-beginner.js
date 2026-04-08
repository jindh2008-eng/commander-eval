import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

(() => {
  const COURSE_NAME = "초급";

  const DEFAULT_DISTRIBUTION_ITEMS = [
    "상황평가-출동중 정보수집 및 임무공유",
    "상황평가-출동중 상황전파",
    "상황평가-최초 상황보고, 지휘형태 결정 및 지휘권 선언",
    "상황평가-인명정보 취득 및 전파",
    "상황평가-추가 소방력 판단",
    "대응활동-차량배치",
    "대응활동-표준대응활동",
    "대응활동-확대대 임무부여",
    "대응활동-위기대응 및 진행상황 관리",
    "대응활동-화재현장요소 파악 관리",
    "대응활동-단위지휘관 임무수행",
    "화재전술-소방용수",
    "화재전술-문개방 및 내부진입",
    "화재전술-수관전개 주수 및 관창배치",
    "화재전술-배연",
    "의사교환-무전교신 원칙",
    "의사교환-정보 전달력",
    "의사교환-지휘팀장 도착 후 상황보고",
    "핵심목표-인명구조 목표달성의 적절성",
    "핵심목표-출동대 안전관리"
  ];

  const GRADE_ORDER = ["상", "중", "하"];

  let currentTokens = [];
  let currentSubmissions = [];

  let totalHistogramChart = null;
  let itemDistributionCharts = [];

  function normalizeRoundNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 1) return 1;
    return Math.floor(num);
  }

  function roundLabel(roundNumber) {
    return `${normalizeRoundNumber(roundNumber)}회차`;
  }

  function uid(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function randomTokenValue(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < length; i += 1) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

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

    if (typeof value === "string") return value;

    if (value?.toDate) {
      const d = value.toDate();
      return formatDate(d);
    }

    if (value instanceof Date) {
      return formatDate(value);
    }

    return "-";
  }

  function formatDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function getPage() {
    return document.querySelector('[data-course-page="초급"]');
  }

  function q(selector, page = getPage()) {
    return page ? page.querySelector(selector) : null;
  }

  function qa(selector, page = getPage()) {
    return page ? Array.from(page.querySelectorAll(selector)) : [];
  }

  function setText(selector, value) {
    const el = q(selector);
    if (el) el.textContent = value;
  }

  function buildShareUrl(token) {
    return `${location.origin}${location.pathname.replace("admin-main.html", "index.html")}?token=${encodeURIComponent(token.tokenValue)}`;
  }

  async function fetchTokens() {
    const qRef = query(collection(db, "evaluationTokens"), where("course", "==", COURSE_NAME));
    const snap = await getDocs(qRef);

    currentTokens = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    currentTokens.sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    });

    return currentTokens;
  }

  async function fetchSubmissions() {
    const qRef = query(collection(db, "evaluationSubmissions"), where("course", "==", COURSE_NAME));
    const snap = await getDocs(qRef);

    currentSubmissions = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    currentSubmissions.sort((a, b) => {
      const ta = a.submittedAt?.seconds || 0;
      const tb = b.submittedAt?.seconds || 0;
      return tb - ta;
    });

    return currentSubmissions;
  }

  function filterTokens(tokens, type = "", round = "") {
    return tokens.filter((token) => {
      const typeMatch = !type || token.type === type;
      const roundMatch = !round || String(token.round) === String(round);
      return typeMatch && roundMatch;
    });
  }

  function filterSubmissions(submissions, type = "", round = "") {
    return submissions.filter((sub) => {
      const typeMatch = !type || sub.type === type;
      const roundMatch = !round || String(sub.round) === String(round);
      return typeMatch && roundMatch;
    });
  }

  function getAvailableRounds(type = "") {
    const tokens = currentTokens.filter((token) => !type || token.type === type);

    return [...new Set(tokens.map((token) => Number(token.round)))]
      .filter((round) => Number.isFinite(round) && round >= 1)
      .sort((a, b) => a - b);
  }

  function populateRoundSelect(selectSelector, options = {}) {
    const {
      typeSelector = null,
      includeAll = false,
      placeholder = "회차 선택",
      preserveValue = true,
    } = options;

    const select = q(selectSelector);
    if (!select) return;

    const previousValue = preserveValue ? select.value : "";
    const type = typeSelector ? q(typeSelector)?.value || "" : "";
    const rounds = getAvailableRounds(type);

    const firstOption = includeAll
      ? `<option value="">전체 회차</option>`
      : `<option value="">${placeholder}</option>`;

    select.innerHTML =
      firstOption +
      rounds.map((round) => `<option value="${round}">${round}회차</option>`).join("");

    if (previousValue && rounds.map(String).includes(String(previousValue))) {
      select.value = String(previousValue);
    } else {
      select.value = "";
    }
  }

  function renderRoundSelects() {
    populateRoundSelect("#beginner-token-list-round-filter", {
      typeSelector: "#beginner-token-list-type-filter",
      includeAll: true,
    });

    populateRoundSelect("#beginner-token-manage-round", {
      typeSelector: "#beginner-token-manage-type",
      includeAll: true,
    });

    populateRoundSelect("#beginner-distribution-round", {
      typeSelector: "#beginner-distribution-type",
      includeAll: false,
      placeholder: "회차 선택",
    });

    populateRoundSelect("#beginner-delete-round", {
      typeSelector: "#beginner-delete-type",
      includeAll: true,
    });

    populateRoundSelect("#beginner-detail-round", {
      typeSelector: "#beginner-detail-type",
      includeAll: false,
      placeholder: "회차 선택",
    });
  }

  function updatePreview() {
    const type = q("#beginner-token-type")?.value || "평가";
    const roundNumber = normalizeRoundNumber(q("#beginner-token-round")?.value || 1);
    const count = Math.max(1, Number(q("#beginner-token-count")?.value || 1));
    const preview = q("#beginner-token-preview");

    if (preview) {
      preview.textContent = `초급 · ${type} · ${roundLabel(roundNumber)} · ${count}개 생성`;
    }
  }

  function resetTokenForm() {
    const type = q("#beginner-token-type");
    const round = q("#beginner-token-round");
    const count = q("#beginner-token-count");
    const label = q("#beginner-token-label");

    if (type) type.value = "평가";
    if (round) round.value = "1";
    if (count) count.value = "5";
    if (label) label.value = "";

    updatePreview();
  }

  async function createTokens() {
    const type = q("#beginner-token-type")?.value || "평가";
    const roundNumber = normalizeRoundNumber(q("#beginner-token-round")?.value || 1);
    const count = Math.max(1, Number(q("#beginner-token-count")?.value || 1));
    const labelInput = q("#beginner-token-label")?.value.trim();
    const displayName = labelInput || `${type}-${roundLabel(roundNumber)}`;

    const existingTokenValues = new Set(currentTokens.map((t) => t.tokenValue));
    const newTokens = [];

    for (let i = 0; i < count; i += 1) {
      let tokenValue = randomTokenValue(8);

      while (
        existingTokenValues.has(tokenValue) ||
        newTokens.some((t) => t.tokenValue === tokenValue)
      ) {
        tokenValue = randomTokenValue(8);
      }

      newTokens.push({
        localId: uid("tok"),
        course: COURSE_NAME,
        type,
        round: roundNumber,
        displayName,
        tokenValue,
        submitted: false,
        submittedAt: null,
      });
    }

    try {
      for (const token of newTokens) {
        await addDoc(collection(db, "evaluationTokens"), {
          course: token.course,
          type: token.type,
          round: token.round,
          displayName: token.displayName,
          tokenValue: token.tokenValue,
          submitted: false,
          submittedAt: null,
          createdAt: serverTimestamp(),
        });
      }

      await renderAll();
      alert(`${newTokens.length}개의 토큰을 생성했습니다.`);
    } catch (error) {
      console.error("Firebase token save error:", error);
      alert(`토큰을 Firebase에 저장하는 중 오류가 발생했습니다.\n${error.message}`);
    }
  }

  async function copyAllLinks() {
    const typeFilter = q("#beginner-token-list-type-filter")?.value || "";
    const roundFilter = q("#beginner-token-list-round-filter")?.value || "";
    const tokens = filterTokens(currentTokens, typeFilter, roundFilter);

    if (tokens.length === 0) {
      alert("복사할 토큰이 없습니다.");
      return;
    }

    const text = tokens
      .map((token) => `${token.displayName} | ${token.tokenValue} | ${buildShareUrl(token)}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("링크 전체를 복사했습니다.");
    } catch {
      alert("클립보드 복사에 실패했습니다.");
    }
  }

  function renderRecentTokenList() {
    const body = q("#beginner-token-list-body");
    if (!body) return;

    const typeFilter = q("#beginner-token-list-type-filter")?.value || "";
    const roundFilter = q("#beginner-token-list-round-filter")?.value || "";
    const tokens = filterTokens(currentTokens, typeFilter, roundFilter);

    if (tokens.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">생성된 토큰이 없습니다.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = tokens
      .slice(0, 30)
      .map((token) => {
        const link = buildShareUrl(token);
        return `
          <tr>
            <td>${escapeHtml(token.type)}</td>
            <td>${escapeHtml(roundLabel(token.round))}</td>
            <td>${escapeHtml(token.displayName)}</td>
            <td>${escapeHtml(token.tokenValue)}</td>
            <td>${token.submitted ? "제출" : "미제출"}</td>
            <td><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">링크</a></td>
          </tr>
        `;
      })
      .join("");
  }


  function renderTokenManage() {
    const body = q("#beginner-token-manage-list-body");
    if (!body) return;

    const type = q("#beginner-token-manage-type")?.value || "";
    const roundValue = q("#beginner-token-manage-round")?.value || "";
    const round = roundValue ? Number(roundValue) : "";
    const tokens = filterTokens(currentTokens, type, round);

    const total = tokens.length;
    const submitted = tokens.filter((t) => t.submitted).length;
    const unsubmitted = total - submitted;
    const rate = total === 0 ? 0 : (submitted / total) * 100;

    setText("#beginner-token-total-count", String(total));
    setText("#beginner-token-submitted-count", String(submitted));
    setText("#beginner-token-unsubmitted-count", String(unsubmitted));
    setText("#beginner-token-submit-rate", `${rate.toFixed(1)}%`);

    if (tokens.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="7" class="empty-cell">조회된 토큰 데이터가 없습니다.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = tokens
      .map((token) => `
        <tr>
          <td>
            <input type="checkbox" class="beginner-token-manage-check" value="${escapeHtml(token.id)}" />
          </td>
          <td>${escapeHtml(token.type)}</td>
          <td>${escapeHtml(roundLabel(token.round))}</td>
          <td>${escapeHtml(token.displayName)}</td>
          <td>${escapeHtml(token.tokenValue)}</td>
          <td>${token.submitted ? "제출" : "미제출"}</td>
          <td>${escapeHtml(formatDateTime(token.submittedAt))}</td>
        </tr>
      `)
      .join("");
  }

  async function deleteSelectedTokens() {
    const checkedIds = qa(".beginner-token-manage-check:checked").map((el) => el.value);

    if (checkedIds.length === 0) {
      alert("선택된 토큰이 없습니다.");
      return;
    }

    const targetTokens = currentTokens.filter((token) => checkedIds.includes(token.id));
    if (targetTokens.length === 0) {
      alert("삭제할 토큰을 찾지 못했습니다.");
      return;
    }

    const hasSubmittedToken = targetTokens.some((token) => token.submitted);
    const message = hasSubmittedToken
      ? `선택한 ${targetTokens.length}개의 토큰을 삭제합니다.\n연결된 제출 데이터도 함께 삭제됩니다.\n계속할까요?`
      : `선택한 ${targetTokens.length}개의 토큰을 삭제할까요?`;

    if (!confirm(message)) return;

    try {
      const batch = writeBatch(db);
      const tokenValuesToDelete = new Set(targetTokens.map((token) => token.tokenValue));

      targetTokens.forEach((token) => {
        batch.delete(doc(db, "evaluationTokens", token.id));
      });

      currentSubmissions
        .filter((sub) => tokenValuesToDelete.has(sub.tokenValue))
        .forEach((sub) => {
          batch.delete(doc(db, "evaluationSubmissions", sub.id));
        });

      await batch.commit();
      await renderAll();
      alert("선택한 토큰을 삭제했습니다.");
    } catch (error) {
      console.error(error);
      alert(`토큰 삭제 중 오류가 발생했습니다.\n${error.message}`);
    }
  }

  async function deleteAllFilteredTokens() {
    const type = q("#beginner-token-manage-type")?.value || "";
    const roundValue = q("#beginner-token-manage-round")?.value || "";
    const round = roundValue ? Number(roundValue) : "";
    const targets = filterTokens(currentTokens, type, round);

    if (targets.length === 0) {
      alert("삭제할 토큰이 없습니다.");
      return;
    }

    const hasSubmittedToken = targets.some((token) => token.submitted);
    const labelParts = [];
    if (type) labelParts.push(type);
    if (round) labelParts.push(roundLabel(round));
    const conditionLabel = labelParts.length ? labelParts.join(" / ") : "전체 조건";

    const message = hasSubmittedToken
      ? `[${conditionLabel}] 조건의 토큰 ${targets.length}개를 전체 삭제합니다.\n연결된 제출 데이터도 함께 삭제됩니다.\n계속할까요?`
      : `[${conditionLabel}] 조건의 토큰 ${targets.length}개를 전체 삭제할까요?`;

    if (!confirm(message)) return;

    try {
      const batch = writeBatch(db);
      const tokenValuesToDelete = new Set(targets.map((token) => token.tokenValue));

      targets.forEach((token) => {
        batch.delete(doc(db, "evaluationTokens", token.id));
      });

      currentSubmissions
        .filter((sub) => tokenValuesToDelete.has(sub.tokenValue))
        .forEach((sub) => {
          batch.delete(doc(db, "evaluationSubmissions", sub.id));
        });

      await batch.commit();
      await renderAll();
      alert("조건에 해당하는 토큰을 삭제했습니다.");
    } catch (error) {
      console.error(error);
      alert(`조건 전체삭제 중 오류가 발생했습니다.\n${error.message}`);
    }
  }

  function getGradeLabel(item) {
    const grade = item?.selectedGradeLabel || item?.grade || "";
    if (grade === "high") return "상";
    if (grade === "mid") return "중";
    if (grade === "low") return "하";
    return grade;
  }

  function judgeItemConsistency(row) {
    const { 상, 중, 하, total } = row;
    if (!total) return "정상";
  
    const maxVal = Math.max(상, 중, 하);
    const maxPct = (maxVal / total) * 100;
  
    // 🔴 경고 (극단 충돌)
    if (상 > 0 && 하 > 0 && 중 <= 1) {
      return "경고";
    }
  
    // 🟢 정상
    if (maxPct >= 70) {
      return "정상";
    }
  
    // 🟡 나머지 (주의 + 소수이탈 통합)
    return "주의";
  }

  function summarizeDistribution(submissions) {
    const summary = new Map();

    DEFAULT_DISTRIBUTION_ITEMS.forEach((item) => {
      summary.set(item, {
        itemName: item,
        상: 0,
        중: 0,
        하: 0,
        total: 0,
        highPct: 0,
        midPct: 0,
        lowPct: 0,
        judgement: "데이터 없음"
      });
    });

    submissions.forEach((sub) => {
      (sub.itemResults || []).forEach((item) => {
        const itemName = `${item.category}-${item.behavior}`;

        if (!summary.has(itemName)) {
          summary.set(itemName, {
            itemName,
            상: 0,
            중: 0,
            하: 0,
            total: 0,
            highPct: 0,
            midPct: 0,
            lowPct: 0,
            judgement: "데이터 없음"
          });
        }

        const row = summary.get(itemName);
        const grade = getGradeLabel(item);

        if (GRADE_ORDER.includes(grade)) {
          row[grade] += 1;
          row.total += 1;
        }
      });
    });

    return Array.from(summary.values()).map((row) => {
      row.highPct = row.total ? (row.상 / row.total) * 100 : 0;
      row.midPct = row.total ? (row.중 / row.total) * 100 : 0;
      row.lowPct = row.total ? (row.하 / row.total) * 100 : 0;
      row.judgement = judgeItemConsistency(row);
      return row;
    });
  }

  function groupRowsByCategory(rows) {
    const grouped = new Map();

    rows.forEach((row) => {
      const [category, ...rest] = String(row.itemName).split("-");
      const behaviorName = rest.join("-");

      if (!grouped.has(category)) {
        grouped.set(category, []);
      }

      grouped.get(category).push({
        ...row,
        category,
        behaviorName
      });
    });

    return Array.from(grouped.entries()).map(([category, items]) => ({
      category,
      items
    }));
  }
  function getJudgementBadgeClass(judgement) {
    if (judgement === "경고") return "is-danger";
    if (judgement === "주의") return "is-warning";
    return "is-normal";
  }
  function makeBarWidth(value, total) {
    if (!total || value <= 0) return "0%";
    return `${(value / total) * 100}%`;
  }

  function makeBarValueClass(value, total) {
    if (!total || value <= 0) return "";

    const pct = (value / total) * 100;

    if (pct >= 70) return "inside";        // 흰색
    if (pct >= 40) return "inside-dark";   // 진한색
    return "";                             // 바깥
  }

  function buildSingleBarRow(label, value, pct, total, cls) {
    const valueClass = makeBarValueClass(value, total);
    return `
      <div class="category-item-bar-row">
        <div class="category-item-bar-label">${label}:</div>
        <div class="category-item-bar-track">
          <div
            class="category-item-bar-fill ${cls}"
            style="width:${makeBarWidth(value, total)};"
          ></div>
          <div class="category-item-bar-value ${valueClass}">
            ${value}명 (${pct.toFixed(1)}%)
          </div>
        </div>
      </div>
    `;
  }

  function buildItemSummaryText(row) {
    return `
      <span class="stats-line-1">
        상 ${row.상}명 (${row.highPct.toFixed(1)}%)
        &nbsp;&nbsp;&nbsp;중 ${row.중}명 (${row.midPct.toFixed(1)}%)
        &nbsp;&nbsp;&nbsp;하 ${row.하}명 (${row.lowPct.toFixed(1)}%)
      </span>
      <span class="stats-line-2">
        총 평가 ${row.total}명
      </span>
    `;
  }

  function buildHistogramBins(scores) {
    const bins = [];

    for (let start = 0; start < 100; start += 5) {
      const end = start === 95 ? 100 : start + 4;
      bins.push({
        label: `${start}-${end}`,
        start,
        end,
        center: start === 95 ? 97.5 : start + 2.5,
        count: 0
      });
    }

    scores.forEach((score) => {
      const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
      const index = safeScore === 100 ? 19 : Math.floor(safeScore / 5);
      bins[index].count += 1;
    });

    return bins;
  }

  function summarizeTotalScores(submissions) {
    const scores = submissions
      .map((s) => Number(s.totalScore))
      .filter((v) => Number.isFinite(v));

    if (!scores.length) {
      return {
        scores: [],
        bins: [],
        average: 0,
        min: 0,
        max: 0,
        range: 0,
        interpretation: "데이터 없음"
      };
    }

    const total = scores.reduce((sum, v) => sum + v, 0);
    const average = total / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const bins = buildHistogramBins(scores);
    const interpretation = interpretScoreDistribution(scores, bins);

    return {
      scores,
      bins,
      average,
      min,
      max,
      range: max - min,
      interpretation
    };
  }

  function interpretScoreDistribution(scores, bins) {
    if (!scores.length) return "데이터 없음";

    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;
    const total = scores.length;
    const nonZeroBins = bins.filter((b) => b.count > 0).length;
    const sortedCounts = [...bins.map((b) => b.count)].sort((a, b) => b - a);
    const top1 = sortedCounts[0] || 0;
    const top2 = sortedCounts[1] || 0;

    if (range <= 15 && top1 / total >= 0.5) {
      return "집중형";
    }

    if (nonZeroBins >= 8 && range >= 30) {
      return "분산형";
    }

    if (top1 / total < 0.35 && top2 / total < 0.35 && range >= 40) {
      return "양극화 가능성";
    }

    return "보통";
  }

  function destroyCharts() {
    if (totalHistogramChart) {
      totalHistogramChart.destroy();
      totalHistogramChart = null;
    }

    itemDistributionCharts.forEach((chart) => {
      if (chart) chart.destroy();
    });
    itemDistributionCharts = [];
  }

  const totalHistogramLabelPlugin = {
    id: "totalHistogramLabelPlugin",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const dataset = chart.data.datasets[0];
      const meta = chart.getDatasetMeta(0);

      ctx.save();
      ctx.fillStyle = "#173b60";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      meta.data.forEach((bar, index) => {
        const value = dataset.data[index]?.y ?? dataset.data[index];
        if (!value) return;
        ctx.fillText(String(value), bar.x, bar.y - 4);
      });

      ctx.restore();
    }
  };

  const averageLinePlugin = {
    id: "averageLinePlugin",
    afterDatasetsDraw(chart, args, pluginOptions) {
      const average = pluginOptions?.average;
      if (!Number.isFinite(average)) return;

      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      if (!xScale || !chartArea) return;

      const x = xScale.getPixelForValue(average);

      ctx.save();

      // 평균선
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#e53935";
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 라벨 박스 설정
      const labelText = `▲ 평균 ${average.toFixed(1)}`;
      ctx.font = "bold 12px sans-serif";
      const textWidth = ctx.measureText(labelText).width;
      const boxPaddingX = 8;
      const boxPaddingY = 5;
      const boxWidth = textWidth + boxPaddingX * 2;
      const boxHeight = 24;

      // 라벨 위치: 선 오른쪽 위
      let boxX = x + 8;
      let boxY = chartArea.top + 6;

      // 오른쪽이 넘치면 선 왼쪽으로 이동
      if (boxX + boxWidth > chartArea.right) {
        boxX = x - boxWidth - 8;
      }

      // 라벨 박스
      ctx.fillStyle = "#e53935";
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
      ctx.fill();

      // 라벨 텍스트
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, boxX + boxPaddingX, boxY + boxHeight / 2);

      ctx.restore();
    }
  };


  function renderTotalHistogram(summary, type, round) {
    const area = q("#beginner-total-histogram-area");
    const stats = q("#beginner-total-score-stats");
    const interpretation = q("#beginner-total-score-interpretation");

    if (!area || !stats || !interpretation) return;

    if (!summary.scores.length) {
      area.innerHTML = "선택한 유형/회차의 총점 데이터가 없습니다.";
      stats.innerHTML = `
        <div class="info-box"><div class="info-label">최고점</div><div class="info-value">-</div></div>
        <div class="info-box"><div class="info-label">최저점</div><div class="info-value">-</div></div>
        <div class="info-box"><div class="info-label">평균 점수</div><div class="info-value">-</div></div>
        <div class="info-box"><div class="info-label">분포 형태</div><div class="info-value">-</div></div>
      `;
      interpretation.textContent = "총점 분포 해석이 없습니다.";
      return;
    }

    area.innerHTML = `
      <div style="margin-bottom:12px; color:#36536f; line-height:1.6;">
        <div><strong>${escapeHtml(type)} / ${escapeHtml(roundLabel(round))} 총점 히스토그램</strong></div>
        <div style="margin-top:6px;">제출 건수: ${summary.scores.length}건</div>
      </div>
      <div style="position:relative; width:100%; height:360px;">
        <canvas id="beginner-total-histogram-canvas"></canvas>
      </div>
    `;

    stats.innerHTML = `
      <div class="info-box">
        <div class="info-label">최고점</div>
        <div class="info-value">${summary.max}</div>
      </div>
      <div class="info-box">
        <div class="info-label">최저점</div>
        <div class="info-value">${summary.min}</div>
      </div>
      <div class="info-box">
        <div class="info-label">평균 점수</div>
        <div class="info-value">${summary.average.toFixed(1)}</div>
      </div>

      <div class="info-box">
        <div class="info-label">분포 형태</div>
        <div class="info-value">${summary.interpretation}</div>
      </div>
    `;

    interpretation.textContent =
      summary.interpretation === "집중형"
        ? "총점이 특정 구간에 비교적 밀집되어 있어 평가 결과가 전반적으로 집중형으로 나타납니다."
        : summary.interpretation === "분산형"
        ? "총점이 여러 구간에 넓게 퍼져 있어 평가 결과가 분산형으로 나타납니다."
        : summary.interpretation === "양극화 가능성"
        ? "총점이 서로 다른 구간에 나뉘어 나타나 일부 평가 결과의 양극화 가능성이 보입니다."
        : "총점 분포가 특정 한 형태로 강하게 치우치지 않아 보통 수준의 분포를 보입니다.";

    const canvas = q("#beginner-total-histogram-canvas");
    if (!canvas || typeof Chart === "undefined") return;

    totalHistogramChart = new Chart(canvas, {
      type: "bar",
      data: {
        datasets: [
          {
            label: "인원수",
            data: summary.bins.map((bin) => ({ x: bin.center, y: bin.count })),
            backgroundColor: "rgba(31, 79, 130, 0.72)",
            borderColor: "rgba(31, 79, 130, 1)",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title(items) {
                const x = items[0]?.raw?.x ?? 0;
                const start = x === 97.5 ? 95 : Math.floor(x / 5) * 5;
                const end = start === 95 ? 100 : start + 4;
                return `${start}-${end}점`;
              },
              label(context) {
                return `인원수: ${context.raw.y}명`;
              }
            }
          },
          averageLinePlugin: {
            average: summary.average
          }
        },
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: 100,
            ticks: {
              stepSize: 5,
              color: "#506273"
            },
            title: {
              display: true,
              text: "총점 구간",
              color: "#1f4f82",
              font: { size: 13, weight: "700" }
            },
            grid: {
              color: "rgba(31,79,130,0.08)"
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: "#506273"
            },
            title: {
              display: true,
              text: "인원수",
              color: "#1f4f82",
              font: { size: 13, weight: "700" }
            },
            grid: {
              color: "rgba(31,79,130,0.08)"
            }
          }
        }
      },
      plugins: [totalHistogramLabelPlugin, averageLinePlugin]
    });
  }

  function renderItemDistributionChart(rows, type, round) {
    const area = q("#beginner-item-distribution-chart-area");
    if (!area) return;

    if (!rows.length) {
      area.innerHTML = "선택한 유형/회차의 평가항목별 점수분포 데이터가 없습니다.";
      return;
    }

    const groupedCategories = groupRowsByCategory(rows);

    area.innerHTML = `
      <div class="item-distribution-header">
        <div><strong>${escapeHtml(type)} / ${escapeHtml(roundLabel(round))} 평가항목별 점수분포</strong></div>
        <div class="item-distribution-sub">
          카테고리 수: ${groupedCategories.length}개 / 전체 항목 수: ${rows.length}개
        </div>
      </div>

      <div class="category-block-list">
        ${groupedCategories
          .map(
            (group) => `
              <section class="category-block">
                <h4 class="category-block-title">${escapeHtml(group.category)}</h4>

                <div class="category-item-list">
                  ${group.items
                    .map(
                      (row) => `
                        <div class="category-item-row">
                          <div class="category-item-title">
                            ${escapeHtml(row.behaviorName)}
                          </div>

                          <div class="category-item-bar-list">
                            ${buildSingleBarRow("상", row.상, row.highPct, row.total, "high")}
                            ${buildSingleBarRow("중", row.중, row.midPct, row.total, "mid")}
                            ${buildSingleBarRow("하", row.하, row.lowPct, row.total, "low")}
                          </div>

                          <div class="category-item-meta">
                            <div class="category-item-total">
                              총 평가: ${row.total}명
                            </div>
                            <div class="category-item-judgement ${getJudgementBadgeClass(row.judgement)}">
                              ${escapeHtml(row.judgement)}
                            </div>
                          </div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </section>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderItemSummaryTable(rows) {
    const body = q("#beginner-distribution-summary-body");
    if (!body) return;

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td colspan="9" class="empty-cell">조회된 점수분포 데이터가 없습니다.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = rows
      .map((row) => `
        <tr>
          <td>${escapeHtml(row.itemName)}</td>
          <td>${row.상}</td>
          <td>${row.highPct.toFixed(1)}%</td>
          <td>${row.중}</td>
          <td>${row.midPct.toFixed(1)}%</td>
          <td>${row.하}</td>
          <td>${row.lowPct.toFixed(1)}%</td>
          <td>${row.total}</td>
          <td>
            <span class="category-item-judgement ${getJudgementBadgeClass(row.judgement)}">
              ${escapeHtml(row.judgement)}
            </span>
          </td>
        </tr>
      `)
      .join("");
  }

  function buildOverallSummary(rows, scoreSummary) {
    const warningCount = rows.filter((r) => r.judgement === "주의").length;
    const dangerCount = rows.filter((r) => r.judgement === "경고").length;
    
    if (dangerCount > 0) {
      return `총점 분포는 ${scoreSummary.interpretation} 경향이며, 일부 항목에서 평가 기준 편차가 크게 나타났습니다.`;
    }
    
    if (warningCount > 0) {
      return `전반적으로는 일관적이나 일부 항목에서 평가 기준 편차가 확인됩니다.`;
    }

    return `전반적으로 평가 결과는 비교적 일관적으로 나타났습니다.`;
  }

  function renderDistribution() {
    const type = q("#beginner-distribution-type")?.value || "평가";
    const roundValue = q("#beginner-distribution-round")?.value || "";
    const overallSummary = q("#beginner-distribution-overall-summary");
    const totalArea = q("#beginner-total-histogram-area");
    const itemArea = q("#beginner-item-distribution-chart-area");

    destroyCharts();

    if (!roundValue) {
      if (totalArea) totalArea.innerHTML = "회차를 선택해 주세요.";
      if (itemArea) itemArea.innerHTML = "회차를 선택해 주세요.";
      renderItemSummaryTable([]);
      if (overallSummary) {
        overallSummary.textContent = "전체 결과 요약을 표시하려면 회차를 선택해 주세요.";
      }
      return;
    }

    const round = Number(roundValue);
    const submissions = filterSubmissions(currentSubmissions, type, round);
    const totalScoreSummary = summarizeTotalScores(submissions);
    const rows = summarizeDistribution(submissions).filter((row) => row.total > 0);

    renderTotalHistogram(totalScoreSummary, type, round);
    renderItemDistributionChart(rows, type, round);
    renderItemSummaryTable(rows);

    if (overallSummary) {
      overallSummary.textContent = submissions.length
        ? buildOverallSummary(rows, totalScoreSummary)
        : "선택한 유형/회차의 분석 데이터가 없습니다.";
    }
  }

  function renderDeleteList() {
    const type = q("#beginner-delete-type")?.value || "";
    const roundValue = q("#beginner-delete-round")?.value || "";
    const round = roundValue ? Number(roundValue) : "";
    const submissions = filterSubmissions(currentSubmissions, type, round);
    const body = q("#beginner-delete-list-body");

    if (!body) return;

    if (submissions.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">검색된 삭제 대상 데이터가 없습니다.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = submissions
      .map((sub) => `
        <tr>
          <td><input type="checkbox" class="beginner-delete-check" value="${escapeHtml(sub.id)}" /></td>
          <td>${escapeHtml(sub.type)}</td>
          <td>${escapeHtml(roundLabel(sub.round))}</td>
          <td>${escapeHtml(sub.tokenValue)}</td>
          <td>${escapeHtml(sub.totalScore)}</td>
          <td>${escapeHtml(formatDateTime(sub.submittedAt))}</td>
        </tr>
      `)
      .join("");
  }

  async function deleteSelectedSubmissions() {
    const checked = qa(".beginner-delete-check:checked").map((el) => el.value);

    if (checked.length === 0) {
      alert("선택된 데이터가 없습니다.");
      return;
    }

    if (!confirm(`선택한 ${checked.length}건을 삭제할까요?`)) return;

    try {
      const batch = writeBatch(db);
      const deletedSubs = currentSubmissions.filter((sub) => checked.includes(sub.id));

      deletedSubs.forEach((sub) => {
        batch.delete(doc(db, "evaluationSubmissions", sub.id));
      });

      deletedSubs.forEach((sub) => {
        const token = currentTokens.find((t) => t.tokenValue === sub.tokenValue);
        if (token) {
          batch.delete(doc(db, "evaluationTokens", token.id));
        }
      });

      await batch.commit();
      await renderAll();
      alert("선택한 제출 데이터를 삭제했습니다.");
    } catch (error) {
      console.error(error);
      alert(`제출 데이터 삭제 중 오류가 발생했습니다.\n${error.message}`);
    }
  }

  async function deleteAllFilteredSubmissions() {
    const type = q("#beginner-delete-type")?.value || "";
    const roundValue = q("#beginner-delete-round")?.value || "";
    const round = roundValue ? Number(roundValue) : "";
    const targets = filterSubmissions(currentSubmissions, type, round);

    if (targets.length === 0) {
      alert("삭제할 데이터가 없습니다.");
      return;
    }

    if (!confirm(`조건에 해당하는 ${targets.length}건을 전체 삭제할까요?`)) return;

    try {
      const batch = writeBatch(db);

      targets.forEach((sub) => {
        batch.delete(doc(db, "evaluationSubmissions", sub.id));
      });

      targets.forEach((sub) => {
        const token = currentTokens.find((t) => t.tokenValue === sub.tokenValue);
        if (token) {
          batch.delete(doc(db, "evaluationTokens", token.id));
        }
      });

      await batch.commit();
      await renderAll();
      alert("조건에 해당하는 제출 데이터를 삭제했습니다.");
    } catch (error) {
      console.error(error);
      alert(`조건 전체삭제 중 오류가 발생했습니다.\n${error.message}`);
    }
  }

  function renderDetailList() {
    const type = q("#beginner-detail-type")?.value || "평가";
    const roundValue = q("#beginner-detail-round")?.value || "";
    const list = q("#beginner-detail-list");
    const view = q("#beginner-detail-view");

    if (view) {
      view.innerHTML = "제출 목록을 클릭하면 해당 평가표가 여기에 표시됩니다.";
    }

    if (!list) return;

    if (!roundValue) {
      list.innerHTML = `<li class="detail-list-empty">회차를 선택해 주세요.</li>`;
      return;
    }

    const round = Number(roundValue);
    const submissions = filterSubmissions(currentSubmissions, type, round);

    if (submissions.length === 0) {
      list.innerHTML = `<li class="detail-list-empty">조회된 제출 목록이 없습니다.</li>`;
      return;
    }

    list.innerHTML = submissions
      .map((sub) => `
        <li class="beginner-detail-item" data-id="${escapeHtml(sub.id)}">
          <div><strong>${escapeHtml(sub.tokenValue)}</strong></div>
          <div style="margin-top:6px; color:#5a7085;">${escapeHtml(sub.type)} / ${escapeHtml(roundLabel(sub.round))}</div>
          <div style="margin-top:4px; color:#5a7085;">총점 ${escapeHtml(sub.totalScore)}점</div>
        </li>
      `)
      .join("");

    qa(".beginner-detail-item", getPage()).forEach((item) => {
      item.addEventListener("click", () => {
        showSubmissionDetail(item.dataset.id);
      });
    });
  }

  function showSubmissionDetail(submissionId) {
    const submission = currentSubmissions.find((s) => s.id === submissionId);
    const view = q("#beginner-detail-view");
    if (!submission || !view) return;

    const itemRows = (submission.itemResults || [])
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.category)} - ${escapeHtml(item.behavior)}</td>
            <td>${escapeHtml(getGradeLabel(item) || "-")}</td>
            <td>${escapeHtml(item.selectedScore ?? "-")}</td>
          </tr>
        `
      )
      .join("");

    view.innerHTML = `
      <div style="margin-bottom:12px;">
        <strong>유형:</strong> ${escapeHtml(submission.type)} /
        <strong>회차:</strong> ${escapeHtml(roundLabel(submission.round))} /
        <strong>총점:</strong> ${escapeHtml(submission.totalScore)}점
      </div>
      <div style="margin-bottom:12px;">
        <strong>토큰:</strong> ${escapeHtml(submission.tokenValue)}
      </div>
      <div style="margin-bottom:12px;">
        <strong>제출일시:</strong> ${escapeHtml(formatDateTime(submission.submittedAt))}
      </div>
      <div style="margin-bottom:16px;">
        <strong>비고:</strong> ${escapeHtml(submission.comment || "-")}
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>평가항목</th>
            <th>판정</th>
            <th>점수</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="3" class="empty-cell">항목이 없습니다.</td></tr>`}
        </tbody>
      </table>
    `;
  }

  function attachRoundStepper(inputSelector, decreaseSelector, increaseSelector, onChange) {
    const input = q(inputSelector);
    const decreaseBtn = q(decreaseSelector);
    const increaseBtn = q(increaseSelector);

    if (!input) return;

    const normalizeAndApply = () => {
      input.value = String(normalizeRoundNumber(input.value));
      if (typeof onChange === "function") onChange();
    };

    input.addEventListener("input", normalizeAndApply);
    input.addEventListener("change", normalizeAndApply);

    if (decreaseBtn) {
      decreaseBtn.addEventListener("click", () => {
        const current = normalizeRoundNumber(input.value);
        input.value = String(Math.max(1, current - 1));
        if (typeof onChange === "function") onChange();
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener("click", () => {
        const current = normalizeRoundNumber(input.value);
        input.value = String(current + 1);
        if (typeof onChange === "function") onChange();
      });
    }
  }

  function attachMenuEvents() {
    const page = getPage();
    if (!page) return;

    const menuButtons = qa(".menu-btn", page);
    const sections = qa(".beginner-section-block", page);

    menuButtons.forEach((button) => {
      button.addEventListener("click", () => {
        menuButtons.forEach((btn) => btn.classList.remove("active"));
        sections.forEach((section) => section.classList.add("hidden-section"));

        button.classList.add("active");
        const target = page.querySelector(`#${button.dataset.target}`);
        if (target) target.classList.remove("hidden-section");
      });
    });
  }

  function attachTokenFormEvents() {
    ["#beginner-token-type", "#beginner-token-count"].forEach((selector) => {
      const el = q(selector);
      if (el) {
        el.addEventListener("input", updatePreview);
        el.addEventListener("change", updatePreview);
      }
    });

    q("#beginner-token-list-type-filter")?.addEventListener("change", renderRoundSelects);

    attachRoundStepper(
      "#beginner-token-round",
      "#beginner-token-round-decrease",
      "#beginner-token-round-increase",
      updatePreview
    );

    q("#beginner-create-token-btn")?.addEventListener("click", createTokens);
    q("#beginner-reset-token-btn")?.addEventListener("click", resetTokenForm);
    q("#beginner-copy-link-btn")?.addEventListener("click", copyAllLinks);
    q("#beginner-token-search-btn")?.addEventListener("click", renderRecentTokenList);
  }

  function attachTokenManageEvents() {
    q("#beginner-token-manage-type")?.addEventListener("change", () => {
      populateRoundSelect("#beginner-token-manage-round", {
        typeSelector: "#beginner-token-manage-type",
        includeAll: true,
      });
    });

    q("#beginner-token-manage-search-btn")?.addEventListener("click", renderTokenManage);
    q("#beginner-token-delete-selected-btn")?.addEventListener("click", deleteSelectedTokens);
    q("#beginner-token-delete-all-btn")?.addEventListener("click", deleteAllFilteredTokens);
  }

  function attachDistributionEvents() {
    q("#beginner-distribution-type")?.addEventListener("change", () => {
      populateRoundSelect("#beginner-distribution-round", {
        typeSelector: "#beginner-distribution-type",
        includeAll: false,
        placeholder: "회차 선택",
      });
    });

    q("#beginner-load-distribution-btn")?.addEventListener("click", renderDistribution);

    q("#beginner-download-distribution-btn")?.addEventListener("click", () => {
      const type = q("#beginner-distribution-type")?.value || "평가";
      const roundValue = q("#beginner-distribution-round")?.value || "";

      if (!roundValue) {
        alert("회차를 선택해 주세요.");
        return;
      }

      const round = Number(roundValue);
      const submissions = filterSubmissions(currentSubmissions, type, round);
      const rows = summarizeDistribution(submissions).filter((row) => row.total > 0);
      const totalSummary = summarizeTotalScores(submissions);

      if (!rows.length && !totalSummary.scores.length) {
        alert("다운로드할 데이터가 없습니다.");
        return;
      }

      const csvLines = [];

      csvLines.push(`유형,${type}`);
      csvLines.push(`회차,${roundLabel(round)}`);
      csvLines.push(`제출 건수,${submissions.length}`);
      csvLines.push(`평균 점수,${totalSummary.average ? totalSummary.average.toFixed(1) : "-"}`);
      csvLines.push(`최고점,${totalSummary.scores.length ? totalSummary.max : "-"}`);
      csvLines.push(`최저점,${totalSummary.scores.length ? totalSummary.min : "-"}`);
      csvLines.push(`분포 형태,${totalSummary.interpretation}`);
      csvLines.push("");

      csvLines.push("총점 히스토그램");
      csvLines.push("구간,인원수");
      totalSummary.bins.forEach((bin) => {
        csvLines.push(`${bin.label},${bin.count}`);
      });
      csvLines.push("");

      csvLines.push("평가항목별 점수분포");
      csvLines.push("평가항목,상,상 비율,중,중 비율,하,하 비율,총 평가 수,불일치 판단");
      rows.forEach((r) => {
        csvLines.push(
          [
            r.itemName,
            r.상,
            `${r.highPct.toFixed(1)}%`,
            r.중,
            `${r.midPct.toFixed(1)}%`,
            r.하,
            `${r.lowPct.toFixed(1)}%`,
            r.total,
            r.judgement
          ].join(",")
        );
      });

      const csv = csvLines.join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `초급_점수분포_${type}_${roundLabel(round)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function attachDeleteEvents() {
    q("#beginner-delete-type")?.addEventListener("change", () => {
      populateRoundSelect("#beginner-delete-round", {
        typeSelector: "#beginner-delete-type",
        includeAll: true,
      });
    });

    q("#beginner-search-delete-target-btn")?.addEventListener("click", renderDeleteList);
    q("#beginner-delete-selected-btn")?.addEventListener("click", deleteSelectedSubmissions);
    q("#beginner-delete-all-btn")?.addEventListener("click", deleteAllFilteredSubmissions);
  }

  function attachDetailEvents() {
    q("#beginner-detail-type")?.addEventListener("change", () => {
      populateRoundSelect("#beginner-detail-round", {
        typeSelector: "#beginner-detail-type",
        includeAll: false,
        placeholder: "회차 선택",
      });
    });

    q("#beginner-load-detail-list-btn")?.addEventListener("click", renderDetailList);
  }

  async function renderAll() {
    await Promise.all([fetchTokens(), fetchSubmissions()]);
    updatePreview();
    renderRoundSelects();
    renderRecentTokenList();
    renderTokenManage();
    renderDistribution();
    renderDeleteList();
    renderDetailList();
  }

  async function initBeginnerAdminPage() {
    const page = getPage();
    if (!page) return;

    attachMenuEvents();
    attachTokenFormEvents();
    attachTokenManageEvents();
    attachDistributionEvents();
    attachDeleteEvents();
    attachDetailEvents();
    await renderAll();
  }

  window.initBeginnerAdminPage = initBeginnerAdminPage;
})();
