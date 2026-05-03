const places = [
  {
    id: "seongsu",
    name: "성수 카페거리",
    address: "서울 성동구 성수동2가",
    category: "상권",
    coord: { lat: 37.5446, lng: 127.0557 },
    marker: { x: 58, y: 44 },
    data: { roadFlow: 72, delay: 66, place: 74, time: 61 },
    available: { road: true, route: true, place: true, pattern: true },
  },
  {
    id: "gangnam",
    name: "강남역",
    address: "서울 강남구 역삼동",
    category: "환승/상권",
    coord: { lat: 37.4979, lng: 127.0276 },
    marker: { x: 54, y: 38 },
    data: { roadFlow: 84, delay: 78, place: 81, time: 76 },
    available: { road: true, route: true, place: true, pattern: true },
  },
  {
    id: "hongdae",
    name: "홍대입구역",
    address: "서울 마포구 동교동",
    category: "상권/관광",
    coord: { lat: 37.5572, lng: 126.9245 },
    marker: { x: 45, y: 51 },
    data: { roadFlow: 63, delay: 58, place: 69, time: 72 },
    available: { road: true, route: true, place: true, pattern: true },
  },
  {
    id: "lotteworld",
    name: "롯데월드",
    address: "서울 송파구 올림픽로",
    category: "관광/시설",
    coord: { lat: 37.5111, lng: 127.0982 },
    marker: { x: 66, y: 47 },
    data: { roadFlow: 70, delay: 73, place: 77, time: 59 },
    available: { road: true, route: true, place: true, pattern: true },
  },
  {
    id: "incheon-airport",
    name: "인천국제공항 제1터미널",
    address: "인천 중구 공항로",
    category: "공항",
    coord: { lat: 37.4602, lng: 126.4407 },
    marker: { x: 38, y: 46 },
    data: { roadFlow: 49, delay: 43, place: 57, time: 52 },
    available: { road: true, route: true, place: false, pattern: true },
  },
  {
    id: "haeundae",
    name: "해운대 해수욕장",
    address: "부산 해운대구 우동",
    category: "관광",
    coord: { lat: 35.1587, lng: 129.1604 },
    marker: { x: 60, y: 57 },
    data: { roadFlow: 54, delay: 61, place: 67, time: 64 },
    available: { road: true, route: true, place: false, pattern: true },
  },
];

const weights = {
  roadFlow: 50,
  delay: 25,
  place: 15,
  time: 10,
};

const factorMeta = {
  roadFlow: {
    title: "주변 도로 흐름",
    short: "도로",
    description: "목적지 반경 안의 주요 진입도로 속도와 정체 정도",
  },
  delay: {
    title: "예상 지연률",
    short: "지연",
    description: "평시 대비 도착 소요시간이 얼마나 늘어났는지",
  },
  place: {
    title: "장소 혼잡",
    short: "장소",
    description: "지원 지역의 인구/장소 혼잡도",
  },
  time: {
    title: "시간대 패턴",
    short: "패턴",
    description: "요일과 현재 시간대의 방문 수요 경향",
  },
};

const serviceProfiles = [
  {
    name: "네이버지도",
    source: "지도/검색 기준",
    note: "공개 주행 차량 수 대신 주변 도로와 목적지 특성을 표시합니다.",
    bias: -2,
  },
  {
    name: "TMAP",
    source: "교통/경로 기준",
    note: "경로 지연과 도로 혼잡에 더 큰 비중을 둔 표시입니다.",
    bias: 4,
  },
  {
    name: "카카오내비",
    source: "장소/이동 기준",
    note: "장소 검색과 시간대 패턴을 함께 보는 표시입니다.",
    bias: 1,
  },
];

const categoryProfiles = [
  { keywords: ["공항", "터미널"], multiplier: 0.92, crowdBase: 54, peakHours: [7, 8, 9, 17, 18, 19] },
  { keywords: ["역", "환승"], multiplier: 0.95, crowdBase: 62, peakHours: [8, 9, 18, 19] },
  { keywords: ["상권", "카페", "음식점"], multiplier: 1.0, crowdBase: 68, peakHours: [12, 13, 18, 19, 20] },
  { keywords: ["관광", "시설"], multiplier: 1.0, crowdBase: 64, peakHours: [13, 14, 15, 16] },
  { keywords: ["학교", "병원", "공공기관"], multiplier: 0.82, crowdBase: 44, peakHours: [9, 10, 14, 15] },
];

const MAX_AUTO_LOCATION_ACCURACY_M = 1000;

let selectedPlace = places[0];
let currentResults = places.slice(0, 4);
let kakaoMap = null;
let kakaoMarker = null;
let kakaoUserMarker = null;
let kakaoPlaces = null;
let kakaoScriptPromise = null;
let kakaoScriptElement = null;
let relayoutTimer = null;
let activeTrafficRequestId = 0;
let activeRouteRequestId = 0;
let selectedDepartureHour = null;
let userLocation = null;
let diagnostics = {
  kakaoKey: "확인 중",
  kakaoMap: "대기 중",
  itsKey: "확인 중",
  itsTraffic: "대기 중",
  routeApi: "미설정",
  location: "확인 중",
};

