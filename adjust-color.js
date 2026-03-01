const adjustColor = (hex, { h = 0, s = 0, l = 0, a = 1 } = {}) => {
  let cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  // RGB -> HSL
  const rNorm = r / 255,
    gNorm = g / 255,
    bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let hVal,
    sVal,
    lVal = (max + min) / 2;

  if (max === min) {
    hVal = sVal = 0;
  } else {
    const d = max - min;
    sVal = lVal > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        hVal = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        hVal = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        hVal = (rNorm - gNorm) / d + 4;
        break;
    }
    hVal /= 6;
  }

  // Apply adjustments
  hVal = ((hVal * 360 + h) % 360) / 360;
  sVal = Math.min(1, Math.max(0, sVal + s / 100));
  lVal = Math.min(1, Math.max(0, lVal + l / 100));

  // HSL -> RGB
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let rOut, gOut, bOut;
  if (sVal === 0) {
    rOut = gOut = bOut = lVal;
  } else {
    const q = lVal < 0.5 ? lVal * (1 + sVal) : lVal + sVal - lVal * sVal;
    const p = 2 * lVal - q;
    rOut = hue2rgb(p, q, hVal + 1 / 3);
    gOut = hue2rgb(p, q, hVal);
    bOut = hue2rgb(p, q, hVal - 1 / 3);
  }

  const rFinal = Math.round(rOut * 255);
  const gFinal = Math.round(gOut * 255);
  const bFinal = Math.round(bOut * 255);

  // If alpha < 1, return rgba, else hex
  if (a < 1) {
    return `rgba(${rFinal}, ${gFinal}, ${bFinal}, ${a})`;
  }

  return (
    "#" +
    [rFinal, gFinal, bFinal]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
};

const hexToRgb = (hex) => {
  let cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (cleanHex.length !== 6) {
    throw new Error("Invalid hex color format. Expected 3 or 6 digits.");
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
};

module.exports = { hexToRgb, adjustColor };
