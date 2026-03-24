import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Placement, Lineslip, SlipWordingSection } from "../App";
import { FileText, Download, Eye, EyeOff, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { getDefaultSlipSections } from "./LineslipForm";
import locktonLogo from "../assets/6bc72288be3ad07846c1901f75701f70b1cba80a.png";

type DocumentType = "quotation" | "firmorder" | "eoc_covering_letter" | "claims_document";

interface SlipDocumentViewerProps {
  placement: Placement;
  lineslip: Lineslip | undefined;
  documentType: DocumentType;
  embedded?: boolean;
  currentUser?: any;
}

// Resolve a {{placeholder}} tag using placement + quote data
function resolvePlaceholder(tag: string, placement: Placement, lineslip: Lineslip | undefined, documentType: DocumentType = "firmorder"): string {
  const d = placement.draftData || {};
  const quote = placement.quotes?.[placement.quotes.length - 1];

  // ── Facility type detection ──
  const isBinder = (lineslip as any)?.facilityType === "binder";
  const facilityScheduleLabel = isBinder ? "As per Facility Schedule" : "As per Lineslip Schedule";

  // ── Reinsurance vs Insurance logic ──
  const isReinsurance = d.placementType === "reinsurance";

  const insuredAddressParts = [
    d.insuredAddressLine1,
    d.insuredCity,
    d.insuredPostcode,
    d.insuredCountry,
  ].filter(Boolean);
  const insuredAddress = insuredAddressParts.join(", ");

  const fleet = d.fleet || [];
  const aircraftSchedule = fleet.length > 0
    ? fleet.map((a: any, i: number) => {
        const reg = (a.registration || "TBD").toUpperCase();
        const type = a.aircraftType || a.type || "Unknown";
        const year = a.yearOfManufacture || a.year || "N/A";
        const rawVal = a.aircraftAgreedValue || a.agreedValue;
        const valCurrency = a.aircraftAgreedValueCurrency || a.agreedValueCurrency || d.aircraftAgreedValueCurrency || "USD";
        const val = rawVal
          ? `${valCurrency} ${Number(String(rawVal).replace(/,/g, "")).toLocaleString()}`
          : "TBD";
        return `${i + 1}. ${reg}  |  ${type}  |  YOM: ${year}  |  Agreed Value: ${val}`;
      }).join("\n")
    : "As per Aircraft Schedule attached";

  const geoLimits = d.geographicalLimits || d.geographicalLimit || "";
  const excludedCountries = d.excludedCountries || [];
  const geoText = geoLimits
    ? `${geoLimits}${excludedCountries.length > 0 ? `\nExcluding: ${excludedCountries.join(", ")}` : ""}`
    : "As per policy";

  const currency = d.aircraftAgreedValueCurrency || quote?.currency || "USD";
  const currSym = currency === "GBP" ? "GBP " : currency === "EUR" ? "EUR " : "USD ";

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "TBA";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      }).toUpperCase();
    } catch { return dateStr; }
  };

  const hullPremiumTotal = quote?.hullPremiumTotal || 0;
  const liabilityPremium = quote?.liabilityPremium || 0;
  const sparesPremium = quote?.sparesPremium || 0;
  const pphPremium = quote?.pphPremium || 0;
  const totalPremium = quote?.premium || (hullPremiumTotal + liabilityPremium + sparesPremium + pphPremium);

  const hullTotal = fleet.reduce((sum: number, a: any) => {
    const raw = a.aircraftAgreedValue || a.agreedValue;
    const val = typeof raw === "string" ? Number(raw.replace(/,/g, "")) : (raw || 0);
    return sum + val;
  }, 0);

  const liabilityLimit = d.liabilityLimit || d.liability || placement.liability;
  const liabilityCurrency = d.liabilityCurrency || currency;
  const liabSym = liabilityCurrency === "GBP" ? "GBP " : liabilityCurrency === "EUR" ? "EUR " : "USD ";

  // ── Liability type labels ──
  const liabilityTypeRaw = d.liabilityType || "CSL";
  const liabilityTypeFull = liabilityTypeRaw === "CSL" ? "Combined Single Limit" : liabilityTypeRaw === "TPL" ? "Third Party Liability" : liabilityTypeRaw;
  const liabilityTypeCode = liabilityTypeRaw === "Combined Single Limit" ? "CSL" : liabilityTypeRaw === "Third Party Liability" ? "TPL" : liabilityTypeRaw;

  const underwriterSchedule = lineslip?.underwriters
    ? lineslip.underwriters.map((u) =>
        `${u.name} — ${u.percentage.toFixed(2)}% (${u.role})`
      ).join("\n")
    : "As per Security Schedule";

  // ── Underwriter Table (Line Size | Underwriter Name) ──
  const underwriterTableText = (() => {
    const uws = lineslip?.underwriters;
    if (!uws || uws.length === 0) return "As per Security Schedule";

    const lines: string[] = [];
    lines.push("Line Size  |  Underwriter");
    lines.push("-".repeat(50));

    let totalLine = 0;
    for (const u of uws) {
      const pct = u.percentage ?? 0;
      totalLine += pct;
      const role = u.role === "Lead" ? "  (Lead)" : "";
      lines.push(`${pct.toFixed(2)}%  |  ${u.name}${role}`);
    }

    lines.push("-".repeat(50));
    lines.push(`${totalLine.toFixed(2)}%  |  Total`);

    return lines.join("\n");
  })();

  const productNames: Record<string, string> = {
    HL: "Hull & Liability", HW: "Hull War", PA: "Personal Accident",
    LOL: "Loss of Licence", HD: "Hull Deductible", UAS: "Drone Insurance",
  };

  const deductibles = d.deductibles || d.deductible || "";
  const reference = placement.reference || "";

  const sparesValue = d.aircraftSparesAmount
    ? `${d.aircraftSparesCurrency || currency} ${Number(String(d.aircraftSparesAmount).replace(/,/g, "")).toLocaleString()}`
    : "N/A";

  // ── Spares coverage detection ──
  // The Spares input card only renders when coverage applies (HL sub-coverage
  // checkbox ticked, or implicitly for HW).  Therefore if aircraftSparesAmount
  // has a value in draftData the user *must* have had coverage selected when
  // they entered it — we can trust the presence of the value itself rather than
  // re-checking sub-coverage flags (which differ between HL and HW flows).
  const productCode = d.productCode || placement.productCode || "";
  const sparesLimitText = d.aircraftSparesAmount
    ? `${d.aircraftSparesCurrency || currency} ${Number(String(d.aircraftSparesAmount).replace(/,/g, "")).toLocaleString()}`
    : "Not Covered";

  // ── Order Hereon ──
  const orderPercentages: Record<string, string> = d.orderHereonPercentage || {};
  const orderBases: Record<string, string> = d.orderHereonBasis || {};
  const ohPercent = orderPercentages[productCode] || "100";
  const ohBasis = orderBases[productCode] || "whole";
  const ohBasisLabel = ohBasis === "order" ? "Of Order" : "Of Whole";
  const orderHereonText = `${ohPercent}% of 100% ${ohBasisLabel}`;

  // ── Premium Breakdown (per-aircraft + spares/PPH/tax) ──
  const premiumBreakdownText = quote ? "__PREMIUM_BREAKDOWN_TABLE__" : "No quote available";

  // ── Geographical Limits (declared / not declared) ──
  const allSanctionedCountries = [
    // (a) Africa
    "Algeria", "Burundi", "Central African Republic", "Democratic Republic of Congo",
    "Ethiopia", "Far North Region of Cameroon", "Kenya", "Mali", "Mauritania",
    "Nigeria", "Somalia", "The Republic of Sudan", "South Sudan",
    // (b) Caribbean
    "Haiti",
    // (c) Asia
    "Afghanistan", "Jammu & Kashmir", "Myanmar", "North Korea", "Pakistan",
    // (d) Eastern Europe / Caucasus
    "Abkhazia", "Nagorno-Karabakh", "The Republic of Belarus", "The Russian Federation", "South Ossetia", "Ukraine",
    // (e) Middle East / North Africa
    "Iran", "Iraq", "Israel", "Lebanon", "Libya", "North Sinai Province of Egypt", "Syria", "Yemen",
  ];
  const selectedExcluded: string[] = d.excludedCountries || [];
  const notExcluded = allSanctionedCountries.filter(c => !selectedExcluded.includes(c));

  const geographicalLimitsText = (() => {
    const declaredSection = selectedExcluded.length > 0
      ? selectedExcluded.join(", ")
      : "None advised";

    const notDeclaredSection = notExcluded.length > 0
      ? notExcluded.join(", ")
      : "None";

    return [
      "You have declared that you are operating within the following regions or countries:",
      "",
      declaredSection,
      "",
      "Therefore, coverage in respect of operations within the above referenced countries is included hereunder, where applicable, and are not excluded under SITUATION.",
      "",
      "You have declared that you are not operating within the following regions or countries:",
      "",
      notDeclaredSection,
    ].join("\n");
  })();

  // ── Fleet Schedule (Reg | Type | M&M | Base Country | Base Region) ──
  const fleetScheduleText = fleet.length > 0 ? "__AIRCRAFT_SCHEDULE_TABLE__" : "Nil";

  // ── Aircraft Uses (Reg | Standard Uses | Special Uses) ──
  const aircraftUsesText = (() => {
    if (fleet.length === 0) return "Nil";
    return "__AIRCRAFT_USES_TABLE__";
  })();

  // ── Claims History ──
  const claimsArr: any[] = d.claims || [];
  const hasClaimsHistory = d.hasClaimsHistory === true && claimsArr.length > 0;
  const claimsHistoryText = hasClaimsHistory ? "__CLAIMS_TABLE__" : "Nil";

  // ── Reinsured details ──
  const reinsuredName = d.reinsuredName || "";
  const reinsuredAddressParts = [
    d.reinsuredAddressLine1,
    d.reinsuredCity,
    d.reinsuredPostcode,
    d.reinsuredCountry,
  ].filter(Boolean);
  const reinsuredAddress = reinsuredAddressParts.join(", ");

  // ── Additional Insureds ──
  const additionalInsureds = d.additionalInsureds || [];
  const additionalInsuredText = additionalInsureds.length > 0
    ? additionalInsureds.map((ai: any, i: number) => {
        return `${i + 1}. ${ai.name || "N/A"}`;
      }).join("\n")
    : "None Advised";

  const map: Record<string, string> = {
    "{{insured_name}}": placement.insuredName || d.insuredName || "TBD",
    "{{insured_address}}": insuredAddress || "Address to be confirmed",
    "{{insured_country}}": d.insuredCountry || "",
    "{{period_from}}": formatDate(d.inceptionDate || placement.inceptionDate),
    "{{period_to}}": formatDate(d.expiryDate),
    "{{period_text}}": (() => {
      const isQuoteStage = ["DRAFT", "COMPLIANCE", "PENDING", "QUOTED"].includes((placement.status || "").toUpperCase());
      const validUntil = quote?.quoteValidUntil ? formatDate(quote.quoteValidUntil) : "TBD";
      if (isQuoteStage) {
        return `Subject Approval, No Risk`;
      }
      const from = formatDate(d.inceptionDate || placement.inceptionDate);
      const to = formatDate(d.expiryDate);
      const party = isReinsurance ? "Reinsured" : "Insured";
      return `From: ${from} To: ${to}\nboth days inclusive, local standard time at the address of the ${party}.`;
    })(),
    "{{product_name}}": productNames[d.productCode || placement.productCode] || placement.productCode || "",
    "{{umr}}": ["DRAFT", "COMPLIANCE", "PENDING", "QUOTED"].includes((placement.status || "").toUpperCase())
      ? `Q${reference}`
      : reference,
    "{{aircraft_schedule}}": aircraftSchedule,
    "{{geographical_limits}}": geoText,
    "{{hull_value}}": hullTotal > 0 ? `${currSym}${hullTotal.toLocaleString()}` : "As per Schedule",
    "{{total_aircraft_values}}": hullTotal > 0 ? `${currSym}${hullTotal.toLocaleString()}` : "As per Schedule",
    "{{liability_limit}}": liabilityLimit ? `${liabSym}${Number(String(liabilityLimit).replace(/,/g, "")).toLocaleString()}` : "As per Schedule",
    "{{liability_type}}": liabilityTypeFull,
    "{{liability_type_short}}": liabilityTypeCode,
    "{{deductible_hull}}": deductibles || "As per policy schedule",
    "{{premium_amount}}": totalPremium > 0 ? `${currSym}${totalPremium.toLocaleString()}` : "TBD",
    "{{premium_rate}}": quote?.hullRates?.[0]?.rate ? `${quote.hullRates[0].rate}%` : "As quoted",
    "{{broker_name}}": placement.brokerCompany ? `${placement.brokerCompany} — ${placement.submittedByName || placement.brokerName}` : (placement.brokerName || "TBD"),
    "{{broker_reference}}": placement.facilityRef || "",
    "{{underwriter_schedule}}": underwriterSchedule,
    "{{underwriter_table_text}}": underwriterTableText,
    "{{quoting_underwriter}}": quote?.underwriterName || "TBD",
    "{{quote_date}}": quote?.submittedDate ? formatDate(quote.submittedDate) : "TBD",
    "{{quote_valid_until}}": quote?.quoteValidUntil ? formatDate(quote.quoteValidUntil) : "TBD",
    "{{spares_value}}": sparesValue,
    "{{spares_limit_text}}": sparesLimitText,
    "{{order_hereon_text}}": orderHereonText,
    "{{claims_history_text}}": claimsHistoryText,
    "{{fleet_schedule_text}}": fleetScheduleText,
    "{{aircraft_uses_text}}": aircraftUsesText,
    "{{geographical_limits_text}}": geographicalLimitsText,
    "{{premium_breakdown_text}}": premiumBreakdownText,
    // ── Quarterly instalment dates (inception + 3 quarterly dates) ──
    "{{quarterly_instalment_dates}}": (() => {
      if (documentType === "quotation") return "";
      const incDateStr = d.inceptionDate || placement.inceptionDate;
      if (!incDateStr) return "Dates to be confirmed";
      try {
        const base = new Date(incDateStr + "T00:00:00");
        if (isNaN(base.getTime())) return "Dates to be confirmed";
        const fmt = (dt: Date) => dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        const dates: string[] = [];
        for (let q = 0; q < 4; q++) {
          const qd = new Date(base);
          qd.setMonth(qd.getMonth() + q * 3);
          dates.push(fmt(qd));
        }
        return dates.join("\n");
      } catch {
        return "Dates to be confirmed";
      }
    })(),
    // ── Reinsurance / Insurance toggle placeholders ──
    "{{placement_type}}": isReinsurance ? "Reinsurance" : "Insurance",
    "{{placement_type_upper}}": isReinsurance ? "REINSURANCE" : "INSURANCE",
    "{{aviation_type_text}}": productCode === "HW"
      ? `AVIATION HULL AND SPARES WAR AND ASSOCIATED PERILS ${isReinsurance ? "REINSURANCE" : "INSURANCE"}`
      : `AVIATION HULL AND LIABILITY ${isReinsurance ? "REINSURANCE" : "INSURANCE"}`,
    "{{insured_or_reinsured}}": isReinsurance ? "Reinsured" : "Insured",
    "{{insured_or_reinsured_name}}": isReinsurance ? (reinsuredName || placement.insuredName || "TBD") : (placement.insuredName || d.insuredName || "TBD"),
    "{{reinsured_name}}": reinsuredName || "N/A",
    "{{reinsured_address}}": reinsuredAddress || "Address to be confirmed",
    "{{additional_insureds}}": additionalInsuredText,
    // ── Lineslip/Binder limit placeholders (HL-specific) ──
    "{{max_agreed_value_fixed_wing}}": lineslip?.maxHullLimitFixedWing
      ? `${currSym}${lineslip.maxHullLimitFixedWing.toLocaleString()}`
      : facilityScheduleLabel,
    "{{max_agreed_value_rotary_wing}}": lineslip?.maxHullLimitRotaryWing
      ? `${currSym}${lineslip.maxHullLimitRotaryWing.toLocaleString()}`
      : facilityScheduleLabel,
    "{{max_agreed_value}}": lineslip?.maxHullLimitFixedWing
      ? (lineslip.maxHullLimitFixedWing === lineslip?.maxHullLimitRotaryWing
          ? `${currSym}${lineslip.maxHullLimitFixedWing.toLocaleString()} any one aircraft`
          : `Fixed Wing: ${currSym}${lineslip.maxHullLimitFixedWing.toLocaleString()} | Rotary Wing: ${currSym}${(lineslip.maxHullLimitRotaryWing || 0).toLocaleString()} — any one aircraft`)
      : (lineslip?.maximumAircraftValue
          ? `${currSym}${lineslip.maximumAircraftValue.toLocaleString()} any one aircraft`
          : facilityScheduleLabel),
    "{{max_liability_fixed_wing}}": lineslip?.maxLiabilityLimitFixedWing
      ? `${currSym}${lineslip.maxLiabilityLimitFixedWing.toLocaleString()}`
      : facilityScheduleLabel,
    "{{max_liability_rotary_wing}}": lineslip?.maxLiabilityLimitRotaryWing
      ? `${currSym}${lineslip.maxLiabilityLimitRotaryWing.toLocaleString()}`
      : facilityScheduleLabel,
    // ── Hull War specific placeholders ──
    "{{hw_max_agreed_value}}": lineslip?.maximumAircraftValue
      ? `${currSym}${lineslip.maximumAircraftValue.toLocaleString()}`
      : facilityScheduleLabel,
    "{{hw_overall_aggregate}}": hullTotal > 0
      ? `${currSym}${hullTotal.toLocaleString()}`
      : "As per Schedule",
    // ── Confiscation clause (HW only) — LSW555D ──
    "{{confiscation_text}}": (() => {
      if (productCode !== "HW") return "";
      // Robust check: treat string "false" and boolean false as excluded (handles KV round-trips)
      const rawVal = quote?.confiscationIncluded;
      const included = rawVal === true || rawVal === "true";
      const verb = included ? "Including" : "Excluding";
      return `${verb} confiscation, nationalisation, seizure, restraint, detention, appropriation, requisition for title or use by or under the order of the government(s) of aircraft registry (whether civil, military or de facto) or public or local authority - exclusion (b) of LSW555D deleted`;
    })(),
    // ── Open Pilot Warranty (HL only — conditionally included when selected) ──
    // Resolves to a special token that the PDF renderer handles with boxed layout
    "{{open_pilot_warranty}}": d.openPilotWarranty ? "__OPW_SECTION__" : "",
  };

  return map[tag] ?? tag;
}

