/**
 * Binder Auto-Quote Engine
 * 
 * Calculates premiums automatically when a placement is submitted to a binder,
 * using the binder's rating rules applied to the placement's fleet and coverage data.
 * 
 * For HL product: uses rate tables (hull % by value band, liability flat by limit band)
 * with engine category columns (SEP, MEP, SET, MET).
 * For other products: uses simple flat/percentage rates.
 */

import type { Binder, BinderRating, Quote, Placement } from "../App";
import { convertCurrency, formatConversionNote } from "./currencyRates";

interface FleetAircraft {
  registration: string;
  aircraftType: string; // "fixed-wing" | "rotary-wing" | "RPAS/Drone"
  engineType: string;   // "single-engine-piston" | "multi-engine-piston" | "single-engine-turboprop" | "multi-engine-turboprop" | "multi-engine-jet" | "twin-engine-piston" | "single-engine-turbine" | "twin-engine-turbine"
  make: string;
  model: string;
  aircraftAgreedValue: string;
  aircraftAgreedValueCurrency: string;
  liabilityLimit: string;
  liabilityLimitCurrency: string;
  liabilityType: string;
  crewSeats: string;
  paxSeats: string;
  sumsReinsured: string;
  sumsReinsuredCurrency: string;
  crewSumsReinsuredPerSeat?: string;
  paxSumsReinsuredPerSeat?: string;
  [key: string]: any;
}

interface AutoQuoteResult {
  quote: Omit<Quote, "id" | "submittedDate">;
  breakdown: {
    totalHullPremium: number;
    totalLiabilityPremium: number;
    totalPphPremium: number;
    totalWarPremium: number;
    ageLoadingAmount: number;
    subtotalBeforeLoadings: number;
    subtotalAfterLoadings: number;
    finalPremium: number;
    // LOL-specific breakdown
    lolPilotBreakdown?: {
      pilotName: string;
      age: number;
      sumInsured: number;
      rate: number;
      premium: number;
      ageBand: string;
      sumInsuredBand: number;
    }[];
    totalLolPremium?: number;
    // HD-specific breakdown
    hdAircraftBreakdown?: {
      registration: string;
      aircraftDesc: string;
      engineCategory: string;
      standardDeductible: number;
      buydownDeductible: number;
      sumsReinsured: number;
      rateOnLine: number;
      premium: number;
    }[];
    totalHdPremium?: number;
  };
}

// ── Engine category types ──
type EngineCategory = "sep" | "mep" | "set" | "met";

// ── HD engine category types (different column structure) ──
type HdFwEngineCategory = "mej" | "metp" | "setp";
type HdRwEngineCategory = "tet" | "set" | "tep";

// ── UAS (Drone) category types ──
type UasDroneCategory = "mr" | "fw" | "hv";

/**
 * Map a UAS drone's make/model to the UAS rate table column.
 * UAS columns: mr (Multi-Rotor), fw (Fixed Wing), hv (Hybrid VTOL)
 * Infers from make/model text; defaults to multi-rotor (most common drone type).
 */
function getUasDroneCategory(aircraft: FleetAircraft): UasDroneCategory {
  const text = `${aircraft.make || ""} ${aircraft.model || ""} ${aircraft.aircraftType || ""}`.toLowerCase();
  if (text.includes("hybrid") || text.includes("vtol") || text.includes("tilt")) return "hv";
  if (text.includes("fixed") || text.includes("wing") || text.includes("plane")) return "fw";
  // Multi-rotor is the default / most common UAS type
  return "mr";
}

/**
 * Map an aircraft's engineType to the HD Fixed Wing rate table column.
 * FW columns: mej (Multi-Engine Jet), metp (Multi-Engine Turboprop), setp (Single Engine Turboprop)
 */
function getHdFwEngineCategory(engineType: string): HdFwEngineCategory {
  const lower = (engineType || "").toLowerCase();
  if (lower === "multi-engine-jet" || lower.includes("jet")) return "mej";
  if (lower === "multi-engine-turboprop" || (lower.includes("multi") && lower.includes("turbo"))) return "metp";
  if (lower === "single-engine-turboprop" || (lower.includes("single") && lower.includes("turbo"))) return "setp";
  // Fallback: turboprops default to single
  if (lower.includes("turbo")) return "setp";
  return "mej"; // conservative fallback
}

/**
 * Map an aircraft's engineType to the HD Rotary Wing rate table column.
 * RW columns: tet (Twin Engine Turbine), set (Single Engine Turbine), tep (Twin Engine Piston)
 */
function getHdRwEngineCategory(engineType: string): HdRwEngineCategory {
  const lower = (engineType || "").toLowerCase();
  if (lower === "twin-engine-turbine" || (lower.includes("twin") && lower.includes("turbine"))) return "tet";
  if (lower === "single-engine-turbine" || (lower.includes("single") && lower.includes("turbine"))) return "set";
  if (lower === "twin-engine-piston" || (lower.includes("twin") && lower.includes("piston"))) return "tep";
  // Fallback inferences
  if (lower.includes("piston")) return "tep";
  if (lower.includes("single")) return "set";
  return "tet"; // conservative fallback
}

/**
 * Look up HD Rate on Line (%) from an HD rate table with linear interpolation.
 * The table is keyed on maxSumReinsured and has engine-category columns.
 */
