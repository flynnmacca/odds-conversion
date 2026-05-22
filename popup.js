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

/**
 * Calculate fair probability/price from a supplied effective power.
 * @param {number} onsitePrice
 * @param {number} effectivePower
 * @returns {{onsiteProb:number, fairProb:number, fairPrice:number}}
 */
function fairFromEffectivePower(onsitePrice, effectivePower) {
  const onsiteProb = decimalToProb(onsitePrice);
  const onsiteProbDecimal = onsiteProb / 100;
  const fairProbDecimal = Math.pow(onsiteProbDecimal, effectivePower);
  const fairProb = fairProbDecimal * 100;
  const fairPrice = probToDecimal(fairProb);
  return { onsiteProb, fairProb, fairPrice };
}

/**
 * Calculate on-site probability/price from a supplied fair price and power.
 * @param {number} fairPrice
 * @param {number} effectivePower
 * @returns {{fairProb:number, onsiteProb:number, onsitePrice:number}}
 */
function onsiteFromFairWithPower(fairPrice, effectivePower) {
  const fairProb = decimalToProb(fairPrice);
  const fairProbDecimal = fairProb / 100;
  const onsiteProbDecimal = Math.pow(fairProbDecimal, 1 / effectivePower);
  const onsiteProb = onsiteProbDecimal * 100;
  const onsitePrice = probToDecimal(onsiteProb);
  return { fairProb, onsiteProb, onsitePrice };
}

function interpolatePowerFromOdds(odds, points) {
  if (odds <= points[0].odds) {
    return points[0].power;
  }

  for (let i = 1; i < points.length; i += 1) {
    const left = points[i - 1];
    const right = points[i];
    if (odds <= right.odds) {
      const t = (odds - left.odds) / (right.odds - left.odds);
      return left.power + t * (right.power - left.power);
    }
  }

  return points[points.length - 1].power;
}

/**
 * Remove margin from a single on-site price using a power parameter.
 * @param {number} onsitePrice
 * @param {number} powerParam
 * @param {number} favoriteBoost
 * @returns {{onsiteProb:number, fairProb:number, fairPrice:number, effectivePower:number}}
 */
