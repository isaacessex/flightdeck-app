/**
 * Binder Builder
 *
 * Allows a broker to assemble a panel of binder markets that collectively
 * cover 100% order for a placement. Each binder's max line is derived from
 * its combinedLineLimit vs the placement's total exposure. Binders are
 * grouped by policy wording — only binders sharing the same wording can
 * stack. The broker selects binders, optionally adjusts their line, and
 * the composite rate is displayed live.
 */

import { useState, useMemo } from "react";
import { X, Check, AlertTriangle, Shield, Layers, TrendingDown, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Binder, Placement } from "../App";
import { calculateBinderQuote, isEligibleForAutoQuote } from "../utils/binderAutoQuote";

interface BinderBuilderProps {
  placement: Partial<Placement> & { draftData?: any; productCode?: string };
  binders: Binder[];
  productCode: string;
  onConfirm: (selections: BinderSelection[]) => void;
  onCancel: () => void;
}

export interface BinderSelection {
  binderId: string;
  binderName: string;
  binderRef: string;
  linePercent: number;
  premium: number;
  currency: string;
  rate: number; // effective rate on total exposure
  underwriterName: string;
  underwriterCompany: string;
}

/** Parse a comma-separated number string */
function parseAmt(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v.replace(/,/g, "")) || 0;
}

/**
 * Calculate fleet-level extras (spares + PPH) that apply to total exposure.
 * Spares: applies to both HL and HW.
 * PPH: applies to HL only.
 */
function calculateFleetExtras(draftData: any, productCode?: string): number {
  const spares = parseAmt(draftData?.aircraftSparesAmount);
  const pph = productCode !== "HW" ? parseAmt(draftData?.pphLimit) : 0;
  return spares + pph;
}

/**
 * Calculate total combined exposure from the fleet.
 * HL: hull values + liability limits + spares (if applicable) + PPH (if applicable).
 * HW: hull values + spares (if applicable).
 */
function calculateTotalExposure(draftData: any, productCode?: string): number {
  const fleet: any[] = draftData?.fleet || [];
  const isHW = productCode === "HW";
  let total = 0;
  for (const ac of fleet) {
    total += parseAmt(ac.aircraftAgreedValue) + (isHW ? 0 : parseAmt(ac.liabilityLimit));
  }
  total += calculateFleetExtras(draftData, productCode);
  return total;
}

/** Calculate total hull value from fleet */
function calculateTotalHullValue(draftData: any): number {
  const fleet: any[] = draftData?.fleet || [];
  return fleet.reduce((sum: number, ac: any) => sum + parseAmt(ac.aircraftAgreedValue), 0);
}

/** Calculate total liability from fleet */
function calculateTotalLiability(draftData: any): number {
  const fleet: any[] = draftData?.fleet || [];
  return fleet.reduce((sum: number, ac: any) => sum + parseAmt(ac.liabilityLimit), 0);
}

/**
 * Apportion fleet-level extras (spares, PPH) to a wing type proportionally
 * by that wing type's share of total hull value.
 */
function apportionExtras(draftData: any, wingType: string, productCode?: string): number {
  const fleet: any[] = draftData?.fleet || [];
  const extras = calculateFleetExtras(draftData, productCode);
  if (extras <= 0) return 0;
  const totalHull = fleet.reduce((s: number, ac: any) => s + parseAmt(ac.aircraftAgreedValue), 0);
  if (totalHull <= 0) return 0;
  const wingHull = fleet
    .filter((ac: any) => ac.aircraftType === wingType)
    .reduce((s: number, ac: any) => s + parseAmt(ac.aircraftAgreedValue), 0);
  return extras * (wingHull / totalHull);
}

/** Calculate combined exposure for Fixed Wing aircraft only */
function calculateFWExposure(draftData: any, productCode?: string): number {
  const fleet: any[] = draftData?.fleet || [];
  const isHW = productCode === "HW";
  const fwPerAircraft = fleet
    .filter((ac: any) => ac.aircraftType === "fixed-wing")
    .reduce((sum: number, ac: any) => sum + parseAmt(ac.aircraftAgreedValue) + (isHW ? 0 : parseAmt(ac.liabilityLimit)), 0);
  return fwPerAircraft + apportionExtras(draftData, "fixed-wing", productCode);
}

