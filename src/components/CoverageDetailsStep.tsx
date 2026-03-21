import { Contact } from "../App";
import { Check } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface CoverageOption {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  iconColor: string;
  iconBg: string;
  description: string;
}

interface CoverageDetailsStepProps {
  selectedMainCoverages: string[];
  selectedSubCoverages: string[];
  setSelectedSubCoverages: (v: string[]) => void;
  placementType: "insurance" | "reinsurance" | null;
  setPlacementType: (v: "insurance" | "reinsurance") => void;
  setCurrentStep: (step: number) => void;
  isDirect: boolean;
  setIsDirect: (v: boolean) => void;
  producingBroker: string;
  setProducingBroker: (v: string) => void;
  selectedProducingBrokerId: string | null;
  setSelectedProducingBrokerId: (v: string | null) => void;
  brokerComboboxOpen: boolean;
  setBrokerComboboxOpen: (v: boolean) => void;
  producingBrokerContacts: Contact[];
  coverageOptions: CoverageOption[];
  subCoverageOptions: Record<string, { id: string; label: string; disabled?: boolean }[]>;
  orderHereonPercentage: Record<string, string>;
  setOrderHereonPercentage: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  orderHereonBasis: Record<string, "whole" | "order">;
  setOrderHereonBasis: React.Dispatch<React.SetStateAction<Record<string, "whole" | "order">>>;
  crewCoverageType: "flight_risk" | "on_duty" | "24_hour";
  setCrewCoverageType: (v: "flight_risk" | "on_duty" | "24_hour") => void;
  toggleSubCoverage: (coverageId: string) => void;
  isUASProduct: boolean;
  canProceedStep1: boolean;
  requiresSubCoverages: boolean;
}

