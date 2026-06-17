/* ── 토스트 알림 ── */
(function () {
  const container = document.createElement("div");
  container.className = "toast-container";
  document.body.appendChild(container);

  window.showToast = function (message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-hiding");
      toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, duration);
  };
})();

/* ── 버튼 로딩 상태 ── */
window.setButtonLoading = function (btn, isLoading, loadingText = "처리 중...") {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = loadingText;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.origText ?? btn.textContent;
    btn.disabled = false;
  }
};

/* ── 과정별 사이드바 메뉴 정의 ── */
const COURSE_MENUS = {
  "초급": [
    { sectionId: "beginner-token-create-section",  label: "토큰 생성/배부" },
    { sectionId: "beginner-token-manage-section",  label: "토큰관리" },
    { sectionId: "beginner-distribution-section",  label: "점수분포" },
    { sectionId: "beginner-delete-section",        label: "데이터 삭제" },
    { sectionId: "beginner-detail-section",        label: "평가세부내용" },
  ],
  "중급": [
    { sectionId: "intermediate-token-create-section",  label: "토큰 생성/배부" },
    { sectionId: "intermediate-token-manage-section",  label: "토큰관리" },
    { sectionId: "intermediate-distribution-section",  label: "점수분포" },
    { sectionId: "intermediate-delete-section",        label: "데이터 삭제" },
    { sectionId: "intermediate-detail-section",        label: "평가세부내용" },
  ],
  "고급": [],
};

/* ── DOM 참조 ── */
const courseContent     = document.getElementById("course-content");
const sidebarSectionNav = document.getElementById("sidebar-section-nav");
const topbarCourseEl    = document.getElementById("topbar-course");
const topbarSectionEl   = document.getElementById("topbar-section");

let currentCourse = null;

/* ── 섹션 전환 ── */
function switchSection(sectionId) {
  courseContent.querySelectorAll(".admin-section-block").forEach((s) =>
    s.classList.add("hidden-section")
  );

  const target = document.getElementById(sectionId);
  if (target) target.classList.remove("hidden-section");

  sidebarSectionNav.querySelectorAll(".sidebar-section-btn").forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.section === sectionId)
  );

  const menu = (COURSE_MENUS[currentCourse] || []).find((m) => m.sectionId === sectionId);
  if (topbarSectionEl && menu) topbarSectionEl.textContent = menu.label;
}

/* ── 사이드바 메뉴 렌더링 ── */
function renderSidebarMenu(course) {
  const menus = COURSE_MENUS[course] || [];

  if (!menus.length) {
    sidebarSectionNav.innerHTML = '<div class="sidebar-empty">준비중</div>';
    return;
  }

  sidebarSectionNav.innerHTML = menus
    .map(({ sectionId, label }) =>
      `<button type="button" class="sidebar-section-btn" data-section="${sectionId}">${label}</button>`
    )
    .join("");

  sidebarSectionNav.querySelectorAll(".sidebar-section-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchSection(btn.dataset.section));
  });
}

/* ── 과정 페이지 로드 ── */
async function loadCoursePage(pagePath, course) {
  courseContent.innerHTML = '<div class="loading-box">화면을 불러오는 중입니다.</div>';

  try {
    const response = await fetch(pagePath, { cache: "no-cache" });
    if (!response.ok) throw new Error(`페이지 로드 실패: ${response.status}`);
    courseContent.innerHTML = await response.text();

    if (pagePath.includes("admin-beginner.html") && window.initBeginnerAdminPage) {
      await window.initBeginnerAdminPage();
    }
    if (pagePath.includes("admin-intermediate.html") && window.initIntermediateAdminPage) {
      await window.initIntermediateAdminPage();
    }

    renderSidebarMenu(course);

    const menus = COURSE_MENUS[course] || [];
    if (menus.length) switchSection(menus[0].sectionId);
  } catch (error) {
    console.error(error);
    courseContent.innerHTML =
      '<div class="error-box">선택한 과정 페이지를 불러오지 못했습니다.<br>파일 경로와 파일명을 다시 확인해 주세요.</div>';
  }
}

/* ── 과정 탭 클릭 ── */
function setActiveCourseBtn(btn) {
  document.querySelectorAll(".sidebar-course-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById("sidebar-analysis-btn")?.classList.remove("active");
  btn.classList.add("active");
  if (topbarCourseEl) topbarCourseEl.textContent = btn.dataset.course + "과정";
}

document.querySelectorAll(".sidebar-course-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!window.currentAdminUser) return;
    if (currentCourse === btn.dataset.course) return;
    currentCourse = btn.dataset.course;
    setActiveCourseBtn(btn);
    await loadCoursePage(btn.dataset.page, currentCourse);
  });
});

/* ── 평가분석 페이지 ── */
document.getElementById("sidebar-analysis-btn")?.addEventListener("click", async () => {
  if (!window.currentAdminUser) return;

  document.querySelectorAll(".sidebar-course-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById("sidebar-analysis-btn")?.classList.add("active");
  sidebarSectionNav.innerHTML = "";

  currentCourse = null;
  if (topbarCourseEl) topbarCourseEl.textContent = "평가분석";
  if (topbarSectionEl) topbarSectionEl.textContent = "회차별 분석";

  courseContent.innerHTML = '<div class="loading-box">화면을 불러오는 중입니다.</div>';

  try {
    const response = await fetch("pages/admin-analysis.html", { cache: "no-cache" });
    if (!response.ok) throw new Error("로드 실패");
    courseContent.innerHTML = await response.text();

    if (window.initAnalysisPage) await window.initAnalysisPage();
    window.currentRefreshFn = null;
  } catch (err) {
    console.error(err);
    courseContent.innerHTML = '<div class="error-box">평가분석 페이지를 불러오지 못했습니다.</div>';
  }
});

/* ── 전역 새로고침 버튼 ── */
document.getElementById("global-refresh-btn")?.addEventListener("click", async () => {
  if (typeof window.currentRefreshFn !== "function") return;
  const btn = document.getElementById("global-refresh-btn");
  btn.textContent = "…";
  btn.disabled = true;
  try {
    await window.currentRefreshFn();
    showToast("데이터를 새로 불러왔습니다.", "success");
  } catch {
    showToast("새로고침 중 오류가 발생했습니다.", "error");
  } finally {
    btn.textContent = "↺";
    btn.disabled = false;
  }
});

/* ── 앱 시작 (auth 완료 후 호출) ── */
window.startAdminApp = async function () {
  const firstBtn = document.querySelector(".sidebar-course-btn");
  if (firstBtn) {
    currentCourse = firstBtn.dataset.course;
    setActiveCourseBtn(firstBtn);
    await loadCoursePage(firstBtn.dataset.page, currentCourse);
  }
};