function populateContent(content: string, placement: Placement, lineslip: Lineslip | undefined, documentType: DocumentType = "firmorder"): string {
  let resolved = content.replace(/\{\{[^}]+\}\}/g, (match) => resolvePlaceholder(match, placement, lineslip, documentType));
  // Strip the "Additional Insured(s)" line entirely when none are advised
  resolved = resolved.replace(/\n*Additional Insured\(s\):\s*None Advised\s*/gi, "");
  // Clean up triple+ blank lines left by empty placeholders (e.g. {{confiscation_text}} for non-HW)
  resolved = resolved.replace(/\n{3,}/g, "\n\n");
  return resolved;
}

// Sanitise text for jsPDF helvetica (WinAnsiEncoding) — replace unsupported Unicode with safe ASCII
function sanitizeForPdf(text: string): string {
  return text
    .replace(/\u2500/g, "-")   // box drawing horizontal → hyphen
    .replace(/\u2502/g, "|")   // box drawing vertical → pipe
    .replace(/\u2018/g, "'")   // left single quote → apostrophe
    .replace(/\u2019/g, "'")   // right single quote → apostrophe
    .replace(/\u201C/g, "\"")  // left double quote → straight quote
    .replace(/\u201D/g, "\"")  // right double quote → straight quote
    .replace(/\u2026/g, "...") // ellipsis → three dots
    .replace(/\u00A0/g, " ")   // non-breaking space → space
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, (ch) => {
      // Allow em/en dash (supported in WinAnsiEncoding)
      if (ch === "\u2013" || ch === "\u2014") return ch;
      return ""; // strip other non-Latin1 chars
    });
}

// ─── PDF Generation ───────────────────────────────────────────────

const BLACK = [0, 0, 0] as const;
const DARK_GRAY = [30, 30, 30] as const;
const MID_GRAY = [120, 120, 120] as const;
const LIGHT_GRAY = [180, 180, 180] as const;
const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN_L = 20;
const MARGIN_R = 20;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 22;
const LABEL_COL_W = 36; // width of left label column
const COL_GAP = 4;
const CONTENT_X = MARGIN_L + LABEL_COL_W + COL_GAP; // where content column starts
const CONTENT_COL_W = PAGE_W - MARGIN_R - CONTENT_X; // content column width
const FULL_W = PAGE_W - MARGIN_L - MARGIN_R;
const LINE_H = 3.8; // line height for body text
const FONT_SIZE = 9; // body font size
const LABEL_FONT_SIZE = 8.5; // label font size

// Detect sub-headings within content (short lines ending with ":" or "Section X" patterns)
function isSubHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;
  // Lines ending with ":" that look like headings (no pipe separators, not too long)
  // Exclude numbered items like "2. However coverage..." which are paragraphs, not headings
  // Exclude lines where the word before ":" is a preposition (e.g., "Original Insurance per:") — those are sentence fragments
  if (trimmed.endsWith(":") && trimmed.length < 60 && !trimmed.includes("|") && !/^\d+\.\s/.test(trimmed) && !/^Section\s+(?!(?:One|Two)\s*:)\S/i.test(trimmed) && !/\b(per|for|the|a|an|of|in|on|at|to|by|with|from|under|over|between|through|into|upon)\s*:$/i.test(trimmed) && !/^In\s+addition/i.test(trimmed)) return true;
  // Known sub-heading labels
  if (/^Section\s+(One|Two)\s*:?$/i.test(trimmed)) return true;
  if (/^(Reinsured|Insured)\s+Address$/i.test(trimmed)) return true;
  // Known clause titles without colons
  if (/Clause$/i.test(trimmed) && trimmed.length < 60) return true;
  // Short numbered sub-headings (e.g. "1. Hull", "2. Spares") — single-word or very short labels
  if (/^\d+\.\s+.+$/.test(trimmed) && trimmed.length <= 20) return true;
  // Known limit/coverage headings (e.g. "Extortion and Hi-Jack Expenses Limit")
  if (/\bLimit$/i.test(trimmed) && trimmed.length < 60) return true;
  return false;
}

