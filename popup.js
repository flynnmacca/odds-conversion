alert("JS loaded");

document.addEventListener("DOMContentLoaded", () => {

// ── Conversion helpers ────────────────────────────────────────────────────────

/**
 * Implied probability (0–100) → decimal odds.
 * @param {number} prob  e.g. 33.33
 * @returns {number}
 */
function probToDecimal(prob) {
  return 1 / (prob / 100);
}

/**
 * Decimal odds → implied probability (%).
 * @param {number} decimal  e.g. 3.00
 * @returns {number}
 */
function decimalToProb(decimal) {
  return (1 / decimal) * 100;
}

/**
 * Decimal odds → fractional string, e.g. "2/1".
 * Uses GCD reduction on a scaled integer representation.
 * @param {number} decimal
 * @returns {string}
 */
function decimalToFractional(decimal) {
  const net = decimal - 1; // profit per unit stake
  const precision = 1000;
  let num = Math.round(net * precision);
  let den = precision;
  const g = gcd(Math.abs(num), den);
  num = num / g;
  den = den / g;
  return `${num}/${den}`;
}

/**
 * Fractional (numerator/denominator) → decimal odds.
 * @param {number} num
 * @param {number} den
 * @returns {number}
 */
function fractionalToDecimal(num, den) {
  return num / den + 1;
}

/**
 * Decimal odds → American (moneyline) odds.
 * @param {number} decimal
 * @returns {string}  e.g. "+200" or "-150"
 */
function decimalToAmerican(decimal) {
  if (decimal >= 2) {
    const american = Math.round((decimal - 1) * 100);
    return `+${american}`;
  } else {
    const american = Math.round(-100 / (decimal - 1));
    return `${american}`;
  }
}

/**
 * American odds → decimal.
 * @param {number} american  e.g. 200 or -150
 * @returns {number}
 */
function americanToDecimal(american) {
  if (american > 0) {
    return american / 100 + 1;
  } else {
    return 100 / Math.abs(american) + 1;
  }
}

/** Greatest common divisor (Euclidean). */
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

function clearError(el) {
  el.textContent = "";
  el.hidden = true;
}

function formatProbability(probPercent) {
  return `${probPercent.toFixed(2)}% (${(probPercent / 100).toFixed(4)})`;
}

function resultRowsToText(title, rows) {
  const body = rows.map((row) => `${row.label}: ${row.value}`).join("\n");
  return `${title}\n${body}`;
}

async function copyText(text, errorEl) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    showError(errorEl, "Copy failed.");
  }
}

// ── Access gate (basic client-side lock) ───────────────────────────────────

const ACCESS_PASSWORD = "sports123";

const appRoot = document.getElementById("app-root");
const authGate = document.getElementById("auth-gate");
const accessPasswordInput = document.getElementById("access-password");
const unlockBtn = document.getElementById("unlock-btn");
const unlockError = document.getElementById("unlock-error");

function unlockApp() {
  authGate.hidden = true;
  authGate.classList.add("hidden");
  authGate.style.display = "none";

  appRoot.hidden = false;
  appRoot.classList.remove("hidden");
  appRoot.style.display = "";

  unlockError.hidden = true;
  unlockError.textContent = "";
}

function lockApp() {
  authGate.hidden = false;
  authGate.classList.remove("hidden");
  authGate.style.display = "";

  appRoot.hidden = true;
  appRoot.classList.add("hidden");
  appRoot.style.display = "none";
}

function tryUnlock(e) {
  if (e) e.preventDefault();

  const entered = accessPasswordInput.value.trim();

  if (entered === ACCESS_PASSWORD) {
    unlockApp();
  } else {
    unlockError.textContent = "Incorrect password.";
    unlockError.hidden = false;
  }
}

lockApp();

unlockBtn.addEventListener("click", tryUnlock);

accessPasswordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryUnlock(e);
});
// ── Tool selector ────────────────────────────────────────────────────────────

const toolSelector = document.getElementById("tool-selector");
const toolPanels = Array.from(document.querySelectorAll(".tool-panel"));

function setActiveTool(toolName) {
  toolPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.tool !== toolName);
  });
}