const elements = {
  quickList: document.querySelector("#quickList"),
  resultList: document.querySelector("#resultList"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  originForm: document.querySelector("#originForm"),
  originInput: document.querySelector("#originInput"),
  placeName: document.querySelector("#placeName"),
  placeAddress: document.querySelector("#placeAddress"),
  scoreRing: document.querySelector("#scoreRing"),
  scoreValue: document.querySelector("#scoreValue"),
  levelPill: document.querySelector("#levelPill"),
  confidencePill: document.querySelector("#confidencePill"),
  summaryText: document.querySelector("#summaryText"),
  travelTimeValue: document.querySelector("#travelTimeValue"),
  travelTimeMeta: document.querySelector("#travelTimeMeta"),
  sheetTravelTimeValue: document.querySelector("#sheetTravelTimeValue"),
  sheetTravelTimeMeta: document.querySelector("#sheetTravelTimeMeta"),
  factorGrid: document.querySelector("#factorGrid"),
  serviceGrid: document.querySelector("#serviceGrid"),
  mockMap: document.querySelector("#mockMap"),
  kakaoMap: document.querySelector("#kakaoMap"),
  currentLocationMarker: document.querySelector("#currentLocationMarker"),
  updatedAt: document.querySelector("#updatedAt"),
  locateButton: document.querySelector("#locateButton"),
  modeStatus: document.querySelector("#modeStatus"),
  diagnosticsRetry: document.querySelector("#diagnosticsRetry"),
  diagOrigin: document.querySelector("#diagOrigin"),
  diagKakaoKey: document.querySelector("#diagKakaoKey"),
  diagKakaoMap: document.querySelector("#diagKakaoMap"),
  diagItsKey: document.querySelector("#diagItsKey"),
  diagItsTraffic: document.querySelector("#diagItsTraffic"),
  diagRouteApi: document.querySelector("#diagRouteApi"),
  diagLocation: document.querySelector("#diagLocation"),
  departureOptions: document.querySelector("#departureOptions"),
  departureLabel: document.querySelector("#departureLabel"),
};

function setModeStatus(message, tone = "info") {
  elements.modeStatus.textContent = message;
  elements.modeStatus.dataset.tone = tone;
}

function formatOrigin() {
  if (window.location.protocol === "file:") return "file:// 직접 실행";
  return window.location.origin;
}

function renderDiagnostics() {
  elements.diagOrigin.textContent = formatOrigin();
  elements.diagKakaoKey.textContent = diagnostics.kakaoKey;
  elements.diagKakaoMap.textContent = diagnostics.kakaoMap;
  elements.diagItsKey.textContent = diagnostics.itsKey;
  elements.diagItsTraffic.textContent = diagnostics.itsTraffic;
  elements.diagRouteApi.textContent = diagnostics.routeApi;
  elements.diagLocation.textContent = diagnostics.location;
}

function updateDiagnostics(next) {
  diagnostics = { ...diagnostics, ...next };
  renderDiagnostics();
}

function refreshConfigDiagnostics() {
  updateDiagnostics({
    kakaoKey: window.APP_CONFIG?.KAKAO_JAVASCRIPT_KEY?.trim() ? "설정됨" : "미설정",
    itsKey: getItsTrafficKey() ? "설정됨" : "미설정",
    routeApi: getRouteProxyUrl() ? "설정됨" : "미설정",
    location: getLocationApiStatus(),
  });
}

function getLocationApiStatus() {
  if (!navigator.geolocation) return "미지원";
  if (window.isSecureContext) return "사용 가능";
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return "사용 가능";
  return "보안 컨텍스트 필요";
}

function getGeolocationErrorMessage(error) {
  if (error?.code === error.PERMISSION_DENIED) return "위치 권한이 거부되었습니다";
  if (error?.code === error.POSITION_UNAVAILABLE) return "현재 위치를 확인할 수 없습니다";
  if (error?.code === error.TIMEOUT) return "위치 확인 시간이 초과되었습니다";
  return "위치 확인에 실패했습니다";
}

function isUsableOrigin(origin = userLocation) {
  if (!origin) return false;
  if (origin.source === "manual") return true;
  return !origin.accuracy || origin.accuracy <= MAX_AUTO_LOCATION_ACCURACY_M;
}

function formatOriginLabel(origin) {
  if (!origin) return "";
  if (origin.label) return origin.label;
  if (origin.accuracy) return `현재 위치 · 정확도 약 ${Math.round(origin.accuracy)}m`;
  return "현재 위치";
}

function getRouteProxyUrl() {
  return window.APP_CONFIG?.ROUTE_PROXY_URL?.trim() || "";
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function availableKeys(place) {
  return Object.keys(weights).filter((key) => {
    if (key === "roadFlow") return place.available.road;
    if (key === "delay") return place.available.route;
    if (key === "place") return place.available.place;
    return place.available.pattern;
  });
}

function calculateScore(place) {
  const keys = availableKeys(place);
  const totalWeight = keys.reduce((sum, key) => sum + weights[key], 0);
  const baseScore = keys.reduce((sum, key) => sum + place.data[key] * (weights[key] / totalWeight), 0);
  return Math.round(applyContextAdjustment(baseScore, place));
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

function estimateRoute(place, origin = userLocation) {
  if (!origin || !isUsableOrigin(origin) || !place.coord) return null;

  const straightDistance = distanceKm(origin, place.coord);
  const drivingDistance = Math.max(straightDistance * 1.32, 0.6);
  const timeProfile = getTimeProfile();
  const liveSpeed = place.liveTraffic?.avgSpeed;
  const baseSpeed =
    liveSpeed && isCurrentDeparture()
      ? liveSpeed
      : timeProfile.label === "출퇴근"
        ? 24
        : timeProfile.label === "심야"
          ? 46
          : 32;
  const expectedMinutes = Math.max(4, Math.round((drivingDistance / Math.max(baseSpeed, 10)) * 60));
  const freeFlowMinutes = Math.max(3, Math.round((drivingDistance / 46) * 60));
  const delayRate = clamp(Math.round(((expectedMinutes - freeFlowMinutes) / freeFlowMinutes) * 100), 0, 160);
  const difficulty = clamp(Math.round(delayRate * 0.58 + drivingDistance * 1.8 + (timeProfile.label === "출퇴근" ? 12 : 0)));

  return {
    drivingDistance,
    expectedMinutes,
    freeFlowMinutes,
    delayRate,
    difficulty,
    source: liveSpeed && isCurrentDeparture() ? "현재 위치 + ITS 속도" : "현재 위치 + 시간대 추정",
    type: "local",
  };
}

function applyRouteEstimate(place) {
  const routeEstimate = estimateRoute(place);
  if (!routeEstimate) return false;

  place.routeEstimate = routeEstimate;
  place.data.delay = routeEstimate.difficulty;
  place.available.route = true;
  return true;
}

function normalizeRoutePayload(payload) {
  const expectedMinutes = Number(payload?.expectedMinutes ?? payload?.durationMinutes ?? payload?.duration_min);
  const freeFlowMinutes = Number(payload?.freeFlowMinutes ?? payload?.freeflowMinutes ?? payload?.free_flow_minutes);
  const drivingDistance = Number(payload?.drivingDistance ?? payload?.distanceKm ?? payload?.distance_km);
  const delayRate = Number(payload?.delayRate ?? payload?.delay_rate);
  const difficulty = Number(payload?.difficulty);

  if (!Number.isFinite(expectedMinutes) || !Number.isFinite(drivingDistance)) return null;

  const safeFreeFlow = Number.isFinite(freeFlowMinutes) ? freeFlowMinutes : Math.max(3, Math.round((drivingDistance / 46) * 60));
  const safeDelayRate = Number.isFinite(delayRate)
    ? delayRate
    : clamp(Math.round(((expectedMinutes - safeFreeFlow) / safeFreeFlow) * 100), 0, 160);

  return {
    drivingDistance,
    expectedMinutes,
    freeFlowMinutes: safeFreeFlow,
    delayRate: safeDelayRate,
    difficulty: Number.isFinite(difficulty)
      ? clamp(Math.round(difficulty))
      : clamp(Math.round(safeDelayRate * 0.58 + drivingDistance * 1.8)),
    source: payload?.source || "경로 API",
    type: "proxy",
  };
}

async function fetchRouteProxyEstimate(place, origin, signal) {
  const url = getRouteProxyUrl();
  if (!url || !origin || !place.coord) return null;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: place.coord.lat, lng: place.coord.lng },
      departureHour: getCurrentHour(),
      place: { id: place.id, name: place.name, category: place.category },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Route proxy request failed: ${response.status}`);
  }

  return normalizeRoutePayload(await response.json());
}

async function refreshRouteEstimate(place) {
  const requestId = ++activeRouteRequestId;
  const origin = userLocation;

  if (!getRouteProxyUrl()) {
    updateDiagnostics({ routeApi: "미설정" });
    return;
  }

  if (!origin || !isUsableOrigin(origin) || !place.coord) {
    updateDiagnostics({ routeApi: "출발지/목적지 대기" });
    return;
  }

  updateDiagnostics({ routeApi: "조회 중" });

  try {
    const routeEstimate = await fetchRouteProxyEstimate(place, origin);
    if (requestId !== activeRouteRequestId || selectedPlace.id !== place.id) return;
    if (!routeEstimate) {
      updateDiagnostics({ routeApi: "응답 없음" });
      return;
    }

    place.routeEstimate = routeEstimate;
    place.data.delay = routeEstimate.difficulty;
    place.available.route = true;
    renderPlace(place);
    updateDiagnostics({ routeApi: `${routeEstimate.expectedMinutes}분 · ${routeEstimate.drivingDistance.toFixed(1)}km` });
  } catch (error) {
    if (requestId !== activeRouteRequestId) return;
    console.warn(error?.message || "Route proxy failed");
    updateDiagnostics({ routeApi: "조회 실패" });
  }
}

function getCurrentHour() {
  return selectedDepartureHour ?? new Date().getHours();
}

function getTimeProfile(hour = getCurrentHour()) {
  if (hour >= 1 && hour < 6) {
    return {
      label: "심야",
      multiplier: 0.48,
      offset: -10,
      reason: "심야 시간대라 일반 방문 수요와 주변 도로 혼잡을 낮게 보정했습니다.",
    };
  }

  if ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20)) {
    return {
      label: "출퇴근",
      multiplier: 1.16,
      offset: 8,
      reason: "출퇴근 시간대라 진입 지연 가능성을 높게 보정했습니다.",
    };
  }

  if (hour >= 11 && hour < 14) {
    return {
      label: "점심",
      multiplier: 1.04,
      offset: 2,
      reason: "점심 시간대 방문 수요를 약간 반영했습니다.",
    };
  }

  if (hour >= 20 && hour < 24) {
    return {
      label: "저녁",
      multiplier: 0.92,
      offset: -3,
      reason: "저녁 이후에는 출퇴근 정체가 줄어드는 흐름을 반영했습니다.",
    };
  }

  return {
    label: "일반",
    multiplier: 0.88,
    offset: -4,
    reason: "일반 시간대 기준으로 과도한 데모 점수를 낮춰 보정했습니다.",
  };
}

function formatDepartureLabel() {
  if (selectedDepartureHour === null) return "지금";
  return `${String(selectedDepartureHour).padStart(2, "0")}:00`;
}

function isCurrentDeparture() {
  return selectedDepartureHour === null;
}

function getCategoryProfile(place) {
  const text = `${place.name} ${place.category}`.toLowerCase();
  return (
    categoryProfiles.find((profile) => {
      return profile.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    }) || { multiplier: 0.9, crowdBase: 48, peakHours: [12, 18] }
  );
}

function estimatePlaceCrowd(place) {
  const profile = getCategoryProfile(place);
  const hour = getCurrentHour();
  const peakDistance = Math.min(...profile.peakHours.map((peakHour) => Math.abs(peakHour - hour)));
  const peakBoost = peakDistance === 0 ? 18 : peakDistance === 1 ? 10 : peakDistance === 2 ? 4 : -6;
  const weekendBoost = [0, 6].includes(new Date().getDay()) ? 6 : 0;
  const generatedBias = place.id.startsWith("generated") || place.id.startsWith("kakao") ? hashText(place.name) % 9 : 0;
  const difficulty = clamp(Math.round(profile.crowdBase + peakBoost + weekendBoost + generatedBias));

  return {
    difficulty,
    source: "장소 유형 + 시간대 추정",
    reason: `${profile.keywords[0]} 유형 · ${String(hour).padStart(2, "0")}시 기준`,
  };
}

function applyPlaceCrowdEstimate(place) {
  if (place.liveCrowd?.type === "external") return false;

  const crowd = estimatePlaceCrowd(place);
  place.liveCrowd = { ...crowd, type: "local" };
  place.data.place = crowd.difficulty;
  place.available.place = true;
  return true;
}

function applyContextAdjustment(baseScore, place) {
  const timeProfile = getTimeProfile();
  const categoryProfile = getCategoryProfile(place);
  const adjusted = baseScore * timeProfile.multiplier * categoryProfile.multiplier + timeProfile.offset;
  return clamp(adjusted);
}

function getLevel(score) {
  if (score >= 75) return { label: "매우 어려움", color: "#c84f45", tone: "#fde8e5" };
  if (score >= 50) return { label: "어려움", color: "#d8a220", tone: "#fff4d7" };
  if (score >= 25) return { label: "보통", color: "#2f6db5", tone: "#eaf0f8" };
  return { label: "쉬움", color: "#2d8f6f", tone: "#e5f3ec" };
}

function getConfidence(place) {
  if (place.liveTraffic?.sampleCount > 0) {
    return isCurrentDeparture() ? "신뢰도 높음 · 실시간 도로 반영" : "신뢰도 보통 · 현재 도로 참고";
  }

  const count = availableKeys(place).length;
  if (count >= 4) return "신뢰도 높음";
  if (count >= 2) return "신뢰도 보통";
  return "신뢰도 낮음";
}

function describe(place, score) {
  const topFactors = availableKeys(place)
    .map((key) => ({ key, value: place.data[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((item) => factorMeta[item.key].title);

  const level = getLevel(score).label;
  return `${topFactors.join(", ")} 영향이 큽니다. ${getTimeProfile().reason} 현재 기준 도착 난이도는 ${level}입니다.`;
}

function formatTravelTime(routeEstimate) {
  if (!routeEstimate) {
    return {
      value: "출발지 필요",
      meta: "현재 위치 또는 출발지를 적용하세요",
    };
  }

  const minutes = Math.max(1, Math.round(routeEstimate.expectedMinutes));
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  const value = hours > 0 ? `${hours}시간 ${restMinutes}분` : `약 ${minutes}분`;
  const delayText = routeEstimate.delayRate > 0 ? `평시 대비 +${Math.round(routeEstimate.delayRate)}%` : "평시 수준";
  return {
    value,
    meta: `${routeEstimate.source} · ${routeEstimate.drivingDistance.toFixed(1)}km · ${delayText}`,
  };
}

function renderTravelTime(place) {
  const travelTime = formatTravelTime(place.routeEstimate);
  elements.travelTimeValue.textContent = travelTime.value;
  elements.travelTimeMeta.textContent = travelTime.meta;
  elements.sheetTravelTimeValue.textContent = travelTime.value;
  elements.sheetTravelTimeMeta.textContent = travelTime.meta;
}

function renderQuickList() {
  elements.quickList.innerHTML = places
    .slice(0, 5)
    .map((place) => `<button type="button" data-id="${place.id}">${place.name}</button>`)
    .join("");

  elements.quickList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectPlace(places.find((place) => place.id === button.dataset.id)));
  });
}

function renderResults(results = places.slice(0, 4)) {
  currentResults = results;
  elements.resultList.innerHTML = results
    .map(
      (place) => `
        <button class="result-button ${place.id === selectedPlace.id ? "active" : ""}" type="button" data-id="${place.id}">
          <strong>${place.name}</strong>
          <span>${place.address} · ${place.category}</span>
        </button>
      `,
    )
    .join("");

  elements.resultList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectPlace(currentResults.find((place) => place.id === button.dataset.id)));
  });
}

function renderFactors(place) {
  elements.factorGrid.innerHTML = availableKeys(place)
    .map((key) => {
      const value = place.data[key];
      const color = getLevel(value).color;
      const liveNote =
        key === "roadFlow" && place.liveTraffic?.sampleCount > 0
          ? `<p class="factor-note">${isCurrentDeparture() ? "ITS" : "현재 ITS"} 평균 ${Math.round(place.liveTraffic.avgSpeed)}km/h · ${place.liveTraffic.sampleCount}개 구간</p>`
          : "";
      const routeNote =
        key === "delay" && place.routeEstimate
          ? `<p class="factor-note">${place.routeEstimate.source} · 약 ${place.routeEstimate.expectedMinutes}분 · ${place.routeEstimate.drivingDistance.toFixed(1)}km</p>`
          : "";
      const crowdNote =
        key === "place" && place.liveCrowd
          ? `<p class="factor-note">${place.liveCrowd.source} · ${place.liveCrowd.reason}</p>`
          : "";
      return `
        <article class="factor-card">
          <div class="factor-top">
            <strong>${factorMeta[key].title}</strong>
            <span>${value}</span>
          </div>
          <div class="bar" style="--bar-color: ${color}">
            <i style="--value: ${value}"></i>
          </div>
          ${liveNote}
          ${routeNote}
          ${crowdNote}
        </article>
      `;
    })
    .join("");
}

function renderServices(score) {
  elements.serviceGrid.innerHTML = serviceProfiles
    .map((service) => {
      const serviceScore = clamp(score + service.bias + Math.round((selectedPlace.data.delay - 50) * 0.08));
      const level = getLevel(serviceScore);
      return `
        <article class="service-card">
          <div class="service-top">
            <strong>${service.name}</strong>
            <span>${serviceScore}</span>
          </div>
          <div class="bar" style="--bar-color: ${level.color}">
            <i style="--value: ${serviceScore}"></i>
          </div>
          <p>${service.source} · ${level.label}</p>
          <p>${service.note}</p>
        </article>
      `;
    })
    .join("");
}

function renderMap(place) {
  elements.mockMap.style.setProperty("--marker-x", `${place.marker.x}%`);
  elements.mockMap.style.setProperty("--marker-y", `${place.marker.y}%`);

  const roads = document.querySelectorAll(".traffic-road");
  const values = [place.data.delay, place.data.roadFlow, place.data.time];
  roads.forEach((road, index) => {
    road.style.background = getLevel(values[index]).color;
  });

  updateKakaoMap(place);
  updateUserLocationMap(place);
}

function stabilizeKakaoMap(delay = 80) {
  if (!kakaoMap) return;

  clearTimeout(relayoutTimer);
  relayoutTimer = setTimeout(() => {
    kakaoMap.relayout();
    updateKakaoMap(selectedPlace);
  }, delay);
}

function renderPlace(place) {
  applyPlaceCrowdEstimate(place);
  if (place.routeEstimate?.type !== "proxy") {
    applyRouteEstimate(place);
  }

  const score = calculateScore(place);
  const level = getLevel(score);

  elements.placeName.textContent = place.name;
  elements.placeAddress.textContent = `${place.address} · ${place.category}`;
  elements.scoreValue.textContent = score;
  elements.scoreRing.style.setProperty("--score", score);
  elements.scoreRing.style.setProperty("--score-color", level.color);
  elements.levelPill.textContent = level.label;
  elements.levelPill.style.background = level.tone;
  elements.levelPill.style.color = level.color;
  elements.confidencePill.textContent = getConfidence(place);
  elements.summaryText.textContent = describe(place, score);
  elements.updatedAt.textContent = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  elements.departureLabel.textContent = formatDepartureLabel();

  renderTravelTime(place);
  renderFactors(place);
  renderServices(score);
  renderMap(place);
}

function selectPlace(place) {
  if (!place) return;
  selectedPlace = place;
  elements.searchInput.value = place.name;
  const visibleResults = currentResults.some((result) => result.id === place.id) ? currentResults : searchPlaces(place.name);
  renderResults(visibleResults);
  renderPlace(place);
  refreshRouteEstimate(place);
  refreshLiveTraffic(place);
}

function hashText(text) {
  return Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function createGeneratedPlace(query) {
  const seed = hashText(query);
  const timeProfile = getTimeProfile();
  const quietBias = timeProfile.label === "심야" ? -18 : 0;
  const roadFlow = clamp(35 + (seed % 48) + quietBias);
  const delay = clamp(30 + ((seed * 3) % 52) + quietBias);
  const place = clamp(28 + ((seed * 5) % 55) + quietBias);
  const time = clamp(35 + ((seed * 7) % 50) + quietBias);
  return {
    id: `generated-${seed}`,
    name: query,
    address: "검색어 기반 데모 목적지",
    category: "사용자 검색",
    coord: null,
    marker: { x: 36 + (seed % 34), y: 34 + ((seed * 2) % 28) },
    data: { roadFlow, delay, place, time },
    available: { road: true, route: true, place: false, pattern: true },
  };
}

function createKakaoPlace(item) {
  const seed = hashText(`${item.id}${item.place_name}`);
  const timeProfile = getTimeProfile();
  const quietBias = timeProfile.label === "심야" ? -18 : 0;
  return {
    id: `kakao-${item.id}`,
    name: item.place_name,
    address: item.road_address_name || item.address_name || "주소 정보 없음",
    category: item.category_group_name || item.category_name || "장소",
    coord: { lat: Number(item.y), lng: Number(item.x) },
    marker: { x: 36 + (seed % 34), y: 34 + ((seed * 2) % 28) },
    data: {
      roadFlow: clamp(35 + (seed % 48) + quietBias),
      delay: clamp(30 + ((seed * 3) % 52) + quietBias),
      place: clamp(28 + ((seed * 5) % 55) + quietBias),
      time: clamp(35 + ((seed * 7) % 50) + quietBias),
    },
    available: { road: true, route: true, place: false, pattern: true },
  };
}

function createOriginFromKakaoPlace(item) {
  return {
    lat: Number(item.y),
    lng: Number(item.x),
    accuracy: 100,
    source: "manual",
    label: item.place_name,
  };
}

function searchPlaces(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return places.slice(0, 4);

  const matches = places.filter((place) => {
    const haystack = `${place.name} ${place.address} ${place.category}`.toLowerCase();
    return haystack.includes(normalized);
  });

  return matches.length > 0 ? matches : [createGeneratedPlace(query.trim())];
}

function searchKakaoPlaces(query) {
  if (!kakaoPlaces || !query.trim()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    kakaoPlaces.keywordSearch(query.trim(), (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK) {
        resolve(null);
        return;
      }

      resolve(result.slice(0, 5).map(createKakaoPlace));
    });
  });
}

function searchKakaoOrigin(query) {
  if (!kakaoPlaces || !query.trim()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    kakaoPlaces.keywordSearch(query.trim(), (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !result[0]) {
        resolve(null);
        return;
      }

      resolve(createOriginFromKakaoPlace(result[0]));
    });
  });
}

async function findOrigin(query) {
  const kakaoOrigin = await searchKakaoOrigin(query);
  if (kakaoOrigin) return kakaoOrigin;

  const localMatch = searchPlaces(query).find((place) => place.coord);
  if (!localMatch) return null;

  return {
    ...localMatch.coord,
    accuracy: 100,
    source: "manual",
    label: localMatch.name,
  };
}

function applyOrigin(origin) {
  userLocation = origin;
  elements.originInput.value = formatOriginLabel(origin);
  applyRouteEstimate(selectedPlace);
  updateUserLocationMap(selectedPlace);
  renderPlace(selectedPlace);
  refreshRouteEstimate(selectedPlace);
  refreshLiveTraffic(selectedPlace);
  updateDiagnostics({ location: origin.source === "manual" ? `수동 출발지 · ${origin.label}` : `확인됨 · ${Math.round(origin.accuracy)}m` });
}

async function runOriginSearch(query) {
  const normalized = query.trim();
  if (!normalized) {
    setModeStatus("출발지를 입력하세요", "warning");
    return;
  }

  setModeStatus(kakaoPlaces ? "출발지 검색 중" : "데모 출발지 검색 중", "loading");

  try {
    const origin = await findOrigin(normalized);
    if (!origin) {
      setModeStatus("출발지를 찾지 못했습니다", "warning");
      return;
    }

    applyOrigin(origin);
    setModeStatus(`출발지 적용 · ${origin.label}`, "success");
  } catch (error) {
    console.warn(error?.message || "Origin search failed");
    setModeStatus("출발지 검색에 실패했습니다", "error");
  }
}

async function runSearch(query) {
  setModeStatus(kakaoPlaces ? "Kakao 장소 검색 중" : "데모 검색 중", "loading");

  let kakaoResults = null;
  try {
    kakaoResults = await searchKakaoPlaces(query);
  } catch (error) {
    console.warn(error?.message || "Kakao search failed");
    setModeStatus("Kakao 검색 실패 · 데모 결과 사용", "warning");
  }

  const results = kakaoResults || searchPlaces(query);
  renderResults(results);
  selectPlace(results[0]);

  if (kakaoResults) {
    setModeStatus("Kakao 장소 검색 완료", "success");
  } else if (query.trim()) {
    setModeStatus("데모 결과로 표시 중", "info");
  }
}

function getItsTrafficKey() {
  return window.APP_CONFIG?.ITS_TRAFFIC_API_KEY?.trim() || "";
}

function buildTrafficBounds(coord, radiusDegree = 0.018) {
  return {
    minX: coord.lng - radiusDegree,
    maxX: coord.lng + radiusDegree,
    minY: coord.lat - radiusDegree,
    maxY: coord.lat + radiusDegree,
  };
}

function trafficScoreFromSpeed(avgSpeed) {
  if (avgSpeed >= 60) return 15;
  if (avgSpeed >= 45) return 30;
  if (avgSpeed >= 32) return 48;
  if (avgSpeed >= 22) return 66;
  if (avgSpeed >= 14) return 82;
  return 94;
}

function normalizeItsItems(payload) {
  const items = payload?.body?.items || payload?.response?.body?.items || payload?.items;
  if (Array.isArray(items)) return items;
  if (Array.isArray(items?.item)) return items.item;
  if (items?.item) return [items.item];
  return [];
}

async function fetchItsTraffic(place, signal) {
  const key = getItsTrafficKey();
  if (!key || !place.coord) return null;

  const bounds = buildTrafficBounds(place.coord);
  const params = new URLSearchParams({
    apiKey: key,
    type: "all",
    minX: bounds.minX.toFixed(6),
    maxX: bounds.maxX.toFixed(6),
    minY: bounds.minY.toFixed(6),
    maxY: bounds.maxY.toFixed(6),
    getType: "json",
  });

  const response = await fetch(`https://openapi.its.go.kr:9443/trafficInfo?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`ITS traffic request failed: ${response.status}`);
  }

  const payload = await response.json();
  const speeds = normalizeItsItems(payload)
    .map((item) => Number(item.speed))
    .filter((speed) => Number.isFinite(speed) && speed > 0);

  if (speeds.length === 0) return null;

  const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  return {
    avgSpeed,
    sampleCount: speeds.length,
    source: "ITS 국가교통정보센터",
    difficulty: trafficScoreFromSpeed(avgSpeed),
    updatedAt: new Date(),
  };
}

async function refreshLiveTraffic(place) {
  const requestId = ++activeTrafficRequestId;
  const key = getItsTrafficKey();

  if (!key) {
    updateDiagnostics({ itsTraffic: "키 미설정" });
    return;
  }

  if (!place.coord) {
    updateDiagnostics({ itsTraffic: "좌표 없음" });
    return;
  }

  setModeStatus(kakaoMap ? "Kakao 지도 · 실시간 도로 확인 중" : "실시간 도로 확인 중", "loading");
  updateDiagnostics({ itsTraffic: "조회 중" });

  try {
    const liveTraffic = await fetchItsTraffic(place);
    if (requestId !== activeTrafficRequestId || selectedPlace.id !== place.id) return;

    if (!liveTraffic) {
      setModeStatus(kakaoMap ? "Kakao 지도 · 주변 ITS 구간 없음" : "주변 ITS 구간 없음", "warning");
      updateDiagnostics({ itsTraffic: "주변 구간 없음" });
      applyRouteEstimate(place);
      renderPlace(place);
      return;
    }

    place.liveTraffic = liveTraffic;
    place.data.roadFlow = liveTraffic.difficulty;
    place.available.road = true;
    applyRouteEstimate(place);
    setModeStatus(`Kakao 지도 · ITS ${Math.round(liveTraffic.avgSpeed)}km/h 반영`, "success");
    updateDiagnostics({ itsTraffic: `${Math.round(liveTraffic.avgSpeed)}km/h · ${liveTraffic.sampleCount}개` });
    renderPlace(place);
  } catch (error) {
    if (requestId !== activeTrafficRequestId) return;
    console.warn(error?.message || "ITS traffic failed");
    setModeStatus(kakaoMap ? "Kakao 지도 · 실시간 도로 미반영" : "실시간 도로 미반영", "error");
    updateDiagnostics({ itsTraffic: "조회 실패" });
  }
}

function loadKakaoSdk(key) {
  if (window.kakao?.maps) {
    return Promise.resolve();
  }

  if (kakaoScriptPromise) {
    return kakaoScriptPromise;
  }

  kakaoScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    kakaoScriptElement = script;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      try {
        if (!window.kakao?.maps?.load) {
          reject(new Error("Kakao SDK 객체를 찾을 수 없습니다. JavaScript 키와 허용 도메인을 확인하세요."));
          return;
        }
        window.kakao.maps.load(resolve);
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => {
      reject(new Error("Kakao SDK 스크립트 로드 실패. 네트워크, JavaScript 키, JavaScript SDK domain 설정을 확인하세요."));
    };
    document.head.appendChild(script);
  });

  return kakaoScriptPromise;
}

