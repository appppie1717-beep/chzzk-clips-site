// 애교 클립 인기순위 결과를 Supabase에 저장하고 조회하는 Vercel 서버리스 함수입니다.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE_NAME = "clip_popularity_results";
const DEFAULT_GAME_KEY = "aegyo";
const POPULARITY_CATEGORY = "애교";
const clips = require("../clips.json");
const allowedClips = clips.filter((clip) => clip.category === POPULARITY_CATEGORY);
const allowedClipByKey = new Map(allowedClips.map((clip) => [getClipKey(clip), clip]));

module.exports = async function handler(request, response) {
  setJsonHeaders(response);

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    response.status(503).json({
      error: "Supabase environment variables are not configured",
      rankings: [],
      source: "unconfigured"
    });
    return;
  }

  try {
    if (request.method === "GET") {
      await handleGet(request, response);
      return;
    }

    if (request.method === "POST") {
      await handlePost(request, response);
      return;
    }

    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    response.status(500).json({ error: "Popularity API failed" });
  }
};

async function handleGet(request, response) {
  const gameKey = getQueryValue(request, "gameKey") || DEFAULT_GAME_KEY;
  const rpcResponse = await supabaseFetch("/rest/v1/rpc/get_clip_popularity_top", {
    method: "POST",
    body: JSON.stringify({
      target_game_key: gameKey,
      limit_count: 5
    })
  });

  if (!rpcResponse.ok) {
    response.status(rpcResponse.status).json({ error: "Unable to load rankings" });
    return;
  }

  const rows = await rpcResponse.json();
  response.status(200).json({
    rankings: rows.map(mapRankingRow),
    source: "shared"
  });
}

async function handlePost(request, response) {
  const body = await readJsonBody(request);
  const gameKey = body.gameKey || DEFAULT_GAME_KEY;
  const tournamentId = body.tournamentId;
  const results = Array.isArray(body.results) ? body.results : [];

  if (!isUuid(tournamentId) || gameKey !== DEFAULT_GAME_KEY || results.length !== allowedClips.length) {
    response.status(400).json({ error: "Invalid popularity result payload" });
    return;
  }

  let rows;
  try {
    rows = normalizeResults(gameKey, tournamentId, results);
  } catch (error) {
    response.status(400).json({ error: "Invalid popularity result item" });
    return;
  }

  const insertResponse = await supabaseFetch(`/rest/v1/${TABLE_NAME}`, {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify(rows)
  });

  if (!insertResponse.ok) {
    response.status(insertResponse.status).json({ error: "Unable to save popularity result" });
    return;
  }

  response.status(201).json({ ok: true });
}

function setJsonHeaders(response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
}

function getQueryValue(request, key) {
  const host = request.headers.host || "localhost";
  const url = new URL(request.url, `https://${host}`);
  return url.searchParams.get(key);
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

async function supabaseFetch(path, options) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}${path}`;
  const headers = {
    apikey: SUPABASE_SECRET_KEY,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  return fetch(url, {
    ...options,
    headers
  });
}

function mapRankingRow(row) {
  return {
    clipKey: row.clip_key,
    clipTitle: row.clip_title,
    clipUrl: row.clip_url,
    videoPath: row.video_path,
    category: row.category,
    totalPoints: Number(row.total_points || 0),
    playCount: Number(row.play_count || 0),
    championCount: Number(row.champion_count || 0),
    averagePlacement: Number(row.average_placement || 0)
  };
}

function normalizeResults(gameKey, tournamentId, results) {
  const seenKeys = new Set();
  const seenPlacements = new Set();

  const rows = results.map((result) => {
    const clipKey = normalizeText(result.clipKey);
    const placement = requirePlacement(result.placement);
    const clip = allowedClipByKey.get(clipKey);

    if (!clip || seenKeys.has(clipKey) || seenPlacements.has(placement)) {
      throw new Error("Invalid tournament result");
    }

    seenKeys.add(clipKey);
    seenPlacements.add(placement);

    return {
      game_key: gameKey,
      tournament_id: tournamentId,
      clip_key: clipKey,
      clip_title: clip.title || "제목 없는 클립",
      clip_url: clip.url || "",
      video_path: clip.video || "",
      category: clip.category || POPULARITY_CATEGORY,
      placement,
      points: pointsForPlacement(placement)
    };
  });

  if (seenKeys.size !== allowedClips.length || seenPlacements.size !== allowedClips.length) {
    throw new Error("Incomplete tournament result");
  }

  return rows;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requirePlacement(value) {
  const placement = Number(value);
  if (!Number.isInteger(placement) || placement < 1 || placement > 14) {
    throw new Error("Invalid placement");
  }
  return placement;
}

function pointsForPlacement(placement) {
  return Math.max(15 - placement, 1);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function getClipKey(clip) {
  return clip.url || clip.video || clip.title || "";
}