toolSelector.addEventListener("change", () => {
  setActiveTool(toolSelector.value);
});

setActiveTool(toolSelector.value || "prob");

// ── Probability → Price ───────────────────────────────────────────────────────

const probInput    = document.getElementById("prob-input");
const probFormat   = document.getElementById("prob-format");
const probBtn      = document.getElementById("prob-btn");
const probCopyBtn  = document.getElementById("prob-copy-btn");
const probResults  = document.getElementById("prob-results");
const probError    = document.getElementById("prob-error");
const resDecimal   = document.getElementById("res-decimal");
const resFractional = document.getElementById("res-fractional");
const resAmerican  = document.getElementById("res-american");

function updateProbInputMode() {
  const mode = probFormat.value;
  if (mode === "decimal") {
    probInput.placeholder = "Enter decimal probability";
    probInput.min = "0.0001";
    probInput.max = "0.9999";
    probInput.step = "0.0001";
  } else {
    probInput.placeholder = "Enter % probability";
    probInput.min = "0.01";
    probInput.max = "99.99";
    probInput.step = "0.01";
  }

  probResults.hidden = true;
  probCopyBtn.classList.add("hidden");
  clearError(probError);
}

probFormat.addEventListener("change", updateProbInputMode);
updateProbInputMode();

probBtn.addEventListener("click", () => {
  clearError(probError);
  probResults.hidden = true;

  const raw = parseFloat(probInput.value);
  const mode = probFormat.value;
  let probPercent;

  if (mode === "decimal") {
    if (isNaN(raw) || raw <= 0 || raw >= 1) {
      showError(probError, "Enter decimal 0-1.");
      return;
    }
    probPercent = raw * 100;
  } else {
    if (isNaN(raw) || raw <= 0 || raw >= 100) {
      showError(probError, "Enter % between 0 and 100.");
      return;
    }
    probPercent = raw;
  }

  const decimal = probToDecimal(probPercent);
  resDecimal.textContent   = decimal.toFixed(2);
  resFractional.textContent = decimalToFractional(decimal);
  resAmerican.textContent  = decimalToAmerican(decimal);
  probResults.hidden = false;
  probCopyBtn.classList.remove("hidden");
});

probCopyBtn.addEventListener("click", () => {
  const text = resultRowsToText("Probability to Price", [
    { label: "Decimal", value: resDecimal.textContent },
    { label: "Fractional", value: resFractional.textContent },
    { label: "American", value: resAmerican.textContent },
  ]);
  copyText(text, probError);
});

probInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") probBtn.click();
});

// ── Price → Probability ───────────────────────────────────────────────────────

const priceInput     = document.getElementById("price-input");
const priceBtn       = document.getElementById("price-btn");
const priceCopyBtn   = document.getElementById("price-copy-btn");
const priceResults   = document.getElementById("price-results");
const priceError     = document.getElementById("price-error");
const resProb        = document.getElementById("res-prob");

priceBtn.addEventListener("click", () => {
  clearError(priceError);
  priceResults.hidden = true;

  const decimal = parseAnyOddsToDecimal(priceInput.value);
  if (decimal === null) {
    showError(priceError, "Use decimal, fraction, or American odds.");
    return;
  }

  const prob = decimalToProb(decimal);
  resProb.textContent = formatProbability(prob);
  priceResults.hidden = false;
  priceCopyBtn.classList.remove("hidden");
});

priceCopyBtn.addEventListener("click", () => {
  const text = resultRowsToText("Price to Probability", [
    { label: "Implied Probability", value: resProb.textContent },
  ]);
  copyText(text, priceError);
});

priceInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") priceBtn.click();
});

// ── Odds Display Converter ───────────────────────────────────────────────────

const displayInput    = document.getElementById("display-input");
const displayBtn       = document.getElementById("display-btn");
const displayCopyBtn   = document.getElementById("display-copy-btn");
const displayResults   = document.getElementById("display-results");
const displayError     = document.getElementById("display-error");
const resDisplayDecimal = document.getElementById("res-display-decimal");
const resDisplayFractional = document.getElementById("res-display-fractional");
const resDisplayAmerican = document.getElementById("res-display-american");