async function enableKakaoMode(key) {
  if (!key) {
    setModeStatus("데모 모드 · config.js에 Kakao JavaScript 키를 설정하세요", "info");
    updateDiagnostics({ kakaoMap: "키 미설정" });
    return;
  }

  setModeStatus("Kakao 지도 연결 중", "loading");
  updateDiagnostics({ kakaoMap: "연결 중" });

  try {
    await loadKakaoSdk(key);
    const center = new window.kakao.maps.LatLng(selectedPlace.coord.lat, selectedPlace.coord.lng);
    kakaoMap = new window.kakao.maps.Map(elements.kakaoMap, {
      center,
      level: 5,
    });
    kakaoMarker = new window.kakao.maps.Marker({
      map: kakaoMap,
      position: center,
    });
    kakaoPlaces = new window.kakao.maps.services.Places();
    elements.mockMap.classList.add("has-real-map");
    setModeStatus("Kakao 실제 검색 모드 · 서버 없이 동작", "success");
    updateDiagnostics({ kakaoMap: "연결됨" });
    updateKakaoMap(selectedPlace);
    stabilizeKakaoMap(120);
    refreshLiveTraffic(selectedPlace);
  } catch (error) {
    kakaoMap = null;
    kakaoMarker = null;
    kakaoUserMarker = null;
    kakaoPlaces = null;
    kakaoScriptPromise = null;
    if (kakaoScriptElement) {
      kakaoScriptElement.remove();
      kakaoScriptElement = null;
    }
    elements.mockMap.classList.remove("has-real-map");
    setModeStatus("Kakao 연결 실패 · 데모 모드", "error");
    updateDiagnostics({ kakaoMap: "연결 실패" });
    console.warn(error?.message || "Kakao map failed to load");
  }
}