function generateSlipPDF(
  sections: SlipWordingSection[],
  placement: Placement,
  lineslip: Lineslip | undefined,
  documentType: DocumentType,
  logoDataUrl?: string,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const isQuotation = documentType === "quotation";
  const d = placement.draftData || {};
  const isReinsurance = d.placementType === "reinsurance";
  const title = isQuotation
    ? (isReinsurance ? "REINSURANCE DECLARATION QUOTATION" : "QUOTATION DECLARATION")
    : (isReinsurance ? "REINSURANCE BINDING SLIP" : "BINDING SLIP");

  let y = MARGIN_TOP;
  let pageNum = 1;

  // ── Helper: check page break ──
  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_BOTTOM) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addPageHeader();
    }
  };

  // ── Footer ──
  const addFooter = () => {
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, PAGE_H - 16, PAGE_W - MARGIN_R, PAGE_H - 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...LIGHT_GRAY);
    doc.text(`FLIGHTDECK  |  Page ${pageNum}`, PAGE_W / 2, PAGE_H - 8, { align: "center" });
  };

  // ── Page header (pages 2+) ──
  const addPageHeader = () => {
    // Lockton logo — top right on continuation pages (matched to page 1 sizing)
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, "PNG", PAGE_W - MARGIN_R - 30, 8, 30, 16); } catch {}
    }
    // UMR with Q prefix for quote-stage statuses
    const umrText = ["DRAFT", "COMPLIANCE", "PENDING", "QUOTED"].includes((placement.status || "").toUpperCase())
      ? `Q${placement.reference || ""}`
      : (placement.reference || "");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MID_GRAY);
    doc.text(umrText, MARGIN_L, 16);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_L, 22, PAGE_W - MARGIN_R, 22);
    y = 28;
  };

  // ── Word-wrap helper ──
  const wrapText = (text: string, fontSize: number, fontStyle: string, maxWidth: number): string[] => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    const hardLines = text.split("\n");
    const allLines: string[] = [];
    for (const hardLine of hardLines) {
      if (hardLine.trim() === "") {
        allLines.push("");
        continue;
      }
      const wrapped = doc.splitTextToSize(hardLine, maxWidth) as string[];
      allLines.push(...wrapped);
    }
    return allLines;
  };

  // ═══════════════════════════════════════���══════════════════════════
  //  PAGE 1 HEADER
  // ══════════════════════════════════════════════════════════════════

  // Lockton logo — top right
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", PAGE_W - MARGIN_R - 30, y - 2, 30, 16); } catch {}
  }

  y += 16;

  // Title box — horizontal rules above and below, centered title
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); // top rule
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text(title, PAGE_W / 2, y, { align: "center" });
  y += 4;
  doc.setLineWidth(0.6);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); // bottom rule
  y += 10;

  // ══════════════════════════════════════════════════════════════════
  //  SECTIONS — Two-column label:value layout
  // ══════════════════════════════════════════════════════════════════

  const sorted = [...sections].sort((a, b) => a.order - b.order);

  for (let i = 0; i < sorted.length; i++) {
    const section = sorted[i];
    const populatedContent = populateContent(section.content, placement, lineslip, documentType);
    const sanitizedContent = sanitizeForPdf(populatedContent);

    // Skip sections with empty content (prevents orphaned labels with blank space)
    if (!sanitizedContent || !sanitizedContent.trim()) {
      continue;
    }

    // Force SITUATION to start on a new page
    if (section.title.toLowerCase() === "situation" && pageNum === 1) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addPageHeader();
    }

    // PREMIUM PAYMENT TERMS flows naturally — no forced page break

    // Force SEVERAL LIABILITY NOTICE INSURANCE to start on a new page with SECURITY DETAILS title box
    if (section.title.toLowerCase() === "several liability notice insurance" && y > MARGIN_TOP + 10) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addPageHeader();

      // Draw "SECURITY DETAILS" title box (same style as page 1 title)
      y += 2;
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.6);
      doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); // top rule
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...BLACK);
      doc.text("SECURITY DETAILS", PAGE_W / 2, y, { align: "center" });
      y += 4;
      doc.setLineWidth(0.6);
      doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); // bottom rule
      y += 10;
    }

    // Force CLAIMS INFORMATION to start on a new page with title box
    if (section.title.toLowerCase() === "claims information" && y > MARGIN_TOP + 10) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addPageHeader();

      // Draw "CLAIMS INFORMATION" title box (same style as SECURITY DETAILS on page 6)
      y += 2;
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.6);
      doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); // top rule
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...BLACK);
      doc.text("CLAIMS INFORMATION", PAGE_W / 2, y, { align: "center" });
      y += 4;
      doc.setLineWidth(0.6);
      doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); // bottom rule
      y += 10;
    }

    // Force AIRCRAFT SCHEDULE (ATTACHMENT) to start on a new page
    if (section.title.toLowerCase().includes("aircraft schedule") && y > MARGIN_TOP + 10) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addPageHeader();
    }

    // Force PREMIUM BREAKDOWN to start on a new page
    if (section.title.toLowerCase().includes("premium breakdown") && y > MARGIN_TOP + 10) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addPageHeader();
    }

    // Force NOTIFICATION OF SECURITY to start on a new page
    if (section.title.toLowerCase().includes("notification of security") && y > MARGIN_TOP + 10) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addPageHeader();
    }

    // ── Custom rendering: NOTIFICATION OF SECURITY ──
    if (section.title.toLowerCase().includes("notification of security")) {
      const dd = placement.draftData || {};
      const qt = placement.quotes?.[placement.quotes.length - 1];
      const isReins = dd.placementType === "reinsurance";
      const reference = placement.reference || "";
      const umrDisplay = ["DRAFT", "COMPLIANCE", "PENDING", "QUOTED"].includes((placement.status || "").toUpperCase())
        ? `Q${reference}` : reference;
      const insuredName = placement.insuredName || dd.insuredName || "TBD";
      const reinsuredNm = dd.reinsuredName || "";
      const productCode = dd.productCode || placement.productCode || "";
      const pNames: Record<string, string> = {
        HL: "Hull & Liability", HW: "Hull War", PA: "Personal Accident",
        LOL: "Loss of Licence", HD: "Hull Deductible", UAS: "Drone Insurance",
      };
      const productLabel = pNames[productCode] || productCode || "";
      const fmtDt = (ds: string | undefined) => {
        if (!ds) return "TBA";
        try {
          return new Date(ds + "T00:00:00").toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
          });
        } catch { return ds; }
      };
      const periodFrom = fmtDt(dd.inceptionDate || placement.inceptionDate);
      const periodTo = fmtDt(dd.expiryDate);
      const ohPercentages: Record<string, string> = dd.orderHereonPercentage || {};
      const ohBases: Record<string, string> = dd.orderHereonBasis || {};
      const ohPct = ohPercentages[productCode] || "100";
      const ohBs = ohBases[productCode] || "whole";
      const ohBsLabel = ohBs === "order" ? "Of Order" : "Of Whole";
      const orderHereonVal = `${ohPct}% of 100% ${ohBsLabel}`;
      const brokerRef = placement.facilityRef || "";
      const uws = lineslip?.underwriters || [];
      const quotingUw = qt?.underwriterName || "TBD";

      const NOTIF_FONT = 9;
      const NOTIF_LINE_H = LINE_H;
      const LABEL_X = MARGIN_L;
      const COLON_X = MARGIN_L + 52;
      const VALUE_X = MARGIN_L + 58;
      const VALUE_W = PAGE_W - MARGIN_R - VALUE_X;

      // ── Title: "NOTIFICATION OF SECURITY" centered bold ──
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...BLACK);
      doc.text("NOTIFICATION OF SECURITY", PAGE_W / 2, y, { align: "center" });
      y += NOTIF_LINE_H * 4;

      // ── Helper: draw a field row (bold label, colon, value — value may wrap) ──
      const drawField = (label: string, value: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(NOTIF_FONT);
        doc.setTextColor(...BLACK);
        // Wrap label if needed (e.g. "Reinsurance Policy Reference")
        const labelW = COLON_X - LABEL_X - 2;
        const labelWrapped = doc.splitTextToSize(label, labelW) as string[];
        for (let i = 0; i < labelWrapped.length; i++) {
          doc.text(labelWrapped[i], LABEL_X, y + (i * NOTIF_LINE_H));
        }
        // Colon aligned to bottom line of label
        const colonY = y + ((labelWrapped.length - 1) * NOTIF_LINE_H);
        doc.text(":", COLON_X, colonY);
        // Value (normal weight, may wrap)
        doc.setFont("helvetica", "normal");
        const valueWrapped = doc.splitTextToSize(value, VALUE_W) as string[];
        for (let i = 0; i < valueWrapped.length; i++) {
          doc.text(valueWrapped[i], VALUE_X, colonY + (i * NOTIF_LINE_H));
        }
        const totalLines = Math.max(labelWrapped.length, (labelWrapped.length - 1) + valueWrapped.length);
        y += totalLines * NOTIF_LINE_H + NOTIF_LINE_H * 0.8;
      };

      // Fields
      if (isReins) {
        drawField("Reinsured", reinsuredNm || "N/A");
      }
      drawField("Insured", insuredName);
      drawField("Unique Market\nReference", umrDisplay);
      const isQuoteStage = ["DRAFT", "COMPLIANCE", "PENDING", "QUOTED"].includes((placement.status || "").toUpperCase());
      if (isQuoteStage) {
        drawField("Period", "Subject Approval, No Risk");
      } else {
        const periodValue = `From: ${periodFrom}\nTo: ${periodTo}\nBoth Days Inclusive`;
        drawField("Period", periodValue);
      }
      const placementTypeLabel = isReins ? "REINSURANCE" : "INSURANCE";
      const typeStr = productCode === "HW"
        ? `AVIATION HULL AND SPARES WAR AND ASSOCIATED PERILS ${placementTypeLabel}`
        : `AVIATION ${productLabel.toUpperCase()} ${placementTypeLabel}`;
      drawField("Type", typeStr);

      y += NOTIF_LINE_H;

      // ── Horizontal rule ──
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
      y += NOTIF_LINE_H * 3;

      // ── Body text ──
      doc.setFont("helvetica", "normal");
      doc.setFontSize(NOTIF_FONT);
      doc.setTextColor(...BLACK);
      const bodyText = "Subject to the LSW 1001 clause the final basis of Security is detailed as follows:";
      doc.text(bodyText, MARGIN_L, y);
      y += NOTIF_LINE_H * 3;

      // ── Order hereon (bold label, normal value) ──
      doc.setFont("helvetica", "bold");
      doc.text("Order hereon: ", MARGIN_L, y);
      const ohLabelW = doc.getTextWidth("Order hereon: ");
      doc.setFont("helvetica", "normal");
      doc.text(orderHereonVal, MARGIN_L + ohLabelW, y);
      y += NOTIF_LINE_H * 1.5;

      // ── Declaration under delegated underwriting contract ──
      doc.setFont("helvetica", "bold");
      doc.text("Declaration under delegated underwriting contract: ", MARGIN_L, y);
      const declLabelW = doc.getTextWidth("Declaration under delegated underwriting contract: ");
      doc.setFont("helvetica", "normal");
      doc.text(brokerRef || "N/A", MARGIN_L + declLabelW, y);
      y += NOTIF_LINE_H * 2;

      // ── Effected with table ──
      const RT_COL_X = PAGE_W - MARGIN_R - 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(NOTIF_FONT);
      doc.setTextColor(...BLACK);
      doc.text("Effected", MARGIN_L, y);
      y += NOTIF_LINE_H;
      doc.text("with:", MARGIN_L, y);
      doc.text("RT", RT_COL_X, y);
      y += NOTIF_LINE_H * 1.5;

      // Underwriter rows
      const PCT_X = MARGIN_L;
      const UW_NAME_X = MARGIN_L + 30;
      const UW_NAME_W = RT_COL_X - UW_NAME_X - 4;
      let totalPct = 0;

      if (uws.length > 0) {
        for (const uw of uws) {
          const pct = uw.percentage ?? 0;
          totalPct += pct;
          const pctStr = `${pct.toFixed(6)}%`;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(NOTIF_FONT);
          doc.setTextColor(...BLACK);
          doc.text(pctStr, PCT_X, y);
          // Wrap underwriter name if needed
          const uwNameWrapped = doc.splitTextToSize(uw.name || "TBD", UW_NAME_W) as string[];
          for (let i = 0; i < uwNameWrapped.length; i++) {
            doc.text(uwNameWrapped[i], UW_NAME_X, y + (i * NOTIF_LINE_H));
          }
          doc.text("No", RT_COL_X, y);
          y += Math.max(uwNameWrapped.length, 1) * NOTIF_LINE_H + NOTIF_LINE_H * 0.5;

          // Page break check
          if (y + NOTIF_LINE_H * 3 > PAGE_H - MARGIN_BOTTOM) {
            addFooter(); doc.addPage(); pageNum++;
            y = MARGIN_TOP; addPageHeader();
          }
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(NOTIF_FONT);
        doc.text("As per Security Schedule", UW_NAME_X, y);
        y += NOTIF_LINE_H * 2;
      }

      // ── Underline before total ──
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.2);
      doc.line(PCT_X, y - NOTIF_LINE_H * 0.3, PCT_X + 25, y - NOTIF_LINE_H * 0.3);
      y += NOTIF_LINE_H * 1.0;

      // Total row
      doc.setFont("helvetica", "normal");
      doc.setFontSize(NOTIF_FONT);
      doc.setTextColor(...BLACK);
      const totalPctStr = `${totalPct.toFixed(6)}%`;
      doc.text(totalPctStr, PCT_X, y);
      doc.setFont("helvetica", "bold");
      doc.text("Total placed hereon, in respect of the above order.", UW_NAME_X, y);
      y += NOTIF_LINE_H * 3;

      // Page break check
      if (y + NOTIF_LINE_H * 8 > PAGE_H - MARGIN_BOTTOM) {
        addFooter(); doc.addPage(); pageNum++;
        y = MARGIN_TOP; addPageHeader();
      }

      // ── Risk Transfer disclaimer ──
      doc.setFont("helvetica", "normal");
      doc.setFontSize(NOTIF_FONT);
      doc.setTextColor(...BLACK);
      const rt1 = "Risk Transfer is indicated in the RT column above. Please note that where Risk Transfer = Yes, monies relating to this Contract will be held by Lockton as agent of reinsurers and not on your behalf until remitted to reinsurer.";
      const rt1Lines = doc.splitTextToSize(rt1, FULL_W) as string[];
      for (const line of rt1Lines) {
        doc.text(line, MARGIN_L, y);
        y += NOTIF_LINE_H;
      }
      y += NOTIF_LINE_H * 0.5;
      const rt2 = "Where Risk Transfer = No, except by reason of any legal or regulatory requirement, monies relating to this Contract will be held by Lockton on your behalf as Client Money until remitted to reinsurer.";
      const rt2Lines = doc.splitTextToSize(rt2, FULL_W) as string[];
      for (const line of rt2Lines) {
        doc.text(line, MARGIN_L, y);
        y += NOTIF_LINE_H;
      }
      y += NOTIF_LINE_H * 2;

      // ── Bound/Quoted by Underwriter ──
      const boundLabel = isQuoteStage ? "Quoted by Underwriter" : "Bound by Underwriter";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(NOTIF_FONT);
      doc.setTextColor(...BLACK);
      doc.text(`${boundLabel}: ${quotingUw}`, MARGIN_L, y);
      y += NOTIF_LINE_H + 3 + LINE_H;

      continue; // Skip normal section rendering
    }

    // Detect full-width sections (no left label column)
    const isClaimsSection = section.title.toLowerCase() === "claims information";
    const isAircraftScheduleSection = section.title.toLowerCase().includes("aircraft schedule");
    const isAircraftUsesSection = section.title.toLowerCase().includes("aircraft uses");
    const isPremiumBreakdownSection = section.title.toLowerCase().includes("premium breakdown");
    const isFullWidthSection = isClaimsSection || isAircraftScheduleSection || isAircraftUsesSection || isPremiumBreakdownSection;

    // Parse content into segments: each segment is { text, isSubHeading }
    // We process the raw content line by line to detect sub-headings
    const rawLines = sanitizedContent.split("\n");
    type ContentSegment = { text: string; underline: boolean; indent: number; isNumberedStart: boolean };
    const segments: ContentSegment[] = [];

    for (const rawLine of rawLines) {
      if (rawLine.trim() === "") {
        segments.push({ text: "", underline: false, indent: 0, isNumberedStart: false });
      } else if (isSubHeading(rawLine.trim())) {
        // Detect leading whitespace for indent
        const leadingSpaces = rawLine.length - rawLine.trimStart().length;
        const indentMm = leadingSpaces > 0 ? Math.min(leadingSpaces * 1.2, 8) : 0;
        segments.push({ text: rawLine.trim(), underline: true, indent: indentMm, isNumberedStart: false });
      } else {
        // Detect leading whitespace for indent
        const leadingSpaces = rawLine.length - rawLine.trimStart().length;
        const indentMm = leadingSpaces > 0 ? Math.min(leadingSpaces * 1.2, 8) : 0;
        const trimmedLine = rawLine.trim();
        // Detect top-level numbered items (e.g., "2. ", "3. " — but not sub-items like "(a)")
        const isNumberedStart = /^\d+\.\s/.test(trimmedLine) && indentMm === 0;
        // Wrap to fit content column minus indent (use full width for full-width sections)
        const baseW = isFullWidthSection ? FULL_W : CONTENT_COL_W;
        const availW = baseW - indentMm;
        const wrapped = wrapText(trimmedLine, FONT_SIZE, "normal", availW);
        for (let wi = 0; wi < wrapped.length; wi++) {
          segments.push({ text: wrapped[wi], underline: false, indent: indentMm, isNumberedStart: wi === 0 && isNumberedStart });
        }
      }
    }

    // Trim trailing empty segments to avoid extra whitespace at end of section
    while (segments.length > 0 && segments[segments.length - 1].text === "") {
      segments.pop();
    }

    // Calculate minimum space needed: label + first 3 content lines
    const minLines = Math.min(segments.length, 3);
    const minHeight = Math.max(minLines * LINE_H, 10);
    checkPageBreak(minHeight + 4);

    // Render the label (left column) — bold, uppercase, colon-terminated
    // Skip label for Claims Information, Aircraft Schedule/Uses (full-width sections)
    const labelText = section.title.toUpperCase() + ":";
    const labelLines = wrapText(labelText, LABEL_FONT_SIZE, "bold", LABEL_COL_W);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(LABEL_FONT_SIZE);
    doc.setTextColor(...BLACK);
    const labelStartY = y;
    if (!isFullWidthSection) {
      for (let li = 0; li < labelLines.length; li++) {
        doc.text(labelLines[li], MARGIN_L, y + (li * LINE_H));
      }
    }

    // Render the content (right column)
    doc.setFontSize(FONT_SIZE);
    // Always align the first content line with the LAST line of the label
    const labelLastLineY = y + ((isFullWidthSection ? 0 : (labelLines.length - 1)) * LINE_H);
    let contentY = labelLastLineY;
    // For full-width sections, render content starting from left margin
    const claimsContentX = isFullWidthSection ? MARGIN_L : CONTENT_X;
    let sectionHadPageBreak = false;
    for (const seg of segments) {
      // ── Special handling: Claims table ──
      if (seg.text === "__CLAIMS_TABLE__") {
        const claimsData: any[] = (placement.draftData || {}).claims || [];
        if (claimsData.length === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FONT_SIZE);
          doc.setTextColor(...DARK_GRAY);
          doc.text("Nil", CONTENT_X, contentY);
          contentY += LINE_H;
          continue;
        }

        const currency = (placement.draftData || {}).aircraftAgreedValueCurrency || "USD";
        const currSym = currency === "GBP" ? "GBP " : currency === "EUR" ? "EUR " : "USD ";
        const fmtDate = (ds: string | undefined) => {
          if (!ds) return "N/A";
          try {
            return new Date(ds + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
          } catch { return ds; }
        };

        // Table configuration — spans full page width
        const TABLE_X = MARGIN_L;
        const TABLE_W = FULL_W;
        const COL_WIDTHS = [10, 24, 24, 28, 20, TABLE_W - 10 - 24 - 24 - 28 - 20]; // No., Date, Type, Amt Paid, Status, Description
        const COL_HEADERS = ["No.", "Date", "Type", "Amount Paid", "Status", "Description"];
        const ROW_H = 5.5;
        const TABLE_FONT = 8;
        const HEADER_FONT = 7.5;
        const CELL_PAD = 1.5;

        // Prepare row data
        const rows = claimsData.map((c: any, idx: number) => {
          const claimType = c.claimType === "other" ? (c.claimTypeOther || "Other") : (c.claimType || "N/A");
          const amtPaid = c.amountPaid
            ? `${c.amountPaidCurrency || currency} ${Number(String(c.amountPaid).replace(/,/g, "")).toLocaleString()}`
            : "N/A";
          const status = c.claimStatus ? c.claimStatus.charAt(0).toUpperCase() + c.claimStatus.slice(1) : "N/A";
          const desc = sanitizeForPdf(c.description || "N/A");
          return [
            String(idx + 1),
            fmtDate(c.claimDate),
            claimType,
            amtPaid,
            status,
            desc,
          ];
        });

        // Calculate row heights (description may wrap)
        const rowHeights: number[] = [];
        for (const row of rows) {
          let maxLines = 1;
          for (let ci = 0; ci < row.length; ci++) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(TABLE_FONT);
            const cellW = COL_WIDTHS[ci] - (CELL_PAD * 2);
            const wrapped = doc.splitTextToSize(row[ci], cellW) as string[];
            if (wrapped.length > maxLines) maxLines = wrapped.length;
          }
          rowHeights.push(Math.max(ROW_H, maxLines * (LINE_H * 0.95) + CELL_PAD));
        }

        // Check if header + at least first row fits
        const headerH = ROW_H + 1;
        const firstRowH = rowHeights[0] || ROW_H;
        if (contentY + headerH + firstRowH + 2 > PAGE_H - MARGIN_BOTTOM) {
          addFooter();
          doc.addPage();
          pageNum++;
          y = MARGIN_TOP;
          addPageHeader();
          contentY = y;
          sectionHadPageBreak = true;
        }

        // Draw header row
        let cellX = TABLE_X;
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.3);
        // Header background
        doc.setFillColor(240, 240, 240);
        doc.rect(TABLE_X, contentY - 0.5, TABLE_W, headerH, "F");
        // Header top border
        doc.line(TABLE_X, contentY - 0.5, TABLE_X + TABLE_W, contentY - 0.5);
        // Header text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(HEADER_FONT);
        doc.setTextColor(...BLACK);
        for (let ci = 0; ci < COL_HEADERS.length; ci++) {
          doc.text(COL_HEADERS[ci], cellX + CELL_PAD, contentY + 3);
          cellX += COL_WIDTHS[ci];
        }
        contentY += headerH;
        // Header bottom border
        doc.setLineWidth(0.4);
        doc.line(TABLE_X, contentY - 0.5, TABLE_X + TABLE_W, contentY - 0.5);

        // Draw data rows
        for (let ri = 0; ri < rows.length; ri++) {
          const rh = rowHeights[ri];
          // Page break check
          if (contentY + rh + 1 > PAGE_H - MARGIN_BOTTOM) {
            addFooter();
            doc.addPage();
            pageNum++;
            y = MARGIN_TOP;
            addPageHeader();
            contentY = y;
            sectionHadPageBreak = true;

            // Re-draw header on new page
            cellX = TABLE_X;
            doc.setDrawColor(...BLACK);
            doc.setLineWidth(0.3);
            doc.setFillColor(240, 240, 240);
            doc.rect(TABLE_X, contentY - 0.5, TABLE_W, headerH, "F");
            doc.line(TABLE_X, contentY - 0.5, TABLE_X + TABLE_W, contentY - 0.5);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(HEADER_FONT);
            doc.setTextColor(...BLACK);
            for (let ci = 0; ci < COL_HEADERS.length; ci++) {
              doc.text(COL_HEADERS[ci], cellX + CELL_PAD, contentY + 3);
              cellX += COL_WIDTHS[ci];
            }
            contentY += headerH;
            doc.setLineWidth(0.4);
            doc.line(TABLE_X, contentY - 0.5, TABLE_X + TABLE_W, contentY - 0.5);
          }

          // Alternating row shading
          if (ri % 2 === 1) {
            doc.setFillColor(248, 248, 248);
            doc.rect(TABLE_X, contentY - 0.5, TABLE_W, rh, "F");
          }

          // Cell text
          cellX = TABLE_X;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(TABLE_FONT);
          doc.setTextColor(...DARK_GRAY);
          for (let ci = 0; ci < rows[ri].length; ci++) {
            const cellW = COL_WIDTHS[ci] - (CELL_PAD * 2);
            const wrapped = doc.splitTextToSize(rows[ri][ci], cellW) as string[];
            for (let li = 0; li < wrapped.length; li++) {
              doc.text(wrapped[li], cellX + CELL_PAD, contentY + 3 + (li * LINE_H * 0.95));
            }
            cellX += COL_WIDTHS[ci];
          }

          // Row bottom border (thin)
          doc.setDrawColor(...LIGHT_GRAY);
          doc.setLineWidth(0.15);
          doc.line(TABLE_X, contentY + rh - 0.5, TABLE_X + TABLE_W, contentY + rh - 0.5);

          contentY += rh;
        }

        // Table bottom border (thicker)
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.3);
        doc.line(TABLE_X, contentY - 0.5, TABLE_X + TABLE_W, contentY - 0.5);

        // Draw vertical column borders
        // We need to go back and draw them — skip for now as horizontal rules are sufficient
        // for London Market style

        contentY += LINE_H;
        continue;
      }

      // ── Special handling: Aircraft Schedule table ──
      if (seg.text === "__AIRCRAFT_SCHEDULE_TABLE__") {
        const fleet: any[] = (placement.draftData || {}).fleet || [];
        if (fleet.length === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FONT_SIZE);
          doc.setTextColor(...DARK_GRAY);
          doc.text("Nil", MARGIN_L, contentY);
          contentY += LINE_H;
          continue;
        }

        // Clean table style — no cell borders, just underlined headers
        const TABLE_X = MARGIN_L;
        const TABLE_W = FULL_W;
        const SCHED_COLS = [38, 30, 42, 30, 30]; // Reg, Type, M&M, Country, Region
        const SCHED_HEADERS = ["Registration", "Aircraft type", "Manufacturer and model", "Base country", "Base region"];
        const TABLE_FONT = 9;
        const HEADER_FONT = 8.5;
        const ROW_H = LINE_H + 1.5;

        // Helper to draw the schedule header row
        const drawSchedHeader = () => {
          let cx = TABLE_X;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(HEADER_FONT);
          doc.setTextColor(...BLACK);
          for (let ci = 0; ci < SCHED_HEADERS.length; ci++) {
            doc.text(SCHED_HEADERS[ci], cx, contentY);
            cx += SCHED_COLS[ci];
          }
          contentY += 2;
          doc.setDrawColor(...LIGHT_GRAY);
          doc.setLineWidth(0.3);
          doc.line(TABLE_X, contentY, TABLE_X + TABLE_W, contentY);
          contentY += LINE_H;
        };

        // Check space for header + first row
        if (contentY + ROW_H * 2 + 4 > PAGE_H - MARGIN_BOTTOM) {
          addFooter(); doc.addPage(); pageNum++;
          y = MARGIN_TOP; addPageHeader(); contentY = y;
          sectionHadPageBreak = true;
        }

        drawSchedHeader();

        // Data rows
        for (const a of fleet) {
          if (contentY + ROW_H + 1 > PAGE_H - MARGIN_BOTTOM) {
            addFooter(); doc.addPage(); pageNum++;
            y = MARGIN_TOP; addPageHeader(); contentY = y;
            sectionHadPageBreak = true;
            drawSchedHeader();
          }

          const reg = (a.registration || "TBD").toUpperCase();
          const rawType = a.aircraftType || a.type || "Unknown";
          // Capitalize each word including after hyphens (e.g. "rotary-wing" → "Rotary-Wing")
          const type = rawType.replace(/(?:^|[\s-])\w/g, (c: string) => c.toUpperCase());
          const mm = [a.make, a.model].filter(Boolean).join(" ") || "N/A";
          const country = a.baseCountry || "N/A";
          const region = a.baseRegion || "N/A";
          const rowData = [reg, type, mm, country, region];

          let cx = TABLE_X;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(TABLE_FONT);
          doc.setTextColor(...DARK_GRAY);
          for (let ci = 0; ci < rowData.length; ci++) {
            const cellW = SCHED_COLS[ci] - 2;
            const truncated = doc.splitTextToSize(rowData[ci], cellW)[0] || rowData[ci];
            doc.text(truncated, cx, contentY);
            cx += SCHED_COLS[ci];
          }
          contentY += ROW_H;
        }

        contentY += LINE_H;
        continue;
      }

      // ── Special handling: Aircraft Uses table ──
      if (seg.text === "__AIRCRAFT_USES_TABLE__") {
        const fleet: any[] = (placement.draftData || {}).fleet || [];
        const dd = placement.draftData || {};
        if (fleet.length === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FONT_SIZE);
          doc.setTextColor(...DARK_GRAY);
          doc.text("Nil", MARGIN_L, contentY);
          contentY += LINE_H;
          continue;
        }

        const TABLE_X = MARGIN_L;
        const TABLE_W = FULL_W;
        const USES_COL1_W = TABLE_W * 0.5;
        const USES_HEADERS_ARR = ["Registration", "Uses"];
        const TABLE_FONT = 9;
        const HEADER_FONT = 8.5;

        // Helper to draw uses header
        const drawUsesHeader = () => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(HEADER_FONT);
          doc.setTextColor(...BLACK);
          doc.text(USES_HEADERS_ARR[0], TABLE_X, contentY);
          doc.text(USES_HEADERS_ARR[1], TABLE_X + USES_COL1_W, contentY);
          contentY += 2;
          doc.setDrawColor(...LIGHT_GRAY);
          doc.setLineWidth(0.3);
          doc.line(TABLE_X, contentY, TABLE_X + TABLE_W, contentY);
          contentY += LINE_H;
        };

        // Check space
        if (contentY + LINE_H * 4 > PAGE_H - MARGIN_BOTTOM) {
          addFooter(); doc.addPage(); pageNum++;
          y = MARGIN_TOP; addPageHeader(); contentY = y;
          sectionHadPageBreak = true;
        }

        drawUsesHeader();

        // Data rows — each aircraft with stacked uses
        for (const a of fleet) {
          const reg = (a.registration || "TBD").toUpperCase();
          const std: string[] = a.standardUses || dd.standardUses || [];
          const spc: string[] = a.specialUses || dd.specialUses || [];
          const spcOther = a.specialUsesOther || dd.specialUsesOther || "";
          const allSpecial = spcOther && spc.includes("Other")
            ? [...spc.filter((s: string) => s !== "Other"), spcOther]
            : spc;
          const allUses = [...std, ...allSpecial];
          if (allUses.length === 0) allUses.push("None");

          const rowLines = Math.max(allUses.length, 1);
          const neededH = rowLines * LINE_H + LINE_H;

          if (contentY + neededH + 1 > PAGE_H - MARGIN_BOTTOM) {
            addFooter(); doc.addPage(); pageNum++;
            y = MARGIN_TOP; addPageHeader(); contentY = y;
            sectionHadPageBreak = true;
            drawUsesHeader();
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(TABLE_FONT);
          doc.setTextColor(...DARK_GRAY);
          doc.text(reg, TABLE_X, contentY);

          for (let ui = 0; ui < allUses.length; ui++) {
            doc.text(allUses[ui], TABLE_X + USES_COL1_W, contentY + (ui * LINE_H));
          }

          contentY += rowLines * LINE_H + LINE_H * 0.3;
        }

        // Unselected uses disclaimer
        const allStdOpts = ["PBP", "Industrial Aid", "Commercial", "Charter", "Medevac", "Air Ambulance", "Photography", "Rental"];
        const allSpcOpts = ["Governmental", "Police", "Flight School", "Ab-initio", "Boarder Control"];
        const selStd = new Set<string>();
        const selSpc = new Set<string>();
        for (const a of fleet) {
          (a.standardUses || dd.standardUses || []).forEach((u: string) => selStd.add(u));
          (a.specialUses || dd.specialUses || []).forEach((u: string) => selSpc.add(u));
        }
        const unselected = [...allStdOpts.filter(u => !selStd.has(u)), ...allSpcOpts.filter(u => !selSpc.has(u))];
        if (unselected.length > 0) {
          contentY += LINE_H * 0.5;
          const disclaimerText = `Unless stated in the above table, you have not declared that you are undertaking any of the following use: ${unselected.join(", ")}`;
          const disclaimerLines = wrapText(disclaimerText, FONT_SIZE, "normal", FULL_W);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FONT_SIZE);
          doc.setTextColor(...DARK_GRAY);
          for (const dl of disclaimerLines) {
            if (contentY + LINE_H + 1 > PAGE_H - MARGIN_BOTTOM) {
              addFooter(); doc.addPage(); pageNum++;
              y = MARGIN_TOP; addPageHeader(); contentY = y;
              sectionHadPageBreak = true;
            }
            doc.text(dl, MARGIN_L, contentY);
            contentY += LINE_H;
          }
        }

        contentY += LINE_H;
        continue;
      }

      // ── Special handling: Premium Breakdown table ──
      if (seg.text === "__PREMIUM_BREAKDOWN_TABLE__") {
        const dd = placement.draftData || {};
        const qt = placement.quotes?.[placement.quotes.length - 1];
        if (!qt) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FONT_SIZE);
          doc.setTextColor(...DARK_GRAY);
          doc.text("No quote available", MARGIN_L, contentY);
          contentY += LINE_H;
          continue;
        }

        const hullRows: any[] = qt.hullRates || [];
        const liabilityRows: any[] = qt.liabilityRates || [];
        const pCode = dd.productCode || placement.productCode || "";
        const pRateNames: Record<string, string> = {
          HL: "Hull Rate", HW: "Hull War\nrate", PA: "PA rate",
          LOL: "LOL rate", HD: "Hull\nDeductible rate", UAS: "Drone rate",
        };
        const rateColHeader = pRateNames[pCode] || "Rate";
        const cur = dd.aircraftAgreedValueCurrency || qt.currency || "USD";
        const taxPct = parseFloat(dd.taxPercentage || "0") || 0;
        const taxNameStr = dd.taxName || "";
        const taxTypeStr = dd.taxType || "addition";

        const isHullWar = pCode === "HW";
        const ohPctLocal = (dd.orderHereonPercentage || {})[pCode] || "100";

        const TABLE_X = MARGIN_L;
        const TABLE_W = FULL_W;
        const TABLE_FONT = 8;
        const HEADER_FONT = 7.5;
        const ROW_H = LINE_H + 2;
        const HEADER_BG = [240, 240, 240] as const;

        // Column widths (mm) — conditional on product code (HW drops Liability column)
        const COL_WIDTHS = isHullWar
          ? [28, 16, 28, 20, 24, 28, 26]
          : [24, 14, 24, 18, 20, 20, 24, 26];
        const COL_HEADERS = isHullWar
          ? [
              "Registration",
              "Currency",
              "Aircraft\nAgreed Value",
              rateColHeader,
              "Hull War\nPremium",
              `Order ${ohPctLocal}%\nPremium`,
              "Premium\nTax",
            ]
          : [
              "Registration",
              "Currency",
              "Aircraft\nAgreed Value",
              rateColHeader,
              "Hull\nPremium",
              "Liability\nPremium",
              `Order ${ohPctLocal}%\nPremium`,
              "Premium\nTax",
            ];
        // Right-align numeric columns
        const RIGHT_ALIGN = isHullWar
          ? [false, false, true, true, true, true, true]
          : [false, false, true, true, true, true, true, true];

        const getColX = (ci: number) => {
          let x = TABLE_X;
          for (let i = 0; i < ci; i++) x += COL_WIDTHS[i];
          return x;
        };

        // ── Draw header row ──
        const drawPremHeader = () => {
          // Header background
          const headerH = 14;
          doc.setFillColor(...HEADER_BG);
          doc.rect(TABLE_X, contentY - 3.5, TABLE_W, headerH, "F");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(HEADER_FONT);
          doc.setTextColor(...BLACK);

          for (let ci = 0; ci < COL_HEADERS.length; ci++) {
            const hLines = COL_HEADERS[ci].split("\n");
            const colX = getColX(ci);
            const colW = COL_WIDTHS[ci] - 2;
            for (let li = 0; li < hLines.length; li++) {
              const ty = contentY + li * 3.2;
              if (RIGHT_ALIGN[ci]) {
                doc.text(hLines[li], colX + colW, ty, { align: "right" });
              } else {
                doc.text(hLines[li], colX, ty);
              }
            }
          }
          contentY += headerH - 2;
          contentY += LINE_H * 0.5;
        };

        // Check space for header + at least one row
        if (contentY + 20 + ROW_H > PAGE_H - MARGIN_BOTTOM) {
          addFooter(); doc.addPage(); pageNum++;
          y = MARGIN_TOP; addPageHeader(); contentY = y;
          sectionHadPageBreak = true;
        }

        drawPremHeader();

        // ── Data rows ──
        let totalAircraftValue = 0;
        let totalHullPrem = 0;
        let totalLiabPrem = 0;
        let totalOrderPrem = 0;
        let hasTax = taxPct > 0 && !!taxNameStr;

        const fmtNum = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const fmtRate = (r: number) => `${r.toFixed(6)}%`;

        for (const hr of hullRows) {
          if (contentY + ROW_H + 1 > PAGE_H - MARGIN_BOTTOM) {
            addFooter(); doc.addPage(); pageNum++;
            y = MARGIN_TOP; addPageHeader(); contentY = y;
            sectionHadPageBreak = true;
            drawPremHeader();
          }

          const reg = hr.registration || "TBD";
          const hullVal = hr.hullValue || 0;
          const rate = hr.rate || 0;
          const hullPrem = hr.hullPremium || 0;
          const lr = liabilityRows.find((l: any) => l.registration?.toUpperCase() === hr.registration?.toUpperCase());
          const liabPrem = isHullWar ? 0 : (lr?.premium || 0);
          const orderPrem = (hullPrem + liabPrem) * (parseFloat(ohPctLocal) / 100);
          const taxStr = hasTax ? "" : "Not\nApplicable";

          totalAircraftValue += hullVal;
          totalHullPrem += hullPrem;
          totalLiabPrem += liabPrem;
          totalOrderPrem += orderPrem;

          const rowData = isHullWar
            ? [reg, cur, fmtNum(hullVal), fmtRate(rate), fmtNum(hullPrem), fmtNum(orderPrem), taxStr]
            : [reg, cur, fmtNum(hullVal), fmtRate(rate), fmtNum(hullPrem), fmtNum(liabPrem), fmtNum(orderPrem), taxStr];

          doc.setFont("helvetica", "normal");
          doc.setFontSize(TABLE_FONT);
          doc.setTextColor(...DARK_GRAY);

          for (let ci = 0; ci < rowData.length; ci++) {
            const colX = getColX(ci);
            const colW = COL_WIDTHS[ci] - 2;
            const val = rowData[ci];
            if (val.includes("\n")) {
              const parts = val.split("\n");
              for (let pi = 0; pi < parts.length; pi++) {
                const py = contentY + pi * 3.2;
                if (RIGHT_ALIGN[ci]) {
                  doc.text(parts[pi], colX + colW, py, { align: "right" });
                } else {
                  doc.text(parts[pi], colX, py);
                }
              }
            } else if (RIGHT_ALIGN[ci]) {
              doc.text(val, colX + colW, contentY, { align: "right" });
            } else {
              doc.text(val, colX, contentY);
            }
          }
          contentY += ROW_H;
        }

        // ── Totals separator line ──
        contentY += LINE_H * 0.8;
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.3);
        doc.line(TABLE_X, contentY - 1, TABLE_X + TABLE_W, contentY - 1);
        contentY += LINE_H * 1.5;

        // ── Totals row ──
        doc.setFont("helvetica", "bold");
        doc.setFontSize(TABLE_FONT);
        doc.setTextColor(...BLACK);
        doc.text("Totals", TABLE_X, contentY);

        // Totals values
        doc.setFont("helvetica", "normal");
        doc.setFontSize(TABLE_FONT);
        doc.setTextColor(...DARK_GRAY);

        // Currency
        doc.text(cur, getColX(1), contentY);

        // Aircraft value total
        doc.text(fmtNum(totalAircraftValue), getColX(2) + COL_WIDTHS[2] - 2, contentY, { align: "right" });

        // Hull / Hull War premium total
        doc.text(fmtNum(totalHullPrem), getColX(4) + COL_WIDTHS[4] - 2, contentY, { align: "right" });

        if (!isHullWar) {
          // Liability premium total (not applicable for HW)
          doc.text(fmtNum(totalLiabPrem), getColX(5) + COL_WIDTHS[5] - 2, contentY, { align: "right" });
        }

        // Order premium total — column index shifts for HW (5 vs 6)
        const orderColIdx = isHullWar ? 5 : 6;
        doc.text(fmtNum(totalOrderPrem), getColX(orderColIdx) + COL_WIDTHS[orderColIdx] - 2, contentY, { align: "right" });

        contentY += ROW_H;

        // ── Premium tax row (if applicable) ──
        if (hasTax) {
          const taxAmount = Math.round(totalOrderPrem * taxPct / 100);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(TABLE_FONT);
          doc.setTextColor(...DARK_GRAY);
          doc.text(`${taxNameStr} (${taxPct}%)`, TABLE_X, contentY);
          const taxColIdx = isHullWar ? 6 : 7;
          doc.text(fmtNum(taxAmount), getColX(taxColIdx) + COL_WIDTHS[taxColIdx] - 2, contentY, { align: "right" });
          contentY += ROW_H;

          // Gross total
          const grossPremium = taxTypeStr === "inclusive" ? totalOrderPrem : totalOrderPrem + taxAmount;
          doc.setDrawColor(...BLACK);
          doc.setLineWidth(0.3);
          doc.line(TABLE_X, contentY - 1, TABLE_X + TABLE_W, contentY - 1);
          contentY += LINE_H * 0.5;
          doc.setFont("helvetica", "bold");
          doc.text("Total Gross Premium", TABLE_X, contentY);
          doc.setFont("helvetica", "normal");
          doc.text(fmtNum(grossPremium), getColX(orderColIdx) + COL_WIDTHS[orderColIdx] - 2, contentY, { align: "right" });
          contentY += ROW_H;
        }

        // ── Footer text ──
        contentY += LINE_H * 2;
        if (contentY + LINE_H * 3 > PAGE_H - MARGIN_BOTTOM) {
          addFooter(); doc.addPage(); pageNum++;
          y = MARGIN_TOP; addPageHeader(); contentY = y;
          sectionHadPageBreak = true;
        }
        const inceptionDt = dd.inceptionDate || placement.inceptionDate || "";
        const footerDateStr = inceptionDt ? (() => {
          try {
            return new Date(inceptionDt + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
          } catch { return inceptionDt; }
        })() : "";
        const footerText = `Any additional information uploaded to support your enquiry is as more fully detailed and available in your Flightdeck submission${footerDateStr ? ` dated ${footerDateStr}` : ""}.`;
        const footerLines = wrapText(footerText, TABLE_FONT, "normal", TABLE_W);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(TABLE_FONT);
        doc.setTextColor(...DARK_GRAY);
        for (const fl of footerLines) {
          doc.text(fl, TABLE_X, contentY);
          contentY += LINE_H;
        }

        contentY += LINE_H;
        continue;
      }

      // Add vertical gap before top-level numbered items (2., 3., etc.) — not before "1."
      if (seg.isNumberedStart && !seg.text.startsWith("1.")) {
        contentY += LINE_H * 0.8;
      }
      // Force page break before "In addition" content — only within Sums Insured/Reinsured sections
      const isSumsSection = /sums\s+(insured|reinsured)/i.test(section.title);
      if (isSumsSection && /^In\s+addition/i.test(seg.text) && contentY > MARGIN_TOP + LINE_H) {
        addFooter();
        doc.addPage();
        pageNum++;
        y = MARGIN_TOP;
        addPageHeader();
        contentY = y;
        sectionHadPageBreak = true;
      }
      // Check page break using contentY (where we actually render), not y
      if (contentY + LINE_H + 1 > PAGE_H - MARGIN_BOTTOM) {
        addFooter();
        doc.addPage();
        pageNum++;
        y = MARGIN_TOP;
        addPageHeader();
        contentY = y;
        sectionHadPageBreak = true;
      }
      // ── Special handling: Open Pilot Warranty table section ──
      if (seg.text === "__OPW_SECTION__") {
        const opwData: Record<string, any> = (placement.draftData || {}).opwHours || {};
        const opwFleet: any[] = (placement.draftData || {}).fleet || [];
        // Group fleet by aircraft type|engine type
        const opwTypeGroups: Record<string, any[]> = {};
        for (const ac of opwFleet) {
          const typeKey = `${ac.aircraftType || "unknown"}|${ac.engineType || "unknown"}`;
          if (!opwTypeGroups[typeKey]) opwTypeGroups[typeKey] = [];
          opwTypeGroups[typeKey].push(ac);
        }
        const opwAllKeys = [...new Set([...Object.keys(opwTypeGroups), ...Object.keys(opwData)])];

        // Helper: format "fixed-wing|single-engine-piston" → "FIXED WING, SINGLE-ENGINE-PISTON"
        // Also converts "type_rated" → "TYPE RATED"
        const formatTypeKey = (key: string): string => {
          const parts = key.split("|");
          return parts.map(p => p.replace(/type_rated/gi, "Type Rated").replace(/-/g, " ")).join(", ").toUpperCase();
        };

        // Helper: format hour values with thousands comma separator
        const fmtOpwHours = (val: string): string => {
          if (!val) return "-";
          const num = Number(String(val).replace(/,/g, ""));
          if (isNaN(num)) return val;
          return num.toLocaleString();
        };

        // ── Heading: "Open Pilot Warranty:" underlined ──
        const opwHeading = "Open Pilot Warranty:";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FONT_SIZE);
        doc.setTextColor(...BLACK);
        doc.text(opwHeading, claimsContentX, contentY);
        const opwHeadingW = doc.getTextWidth(opwHeading);
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.2);
        doc.line(claimsContentX, contentY + 0.8, claimsContentX + opwHeadingW, contentY + 0.8);
        contentY += LINE_H * 1.3;

        // ── Warranty text ──
        const opwIntro = 'Warranted all pilots operating Aircraft under this policy meet the following minimum requirements, unless classed as a "named pilot":';
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FONT_SIZE);
        doc.setTextColor(...DARK_GRAY);
        const opwColW = isFullWidthSection ? FULL_W : CONTENT_COL_W;
        const opwIntroWrapped = wrapText(opwIntro, FONT_SIZE, "normal", opwColW);
        for (const line of opwIntroWrapped) {
          doc.text(line, claimsContentX, contentY);
          contentY += LINE_H;
        }
        contentY += LINE_H * 0.8;

        // ── Table constants ──
        const TBL_X = claimsContentX;
        const TBL_W = opwColW;
        const OPW_COL_W = TBL_W / 3; // 3 equal columns
        const TBL_FONT = 8;
        const TBL_HEADER_FONT = 7.5;
        const TBL_ROW_H = 6;
        const TBL_HEADER_H = 7;
        const TBL_HEADERS = ["TOTAL HOURS", "ENGINE HOURS", "MAKE AND\nMODEL HOURS"];

        // Helper to draw one OPW table (for PIC or Co-Pilot)
        const drawOpwTable = (roleLabel: string, typeLabel: string, totalHrs: string, engineHrs: string, makeModelHrs: string) => {
          // Estimate total height needed: label line + header + data row
          const neededH = LINE_H + TBL_HEADER_H + TBL_ROW_H + 6;
          if (contentY + neededH > PAGE_H - MARGIN_BOTTOM) {
            addFooter();
            doc.addPage();
            pageNum++;
            y = MARGIN_TOP;
            addPageHeader();
            contentY = y;
            sectionHadPageBreak = true;
          }

          // ── Role + type label (e.g. "PIC - FIXED WING, SINGLE-ENGINE-PISTON") ──
          doc.setFont("helvetica", "bold");
          doc.setFontSize(FONT_SIZE);
          doc.setTextColor(...BLACK);
          const opwLabel = `${roleLabel} - ${typeLabel}`;
          const opwLabelWrapped = wrapText(opwLabel, FONT_SIZE, "bold", opwColW);
          for (const ln of opwLabelWrapped) {
            doc.text(ln, claimsContentX, contentY);
            contentY += LINE_H;
          }
          contentY += LINE_H * 0.3;

          // ── Header row with gray background ──
          doc.setFillColor(230, 230, 230);
          doc.setDrawColor(...BLACK);
          doc.setLineWidth(0.3);
          doc.rect(TBL_X, contentY - 1, TBL_W, TBL_HEADER_H, "FD");
          // Vertical column dividers in header
          doc.line(TBL_X + OPW_COL_W, contentY - 1, TBL_X + OPW_COL_W, contentY - 1 + TBL_HEADER_H);
          doc.line(TBL_X + OPW_COL_W * 2, contentY - 1, TBL_X + OPW_COL_W * 2, contentY - 1 + TBL_HEADER_H);

          // Header text (centered in each column)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(TBL_HEADER_FONT);
          doc.setTextColor(...BLACK);
          for (let ci = 0; ci < TBL_HEADERS.length; ci++) {
            const colCenterX = TBL_X + (ci * OPW_COL_W) + (OPW_COL_W / 2);
            const headerParts = TBL_HEADERS[ci].split("\n");
            if (headerParts.length > 1) {
              const lineSpacing = 3;
              const startY = contentY + (TBL_HEADER_H / 2) - (lineSpacing * (headerParts.length - 1)) / 2 - 0.5;
              for (let li = 0; li < headerParts.length; li++) {
                doc.text(headerParts[li], colCenterX, startY + (li * lineSpacing), { align: "center" });
              }
            } else {
              doc.text(TBL_HEADERS[ci], colCenterX, contentY + (TBL_HEADER_H / 2) + 0.5, { align: "center" });
            }
          }
          contentY += TBL_HEADER_H;

          // ── Data row ──
          doc.setDrawColor(...BLACK);
          doc.setLineWidth(0.3);
          doc.rect(TBL_X, contentY - 1, TBL_W, TBL_ROW_H, "S");
          doc.line(TBL_X + OPW_COL_W, contentY - 1, TBL_X + OPW_COL_W, contentY - 1 + TBL_ROW_H);
          doc.line(TBL_X + OPW_COL_W * 2, contentY - 1, TBL_X + OPW_COL_W * 2, contentY - 1 + TBL_ROW_H);

          // Data values (centered)
          doc.setFont("helvetica", "normal");
          doc.setFontSize(TBL_FONT);
          doc.setTextColor(...DARK_GRAY);
          const values = [fmtOpwHours(totalHrs), fmtOpwHours(engineHrs), fmtOpwHours(makeModelHrs)];
          for (let ci = 0; ci < values.length; ci++) {
            const colCenterX = TBL_X + (ci * OPW_COL_W) + (OPW_COL_W / 2);
            doc.text(values[ci], colCenterX, contentY + (TBL_ROW_H / 2) + 0.5, { align: "center" });
          }
          contentY += TBL_ROW_H + LINE_H * 0.8;
        };

        // ── Render tables per aircraft type ──
        let hasAnyData = false;
        for (const typeKey of opwAllKeys) {
          const hours = opwData[typeKey];
          if (!hours) continue;

          const typeLabel = formatTypeKey(typeKey);

          // PIC data
          const picTotal = hours.picTotalHours || hours.picTotalHoursOther || "";
          const picEngine = hours.picEngineHours || hours.picEngineHoursOther || "";
          const picMakeModel = hours.picMakeModelHours || hours.picMakeModelHoursOther || "";
          if (picTotal || picEngine || picMakeModel) {
            drawOpwTable("PIC", typeLabel, picTotal, picEngine, picMakeModel);
            hasAnyData = true;
          }

          // Co-Pilot data
          const coTotal = hours.coPilotTotalHours || hours.coPilotTotalHoursOther || "";
          const coEngine = hours.coPilotEngineHours || hours.coPilotEngineHoursOther || "";
          const coMakeModel = hours.coPilotMakeModelHours || hours.coPilotMakeModelHoursOther || "";
          if (coTotal || coEngine || coMakeModel) {
            drawOpwTable("CO-PILOT", typeLabel, coTotal, coEngine, coMakeModel);
            hasAnyData = true;
          }
        }

        // Fallback if OPW selected but no hour data entered
        if (!hasAnyData) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FONT_SIZE);
          doc.setTextColor(...DARK_GRAY);
          doc.text("Minimum requirements as agreed.", claimsContentX, contentY);
          contentY += LINE_H;
        }

        contentY += LINE_H * 0.3;
        continue;
      }

      if (seg.text === "") {
        contentY += LINE_H * 0.6; // slightly reduced empty line spacing
      } else if (seg.text.startsWith("(per annum") && seg.text.includes("pro rata")) {
        // Centered subtitle for Premium Breakdown
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...DARK_GRAY);
        doc.text(seg.text, PAGE_W / 2, contentY, { align: "center" });
        contentY += LINE_H * 1.5;
      } else if (seg.text === "AIRCRAFT SCHEDULE" || seg.text === "AIRCRAFT USES" || seg.text === "PREMIUM BREAKDOWN") {
        // Render as centred bold title (matching reference screenshot style)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BLACK);
        doc.text(seg.text, PAGE_W / 2, contentY, { align: "center" });
        contentY += LINE_H * 2;
      } else if (seg.underline) {
        // Render underlined sub-heading
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FONT_SIZE);
        doc.setTextColor(...BLACK);
        doc.text(seg.text, claimsContentX + seg.indent, contentY);
        // Draw underline
        const textWidth = doc.getTextWidth(seg.text);
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.2);
        doc.line(claimsContentX + seg.indent, contentY + 0.8, claimsContentX + seg.indent + textWidth, contentY + 0.8);
        contentY += LINE_H;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FONT_SIZE);
        doc.setTextColor(...DARK_GRAY);
        doc.text(seg.text, claimsContentX + seg.indent, contentY);
        contentY += LINE_H;
      }
    }

    // Advance y to the furthest point of either column
    // If a page break occurred within this section, labelStartY is stale (from a previous page)
    // so we must ignore it and use contentY directly
    const labelEndY = labelStartY + (labelLines.length * LINE_H);
    y = (sectionHadPageBreak ? contentY : Math.max(labelEndY, contentY)) + 3 + LINE_H; // gap between sections + extra drop-down line
  }

  // ══════════════════════════════════════════════════════════════════
  //  CANCELLATION SCALE PAGE (final page)
  // ═════════════════════════════════════════════════���════════════════
  addFooter();
  doc.addPage();
  pageNum++;
  y = MARGIN_TOP;
  addPageHeader();

  // Context-aware labels for insurance vs reinsurance
  const csInsured = isReinsurance ? "Reinsured" : "Insured";
  const csInsurance = isReinsurance ? "Reinsurance" : "Insurance";
  const csInsurers = isReinsurance ? "Reinsurers" : "Insurers";

  // ── Main title ──
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text(`CANCELLATION BY ${csInsured.toUpperCase()}`, PAGE_W / 2, y, { align: "center" });
  y += LINE_H * 2.5;

  // ── Intro paragraph 1 ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const csIntro1 = `This ${csInsurance} may be cancelled at any time at the written request of the ${csInsured}.`;
  const csIntro1Lines = wrapText(csIntro1, 9, "normal", FULL_W);
  for (const line of csIntro1Lines) {
    doc.text(line, MARGIN_L, y);
    y += LINE_H;
  }
  y += LINE_H * 0.8;

  // ── Intro paragraph 2 ──
  const csIntro2 = `If the ${csInsurance} shall be cancelled by the ${csInsured} the ${csInsurers} shall retain the earned premium hereon for the period that this ${csInsurance} has been in force, calculated in accordance with the following Aviation Cancellation Scale:`;
  const csIntro2Lines = wrapText(csIntro2, 9, "normal", FULL_W);
  for (const line of csIntro2Lines) {
    doc.text(line, MARGIN_L, y);
    y += LINE_H;
  }
  y += LINE_H * 3;

  // ── Scale sub-title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("AVIATION CANCELLATION SCALE", PAGE_W / 2, y, { align: "center" });
  y += LINE_H * 1.8;
  doc.setFontSize(10);
  doc.text("(applicable to Policy Period)", PAGE_W / 2, y, { align: "center" });
  y += LINE_H * 3;

  // ── Scale rows — dotted-leader style ──
  const cancelScaleRows: [string, string][] = [
    ["10.00% of period", "20% overall policy period premium"],
    ["17.50% of period", "30% overall policy period premium"],
    ["25.00% of period", "40% overall policy period premium"],
    ["35.00% of period", "50% overall policy period premium"],
    ["40.00% of period", "60% overall policy period premium"],
    ["50.00% of period", "70% overall policy period premium"],
    ["60.00% of period", "75% overall policy period premium"],
    ["65.00% of period", "80% overall policy period premium"],
    ["75.00% of period", "85% overall policy period premium"],
  ];

  const CS_LEFT_X = MARGIN_L + 4;
  const CS_RIGHT_X = PAGE_W - MARGIN_R - 4;
  const CS_LEADER_GAP = 2;
  const CS_ROW_H = LINE_H * 1.6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);

  for (let ri = 0; ri < cancelScaleRows.length; ri++) {
    const [left, right] = cancelScaleRows[ri];
    const rowY = y + ri * CS_ROW_H;

    // Left-aligned text
    doc.text(left, CS_LEFT_X, rowY);
    const leftW = doc.getTextWidth(left);

    // Right-aligned text
    doc.text(right, CS_RIGHT_X, rowY, { align: "right" });
    const rightW = doc.getTextWidth(right);

    // Dotted leader line between the two texts
    const leaderStartX = CS_LEFT_X + leftW + CS_LEADER_GAP;
    const leaderEndX = CS_RIGHT_X - rightW - CS_LEADER_GAP;
    if (leaderEndX > leaderStartX + 4) {
      doc.setDrawColor(...LIGHT_GRAY);
      doc.setLineWidth(0.15);
      const dotSpacing = 1.8;
      let dx = leaderStartX;
      while (dx < leaderEndX) {
        doc.line(dx, rowY - 0.3, dx + 0.5, rowY - 0.3);
        dx += dotSpacing;
      }
    }
  }

  y += cancelScaleRows.length * CS_ROW_H + LINE_H * 2;

  // ── "Over 75%" line — centred ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("Over 75.00% of period, equivalent to overall policy period premium", PAGE_W / 2, y, { align: "center" });
  y += LINE_H * 3;

  // ── Footer paragraph ──
  const csFooter = `There will be no return of premium in respect of any Aircraft on which loss is paid or is payable under this ${csInsurance}. The ${csInsured} agrees, in the event of cancellation, to report the spares and equipment values at risk and to pay premium thereon to ${csInsurers} as provided by 'Reporting and Premium Return Clause' up to the date of cancellation.`;
  const csFooterLines = wrapText(csFooter, 9, "normal", FULL_W);
  for (const line of csFooterLines) {
    doc.text(line, MARGIN_L, y);
    y += LINE_H;
  }

  // ══════════════════════════════════════════════════════════════════
  //  FINAL FOOTER
  // ══════════════════════════════════════════════════════════════════
  addFooter();

  return doc;
}

