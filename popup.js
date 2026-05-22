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
  { onsite: 1.02, fair: 1.054 },
  { onsite: 1.03, fair: 1.075 },
  { onsite: 1.26, fair: 1.31 },
  { onsite: 1.41, fair: 1.502 },
  { onsite: 1.48, fair: 1.55 },
  { onsite: 1.5, fair: 1.618 },
  { onsite: 1.73, fair: 1.844 },
  { onsite: 2.04, fair: 2.184 },
  { onsite: 2.46, fair: 2.619 },
  { onsite: 2.54, fair: 2.792 },
  { onsite: 2.78, fair: 2.992 },
  { onsite: 2.94, fair: 3.19 },
  { onsite: 4.5, fair: 5.0 },
  { onsite: 9.8, fair: 14.327 },
  { onsite: 15.0, fair: 20.3 },
];
const HIGH_ODDS_THRESHOLD = 20;
const HIGH_ODDS_LINEAR_BOOST = 0.22;
const HIGH_ODDS_QUADRATIC_BOOST = 0.18;

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
  const baseFair = segment.a * Math.pow(onsitePrice, segment.b);

  if (onsitePrice <= HIGH_ODDS_THRESHOLD) {
    return baseFair;
  }

  const x = (onsitePrice - HIGH_ODDS_THRESHOLD) / HIGH_ODDS_THRESHOLD;
  const boost = 1 + HIGH_ODDS_LINEAR_BOOST * x + HIGH_ODDS_QUADRATIC_BOOST * x * x;
  return baseFair * boost;
}

function fairToOnsiteFromCurve(fairPrice) {
  if (fairPrice <= 0) {
    return fairPrice;
  }

  let low = 1.001;
  let high = Math.max(HIGH_ODDS_THRESHOLD, fairPrice * 1.2);

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
  marketTitle.textContent = reverseMode ? "100% Price to On-Site" : "On-Site Price to 100%";
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