function disableKakaoMode() {
  kakaoMap = null;
  kakaoMarker = null;
  kakaoUserMarker = null;
  kakaoPlaces = null;
  kakaoScriptPromise = null;
  if (kakaoScriptElement) {
    kakaoScriptElement.remove();
    kakaoScriptElement = null;
  }
  elements.mockMap.classList.remove("has-real-map");
  setModeStatus("데모 모드 · 서버 없이 동작", "info");
  updateDiagnostics({ kakaoMap: "꺼짐" });
}

function updateKakaoMap(place) {
  if (!kakaoMap || !kakaoMarker || !place.coord) return;

  const position = new window.kakao.maps.LatLng(place.coord.lat, place.coord.lng);
  kakaoMarker.setPosition(position);

  if (userLocation) {
    fitKakaoRouteBounds(place);
    return;
  }

  kakaoMap.setCenter(position);
}

function fitKakaoRouteBounds(place) {
  if (!kakaoMap || !place.coord || !userLocation) return;

  const bounds = new window.kakao.maps.LatLngBounds();
  bounds.extend(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng));
  bounds.extend(new window.kakao.maps.LatLng(place.coord.lat, place.coord.lng));
  kakaoMap.setBounds(bounds);
}

function updateKakaoUserMarker() {
  if (!kakaoMap || !userLocation) return;

  const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
  if (!kakaoUserMarker) {
    kakaoUserMarker = new window.kakao.maps.CustomOverlay({
      map: kakaoMap,
      position,
      content: '<div class="kakao-user-dot" title="현재 위치"></div>',
      xAnchor: 0.5,
      yAnchor: 0.5,
    });
    return;
  }

  kakaoUserMarker.setMap(kakaoMap);
  kakaoUserMarker.setPosition(position);
}

