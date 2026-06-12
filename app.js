const POPULARITY_CATEGORY = "애교";
const POPULARITY_GAME_KEY = "aegyo";
const THEME_STORAGE_KEY = "dreamClipsTheme";
const LOCAL_RANKING_KEY = "dreamClipsLocalPopularity";

const state = {
  clips: [],
  activeCategory: "",
  activeMode: "clips",
  popularityMode: "game",
  ranking: [],
  rankingSource: "loading",
  tournament: null,
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
const streamLink = document.querySelector(".stream-link");
const liveBadge = document.querySelector("#liveBadge");
const popularityPanel = document.querySelector("#popularityPanel");
const modeTabs = document.querySelectorAll("[data-popularity-mode]");
const gameView = document.querySelector("#gameView");
const rankingView = document.querySelector("#rankingView");
const gameIntro = document.querySelector("#gameIntro");
const tournamentStage = document.querySelector("#tournamentStage");
const matchBoard = document.querySelector("#matchBoard");
const roundLabel = document.querySelector("#roundLabel");
const matchLabel = document.querySelector("#matchLabel");
const rankingList = document.querySelector("#rankingList");
const startGameButton = document.querySelector("#startGameButton");
const refreshRankingButton = document.querySelector("#refreshRankingButton");
const themeChoices = document.querySelectorAll("[data-theme-choice]");
const popularityEntry = document.querySelector("#popularityEntry");

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
  initTheme();
  bindEvents();
  updateLiveStatus();
  window.setInterval(updateLiveStatus, 60000);

  try {
    const response = await fetch("./clips.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const clips = await response.json();
    state.clips = Array.isArray(clips) ? clips : fallbackClips;
  } catch (error) {
    state.clips = fallbackClips;
    resultCount.textContent = "clips.json을 불러오지 못해 샘플을 표시합니다.";
  }

  await loadRankings();
  state.activeCategory = "";
  state.activeMode = "clips";
  state.tournament = null;
  renderCategories();
  renderMainPanel();
}

function bindEvents() {
  document.querySelectorAll("[data-close-player]").forEach((element) => {
    element.addEventListener("click", closePlayer);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePlayer();
  });

  themeChoices.forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });

  modeTabs.forEach((button) => {
    button.addEventListener("click", () => {
      state.popularityMode = button.dataset.popularityMode;
      renderPopularity();
    });
  });

  startGameButton.addEventListener("click", startTournament);
  refreshRankingButton.addEventListener("click", loadAndRenderRankings);
  popularityEntry.addEventListener("click", openPopularityPanel);
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  setTheme(savedTheme === "dark" ? "dark" : "light");
}

function setTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);

  themeChoices.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === nextTheme));
  });
}