function parseAnyOddsToDecimal(rawInput) {
  const raw = rawInput.trim();
  if (!raw) {
    return null;
  }

  // Fractional format: e.g. 37/25
  if (raw.includes("/")) {
    const parts = raw.split("/");
    if (parts.length !== 2) {
      return null;
    }
    const num = parseFloat(parts[0].trim());
    const den = parseFloat(parts[1].trim());
    if (isNaN(num) || isNaN(den) || num <= 0 || den <= 0) {
      return null;
    }
    return fractionalToDecimal(num, den);
  }

  // American format: signed values like +148, -150.
  if (/^[+-]\d+(\.\d+)?$/.test(raw)) {
    const val = parseFloat(raw);
    if (isNaN(val) || val === 0) {
      return null;
    }
    return americanToDecimal(val);
  }

  // Decimal format: e.g. 2.48 or plain integer like 3 (treated as 3.0)
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const dec = parseFloat(raw);
    if (dec > 1) {
      return dec;
    }
  }

  // Support trailing decimal dot, e.g. "3."
  if (/^\d+\.$/.test(raw)) {
    const dec = parseFloat(raw);
    if (dec > 1) {
      return dec;
    }
  }

  return null;
}

displayBtn.addEventListener("click", () => {
  clearError(displayError);
  displayResults.hidden = true;
  displayCopyBtn.classList.add("hidden");

  const decimal = parseAnyOddsToDecimal(displayInput.value);
  if (decimal === null) {
    showError(displayError, "Use decimal, fraction, or American odds.");
    return;
  }

  resDisplayDecimal.textContent = decimal.toFixed(2);
  resDisplayFractional.textContent = decimalToFractional(decimal);
  resDisplayAmerican.textContent = decimalToAmerican(decimal);
  displayResults.hidden = false;
  displayCopyBtn.classList.remove("hidden");
});

displayCopyBtn.addEventListener("click", () => {
  const text = resultRowsToText("Odds Display Converter", [
    { label: "Decimal", value: resDisplayDecimal.textContent },
    { label: "Fractional", value: resDisplayFractional.textContent },
    { label: "American", value: resDisplayAmerican.textContent },
  ]);
  copyText(text, displayError);
});

displayInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") displayBtn.click();
});

// ── On-site Market → 100% Fair Prices / Probabilities ───────────────────────