function lookupHdRate<T extends string>(
  table: ({ maxSumReinsured: number } & Record<T, number>)[],
  sumsReinsured: number,
  engineCol: T
): number {
  if (!table || table.length === 0) return 0;
  const sorted = [...table].sort((a, b) => a.maxSumReinsured - b.maxSumReinsured);

  if (sumsReinsured <= sorted[0].maxSumReinsured) return sorted[0][engineCol];
  if (sumsReinsured >= sorted[sorted.length - 1].maxSumReinsured) return sorted[sorted.length - 1][engineCol];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sumsReinsured >= sorted[i].maxSumReinsured && sumsReinsured <= sorted[i + 1].maxSumReinsured) {
      return lerp(sumsReinsured, sorted[i].maxSumReinsured, sorted[i + 1].maxSumReinsured, sorted[i][engineCol], sorted[i + 1][engineCol]);
    }
  }
  return sorted[sorted.length - 1][engineCol];
}

/**
 * Parse a comma-separated number string into a float
 */
function parseAmount(value: string | undefined): number {
  if (!value) return 0;
  return parseFloat(value.replace(/,/g, "")) || 0;
}

/**
 * Determine if an aircraft is rotary wing based on its type field
 */
function isRotaryWing(aircraftType: string): boolean {
  const lower = (aircraftType || "").toLowerCase();
  return lower.includes("rotary") || lower.includes("helicopter") || lower.includes("rotor");
}

/**
 * Map an aircraft's engineType string to one of the four rate table columns.
 * Fixed Wing engines: single-engine-piston, multi-engine-piston, single-engine-turboprop, multi-engine-turboprop, multi-engine-jet
 * Rotary Wing engines: single-engine-piston, twin-engine-piston, single-engine-turbine, twin-engine-turbine
 */
function getEngineCategory(engineType: string): EngineCategory {
  const lower = (engineType || "").toLowerCase();

  // Single engine piston
  if (lower === "single-engine-piston") return "sep";

  // Multi-engine piston (includes twin-engine-piston for rotary)
  if (lower === "multi-engine-piston" || lower === "twin-engine-piston") return "mep";

  // Single engine turbine (includes turboprop)
  if (lower === "single-engine-turboprop" || lower === "single-engine-turbine") return "set";

  // Multi-engine turbine (includes turboprop, jet, twin-engine-turbine)
  if (
    lower === "multi-engine-turboprop" ||
    lower === "multi-engine-jet" ||
    lower === "twin-engine-turbine" ||
    lower === "multi-engine-turbine"
  ) return "met";

  // Fallback: try to infer from partial matches
  if (lower.includes("single") && lower.includes("piston")) return "sep";
  if (lower.includes("piston")) return "mep";
  if (lower.includes("single") && (lower.includes("turb") || lower.includes("turbine"))) return "set";
  if (lower.includes("turb") || lower.includes("jet") || lower.includes("turbine")) return "met";

  // Ultimate fallback → single engine piston (most conservative/expensive rate)
  return "sep";
}

/**
 * Linear interpolation helper.
 * Given a value between x0 and x1, returns the interpolated y between y0 and y1.
 */
