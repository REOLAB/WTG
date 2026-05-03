const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

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

function estimateLocalRouteSpeed(drivingDistance, label) {
  const freeFlowSpeed = estimateFreeFlowSpeed(drivingDistance);
  const multipliers = {
    심야: 1.06,
    일반: 0.95,
    점심: 0.9,
    저녁: 0.92,
    출퇴근: drivingDistance >= 20 ? 0.82 : 0.72,
  };

  return Math.max(16, freeFlowSpeed * (multipliers[label] || 0.92));
}

function estimateMinutes(origin, destination, label = "일반") {
  const straightDistance = distanceKm(origin, destination);
  const drivingDistance = Math.max(straightDistance * routeDistanceMultiplier(straightDistance), 0.6);
  const speed = estimateLocalRouteSpeed(drivingDistance, label);
  return Math.max(4, Math.round((drivingDistance / speed) * 60));
}

const cases = [
  {
    name: "서울역-판교 장거리 일반",
    origin: { lat: 37.5547, lng: 126.9706 },
    destination: { lat: 37.3947, lng: 127.1112 },
    label: "일반",
    maxMinutes: 65,
  },
  {
    name: "서울역-판교 장거리 출퇴근",
    origin: { lat: 37.5547, lng: 126.9706 },
    destination: { lat: 37.3947, lng: 127.1112 },
    label: "출퇴근",
    maxMinutes: 78,
  },
  {
    name: "성수-강남 단거리 출퇴근",
    origin: { lat: 37.5446, lng: 127.0557 },
    destination: { lat: 37.4979, lng: 127.0276 },
    label: "출퇴근",
    maxMinutes: 35,
  },
];

for (const item of cases) {
  const minutes = estimateMinutes(item.origin, item.destination, item.label);
  if (minutes > item.maxMinutes) {
    console.error(`Estimate check failed: ${item.name} expected <= ${item.maxMinutes}m, got ${minutes}m`);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log("Estimate check passed");
}
