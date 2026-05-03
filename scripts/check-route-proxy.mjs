const url = process.env.ROUTE_PROXY_URL || "http://127.0.0.1:8787/route-estimate";

const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    origin: { lat: 37.5547, lng: 126.9706 },
    destination: { lat: 37.3947, lng: 127.1112 },
    departureHour: 10,
  }),
});

if (!response.ok) {
  console.error(`Route proxy check failed: HTTP ${response.status}`);
  process.exit(1);
}

const payload = await response.json();
const requiredKeys = ["expectedMinutes", "drivingDistance", "freeFlowMinutes", "delayRate", "difficulty", "source"];
const missing = requiredKeys.filter((key) => payload[key] === undefined);

if (missing.length > 0) {
  console.error(`Route proxy check failed: missing ${missing.join(", ")}`);
  process.exit(1);
}

if (payload.expectedMinutes > 80) {
  console.error(`Route proxy check failed: expectedMinutes too high (${payload.expectedMinutes})`);
  process.exit(1);
}

console.log(`Route proxy check passed: ${payload.expectedMinutes}m, ${payload.drivingDistance}km`);