// ─── EOC Covering Letter PDF ──────────────────────────────────────

function generateEOCCoveringLetterPDF(
  placement: Placement,
  lineslip: Lineslip | undefined,
  logoDataUrl?: string,
  currentUser?: any,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const d = placement.draftData || {};
  const quote = placement.quotes?.[placement.quotes.length - 1];
  const isReinsurance = d.placementType === "reinsurance";
  const currency = d.aircraftAgreedValueCurrency || quote?.currency || "USD";
  const currSym = currency === "GBP" ? "GBP " : currency === "EUR" ? "EUR " : "USD ";

  const productNames: Record<string, string> = {
    HL: "Hull & Liability", HW: "Hull War", PA: "Personal Accident",
    LOL: "Loss of Licence", HD: "Hull Deductible", UAS: "Drone Insurance",
  };

  const pCode = d.productCode || placement.productCode || "";
  const productName = productNames[pCode] || pCode;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "TBA";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit", month: "long", year: "numeric",
      });
    } catch { return dateStr; }
  };

  const eocRaw = lineslip?.eocLetterData;
  // Resolve insurance vs reinsurance EOC fields based on placement type
  const eocData = eocRaw ? {
    senderAddress: isReinsurance ? (eocRaw.reinsuranceSenderAddress) : (eocRaw.insuranceSenderAddress),
    clientDetails: isReinsurance ? (eocRaw.reinsuranceClientDetails || eocRaw.clientDetails) : (eocRaw.insuranceClientDetails || eocRaw.clientDetails),
    dateLine: isReinsurance ? (eocRaw.reinsuranceDateLine || eocRaw.dateLine) : (eocRaw.insuranceDateLine || eocRaw.dateLine),
    subjectLine: isReinsurance ? (eocRaw.reinsuranceSubjectLine || eocRaw.subjectLine) : (eocRaw.insuranceSubjectLine || eocRaw.subjectLine),
    welcomeText: isReinsurance ? (eocRaw.reinsuranceWelcomeText || eocRaw.welcomeText) : (eocRaw.insuranceWelcomeText || eocRaw.welcomeText),
    premiumPaymentTerms: isReinsurance ? (eocRaw.reinsurancePremiumPaymentTerms || eocRaw.premiumPaymentTerms) : (eocRaw.insurancePremiumPaymentTerms || eocRaw.premiumPaymentTerms),
    commission: isReinsurance ? (eocRaw.reinsuranceCommission || eocRaw.commission) : (eocRaw.insuranceCommission || eocRaw.commission),
    termsAndConditions: isReinsurance ? (eocRaw.reinsuranceTermsAndConditions || eocRaw.termsAndConditions) : (eocRaw.insuranceTermsAndConditions || eocRaw.termsAndConditions),
    dutyOfDisclosure: isReinsurance ? (eocRaw.reinsuranceDutyOfDisclosure || eocRaw.dutyOfDisclosure) : (eocRaw.insuranceDutyOfDisclosure || eocRaw.dutyOfDisclosure),
    customSubject: eocRaw.customSubject,
    additionalNotes: eocRaw.additionalNotes,
    closingText: eocRaw.closingText,
  } : undefined;
  const insuredName = placement.insuredName || d.insuredName || "TBD";
  const reinsuredName = d.reinsuredName || "";
  const insuredAddress = [d.insuredAddressLine1, d.insuredCity, d.insuredPostcode, d.insuredCountry].filter(Boolean).join(", ");
  const reference = placement.reference || "DRAFT";
  const facilityRef = placement.facilityRef || "";
  const inceptionDate = formatDate(d.inceptionDate || placement.inceptionDate);
  const expiryDate = formatDate(d.expiryDate);
  const brokerName = placement.submittedByName || placement.brokerName || "TBD";
  // brokerCompany = the PLACING broker's company (Lockton). Do NOT fall back to
  // placement.brokerCompany which is the producing broker's company.
  const brokerCompany = placement.submittedByCompany || currentUser?.company || "";
  const producingBrokerName = d.producingBroker || placement.brokerName || "";
  const producingBrokerCompany = placement.brokerCompany || "";
  const boundDate = placement.boundDate ? formatDate(placement.boundDate) : formatDate(new Date().toISOString().split("T")[0]);
  // Commission data from lineslip
  const totalCommission = isReinsurance
    ? (lineslip?.reinsuranceCompositeBrokerage || 0)
    : (lineslip?.insuranceCompositeBrokerage || 0);
  const boundByName = placement.boundByName || quote?.underwriterName || "TBD";
  const boundByCompany = placement.boundByCompany || quote?.underwriterCompany || "";
  const totalPremium = quote?.premium || 0;
  const fleet = d.fleet || [];

  const hullTotal = fleet.reduce((sum: number, a: any) => {
    const raw = a.aircraftAgreedValue || a.agreedValue;
    const val = typeof raw === "string" ? Number(raw.replace(/,/g, "")) : (raw || 0);
    return sum + val;
  }, 0);

  // Helper to add a bold underlined section heading (reinsurance style)
  const addSectionHeading = (text: string) => {
    if (y > PAGE_H - MARGIN_BOTTOM - 20) { doc.addPage(); y = MARGIN_TOP; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...BLACK);
    doc.text(text, MARGIN_L, y);
    const textW = doc.getTextWidth(text);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.25);
    doc.line(MARGIN_L, y + 0.8, MARGIN_L + textW, y + 0.8);
    y += LINE_H + 3;
  };

  let y = MARGIN_TOP;

  // ── Sender Address (top-left) & Logo (top-right) — vertically aligned ──
  const headerTopY = y;

  // Sender address — top-left
  const senderAddr = eocData?.senderAddress || "Lockton Companies (Singapore) Pte Ltd\n50 Raffles Pl, #37-01/06 Singapore Land Tower\nSingapore 048623";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_GRAY);
  const senderLines = senderAddr.split("\n").map((l: string) => sanitizeForPdf(l.trim())).filter(Boolean);
  let senderY = headerTopY + 2;
  senderLines.forEach((line: string) => {
    doc.text(line, MARGIN_L, senderY);
    senderY += 3.2;
  });

  // Logo — top-right, vertically centred with sender text block
  if (logoDataUrl) {
    const senderBlockH = senderLines.length * 3.2;
    const logoH = 16;
    const logoY = headerTopY + (senderBlockH / 2) - (logoH / 2);
    try {
      doc.addImage(logoDataUrl, "PNG", PAGE_W - MARGIN_R - 30, logoY, 30, logoH);
    } catch {}
  }

  y += 18;

  if (isReinsurance) {
    // ═══════════════════════════════════════════════════════════════
    // REINSURANCE VERSION
    // ═══════════════════════════════════════════════════════════════

    // ── Title (centred) ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BLACK);
    doc.text("EVIDENCE OF COVER", PAGE_W / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(...MID_GRAY);
    doc.text("Covering Letter", PAGE_W / 2, y, { align: "center" });
    y += 10;
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    y += 8;

    // ── Helper: resolve {{placeholders}} in EOC text ──
    const resolveEocPlaceholders = (text: string): string => {
      return text
        .replace(/\{\{Producing Broker Details\}\}/gi, (producingBrokerName && producingBrokerName !== "Direct")
          ? [producingBrokerName, producingBrokerCompany].filter(Boolean).join(", ")
          : "{{Producing Broker Details}}")
        .replace(/\{\{Producing Broker\}\}/gi, (producingBrokerCompany && producingBrokerName !== "Direct") ? producingBrokerCompany : "{{Producing Broker}}")
        .replace(/\{\{Date Underwriter Confirms Bound\}\}/gi, boundDate !== "TBA" ? boundDate : "{{Date Underwriter Confirms Bound}}")
        .replace(/\{\{Date Bound\}\}/gi, boundDate !== "TBA" ? boundDate : "{{Date Bound}}")
        .replace(/\{\{Reinsured Name\}\}/gi, reinsuredName || "{{Reinsured Name}}")
        .replace(/\{\{Insured Name\}\}/gi, insuredName !== "TBD" ? insuredName : "{{Insured Name}}")
        .replace(/\{\{Product\}\}/gi, productName || "{{Product}}")
        .replace(/\{\{Insurance or Reinsurance\}\}/gi, isReinsurance ? "Reinsurance" : "Insurance")
        .replace(/\{\{Total Commission\}\}/gi, totalCommission > 0 ? `${totalCommission}%` : "{{Total Commission}}")
        .replace(/\{\{Broker Company\}\}/gi, brokerCompany || "{{Broker Company}}")
        .replace(/\{\{Broker Split\}\}/gi, "{{Broker Split}}")
        .replace(/\{\{Producing Broker Split\}\}/gi, "{{Producing Broker Split}}")
        .replace(/\{\{Reinsured\}\}/gi, reinsuredName || "{{Reinsured}}");
    };

    // ── Helper: render multi-paragraph EOC section text with page breaks ──
    const renderEocText = (text: string, indent: number = 0) => {
      const resolved = resolveEocPlaceholders(text);
      const paragraphs = resolved.split("\n");
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) { y += 2; continue; }
        // Handle bullet points (lines starting with -)
        if (trimmed.startsWith("- ") || trimmed.startsWith("- ")) {
          if (y > PAGE_H - MARGIN_BOTTOM - 15) { doc.addPage(); y = MARGIN_TOP; }
          doc.text("-", MARGIN_L + indent + 4, y);
          const bulletText = trimmed.substring(2);
          const bLines = doc.splitTextToSize(sanitizeForPdf(bulletText), FULL_W - indent - 12);
          doc.text(bLines, MARGIN_L + indent + 10, y);
          y += bLines.length * LINE_H + 2;
        } else {
          const pLines = doc.splitTextToSize(sanitizeForPdf(trimmed), FULL_W - indent);
          for (const line of pLines) {
            if (y > PAGE_H - MARGIN_BOTTOM - 8) { doc.addPage(); y = MARGIN_TOP; }
            doc.text(line, MARGIN_L + indent, y);
            y += LINE_H;
          }
          y += 2;
        }
      }
    };

    // ── 1. Client Details (addressee) ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const clientDetailsText = eocData?.clientDetails || "{{Producing Broker Details}}";
    const resolvedClientDetails = resolveEocPlaceholders(clientDetailsText);
    const cdLines = resolvedClientDetails.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    for (const cdl of cdLines) {
      doc.text(sanitizeForPdf(cdl), MARGIN_L, y); y += LINE_H + 1;
    }
    y += 4;

    // ── 2. DATE: (normal, no underline) ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const dateLabel = "Date: ";
    doc.text(dateLabel, MARGIN_L, y);
    const dateLabelW = doc.getTextWidth(dateLabel);
    const dateLineText = eocData?.dateLine || "{{Date Underwriter Confirms Bound}}";
    const resolvedDate = resolveEocPlaceholders(dateLineText);
    doc.text(sanitizeForPdf(resolvedDate), MARGIN_L + dateLabelW, y);
    y += LINE_H + 1;

    // ── 3. SUBJECT: (underlined label) ──
    doc.setFont("helvetica", "bold");
    const subjLabel = "SUBJECT: ";
    doc.text(subjLabel, MARGIN_L, y);
    const subjLabelW = doc.getTextWidth(subjLabel);
    const OLD_REINS_SUBJ_DEFAULT = "Re: Evidence of Cover \u2014 Aviation {{Product}} Reinsurance";
    const rawReinsSubj = eocData?.subjectLine;
    const subjectLineText = (rawReinsSubj && rawReinsSubj !== OLD_REINS_SUBJ_DEFAULT) ? rawReinsSubj : "{{Reinsured Name}}, {{Insured Name}}, {{Product}}, {{Insurance or Reinsurance}}";
    const resolvedSubject = resolveEocPlaceholders(subjectLineText);
    const subjLines = doc.splitTextToSize(sanitizeForPdf(resolvedSubject), FULL_W - subjLabelW);
    doc.text(subjLines, MARGIN_L + subjLabelW, y);
    y += subjLines.length * LINE_H + 6;

    // ── 4. Welcome Text ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const welcomeText = eocData?.welcomeText || "Following your instructions for the above-referenced account, please find your Policy Document enclosed as evidence of cover.\n\nPlease review these documents carefully to ensure they align with your requirements. If any details differ from your understanding, kindly notify us immediately. Otherwise, we will proceed on the basis that the documentation is correct.";
    renderEocText(welcomeText);
    y += 4;

    // ── 5. Premium Payment Terms ──
    addSectionHeading("Premium Payment Terms");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const premText = eocData?.premiumPaymentTerms || "We require payment to be made to us by wire transfer no later than 14 days prior to the settlement due date specified herein, to ensure we can remit funds to Reinsurers in a timely manner.";
    renderEocText(premText);
    y += 4;

    // ── 6. Commission ──
    addSectionHeading("Commission");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const commText = eocData?.commission || "Total Commission is {{Total Commission}} Split between {{Broker Company}} at {{Broker Split}} and {{Producing Broker}} {{Producing Broker Split}}.\n\nPlease note that we have provided these terms using a lineslip facility. A lineslip is an arrangement intended to streamline the placing of a risk where, typically, we have identified in advance a number of Reinsurers that will insure a proportion of a particular class of risk. It therefore becomes a cost-effective method to place risks as terms may only have to be agreed with a limited number of the Reinsurers participating in the lineslip. For disclosure purposes, please note we may be entitled to administration costs for managing the lineslip. We will earn a Subscription Market Brokerage (SMB) which reflects administrative services performed on behalf of insurers to complete a subscription market placement, and which is calculated as a percentage of your insurance premium.";
    renderEocText(commText);
    y += 4;

    // ── 7. Terms and Conditions ──
    addSectionHeading("Terms and Conditions");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const tcText = eocData?.termsAndConditions || "We also draw your attention to the Policy terms and conditions as fully detailed herein including\n\n- Geographical exclusions - please review and ensure that these meet your requirements and that in operating your aircraft you will not be in breach of this.\n- Premium Payment Clause noting that Underwriters have the right to issue 30 days' notice of cancellation if the premium is not paid by the due date.";
    renderEocText(tcText);
    y += 4;

    // ── 8. Duty of Disclosure ──
    addSectionHeading("Duty of Disclosure");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const dodText = eocData?.dutyOfDisclosure || "Under the terms of the Insurance Act 2015, you have a duty to make a fair presentation of the risk prior to inception, renewal or variation of your insurance. Failure to do so may allow the insurer to avoid the policy, reduce the amount payable on a claim or change the terms of the insurance. You must therefore ensure that all material information is disclosed to us prior to inception, renewal or variation of this policy.\n\nPlease do not hesitate to contact us should you have any queries regarding the above or require any further information.";
    renderEocText(dodText);
    y += 4;

  } else {
    // ═══════════════════════════════════════════════════════════════
    // INSURANCE VERSION — configurable EOC layout
    // ═══════════════════════════════════════════════════════════════

    // ── Title (centred) ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BLACK);
    doc.text("EVIDENCE OF COVER", PAGE_W / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(...MID_GRAY);
    doc.text("Covering Letter", PAGE_W / 2, y, { align: "center" });
    y += 10;

    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    y += 8;

    // ── Helper: resolve {{placeholders}} in insurance EOC text ──
    const resolveInsEocPlaceholders = (text: string): string => {
      return text
        .replace(/\{\{Insured Name\}\}/gi, insuredName !== "TBD" ? insuredName : "{{Insured Name}}")
        .replace(/\{\{Insured Address\}\}/gi, insuredAddress || "{{Insured Address}}")
        .replace(/\{\{Producing Broker Details\}\}/gi, (producingBrokerName && producingBrokerName !== "Direct")
          ? [producingBrokerName, producingBrokerCompany].filter(Boolean).join(", ")
          : "{{Producing Broker Details}}")
        .replace(/\{\{Producing Broker\}\}/gi, (producingBrokerName && producingBrokerName !== "Direct") ? producingBrokerName : "{{Producing Broker}}")
        .replace(/\{\{Date Underwriter Confirms Bound\}\}/gi, boundDate !== "TBA" ? boundDate : "{{Date Underwriter Confirms Bound}}")
        .replace(/\{\{Date Bound\}\}/gi, boundDate !== "TBA" ? boundDate : "{{Date Bound}}")
        .replace(/\{\{Product\}\}/gi, productName || "{{Product}}")
        .replace(/\{\{Insurance or Reinsurance\}\}/gi, "Insurance")
        .replace(/\{\{Total Commission\}\}/gi, totalCommission > 0 ? `${totalCommission}%` : "{{Total Commission}}")
        .replace(/\{\{Broker Company\}\}/gi, brokerCompany || "{{Broker Company}}")
        .replace(/\{\{Broker Split\}\}/gi, "{{Broker Split}}")
        .replace(/\{\{Producing Broker Split\}\}/gi, "{{Producing Broker Split}}");
    };

    // ── Helper: render multi-paragraph insurance EOC text with page breaks ──
    const renderInsEocText = (text: string, indent: number = 0) => {
      const resolved = resolveInsEocPlaceholders(text);
      const paragraphs = resolved.split("\n");
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) { y += 2; continue; }
        if (trimmed.startsWith("- ")) {
          if (y > PAGE_H - MARGIN_BOTTOM - 15) { doc.addPage(); y = MARGIN_TOP; }
          doc.text("-", MARGIN_L + indent + 4, y);
          const bulletText = trimmed.substring(2);
          const bLines = doc.splitTextToSize(sanitizeForPdf(bulletText), FULL_W - indent - 12);
          doc.text(bLines, MARGIN_L + indent + 10, y);
          y += bLines.length * LINE_H + 2;
        } else {
          const pLines = doc.splitTextToSize(sanitizeForPdf(trimmed), FULL_W - indent);
          for (const line of pLines) {
            if (y > PAGE_H - MARGIN_BOTTOM - 8) { doc.addPage(); y = MARGIN_TOP; }
            doc.text(line, MARGIN_L + indent, y);
            y += LINE_H;
          }
          y += 2;
        }
      }
    };

    // ── 1. Client Details (Insured) ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const insClientText = eocData?.clientDetails || "{{Insured Name}}\n{{Insured Address}}";
    const resolvedInsClient = resolveInsEocPlaceholders(insClientText);
    doc.setFont("helvetica", "bold");
    const insClientLines = resolvedInsClient.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    for (let ci = 0; ci < insClientLines.length; ci++) {
      if (ci > 0) doc.setFont("helvetica", "normal");
      doc.text(sanitizeForPdf(insClientLines[ci]), MARGIN_L, y); y += LINE_H + 1;
    }
    y += 4;

    // ── Date / References ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const insDateLineText = eocData?.dateLine || "{{Date Underwriter Confirms Bound}}";
    const resolvedInsDate = resolveInsEocPlaceholders(insDateLineText);
    doc.text(`Date: ${sanitizeForPdf(resolvedInsDate)}`, MARGIN_L, y); y += LINE_H + 1;
    y += 4;

    // ── 3. SUBJECT: ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const insSubjLabel = "SUBJECT: ";
    doc.text(insSubjLabel, MARGIN_L, y);
    const insSubjLabelW = doc.getTextWidth(insSubjLabel);
    const OLD_INS_SUBJ_DEFAULT = "Re: Evidence of Cover \u2014 Aviation {{Product}} Insurance";
    const rawInsSubj = eocData?.subjectLine;
    const insSubjectText = (rawInsSubj && rawInsSubj !== OLD_INS_SUBJ_DEFAULT) ? rawInsSubj : `{{Insured Name}}, {{Product}}, Insurance`;
    const resolvedInsSubject = resolveInsEocPlaceholders(insSubjectText);
    const insSubjLines = doc.splitTextToSize(sanitizeForPdf(resolvedInsSubject), FULL_W - insSubjLabelW);
    doc.text(insSubjLines, MARGIN_L + insSubjLabelW, y); y += insSubjLines.length * LINE_H + 4;

    // ── 4. Welcome Text ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const insWelcomeText = eocData?.welcomeText || "We are pleased to confirm that cover has been bound on your behalf in respect of the above-referenced risk. This letter serves as your Evidence of Cover (\"EOC\") and confirms the principal terms and conditions of the placement.\n\nPlease review these documents carefully to ensure they align with your requirements. If any details differ from your understanding, kindly notify us immediately. Otherwise, we will proceed on the basis that the documentation is correct.";
    renderInsEocText(insWelcomeText);
    y += 2;

    // ── 5. Premium Payment Terms ──
    if (y > PAGE_H - MARGIN_BOTTOM - 20) { doc.addPage(); y = MARGIN_TOP; }
    addSectionHeading("Premium Payment Terms");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const insPremText = eocData?.premiumPaymentTerms || "Premium is due within 30 days of inception or as otherwise agreed. Failure to pay premium by the due date may result in Underwriters exercising their right to cancel cover in accordance with the Premium Payment Clause.";
    renderInsEocText(insPremText);
    y += 4;

    // ── 6. Commission ──
    addSectionHeading("Commission");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const insCommText = eocData?.commission || "Total Commission is {{Total Commission}} Split between {{Broker Company}} at {{Broker Split}} and {{Producing Broker}} {{Producing Broker Split}}.";
    renderInsEocText(insCommText);
    y += 4;

    // ── 7. Terms and Conditions ──
    addSectionHeading("Terms and Conditions");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const insTcText = eocData?.termsAndConditions || "Full terms and conditions of this placement are set out in the Binding Slip document, which should be read in conjunction with this letter. In the event of any inconsistency between this covering letter and the Binding Slip, the terms of the Binding Slip shall prevail.\n\nWe also draw your attention to:\n\n- Geographical exclusions - please review and ensure that these meet your requirements.\n- Premium Payment Clause noting that Underwriters have the right to issue 30 days' notice of cancellation if the premium is not paid by the due date.";
    renderInsEocText(insTcText);
    y += 4;

    // ── 8. Duty of Disclosure ──
    addSectionHeading("Duty of Disclosure");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const insDodText = eocData?.dutyOfDisclosure || "Under the terms of the Insurance Act 2015, you have a duty to make a fair presentation of the risk prior to inception, renewal or variation of your insurance. Failure to do so may allow the insurer to avoid the policy, reduce the amount payable on a claim or change the terms of the insurance. You must therefore ensure that all material information is disclosed to us prior to inception, renewal or variation of this policy.\n\nPlease do not hesitate to contact us should you have any queries regarding the above or require any further information.";
    renderInsEocText(insDodText);
    y += 4;

  }

  // ── Footer ──
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text("This document is issued as evidence of cover only and does not constitute the policy of insurance.", MARGIN_L, PAGE_H - 12);

  return doc;
}