function getMockUserPoint(place) {
  if (!userLocation || !place.coord) return null;

  const lngDelta = userLocation.lng - place.coord.lng;
  const latDelta = userLocation.lat - place.coord.lat;
  return {
    x: clamp(place.marker.x + lngDelta * 120, 8, 92),
    y: clamp(place.marker.y - latDelta * 150, 14, 86),
  };
}

function updateUserLocationMap(place = selectedPlace) {
  if (!userLocation) {
    elements.mockMap.classList.remove("has-user-location");
    return;
  }

  const point = getMockUserPoint(place) || { x: 22, y: 72 };
  elements.mockMap.style.setProperty("--user-x", `${point.x}%`);
  elements.mockMap.style.setProperty("--user-y", `${point.y}%`);
  elements.mockMap.classList.add("has-user-location");
  updateKakaoUserMarker();
  fitKakaoRouteBounds(place);
}

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(elements.searchInput.value);
});

elements.searchInput.addEventListener("input", () => {
  renderResults(searchPlaces(elements.searchInput.value));
});

elements.locateButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    elements.locateButton.title = "현재 위치를 사용할 수 없습니다";
    updateDiagnostics({ location: "미지원" });
    setModeStatus("현재 위치를 사용할 수 없습니다", "error");
    return;
  }

  if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    updateDiagnostics({ location: "보안 컨텍스트 필요" });
    setModeStatus("현재 위치는 localhost 또는 HTTPS에서 사용할 수 있습니다", "warning");
    return;
  }

  elements.locateButton.disabled = true;
  elements.locateButton.classList.add("is-loading");
  setModeStatus("현재 위치 확인 중", "loading");
  updateDiagnostics({ location: "확인 중" });

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const origin = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: "device",
      };
      elements.locateButton.title = "현재 위치 기준 적용됨";
      elements.locateButton.disabled = false;
      elements.locateButton.classList.remove("is-loading");

      if (!isUsableOrigin(origin)) {
        updateDiagnostics({ location: `정확도 낮음 · ${Math.round(origin.accuracy)}m` });
        setModeStatus("현재 위치 정확도가 낮아 계산에 반영하지 않았습니다", "warning");
        return;
      }

      applyOrigin(origin);
      setModeStatus(`현재 위치 기준 · 정확도 약 ${Math.round(position.coords.accuracy)}m`, "success");
    },
    (error) => {
      const message = getGeolocationErrorMessage(error);
      elements.locateButton.title = message;
      elements.locateButton.disabled = false;
      elements.locateButton.classList.remove("is-loading");
      updateDiagnostics({ location: message });
      setModeStatus(message, "warning");
    },
    { enableHighAccuracy: true, timeout: 5000 },
  );
});