function lerp(value: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0; // Avoid division by zero
  const t = (value - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

/**
 * Look up a LOL rate from the 2D rate table (sum insured bands × age bands).
 * Uses "round up to nearest band" logic on both axes:
 * - Finds the lowest age band whose maxAge >= pilot age (or last band if older than all)
 * - Finds the lowest sum insured band whose maxLimit >= sum insured (or last band if higher than all)
 * - Returns the rate at that intersection.
 */
function lookupLolRate(
  lolRateTable: { maxLimit: number; rates: number[] }[],
  lolAgeBands: { minAge: number; maxAge: number }[],
  sumInsured: number,
  pilotAge: number
): number {
  if (!lolRateTable || lolRateTable.length === 0 || !lolAgeBands || lolAgeBands.length === 0) return 0;

  // Sort age bands ascending by maxAge to find the "round up" band
  const sortedAgeBands = lolAgeBands.map((b, i) => ({ ...b, originalIndex: i })).sort((a, b) => a.maxAge - b.maxAge);
  // Find the first age band whose maxAge >= pilotAge (round up)
  let ageBandIndex = sortedAgeBands.findIndex(b => pilotAge <= b.maxAge);
  if (ageBandIndex === -1) {
    // Pilot older than all bands → use the last (highest) age band
    ageBandIndex = sortedAgeBands.length - 1;
  }
  const ageColumnIndex = sortedAgeBands[ageBandIndex].originalIndex;

  // Sort sum insured bands ascending by maxLimit
  const sortedRows = lolRateTable.map((r, i) => ({ ...r, originalIndex: i })).sort((a, b) => a.maxLimit - b.maxLimit);
  // Find the first sum insured band whose maxLimit >= sumInsured (round up)
  let rowIndex = sortedRows.findIndex(r => sumInsured <= r.maxLimit);
  if (rowIndex === -1) {
    // Sum insured exceeds all bands → use the last (highest) band
    rowIndex = sortedRows.length - 1;
  }

  const rates = sortedRows[rowIndex].rates || [];
  return rates[ageColumnIndex] || 0;
}

/**
 * Look up a rate from a hull rate table with linear interpolation.
 * Bands are sorted ascending by maxValue.
 * - If value ≤ first band, returns the first band's rate (no extrapolation below).
 * - If value ≥ last band, returns the last band's rate (no extrapolation above).
 * - If value falls between two bands, linearly interpolates the rate.
 */
function lookupHullRate(
  table: { maxValue: number; sep: number; mep: number; set: number; met: number }[],
  hullValue: number,
  engineCat: EngineCategory
): number {
  if (!table || table.length === 0) return 0;

  const sorted = [...table].sort((a, b) => a.maxValue - b.maxValue);

  // Below or equal to the first band
  if (hullValue <= sorted[0].maxValue) {
    return sorted[0][engineCat];
  }
  // Above or equal to the last band
  if (hullValue >= sorted[sorted.length - 1].maxValue) {
    return sorted[sorted.length - 1][engineCat];
  }

  // Find the two surrounding bands and interpolate
  for (let i = 0; i < sorted.length - 1; i++) {
    if (hullValue >= sorted[i].maxValue && hullValue <= sorted[i + 1].maxValue) {
      return lerp(
        hullValue,
        sorted[i].maxValue,
        sorted[i + 1].maxValue,
        sorted[i][engineCat],
        sorted[i + 1][engineCat]
      );
    }
  }

  return sorted[sorted.length - 1][engineCat];
}

/**
 * Look up a flat liability premium from a liability rate table using "next band above" logic.
 * If the exact limit isn't in the table, the price from the next higher band is used.
 * e.g. if we need USD 27,500,000 and the table has 25M and 30M, the 30M price applies.
 */
function lookupLiabilityAmount(
  table: { maxLimit: number; sep: number; mep: number; set: number; met: number }[],
  liabilityLimit: number,
  engineCat: EngineCategory
): number {
  if (!table || table.length === 0) return 0;

  const sorted = [...table].sort((a, b) => a.maxLimit - b.maxLimit);

  // Find the first band whose maxLimit >= the requested limit (round up)
  const matchIdx = sorted.findIndex(row => liabilityLimit <= row.maxLimit);
  if (matchIdx !== -1) {
    return sorted[matchIdx][engineCat];
  }

  // Limit exceeds all bands → use the last (highest) band
  return sorted[sorted.length - 1][engineCat];
}

/**
 * Look up a flat UAS liability premium using "next band above" logic.
 * Same ceiling logic as HL liability: if the limit falls between bands,
 * the price from the next higher band is used.
 */
function lookupUasLiabilityAmount(
  table: { maxLimit: number; mr: number; fw: number; hv: number }[],
  liabilityLimit: number,
  droneCat: UasDroneCategory
): number {
  if (!table || table.length === 0) return 0;

  const sorted = [...table].sort((a, b) => a.maxLimit - b.maxLimit);

  // Find the first band whose maxLimit >= the requested limit (round up)
  const matchIdx = sorted.findIndex(row => liabilityLimit <= row.maxLimit);
  if (matchIdx !== -1) {
    return sorted[matchIdx][droneCat];
  }

  // Limit exceeds all bands → use the last (highest) band
  return sorted[sorted.length - 1][droneCat];
}

/**
 * Look up a UAS hull rate (%) from the UAS hull rate table with linear interpolation.
 * Same interpolation logic as HL hull rates but keyed on maxValue with drone-type columns.
 */
function lookupUasHullRate(
  table: { maxValue: number; mr: number; fw: number; hv: number }[],
  hullValue: number,
  droneCat: UasDroneCategory
): number {
  if (!table || table.length === 0) return 0;

  const sorted = [...table].sort((a, b) => a.maxValue - b.maxValue);

  if (hullValue <= sorted[0].maxValue) return sorted[0][droneCat];
  if (hullValue >= sorted[sorted.length - 1].maxValue) return sorted[sorted.length - 1][droneCat];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (hullValue >= sorted[i].maxValue && hullValue <= sorted[i + 1].maxValue) {
      return lerp(hullValue, sorted[i].maxValue, sorted[i + 1].maxValue, sorted[i][droneCat], sorted[i + 1][droneCat]);
    }
  }
  return sorted[sorted.length - 1][droneCat];
}

/**
 * Calculate hull premium for a single aircraft.
 * For HL product with rate tables: uses table lookup by value band + engine category.
 * For other products: uses simple FW/RW rate.
 * 
 * Band lookup converts hull value to rateTableCurrency for band selection,
 * but the percentage rate is applied to the original hull value so the
 * premium comes out in the aircraft's native currency.
 */
function calculateHullPremium(aircraft: FleetAircraft, rating: BinderRating, productCode: string, rateTableCcy: string): number {
  const hullValue = parseAmount(aircraft.aircraftAgreedValue);
  if (hullValue <= 0) return 0;

  const rotary = isRotaryWing(aircraft.aircraftType);

  // UAS product with UAS hull rate table
  if (productCode === "UAS") {
    const uasTable = rating.uasHullRateTable;
    if (uasTable && uasTable.length > 0) {
      const droneCat = getUasDroneCategory(aircraft);
      const valueCcy = aircraft.aircraftAgreedValueCurrency || "USD";
      const hullValueInTableCcy = convertCurrency(hullValue, valueCcy, rateTableCcy);
      const ratePct = lookupUasHullRate(uasTable, hullValueInTableCcy, droneCat);
      return hullValue * (ratePct / 100);
    }
  }

  // HL / HW product with rate tables
  if (productCode === "HL" || productCode === "HW") {
    const table = rotary ? rating.hullRateTableRW : rating.hullRateTableFW;
    if (table && table.length > 0) {
      const engineCat = getEngineCategory(aircraft.engineType);
      // Convert hull value to rate table currency for band lookup
      const valueCcy = aircraft.aircraftAgreedValueCurrency || "USD";
      const hullValueInTableCcy = convertCurrency(hullValue, valueCcy, rateTableCcy);
      const ratePct = lookupHullRate(table, hullValueInTableCcy, engineCat);
      // Apply percentage to ORIGINAL value → premium in aircraft's currency
      return hullValue * (ratePct / 100);
    }
  }

  // Fallback: simple FW/RW rate
  const rate = rotary ? rating.hullRateRotaryWing : rating.hullRateFixedWing;
  return hullValue * (rate / 100);
}

/**
 * Get the hull rate used for a single aircraft (for display in quote breakdown)
 */
function getHullRate(aircraft: FleetAircraft, rating: BinderRating, productCode: string, rateTableCcy: string): number {
  const hullValue = parseAmount(aircraft.aircraftAgreedValue);
  const rotary = isRotaryWing(aircraft.aircraftType);

  // UAS product with UAS hull rate table
  if (productCode === "UAS") {
    const uasTable = rating.uasHullRateTable;
    if (uasTable && uasTable.length > 0) {
      const droneCat = getUasDroneCategory(aircraft);
      const valueCcy = aircraft.aircraftAgreedValueCurrency || "USD";
      const hullValueInTableCcy = convertCurrency(hullValue, valueCcy, rateTableCcy);
      return lookupUasHullRate(uasTable, hullValueInTableCcy, droneCat);
    }
  }

  if (productCode === "HL" || productCode === "HW") {
    const table = rotary ? rating.hullRateTableRW : rating.hullRateTableFW;
    if (table && table.length > 0) {
      const engineCat = getEngineCategory(aircraft.engineType);
      const valueCcy = aircraft.aircraftAgreedValueCurrency || "USD";
      const hullValueInTableCcy = convertCurrency(hullValue, valueCcy, rateTableCcy);
      return lookupHullRate(table, hullValueInTableCcy, engineCat);
    }
  }

  return rotary ? rating.hullRateRotaryWing : rating.hullRateFixedWing;
}

/**
 * Calculate liability premium for a single aircraft.
 * For HL product with rate tables: uses table lookup by limit band + engine category.
 * For other products: uses simple rate type (per_seat, flat, percentage).
 * 
 * Liability table outputs are FLAT AMOUNTS in the rate table currency.
 * These are converted to the quote currency for the final premium.
 */
function calculateLiabilityPremium(aircraft: FleetAircraft, rating: BinderRating, productCode: string, rateTableCcy: string, quoteCcy: string): number {
  const liabilityLimit = parseAmount(aircraft.liabilityLimit);
  const totalSeats = (parseInt(aircraft.crewSeats) || 0) + (parseInt(aircraft.paxSeats) || 0);
  const rotary = isRotaryWing(aircraft.aircraftType);

  let tablePremium = 0;
  let perSeatPremium = 0;

  // UAS product with UAS liability rate table (next-band-above logic)
  if (productCode === "UAS") {
    const uasTable = rating.uasLiabilityRateTable;
    if (uasTable && uasTable.length > 0 && liabilityLimit > 0) {
      const droneCat = getUasDroneCategory(aircraft);
      const limitCcy = aircraft.liabilityLimitCurrency || "USD";
      const limitInTableCcy = convertCurrency(liabilityLimit, limitCcy, rateTableCcy);
      const flatInTableCcy = lookupUasLiabilityAmount(uasTable, limitInTableCcy, droneCat);
      return convertCurrency(flatInTableCcy, rateTableCcy, quoteCcy);
    }
  }

  // HL product with rate tables
  if (productCode === "HL") {
    const table = rotary ? rating.liabilityRateTableRW : rating.liabilityRateTableFW;
    if (table && table.length > 0) {
      const engineCat = getEngineCategory(aircraft.engineType);
      // Convert liability limit to rate table currency for band lookup
      const limitCcy = aircraft.liabilityLimitCurrency || "USD";
      const limitInTableCcy = convertCurrency(liabilityLimit, limitCcy, rateTableCcy);
      // Flat amount returned is in rateTableCurrency — convert to quote currency
      const flatInTableCcy = lookupLiabilityAmount(table, limitInTableCcy, engineCat);
      tablePremium = convertCurrency(flatInTableCcy, rateTableCcy, quoteCcy);
    }

    // Add per-seat if configured (per-seat rate is in the binder's liability currency)
    if (rating.liabilityPerSeatRate && rating.liabilityPerSeatRate > 0) {
      const perSeatCcy = rating.liabilityPerSeatCurrency || rateTableCcy;
      const rawPerSeat = rating.liabilityPerSeatRate * Math.max(totalSeats, 1);
      perSeatPremium = convertCurrency(rawPerSeat, perSeatCcy, quoteCcy);
    }

    if (tablePremium > 0 || perSeatPremium > 0) {
      return tablePremium + perSeatPremium;
    }
  }

  // Fallback: simple rate type
  const liabCcy = rating.liabilityCurrency || "USD";
  switch (rating.liabilityRateType) {
    case "per_seat":
      return convertCurrency(rating.liabilityRate * Math.max(totalSeats, 1), liabCcy, quoteCcy);
    case "flat":
      return convertCurrency(rating.liabilityRate, liabCcy, quoteCcy);
    case "percentage":
      // Percentage applied to limit in its own currency, premium in that currency
      return liabilityLimit * (rating.liabilityRate / 100);
    default:
      return 0;
  }
}

/**
 * Calculate war premium for a single aircraft (HW product only)
 */
function calculateWarPremium(aircraft: FleetAircraft, rating: BinderRating, productCode: string): number {
  if (productCode !== "HW" || !rating.warRate) return 0;
  const hullValue = parseAmount(aircraft.aircraftAgreedValue) || parseAmount(aircraft.sumsReinsured);
  return hullValue * (rating.warRate / 100);
}

// Spares premium is included within the hull rate — no separate calculation needed.

/**
 * Calculate age loading for a single aircraft (based on year of manufacture)
 */
function calculateAgeLoading(aircraft: FleetAircraft, rating: BinderRating): number {
  if (!rating.ageLoadings || rating.ageLoadings.length === 0) return 0;

  const yom = parseInt(aircraft.yearOfManufacture);
  if (!yom || isNaN(yom)) return 0;

  const currentYear = new Date().getFullYear();
  const age = currentYear - yom;

  for (const band of rating.ageLoadings) {
    if (age >= band.fromYears && age <= band.toYears) {
      return band.loadingPercent;
    }
  }
  return 0;
}

/**
 * Check if a placement's uses are eligible for auto-quoting by this binder.
 * Returns true if binder has no approved uses (all uses allowed) or
 * all of the placement's uses are within the binder's approved list.
 */
export function isEligibleForAutoQuote(
  placement: Placement,
  binder: Binder
): { eligible: boolean; reason?: string } {
  const approvedUses = binder.ratingRules?.approvedUses;
  
  // If no approved uses configured, all uses are eligible
  if (!approvedUses || approvedUses.length === 0) {
    return { eligible: true };
  }

  const placementStandardUses: string[] = placement.draftData?.standardUses || [];
  const placementSpecialUses: string[] = placement.draftData?.specialUses || [];
  const allPlacementUses = [...placementStandardUses, ...placementSpecialUses];

  // If placement has no uses declared, it's eligible (no conflict)
  if (allPlacementUses.length === 0) {
    return { eligible: true };
  }

  // Check every placement use is within the binder's approved list
  const unapprovedUses = allPlacementUses.filter(use => !approvedUses.includes(use));
  
  if (unapprovedUses.length > 0) {
    return {
      eligible: false,
      reason: `Unapproved use(s): ${unapprovedUses.join(", ")}. Binder only auto-quotes: ${approvedUses.join(", ")}.`,
    };
  }

  return { eligible: true };
}

/**
 * Main auto-quote calculation function
 */
export function calculateBinderQuote(
  placement: Placement,
  binder: Binder
): AutoQuoteResult {
  const rating = binder.ratingRules;
  const fleet: FleetAircraft[] = placement.draftData?.fleet || [];
  const productCode = placement.productCode;
  const rateTableCcy = rating.rateTableCurrency || "USD";

  // ── Per-aircraft calculations ──
  const hullRates: Quote["hullRates"] = [];
  const liabilityRates: Quote["liabilityRates"] = [];
  let totalHullPremium = 0;
  let totalLiabilityPremium = 0;
  let totalPphPremium = 0;
  let totalWarPremium = 0;
  let weightedAgeLoading = 0;
  let totalHullValueForWeighting = 0;

  for (const aircraft of fleet) {
    const hullValue = parseAmount(aircraft.aircraftAgreedValue);
    const hullPremium = calculateHullPremium(aircraft, rating, productCode, rateTableCcy);
    const rate = getHullRate(aircraft, rating, productCode, rateTableCcy);

    hullRates.push({
      registration: aircraft.registration || "TBA",
      aircraftType: `${aircraft.make || ""} ${aircraft.model || ""}`.trim() || aircraft.aircraftType,
      hullValue,
      rate,
      hullPremium,
    });
    totalHullPremium += hullPremium;

    // Liability
    const quoteCcy = rating.liabilityCurrency || fleet[0]?.aircraftAgreedValueCurrency || "USD";
    const liabilityPremium = calculateLiabilityPremium(aircraft, rating, productCode, rateTableCcy, quoteCcy);
    const liabilityLimit = parseAmount(aircraft.liabilityLimit);
    liabilityRates.push({
      registration: aircraft.registration || "TBA",
      liabilityType: aircraft.liabilityType || rating.liabilityRateType,
      liabilityLimit,
      premium: liabilityPremium,
    });
    totalLiabilityPremium += liabilityPremium;

    // War premium (legacy — warRate no longer used; HW uses hull rate tables directly)

    // Age loading (weighted by hull value)
    const ageLoadingPct = calculateAgeLoading(aircraft, rating);
    weightedAgeLoading += ageLoadingPct * hullValue;
    totalHullValueForWeighting += hullValue;
  }

  // PPH premium — lookup from rate table (round up to nearest band)
  const pphLimit = parseAmount(placement.draftData?.pphLimit);
  const pphCurrency = placement.draftData?.pphCurrency || "USD";
  if (pphLimit > 0) {
    const primaryAircraft = fleet[0];
    const pphRotary = primaryAircraft ? isRotaryWing(primaryAircraft.aircraftType) : false;
    const pphTable = pphRotary ? rating.pphRateTableRW : rating.pphRateTableFW;
    const quoteCcy = rating.liabilityCurrency || fleet[0]?.aircraftAgreedValueCurrency || "USD";

    if (pphTable && pphTable.length > 0 && primaryAircraft) {
      const engineCat = getEngineCategory(primaryAircraft.engineType);
      // Convert PPH limit to rate table currency for band lookup
      const pphLimitInTableCcy = convertCurrency(pphLimit, pphCurrency, rateTableCcy);
      // Flat amount returned is in rateTableCurrency — convert to quote currency
      const flatInTableCcy = lookupLiabilityAmount(pphTable, pphLimitInTableCcy, engineCat);
      totalPphPremium = convertCurrency(flatInTableCcy, rateTableCcy, quoteCcy);
    }
  }

  // ── LOL-specific: per-pilot premium from 2D rate table (sum insured × age) ──
  let totalLolPremium = 0;
  const lolPilotBreakdown: AutoQuoteResult["breakdown"]["lolPilotBreakdown"] = [];
  if (productCode === "LOL") {
    const lolPilots: any[] = placement.draftData?.lolPilots || [];
    const lolRateTable = rating.lolRateTable;
    const lolAgeBands = rating.lolAgeBands;

    if (lolPilots.length > 0 && lolRateTable && lolRateTable.length > 0 && lolAgeBands && lolAgeBands.length > 0) {
      for (const pilot of lolPilots) {
        const pilotAge = parseInt(pilot.age) || 0;
        const sumInsured = parseAmount(pilot.sumInsured);
        if (sumInsured <= 0) continue;

        // Convert sum insured to rate table currency for band lookup
        const siCcy = pilot.sumInsuredCurrency || "USD";
        const sumInsuredInTableCcy = convertCurrency(sumInsured, siCcy, rateTableCcy);
        const ratePct = lookupLolRate(lolRateTable, lolAgeBands, sumInsuredInTableCcy, pilotAge);
        // Apply percentage to ORIGINAL sum insured → premium in pilot's currency
        const pilotPremium = sumInsured * (ratePct / 100);

        // Determine which bands were matched for the breakdown
        const sortedAgeBands = [...lolAgeBands].sort((a, b) => a.maxAge - b.maxAge);
        const matchedAgeBand = sortedAgeBands.find(b => pilotAge <= b.maxAge) || sortedAgeBands[sortedAgeBands.length - 1];
        const sortedRows = [...lolRateTable].sort((a, b) => a.maxLimit - b.maxLimit);
        const matchedRow = sortedRows.find(r => sumInsuredInTableCcy <= r.maxLimit) || sortedRows[sortedRows.length - 1];

        lolPilotBreakdown!.push({
          pilotName: pilot.pilotName || pilot.name || `Pilot`,
          age: pilotAge,
          sumInsured,
          rate: ratePct,
          premium: Math.round(pilotPremium * 100) / 100,
          ageBand: `${matchedAgeBand.minAge}–${matchedAgeBand.maxAge}`,
          sumInsuredBand: matchedRow.maxLimit,
        });
        totalLolPremium += pilotPremium;
      }
    } else if (lolPilots.length > 0 && rating.lolRatePerPilot) {
      // Fallback to legacy flat rate per pilot if no 2D table configured
      for (const pilot of lolPilots) {
        const sumInsured = parseAmount(pilot.sumInsured);
        if (sumInsured <= 0) continue;
        const pilotPremium = sumInsured * (rating.lolRatePerPilot / 100);
        lolPilotBreakdown!.push({
          pilotName: pilot.pilotName || pilot.name || `Pilot`,
          age: parseInt(pilot.age) || 0,
          sumInsured,
          rate: rating.lolRatePerPilot,
          premium: Math.round(pilotPremium * 100) / 100,
          ageBand: "flat",
          sumInsuredBand: 0,
        });
        totalLolPremium += pilotPremium;
      }
    }
  }

  // ── HD-specific: per-aircraft premium from HD rate table (sums reinsured × engine category) ──
  let totalHdPremium = 0;
  const hdAircraftBreakdown: AutoQuoteResult["breakdown"]["hdAircraftBreakdown"] = [];
  if (productCode === "HD") {
    const hdFwEngineLabels: Record<HdFwEngineCategory, string> = {
      mej: "ME Jet", metp: "ME Turboprop", setp: "SE Turboprop",
    };
    const hdRwEngineLabels: Record<HdRwEngineCategory, string> = {
      tet: "Twin Turbine", set: "Single Turbine", tep: "Twin Piston",
    };

    for (const aircraft of fleet) {
      // Sums Reinsured = Standard Deductible − Buydown Deductible (auto-calculated in UI)
      // It's stored on the aircraft object; fall back to computing from standardDeductible/deductibleBuydown
      let sumsReinsured = parseAmount(aircraft.sumsReinsured);
      if (sumsReinsured <= 0) {
        const stdDed = parseAmount(aircraft.standardDeductible);
        const buydown = parseAmount(aircraft.deductibleBuydown);
        sumsReinsured = Math.max(stdDed - buydown, 0);
      }
      if (sumsReinsured <= 0) continue;

      const rotary = isRotaryWing(aircraft.aircraftType);
      const srCcy = aircraft.sumsReinsuredCurrency || aircraft.standardDeductibleCurrency || "USD";
      const sumsReinsuredInTableCcy = convertCurrency(sumsReinsured, srCcy, rateTableCcy);

      let rateOnLine = 0;
      let engineLabel = "Unknown";

      if (rotary) {
        const hdRwTable = rating.hdRateTableRW;
        if (hdRwTable && hdRwTable.length > 0) {
          const engineCat = getHdRwEngineCategory(aircraft.engineType);
          rateOnLine = lookupHdRate(hdRwTable, sumsReinsuredInTableCcy, engineCat);
          engineLabel = hdRwEngineLabels[engineCat];
        }
      } else {
        const hdFwTable = rating.hdRateTableFW;
        if (hdFwTable && hdFwTable.length > 0) {
          const engineCat = getHdFwEngineCategory(aircraft.engineType);
          rateOnLine = lookupHdRate(hdFwTable, sumsReinsuredInTableCcy, engineCat);
          engineLabel = hdFwEngineLabels[engineCat];
        }
      }

      // Premium = Sums Reinsured × Rate on Line %
      const aircraftPremium = sumsReinsured * (rateOnLine / 100);

      const stdDed = parseAmount(aircraft.standardDeductible);
      const buydown = parseAmount(aircraft.deductibleBuydown);

      hdAircraftBreakdown!.push({
        registration: aircraft.registration || "TBA",
        aircraftDesc: `${aircraft.make || ""} ${aircraft.model || ""}`.trim() || aircraft.aircraftType,
        engineCategory: engineLabel,
        standardDeductible: stdDed,
        buydownDeductible: buydown,
        sumsReinsured,
        rateOnLine,
        premium: Math.round(aircraftPremium * 100) / 100,
      });
      totalHdPremium += aircraftPremium;
    }
  }

  // ── Subtotal before loadings ──
  const subtotalBeforeLoadings = totalHullPremium + totalLiabilityPremium + totalPphPremium + totalWarPremium + totalLolPremium + totalHdPremium;

  // ── Age loading (weighted average applied to hull premium) ──
  let ageLoadingAmount = 0;
  if (totalHullValueForWeighting > 0 && weightedAgeLoading > 0) {
    const avgAgeLoadingPct = weightedAgeLoading / totalHullValueForWeighting;
    ageLoadingAmount = totalHullPremium * (avgAgeLoadingPct / 100);
  }

  // ── Total after loadings ──
  const subtotalAfterLoadings = subtotalBeforeLoadings + ageLoadingAmount;
  const finalPremium = subtotalAfterLoadings;

  // ── Determine currency ──
  const currency = rating.liabilityCurrency || fleet[0]?.aircraftAgreedValueCurrency || "USD";

  // ── Get lead underwriter from binder ──
  const leadUnderwriter = binder.underwriters.find(u => u.role === "Lead") || binder.underwriters[0];

  // ── Build terms description ──
  const termsLines: string[] = [
    `Auto-quoted via Binder: ${binder.name} (${binder.reference})`,
  ];

  // Note if FX conversion was applied
  const placementCcys = new Set<string>();
  for (const ac of fleet) {
    if (ac.aircraftAgreedValueCurrency) placementCcys.add(ac.aircraftAgreedValueCurrency);
    if (ac.liabilityLimitCurrency) placementCcys.add(ac.liabilityLimitCurrency);
  }
  const lolPilotsForFx: any[] = placement.draftData?.lolPilots || [];
  for (const p of lolPilotsForFx) {
    if (p.sumInsuredCurrency) placementCcys.add(p.sumInsuredCurrency);
  }
  const nonTableCcys = [...placementCcys].filter(c => c !== rateTableCcy);
  if (nonTableCcys.length > 0) {
    termsLines.push(`FX Note: Rate table bands denominated in ${rateTableCcy}. Placement values in ${nonTableCcys.join(", ")} converted at indicative mid-market rates for band selection only.`);
  }

  // Describe hull rating method
  if (productCode === "UAS" && rating.uasHullRateTable?.length) {
    termsLines.push(`UAS Hull: Interpolated rate table by value band & drone type (Multi-Rotor/Fixed Wing/Hybrid VTOL)`);
  } else if ((productCode === "HL" || productCode === "HW") && (rating.hullRateTableFW?.length || rating.hullRateTableRW?.length)) {
    termsLines.push(`Hull: Interpolated rate table by value band & engine type`);
  } else {
    if (rating.hullRateFixedWing) termsLines.push(`Hull Rate (FW): ${rating.hullRateFixedWing}%`);
    if (rating.hullRateRotaryWing) termsLines.push(`Hull Rate (RW): ${rating.hullRateRotaryWing}%`);
  }

  // Describe liability rating method
  if (productCode === "UAS" && rating.uasLiabilityRateTable?.length) {
    termsLines.push(`UAS Liability: Next-band-above lookup by limit band & drone type (Multi-Rotor/Fixed Wing/Hybrid VTOL)`);
  } else if (productCode === "HL" && (rating.liabilityRateTableFW?.length || rating.liabilityRateTableRW?.length)) {
    termsLines.push(`Liability: Next-band-above lookup by limit band & engine type`);
    if (rating.liabilityPerSeatRate) {
      termsLines.push(`Liability Per Seat: +${currency} ${rating.liabilityPerSeatRate.toLocaleString()} per seat`);
    }
  } else {
    if (rating.liabilityRateType === "per_seat") termsLines.push(`Liability: ${currency} ${rating.liabilityRate.toLocaleString()} per seat`);
    else if (rating.liabilityRateType === "flat") termsLines.push(`Liability: ${currency} ${rating.liabilityRate.toLocaleString()} flat`);
    else if (rating.liabilityRateType === "percentage") termsLines.push(`Liability: ${rating.liabilityRate}% of limit`);
  }

  if (ageLoadingAmount > 0) termsLines.push(`Age Loading: +${currency} ${Math.round(ageLoadingAmount).toLocaleString()}`);

  // Describe LOL rating method
  if (productCode === "LOL" && totalLolPremium > 0) {
    if (rating.lolRateTable?.length && rating.lolAgeBands?.length) {
      termsLines.push(`LOL: 2D rate table by sum insured band × pilot age band (${lolPilotBreakdown!.length} pilots)`);
    } else if (rating.lolRatePerPilot) {
      termsLines.push(`LOL: Flat ${rating.lolRatePerPilot}% of sum insured per pilot`);
    }
    for (const p of lolPilotBreakdown || []) {
      termsLines.push(`  ${p.pilotName} (age ${p.age}, band ${p.ageBand}): ${p.rate}% × ${currency} ${p.sumInsured.toLocaleString()} = ${currency} ${p.premium.toLocaleString()}`);
    }
  }

  // Describe HD rating method
  if (productCode === "HD" && totalHdPremium > 0) {
    if (rating.hdRateTableFW?.length || rating.hdRateTableRW?.length) {
      termsLines.push(`HD: Interpolated rate table by sums reinsured band × engine category (${hdAircraftBreakdown!.length} aircraft)`);
    }
    for (const a of hdAircraftBreakdown || []) {
      termsLines.push(`  ${a.registration} (${a.engineCategory}): ${a.rateOnLine.toFixed(3)}% × ${currency} ${a.sumsReinsured.toLocaleString()} = ${currency} ${a.premium.toLocaleString()}`);
    }
  }

  // ── Construct the Quote ──
  const quote: Omit<Quote, "id" | "submittedDate"> = {
    underwriterName: leadUnderwriter?.name || "Binder Auto-Quote",
    underwriterCompany: leadUnderwriter?.security || binder.name,
    premium: Math.round(finalPremium * 100) / 100,
    currency,
    writtenLine: 100,
    hullRates,
    hullPremiumTotal: Math.round(totalHullPremium * 100) / 100,
    liabilityPremium: Math.round(totalLiabilityPremium * 100) / 100,
    liabilityRates,
    sparesIncludedInHull: true,
    pphPremium: totalPphPremium > 0 ? Math.round(totalPphPremium * 100) / 100 : undefined,
    terms: termsLines.join("\n"),
    quoteValidUntil: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0];
    })(),
    // Snapshot placement data at quote time
    placementSnapshot: {
      draftData: { ...(placement.draftData || {}) },
      insuredName: placement.insuredName,
      productCode: placement.productCode,
      brokerName: placement.brokerName,
      brokerCompany: placement.brokerCompany,
      reference: placement.reference,
      facilityRef: placement.facilityRef,
      inceptionDate: placement.draftData?.inceptionDate || placement.inceptionDate,
      expiryDate: placement.draftData?.expiryDate,
    },
    // Additional binder-specific metadata
    autoQuoted: true,
    binderRef: binder.reference,
    binderName: binder.name,
    ageLoadingAmount: Math.round(ageLoadingAmount * 100) / 100,
    warPremium: totalWarPremium > 0 ? Math.round(totalWarPremium * 100) / 100 : undefined,
  };

  return {
    quote,
    breakdown: {
      totalHullPremium: Math.round(totalHullPremium * 100) / 100,
      totalLiabilityPremium: Math.round(totalLiabilityPremium * 100) / 100,
      totalPphPremium: Math.round(totalPphPremium * 100) / 100,
      totalWarPremium: Math.round(totalWarPremium * 100) / 100,
      ageLoadingAmount: Math.round(ageLoadingAmount * 100) / 100,
      subtotalBeforeLoadings: Math.round(subtotalBeforeLoadings * 100) / 100,
      subtotalAfterLoadings: Math.round(subtotalAfterLoadings * 100) / 100,
      finalPremium: Math.round(finalPremium * 100) / 100,
      // LOL-specific breakdown
      lolPilotBreakdown,
      totalLolPremium: Math.round(totalLolPremium * 100) / 100,
      // HD-specific breakdown
      hdAircraftBreakdown,
      totalHdPremium: Math.round(totalHdPremium * 100) / 100,
    },
  };
}