function removeMarginFromSinglePrice(onsitePrice, powerParam) {
  const effectivePower = Math.max(1.001, interpolatePowerFromOdds(onsitePrice, POWER_PROFILE_POINTS));
  const fair = fairFromEffectivePower(onsitePrice, effectivePower);
  const onsiteProb = fair.onsiteProb;
  const fairProb = fair.fairProb;
  const fairPrice = fair.fairPrice;
  return { onsiteProb, fairProb, fairPrice, effectivePower };
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
const marketRangePreset = document.getElementById("market-range-preset");
const marketBtn        = document.getElementById("market-btn");
const marketFlipBtn    = document.getElementById("market-flip-btn");
const marketCopyBtn    = document.getElementById("market-copy-btn");
const marketSummary    = document.getElementById("market-summary");
const marketError      = document.getElementById("market-error");
const marketTitle      = document.getElementById("market-title");
const marketHint       = document.getElementById("market-hint");
const marketProbLabel  = document.getElementById("market-prob-label");
const marketPriceLabel = document.getElementById("market-price-label");
const resFairProb      = document.getElementById("res-fair-prob");
const resFairPrice     = document.getElementById("res-fair-price");
const POWER_PARAMETER = 1.105;
const RANGE_PRESETS = {
  tight: { base: 0.008, extra: 0.01, shift: -0.015 },
  medium: { base: 0.016, extra: 0.022, shift: 0 },
  wide: { base: 0.028, extra: 0.036, shift: 0.01 },
};
const POWER_PROFILE_POINTS = [
  { odds: 1.01, power: 1.18 },
  { odds: 1.53, power: 1.131 },
  { odds: 1.9, power: 1.091 },
  { odds: 2.48, power: 1.059 },
  { odds: 4.0, power: 1.078 },
  { odds: 8.0, power: 1.095 },
  { odds: 12.0, power: 1.105 },
];

let lastMarketCopyText = "";
let marketMode = "onsiteToFair";

function getRangePreset() {
  const selected = marketRangePreset.value;
  return RANGE_PRESETS[selected] || RANGE_PRESETS.medium;
}

function refreshMarketModeUI() {
  const reverseMode = marketMode === "fairToOnsite";
  marketTitle.textContent = reverseMode ? "100% Price to On-Site" : "On-Site Price to 100%";
  marketHint.textContent = reverseMode ? "Enter 100% pricing." : "Enter on-site pricing.";
  marketBtn.textContent = reverseMode ? "Add Margin" : "Remove Margin";
  marketProbLabel.textContent = reverseMode ? "On-Site Probability Range" : "100% Probability Range";
  marketPriceLabel.textContent = reverseMode ? "On-Site Price Range" : "100% Price Range";
  marketSummary.hidden = true;
  marketCopyBtn.classList.add("hidden");
  clearError(marketError);
}

marketRangePreset.addEventListener("change", () => {
  marketSummary.hidden = true;
  marketCopyBtn.classList.add("hidden");
});

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

  const preset = getRangePreset();

  if (marketMode === "onsiteToFair") {
    const onsitePrice = inputPrice;
    const fair = removeMarginFromSinglePrice(onsitePrice, POWER_PARAMETER);
    const shortOddsRangeFactor = Math.max(0, Math.min(1, (2 - onsitePrice) / (2 - 1.01)));
    const rangeDelta = preset.base + shortOddsRangeFactor * preset.extra;
    const centerShift = preset.shift;
    const lowPower = Math.max(1.001, fair.effectivePower + centerShift - rangeDelta);
    const highPower = fair.effectivePower + centerShift + rangeDelta;
    const fairLow = fairFromEffectivePower(onsitePrice, lowPower);
    const fairHigh = fairFromEffectivePower(onsitePrice, highPower);
    const probMin = Math.min(fairLow.fairProb, fairHigh.fairProb);
    const probMax = Math.max(fairLow.fairProb, fairHigh.fairProb);
    const priceMin = Math.min(fairLow.fairPrice, fairHigh.fairPrice);
    const priceMax = Math.max(fairLow.fairPrice, fairHigh.fairPrice);

    resFairProb.textContent = `${formatProbability(probMin)} to ${formatProbability(probMax)}`;
    resFairPrice.textContent = `${priceMin.toFixed(2)} to ${priceMax.toFixed(2)}`;
    lastMarketCopyText = resultRowsToText("On-Site Price to 100%", [
      { label: "Input", value: inputLabel },
      { label: "100% Probability Range", value: resFairProb.textContent },
      { label: "100% Price Range", value: resFairPrice.textContent },
    ]);
  } else {
    const fairPrice = inputPrice;
    const initialPower = Math.max(1.001, interpolatePowerFromOdds(fairPrice, POWER_PROFILE_POINTS));
    const onsiteEstimate = onsiteFromFairWithPower(fairPrice, initialPower).onsitePrice;
    const effectivePower = Math.max(1.001, interpolatePowerFromOdds(onsiteEstimate, POWER_PROFILE_POINTS));
    const shortOddsRangeFactor = Math.max(0, Math.min(1, (2 - onsiteEstimate) / (2 - 1.01)));
    const rangeDelta = preset.base + shortOddsRangeFactor * preset.extra;
    const centerShift = preset.shift;
    const lowPower = Math.max(1.001, effectivePower + centerShift - rangeDelta);
    const highPower = effectivePower + centerShift + rangeDelta;
    const onsiteLow = onsiteFromFairWithPower(fairPrice, lowPower);
    const onsiteHigh = onsiteFromFairWithPower(fairPrice, highPower);
    const probMin = Math.min(onsiteLow.onsiteProb, onsiteHigh.onsiteProb);
    const probMax = Math.max(onsiteLow.onsiteProb, onsiteHigh.onsiteProb);
    const priceMin = Math.min(onsiteLow.onsitePrice, onsiteHigh.onsitePrice);
    const priceMax = Math.max(onsiteLow.onsitePrice, onsiteHigh.onsitePrice);

    resFairProb.textContent = `${formatProbability(probMin)} to ${formatProbability(probMax)}`;
    resFairPrice.textContent = `${priceMin.toFixed(2)} to ${priceMax.toFixed(2)}`;
    lastMarketCopyText = resultRowsToText("100% Price to On-Site", [
      { label: "Input", value: inputLabel },
      { label: "On-Site Probability Range", value: resFairProb.textContent },
      { label: "On-Site Price Range", value: resFairPrice.textContent },
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
