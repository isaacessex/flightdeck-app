import { Placement } from "../App";
import { Button } from "./ui/button";
import { Send, Clock, XCircle, Plane, Shield, Users, Zap } from "lucide-react";
import { useState } from "react";

interface StandardQuoteFormProps {
  placement: Placement;
  currentUser?: any;
  isHullWar: boolean;
  isDrone: boolean;
  quoteHullRates: Record<string, string>;
  setQuoteHullRates: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  quoteLiabilityPremiums: Record<string, string>;
  setQuoteLiabilityPremiums: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  quoteSparesRate: string;
  setQuoteSparesRate: (v: string) => void;
  quoteSparesIncludedInHull: boolean;
  setQuoteSparesIncludedInHull: (v: boolean) => void;
  quotePphPremium: string;
  setQuotePphPremium: (v: string) => void;
  quoteConfiscationIncluded: boolean;
  setQuoteConfiscationIncluded: (v: boolean) => void;
  quoteEndorsements: string;
  quoteTerms: string;
  setPendingQuoteData: (data: any) => void;
  setShowQuoteConfirm: (v: boolean) => void;
  resetQuoteForm: () => void;
}

export function StandardQuoteForm({
  placement, currentUser, isHullWar, isDrone,
  quoteHullRates, setQuoteHullRates,
  quoteLiabilityPremiums, setQuoteLiabilityPremiums,
  quoteSparesRate, setQuoteSparesRate,
  quoteSparesIncludedInHull, setQuoteSparesIncludedInHull,
  quotePphPremium, setQuotePphPremium,
  quoteConfiscationIncluded, setQuoteConfiscationIncluded,
  quoteEndorsements, quoteTerms,
  setPendingQuoteData, setShowQuoteConfirm, resetQuoteForm,
}: StandardQuoteFormProps) {
  const cs: Record<string, string> = { USD: "$", GBP: "\u00a3", EUR: "\u20ac" };
  const fleet: any[] = placement.draftData?.fleet || [];
  const isPA = placement.productCode === "PA";
  const isHullDeductible = placement.productCode === "HD";
  const subCoverages: string[] = placement.draftData?.selectedSubCoverages || [];
  const hasCrewPA = subCoverages.includes("crew_personal_accident");
  const hasPaxPA = subCoverages.includes("passenger_personal_accident");
  const crewCoverageType = placement.draftData?.crewCoverageType || "flight_risk";
  const is24HourPA = isPA && crewCoverageType === "24_hour";
  const crewMembers: any[] = placement.draftData?.crewMembers || [];

  // For PA: currency comes from crew/pax sums reinsured currency
  const brokerCurrency = isPA
    ? (is24HourPA
      ? (crewMembers[0]?.sumsInsuredCurrency || "USD")
      : (fleet[0]?.crewSumsReinsuredCurrency || fleet[0]?.paxSumsReinsuredCurrency || "USD"))
    : (fleet.length > 0 ? (fleet[0].aircraftAgreedValueCurrency || "USD") : "USD");
  const sym = cs[brokerCurrency] || "$";

  const hasSpares = subCoverages.includes("spares");
  const hasPPH = subCoverages.includes("products_premises_hangarkeepers");
  const sparesAmount = placement.draftData?.aircraftSparesAmount || "";
  const sparesCurrency = placement.draftData?.aircraftSparesCurrency || "USD";
  const pphLimit = placement.draftData?.pphLimit || "";
  const pphCurrency = placement.draftData?.pphCurrency || "USD";

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  const validUntilStr = validUntil.toISOString().split("T")[0];

  // PA fleet master rate state (must be before conditional return)
  const [crewFleetRate, setCrewFleetRate] = useState("");
  const [paxFleetRate, setPaxFleetRate] = useState("");

  // 24-Hour PA: age band rating mode
  const [ageBandMode, setAgeBandMode] = useState(false);
  const AGE_BANDS = [
    { label: "18–30", min: 18, max: 30 },
    { label: "31–45", min: 31, max: 45 },
    { label: "46–60", min: 46, max: 60 },
    { label: "61+", min: 61, max: 999 },
  ];
  const [bandRates, setBandRates] = useState<Record<string, string>>({});

  // PA-specific logic
  if (isPA) {
    // For PA: quoteHullRates stores crew rate %, quoteLiabilityPremiums stores pax rate %
    // 24-Hour PA: crew rows from crewMembers (no aircraft). Key = member name or index.
    const crewRows = hasCrewPA ? (is24HourPA
      ? crewMembers.map((m: any, idx: number) => {
          const key = m.name || `crew-${idx}`;
          const sumsInsured = parseFloat(String(m.sumsInsured || "0").replace(/,/g, "")) || 0;
          const currency = m.sumsInsuredCurrency || "USD";
          const age = parseInt(m.age || "0") || 0;
          const rate = parseFloat(quoteHullRates[key] || "0") || 0;
          const premium = Math.round((sumsInsured * rate) / 100);
          return { reg: key, name: m.name || "", position: m.position || "", age, limitPerSeat: sumsInsured, currency, seats: 1, aggregate: sumsInsured, rate, premium };
        })
      : fleet.map((a: any) => {
          const reg = (a.registration || "").toUpperCase();
          const limitPerSeat = parseFloat(String(a.crewSumsReinsuredPerSeat || "0").replace(/,/g, "")) || 0;
          const currency = a.crewSumsReinsuredCurrency || "USD";
          const seats = parseInt(a.paCrewSeats || a.crewSeats || "0") || 0;
          const aggregate = limitPerSeat * seats;
          const rate = parseFloat(quoteHullRates[reg] || "0") || 0;
          const premium = Math.round((aggregate * rate) / 100);
          return { reg, limitPerSeat, currency, seats, aggregate, rate, premium };
        })
    ) : [];

    const paxRows = hasPaxPA ? fleet.map((a: any) => {
      const reg = (a.registration || "").toUpperCase();
      const limitPerSeat = parseFloat(String(a.paxSumsReinsuredPerSeat || "0").replace(/,/g, "")) || 0;
      const currency = a.paxSumsReinsuredCurrency || "USD";
      const seats = parseInt(a.paPaxSeats || a.paxSeats || "0") || 0;
      const aggregate = limitPerSeat * seats;
      const rate = parseFloat(quoteLiabilityPremiums[reg] || "0") || 0;
      const premium = Math.round((aggregate * rate) / 100);
      return { reg, limitPerSeat, currency, seats, aggregate, rate, premium };
    }) : [];

    const crewPremTotal = crewRows.reduce((s, r) => s + r.premium, 0);
    const paxPremTotal = paxRows.reduce((s, r) => s + r.premium, 0);
    const totalPremium = crewPremTotal + paxPremTotal;

    const crewCurrency = crewRows[0]?.currency || brokerCurrency;
    const paxCurrency = paxRows[0]?.currency || brokerCurrency;
    const crewSym = cs[crewCurrency] || "$";
    const paxSym = cs[paxCurrency] || "$";

    const allCrewRatesFilled = !hasCrewPA || crewRows.every(r => r.rate > 0);
    const allPaxRatesFilled = !hasPaxPA || paxRows.every(r => r.rate > 0);
    const isValid = allCrewRatesFilled && allPaxRatesFilled;

    const validationErrors: string[] = [];
    if (!allCrewRatesFilled) {
      const missing = crewRows.filter(r => r.rate <= 0).map(r => r.reg);
      validationErrors.push(`Crew PA Rate required for ${missing.join(", ")}`);
    }
    if (!allPaxRatesFilled) {
      const missing = paxRows.filter(r => r.rate <= 0).map(r => r.reg);
      validationErrors.push(`Pax PA Rate required for ${missing.join(", ")}`);
    }

    const crewTypeLabel = crewCoverageType === "flight_risk" ? "Flight Risk" : crewCoverageType === "on_duty" ? "On Duty" : crewCoverageType === "24_hour" ? "24 Hour" : crewCoverageType;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Send className="size-4 text-[#004225]" />
          <h4 className="text-sm font-semibold text-gray-900">Submit Quote</h4>
          <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{brokerCurrency}</span>
        </div>

        {/* CREW PA SECTION */}
        {hasCrewPA && crewRows.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#004225] rounded flex items-center justify-center">
                <Users className="size-3 text-white" />
              </div>
              <span className="text-[10px] font-bold text-[#004225] uppercase tracking-widest">Crew Personal Accident</span>
              <span className="text-[10px] font-medium text-[#004225]/60 bg-[#004225]/8 px-1.5 py-0.5 rounded">{crewTypeLabel}</span>
            </div>

            {/* Fleet Rate — apply to all crew (hidden when age band mode active) */}
            {crewRows.length > 1 && !ageBandMode && (
              <div className="flex items-center gap-2 bg-[#004225]/5 border border-[#004225]/15 rounded-lg px-3 py-2">
                <Zap className="size-3.5 text-[#004225]/70 shrink-0" />
                <span className="text-[10px] font-semibold text-[#004225]/80 uppercase tracking-wider whitespace-nowrap">{is24HourPA ? "Apply Rate to All" : "Fleet Rate"}</span>
                <div className="relative ml-auto">
                  <input
                    type="text"
                    value={crewFleetRate}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      setCrewFleetRate(val);
                      if (val) {
                        const updated: Record<string, string> = {};
                        crewRows.forEach(r => { updated[r.reg] = val; });
                        setQuoteHullRates(prev => ({ ...prev, ...updated }));
                      }
                    }}
                    placeholder="Apply to all"
                    className="w-28 h-7 px-2 pr-5 rounded border border-[#004225]/30 bg-white text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none placeholder:text-[10px]"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#004225]/50 text-[10px]">%</span>
                </div>
              </div>
            )}

            {/* Rating Mode Toggle — only for 24-Hour PA */}
            {is24HourPA && crewRows.length > 1 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rating Method</span>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setAgeBandMode(false)}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${!ageBandMode ? "bg-white text-[#004225] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Flat Rate
                  </button>
                  <button
                    onClick={() => {
                      setAgeBandMode(true);
                      const updated: Record<string, string> = {};
                      crewRows.forEach((r: any) => {
                        const band = AGE_BANDS.find(b => r.age >= b.min && r.age <= b.max);
                        if (band && bandRates[band.label]) {
                          updated[r.reg] = bandRates[band.label];
                        }
                      });
                      if (Object.keys(updated).length > 0) {
                        setQuoteHullRates(prev => ({ ...prev, ...updated }));
                      }
                    }}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${ageBandMode ? "bg-white text-[#004225] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Age Band
                  </button>
                </div>

                {ageBandMode && (
                  <div className="bg-amber-50/60 border border-amber-200/50 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 bg-amber-100/50 border-b border-amber-200/50">
                      {AGE_BANDS.map(band => {
                        const count = crewRows.filter((r: any) => r.age >= band.min && r.age <= band.max).length;
                        return (
                          <div key={band.label} className="px-2.5 py-1.5 text-center">
                            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">{band.label}</div>
                            <div className="text-[9px] text-amber-600">{count} member{count !== 1 ? "s" : ""}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-4">
                      {AGE_BANDS.map(band => {
                        const membersInBand = crewRows.filter((r: any) => r.age >= band.min && r.age <= band.max);
                        return (
                          <div key={band.label} className="px-2 py-2 flex justify-center">
                            <div className="relative">
                              <input
                                type="text"
                                value={bandRates[band.label] || ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, "");
                                  setBandRates(prev => ({ ...prev, [band.label]: val }));
                                  if (val) {
                                    const updated: Record<string, string> = {};
                                    membersInBand.forEach((r: any) => { updated[r.reg] = val; });
                                    setQuoteHullRates(prev => ({ ...prev, ...updated }));
                                  }
                                }}
                                placeholder="0.00"
                                disabled={membersInBand.length === 0}
                                className="w-20 h-7 px-1.5 pr-5 rounded border border-amber-300 bg-white text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200"
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-500 text-[10px]">%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {is24HourPA ? (
                <>
                  <div className="grid grid-cols-[1.3fr_0.7fr_40px_1fr_70px_90px] bg-gray-50 border-b border-gray-200">
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Name</div>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Position</div>
                    <div className="px-1 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Age</div>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Sums Insured</div>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Rate %</div>
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
                  </div>
                  {crewRows.map((row: any, idx: number) => {
                    const memberBand = AGE_BANDS.find(b => row.age >= b.min && row.age <= b.max);
                    return (
                    <div key={row.reg} className={`grid grid-cols-[1.3fr_0.7fr_40px_1fr_70px_90px] items-center ${idx > 0 ? "border-t border-gray-100" : ""}`}>
                      <div className="px-2.5 py-2">
                        <div className="text-xs font-bold text-gray-900">{row.name}</div>
                      </div>
                      <div className="px-2 py-2">
                        <div className="text-[11px] text-gray-500">{row.position || "\u2014"}</div>
                      </div>
                      <div className="px-1 py-2 text-center">
                        <span className={`text-[11px] font-medium ${row.age ? "text-gray-700" : "text-gray-300"}`}>{row.age || "\u2014"}</span>
                        {ageBandMode && memberBand && (
                          <div className="text-[8px] text-amber-600 font-medium leading-none mt-0.5">{memberBand.label}</div>
                        )}
                      </div>
                      <div className="px-2 py-2 text-right">
                        <span className="text-[11px] font-semibold text-gray-700">{crewSym}{row.aggregate.toLocaleString()}</span>
                      </div>
                      <div className="px-1.5 py-1.5">
                        <div className="relative">
                          <input
                            type="text"
                            value={quoteHullRates[row.reg] || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, "");
                              setQuoteHullRates(prev => ({ ...prev, [row.reg]: val }));
                            }}
                            placeholder="0.00"
                            readOnly={ageBandMode}
                            className={`w-full h-8 px-1.5 pr-5 rounded border text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none ${ageBandMode ? "bg-gray-50 border-gray-200 text-gray-500 cursor-default" : "border-gray-300"}`}
                            autoFocus={idx === 0 && !ageBandMode}
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                        </div>
                      </div>
                      <div className="px-2.5 py-2 text-right">
                        <div className={`text-xs font-semibold ${row.premium > 0 ? "text-[#004225]" : "text-gray-300"}`}>
                          {crewSym}{row.premium.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  <div className="grid grid-cols-[1.3fr_0.7fr_40px_1fr_70px_90px] items-center border-t border-gray-300 bg-gray-50">
                    <div className="px-2.5 py-2 col-span-5">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Crew PA Premium Total</span>
                    </div>
                    <div className="px-2.5 py-2 text-right">
                      <span className={`text-sm font-bold ${crewPremTotal > 0 ? "text-[#004225]" : "text-gray-300"}`}>{crewSym}{crewPremTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-[110px_1fr_80px_100px] bg-gray-50 border-b border-gray-200">
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Registration</div>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Crew Limit</div>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Rate %</div>
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
                  </div>
                  {crewRows.map((row, idx) => (
                    <div key={row.reg} className={`grid grid-cols-[110px_1fr_80px_100px] items-center ${idx > 0 ? "border-t border-gray-100" : ""}`}>
                      <div className="px-2.5 py-2">
                        <div className="text-xs font-bold text-gray-900">{row.reg}</div>
                      </div>
                      <div className="px-2 py-2 text-right">
                        <div className="text-[11px] text-gray-700">
                          <span className="font-semibold">{crewSym}{row.limitPerSeat.toLocaleString()}</span>
                          <span className="text-gray-400 ml-1">&times; {row.seats} seat{row.seats !== 1 ? "s" : ""}</span>
                          <span className="text-gray-500 ml-1">= {crewSym}{row.aggregate.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="px-1.5 py-1.5">
                        <div className="relative">
                          <input
                            type="text"
                            value={quoteHullRates[row.reg] || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, "");
                              setQuoteHullRates(prev => ({ ...prev, [row.reg]: val }));
                            }}
                            placeholder="0.00"
                            className="w-full h-8 px-1.5 pr-5 rounded border border-gray-300 text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                            autoFocus={idx === 0}
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                        </div>
                      </div>
                      <div className="px-2.5 py-2 text-right">
                        <div className={`text-xs font-semibold ${row.premium > 0 ? "text-[#004225]" : "text-gray-300"}`}>
                          {crewSym}{row.premium.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-[110px_1fr_80px_100px] items-center border-t border-gray-300 bg-gray-50">
                    <div className="px-2.5 py-2 col-span-3">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Crew PA Premium Total</span>
                    </div>
                    <div className="px-2.5 py-2 text-right">
                      <span className={`text-sm font-bold ${crewPremTotal > 0 ? "text-[#004225]" : "text-gray-300"}`}>{crewSym}{crewPremTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* PAX PA SECTION */}
        {hasPaxPA && paxRows.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                <Users className="size-3 text-white" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Passenger Personal Accident</span>
            </div>

            {/* Fleet Rate — apply to all pax */}
            {paxRows.length > 1 && (
              <div className="flex items-center gap-2 bg-[#004225]/5 border border-[#004225]/15 rounded-lg px-3 py-2">
                <Zap className="size-3.5 text-[#004225]/70 shrink-0" />
                <span className="text-[10px] font-semibold text-[#004225]/80 uppercase tracking-wider whitespace-nowrap">Fleet Rate</span>
                <div className="relative ml-auto">
                  <input
                    type="text"
                    value={paxFleetRate}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      setPaxFleetRate(val);
                      if (val) {
                        const updated: Record<string, string> = {};
                        paxRows.forEach(r => { updated[r.reg] = val; });
                        setQuoteLiabilityPremiums(prev => ({ ...prev, ...updated }));
                      }
                    }}
                    placeholder="Apply to all"
                    className="w-28 h-7 px-2 pr-5 rounded border border-[#004225]/30 bg-white text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none placeholder:text-[10px]"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#004225]/50 text-[10px]">%</span>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[110px_1fr_80px_100px] bg-gray-50 border-b border-gray-200">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Registration</div>
                <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Pax Limit</div>
                <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Rate %</div>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
              </div>
              {paxRows.map((row, idx) => (
                <div key={row.reg} className={`grid grid-cols-[110px_1fr_80px_100px] items-center ${idx > 0 ? "border-t border-gray-100" : ""}`}>
                  <div className="px-2.5 py-2">
                    <div className="text-xs font-bold text-gray-900">{row.reg}</div>
                  </div>
                  <div className="px-2 py-2 text-right">
                    <div className="text-[11px] text-gray-700">
                      <span className="font-semibold">{paxSym}{row.limitPerSeat.toLocaleString()}</span>
                      <span className="text-gray-400 ml-1">× {row.seats} seat{row.seats !== 1 ? "s" : ""}</span>
                      <span className="text-gray-500 ml-1">= {paxSym}{row.aggregate.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="px-1.5 py-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        value={quoteLiabilityPremiums[row.reg] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          setQuoteLiabilityPremiums(prev => ({ ...prev, [row.reg]: val }));
                        }}
                        placeholder="0.00"
                        className="w-full h-8 px-1.5 pr-5 rounded border border-gray-300 text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                    </div>
                  </div>
                  <div className="px-2.5 py-2 text-right">
                    <div className={`text-xs font-semibold ${row.premium > 0 ? "text-blue-700" : "text-gray-300"}`}>
                      {paxSym}{row.premium.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-[110px_1fr_80px_100px] items-center border-t border-gray-300 bg-gray-50">
                <div className="px-2.5 py-2 col-span-3">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Pax PA Premium Total</span>
                </div>
                <div className="px-2.5 py-2 text-right">
                  <span className={`text-sm font-bold ${paxPremTotal > 0 ? "text-blue-700" : "text-gray-300"}`}>{paxSym}{paxPremTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Premium Summary */}
        <div className="bg-[#004225]/5 border border-[#004225]/20 rounded-lg p-3 space-y-1.5">
          {hasCrewPA && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Crew PA</span>
              <span className="font-medium">{crewSym}{crewPremTotal.toLocaleString()}</span>
            </div>
          )}
          {hasPaxPA && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Pax PA</span>
              <span className="font-medium">{paxSym}{paxPremTotal.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t border-[#004225]/20 pt-1.5 flex justify-between">
            <span className="text-xs font-bold text-[#004225] uppercase">Total Premium</span>
            <span className="text-base font-bold text-[#004225]">{sym}{totalPremium.toLocaleString()}</span>
          </div>
          {(() => {
            const ohp = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
            const orderPrem = Math.round(totalPremium * ohp / 100);
            return (
              <div className="border-t border-[#004225]/10 pt-1.5 flex justify-between">
                <span className="text-xs font-bold text-[#004225]/70 uppercase">Order Premium ({ohp}%)</span>
                <span className="text-base font-bold text-[#004225]/70">{sym}{orderPrem.toLocaleString()}</span>
              </div>
            );
          })()}
        </div>

        {/* 30-day validity notice */}
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
          <Clock className="size-3.5 text-blue-500 shrink-0" />
          <span className="text-[11px] text-blue-700">Quote valid for 30 days until <span className="font-semibold">{new Date(validUntilStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span></span>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 space-y-1">
            {validationErrors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                <XCircle className="size-3.5 shrink-0 mt-0.5 text-red-400" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit / Cancel */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            onClick={() => {
              if (!isValid) return;
              setPendingQuoteData({
                underwriterName: `${currentUser?.firstName} ${currentUser?.lastName}`,
                underwriterCompany: currentUser?.company || "",
                premium: totalPremium,
                currency: brokerCurrency,
                writtenLine: 100,
                isPA: true,
                crewPARows: crewRows,
                crewPAPremiumTotal: crewPremTotal,
                paxPARows: paxRows,
                paxPAPremiumTotal: paxPremTotal,
                quoteValidUntil: validUntilStr,
                endorsements: quoteEndorsements || undefined,
                terms: quoteTerms || "Standard terms",
              });
              setShowQuoteConfirm(true);
            }}
            disabled={!isValid}
            className="flex-1 bg-[#004225] hover:bg-[#003319] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="size-4" />
            Submit Quote
          </Button>
          <Button
            onClick={resetQuoteForm}
            variant="outline"
            className="px-5 py-2.5 rounded-lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Standard (non-PA) logic ────────────────────────────────────────────────
  const hullRows = fleet.map((a: any) => {
    const reg = (a.registration || "").toUpperCase();
    if (isHullDeductible) {
      const origDed = parseFloat(String(a.standardDeductible || "0").replace(/,/g, "")) || 0;
      const buydown = parseFloat(String(a.deductibleBuydown || "0").replace(/,/g, "")) || 0;
      const sumsReinsured = Math.max(origDed - buydown, 0);
      const rateOnLine = parseFloat(quoteHullRates[reg] || "0") || 0;
      const premium = Math.round((sumsReinsured * rateOnLine) / 100);
      return { registration: reg, make: a.make || "", model: a.model || "", aircraftType: a.aircraftType || a.make || "", hullValue: sumsReinsured, sumsReinsured, rate: rateOnLine, hullPremium: premium };
    }
    const hullVal = parseFloat(String(a.aircraftAgreedValue || a.hullValue || "0").replace(/,/g, "")) || 0;
    const rate = parseFloat(quoteHullRates[reg] || "0") || 0;
    const hullPremium = Math.round((hullVal * rate) / 100);
    return {
      registration: reg,
      make: a.make || "",
      model: a.model || "",
      aircraftType: a.aircraftType || a.make || "",
      hullValue: hullVal,
      rate,
      hullPremium
    };
  });
  const hullPremiumTotal = hullRows.reduce((s, r) => s + r.hullPremium, 0);

  const liabilityRows = fleet.map((a: any) => {
    const reg = (a.registration || "").toUpperCase();
    const liabType = a.liabilityType || "CSL";
    const liabLimit = parseFloat(String(a.liabilityLimit || "0").replace(/,/g, "")) || 0;
    const premium = parseFloat((quoteLiabilityPremiums[reg] || "0").replace(/,/g, "")) || 0;
    return { registration: reg, liabilityType: liabType, liabilityLimit: liabLimit, premium };
  });
  const liabilityPremNum = liabilityRows.reduce((s, r) => s + r.premium, 0);

  const sparesVal = parseFloat(String(sparesAmount || "0").replace(/,/g, "")) || 0;
  const sparesRate = quoteSparesIncludedInHull ? 0 : (parseFloat(quoteSparesRate || "0") || 0);
  const sparesPremNum = Math.round((sparesVal * sparesRate) / 100);

  const pphPremNum = parseFloat(quotePphPremium.replace(/,/g, "")) || 0;
  const totalPremium = hullPremiumTotal + (isHullWar || isHullDeductible ? 0 : liabilityPremNum) + (hasSpares ? sparesPremNum : 0) + (hasPPH ? pphPremNum : 0);

  const allHullRatesFilled = hullRows.every(r => r.rate > 0);
  const allLiabilityPremiumsFilled = isHullWar || isHullDeductible || liabilityRows.every(r => r.premium > 0);
  const sparesValid = !hasSpares || quoteSparesIncludedInHull || sparesRate > 0;
  const pphValid = !hasPPH || pphPremNum > 0;
  const isValid = allHullRatesFilled && allLiabilityPremiumsFilled && sparesValid && pphValid;

  const validationErrors: string[] = [];
  if (!allHullRatesFilled) {
    const missing = hullRows.filter(r => r.rate <= 0).map(r => r.registration);
    validationErrors.push(`${isHullDeductible ? "Rate on Line" : isHullWar ? "Hull War Rate" : "Hull Rate"} required for ${missing.join(', ')}`);
  }
  if (!allLiabilityPremiumsFilled) {
    const missing = liabilityRows.filter(r => r.premium <= 0).map(r => r.registration);
    validationErrors.push(`Liability Premium required for ${missing.join(', ')}`);
  }
  if (!sparesValid) {
    validationErrors.push(`Spares Rate required, or select "Include Spares within ${isHullWar ? "Hull War" : "Hull"} Rate"`);
  }
  if (!pphValid) {
    validationErrors.push('Products, Premises & Hangarkeepers premium required');
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Send className="size-4 text-[#004225]" />
        <h4 className="text-sm font-semibold text-gray-900">Submit Quote</h4>
        <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{brokerCurrency}</span>
      </div>

      {/* SECTION 1: Hull */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#004225] rounded flex items-center justify-center">
            <Plane className="size-3 text-white" />
          </div>
          <span className="text-[10px] font-bold text-[#004225] uppercase tracking-widest">{isHullDeductible ? "Hull Deductible" : isHullWar ? "Hull War" : "Hull"}</span>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {isHullDeductible ? (
            <>
          <div className="grid grid-cols-[120px_1fr_100px_100px] bg-gray-50 border-b border-gray-200">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Registration</div>
            <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Sums Reinsured</div>
            <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">Rate on Line %</div>
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
          </div>
          {hullRows.map((row, idx) => (
            <div key={row.registration} className={`grid grid-cols-[120px_1fr_100px_100px] items-center ${idx > 0 ? "border-t border-gray-100" : ""}`}>
              <div className="px-2.5 py-2">
                <div className="text-xs font-bold text-gray-900">{row.registration}</div>
              </div>
              <div className="px-2 py-2 text-right">
                <div className="text-[11px] font-semibold text-[#004225]">{sym}{(row as any).sumsReinsured?.toLocaleString() || row.hullValue.toLocaleString()}</div>
              </div>
              <div className="px-1.5 py-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={quoteHullRates[row.registration] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      setQuoteHullRates(prev => ({ ...prev, [row.registration]: val }));
                    }}
                    placeholder="0.00"
                    className="w-full h-8 px-1.5 pr-5 rounded border border-gray-300 text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                    autoFocus={idx === 0}
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                </div>
              </div>
              <div className="px-2.5 py-2 text-right">
                <div className={`text-xs font-semibold ${row.hullPremium > 0 ? "text-[#004225]" : "text-gray-300"}`}>
                  {sym}{row.hullPremium.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[120px_1fr_100px_100px] items-center border-t border-gray-300 bg-gray-50">
            <div className="px-2.5 py-2 col-span-3">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Hull Deductible Premium Total</span>
            </div>
            <div className="px-2.5 py-2 text-right">
              <span className={`text-sm font-bold ${hullPremiumTotal > 0 ? "text-[#004225]" : "text-gray-300"}`}>{sym}{hullPremiumTotal.toLocaleString()}</span>
            </div>
          </div>
            </>
          ) : (
            <>
          <div className="grid grid-cols-[120px_100px_120px_95px_80px_100px] bg-gray-50 border-b border-gray-200">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Registration</div>
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Make</div>
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Model</div>
            <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">{isHullWar ? "Aircraft Agreed Value" : "Hull Value"}</div>
            <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Rate %</div>
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
          </div>
          {hullRows.map((row, idx) => (
            <div key={row.registration} className={`grid grid-cols-[120px_100px_120px_95px_80px_100px] items-center ${idx > 0 ? "border-t border-gray-100" : ""}`}>
              <div className="px-2.5 py-2">
                <div className="text-xs font-bold text-gray-900">{row.registration}</div>
              </div>
              <div className="px-2.5 py-2">
                <div className="text-[10px] text-gray-600 truncate">{row.make}</div>
              </div>
              <div className="px-2.5 py-2">
                <div className="text-[10px] text-gray-600 truncate">{row.model}</div>
              </div>
              <div className="px-2 py-2 text-right">
                <div className="text-[11px] text-gray-600">{sym}{row.hullValue.toLocaleString()}</div>
              </div>
              <div className="px-1.5 py-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={quoteHullRates[row.registration] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      setQuoteHullRates(prev => ({ ...prev, [row.registration]: val }));
                    }}
                    placeholder="0.00"
                    className="w-full h-8 px-1.5 pr-5 rounded border border-gray-300 text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                    autoFocus={idx === 0}
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                </div>
              </div>
              <div className="px-2.5 py-2 text-right">
                <div className={`text-xs font-semibold ${row.hullPremium > 0 ? "text-[#004225]" : "text-gray-300"}`}>
                  {sym}{row.hullPremium.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[120px_100px_120px_95px_80px_100px] items-center border-t border-gray-300 bg-gray-50">
            <div className="px-2.5 py-2 col-span-5">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{isHullWar ? "Hull War Premium Total" : "Hull Premium Total"}</span>
            </div>
            <div className="px-2.5 py-2 text-right">
              <span className={`text-sm font-bold ${hullPremiumTotal > 0 ? "text-[#004225]" : "text-gray-300"}`}>{sym}{hullPremiumTotal.toLocaleString()}</span>
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      {/* CONFISCATION TOGGLE */}
      {isHullWar && (
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-amber-600 rounded flex items-center justify-center">
              <Shield className="size-3 text-white" />
            </div>
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Confiscation — LSW555D</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="confiscation" checked={quoteConfiscationIncluded} onChange={() => setQuoteConfiscationIncluded(true)} className="w-3.5 h-3.5 text-[#004225] accent-[#004225]" />
              <span className="text-xs font-medium text-gray-700">Include Confiscation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="confiscation" checked={!quoteConfiscationIncluded} onChange={() => setQuoteConfiscationIncluded(false)} className="w-3.5 h-3.5 text-[#004225] accent-[#004225]" />
              <span className="text-xs font-medium text-gray-700">Exclude Confiscation</span>
            </label>
          </div>
          <p className="text-[10px] text-amber-700/80 leading-snug">
            {quoteConfiscationIncluded
              ? "Confiscation, nationalisation, seizure, restraint, detention, appropriation and requisition will be included in coverage."
              : "Confiscation, nationalisation, seizure, restraint, detention, appropriation and requisition will be excluded from coverage."}
          </p>
        </div>
      )}

      {/* SECTION 2: Liability */}
      {!isHullWar && !isHullDeductible && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[#004225] rounded-full" />
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Liability</span>
          </div>

          {fleet.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className={`grid ${isDrone ? "grid-cols-[120px_100px_120px_120px_100px]" : "grid-cols-[120px_100px_120px_55px_120px_100px]"} bg-gray-50 border-b border-gray-200`}>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Registration</div>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Make</div>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Model</div>
                {!isDrone && <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Type</div>}
                <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Limit</div>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
              </div>
              {fleet.map((a: any, idx: number) => {
                const aLiabType = a.liabilityType || "CSL";
                const aLiabCurrency = a.liabilityLimitCurrency || "USD";
                const aLiabLimit = a.liabilityLimit ? String(a.liabilityLimit).replace(/,/g, "") : "0";
                const aLiabLimitNum = parseFloat(aLiabLimit) || 0;
                const reg = (a.registration || "").toUpperCase();
                return (
                  <div key={reg || idx} className={`grid ${isDrone ? "grid-cols-[120px_100px_120px_120px_100px]" : "grid-cols-[120px_100px_120px_55px_120px_100px]"} items-center ${idx > 0 ? "border-t border-gray-100" : ""}`}>
                    <div className="px-2.5 py-2">
                      <div className="text-xs font-bold text-gray-900">{reg}</div>
                    </div>
                    <div className="px-2.5 py-2">
                      <div className="text-[10px] text-gray-600 truncate">{a.make || ""}</div>
                    </div>
                    <div className="px-2.5 py-2">
                      <div className="text-[10px] text-gray-600 truncate">{a.model || ""}</div>
                    </div>
                    {!isDrone && (
                    <div className="px-2 py-2 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                        {aLiabType}
                      </span>
                    </div>
                    )}
                    <div className="px-2 py-2 text-right">
                      <div className="text-[10px] font-semibold text-gray-900">
                        {cs[aLiabCurrency] || "$"}{aLiabLimitNum.toLocaleString()}
                      </div>
                    </div>
                    <div className="px-1.5 py-1.5">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">{sym}</span>
                        <input
                          type="text"
                          value={quoteLiabilityPremiums[reg] || ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, "");
                            if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                              const parts = raw.split(".");
                              const intPart = parts[0] ? parseInt(parts[0]).toLocaleString() : "";
                              const formatted = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart || "";
                              setQuoteLiabilityPremiums(prev => ({ ...prev, [reg]: formatted }));
                            }
                          }}
                          placeholder="0"
                          className="w-full h-7 pl-5 pr-1.5 rounded border border-gray-300 text-[11px] text-right focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className={`grid ${isDrone ? "grid-cols-[120px_100px_120px_120px_100px]" : "grid-cols-[120px_100px_120px_55px_120px_100px]"} items-center border-t border-gray-300 bg-gray-50`}>
                <div className={`px-2.5 py-2 ${isDrone ? "col-span-4" : "col-span-5"}`}>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Liability Premium Total</span>
                </div>
                <div className="px-2.5 py-2 text-right">
                  <span className={`text-sm font-bold ${liabilityPremNum > 0 ? "text-[#004225]" : "text-gray-300"}`}>{sym}{liabilityPremNum.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Spares */}
      {hasSpares && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[#004225] rounded-full" />
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Aircraft Spares</span>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_120px] bg-gray-50 border-b border-gray-200">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Spares Value</div>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Rate %</div>
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
            </div>
            <div className="grid grid-cols-[1fr_100px_120px] items-center">
              <div className="px-2.5 py-2">
                <span className="text-xs font-bold text-gray-900">{cs[sparesCurrency] || "$"}{sparesAmount ? parseInt(sparesAmount.replace(/,/g, "")).toLocaleString() : "0"}</span>
              </div>
              {!quoteSparesIncludedInHull ? (
                <>
                  <div className="px-1.5 py-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        value={quoteSparesRate}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          setQuoteSparesRate(val);
                        }}
                        placeholder="0.00"
                        className="w-full h-7 px-1.5 pr-5 rounded border border-gray-300 text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                    </div>
                  </div>
                  <div className="px-2.5 py-2 text-right">
                    <span className={`text-xs font-semibold ${sparesPremNum > 0 ? "text-[#004225]" : "text-gray-300"}`}>
                      {sym}{sparesPremNum.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="px-2.5 py-2 text-right col-span-2">
                  <span className="text-xs font-semibold text-gray-400 italic">Include Spares within {isHullWar ? "Hull War" : "Hull"} Rate</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-[1fr_100px_120px] items-center border-t border-gray-300 bg-gray-50">
              <div className="px-2.5 py-2 col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quoteSparesIncludedInHull}
                    onChange={(e) => setQuoteSparesIncludedInHull(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#004225] focus:ring-[#004225]/30 cursor-pointer accent-[#004225]"
                  />
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Include Spares within {isHullWar ? "Hull War" : "Hull"} Rate</span>
                </label>
              </div>
              <div className="px-2.5 py-2 text-right">
                <span className={`text-sm font-bold ${!quoteSparesIncludedInHull && sparesPremNum > 0 ? "text-[#004225]" : "text-gray-300"}`}>
                  {quoteSparesIncludedInHull ? `${sym}0` : `${sym}${sparesPremNum.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: PPH */}
      {hasPPH && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[#004225] rounded-full" />
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Products, Premises & Hangarkeepers</span>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_120px] bg-gray-50 border-b border-gray-200">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Limit</div>
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
            </div>
            <div className="grid grid-cols-[1fr_120px] items-center">
              <div className="px-2.5 py-2">
                <span className="text-xs font-bold text-gray-900">{pphLimit ? `${cs[pphCurrency] || "$"}${parseInt(pphLimit.replace(/,/g, "")).toLocaleString()}` : "\u2014"}</span>
              </div>
              <div className="px-1.5 py-1.5">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">{sym}</span>
                  <input
                    type="text"
                    value={quotePphPremium}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                        const parts = raw.split(".");
                        const intPart = parts[0] ? parseInt(parts[0]).toLocaleString() : "";
                        const formatted = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart || "";
                        setQuotePphPremium(formatted);
                      }
                    }}
                    placeholder="0"
                    className="w-full h-7 pl-5 pr-1.5 rounded border border-gray-300 text-[11px] text-right focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_120px] items-center border-t border-gray-300 bg-gray-50">
              <div className="px-2.5 py-2">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Total Premium</span>
              </div>
              <div className="px-2.5 py-2 text-right">
                <span className={`text-sm font-bold ${pphPremNum > 0 ? "text-[#004225]" : "text-gray-300"}`}>{sym}{pphPremNum.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Total Premium Summary */}
      <div className="bg-[#004225]/5 border border-[#004225]/20 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{isHullDeductible ? "Hull Deductible" : isHullWar ? "Hull War" : "Hull"}</span>
          <span className="font-medium">{sym}{hullPremiumTotal.toLocaleString()}</span>
        </div>
        {!isHullWar && !isHullDeductible && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Liability</span>
            <span className="font-medium">{sym}{liabilityPremNum.toLocaleString()}</span>
          </div>
        )}
        {hasSpares && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Spares</span>
            <span className="font-medium">{sym}{sparesPremNum.toLocaleString()}</span>
          </div>
        )}
        {hasPPH && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Products, Premises & Hangarkeepers</span>
            <span className="font-medium">{sym}{pphPremNum.toLocaleString()}</span>
          </div>
        )}
        <div className="border-t border-[#004225]/20 pt-1.5 flex justify-between">
          <span className="text-xs font-bold text-[#004225] uppercase">Total Premium</span>
          <span className="text-base font-bold text-[#004225]">{sym}{totalPremium.toLocaleString()}</span>
        </div>
        {(() => {
          const ohp = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
          const orderPrem = Math.round(totalPremium * ohp / 100);
          return (
            <div className="border-t border-[#004225]/10 pt-1.5 flex justify-between">
              <span className="text-xs font-bold text-[#004225]/70 uppercase">Order Premium ({ohp}%)</span>
              <span className="text-base font-bold text-[#004225]/70">{sym}{orderPrem.toLocaleString()}</span>
            </div>
          );
        })()}
      </div>

      {/* 30-day validity notice */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
        <Clock className="size-3.5 text-blue-500 shrink-0" />
        <span className="text-[11px] text-blue-700">Quote valid for 30 days until <span className="font-semibold">{new Date(validUntilStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span></span>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 space-y-1">
          {validationErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-700">
              <XCircle className="size-3.5 shrink-0 mt-0.5 text-red-400" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Submit / Cancel */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <Button
          onClick={() => {
            if (!isValid) return;
            setPendingQuoteData({
              underwriterName: `${currentUser?.firstName} ${currentUser?.lastName}`,
              underwriterCompany: currentUser?.company || "",
              premium: totalPremium,
              currency: brokerCurrency,
              writtenLine: 100,
              hullRates: hullRows,
              hullPremiumTotal,
              liabilityPremium: isHullDeductible ? 0 : liabilityPremNum,
              liabilityRates: isHullDeductible ? [] : liabilityRows,
              sparesPremium: hasSpares ? sparesPremNum : undefined,
              sparesRate: hasSpares ? sparesRate : undefined,
              sparesIncludedInHull: hasSpares ? quoteSparesIncludedInHull : undefined,
              pphPremium: hasPPH ? pphPremNum : undefined,
              quoteValidUntil: validUntilStr,
              endorsements: quoteEndorsements || undefined,
              confiscationIncluded: isHullWar ? quoteConfiscationIncluded : undefined,
              terms: quoteTerms || "Standard terms",
            });
            setShowQuoteConfirm(true);
          }}
          disabled={!isValid}
          className="flex-1 bg-[#004225] hover:bg-[#003319] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="size-4" />
          Submit Quote
        </Button>
        <Button
          onClick={resetQuoteForm}
          variant="outline"
          className="px-5 py-2.5 rounded-lg"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}