async function updateLiveStatus() {
  if (!streamLink || !liveBadge) return;

  try {
    const response = await fetch("./api/live-status", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const status = await response.json();
    setLiveStatus(Boolean(status.live));
  } catch (error) {
    setLiveStatus(false);
  }
}

function setLiveStatus(isLive) {
  streamLink.classList.toggle("is-live", isLive);
  streamLink.setAttribute(
    "aria-label",
    isLive ? "드림이 방송 바로가기, 현재 방송 중" : "드림이 방송 바로가기"
  );
  liveBadge.hidden = !isLive;
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
    button.setAttribute("aria-pressed", String(category === state.activeCategory && state.activeMode === "clips"));
    button.addEventListener("click", () => {
      state.activeCategory = category;
      state.activeMode = "clips";
      state.tournament = null;
      renderCategories();
      renderMainPanel();
    });
    categoryBar.append(button);

    const card = document.createElement("button");
    card.className = "category-card";
    card.type = "button";
    card.setAttribute("aria-pressed", String(category === state.activeCategory && state.activeMode === "clips"));
    card.innerHTML = `<strong>${category}</strong><span>${count}개 클립 보기</span>`;
    card.addEventListener("click", () => {
      state.activeCategory = category;
      state.activeMode = "clips";
      state.tournament = null;
      renderCategories();
      renderMainPanel();
      clipGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    categoryGrid.append(card);
  });

  popularityEntry.setAttribute("aria-pressed", String(state.activeMode === "popularity"));
}

function openPopularityPanel() {
  state.activeCategory = POPULARITY_CATEGORY;
  state.activeMode = "popularity";
  renderCategories();
  renderMainPanel();
  clipsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMainPanel() {
  clipGrid.innerHTML = "";

  if (state.activeMode === "popularity") {
    clipGrid.hidden = true;
    popularityPanel.hidden = false;
    clipsPanel.classList.add("is-open");
    emptyState.hidden = true;
    resultCount.textContent = `${POPULARITY_CATEGORY} 카테고리 인기순위를 보고 있습니다.`;
    renderPopularity();
    return;
  }

  popularityPanel.hidden = true;
  clipGrid.hidden = false;
  renderClips();
}

function renderClips() {
  const clips = getFilteredClips();
  clipGrid.innerHTML = "";

  if (!state.activeCategory) {
    emptyState.hidden = true;
    clipsPanel.classList.remove("is-open");
    resultCount.textContent = `카테고리 ${getCategoryCount()}개 중 하나를 선택하세요.`;
    return;
  }

  clipsPanel.classList.add("is-open");
  emptyState.hidden = clips.length > 0;
  resultCount.textContent = `${state.activeCategory} 카테고리에서 ${clips.length}개 클립을 표시 중입니다.`;

  clips.forEach((clip) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const clipOpen = card.querySelector(".clip-open");
    const thumbVideo = card.querySelector(".thumb-video");
    const clipLabel = card.querySelector(".clip-label");

    thumbVideo.src = clip.video ? `${encodeURI(clip.video)}#t=0.1` : "";
    clipLabel.textContent = clip.title || "";
    clipOpen.setAttribute("aria-label", clip.title || "클립 열기");
    clipOpen.addEventListener("click", () => openPlayer(clip));
    clipGrid.append(card);
  });
}

function renderPopularity() {
  modeTabs.forEach((button) => {
    const isSelected = button.dataset.popularityMode === state.popularityMode;
    button.setAttribute("aria-selected", String(isSelected));
  });

  gameView.classList.toggle("is-active", state.popularityMode === "game");
  rankingView.classList.toggle("is-active", state.popularityMode === "ranking");

  if (state.popularityMode === "ranking") {
    renderRanking();
  } else {
    renderTournament();
  }
}

function startTournament() {
  const aegyoClips = shuffle(getAegyoClips());
  if (aegyoClips.length !== 14) {
    resultCount.textContent = `${POPULARITY_CATEGORY} 클립이 14개일 때 게임을 시작할 수 있습니다. 현재 ${aegyoClips.length}개입니다.`;
    return;
  }

  state.tournament = createTournament(aegyoClips);
  renderTournament();
}

function createTournament(clips) {
  const firstMatches = [];
  const byes = clips.slice(12);

  for (let index = 0; index < 12; index += 2) {
    firstMatches.push([clips[index], clips[index + 1]]);
  }

  return {
    id: crypto.randomUUID(),
    roundSize: 14,
    currentMatches: firstMatches,
    pendingByes: byes,
    matchIndex: 0,
    winners: [],
    eliminated: [],
    champion: null,
  };
}

function renderTournament() {
  if (!state.tournament) {
    gameIntro.hidden = false;
    tournamentStage.hidden = true;
    return;
  }

  gameIntro.hidden = true;
  tournamentStage.hidden = false;

  if (state.tournament.champion) {
    roundLabel.textContent = "완료";
    matchLabel.textContent = "최종 선택 완료";
    matchBoard.innerHTML = "";
    const championCard = createMatchCard(state.tournament.champion, "최종 1위");
    championCard.addEventListener("click", () => openPlayer(state.tournament.champion));
    matchBoard.append(championCard);
    return;
  }

  const match = state.tournament.currentMatches[state.tournament.matchIndex];
  roundLabel.textContent = getRoundLabel(state.tournament.roundSize);
  matchLabel.textContent = `${state.tournament.matchIndex + 1} / ${state.tournament.currentMatches.length}`;
  matchBoard.innerHTML = "";

  match.forEach((clip) => {
    const card = createMatchCard(clip, "선택하기");
    card.addEventListener("click", () => chooseTournamentWinner(clip));
    matchBoard.append(card);
  });
}

function createMatchCard(clip, actionText) {
  const card = document.createElement("button");
  card.className = "match-card";
  card.type = "button";
  card.innerHTML = `
    <video muted preload="metadata" playsinline src="${clip.video ? `${encodeURI(clip.video)}#t=0.1` : ""}"></video>
    <strong>${escapeHtml(clip.title || "제목 없는 클립")}</strong>
  `;
  card.setAttribute("aria-label", `${clip.title || "클립"} ${actionText}`);
  return card;
}

async function chooseTournamentWinner(winnerClip) {
  const tournament = state.tournament;
  if (!tournament || tournament.champion) return;

  const currentMatch = tournament.currentMatches[tournament.matchIndex];
  const loserClip = currentMatch.find((clip) => getClipKey(clip) !== getClipKey(winnerClip));
  tournament.winners.push(winnerClip);
  if (loserClip) tournament.eliminated.unshift(loserClip);
  tournament.matchIndex += 1;

  if (tournament.matchIndex >= tournament.currentMatches.length) {
    const nextRoundClips = [...tournament.winners, ...tournament.pendingByes];
    tournament.pendingByes = [];
    tournament.winners = [];
    tournament.matchIndex = 0;

    if (nextRoundClips.length === 1) {
      tournament.champion = nextRoundClips[0];
      await finishTournament(tournament);
      return;
    }

    tournament.roundSize = nextRoundClips.length;
    tournament.currentMatches = pairClips(nextRoundClips);
  }

  renderTournament();
}

async function finishTournament(tournament) {
  const orderedClips = [tournament.champion, ...tournament.eliminated].slice(0, 14);
  const results = orderedClips.map((clip, index) => ({
    clipKey: getClipKey(clip),
    clipTitle: clip.title || "제목 없는 클립",
    clipUrl: clip.url || "",
    videoPath: clip.video || "",
    category: clip.category || POPULARITY_CATEGORY,
    placement: index + 1,
    points: Math.max(15 - (index + 1), 1),
  }));

  const saved = await submitTournamentResults(tournament.id, results);
  if (!saved) saveLocalResults(results);
  if (saved) {
    await loadRankings();
  } else {
    state.ranking = getLocalRanking();
    state.rankingSource = "local";
  }

  state.popularityMode = "ranking";
  state.tournament = null;
  renderPopularity();
  resultCount.textContent = saved
    ? "인기순위 게임 결과를 전체 랭킹에 반영했습니다."
    : "공유 저장소 연결 전이라 이 브라우저의 임시 랭킹에 반영했습니다.";
}

function pairClips(clips) {
  const pairs = [];
  for (let index = 0; index < clips.length; index += 2) {
    pairs.push([clips[index], clips[index + 1]]);
  }
  return pairs;
}

function getRoundLabel(roundSize) {
  if (roundSize === 14) return "14강";
  if (roundSize === 8) return "8강";
  if (roundSize === 4) return "4강";
  if (roundSize === 2) return "2강";
  return `${roundSize}강`;
}

async function loadAndRenderRankings() {
  await loadRankings();
  renderRanking();
}

async function loadRankings() {
  try {
    const response = await fetch(`./api/popularity?gameKey=${POPULARITY_GAME_KEY}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.rankings)) throw new Error("Invalid ranking payload");
    state.ranking = payload.rankings;
    state.rankingSource = payload.source || "shared";
  } catch (error) {
    state.ranking = getLocalRanking();
    state.rankingSource = "local";
  }
}

