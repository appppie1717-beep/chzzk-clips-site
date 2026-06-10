const state = {
  clips: [],
  activeCategory: "",
};

const categoryBar = document.querySelector("#categoryBar");
const categoryGrid = document.querySelector("#categoryGrid");
const clipGrid = document.querySelector("#clipGrid");
const clipsPanel = document.querySelector("#clipsPanel");
const emptyState = document.querySelector("#emptyState");
const resultCount = document.querySelector("#resultCount");
const template = document.querySelector("#clipCardTemplate");
const playerModal = document.querySelector("#playerModal");
const clipPlayer = document.querySelector("#clipPlayer");
const localPlayer = document.querySelector("#localPlayer");
const playerTitle = document.querySelector("#playerTitle");
const playerCategory = document.querySelector("#playerCategory");
const externalPlayerLink = document.querySelector("#externalPlayerLink");

const fallbackClips = [
  {
    title: "샘플 클립",
    category: "A",
    url: "https://chzzk.naver.com/",
    thumbnail: "",
    streamer: "스트리머 이름",
    date: "2026-06-10",
    memo: "clips.json에 실제 치지직 클립 링크를 넣으면 이 카드처럼 표시됩니다."
  }
];

init();

async function init() {
  try {
    const response = await fetch("./clips.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const clips = await response.json();
    state.clips = Array.isArray(clips) ? clips : fallbackClips;
  } catch (error) {
    state.clips = fallbackClips;
    resultCount.textContent = "clips.json을 불러오지 못해 샘플을 표시합니다.";
  }

  state.activeCategory = "";
  renderCategories();
  renderClips();

  document.querySelectorAll("[data-close-player]").forEach((element) => {
    element.addEventListener("click", closePlayer);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePlayer();
  });
}

function renderCategories() {
  const categories = [...new Set(state.clips.map((clip) => clip.category || "미분류"))];
  categoryBar.innerHTML = "";
  categoryGrid.innerHTML = "";

  categories.forEach((category) => {
    const count = state.clips.filter((clip) => (clip.category || "미분류") === category).length;

    const button = document.createElement("button");
    button.className = "category-button";
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === state.activeCategory));
    button.addEventListener("click", () => {
      state.activeCategory = category;
      renderCategories();
      renderClips();
    });
    categoryBar.append(button);

    const card = document.createElement("button");
    card.className = "category-card";
    card.type = "button";
    card.setAttribute("aria-pressed", String(category === state.activeCategory));
    card.innerHTML = `<strong>${category}</strong><span>${count}개 클립 보기</span>`;
    card.addEventListener("click", () => {
      state.activeCategory = category;
      renderCategories();
      renderClips();
      clipGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    categoryGrid.append(card);
  });
}

function renderClips() {
  const clips = getFilteredClips();
  clipGrid.innerHTML = "";

  if (!state.activeCategory) {
    emptyState.hidden = true;
    clipsPanel.classList.remove("is-open");
    resultCount.textContent = `카테고리 ${categoryGrid.children.length}개 중 하나를 선택하세요.`;
    return;
  }

  clipsPanel.classList.add("is-open");
  emptyState.hidden = clips.length > 0;
  resultCount.textContent = `${state.activeCategory} 카테고리에서 ${clips.length}개 클립을 표시 중입니다.`;

  clips.forEach((clip) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const url = clip.url || "#";

    const clipOpen = card.querySelector(".clip-open");
    const thumb = card.querySelector(".thumb");

    thumb.src = clip.thumbnail || "";
    thumb.alt = "";
    clipOpen.setAttribute("aria-label", clip.title || "클립 열기");

    clipOpen.addEventListener("click", () => {
      openPlayer(clip);
    });

    clipGrid.append(card);
  });
}

function openPlayer(clip) {
  const url = clip.url || "#";
  playerTitle.textContent = clip.title || "제목 없는 클립";
  playerCategory.textContent = clip.category || "미분류";
  externalPlayerLink.href = url;

  clipPlayer.src = "about:blank";
  localPlayer.pause();
  localPlayer.removeAttribute("src");

  if (clip.video) {
    localPlayer.src = encodeURI(clip.video);
    localPlayer.hidden = false;
    clipPlayer.hidden = true;
    localPlayer.load();
  } else if (clip.embedUrl) {
    clipPlayer.src = clip.embedUrl;
    localPlayer.hidden = true;
    clipPlayer.hidden = false;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  playerModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closePlayer() {
  if (playerModal.hidden) return;
  playerModal.hidden = true;
  localPlayer.pause();
  localPlayer.removeAttribute("src");
  clipPlayer.src = "about:blank";
  document.body.style.overflow = "";
}

function getFilteredClips() {
  if (!state.activeCategory) return [];

  return state.clips.filter((clip) => {
    return (clip.category || "미분류") === state.activeCategory;
  });
}
