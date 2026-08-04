export const MIN_EBAY_SHIPPING = 5.35;
export const EUR_TO_USD = 1.138;

const EPSILON = 1e-9;

export function clampNumber(value, minimum = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.max(minimum, numeric);
}

/**
 * R90: nearest price ending in ,90. Ties round upward.
 * An integer therefore becomes the immediately lower ,90 price.
 */
export function roundNearestX90(value) {
  const numeric = clampNumber(value);
  const lower = Math.floor(numeric - 0.9 + EPSILON) + 0.9;
  const upper = lower + 1;
  const lowerDistance = numeric - lower;
  const upperDistance = upper - numeric;
  const result = lowerDistance < upperDistance - EPSILON ? lower : upper;
  return Math.round(Math.max(0.9, result) * 100) / 100;
}

/** C90: first price ending in ,90 equal to or above the result. */
export function roundUpToX90(value) {
  const numeric = clampNumber(value);
  const result = Math.ceil(numeric - 0.9 - EPSILON) + 0.9;
  return Math.round(Math.max(0.9, result) * 100) / 100;
}

/** INT: nearest whole number; .50 rounds upward. */
export function roundNearestWhole(value) {
  return Math.floor(clampNumber(value) + 0.5 + EPSILON);
}

/** SUP: whole number equal to or immediately above the result. */
export function roundUpToWhole(value) {
  return Math.ceil(clampNumber(value) - EPSILON);
}

function automaticOffer(price, minimum) {
  let offer = roundNearestX90(price * 0.93);

  if (offer >= price - EPSILON) {
    offer = Math.round((price - 1) * 100) / 100;
  }

  if (offer < minimum - EPSILON) {
    offer = minimum;
  }

  return Math.round(offer * 100) / 100;
}

export function calculateMXLABPrices(target, ebayShipping = MIN_EBAY_SHIPPING) {
  const T = clampNumber(target);
  const SPe = Math.max(MIN_EBAY_SHIPPING, clampNumber(ebayShipping));

  const commonBase = T * 1.2 + 1;
  const V = roundNearestX90(commonBase);
  const S = roundNearestWhole(commonBase);
  const vestiaire = roundNearestWhole(V + 15);

  const E = roundUpToX90(((V + SPe + 0.35) / 0.8157) - SPe);
  const Emin = roundUpToX90(((T + SPe + 0.35) / 0.8157) - SPe);
  const Eoff = automaticOffer(E, Emin);

  const D = roundUpToX90(V * 1.155 + 1.45);
  const Dmin = V;
  const Doff = automaticOffer(D, Dmin);

  const DB = roundUpToX90(V * 1.272 + 2.2);
  const DBmin = roundUpToX90(V * 1.06 + 1);
  const DBoff = automaticOffer(DB, DBmin);

  const G = roundUpToWhole(((((V * EUR_TO_USD) + 20 + 0.49) / 0.8901) - 20));
  const Gmin = roundUpToWhole(((((T * EUR_TO_USD) + 20 + 0.49) / 0.8901) - 20));

  return {
    target: T,
    ebayShipping: SPe,
    prices: {
      vinted: V,
      wallapop: V,
      ebay: E,
      subito: S,
      facebook: S,
      vestiaire,
      depop: D,
      depopBoost: DB,
      grailed: G,
    },
    minimums: {
      ebay: Emin,
      depop: Dmin,
      depopBoost: DBmin,
      grailed: Gmin,
    },
    offers: {
      ebay: Eoff,
      depop: Doff,
      depopBoost: DBoff,
    },
  };
}