async function submitTournamentResults(tournamentId, results) {
  if (state.rankingSource === "local") {
    return false;
  }

  try {
    const response = await fetch("./api/popularity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        gameKey: POPULARITY_GAME_KEY,
        tournamentId,
        results,
      })
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

function saveLocalResults(results) {
  const stored = readLocalScores();
  results.forEach((result) => {
    const current = stored[result.clipKey] || {
      clipKey: result.clipKey,
      clipTitle: result.clipTitle,
      clipUrl: result.clipUrl,
      videoPath: result.videoPath,
      category: result.category,
      totalPoints: 0,
      playCount: 0,
      championCount: 0,
      placementTotal: 0,
    };

    current.totalPoints += result.points;
    current.playCount += 1;
    current.championCount += result.placement === 1 ? 1 : 0;
    current.placementTotal += result.placement;
    stored[result.clipKey] = current;
  });

  localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(stored));
}

function getLocalRanking() {
  return Object.values(readLocalScores())
    .map((item) => ({
      clipKey: item.clipKey,
      clipTitle: item.clipTitle,
      clipUrl: item.clipUrl,
      videoPath: item.videoPath,
      category: item.category,
      totalPoints: item.totalPoints,
      playCount: item.playCount,
      championCount: item.championCount,
      averagePlacement: item.playCount > 0 ? item.placementTotal / item.playCount : 0,
    }))
    .sort(compareRankingItems)
    .slice(0, 5);
}