const marketInput      = document.getElementById("market-input");
const marketBtn        = document.getElementById("market-btn");
const marketFlipBtn    = document.getElementById("market-flip-btn");
const marketCopyBtn    = document.getElementById("market-copy-btn");
const marketSummary    = document.getElementById("market-summary");
const marketError      = document.getElementById("market-error");
const marketTitle      = document.getElementById("market-title");
const marketProbLabel  = document.getElementById("market-prob-label");
const marketPriceLabel = document.getElementById("market-price-label");
const resFairProb      = document.getElementById("res-fair-prob");
const resFairPrice     = document.getElementById("res-fair-price");
const MARGIN_FIT_POINTS = [
  { onsite: 1.002, fair: 1.02 },
  { onsite: 1.005, fair: 1.03 },
  { onsite: 1.01, fair: 1.03 },
  { onsite: 1.02, fair: 1.04 },
  { onsite: 1.03, fair: 1.06 },
  { onsite: 1.04, fair: 1.07 },
  { onsite: 1.05, fair: 1.08 },
  { onsite: 1.06, fair: 1.09 },
  { onsite: 1.07, fair: 1.11 },
  { onsite: 1.08, fair: 1.13 },
  { onsite: 1.1, fair: 1.15 },
  { onsite: 1.13, fair: 1.18 },
  { onsite: 1.14, fair: 1.2 },
  { onsite: 1.17, fair: 1.23 },
  { onsite: 1.2, fair: 1.27 },
  { onsite: 1.22, fair: 1.29 },
  { onsite: 1.25, fair: 1.31 },
  { onsite: 1.29, fair: 1.35 },
  { onsite: 1.3, fair: 1.38 },
  { onsite: 1.33, fair: 1.41 },
  { onsite: 1.36, fair: 1.45 },
  { onsite: 1.4, fair: 1.49 },
  { onsite: 1.44, fair: 1.54 },
  { onsite: 1.5, fair: 1.61 },
  { onsite: 1.53, fair: 1.64 },
  { onsite: 1.57, fair: 1.68 },
  { onsite: 1.62, fair: 1.73 },
  { onsite: 1.66, fair: 1.79 },
  { onsite: 1.73, fair: 1.87 },
  { onsite: 1.8, fair: 1.96 },
  { onsite: 1.83, fair: 2.0 },
  { onsite: 1.91, fair: 2.04 },
  { onsite: 2.0, fair: 2.15 },
  { onsite: 2.1, fair: 2.27 },
  { onsite: 2.2, fair: 2.37 },
  { onsite: 2.25, fair: 2.47 },
  { onsite: 2.38, fair: 2.56 },
  { onsite: 2.5, fair: 2.64 },
  { onsite: 2.63, fair: 2.85 },
  { onsite: 2.75, fair: 3.04 },
  { onsite: 2.88, fair: 3.22 },
  { onsite: 3.0, fair: 3.44 },
  { onsite: 3.25, fair: 3.63 },
  { onsite: 3.4, fair: 3.86 },
  { onsite: 3.5, fair: 4.23 },
  { onsite: 3.75, fair: 4.45 },
  { onsite: 4.0, fair: 4.7 },
  { onsite: 4.5, fair: 5.35 },
  { onsite: 5.0, fair: 6.0 },
  { onsite: 5.5, fair: 6.56 },
  { onsite: 6.0, fair: 7.67 },
  { onsite: 6.5, fair: 8.69 },
  { onsite: 7.0, fair: 10.09 },
  { onsite: 7.5, fair: 12.11 },
  { onsite: 8.0, fair: 13.5 },
  { onsite: 9.0, fair: 15.29 },
  { onsite: 10.0, fair: 17.67 },
  { onsite: 11.0, fair: 26.0 },
  { onsite: 15.0, fair: 34.33 },
  { onsite: 19.0, fair: 41.0 },
  { onsite: 34.0, fair: 51.0 },

  { onsite: 50, fair: 80 },
  { onsite: 55, fair: 90 },
  { onsite: 60, fair: 100 },
  { onsite: 66, fair: 110 },
  { onsite: 70, fair: 115 },
  { onsite: 90, fair: 145 },
  { onsite: 100, fair: 190 },
  { onsite: 125, fair: 260 },
  { onsite: 150, fair: 330 },
  { onsite: 175, fair: 440 },
  { onsite: 200, fair: 510 },
  { onsite: 225, fair: 575 },
  { onsite: 250, fair: 630 },
  { onsite: 275, fair: 700 },
  { onsite: 300, fair: 760 },
  { onsite: 325, fair: 800 },
  { onsite: 375, fair: 850 },
  { onsite: 400, fair: 990 },
  { onsite: 425, fair: 1000 },
  { onsite: 475, fair: 1100 },
  { onsite: 500, fair: 1200 },
  { onsite: 750, fair: 1800 },
  { onsite: 1000, fair: 2400 },
  { onsite: 2000, fair: 7500 },
  { onsite: 5000, fair: 20000 },
  { onsite: 10000, fair: 75000 },
];

let lastMarketCopyText = "";
let marketMode = "onsiteToFair";

function buildPiecewisePowerSegments(points) {
  const sorted = [...points]
    .filter((p) => p.onsite > 0 && p.fair > 0)
    .sort((a, b) => a.onsite - b.onsite);

  const segments = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const left = sorted[i - 1];
    const right = sorted[i];
    const b = Math.log(right.fair / left.fair) / Math.log(right.onsite / left.onsite);
    const a = left.fair / Math.pow(left.onsite, b);
    segments.push({
      onsiteMin: left.onsite,
      onsiteMax: right.onsite,
      fairMin: left.fair,
      fairMax: right.fair,
      a,
      b,
    });
  }

  return segments;
}

const POWER_SEGMENTS = buildPiecewisePowerSegments(MARGIN_FIT_POINTS);