// ─── Claims Document PDF ─────────────────────────────────────────

function generateClaimsDocumentPDF(
  placement: Placement,
  lineslip: Lineslip | undefined,
  logoDataUrl?: string,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const d = placement.draftData || {};
  const quote = placement.quotes?.[placement.quotes.length - 1];
  const isReinsurance = d.placementType === "reinsurance";

  const productNames: Record<string, string> = {
    HL: "Hull & Liability", HW: "Hull War", PA: "Personal Accident",
    LOL: "Loss of Licence", HD: "Hull Deductible", UAS: "Drone Insurance",
  };

  const pCode = d.productCode || placement.productCode || "";
  const productName = productNames[pCode] || pCode;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "TBA";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit", month: "long", year: "numeric",
      });
    } catch { return dateStr; }
  };

  const claimsData = lineslip?.claimsDocData;
  const insuredName = placement.insuredName || d.insuredName || "TBD";
  const reference = placement.reference || "DRAFT";
  const facilityRef = placement.facilityRef || "";
  const inceptionDate = formatDate(d.inceptionDate || placement.inceptionDate);
  const expiryDate = formatDate(d.expiryDate);
  const brokerCompany = placement.brokerCompany || "Your Broker";
  const brokerName = placement.submittedByName || placement.brokerName || "";
  const brokerEmail = placement.submittedBy || "";
  const boundByName = placement.boundByName || quote?.underwriterName || "TBD";
  const boundByCompany = placement.boundByCompany || quote?.underwriterCompany || "";
  const leadUnderwriter = lineslip?.underwriters?.find(u => u.role === "Lead");
  const notifDays = claimsData?.notificationPeriodDays || 7;

  let y = MARGIN_TOP;

  // ── Logo ──
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", MARGIN_L, y, 42, 12);
    } catch {}
  }
  y += 18;

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text("CLAIMS NOTIFICATION PROCEDURES", MARGIN_L, y);
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(...MID_GRAY);
  doc.text(`Aviation ${productName} ${isReinsurance ? "Reinsurance" : "Insurance"}`, MARGIN_L, y);
  y += 10;

  // ── Horizontal rule ──
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 8;

  // ── Reference block ──
  const refData: [string, string][] = [
    [isReinsurance ? "Reinsured:" : "Insured:", insuredName],
    ["Unique Market Reference:", reference],
    ...(facilityRef ? [["Facility Reference:", facilityRef] as [string, string]] : []),
    ["Policy Period:", `${inceptionDate} to ${expiryDate}`],
    ["Product:", `Aviation ${productName}`],
    ["Lead Underwriter:", leadUnderwriter ? `${leadUnderwriter.name} (${leadUnderwriter.percentage.toFixed(2)}%)` : (boundByName + (boundByCompany ? ` — ${boundByCompany}` : ""))],
  ];

  const labelW = 50;
  const valX = MARGIN_L + labelW + 4;

  for (const [label, value] of refData) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MID_GRAY);
    doc.text(sanitizeForPdf(label), MARGIN_L, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const valLines = doc.splitTextToSize(sanitizeForPdf(value), FULL_W - labelW - 4);
    doc.text(valLines, valX, y);
    y += Math.max(valLines.length, 1) * LINE_H + 2;
  }
  y += 6;

  // ── Section helper ──
  const addSection = (title: string, body: string) => {
    if (y > PAGE_H - MARGIN_BOTTOM - 20) { doc.addPage(); y = MARGIN_TOP; }
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 66, 37); // #004225
    doc.text(sanitizeForPdf(title), MARGIN_L, y);
    y += LINE_H + 3;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);
    const lines = doc.splitTextToSize(sanitizeForPdf(body), FULL_W);
    for (const line of lines) {
      if (y > PAGE_H - MARGIN_BOTTOM - 8) { doc.addPage(); y = MARGIN_TOP; }
      doc.text(line, MARGIN_L, y);
      y += LINE_H;
    }
    y += 4;
  };

  // ── Section 1: Immediate Actions ──
  addSection("1. Immediate Actions Following an Incident",
    `In the event of any incident, occurrence, or circumstance which may give rise to a claim under this policy, the ${isReinsurance ? "Reinsured" : "Insured"} must:\n\n` +
    `a) Take all reasonable steps to minimise the loss or damage.\n\n` +
    `b) Preserve any damaged property and evidence for inspection.\n\n` +
    `c) Not admit liability or make any offer of settlement without the prior written consent of the Lead Underwriter.\n\n` +
    `d) Report the incident to the relevant aviation authority as required by law.\n\n` +
    `e) Ensure the aircraft and scene are secured, where safe to do so.`
  );

  // ── Section 2: Notification Requirements ──
  addSection("2. Claims Notification Requirements",
    `All claims and circumstances which may give rise to a claim must be notified in writing as soon as reasonably practicable and in any event within ${notifDays === 7 ? "seven (7)" : `${notifDays}`} day${notifDays !== 1 ? "s" : ""} of the ${isReinsurance ? "Reinsured" : "Insured"} becoming aware of such incident.\n\n` +
    `Notification must include the following information where available:\n\n` +
    `a) Policy reference number: ${reference}\n\n` +
    `b) Date, time, and location of the incident.\n\n` +
    `c) Aircraft registration and type involved.\n\n` +
    `d) A full description of the incident and circumstances.\n\n` +
    `e) Details of any injuries sustained or third-party damage.\n\n` +
    `f) Estimated value of the claim.\n\n` +
    `g) Details of any other insurance which may cover the loss.\n\n` +
    `h) Copies of any relevant correspondence, reports, or witness statements.`
  );

  // ── Section 3: Who to Contact ──
  const claimsContactDisplayName = claimsData?.claimsContactName || brokerName;
  const claimsContactDisplayEmail = claimsData?.claimsContactEmail || brokerEmail;
  const claimsContactDisplayPhone = claimsData?.claimsContactPhone || "";
  const claimsContactDisplayCompany = claimsData?.claimsHandlerCompany || brokerCompany;

  const contactBlock =
    `All claims notifications should be directed to your placing broker in the first instance:\n\n` +
    `Claims Contact: ${claimsContactDisplayName}` +
    `${claimsContactDisplayCompany ? `\nCompany: ${claimsContactDisplayCompany}` : ""}` +
    `${claimsContactDisplayEmail ? `\nEmail: ${claimsContactDisplayEmail}` : ""}` +
    `${claimsContactDisplayPhone ? `\nPhone: ${claimsContactDisplayPhone}` : ""}` +
    `\n\nYour broker will liaise with the Lead Underwriter and claims adjusters on your behalf. ` +
    `The Lead Underwriter shall have authority to agree claims on behalf of all subscribing underwriters in accordance with the terms of the slip.\n\n` +
    `Lead Underwriter: ${leadUnderwriter ? leadUnderwriter.name : (boundByName + (boundByCompany ? ` — ${boundByCompany}` : ""))}`;

  addSection("3. Claims Contact Information", contactBlock);

  // ── Section 4: Claims Handling Process ──
  addSection("4. Claims Handling Process",
    `Upon receipt of a valid claims notification, the following process will apply:\n\n` +
    `a) The Lead Underwriter will acknowledge receipt of the notification and may appoint a claims adjuster or surveyor to inspect the loss.\n\n` +
    `b) The ${isReinsurance ? "Reinsured" : "Insured"} must co-operate fully with any surveyor, adjuster, or investigator appointed and provide access to the aircraft, records, and personnel as reasonably required.\n\n` +
    `c) No repair or disposal of damaged property should be undertaken without prior agreement from the Lead Underwriter, except where emergency repairs are necessary for safety reasons.\n\n` +
    `d) Settlement of agreed claims will be made in accordance with the terms and conditions of the policy and the several liability of the subscribing underwriters.`
  );

  // ── Section 5 (optional): Additional Procedures ──
  if (claimsData?.additionalProcedures) {
    addSection("5. Additional Procedures", claimsData.additionalProcedures);
  }

  // ── Section 5/6: Important Notices ──
  const noticesNum = claimsData?.additionalProcedures ? "6" : "5";
  addSection(`${noticesNum}. Important Notices`,
    `a) Failure to notify a claim or circumstance within the required time period may prejudice your rights under this policy.\n\n` +
    `b) The subscribing underwriters' obligations are several and not joint. Each underwriter is liable only for its proportion of any agreed claim.\n\n` +
    `c) This document should be read in conjunction with the Binding Slip and Evidence of Cover letter, which together constitute the full terms and conditions of your policy.\n\n` +
    `d) Please retain this document for your records and ensure that all relevant personnel within your organisation are made aware of these procedures.`
  );

  // ── Footer ──
  if (y > PAGE_H - MARGIN_BOTTOM - 15) { doc.addPage(); y = MARGIN_TOP; }
  y += 6;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...LIGHT_GRAY);
  const footerText = "This document forms part of the contract of insurance and should be retained for your records.";
  doc.text(footerText, MARGIN_L, y);

  return doc;
}