export function CoverageDetailsStep({
  selectedMainCoverages,
  selectedSubCoverages,
  setSelectedSubCoverages,
  placementType,
  setPlacementType,
  setCurrentStep,
  isDirect,
  setIsDirect,
  producingBroker,
  setProducingBroker,
  selectedProducingBrokerId,
  setSelectedProducingBrokerId,
  brokerComboboxOpen,
  setBrokerComboboxOpen,
  producingBrokerContacts,
  coverageOptions,
  subCoverageOptions,
  orderHereonPercentage,
  setOrderHereonPercentage,
  orderHereonBasis,
  setOrderHereonBasis,
  crewCoverageType,
  setCrewCoverageType,
  toggleSubCoverage,
  isUASProduct,
  canProceedStep1,
  requiresSubCoverages,
}: CoverageDetailsStepProps) {
  // Auto-select "Hull and Liability" when HL coverage is selected
  if (selectedMainCoverages.includes("HL") && !selectedSubCoverages.includes("hull_liability")) {
    setSelectedSubCoverages([...selectedSubCoverages, "hull_liability"]);
  }

  const totalSteps = selectedMainCoverages.includes('HL') ? 7 : 5;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Coverage Details</h1>
              <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                Step 1 of {totalSteps} &middot; Select placement type and specific coverages
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#004225] bg-green-50 border border-green-200 rounded-md px-3 py-1.5 uppercase tracking-wider">
            Step 1/{totalSteps}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Insurance/Reinsurance Selection */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 bg-[#004225] rounded-full" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Placement Type</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["insurance", "reinsurance"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPlacementType(type)}
                  className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                    placementType === type
                      ? "bg-[#004225]/5 border-[#004225] shadow-sm"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {placementType === type && (
                    <div className="absolute top-3 right-3 bg-[#004225] rounded w-5 h-5 flex items-center justify-center">
                      <Check className="size-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div className="text-center">
                    <h4 className="text-sm font-semibold text-slate-900 capitalize">{type}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">{type === "insurance" ? "Direct insurance placement" : "Reinsurance placement"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Producing Broker */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 bg-[#004225] rounded-full" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Producing Broker</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDirect(!isDirect);
                  if (!isDirect) {
                    setProducingBroker("");
                    setSelectedProducingBrokerId(null);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                  isDirect
                    ? "bg-[#004225]/5 border-[#004225]"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`rounded border-2 w-5 h-5 flex items-center justify-center transition-all duration-200 ${
                  isDirect 
                    ? "bg-[#004225] border-[#004225]" 
                    : "bg-white border-gray-300"
                }`}>
                  {isDirect && (
                    <Check className="size-3.5 text-white" strokeWidth={3} />
                  )}
                </div>
                <span className="text-slate-700 text-sm font-medium">Tick if Direct</span>
              </button>
            </div>
            {!isDirect && (
              <div className="relative">
                <Input
                  id="producingBroker"
                  value={producingBroker}
                  onChange={(e) => {
                    setProducingBroker(e.target.value);
                    setSelectedProducingBrokerId(null);
                    setBrokerComboboxOpen(true);
                  }}
                  onFocus={() => setBrokerComboboxOpen(true)}
                  placeholder="Search and select a producing broker from Contact Manager"
                  className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                />
                {brokerComboboxOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {producingBrokerContacts.length === 0 ? (
                      <div className="px-4 py-3 text-slate-500 text-sm">
                        No producing brokers found in Contact Manager. Please add one in the Contact Manager first.
                      </div>
                    ) : (
                      <>
                        {producingBrokerContacts
                          .filter((contact) => {
                            const searchTerm = producingBroker.toLowerCase();
                            const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
                            const company = contact.company?.toLowerCase() || "";
                            return fullName.includes(searchTerm) || company.includes(searchTerm);
                          })
                          .map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => {
                                setProducingBroker(`${contact.firstName} ${contact.lastName}${contact.company ? ` - ${contact.company}` : ""}`);
                                setSelectedProducingBrokerId(contact.id);
                                setBrokerComboboxOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-medium text-sm">{contact.firstName} {contact.lastName}</span>
                                {contact.company && (
                                  <span className="text-slate-500 text-xs mt-0.5">{contact.company}</span>
                                )}
                                {contact.email && (
                                  <span className="text-slate-400 text-xs">{contact.email}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        {producingBrokerContacts.filter((contact) => {
                          const searchTerm = producingBroker.toLowerCase();
                          const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
                          const company = contact.company?.toLowerCase() || "";
                          return fullName.includes(searchTerm) || company.includes(searchTerm);
                        }).length === 0 && (
                          <div className="px-4 py-3 text-slate-500 text-sm">
                            No matching producing brokers found. Try a different search term.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {!selectedProducingBrokerId && producingBroker && (
                  <p className="text-amber-600 text-sm mt-2">
                    Please select a producing broker from the dropdown to continue
                  </p>
                )}
              </div>
            )}
            {isDirect && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-gray-600 text-sm">Direct placement — no producing broker required</p>
              </div>
            )}
          </div>
        </div>

        {/* Coverage Selection Cards */}
        {selectedMainCoverages.map((coverageId) => {
          const coverage = coverageOptions.find(c => c.id === coverageId);
          const subOptions = subCoverageOptions[coverageId];
          if (!coverage) return null;

          const addonOptions = subOptions?.filter(sub => !sub.disabled) || [];
          const currentPercentage = orderHereonPercentage[coverageId] || "100";
          const currentBasis = orderHereonBasis[coverageId] || "whole";

          return (
            <div key={coverageId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 space-y-6">
                {/* Coverage Header */}
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-5 bg-[#004225] rounded-full" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{coverage.title}</h3>
                </div>

                {/* Optional Add-on Coverages */}
                {addonOptions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {coverageId === "PA" ? "Select Coverage Options" : coverageId === "HW" ? "Select Coverage Options" : isUASProduct ? "" : "Select Optional Add-on Coverages"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {addonOptions.map((subCoverage) => {
                        const isSelected = selectedSubCoverages.includes(subCoverage.id);
                        const isPaxDisabledBy24Hour = coverageId === "PA" && subCoverage.id === "passenger_personal_accident" && crewCoverageType === "24_hour" && selectedSubCoverages.includes("crew_personal_accident");
                        return (
                          <button
                            key={subCoverage.id}
                            type="button"
                            disabled={isPaxDisabledBy24Hour}
                            onClick={() => toggleSubCoverage(subCoverage.id)}
                            className={`relative p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                              isPaxDisabledBy24Hour
                                ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                                : isSelected
                                  ? "bg-[#004225]/5 border-[#004225] shadow-sm"
                                  : "bg-white border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`rounded border-2 w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                isSelected && !isPaxDisabledBy24Hour
                                  ? "bg-[#004225] border-[#004225]" 
                                  : "bg-white border-gray-300"
                              }`}>
                                {isSelected && !isPaxDisabledBy24Hour && (
                                  <Check className="size-3 text-white" strokeWidth={3} />
                                )}
                              </div>
                              <span className="text-slate-900 text-sm">
                                {subCoverage.label}
                              </span>
                            </div>
                            {isPaxDisabledBy24Hour && (
                              <p className="text-[10px] text-amber-600 mt-1.5 ml-6">Unavailable with 24-Hour Crew Cover</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Coverage Type for Crew Personal Accident */}
                {coverageId === "PA" && selectedSubCoverages.includes("crew_personal_accident") && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage Type (Crew Personal Accident)</h4>
                    {(() => {
                      const hasPaxPA = selectedSubCoverages.includes("passenger_personal_accident");
                      const crewTypeOptions: { id: "flight_risk" | "on_duty" | "24_hour"; label: string; exclusive?: boolean }[] = [
                        { id: "flight_risk", label: "Flight Risk Only" },
                        { id: "on_duty", label: "On-Duty" },
                        { id: "24_hour", label: "24-Hour Cover", exclusive: true },
                      ];
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {crewTypeOptions.map((opt) => {
                            const isDisabled = hasPaxPA && opt.id !== "flight_risk";
                            const isSelected = crewCoverageType === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  setCrewCoverageType(opt.id);
                                  if (opt.id === "24_hour" && selectedSubCoverages.includes("passenger_personal_accident")) {
                                    setSelectedSubCoverages(selectedSubCoverages.filter(c => c !== "passenger_personal_accident"));
                                  }
                                }}
                                className={`relative p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                                  isDisabled
                                    ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                                    : isSelected
                                      ? "bg-[#004225]/5 border-[#004225] shadow-sm"
                                      : "bg-white border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`rounded border-2 w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                    isSelected && !isDisabled
                                      ? "bg-[#004225] border-[#004225]" 
                                      : "bg-white border-gray-300"
                                  }`}>
                                    {isSelected && !isDisabled && (
                                      <Check className="size-3 text-white" strokeWidth={3} />
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-slate-900 text-sm">{opt.label}</span>
                                    {opt.exclusive && (
                                      <p className="text-[10px] text-gray-400 mt-0.5">Crew PA only — excludes Pax PA</p>
                                    )}
                                  </div>
                                </div>
                                {isDisabled && (
                                  <p className="text-[10px] text-amber-600 mt-1.5 ml-6">Unavailable when Pax PA is selected</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Order Hereon */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Order Hereon</h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Input
                      id={`orderHereonPercentage-${coverageId}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={currentPercentage}
                      onChange={(e) => setOrderHereonPercentage(prev => ({ ...prev, [coverageId]: e.target.value }))}
                      placeholder="100"
                      style={{ width: '150px', minWidth: '150px' }}
                      className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg text-sm py-2"
                    />
                    {(["whole", "order"] as const).map((basis) => (
                      <button
                        key={basis}
                        type="button"
                        onClick={() => setOrderHereonBasis(prev => ({ ...prev, [coverageId]: basis }))}
                        className={`px-5 py-2 rounded-lg border-2 transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                          currentBasis === basis
                            ? "bg-[#004225]/5 border-[#004225] shadow-sm"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`rounded border-2 w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          currentBasis === basis
                            ? "bg-[#004225] border-[#004225]" 
                            : "bg-white border-gray-300"
                        }`}>
                          {currentBasis === basis && (
                            <Check className="size-3 text-white" strokeWidth={3} />
                          )}
                        </div>
                        <span className="text-slate-900 text-sm">% of {basis === "whole" ? "Whole" : "Order"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-5 border-t border-gray-200 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentStep(0)}
            className="text-slate-500 hover:text-slate-900 hover:bg-gray-50 rounded-lg px-5 py-2.5 text-sm font-medium border border-gray-200"
          >
            &larr; Back
          </Button>
          <div className="flex items-center gap-3">
            {!canProceedStep1 && (
              <div className="text-amber-600 text-xs font-medium">
                {selectedMainCoverages.length === 0 ? "Select at least one coverage type" :
                 !placementType ? "Select placement type" : 
                 requiresSubCoverages && selectedSubCoverages.length === 0 ? (isUASProduct ? "Select at least one coverage" : "Select at least one sub-coverage") :
                 !isDirect && !selectedProducingBrokerId ? "Select producing broker or check Direct" : ""}
              </div>
            )}
            <Button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedStep1}
              className={`font-medium rounded-lg px-8 py-2.5 text-sm transition-all duration-200 ${
                canProceedStep1
                  ? 'bg-[#004225] hover:bg-[#003319] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue to Step 2 &rarr;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