function readLocalScores() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_RANKING_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function renderRanking() {
  rankingList.innerHTML = "";

  if (state.ranking.length === 0) {
    const empty = document.createElement("li");
    empty.className = "ranking-empty";
    empty.textContent = state.rankingSource === "local"
      ? "아직 이 브라우저에 저장된 인기순위 게임 결과가 없습니다."
      : "아직 전체 인기순위 데이터가 없습니다.";
    rankingList.append(empty);
    return;
  }

  state.ranking.slice(0, 5).forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "ranking-row";
    row.innerHTML = `
      <span class="ranking-rank">${index + 1}</span>
      <video class="ranking-thumb" muted preload="metadata" playsinline src="${item.videoPath ? `${encodeURI(item.videoPath)}#t=0.1` : ""}"></video>
      <span class="ranking-title">
        <strong>${escapeHtml(item.clipTitle || "제목 없는 클립")}</strong>
        <span>${state.rankingSource === "local" ? "임시 랭킹" : "전체 유저 랭킹"}</span>
      </span>
      <span class="ranking-score">${Number(item.totalPoints || 0).toLocaleString()}점</span>
    `;
    row.addEventListener("click", () => openPlayer(rankingItemToClip(item)));
    rankingList.append(row);
  });
}

function compareRankingItems(a, b) {
  return (
    Number(b.totalPoints || 0) - Number(a.totalPoints || 0) ||
    Number(b.championCount || 0) - Number(a.championCount || 0) ||
    Number(a.averagePlacement || 999) - Number(b.averagePlacement || 999) ||
    String(a.clipTitle || "").localeCompare(String(b.clipTitle || ""), "ko")
  );
}

function rankingItemToClip(item) {
  const found = state.clips.find((clip) => getClipKey(clip) === item.clipKey);
  return found || {
    title: item.clipTitle,
    category: item.category || POPULARITY_CATEGORY,
    url: item.clipUrl || "#",
    video: item.videoPath || "",
  };
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

function getAegyoClips() {
  return state.clips.filter((clip) => (clip.category || "미분류") === POPULARITY_CATEGORY);
}

function getCategoryCount() {
  return new Set(state.clips.map((clip) => clip.category || "미분류")).size;
}

function getClipKey(clip) {
  return clip.url || clip.video || clip.title || crypto.randomUUID();
}

function shuffle(items) {
  const nextItems = [...items];
  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }
  return nextItems;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