// ─── Exported utility: generate a quotation slip PDF as base64 ────
// Used by the notification system to attach the quote slip to the Quoted email.

function resolveSlipSections(placement: Placement, lineslip: Lineslip | undefined): SlipWordingSection[] {
  const d = placement.draftData || {};
  const effectivePlacementType = (d.placementType as "insurance" | "reinsurance") || lineslip?.placementType || "reinsurance";
  const quote = placement.quotes?.[placement.quotes.length - 1];
  let sections: SlipWordingSection[] = [];
  let sectionsFromLineslip = false;

  const typeSpecificWordings = effectivePlacementType === "insurance"
    ? lineslip?.insuranceWordings
    : lineslip?.reinsuranceWordings;

  if (typeSpecificWordings && Array.isArray(typeSpecificWordings) && typeSpecificWordings.length > 0) {
    sections = [...typeSpecificWordings].sort((a, b) => a.order - b.order);
    sectionsFromLineslip = true;
  } else if (lineslip?.wordings && Array.isArray(lineslip.wordings) && lineslip.wordings.length > 0) {
    const first = lineslip.wordings[0];
    if (typeof first === "object" && "title" in first) {
      sections = (lineslip.wordings as SlipWordingSection[]).sort((a, b) => a.order - b.order);
      sectionsFromLineslip = true;
    }
  }

  if (sections.length === 0) {
    sections = getDefaultSlipSections(effectivePlacementType, placement.productCode);
  }

  // Strip legacy country exclusion block
  sections = sections.map(s => {
    if (s.title?.toLowerCase() === "situation" && s.content) {
      let cleaned = s.content;
      cleaned = cleaned.replace(/1\.\s*This Policy does not cover any claim arising in,.*?\(x\)\s*Zimbabwe\.\s*/s, "");
      cleaned = cleaned.replace(/However coverage granted for overflight of and technical stops in the territories listed above[^]*?provisioning of the Aircraft\.\s*/s, "");
      cleaned = cleaned.replace(/09\/07\/15\s*LSW617H\s*/g, "");
      cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
      if (cleaned !== s.content) return { ...s, content: cleaned };
    }
    return s;
  });

  // Migrate Claims Information placeholder
  sections = sections.map(s => {
    if (s.title?.toLowerCase() === "claims information" && s.content) {
      const patched = s.content.replace(
        /^(?:Hull\s*(?:&|and)?\s*(?:War|Liability)?|Personal\s*Accident|Loss\s*of\s*Licence|Hull\s*Deductible|Drone\s*Insurance)?\s*[Cc]laims\s+advised/,
        "{{product_name}} claims advised"
      );
      if (patched !== s.content) return { ...s, content: patched };
    }
    return s;
  });

  // Migrate {{hw_overall_aggregate}} → {{total_aircraft_values}}
  sections = sections.map(s => {
    if (s.content?.includes("{{hw_overall_aggregate}}")) {
      const titleLower = (s.title || "").toLowerCase();
      if (titleLower.includes("sums") || s.content.includes("Total Overall Policy Annual Aggregate Limit")) {
        return { ...s, content: s.content.replace(/\{\{hw_overall_aggregate\}\}/g, "{{total_aircraft_values}}") };
      }
    }
    return s;
  });

  // HW product-code-aware transformations
  const pCode = placement.productCode || "";
  if (pCode === "HW") {
    const isReins = effectivePlacementType === "reinsurance";
    if (!isReins) {
      sections = sections.filter(s => (s.title || "").toLowerCase() !== "insurance conditions");
    }
    sections = sections.map(s => {
      const titleLower = (s.title || "").toLowerCase();
      if (titleLower === "interests" && s.content && !sectionsFromLineslip) {
        const wrapper = isReins ? "To indemnify the {{insured_or_reinsured}} in respect of a Policy or Policies issued by them to the Insured in respect of:\n\n" : "";
        return { ...s, content: `${wrapper}Hull and Spares:\n\n  Accidental loss of or damage to the Aircraft (including engines and parts) and Spares as per the Schedule of Aircraft, caused by or arising from the risks of war and associated perils.` };
      }
      if ((titleLower === "sums insured" || titleLower === "sums reinsured") && s.content && !sectionsFromLineslip) {
        return { ...s, content: `Hull and Spares:\n  Agreed Values as per the Schedule of Aircraft subject to a maximum Agreed Value of the following any one Aircraft:\n\n    Fixed Wing: {{max_agreed_value_fixed_wing}}\n    Rotary Wing: {{max_agreed_value_rotary_wing}}\n\n  Spares:\n  {{spares_limit_text}}\n\nTotal Overall Policy Annual Aggregate Limit:\n  {{total_aircraft_values}}\n\nIn addition the maximum Agreed Value any one Aircraft shall not exceed {{hw_max_agreed_value}} any one Aircraft.` };
      }
      if (titleLower === "conditions" && s.content) {
        let c = s.content;
        c = c.replace(/^Original Insurance per:\s*\n\n?(?:Section One:\s*)?/i, "");
        c = c.replace(/\nSection Two:\s*Except as amended herein\s*/i, "");
        [/Passenger Extension Clause\s*\n?/g, /Babes In Arms Clause\s*\n?/g, /Personal Injury Extension — AVN60A\s*\n?/g,
         /Liability to Pilots and Crew Clause — AVN73\s*\n?/g, /Pilot Indemnity Clause — AVN74\s*\n?/g,
         /Coverage 1\(b\) of Section III of AVN1C amended to include coverage for liability arising out of the ownership, maintenance, operation or use of the Aircraft\.\s*\n?\n?/g,
        ].forEach(re => { c = c.replace(re, ""); });
        const rawConf = quote?.confiscationIncluded;
        const confIncluded = rawConf === true || rawConf === "true";
        c = c.replace(
          /(Including|Excluding)(\s+confiscation,\s*nationalisation,\s*seizure,\s*restraint,\s*detention,\s*appropriation,\s*requisition[\s\S]*?exclusion\s*\(b\)\s*of\s*LSW555D\s*deleted)/gi,
          `${confIncluded ? "Including" : "Excluding"}$2`
        );
        c = c.replace(/\n{3,}/g, "\n\n").trim();
        return { ...s, content: c };
      }
      return s;
    });
  } else {
    sections = sections.map(s => {
      const titleLower = (s.title || "").toLowerCase();
      if ((titleLower === "sums insured" || titleLower === "sums reinsured") && s.content?.includes("In addition")) {
        return { ...s, content: s.content.replace(/\n\nIn addition the maximum Agreed Value any one Aircraft shall not exceed \{\{hw_max_agreed_value\}\} any one Aircraft\.?/g, "") };
      }
      return s;
    });
  }

  // Backfill empty conditions sections
  const defaultSections = getDefaultSlipSections(effectivePlacementType, placement.productCode);
  sections = sections.map(s => {
    const titleLower = (s.title || "").toLowerCase();
    if ((titleLower === "reinsurance conditions" || titleLower === "insurance conditions" || titleLower === "conditions") && (!s.content || !s.content.trim())) {
      const defaultMatch = defaultSections.find(ds => ds.title.toLowerCase() === titleLower);
      if (defaultMatch) return { ...s, content: defaultMatch.content };
    }
    return s;
  });

  // Migrate legacy Security Details
  const hasNewSections = sections.some(s => s.title?.toLowerCase() === "several liability notice insurance");
  const oldSecDetails = sections.find(s => s.title?.toLowerCase() === "security details");
  if (oldSecDetails && !hasNewSections) {
    const orderMatch = oldSecDetails.content.match(/ORDER HEREON:\s*([\s\S]*)/i);
    const orderContent = orderMatch ? orderMatch[1].trim() : "{{order_hereon_text}}";
    const liabilityContent = oldSecDetails.content.replace(/ORDER HEREON:\s*[\s\S]*/i, "").trim()
      .replace(/^SEVERAL LIABILITY NOTICE\s*[-—]+\s*LSW\s*1001\s*:\s*/i, "").trim();
    const severalLiabilityText = liabilityContent || "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001";
    sections = sections.filter(s => s.title?.toLowerCase() !== "security details");
    const baseOrder = oldSecDetails.order;
    sections.push({ id: "sec-22", title: "Several Liability Notice Insurance", content: severalLiabilityText, type: "fixed" as const, order: baseOrder });
    sections.push({ id: "sec-23", title: "Order Hereon", content: orderContent, type: "variable" as const, order: baseOrder + 1 });
    sections = sections.map(s => s.title?.toLowerCase() === "claims information" ? { ...s, order: baseOrder + 2 } : s);
    sections.sort((a, b) => a.order - b.order);
  }

  return sections;
}

