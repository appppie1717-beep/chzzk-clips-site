// 애교 클립 인기순위 결과를 Supabase에 저장하고 조회하는 Vercel 서버리스 함수입니다.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE_NAME = "clip_popularity_results";
const DEFAULT_GAME_KEY = "aegyo";

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

  if (!isUuid(tournamentId) || gameKey !== DEFAULT_GAME_KEY || results.length === 0 || results.length > 14) {
    response.status(400).json({ error: "Invalid popularity result payload" });
    return;
  }

  let rows;
  try {
    rows = results.map((result) => ({
      game_key: gameKey,
      tournament_id: tournamentId,
      clip_key: requireText(result.clipKey, "clipKey"),
      clip_title: requireText(result.clipTitle, "clipTitle"),
      clip_url: normalizeText(result.clipUrl),
      video_path: normalizeText(result.videoPath),
      category: normalizeText(result.category) || "애교",
      placement: requirePlacement(result.placement),
      points: requirePoints(result.points)
    }));
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

function requireText(value, fieldName) {
  const normalized = normalizeText(value);
  if (!normalized) throw new Error(`Missing ${fieldName}`);
  return normalized.slice(0, 500);
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

function requirePoints(value) {
  const points = Number(value);
  if (!Number.isInteger(points) || points < 0 || points > 14) {
    throw new Error("Invalid points");
  }
  return points;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}
