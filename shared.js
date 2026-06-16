const STORAGE_KEY = "luckyDraw_v2";

const HEAT_RANGES = [
  { id: "1-10",  min: 1,  max: 10, color: "#3b82f6" },
  { id: "11-20", min: 11, max: 20, color: "#06b6d4" },
  { id: "21-30", min: 21, max: 30, color: "#10b981" },
  { id: "31-40", min: 31, max: 40, color: "#f59e0b" },
  { id: "41-50", min: 41, max: 50, color: "#ef4444" },
];

/** Past lottery draw results — road map (路单) */
const DEFAULT_DRAW_HISTORY = [
  { roundId: 2846, numbers: [3, 6, 9] },
  { roundId: 2845, numbers: [14, 17, 22] },
  { roundId: 2844, numbers: [1, 2, 3] },
  { roundId: 2843, numbers: [2, 7, 7] },
  { roundId: 2842, numbers: [28, 33, 39] },
  { roundId: 2841, numbers: [5, 11, 19] },
];

/** Round #2847 prize table */
const PRIZE_TABLE = [
  { number: 3,  rank: "1st", medal: "🥇", bonus: "20,000 Coins", pct: "40%" },
  { number: 6,  rank: "2nd", medal: "🥈", bonus: "10,000 Coins", pct: "20%" },
  { number: 9,  rank: "3rd", medal: "🥉", bonus: "5,000 Coins", pct: "10%" },
  { number: 14, rank: "4th", medal: "", bonus: "2,500 Coins", pct: "5%" },
  { number: 17, rank: "5th", medal: "", bonus: "2,500 Coins", pct: "5%" },
  { number: 22, rank: "6th", medal: "", bonus: "2,500 Coins", pct: "5%" },
  { number: 28, rank: "7th", medal: "", bonus: "1,250 Coins", pct: "2.5%" },
  { number: 33, rank: "8th", medal: "", bonus: "1,250 Coins", pct: "2.5%" },
  { number: 39, rank: "9th", medal: "", bonus: "1,250 Coins", pct: "2.5%" },
  { number: 45, rank: "10th", medal: "", bonus: "1,250 Coins", pct: "2.5%" },
];

const ALL_PRIZE_NUMBERS = PRIZE_TABLE.map((p) => p.number);

const DEFAULT_STATE = {
  roundId: 2847,
  prizePool: 50000,
  allNumbers: [1, 2, 3, 2, 7, 7],
  drawHistory: DEFAULT_DRAW_HISTORY,
  players: {},
};

function getBucket(num) {
  return HEAT_RANGES.find((r) => num >= r.min && num <= r.max) || null;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    const state = { ...structuredClone(DEFAULT_STATE), ...parsed };
    if (!state.drawHistory || !state.drawHistory.length) {
      state.drawHistory = structuredClone(DEFAULT_DRAW_HISTORY);
    }
    delete state.roadRecords;
    return state;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getPlayerEntry(state, playerId) {
  if (!state.players[playerId]) {
    state.players[playerId] = { numbers: [null, null, null], locked: [false, false, false] };
  }
  return state.players[playerId];
}

function computeHeatmap(state) {
  const counts = HEAT_RANGES.map(() => 0);
  state.allNumbers.forEach((n) => {
    const b = getBucket(n);
    if (!b) return;
    const i = HEAT_RANGES.indexOf(b);
    if (i >= 0) counts[i]++;
  });
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return HEAT_RANGES.map((r, i) => ({
    range: r.id.replace("-", "–"),
    pct: Math.round((counts[i] / total) * 100),
    color: r.color,
    count: counts[i],
  }));
}

function submitPlayerNumber(playerId, playerName, avatar, slotIndex, number) {
  const state = loadState();
  const entry = getPlayerEntry(state, playerId);

  if (slotIndex < 0 || slotIndex > 2) return { ok: false, error: "Invalid slot" };
  if (entry.locked[slotIndex]) return { ok: false, error: "Already submitted" };
  if (number < 1 || number > 50) return { ok: false, error: "Number must be 1–50" };

  entry.numbers[slotIndex] = number;
  entry.locked[slotIndex] = true;
  entry.name = playerName;
  entry.avatar = avatar;

  state.allNumbers.push(number);

  const allDone = entry.locked.every(Boolean);
  saveState(state);
  return { ok: true, entry, allDone, heatmap: computeHeatmap(state), state };
}

/** Called when a round ends — append winning numbers to road map */
function recordDrawResult(numbers, roundId) {
  const state = loadState();
  state.drawHistory.unshift({ roundId: roundId ?? state.roundId, numbers: [...numbers] });
  if (state.drawHistory.length > 20) state.drawHistory.length = 20;
  saveState(state);
  return state;
}

function getPlayerStatus(playerId) {
  const state = loadState();
  const entry = getPlayerEntry(state, playerId);
  return { entry, heatmap: computeHeatmap(state), state };
}

function getPlayerOutcome(playerId) {
  const { entry } = getPlayerStatus(playerId);
  const numbers = entry.numbers.filter((n) => n !== null);
  const wins = numbers
    .map((n) => PRIZE_TABLE.find((p) => p.number === n))
    .filter(Boolean);
  return {
    won: wins.length > 0,
    numbers,
    wins,
    participated: numbers.length === 3,
  };
}

function resetPlayer(playerId) {
  const state = loadState();
  delete state.players[playerId];
  saveState(state);
}

if (typeof window !== "undefined") {
  window.LuckyDraw = {
    STORAGE_KEY,
    HEAT_RANGES,
    DEFAULT_DRAW_HISTORY,
    loadState,
    saveState,
    computeHeatmap,
    submitPlayerNumber,
    PRIZE_TABLE,
    ALL_PRIZE_NUMBERS,
    getPlayerOutcome,
    recordDrawResult,
    getPlayerStatus,
    resetPlayer,
  };
}
