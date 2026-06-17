import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

(() => {
  const sheetItems = {
    초급: [
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
    ],
    중급: [
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
  };

  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function escapeHtml(v) {
    return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }

  function activateToggle(group, btn) {
    qa(`.toggle-btn[data-group="${group}"]`).forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }

  function getToggleValue(group) {
    const el = document.querySelector(`.toggle-btn.active[data-group="${group}"]`);
    return el ? el.dataset.value : "평가";
  }

  let analysisResult = null;

  function populateRoundSelects() {
    const fromSel = q("#analysis-round-from");
    const toSel = q("#analysis-round-to");
    if (!fromSel || !toSel) return;

    let options = "";
    for (let i = 1; i <= 30; i++) {
      options += `<option value="${i}">${i}회차</option>`;
    }
    fromSel.innerHTML = options;
    toSel.innerHTML = options;
    fromSel.value = "1";
    toSel.value = "10";
  }

  async function fetchSubmissions(course) {
    const qRef = query(
      collection(db, "evaluationSubmissions"),
      where("course", "==", course)
    );
    const snap = await getDocs(qRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function analyze() {
    const course = q("#analysis-course")?.value || "초급";
    const type = getToggleValue("analysis-type");
    const fromRound = Number(q("#analysis-round-from")?.value) || 1;
    const toRound = Number(q("#analysis-round-to")?.value) || 10;

    if (fromRound > toRound) {
      showToast("시작 회차가 종료 회차보다 클 수 없습니다.", "warning");
      return;
    }

    const btn = q("#analysis-search-btn");
    setButtonLoading(btn, true, "분석 중...");

    try {
      const allSubs = await fetchSubmissions(course);
      const filtered = allSubs.filter((s) => {
        const r = Number(s.round) || 0;
        return s.type === type && r >= fromRound && r <= toRound;
      });

      const roundMap = new Map();
      filtered.forEach((s) => {
        const r = Number(s.round) || 0;
        if (!roundMap.has(r)) roundMap.set(r, []);
        roundMap.get(r).push(s);
      });

      const roundStats = [...roundMap.entries()]
        .map(([round, subs]) => {
          const scores = subs.map((s) => Number(s.totalScore) || 0);
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          return { round, avg, count: subs.length, submissions: subs };
        })
        .sort((a, b) => b.avg - a.avg);

      const totalCount = filtered.length;
      const totalAvg = totalCount
        ? filtered.reduce((sum, s) => sum + (Number(s.totalScore) || 0), 0) / totalCount
        : 0;
      const best = roundStats[0];
      const worst = roundStats[roundStats.length - 1];

      analysisResult = { course, type, fromRound, toRound, roundStats, filtered, totalAvg };

      q("#analysis-stats").style.display = "";
      q("#analysis-stat-range").textContent = `${fromRound}회차–${toRound}회차`;
      q("#analysis-stat-count").textContent = String(totalCount);
      q("#analysis-stat-avg").textContent = totalCount ? totalAvg.toFixed(1) : "-";
      q("#analysis-stat-best").textContent = best ? `${best.round}회차 (${best.avg.toFixed(1)})` : "-";
      q("#analysis-stat-worst").textContent = worst && roundStats.length > 1 ? `${worst.round}회차 (${worst.avg.toFixed(1)})` : "-";
      q("#analysis-stat-rounds").textContent = String(roundStats.length);

      q("#analysis-ranking").style.display = "";
      q("#analysis-ranking-desc").textContent =
        `${escapeHtml(course)} ${fromRound}회차부터 ${toRound}회차까지 평균 총점 기준 순위입니다.`;

      const tbody = q("#analysis-ranking-body");
      if (!roundStats.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">해당 조건의 제출 데이터가 없습니다.</td></tr>';
      } else {
        tbody.innerHTML = roundStats
          .map((rs, i) => `
            <tr>
              <td>${i + 1}등</td>
              <td>${rs.round}회차</td>
              <td>${rs.avg.toFixed(1)}</td>
              <td>${rs.count}</td>
            </tr>
          `)
          .join("");
      }

      showToast(`분석 완료: ${roundStats.length}개 회차, ${totalCount}건`, "success");
    } catch (err) {
      console.error("Analysis error:", err);
      showToast("분석 중 오류가 발생했습니다.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function printRanking() {
    if (!analysisResult) {
      showToast("먼저 분석조회를 실행하세요.", "warning");
      return;
    }

    const { course, type, fromRound, toRound, roundStats, totalAvg } = analysisResult;
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html>
      <html lang="ko"><head><meta charset="UTF-8"><title>순위표</title>
      <style>
        body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;padding:30px;color:#222;}
        h2{margin:0 0 4px;color:#1f4f82;}
        p{margin:0 0 16px;color:#555;font-size:14px;}
        table{width:100%;border-collapse:collapse;margin-top:10px;}
        th,td{border:1px solid #ccc;padding:10px 12px;text-align:center;font-size:14px;}
        th{background:#f0f4f8;color:#1f4f82;font-weight:800;}
        .info{display:flex;gap:24px;margin-bottom:16px;font-size:14px;}
        .info b{color:#1f4f82;}
      </style></head>
      <body>
        <h2>${escapeHtml(course)} 회차별 순위표</h2>
        <p>${escapeHtml(type)} · ${fromRound}회차 ~ ${toRound}회차</p>
        <div class="info">
          <div>전체 평균: <b>${totalAvg.toFixed(1)}</b></div>
          <div>분석 회차: <b>${roundStats.length}</b></div>
        </div>
        <table>
          <thead><tr><th>순위</th><th>회차</th><th>평균 점수</th><th>제출 건수</th></tr></thead>
          <tbody>
            ${roundStats.map((rs, i) => `<tr><td>${i + 1}등</td><td>${rs.round}회차</td><td>${rs.avg.toFixed(1)}</td><td>${rs.count}</td></tr>`).join("")}
          </tbody>
        </table>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  function downloadItemAverages() {
    if (!analysisResult) {
      showToast("먼저 분석조회를 실행하세요.", "warning");
      return;
    }

    const { course, type, fromRound, toRound, filtered, totalAvg } = analysisResult;
    const items = sheetItems[course];
    if (!items) {
      showToast("해당 과정의 항목 데이터가 없습니다.", "warning");
      return;
    }

    const itemStats = items.map((item) => {
      const scores = filtered
        .map((sub) => {
          const match = (sub.itemResults || []).find((r) => r.behavior === item.behavior);
          return match ? Number(match.selectedScore) || 0 : null;
        })
        .filter((v) => v !== null);

      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return {
        category: item.category,
        behavior: item.behavior,
        maxScore: item.score,
        avg: avg.toFixed(2),
        count: scores.length
      };
    });

    const lines = [];
    lines.push(`과정,${course}`);
    lines.push(`유형,${type}`);
    lines.push(`회차 범위,${fromRound}회차~${toRound}회차`);
    lines.push(`제출 건수,${filtered.length}`);
    lines.push(`전체 평균,${totalAvg.toFixed(1)}`);
    lines.push("");
    lines.push("카테고리,평가항목,배점,평균 점수,평가 수");
    itemStats.forEach((s) => {
      lines.push(`${s.category},${s.behavior},${s.maxScore},${s.avg},${s.count}`);
    });

    const csv = lines.join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course}_항목별평균_${type}_${fromRound}-${toRound}회차.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("항목별 평균을 다운로드했습니다.", "success");
  }

  async function initAnalysisPage() {
    populateRoundSelects();

    qa('.toggle-btn[data-group="analysis-type"]').forEach((btn) => {
      btn.addEventListener("click", () => activateToggle("analysis-type", btn));
    });

    q("#analysis-search-btn")?.addEventListener("click", analyze);
    q("#analysis-print-btn")?.addEventListener("click", printRanking);
    q("#analysis-download-btn")?.addEventListener("click", downloadItemAverages);
  }

  window.initAnalysisPage = initAnalysisPage;
})();