/** Calculate combined exposure for Rotary Wing aircraft only */
function calculateRWExposure(draftData: any, productCode?: string): number {
  const fleet: any[] = draftData?.fleet || [];
  const isHW = productCode === "HW";
  const rwPerAircraft = fleet
    .filter((ac: any) => ac.aircraftType === "rotary-wing")
    .reduce((sum: number, ac: any) => sum + parseAmt(ac.aircraftAgreedValue) + (isHW ? 0 : parseAmt(ac.liabilityLimit)), 0);
  return rwPerAircraft + apportionExtras(draftData, "rotary-wing", productCode);
}

/**
 * Calculate max line % for a binder given FW/RW combined line limits.
 * The binding percentage is constrained by the most limiting wing type.
 */
function calculateMaxLinePercent(
  binder: Binder,
  fwExposure: number,
  rwExposure: number,
  totalExposure: number
): number {
  if (totalExposure <= 0) return 0;

  const limits: number[] = [];

  if (fwExposure > 0 && binder.combinedLineLimitFW && binder.combinedLineLimitFW > 0) {
    limits.push((binder.combinedLineLimitFW / fwExposure) * 100);
  } else if (fwExposure > 0) {
    // Binder has no FW limit but fleet has FW aircraft — can't participate
    return 0;
  }

  if (rwExposure > 0 && binder.combinedLineLimitRW && binder.combinedLineLimitRW > 0) {
    limits.push((binder.combinedLineLimitRW / rwExposure) * 100);
  } else if (rwExposure > 0) {
    // Binder has no RW limit but fleet has RW aircraft — can't participate
    return 0;
  }

  if (limits.length === 0) return 0;
  return Math.min(100, ...limits);
}