export function generateQuoteSlipBase64(placement: Placement, lineslip: Lineslip | undefined): string | null {
  try {
    const quote = placement.quotes?.[placement.quotes.length - 1];
    let effectivePlacement: Placement;

    if (quote?.placementSnapshot) {
      const snap = quote.placementSnapshot;
      effectivePlacement = {
        ...placement,
        status: "quoted" as const,
        insuredName: snap.insuredName,
        productCode: snap.productCode,
        brokerName: snap.brokerName,
        brokerCompany: snap.brokerCompany,
        reference: snap.reference,
        facilityRef: snap.facilityRef || placement.facilityRef,
        inceptionDate: snap.inceptionDate || placement.inceptionDate,
        draftData: { ...snap.draftData },
      };
    } else {
      const snapshotDraftData = { ...placement.draftData };
      if (quote?.originalInceptionDate) snapshotDraftData.inceptionDate = quote.originalInceptionDate;
      if (quote?.originalExpiryDate) snapshotDraftData.expiryDate = quote.originalExpiryDate;
      effectivePlacement = { ...placement, status: "quoted" as const, draftData: snapshotDraftData };
    }

    const sections = resolveSlipSections(effectivePlacement, lineslip);
    const doc = generateSlipPDF(sections, effectivePlacement, lineslip, "quotation");
    // Return raw base64 (strip the data URI prefix)
    return doc.output("datauristring").split(",")[1];
  } catch (err) {
    console.error("[generateQuoteSlipBase64] Failed to generate quote slip PDF:", err);
    return null;
  }
}

export function generateBindingSlipBase64(placement: Placement, lineslip: Lineslip | undefined): string | null {
  try {
    const sections = resolveSlipSections(placement, lineslip);
    const doc = generateSlipPDF(sections, placement, lineslip, "firmorder");
    return doc.output("datauristring").split(",")[1];
  } catch (err) {
    console.error("[generateBindingSlipBase64] Failed to generate binding slip PDF:", err);
    return null;
  }
}

export function generateEOCBase64(placement: Placement, lineslip: Lineslip | undefined, currentUser?: any): string | null {
  try {
    const doc = generateEOCCoveringLetterPDF(placement, lineslip, undefined, currentUser);
    return doc.output("datauristring").split(",")[1];
  } catch (err) {
    console.error("[generateEOCBase64] Failed to generate EOC covering letter PDF:", err);
    return null;
  }
}

