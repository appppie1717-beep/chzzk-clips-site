const state = {
  clips: [],
  activeCategory: "전체",
  searchText: "",
};

const categoryBar = document.querySelector("#categoryBar");
const clipGrid = document.querySelector("#clipGrid");
const emptyState = document.querySelector("#emptyState");
const resultCount = document.querySelector("#resultCount");
const searchInput = document.querySelector("#searchInput");
const template = document.querySelector("#clipCardTemplate");

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

  renderCategories();
  renderClips();

  searchInput.addEventListener("input", (event) => {
    state.searchText = event.target.value.trim().toLowerCase();
    renderClips();
  });
}

function renderCategories() {
  const categories = ["전체", ...new Set(state.clips.map((clip) => clip.category || "미분류"))];
  categoryBar.innerHTML = "";

  categories.forEach((category) => {
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
  });
}

function renderClips() {
  const clips = getFilteredClips();
  clipGrid.innerHTML = "";
  emptyState.hidden = clips.length > 0;
  resultCount.textContent = `${state.activeCategory} 카테고리에서 ${clips.length}개 클립을 표시 중입니다.`;

  clips.forEach((clip) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const url = clip.url || "#";

    const thumbLink = card.querySelector(".thumb-link");
    const thumb = card.querySelector(".thumb");
    const category = card.querySelector(".category-pill");
    const date = card.querySelector(".date-text");
    const title = card.querySelector(".clip-title");
    const streamer = card.querySelector(".streamer");
    const memo = card.querySelector(".memo");
    const openLink = card.querySelector(".primary-link");
    const copyButton = card.querySelector(".copy-button");

    thumbLink.href = url;
    thumb.src = clip.thumbnail || "";
    thumb.alt = clip.title ? `${clip.title} 썸네일` : "클립 썸네일";
    category.textContent = clip.category || "미분류";
    date.textContent = clip.date || "";
    title.textContent = clip.title || "제목 없는 클립";
    streamer.textContent = clip.streamer ? `방송인: ${clip.streamer}` : "";
    memo.textContent = clip.memo || "";
    openLink.href = url;
    openLink.textContent = "치지직에서 보기";

    copyButton.addEventListener("click", async () => {
      await copyToClipboard(url);
      copyButton.textContent = "복사됨";
      window.setTimeout(() => {
        copyButton.textContent = "링크 복사";
      }, 1200);
    });

    clipGrid.append(card);
  });
}

function getFilteredClips() {
  return state.clips.filter((clip) => {
    const categoryMatch = state.activeCategory === "전체" || (clip.category || "미분류") === state.activeCategory;
    const haystack = [clip.title, clip.streamer, clip.memo, clip.category].join(" ").toLowerCase();
    const searchMatch = !state.searchText || haystack.includes(state.searchText);
    return categoryMatch && searchMatch;
  });
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