export function BinderBuilder({ placement, binders, productCode, onConfirm, onCancel }: BinderBuilderProps) {
  const draftData = placement.draftData || {};

  const totalExposure = useMemo(() => calculateTotalExposure(draftData, productCode), [draftData, productCode]);
  const totalHull = useMemo(() => calculateTotalHullValue(draftData), [draftData]);
  const totalLiab = useMemo(() => calculateTotalLiability(draftData), [draftData]);
  const fwExposure = useMemo(() => calculateFWExposure(draftData, productCode), [draftData, productCode]);
  const rwExposure = useMemo(() => calculateRWExposure(draftData, productCode), [draftData, productCode]);

  // Eligible binders for this product with combined line limits (FW and/or RW)
  const eligibleBinders = useMemo(() => {
    return binders
      .filter(b => b.productCode === productCode && b.status === "active")
      .filter(b => (b.combinedLineLimitFW && b.combinedLineLimitFW > 0) || (b.combinedLineLimitRW && b.combinedLineLimitRW > 0))
      .filter(b => {
        const { eligible } = isEligibleForAutoQuote(placement as any, b);
        return eligible;
      })
      .map(b => {
        const maxLinePercent = calculateMaxLinePercent(b, fwExposure, rwExposure, totalExposure);

        // Calculate full-line premium for rate comparison
        const fullQuote = calculateBinderQuote(placement as any, b);

        return {
          binder: b,
          maxLinePercent: Math.round(maxLinePercent * 100) / 100,
          fullPremium: fullQuote.quote.premium,
          currency: fullQuote.quote.currency,
          effectiveRate: totalExposure > 0
            ? (fullQuote.quote.premium / totalExposure) * 100
            : 0,
          underwriterName: fullQuote.quote.underwriterName,
          underwriterCompany: fullQuote.quote.underwriterCompany || "",
        };
      })
      .sort((a, b) => a.effectiveRate - b.effectiveRate); // Cheapest first
  }, [binders, productCode, placement, totalExposure, fwExposure, rwExposure]);

  // Group by policy wording
  const wordingGroups = useMemo(() => {
    const groups: Record<string, typeof eligibleBinders> = {};
    for (const eb of eligibleBinders) {
      const wording = eb.binder.policyWording || "No Wording Specified";
      if (!groups[wording]) groups[wording] = [];
      groups[wording].push(eb);
    }
    return groups;
  }, [eligibleBinders]);

  // Selections: { binderId -> linePercent }
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [expandedWording, setExpandedWording] = useState<string | null>(
    Object.keys(wordingGroups)[0] || null
  );

  const toggleBinder = (binderId: string, maxLine: number) => {
    setSelections(prev => {
      const next = { ...prev };
      if (next[binderId] !== undefined) {
        delete next[binderId];
      } else {
        next[binderId] = Math.min(maxLine, 100 - totalSelectedLine(prev));
      }
      return next;
    });
  };

  const updateLine = (binderId: string, value: number, maxLine: number) => {
    setSelections(prev => ({
      ...prev,
      [binderId]: Math.max(0, Math.min(value, maxLine)),
    }));
  };

  const totalSelectedLine = (sel?: Record<string, number>) => {
    const s = sel || selections;
    return Object.values(s).reduce((sum, v) => sum + v, 0);
  };

  const currentTotal = totalSelectedLine();
  const isComplete = Math.abs(currentTotal - 100) < 0.01;

  // Cheapest rate among all eligible
  const cheapestRate = eligibleBinders.length > 0 ? eligibleBinders[0].effectiveRate : 0;

  // Composite rate calculation (weighted by line share)
  const compositeRate = useMemo(() => {
    if (currentTotal <= 0) return 0;
    let weightedRate = 0;
    for (const [binderId, linePercent] of Object.entries(selections)) {
      const eb = eligibleBinders.find(e => e.binder.id === binderId);
      if (eb && linePercent > 0) {
        weightedRate += eb.effectiveRate * (linePercent / currentTotal);
      }
    }
    return weightedRate;
  }, [selections, eligibleBinders, currentTotal]);

  // Composite premium at selected lines
  const compositePremium = useMemo(() => {
    let total = 0;
    for (const [binderId, linePercent] of Object.entries(selections)) {
      const eb = eligibleBinders.find(e => e.binder.id === binderId);
      if (eb && linePercent > 0) {
        total += eb.fullPremium * (linePercent / 100);
      }
    }
    return Math.round(total * 100) / 100;
  }, [selections, eligibleBinders]);

  // Build the final selections array
  const handleConfirm = () => {
    const result: BinderSelection[] = [];
    for (const [binderId, linePercent] of Object.entries(selections)) {
      if (linePercent <= 0) continue;
      const eb = eligibleBinders.find(e => e.binder.id === binderId);
      if (!eb) continue;
      result.push({
        binderId: eb.binder.id,
        binderName: eb.binder.name,
        binderRef: eb.binder.reference,
        linePercent,
        premium: Math.round(eb.fullPremium * (linePercent / 100) * 100) / 100,
        currency: eb.currency,
        rate: eb.effectiveRate,
        underwriterName: eb.underwriterName,
        underwriterCompany: eb.underwriterCompany,
      });
    }
    onConfirm(result);
  };

  // Check if selected binders all share the same wording
  const selectedWordings = useMemo(() => {
    const wordings = new Set<string>();
    for (const binderId of Object.keys(selections)) {
      const eb = eligibleBinders.find(e => e.binder.id === binderId);
      if (eb) wordings.add(eb.binder.policyWording || "No Wording Specified");
    }
    return wordings;
  }, [selections, eligibleBinders]);

  const hasWordingConflict = selectedWordings.size > 1;

  const fmtCurrency = (amount: number, currency: string = "USD") =>
    `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Layers className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Binder Builder</h2>
              <p className="text-xs text-gray-500">Assemble a panel of binder markets to reach 100% order</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
            <X className="size-5" />
          </button>
        </div>

        {/* Exposure Summary Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-gray-500">Total Exposure:</span>{" "}
                <span className="font-bold text-gray-900">{fmtCurrency(totalExposure)}</span>
              </div>
              {fwExposure > 0 && (
                <>
                  <div className="h-4 w-px bg-gray-300" />
                  <div>
                    <span className="text-gray-500">FW:</span>{" "}
                    <span className="font-semibold text-gray-700">{fmtCurrency(fwExposure)}</span>
                  </div>
                </>
              )}
              {rwExposure > 0 && (
                <>
                  <div className="h-4 w-px bg-gray-300" />
                  <div>
                    <span className="text-gray-500">RW:</span>{" "}
                    <span className="font-semibold text-gray-700">{fmtCurrency(rwExposure)}</span>
                  </div>
                </>
              )}
              <div className="h-4 w-px bg-gray-300" />
              <div>
                <span className="text-gray-500">Hull:</span>{" "}
                <span className="font-semibold text-gray-700">{fmtCurrency(totalHull)}</span>
              </div>
              {productCode !== "HW" && (<>
              <div className="h-4 w-px bg-gray-300" />
              <div>
                <span className="text-gray-500">Liability:</span>{" "}
                <span className="font-semibold text-gray-700">{fmtCurrency(totalLiab)}</span>
              </div>
              </>)}
              {parseAmt(draftData?.aircraftSparesAmount) > 0 && (<>
              <div className="h-4 w-px bg-gray-300" />
              <div>
                <span className="text-gray-500">Spares:</span>{" "}
                <span className="font-semibold text-gray-700">{fmtCurrency(parseAmt(draftData?.aircraftSparesAmount))}</span>
              </div>
              </>)}
              {productCode !== "HW" && parseAmt(draftData?.pphLimit) > 0 && (<>
              <div className="h-4 w-px bg-gray-300" />
              <div>
                <span className="text-gray-500">PPH:</span>{" "}
                <span className="font-semibold text-gray-700">{fmtCurrency(parseAmt(draftData?.pphLimit))}</span>
              </div>
              </>)}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">Eligible Markets:</span>
              <span className="font-bold text-indigo-600">{eligibleBinders.length}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Order Progress</span>
            <span className={`text-sm font-bold ${isComplete ? "text-emerald-600" : currentTotal > 100 ? "text-red-600" : "text-gray-900"}`}>
              {currentTotal.toFixed(2)}% / 100%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete ? "bg-emerald-500" : currentTotal > 100 ? "bg-red-500" : "bg-indigo-500"
              }`}
              style={{ width: `${Math.min(currentTotal, 100)}%` }}
            />
          </div>
          {currentTotal > 0 && !isComplete && currentTotal < 100 && (
            <p className="text-xs text-gray-500 mt-1">
              Remaining: {(100 - currentTotal).toFixed(2)}% needed to complete the order
            </p>
          )}
          {currentTotal > 100 && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="size-3" /> Over-subscribed by {(currentTotal - 100).toFixed(2)}%
            </p>
          )}
          {isComplete && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <Check className="size-3" /> 100% order achieved
            </p>
          )}
        </div>

        {/* Composite Summary (shown when selections exist) */}
        {currentTotal > 0 && (
          <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-indigo-600 font-medium">Composite Rate:</span>{" "}
                  <span className="font-bold text-indigo-900">{compositeRate.toFixed(4)}%</span>
                </div>
                <div className="h-4 w-px bg-indigo-200" />
                <div>
                  <span className="text-indigo-600 font-medium">Composite Premium:</span>{" "}
                  <span className="font-bold text-indigo-900">{fmtCurrency(compositePremium)}</span>
                </div>
                <div className="h-4 w-px bg-indigo-200" />
                <div>
                  <span className="text-indigo-600 font-medium">Markets:</span>{" "}
                  <span className="font-bold text-indigo-900">{Object.keys(selections).filter(k => selections[k] > 0).length}</span>
                </div>
              </div>
              {hasWordingConflict && (
                <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="size-3.5" />
                  <span className="text-xs font-medium">Mixed wordings selected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content — Binder List by Wording Group */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {eligibleBinders.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="size-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No eligible binders found</p>
              <p className="text-xs text-gray-400 mt-1">
                Binders need a Combined Line Limit and matching product code to appear here.
              </p>
            </div>
          ) : (
            Object.entries(wordingGroups).map(([wording, binderList]) => (
              <div key={wording} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Wording Group Header */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => setExpandedWording(expandedWording === wording ? null : wording)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    <span className="text-sm font-semibold text-gray-900">{wording}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                      {binderList.length} market{binderList.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {expandedWording === wording ? (
                    <ChevronUp className="size-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="size-4 text-gray-400" />
                  )}
                </button>

                {expandedWording === wording && (
                  <div className="divide-y divide-gray-100">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-1"></div>
                      <div className="col-span-3">Market</div>
                      <div className="col-span-2 text-right">Max Line</div>
                      <div className="col-span-2 text-right">Rate</div>
                      <div className="col-span-2 text-right">Premium (100%)</div>
                      <div className="col-span-2 text-right">Your Line %</div>
                    </div>

                    {binderList.map((eb) => {
                      const isSelected = selections[eb.binder.id] !== undefined;
                      const isCheapest = Math.abs(eb.effectiveRate - cheapestRate) < 0.0001;
                      const currentLine = selections[eb.binder.id] || 0;
                      const linePremium = Math.round(eb.fullPremium * (currentLine / 100) * 100) / 100;

                      return (
                        <div
                          key={eb.binder.id}
                          className={`grid grid-cols-12 gap-3 px-4 py-3 items-center transition-colors ${
                            isSelected ? "bg-indigo-50/60" : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className="col-span-1">
                            <button
                              onClick={() => toggleBinder(eb.binder.id, eb.maxLinePercent)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600"
                                  : "border-gray-300 hover:border-indigo-400"
                              }`}
                            >
                              {isSelected && <Check className="size-3 text-white" />}
                            </button>
                          </div>

                          {/* Market Info */}
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">{eb.binder.name}</p>
                              {isCheapest && (
                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5">
                                  <TrendingDown className="size-2.5" /> Best Rate
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">{eb.binder.reference}</span>
                              <span className="text-[10px] text-gray-400">|</span>
                              <span className="text-xs text-gray-500">{eb.underwriterCompany || eb.underwriterName}</span>
                            </div>
                          </div>

                          {/* Max Line */}
                          <div className="col-span-2 text-right">
                            <span className="text-sm font-medium text-gray-900">{eb.maxLinePercent.toFixed(2)}%</span>
                            <p className="text-xs text-gray-400">
                              {eb.binder.combinedLineLimitFW && fwExposure > 0 ? `FW ${fmtCurrency(eb.binder.combinedLineLimitFW)}` : ""}
                              {eb.binder.combinedLineLimitFW && fwExposure > 0 && eb.binder.combinedLineLimitRW && rwExposure > 0 ? " / " : ""}
                              {eb.binder.combinedLineLimitRW && rwExposure > 0 ? `RW ${fmtCurrency(eb.binder.combinedLineLimitRW)}` : ""}
                            </p>
                          </div>

                          {/* Rate */}
                          <div className="col-span-2 text-right">
                            <span className={`text-sm font-medium ${isCheapest ? "text-emerald-700" : "text-gray-900"}`}>
                              {eb.effectiveRate.toFixed(4)}%
                            </span>
                          </div>

                          {/* Full Premium */}
                          <div className="col-span-2 text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {fmtCurrency(eb.fullPremium, eb.currency)}
                            </span>
                            {isSelected && currentLine > 0 && currentLine < 100 && (
                              <p className="text-xs text-indigo-600 font-medium">
                                {fmtCurrency(linePremium, eb.currency)} @ {currentLine.toFixed(2)}%
                              </p>
                            )}
                          </div>

                          {/* Line % Input */}
                          <div className="col-span-2 text-right">
                            {isSelected ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={eb.maxLinePercent}
                                  value={currentLine || ""}
                                  onChange={(e) => updateLine(eb.binder.id, parseFloat(e.target.value) || 0, eb.maxLinePercent)}
                                  className="w-20 text-right text-sm border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500 h-8"
                                />
                                <span className="text-xs text-gray-500">%</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Info Note */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <Info className="size-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 leading-relaxed">
              <strong>How it works:</strong> Each binder's maximum line is calculated as its Combined Line Limit
              divided by the placement's total exposure (hull values + liability limits + spares + PPH where applicable).
              Only binders sharing the same policy wording can be stacked together. The composite rate is the
              weighted average across all selected markets. All selected binders must total exactly 100% order to proceed.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-gray-600 hover:text-gray-800">
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {hasWordingConflict && (
              <span className="text-xs text-amber-700 flex items-center gap-1">
                <AlertTriangle className="size-3" /> Warning: mixed wordings
              </span>
            )}
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!isComplete || hasWordingConflict}
              className="bg-[#004225] hover:bg-[#003319] text-white font-medium px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isComplete ? (
                <>
                  <Check className="size-4 mr-2" />
                  Confirm Panel ({Object.keys(selections).filter(k => selections[k] > 0).length} markets)
                </>
              ) : (
                `Need ${(100 - currentTotal).toFixed(1)}% more`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}