elements.originForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runOriginSearch(elements.originInput.value);
});

elements.diagnosticsRetry.addEventListener("click", () => {
  refreshConfigDiagnostics();
  updateDiagnostics({
    kakaoMap: kakaoMap ? "연결됨" : diagnostics.kakaoMap,
  });
  enableKakaoMode(window.APP_CONFIG?.KAKAO_JAVASCRIPT_KEY || "");
  refreshLiveTraffic(selectedPlace);
});

elements.departureOptions.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.hour;
    selectedDepartureHour = value === "now" ? null : Number(value);

    elements.departureOptions.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    applyRouteEstimate(selectedPlace);
    renderPlace(selectedPlace);
    refreshRouteEstimate(selectedPlace);
  });
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    stabilizeKakaoMap(120);
  });
});

window.addEventListener("resize", () => {
  stabilizeKakaoMap(120);
});

window.addEventListener("orientationchange", () => {
  stabilizeKakaoMap(240);
});

async function initApp() {
  await (window.APP_CONFIG_READY || Promise.resolve());
  refreshConfigDiagnostics();
  renderQuickList();
  renderResults();
  renderPlace(selectedPlace);

  const kakaoKey = window.APP_CONFIG?.KAKAO_JAVASCRIPT_KEY || "";
  enableKakaoMode(kakaoKey);
  refreshRouteEstimate(selectedPlace);
  refreshLiveTraffic(selectedPlace);
}

initApp();
