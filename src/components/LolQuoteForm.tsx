import { Placement } from "../App";
import { Button } from "./ui/button";
import { Send, Clock, XCircle, Percent, Users, ChevronLeft } from "lucide-react";
import { useState } from "react";

interface LolQuoteFormProps {
  placement: Placement;
  currentUser?: any;
  quoteEndorsements: string;
  setQuoteEndorsements: (v: string) => void;
  quoteTerms: string;
  setQuoteTerms: (v: string) => void;
  quoteLolRateMode: "flat" | "ageBand";
  setQuoteLolRateMode: (v: "flat" | "ageBand") => void;
  quoteLolFlatRate: string;
  setQuoteLolFlatRate: (v: string) => void;
  quoteLolAgeBandRates: Record<string, string>;
  setQuoteLolAgeBandRates: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  quoteLolPersonRates: Record<number, string>;
  setQuoteLolPersonRates: (v: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  setPendingQuoteData: (data: any) => void;
  setShowQuoteConfirm: (v: boolean) => void;
  resetQuoteForm: () => void;
}

export function LolQuoteForm({
  placement, currentUser,
  quoteEndorsements, setQuoteEndorsements,
  quoteTerms, setQuoteTerms,
  quoteLolRateMode, setQuoteLolRateMode,
  quoteLolFlatRate, setQuoteLolFlatRate,
  quoteLolAgeBandRates, setQuoteLolAgeBandRates,
  quoteLolPersonRates, setQuoteLolPersonRates,
  setPendingQuoteData, setShowQuoteConfirm, resetQuoteForm,
}: LolQuoteFormProps) {
  const cs: Record<string, string> = { USD: "$", GBP: "\u00a3", EUR: "\u20ac" };
  const lolPersons: any[] = placement.draftData?.lolPilots || [];
  const lolUniqueCurrencies = [...new Set(lolPersons.map((p: any) => p.sumsInsuredCurrency || "USD"))] as string[];
  const lolIsMixed = lolUniqueCurrencies.length > 1;

  const ageBands = [
    { label: "18 \u2013 30", min: 18, max: 30 },
    { label: "31 \u2013 40", min: 31, max: 40 },
    { label: "41 \u2013 50", min: 41, max: 50 },
    { label: "51 \u2013 60", min: 51, max: 60 },
    { label: "61 \u2013 65", min: 61, max: 65 },
    { label: "66+", min: 66, max: 999 },
  ];

  const getBaseRateForPerson = (p: any): number => {
    if (quoteLolRateMode === "flat") {
      return parseFloat(quoteLolFlatRate || "0") || 0;
    }
    const age = parseInt(p.age || "0") || 0;
    const band = ageBands.find(b => age >= b.min && age <= b.max);
    if (!band) return 0;
    return parseFloat(quoteLolAgeBandRates[band.label] || "0") || 0;
  };

  const lolRows = lolPersons.map((p: any, idx: number) => {
    const si = parseFloat(String(p.sumsInsured || "0").replace(/,/g, "")) || 0;
    const personRateStr = quoteLolPersonRates[idx];
    const rate = personRateStr !== undefined && personRateStr !== "" ? (parseFloat(personRateStr) || 0) : getBaseRateForPerson(p);
    const premium = Math.round((si * rate) / 100);
    const age = parseInt(p.age || "0") || 0;
    const salary = parseFloat(String(p.annualSalary || "0").replace(/,/g, "")) || 0;
    return { name: p.name || "\u2014", position: p.position || "N/A", age, salary, salaryCurrency: p.salaryCurrency || "USD", si, siCurrency: p.sumsInsuredCurrency || "USD", rate, premium };
  });

  const lolTotalsByCurrency = lolUniqueCurrencies.map(cur => ({
    currency: cur,
    sym: cs[cur] || "$",
    totalSI: lolRows.filter(r => r.siCurrency === cur).reduce((s, r) => s + r.si, 0),
    totalPremium: lolRows.filter(r => r.siCurrency === cur).reduce((s, r) => s + r.premium, 0),
    count: lolRows.filter(r => r.siCurrency === cur).length,
  }));
  const totalPremiumAllCurrencies = lolRows.reduce((s, r) => s + r.premium, 0);

  const ageBandSummary = ageBands.map(band => {
    const persons = lolRows.filter(r => r.age >= band.min && r.age <= band.max);
    return { ...band, count: persons.length, persons };
  }).filter(b => b.count > 0);

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  const validUntilStr = validUntil.toISOString().split("T")[0];

  const allPersonRatesFilled = lolRows.every(r => r.rate > 0);
  const lolIsValid = allPersonRatesFilled && totalPremiumAllCurrencies > 0;

  const validationErrors: string[] = [];
  if (!allPersonRatesFilled) {
    const missingPersons = lolRows.filter(r => r.rate <= 0).map(r => r.name);
    validationErrors.push(`Rate % required for: ${missingPersons.join(", ")}`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Send className="size-4 text-[#004225]" />
        <h4 className="text-sm font-semibold text-gray-900">Submit Quote</h4>
        <div className="ml-auto flex gap-1">
          {lolUniqueCurrencies.map(cur => (
            <span key={cur} className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cur}</span>
          ))}
        </div>
      </div>

      {/* Rating Mode Toggle */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rating Method</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setQuoteLolRateMode("flat")}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${quoteLolRateMode === "flat" ? "bg-white text-[#004225] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Flat Rate
          </button>
          <button
            onClick={() => setQuoteLolRateMode("ageBand")}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${quoteLolRateMode === "ageBand" ? "bg-white text-[#004225] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            By Age Band
          </button>
        </div>
      </div>

      {/* FLAT RATE */}
      {quoteLolRateMode === "flat" && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#004225] rounded flex items-center justify-center">
              <Percent className="size-3 text-white" />
            </div>
            <span className="text-[10px] font-bold text-[#004225] uppercase tracking-widest">Flat Rate</span>
            <div className="ml-auto relative">
              <input
                type="text"
                value={quoteLolFlatRate}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setQuoteLolFlatRate(val);
                  setQuoteLolPersonRates({});
                }}
                placeholder="0.00"
                className="w-20 h-7 px-1.5 pr-5 rounded border border-gray-300 text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                autoFocus
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_50px_100px_70px_90px] bg-gray-50 border-b border-gray-200">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Name</div>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Age</div>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Sums Insured</div>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Rate %</div>
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
            </div>
            {lolRows.map((row, idx) => (
              <div key={idx} className={`grid grid-cols-[1fr_50px_100px_70px_90px] items-center ${idx > 0 ? "border-t border-gray-100" : ""}`}>
                <div className="px-2.5 py-2">
                  <div className="text-xs font-bold text-gray-900 truncate">{row.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{row.position}</div>
                </div>
                <div className="px-2 py-2 text-center">
                  <span className="text-xs text-gray-600">{row.age || "\u2014"}</span>
                </div>
                <div className="px-2 py-2 text-right">
                  <span className="text-[11px] text-gray-600">{cs[row.siCurrency] || "$"}{row.si.toLocaleString()}</span>
                </div>
                <div className="px-1 py-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={quoteLolPersonRates[idx] !== undefined ? quoteLolPersonRates[idx] : (quoteLolFlatRate || "")}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setQuoteLolPersonRates(prev => ({ ...prev, [idx]: val }));
                      }}
                      placeholder="0.00"
                      className="w-full h-7 px-1 pr-4 rounded border border-gray-300 text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                  </div>
                </div>
                <div className="px-2.5 py-2 text-right">
                  <span className={`text-xs font-semibold ${row.premium > 0 ? "text-[#004225]" : "text-gray-300"}`}>{cs[row.siCurrency] || "$"}{row.premium.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {lolTotalsByCurrency.map((ct, ci) => (
              <div key={ct.currency} className={`grid grid-cols-[1fr_50px_100px_70px_90px] items-center ${ci === 0 ? "border-t border-gray-300" : "border-t border-gray-200"} bg-gray-50`}>
                <div className="px-2.5 py-2 col-span-2">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{ci === 0 ? "Total" : ""} <span className="text-[10px] font-semibold text-gray-400">{lolIsMixed ? ct.currency : ""}</span></span>
                </div>
                <div className="px-2 py-2 text-right">
                  <span className="text-xs font-bold text-gray-600">{ct.sym}{ct.totalSI.toLocaleString()}</span>
                </div>
                <div className="px-2 py-2" />
                <div className="px-2.5 py-2 text-right">
                  <span className={`text-sm font-bold ${ct.totalPremium > 0 ? "text-[#004225]" : "text-gray-300"}`}>{ct.sym}{ct.totalPremium.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AGE BAND */}
      {quoteLolRateMode === "ageBand" && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#004225] rounded flex items-center justify-center">
              <Users className="size-3 text-white" />
            </div>
            <span className="text-[10px] font-bold text-[#004225] uppercase tracking-widest">Rate by Age Band</span>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[100px_60px_110px_70px_90px] bg-gray-50 border-b border-gray-200">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Age Band</div>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Persons</div>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Band SI</div>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Rate %</div>
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Premium</div>
            </div>
            {ageBandSummary.map((band, idx) => (
              <div key={band.label} className={`grid grid-cols-[100px_60px_110px_70px_90px] items-center ${idx > 0 ? "border-t border-gray-100" : ""}`}>
                <div className="px-2.5 py-2">
                  <span className="text-xs font-bold text-gray-900">{band.label}</span>
                </div>
                <div className="px-2 py-2 text-center">
                  <span className="inline-block bg-gray-100 text-[10px] font-semibold text-gray-600 px-1.5 py-0.5 rounded-full">{band.count}</span>
                </div>
                <div className="px-2 py-2 text-right">
                  {(() => {
                    const bandByCur = lolUniqueCurrencies.map(cur => ({
                      cur, sym: cs[cur] || "$",
                      si: band.persons.filter((r: any) => r.siCurrency === cur).reduce((s: number, r: any) => s + r.si, 0),
                    })).filter(b => b.si > 0);
                    return bandByCur.map((bc, i) => (
                      <div key={bc.cur} className={`text-[11px] text-gray-600 ${i > 0 ? "mt-0.5" : ""}`}>{bc.sym}{bc.si.toLocaleString()}{lolIsMixed ? <span className="text-[9px] text-gray-400 ml-0.5">{bc.cur}</span> : null}</div>
                    ));
                  })()}
                </div>
                <div className="px-1 py-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={quoteLolAgeBandRates[band.label] || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setQuoteLolAgeBandRates(prev => ({ ...prev, [band.label]: val }));
                        setQuoteLolPersonRates({});
                      }}
                      placeholder="0.00"
                      className="w-full h-7 px-1 pr-4 rounded border border-gray-300 text-xs text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                      autoFocus={idx === 0}
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                  </div>
                </div>
                <div className="px-2.5 py-2 text-right">
                  {(() => {
                    const bandPremByCur = lolUniqueCurrencies.map(cur => ({
                      cur, sym: cs[cur] || "$",
                      prem: band.persons.filter((r: any) => r.siCurrency === cur).reduce((s: number, r: any) => s + r.premium, 0),
                    })).filter(b => b.prem > 0);
                    return bandPremByCur.length > 0 ? bandPremByCur.map((bc, i) => (
                      <div key={bc.cur} className={`text-xs font-semibold text-[#004225] ${i > 0 ? "mt-0.5" : ""}`}>{bc.sym}{bc.prem.toLocaleString()}{lolIsMixed ? <span className="text-[9px] text-gray-400 ml-0.5">{bc.cur}</span> : null}</div>
                    )) : <span className="text-xs text-gray-300">{(cs[lolUniqueCurrencies[0]] || "$")}0</span>;
                  })()}
                </div>
              </div>
            ))}
            {lolTotalsByCurrency.map((ct, ci) => (
              <div key={ct.currency} className={`grid grid-cols-[100px_60px_110px_70px_90px] items-center ${ci === 0 ? "border-t border-gray-300" : "border-t border-gray-200"} bg-gray-50`}>
                <div className="px-2.5 py-2 col-span-3">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{ci === 0 ? "Total" : ""} <span className="text-[10px] font-semibold text-gray-400">{lolIsMixed ? ct.currency : ""}</span></span>
                </div>
                <div className="px-2 py-2" />
                <div className="px-2.5 py-2 text-right">
                  <span className={`text-sm font-bold ${ct.totalPremium > 0 ? "text-[#004225]" : "text-gray-300"}`}>{ct.sym}{ct.totalPremium.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Per-person breakdown */}
          <details className="group">
            <summary className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#004225] transition-colors flex items-center gap-1">
              <ChevronLeft className="size-3 -rotate-90 group-open:rotate-0 transition-transform text-gray-400" />
              Per-Person Breakdown
            </summary>
            <div className="mt-1.5 border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_50px_100px_70px_90px] bg-gray-50 border-b border-gray-200">
                <div className="px-2.5 py-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Name</div>
                <div className="px-2 py-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider text-center">Age</div>
                <div className="px-2 py-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider text-right">Sums Insured</div>
                <div className="px-2 py-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider text-center">Rate</div>
                <div className="px-2.5 py-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider text-right">Premium</div>
              </div>
              {lolRows.map((row, idx) => (
                <div key={idx} className={`grid grid-cols-[1fr_50px_100px_70px_90px] items-center ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                  <div className="px-2.5 py-1.5">
                    <div className="text-[11px] font-medium text-gray-800 truncate">{row.name}</div>
                  </div>
                  <div className="px-2 py-1.5 text-center">
                    <span className="text-[10px] text-gray-500">{row.age || "\u2014"}</span>
                  </div>
                  <div className="px-2 py-1.5 text-right">
                    <span className="text-[10px] text-gray-500">{cs[row.siCurrency] || "$"}{row.si.toLocaleString()}</span>
                  </div>
                  <div className="px-1 py-1">
                    <div className="relative">
                      <input
                        type="text"
                        value={quoteLolPersonRates[idx] !== undefined ? quoteLolPersonRates[idx] : (quoteLolAgeBandRates[ageBands.find(b => row.age >= b.min && row.age <= b.max)?.label || ""] || "")}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          setQuoteLolPersonRates(prev => ({ ...prev, [idx]: val }));
                        }}
                        placeholder="0.00"
                        className="w-full h-6 px-1 pr-3 rounded border border-gray-200 text-[10px] text-center focus:border-[#004225] focus:ring-1 focus:ring-[#004225]/20 outline-none"
                      />
                      <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-gray-400 text-[9px]">%</span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1.5 text-right">
                    <span className={`text-[10px] font-semibold ${row.premium > 0 ? "text-[#004225]" : "text-gray-300"}`}>{cs[row.siCurrency] || "$"}{row.premium.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Total Premium Summary */}
      <div className="bg-[#004225]/5 border border-[#004225]/20 rounded-lg p-3 space-y-1.5">
        {lolTotalsByCurrency.map((ct) => (
          <div key={ct.currency} className="flex justify-between text-xs text-gray-600">
            <span>Loss of Licence{lolIsMixed ? ` (${ct.currency})` : ""}</span>
            <span className="font-medium">{ct.sym}{ct.totalPremium.toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t border-[#004225]/20 pt-1.5 space-y-1">
          {lolTotalsByCurrency.map((ct) => (
            <div key={ct.currency} className="flex justify-between">
              <span className="text-xs font-bold text-[#004225] uppercase">Total Premium{lolIsMixed ? ` (${ct.currency})` : ""}</span>
              <span className="text-base font-bold text-[#004225]">{ct.sym}{ct.totalPremium.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {(() => {
          const ohp = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
          return (
            <div className="border-t border-[#004225]/10 pt-1.5 space-y-1">
              {lolTotalsByCurrency.map((ct) => {
                const orderPrem = Math.round(ct.totalPremium * ohp / 100);
                return (
                  <div key={ct.currency} className="flex justify-between">
                    <span className="text-xs font-bold text-[#004225]/70 uppercase">Order Premium ({ohp}%){lolIsMixed ? ` ${ct.currency}` : ""}</span>
                    <span className="text-base font-bold text-[#004225]/70">{ct.sym}{orderPrem.toLocaleString()}</span>
                  </div>
                );
              })}
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
            if (!lolIsValid) return;
            setPendingQuoteData({
              underwriterName: `${currentUser?.firstName} ${currentUser?.lastName}`,
              underwriterCompany: currentUser?.company || "",
              premium: lolTotalsByCurrency[0]?.totalPremium || 0,
              currency: lolTotalsByCurrency[0]?.currency || "USD",
              writtenLine: 100,
              lolPremiumsByCurrency: lolTotalsByCurrency.map(ct => ({ currency: ct.currency, premium: ct.totalPremium, sumsInsured: ct.totalSI })),
              lolRateMode: quoteLolRateMode,
              lolFlatRate: quoteLolRateMode === "flat" ? parseFloat(quoteLolFlatRate || "0") : undefined,
              lolAgeBandRates: quoteLolRateMode === "ageBand" ? quoteLolAgeBandRates : undefined,
              lolPersonPremiums: lolRows.map(r => ({ name: r.name, age: r.age, sumsInsured: r.si, currency: r.siCurrency, rate: r.rate, premium: r.premium })),
              quoteValidUntil: validUntilStr,
              endorsements: quoteEndorsements || undefined,
              terms: quoteTerms || "Standard terms",
            });
            setShowQuoteConfirm(true);
          }}
          disabled={!lolIsValid}
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
