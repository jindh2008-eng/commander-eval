const courseContent = document.getElementById("course-content");
const courseTabs = document.querySelectorAll(".course-tab");

async function loadCoursePage(pagePath) {
  try {
    courseContent.innerHTML = `<div class="loading-box">화면을 불러오는 중입니다.</div>`;

    const response = await fetch(pagePath, { cache: "no-cache" });

    if (!response.ok) {
      throw new Error(`페이지 로드 실패: ${response.status}`);
    }

    const html = await response.text();
    courseContent.innerHTML = html;

    if (pagePath.includes("admin-beginner.html") && window.initBeginnerAdminPage) {
      await window.initBeginnerAdminPage();
    }

    if (pagePath.includes("admin-intermediate.html") && window.initIntermediateAdminPage) {
      await window.initIntermediateAdminPage();
    }
  } catch (error) {
    console.error(error);
    courseContent.innerHTML = `
      <div class="error-box">
        선택한 과정 페이지를 불러오지 못했습니다.<br />
        파일 경로와 파일명을 다시 확인해 주세요.
      </div>
    `;
  }
}

function setActiveTab(clickedTab) {
  courseTabs.forEach((tab) => {
    tab.classList.remove("active");
    tab.setAttribute("aria-selected", "false");
  });

  clickedTab.classList.add("active");
  clickedTab.setAttribute("aria-selected", "true");
}


courseTabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    if (!window.currentAdminUser) return;
    setActiveTab(tab);
    await loadCoursePage(tab.dataset.page);
  });
});

window.startAdminApp = async function () {
  const defaultTab = document.querySelector('.course-tab[data-course="초급"]');

  if (defaultTab) {
    setActiveTab(defaultTab);
    await loadCoursePage(defaultTab.dataset.page);
  }
};