export function generateClaimsBase64(placement: Placement, lineslip: Lineslip | undefined): string | null {
  try {
    const doc = generateClaimsDocumentPDF(placement, lineslip);
    return doc.output("datauristring").split(",")[1];
  } catch (err) {
    console.error("[generateClaimsBase64] Failed to generate claims document PDF:", err);
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────

export function SlipDocumentViewer({ placement, lineslip, documentType, embedded, currentUser }: SlipDocumentViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoDataUrlRef = useRef<string | undefined>(undefined);

  // ── Freeze placement snapshot for quotation PDFs ──
  // When documentType is "quotation", the PDF must reflect the placement as it was
  // at quote time — permanently immutable. If the quote carries a placementSnapshot
  // (captured at quote submission), we reconstruct the placement entirely from that
  // snapshot. Legacy quotes without a snapshot fall back to freeze-status approach.
  const effectivePlacement = useMemo(() => {
    if (documentType !== "quotation") return placement;
    const quote = placement.quotes?.[placement.quotes.length - 1];

    // ── New path: use the immutable snapshot stored on the quote ──
    if (quote?.placementSnapshot) {
      const snap = quote.placementSnapshot;
      return {
        ...placement,
        status: "quoted" as const,
        insuredName: snap.insuredName,
        productCode: snap.productCode,
        brokerName: snap.brokerName,
        brokerCompany: snap.brokerCompany,
        reference: snap.reference,
        facilityRef: snap.facilityRef || placement.facilityRef,
        inceptionDate: snap.inceptionDate || placement.inceptionDate,
        draftData: { ...snap.draftData },
      };
    }

    // ── Legacy fallback: no snapshot stored — freeze status and restore dates ──
    const snapshotDraftData = { ...placement.draftData };
    if (quote?.originalInceptionDate) {
      snapshotDraftData.inceptionDate = quote.originalInceptionDate;
    }
    if (quote?.originalExpiryDate) {
      snapshotDraftData.expiryDate = quote.originalExpiryDate;
    }
    return {
      ...placement,
      status: "quoted" as const,
      draftData: snapshotDraftData,
    };
  }, [placement, documentType]);

  // Preload Lockton logo as data URL for PDF embedding
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          logoDataUrlRef.current = canvas.toDataURL("image/png");
        }
      } catch (e) {
        console.warn("Failed to preload logo for PDF:", e);
      }
    };
    img.src = locktonLogo;
  }, []);

  const isQuotation = documentType === "quotation";

  // Build document date string
  const quote = placement.quotes?.[placement.quotes.length - 1];
  const docDateStr = quote
    ? new Date(quote.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase().replace(/ /g, "")
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase().replace(/ /g, "");

  // Sanitise insured name for file/display (replace spaces with hyphens, strip special chars)
  const sanitisedInsured = (placement.insuredName || "Insured").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-");

  const umrForFile = placement.reference || "DRAFT";
  const title = (() => {
    switch (documentType) {
      case "quotation": return `Quote-${umrForFile}-${sanitisedInsured}`;
      case "eoc_covering_letter": return `EOC-CoveringLetter-${umrForFile}-${sanitisedInsured}`;
      case "claims_document": return `ClaimsNotification-${umrForFile}-${sanitisedInsured}`;
      default: return `FirmOrder-${umrForFile}-${sanitisedInsured}`;
    }
  })();
  const subtitle = (() => {
    switch (documentType) {
      case "quotation": return "Auto-generated from submission and underwriter quote";
      case "eoc_covering_letter": return "Evidence of Cover covering letter";
      case "claims_document": return "Claims notification procedures";
      default: return "Final binding contract document";
    }
  })();
  const fileName = `${title}.pdf`;

  // Get slip sections from lineslip wordings
  // Pick the correct wordings set based on the placement's type
  const effectivePlacementType = (effectivePlacement.draftData?.placementType as "insurance" | "reinsurance") || lineslip?.placementType || "reinsurance";
  let sections: SlipWordingSection[] = [];
  let sectionsFromLineslip = false;

  // First try type-specific wordings stored on the lineslip
  const typeSpecificWordings = effectivePlacementType === "insurance"
    ? lineslip?.insuranceWordings
    : lineslip?.reinsuranceWordings;

  if (typeSpecificWordings && Array.isArray(typeSpecificWordings) && typeSpecificWordings.length > 0) {
    sections = [...typeSpecificWordings].sort((a, b) => a.order - b.order);
    sectionsFromLineslip = true;
  }
  // Fall back to legacy `wordings` field
  else if (lineslip?.wordings && Array.isArray(lineslip.wordings) && lineslip.wordings.length > 0) {
    const first = lineslip.wordings[0];
    if (typeof first === "object" && "title" in first) {
      sections = (lineslip.wordings as SlipWordingSection[]).sort((a, b) => a.order - b.order);
      sectionsFromLineslip = true;
    }
  }

  // Fallback if no structured wordings
  if (sections.length === 0) {
    sections = getDefaultSlipSections(effectivePlacementType, effectivePlacement.productCode);
  }

  // Strip legacy LSW617H country exclusion block from saved Situation sections
  sections = sections.map(s => {
    if (s.title?.toLowerCase() === "situation" && s.content) {
      // Remove the old "1. This Policy does not cover..." paragraph, the overflight paragraph, and "09/07/15 LSW617H"
      let cleaned = s.content;
      // Remove "1. This Policy does not cover any claim arising in, or over, or in connection with an event in:\n(a) Afghanistan; ... (x) Zimbabwe."
      cleaned = cleaned.replace(/1\.\s*This Policy does not cover any claim arising in,.*?\(x\)\s*Zimbabwe\.\s*/s, "");
      // Remove "However coverage granted for overflight of and technical stops in the territories listed above..."
      cleaned = cleaned.replace(/However coverage granted for overflight of and technical stops in the territories listed above[^]*?provisioning of the Aircraft\.\s*/s, "");
      // Remove "09/07/15 LSW617H"
      cleaned = cleaned.replace(/09\/07\/15\s*LSW617H\s*/g, "");
      // Clean up excessive newlines left behind
      cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
      if (cleaned !== s.content) {
        return { ...s, content: cleaned };
      }
    }
    return s;
  });

  // Migrate saved Claims Information sections to use {{product_name}} placeholder
  sections = sections.map(s => {
    if (s.title?.toLowerCase() === "claims information" && s.content) {
      // Replace any hardcoded product name before "claims advised" with the placeholder
      // Matches patterns like "Hull War claims advised", "Hull & Liability claims advised", or just "Claims advised"
      const patched = s.content.replace(
        /^(?:Hull\s*(?:&|and)?\s*(?:War|Liability)?|Personal\s*Accident|Loss\s*of\s*Licence|Hull\s*Deductible|Drone\s*Insurance)?\s*[Cc]laims\s+advised/,
        "{{product_name}} claims advised"
      );
      if (patched !== s.content) {
        return { ...s, content: patched };
      }
    }
    return s;
  });

  // Migrate: replace ALL {{hw_overall_aggregate}} with {{total_aircraft_values}} in Sums sections
  sections = sections.map(s => {
    if (s.content?.includes("{{hw_overall_aggregate}}")) {
      const titleLower = (s.title || "").toLowerCase();
      if (titleLower.includes("sums") || s.content.includes("Total Overall Policy Annual Aggregate Limit")) {
        return { ...s, content: s.content.replace(/\{\{hw_overall_aggregate\}\}/g, "{{total_aircraft_values}}") };
      }
    }
    return s;
  });

  // ── HW product-code-aware section transformations ──
  // For Hull War placements the slip structure differs materially from HL:
  //   • Interests — war perils language, no Aircraft Liability, no Section One/Two split
  //   • Sums Insured/Reinsured — same flattened structure + "In addition" paragraph
  //   • Conditions — strip HL-only clauses (Passenger Extension, Liability to Crew, PPH etc.)
  //   • "Original Insurance per:" wrapper removed (insurance HW)
  // For both insurance and reinsurance HW the content should be identical except for the
  // Insurer/Reinsurer terminology (which is already correct per-template).
  const pCode = effectivePlacement.productCode || "";
  if (pCode === "HW") {
    const isReins = effectivePlacementType === "reinsurance";
    // For HW insurance, remove the "Insurance Conditions" section entirely (sec-10)
    if (!isReins) {
      sections = sections.filter(s => (s.title || "").toLowerCase() !== "insurance conditions");
    }
    sections = sections.map(s => {
      const titleLower = (s.title || "").toLowerCase();

      // ── Interests (sec-6) — only override with HW defaults when NOT using lineslip-customised wordings ──
      if (titleLower === "interests" && s.content && !sectionsFromLineslip) {
        const wrapper = isReins
          ? "To indemnify the {{insured_or_reinsured}} in respect of a Policy or Policies issued by them to the Insured in respect of:\n\n"
          : "";
        return { ...s, content: `${wrapper}Hull and Spares:\n\n  Accidental loss of or damage to the Aircraft (including engines and parts) and Spares as per the Schedule of Aircraft, caused by or arising from the risks of war and associated perils.` };
      }

      // ── Sums Insured / Sums Reinsured (sec-7) — only override with HW defaults when NOT using lineslip-customised wordings ──
      if ((titleLower === "sums insured" || titleLower === "sums reinsured") && s.content && !sectionsFromLineslip) {
        const hwSums = `Hull and Spares:\n  Agreed Values as per the Schedule of Aircraft subject to a maximum Agreed Value of the following any one Aircraft:\n\n    Fixed Wing: {{max_agreed_value_fixed_wing}}\n    Rotary Wing: {{max_agreed_value_rotary_wing}}\n\n  Spares:\n  {{spares_limit_text}}\n\nTotal Overall Policy Annual Aggregate Limit:\n  {{total_aircraft_values}}\n\nIn addition the maximum Agreed Value any one Aircraft shall not exceed {{hw_max_agreed_value}} any one Aircraft.`;
        return { ...s, content: hwSums };
      }

      // ── Conditions (sec-11) — strip HL-only clauses for HW ──
      if (titleLower === "conditions" && s.content) {
        let c = s.content;
        // Remove "Original Insurance per:" wrapper and its Section One / Section Two lines (reinsurance template artefact on insurance HW)
        c = c.replace(/^Original Insurance per:\s*\n\n?(?:Section One:\s*)?/i, "");
        c = c.replace(/\nSection Two:\s*Except as amended herein\s*/i, "");
        // Strip HL-only clauses that don't apply to HW
        const hlOnlyClauses = [
          /Passenger Extension Clause\s*\n?/g,
          /Babes In Arms Clause\s*\n?/g,
          /Personal Injury Extension — AVN60A\s*\n?/g,
          /Liability to Pilots and Crew Clause — AVN73\s*\n?/g,
          /Pilot Indemnity Clause — AVN74\s*\n?/g,
          /Coverage 1\(b\) of Section III of AVN1C amended to include coverage for liability arising out of the ownership, maintenance, operation or use of the Aircraft\.\s*\n?\n?/g,
        ];
        for (const re of hlOnlyClauses) {
          c = c.replace(re, "");
        }
        // ── Replace hardcoded confiscation text with quote-aware version ──
        // If the lineslip editor saved literal "Including/Excluding confiscation..." text
        // instead of {{confiscation_text}}, replace it with the correct verb from the quote.
        const rawConf = quote?.confiscationIncluded;
        const confIncluded = rawConf === true || rawConf === "true";
        const correctVerb = confIncluded ? "Including" : "Excluding";
        c = c.replace(
          /(Including|Excluding)(\s+confiscation,\s*nationalisation,\s*seizure,\s*restraint,\s*detention,\s*appropriation,\s*requisition[\s\S]*?exclusion\s*\(b\)\s*of\s*LSW555D\s*deleted)/gi,
          `${correctVerb}$2`
        );
        // Clean up excessive blank lines left behind
        c = c.replace(/\n{3,}/g, "\n\n").trim();
        return { ...s, content: c };
      }

      return s;
    });
  } else {
    // Non-HW: strip the "In addition" paragraph from Sums Insured/Reinsured (it's HW-only)
    sections = sections.map(s => {
      const titleLower = (s.title || "").toLowerCase();
      if ((titleLower === "sums insured" || titleLower === "sums reinsured") && s.content?.includes("In addition")) {
        const cleaned = s.content.replace(/\n\nIn addition the maximum Agreed Value any one Aircraft shall not exceed \{\{hw_max_agreed_value\}\} any one Aircraft\.?/g, "");
        return { ...s, content: cleaned };
      }
      return s;
    });
  }

  // Backfill empty Reinsurance Conditions / Insurance Conditions sections with default template content
  const defaultSections = getDefaultSlipSections(effectivePlacementType, effectivePlacement.productCode);
  sections = sections.map(s => {
    const titleLower = (s.title || "").toLowerCase();
    if ((titleLower === "reinsurance conditions" || titleLower === "insurance conditions" || titleLower === "conditions") && (!s.content || !s.content.trim())) {
      const defaultMatch = defaultSections.find(ds => ds.title.toLowerCase() === titleLower);
      if (defaultMatch) {
        return { ...s, content: defaultMatch.content };
      }
    }
    return s;
  });

  // Migrate legacy "Security Details" section into split sections
  const hasNewSections = sections.some(s => s.title?.toLowerCase() === "several liability notice insurance");
  const oldSecDetails = sections.find(s => s.title?.toLowerCase() === "security details");
  if (oldSecDetails && !hasNewSections) {
    // Extract ORDER HEREON content from the old combined section
    const orderMatch = oldSecDetails.content.match(/ORDER HEREON:\s*([\s\S]*)/i);
    const orderContent = orderMatch ? orderMatch[1].trim() : "{{order_hereon_text}}";
    // Everything before ORDER HEREON is the several liability text
    const liabilityContent = oldSecDetails.content.replace(/ORDER HEREON:\s*[\s\S]*/i, "").trim()
      // Normalise old header text variations
      .replace(/^SEVERAL LIABILITY NOTICE\s*[-—]+\s*LSW\s*1001\s*:\s*/i, "")
      .trim();
    const severalLiabilityText = liabilityContent || "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001";
    // Replace the old section with two new ones, followed by Claims Information
    sections = sections.filter(s => s.title?.toLowerCase() !== "security details");
    const baseOrder = oldSecDetails.order;
    sections.push({
      id: "sec-22",
      title: "Several Liability Notice Insurance",
      content: severalLiabilityText,
      type: "fixed" as const,
      order: baseOrder,
    });
    sections.push({
      id: "sec-23",
      title: "Order Hereon",
      content: orderContent,
      type: "variable" as const,
      order: baseOrder + 1,
    });
    // Move Claims Information after Order Hereon
    sections = sections.map(s => {
      if (s.title?.toLowerCase() === "claims information") {
        return { ...s, order: baseOrder + 2 };
      }
      return s;
    });
    sections.sort((a, b) => a.order - b.order);
  }

  const generatePdf = useCallback(() => {
    setIsGenerating(true);
    setError(null);
    try {
      let doc: jsPDF;
      if (documentType === "eoc_covering_letter") {
        doc = generateEOCCoveringLetterPDF(effectivePlacement, lineslip, logoDataUrlRef.current, currentUser);
      } else if (documentType === "claims_document") {
        doc = generateClaimsDocumentPDF(effectivePlacement, lineslip, logoDataUrlRef.current);
      } else {
        doc = generateSlipPDF(sections, effectivePlacement, lineslip, documentType, logoDataUrlRef.current);
      }
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      // Revoke previous URL
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      setShowPreview(true);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      setError(err?.message || "Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  }, [sections, effectivePlacement, lineslip, documentType]);

  // Invalidate cached PDF when the effective placement data or lineslip config changes
  // (e.g. status transitions, or editing EOC/Claims doc settings on the lineslip).
  // For quotation PDFs, NEVER invalidate — the quote PDF is immutable once generated.
  useEffect(() => {
    if (documentType === "quotation") return; // Quote PDF is frozen forever
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setShowPreview(false);
    }
  }, [effectivePlacement, lineslip, documentType]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleDownload = () => {
    if (!pdfUrl) {
      // Generate if not yet generated
      try {
        let doc: jsPDF;
        if (documentType === "eoc_covering_letter") {
          doc = generateEOCCoveringLetterPDF(effectivePlacement, lineslip, logoDataUrlRef.current, currentUser);
        } else if (documentType === "claims_document") {
          doc = generateClaimsDocumentPDF(effectivePlacement, lineslip, logoDataUrlRef.current);
        } else {
          doc = generateSlipPDF(sections, effectivePlacement, lineslip, documentType, logoDataUrlRef.current);
        }
        doc.save(fileName);
      } catch (err: any) {
        console.error("PDF download error:", err);
        setError(err?.message || "Failed to generate PDF");
      }
      return;
    }
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <div className={embedded ? "overflow-hidden" : "border border-gray-200 rounded-lg overflow-hidden"}>
      {/* Single-line document card */}
      <div className="px-4 py-3 flex items-center gap-3 bg-white hover:bg-gray-50/60 transition-colors">
        <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
          isQuotation ? "bg-blue-50"
          : documentType === "eoc_covering_letter" ? "bg-amber-50"
          : documentType === "claims_document" ? "bg-purple-50"
          : "bg-[#004225]/5"
        }`}>
          <FileText className={`size-3.5 ${
            isQuotation ? "text-blue-600"
            : documentType === "eoc_covering_letter" ? "text-amber-600"
            : documentType === "claims_document" ? "text-purple-600"
            : "text-[#004225]"
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
            <span className="text-[10px] text-gray-400 shrink-0 hidden sm:inline">{subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (showPreview) {
                setShowPreview(false);
              } else if (pdfUrl && documentType === "quotation") {
                // Quote PDF is immutable — just re-show the cached version
                setShowPreview(true);
              } else {
                // Regenerate to ensure fresh data (firm order may have changed)
                generatePdf();
              }
            }}
            disabled={isGenerating}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showPreview
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
            }`}
          >
            {isGenerating ? (
              <Loader2 className="size-3 animate-spin" />
            ) : showPreview ? (
              <EyeOff className="size-3" />
            ) : (
              <Eye className="size-3" />
            )}
            {isGenerating ? "Generating..." : showPreview ? "Hide" : "Preview"}
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[#004225] hover:bg-[#003319] transition-colors disabled:opacity-50"
          >
            <Download className="size-3" />
            Download
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600 font-medium">Error: {error}</p>
        </div>
      )}

      {/* Inline PDF Preview */}
      {showPreview && pdfUrl && (
        <div className="border-t border-gray-200">
          <iframe
            src={pdfUrl}
            className="w-full bg-gray-100"
            style={{ height: "680px" }}
            title={`${title} — ${placement.reference}`}
          />
        </div>
      )}
    </div>
  );
}