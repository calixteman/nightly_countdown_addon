const API_URL = "https://whattrainisitnow.com/api/firefox/calendar/future/";
const ICON_SIZE = 32;
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // refresh every day

// Shared state read by the popup
let state = {
  daysRemaining: null,
  nextVersion: null,
  nextNightlyDate: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Icon drawing
// ---------------------------------------------------------------------------

function drawIcon(daysRemaining, cycleDays) {
  const canvas = new OffscreenCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext("2d");
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;
  const radius = ICON_SIZE / 2 - 2;
  const lineWidth = 4;

  // Background circle (dark gray track)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = "#444444";
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  if (daysRemaining !== null && cycleDays > 0) {
    // Arc angle proportional to days remaining over full cycle.
    // Full circle = full cycle; the arc shrinks as nightly approaches.
    const fraction = Math.min(1, Math.max(0, daysRemaining / cycleDays));
    const startAngle = -Math.PI / 2; // top of circle
    const endAngle = startAngle + fraction * 2 * Math.PI;

    // Interpolate green -> red as the cycle runs out (fraction 1 -> 0)
    const r = Math.round(255 * (1 - fraction));
    const g = Math.round(192 * fraction);
    const color = `rgb(${r}, ${g}, 0)`;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Day count in the centre
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${daysRemaining < 10 ? 18 : 15}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(Math.ceil(daysRemaining)), cx, cy);
  }

  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

// ---------------------------------------------------------------------------
// API + logic
// ---------------------------------------------------------------------------

async function update() {
  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    const now = Date.now();

    // Collect all entries sorted by nightly_start ascending
    const entries = Object.values(data)
      .map((e) => ({ ...e, nightlyMs: new Date(e.nightly_start).getTime() }))
      .sort((a, b) => a.nightlyMs - b.nightlyMs);

    // Find the next nightly that hasn't started yet
    const nextIdx = entries.findIndex((e) => e.nightlyMs > now);
    if (nextIdx === -1) throw new Error("No future nightly found");

    const next = entries[nextIdx];
    const daysRemaining = (next.nightlyMs - now) / (1000 * 60 * 60 * 24);

    // Cycle length = gap between the previous nightly_start and this one
    const prev = entries[nextIdx - 1];
    const cycleDays = prev
      ? (next.nightlyMs - prev.nightlyMs) / (1000 * 60 * 60 * 24)
      : 28; // fallback

    state = {
      daysRemaining: Math.ceil(daysRemaining),
      nextVersion: next.version,
      nextNightlyDate: next.nightly_start.slice(0, 10),
      error: null,
    };

    const imageData = drawIcon(daysRemaining, cycleDays);
    browser.browserAction.setIcon({ imageData });
    browser.browserAction.setTitle({
      title: `Firefox ${next.version} Nightly starts in ${Math.ceil(daysRemaining)} day(s)\n(${next.nightly_start.slice(0, 10)})`,
    });
  } catch (err) {
    state = { daysRemaining: null, nextVersion: null, nextNightlyDate: null, error: String(err) };
    // Draw a grey ring on error
    const imageData = drawIcon(null, 28);
    browser.browserAction.setIcon({ imageData });
    browser.browserAction.setTitle({ title: "Nightly Countdown – fetch error" });
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

update();
setInterval(update, UPDATE_INTERVAL_MS);

// Let the popup query current state
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "getState") return Promise.resolve(state);
});