function getSegmentForOnsite(onsitePrice) {
  if (onsitePrice <= POWER_SEGMENTS[0].onsiteMax) {
    return POWER_SEGMENTS[0];
  }
  for (let i = 1; i < POWER_SEGMENTS.length; i += 1) {
    if (onsitePrice <= POWER_SEGMENTS[i].onsiteMax) {
      return POWER_SEGMENTS[i];
    }
  }
  return POWER_SEGMENTS[POWER_SEGMENTS.length - 1];
}

function getSegmentForFair(fairPrice) {
  if (fairPrice <= POWER_SEGMENTS[0].fairMax) {
    return POWER_SEGMENTS[0];
  }
  for (let i = 1; i < POWER_SEGMENTS.length; i += 1) {
    if (fairPrice <= POWER_SEGMENTS[i].fairMax) {
      return POWER_SEGMENTS[i];
    }
  }
  return POWER_SEGMENTS[POWER_SEGMENTS.length - 1];
}

function onsiteToFairFromCurve(onsitePrice) {
  const segment = getSegmentForOnsite(onsitePrice);
  return segment.a * Math.pow(onsitePrice, segment.b);
}

function fairToOnsiteFromCurve(fairPrice) {
  if (fairPrice <= 0) {
    return fairPrice;
  }

  let low = 1.001;
  let high = Math.max(10000, fairPrice * 1.2);

  while (onsiteToFairFromCurve(high) < fairPrice && high < 100000) {
    high *= 1.6;
  }

  for (let i = 0; i < 70; i += 1) {
    const mid = (low + high) / 2;
    if (onsiteToFairFromCurve(mid) < fairPrice) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function refreshMarketModeUI() {
  const reverseMode = marketMode === "fairToOnsite";
  marketTitle.textContent = reverseMode ? "100% Price to On-Site (Pricing)" : "On-Site Price to 100% (Pricing)";
  marketBtn.textContent = reverseMode ? "Add Margin" : "Remove Margin";
  marketProbLabel.textContent = reverseMode ? "On-Site Probability" : "100% Probability";
  marketPriceLabel.textContent = reverseMode ? "On-Site Price" : "100% Price";
  marketSummary.hidden = true;
  marketCopyBtn.classList.add("hidden");
  clearError(marketError);
}

marketFlipBtn.addEventListener("click", () => {
  marketMode = marketMode === "onsiteToFair" ? "fairToOnsite" : "onsiteToFair";
  refreshMarketModeUI();
});

refreshMarketModeUI();

marketBtn.addEventListener("click", () => {
  clearError(marketError);
  marketSummary.hidden = true;

  const inputLabel = marketInput.value.trim();
  const inputPrice = parseAnyOddsToDecimal(inputLabel);
  if (inputPrice === null) {
    showError(marketError, "Use decimal, fraction, or American odds.");
    return;
  }

  if (marketMode === "onsiteToFair") {
    const approxPrice = onsiteToFairFromCurve(inputPrice);
    const approxProb = decimalToProb(approxPrice);
    resFairProb.textContent = `~${formatProbability(approxProb)}`;
    resFairPrice.textContent = `~${approxPrice.toFixed(2)}`;
    lastMarketCopyText = resultRowsToText("On-Site Price to 100%", [
      { label: "Input", value: inputLabel },
      { label: "100% Probability", value: resFairProb.textContent },
      { label: "100% Price", value: resFairPrice.textContent },
    ]);
  } else {
    const approxPrice = fairToOnsiteFromCurve(inputPrice);
    const approxProb = decimalToProb(approxPrice);
    resFairProb.textContent = `~${formatProbability(approxProb)}`;
    resFairPrice.textContent = `~${approxPrice.toFixed(2)}`;
    lastMarketCopyText = resultRowsToText("100% Price to On-Site", [
      { label: "Input", value: inputLabel },
      { label: "On-Site Probability", value: resFairProb.textContent },
      { label: "On-Site Price", value: resFairPrice.textContent },
    ]);
  }

  marketSummary.hidden = false;
  marketCopyBtn.classList.remove("hidden");
});

marketCopyBtn.addEventListener("click", () => {
  if (!lastMarketCopyText) {
    return;
  }
  copyText(lastMarketCopyText, marketError);
});

marketInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") marketBtn.click();
});

});