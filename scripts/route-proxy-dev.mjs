import { createServer } from "node:http";

const port = Number(process.env.PORT || 8787);

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(from, to) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTimeLabel(hour) {
  if (hour >= 1 && hour < 6) return "심야";
  if ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20)) return "출퇴근";
  if (hour >= 11 && hour < 14) return "점심";
  if (hour >= 20 && hour < 24) return "저녁";
  return "일반";
}

function routeDistanceMultiplier(straightDistance) {
  if (straightDistance >= 30) return 1.12;
  if (straightDistance >= 12) return 1.18;
  if (straightDistance >= 5) return 1.25;
  return 1.38;
}

function estimateFreeFlowSpeed(drivingDistance) {
  if (drivingDistance >= 35) return 72;
  if (drivingDistance >= 15) return 58;
  if (drivingDistance >= 5) return 44;
  return 32;
}

function estimateRouteSpeed(drivingDistance, timeLabel) {
  const freeFlowSpeed = estimateFreeFlowSpeed(drivingDistance);
  const multipliers = {
    심야: 1.06,
    일반: 0.95,
    점심: 0.9,
    저녁: 0.92,
    출퇴근: drivingDistance >= 20 ? 0.82 : 0.72,
  };

  return Math.max(16, freeFlowSpeed * (multipliers[timeLabel] || 0.92));
}

function delayDifficultyFromRate(delayRate, timeLabel) {
  const rushPenalty = timeLabel === "출퇴근" ? 6 : 0;
  return clamp(Math.round(delayRate * 0.72 + rushPenalty));
}

function estimateRoute(payload) {
  const origin = payload?.origin;
  const destination = payload?.destination;
  const departureHour = Number.isFinite(Number(payload?.departureHour))
    ? Number(payload.departureHour)
    : new Date().getHours();

  if (!Number.isFinite(origin?.lat) || !Number.isFinite(origin?.lng)) {
    throw new Error("origin.lat and origin.lng are required");
  }

  if (!Number.isFinite(destination?.lat) || !Number.isFinite(destination?.lng)) {
    throw new Error("destination.lat and destination.lng are required");
  }

  const timeLabel = getTimeLabel(departureHour);
  const straightDistance = distanceKm(origin, destination);
  const drivingDistance = Math.max(straightDistance * routeDistanceMultiplier(straightDistance), 0.6);
  const freeFlowSpeed = estimateFreeFlowSpeed(drivingDistance);
  const expectedSpeed = estimateRouteSpeed(drivingDistance, timeLabel);
  const expectedMinutes = Math.max(4, Math.round((drivingDistance / expectedSpeed) * 60));
  const freeFlowMinutes = Math.max(3, Math.round((drivingDistance / freeFlowSpeed) * 60));
  const delayRate = clamp(Math.round(((expectedMinutes - freeFlowMinutes) / freeFlowMinutes) * 100), 0, 160);

  return {
    source: "개발용 경로 프록시",
    drivingDistance: Number(drivingDistance.toFixed(1)),
    expectedMinutes,
    freeFlowMinutes,
    delayRate,
    difficulty: delayDifficultyFromRate(delayRate, timeLabel),
    timeLabel,
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/route-estimate") {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  try {
    const payload = await readJson(request);
    sendJson(response, 200, estimateRoute(payload));
  } catch (error) {
    sendJson(response, 400, { error: "bad_request", message: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Route proxy dev server listening on http://127.0.0.1:${port}/route-estimate`);
});
