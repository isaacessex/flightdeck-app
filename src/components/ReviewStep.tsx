import React, { useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Shield, ChevronDown, Upload, FileText, X, Info, Check, Plane, AlertTriangle, Layers } from "lucide-react";
import { getTypeAbbreviation } from "../utils/placementFormHelpers";
import { BinderBuilder, type BinderSelection } from "./BinderBuilder";
import type { Binder, Placement } from "../App";

interface ReviewStepProps {
  // Coverage & Broker
  selectedMainCoverages: string[];
  selectedSubCoverages: string[];
  placementType: "insurance" | "reinsurance" | null;
  producingBroker: string;
  isDirect: boolean;
  
  // Insured Details
  insuredName: string;
  insuredAddressLine1: string;
  insuredCity: string;
  insuredCountry: string;
  insuredPostcode: string;
  additionalInsureds: Array<{
    name: string;
    addressLine1: string;
    city: string;
    country: string;
    postcode: string;
  }>;
  
  // Reinsured Details (if applicable)
  reinsuredName: string;
  reinsuredAddressLine1: string;
  reinsuredCity: string;
  reinsuredCountry: string;
  reinsuredPostcode: string;
  
  // Policy Period
  inceptionDate: string;
  expiryDate: string;
  inceptionDateTBA: boolean;
  expiryDateTBA: boolean;
  bothDatesIncluded: boolean;
  inceptionTime: string;
  expiryTime: string;
  timeZoneOption: string;
  
  // Fleet (for non-LOL coverages)
  fleet: any[];
  
  // LOL Pilots
  lolPilots: Array<{
    name: string;
    age: string;
    salary: string;
    salaryCurrency: string;
    sumsInsured: string;
    sumsInsuredCurrency: string;
    taxType: string;
    taxPercentage: string;
    taxName: string;
  }>;
  
  // Geographical Limits
  excludedCountries: string[];
  
  // Sub-Limits & Coverages
  medicalExpensesLimit?: string;
  medicalExpensesCurrency?: string;
  cargoLiabilityLimit?: string;
  cargoLiabilityCurrency?: string;
  baggageLimit?: string;
  baggageCurrency?: string;
  passengerSettlementLimit?: string;
  passengerSettlementCurrency?: string;
  pphLimit?: string;
  pphCurrency?: string;
  
  // Aircraft Spares
  aircraftSparesAmount?: string;
  aircraftSparesCurrency?: string;
  
  // Clauses & Endorsements
  noClaimsBonus?: boolean;
  noClaimsBonusPercentage?: string;
  profitCommission?: boolean;
  profitCommissionPercentage?: string;
  profitCommissionBasis?: string;
  cargoEndorsement?: boolean;
  
  // Claims History
  claimsHistory: any[];
  generalClaimsInfo: "yes" | "no" | "";
  claimsDetails: string;
  
  // Supporting Documents
  supportingDocuments: File[];
  setSupportingDocuments: (docs: File[] | ((prev: File[]) => File[])) => void;
  
  // Lineslip Selection
  selectedMainCoveragesForLineslips: string[];
  selectedLineslips: Record<string, string>;
  setSelectedLineslips: (value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  getEligibleLineslips: (productCode: string) => any[];
  coverageOptions: any[];
  
  // Binder Selection
  selectedBinders?: Record<string, string>;
  setSelectedBinders?: (value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  getEligibleBinders?: (productCode: string) => any[];
  allBinders?: Binder[];
  // Binder Builder selections (multi-market panel)
  binderBuilderSelections?: Record<string, BinderSelection[]>;
  setBinBuilderSelections?: (value: Record<string, BinderSelection[]> | ((prev: Record<string, BinderSelection[]>) => Record<string, BinderSelection[]>)) => void;
  
  // Navigation & Submission
  shouldSkipStep3: boolean;
  shouldSkipStep5: boolean;
  onBack: () => void;
  onSubmit: (e?: any) => void;
  isSubmitting: boolean;
  setGeneralClaimsInfo: (value: "yes" | "no" | "") => void;
  setClaimsDetails: (value: string) => void;
  
  // Format Helpers
  formatDateToUK: (dateString: string) => string;
  formatNumberWithCommas: (value: string) => string;
  
  // Order Hereon
  orderHereonPercentage: Record<string, string>;
  orderHereonBasis: Record<string, "whole" | "order">;
  
  // Crew PA
  crewCoverageType: "flight_risk" | "on_duty" | "24_hour";
  crewMembers: Array<{
    name: string;
    age: string;
    position: string;
    sumsInsured?: string;
    sumsInsuredCurrency?: string;
  }>;
  
  // Pilot Details
  namedPilots?: boolean;
  openPilotWarranty?: boolean;
  pilotsUnder65?: boolean;
  namedPilotsDocument?: File | null;
  minRequiredHours?: Record<string, { totalHours: string; typeHours: string }>;
  opwHours?: Record<string, {
    picTotalHours: string;
    picTotalHoursOther: string;
    picEngineHours: string;
    picEngineHoursOther: string;
    picMakeModelHours: string;
    picMakeModelHoursOther: string;
    coPilotTotalHours: string;
    coPilotTotalHoursOther: string;
    coPilotEngineHours: string;
    coPilotEngineHoursOther: string;
    coPilotMakeModelHours: string;
    coPilotMakeModelHoursOther: string;
  }>;
}

export function ReviewStep({
  selectedMainCoverages,
  selectedSubCoverages,
  placementType,
  producingBroker,
  isDirect,
  insuredName,
  insuredAddressLine1,
  insuredCity,
  insuredCountry,
  insuredPostcode,
  additionalInsureds,
  reinsuredName,
  reinsuredAddressLine1,
  reinsuredCity,
  reinsuredCountry,
  reinsuredPostcode,
  inceptionDate,
  expiryDate,
  inceptionDateTBA,
  expiryDateTBA,
  bothDatesIncluded,
  inceptionTime,
  expiryTime,
  timeZoneOption,
  fleet,
  lolPilots,
  excludedCountries,
  medicalExpensesLimit,
  medicalExpensesCurrency,
  cargoLiabilityLimit,
  cargoLiabilityCurrency,
  baggageLimit,
  baggageCurrency,
  passengerSettlementLimit,
  passengerSettlementCurrency,
  pphLimit,
  pphCurrency,
  aircraftSparesAmount,
  aircraftSparesCurrency,
  noClaimsBonus,
  noClaimsBonusPercentage,
  profitCommission,
  profitCommissionPercentage,
  profitCommissionBasis,
  cargoEndorsement,
  claimsHistory,
  generalClaimsInfo,
  claimsDetails,
  supportingDocuments,
  setSupportingDocuments,
  selectedMainCoveragesForLineslips,
  selectedLineslips,
  setSelectedLineslips,
  getEligibleLineslips,
  coverageOptions,
  selectedBinders,
  setSelectedBinders,
  getEligibleBinders,
  allBinders,
  binderBuilderSelections,
  setBinBuilderSelections,
  shouldSkipStep3,
  shouldSkipStep5,
  onBack,
  onSubmit,
  isSubmitting,
  setGeneralClaimsInfo,
  setClaimsDetails,
  formatDateToUK,
  formatNumberWithCommas,
  orderHereonPercentage,
  orderHereonBasis,
  crewCoverageType,
  crewMembers,
  namedPilots,
  openPilotWarranty,
  pilotsUnder65,
  namedPilotsDocument,
  minRequiredHours,
  opwHours,
}: ReviewStepProps) {
  const [showDutyOfDisclosure, setShowDutyOfDisclosure] = useState(false);
  const [showBinderBuilder, setShowBinderBuilder] = useState<string | null>(null); // productCode or null
  
  const coverageMap: Record<string, string> = {
    "HL": "Hull and Liability",
    "HW": "Hull War",
    "PA": "Personal Accident",
    "LOL": "Loss of Licence",
    "HD": "Hull Deductible",
    "UAS": "Unmanned Aerial Systems"
  };

  const handleSubmitClick = () => {
    // Check if all products have at least one facility selected (lineslip OR binder)
    const allFacilitiesSelected = selectedMainCoveragesForLineslips.every(productCode => {
      const eligibleLineslips = getEligibleLineslips(productCode);
      const eligibleBindersList = getEligibleBinders ? getEligibleBinders(productCode) : [];
      const hasLineslipSelected = eligibleLineslips.length > 0 && selectedLineslips[productCode];
      const hasBinderSelected = eligibleBindersList.length > 0 && selectedBinders?.[productCode];
      const hasBuilderPanel = binderBuilderSelections?.[productCode]?.length > 0;
      return hasLineslipSelected || hasBinderSelected || hasBuilderPanel;
    });

    if (!allFacilitiesSelected || isSubmitting) {
      return;
    }

    // Show Duty of Disclosure modal
    setShowDutyOfDisclosure(true);
  };

  const handleConfirmSubmit = () => {
    setShowDutyOfDisclosure(false);
    onSubmit();
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Review & Submit</h1>
              <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                {selectedMainCoverages.includes('UAS') ? 'Step 5 of 5' : shouldSkipStep3 ? 'Step 5 of 5' : shouldSkipStep5 ? 'Step 5 of 5' : 'Step 7 of 7'} &middot; Review your placement details and submit
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#004225] bg-green-50 border border-green-200 rounded-md px-3 py-1.5 uppercase tracking-wider">
            {selectedMainCoverages.includes('UAS') ? 'Step 5/5' : shouldSkipStep3 ? 'Step 5/5' : shouldSkipStep5 ? 'Step 5/5' : 'Step 7/7'}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Placement Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-[#004225] rounded-full" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Placement Summary</h3>
            </div>
          </div>
          
          <div className="p-5 space-y-5">
            {/* Coverage Information */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Coverage Type</p>
                  <p className="text-gray-900 font-semibold text-sm">
                    {(() => {
                      // Only show main coverages, not sub-coverages
                      return selectedMainCoverages.length > 0 
                        ? selectedMainCoverages.map(code => coverageMap[code] || code).join(", ")
                        : "—";
                    })()}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Placement Type</p>
                  <p className="text-gray-900 font-semibold text-sm capitalize">
                    {placementType || "—"}
                  </p>
                </div>
                {!shouldSkipStep3 && fleet.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{selectedMainCoverages.includes('UAS') ? 'Drones in Fleet' : 'Aircraft in Fleet'}</p>
                    <p className="text-gray-900 font-semibold text-sm">{fleet.length}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Producing Broker</p>
                  <p className="text-gray-900 font-semibold text-sm">
                    {isDirect ? "Direct" : (producingBroker.includes(" - ") ? producingBroker.split(" - ")[1] : producingBroker || "—")}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Hereon Information */}
            {Object.keys(orderHereonPercentage).length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Order Hereon</h3>
                <div className="space-y-2">
                  {selectedMainCoverages.map(coverage => {
                    if (orderHereonPercentage[coverage]) {
                      return (
                        <div key={coverage} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-900 font-medium">{coverageMap[coverage]}</span>
                              <span className="text-gray-900 font-bold text-lg">{orderHereonPercentage[coverage]}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">Basis:</span>
                              <span className="text-[#004225] font-semibold bg-[#004225]/5 px-3 py-1 rounded-md border border-[#004225]/20">
                                {`${orderHereonPercentage[coverage]}% of 100% ${orderHereonBasis[coverage] === "whole" ? "Of Whole" : "Of Order"}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Insured Details */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Insured */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Insured</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                    <p className="text-gray-900 font-semibold text-sm">{insuredName || "—"}</p>
                    {insuredAddressLine1 && (
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>{insuredAddressLine1}</p>
                        <p>{[insuredCity, insuredCountry, insuredPostcode].filter(Boolean).join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reinsured */}
                {placementType === "reinsurance" && reinsuredName && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Reinsured</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                      <p className="text-gray-900 font-semibold text-sm">{reinsuredName}</p>
                      {reinsuredAddressLine1 && (
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>{reinsuredAddressLine1}</p>
                          <p>{[reinsuredCity, reinsuredCountry, reinsuredPostcode].filter(Boolean).join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Insureds */}
                {additionalInsureds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Insured ({additionalInsureds.length})</p>
                    <div className="space-y-2">
                      {additionalInsureds.map((insured, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                          <p className="text-gray-900 font-semibold text-sm">{insured.name}</p>
                          {insured.addressLine1 && (
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <p>{insured.addressLine1}</p>
                              <p>{[insured.city, insured.country, insured.postcode].filter(Boolean).join(", ")}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Policy Period */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Policy Period</p>
              <div className="space-y-2">
                {inceptionDateTBA ? (
                  <p className="text-gray-900 font-semibold text-base">TBA</p>
                ) : (
                  <>
                    <p className="text-gray-900 font-semibold text-base">
                      {inceptionDate && expiryDate
                        ? `${formatDateToUK(inceptionDate)} to ${formatDateToUK(expiryDate)}`
                        : "—"}
                    </p>
                    {inceptionTime && expiryTime && (
                      <p className="text-gray-500 text-sm">
                        {inceptionTime} to {expiryTime} ({timeZoneOption === "original-insured" ? "Original Insured Time" : timeZoneOption === "utc" ? "UTC" : "Local Time"})
                      </p>
                    )}
                    {bothDatesIncluded && (
                      <p className="text-gray-500 text-xs">Both days included</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Geographical Limits */}
            {!shouldSkipStep3 && excludedCountries.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Geographical Limits</p>
                <div className="space-y-2">
                  <p className="text-gray-900 text-sm mb-2">Excluded LSW617 Countries:</p>
                  <div className="flex flex-wrap gap-2">
                    {excludedCountries.map((country) => (
                      <span
                        key={country}
                        className="inline-flex items-center gap-0.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200"
                      >
                        {country}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LOL Pilot Details */}
            {shouldSkipStep3 && lolPilots.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Loss of Licence — Insured Person Details ({lolPilots.length} insured person{lolPilots.length !== 1 ? 's' : ''})</p>
                <div className="space-y-2">
                  {lolPilots.map((pilot, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 text-[10px] mb-0.5">Name</p>
                          <p className="text-gray-900 font-medium text-xs">{pilot.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-[10px] mb-0.5">Position</p>
                          <p className="text-gray-900 font-medium text-xs">{pilot.position || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-[10px] mb-0.5">Age</p>
                          <p className="text-gray-900 font-medium text-xs">{pilot.age}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-[10px] mb-0.5">Salary</p>
                          <p className="text-gray-900 font-medium text-xs">{pilot.salary ? `${pilot.salaryCurrency} ${formatNumberWithCommas(pilot.salary)}` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-[10px] mb-0.5">Sums {placementType === "reinsurance" ? "Reinsured" : "Insured"}</p>
                          <p className="text-gray-900 font-medium text-xs">{pilot.sumsInsuredCurrency} {formatNumberWithCommas(pilot.sumsInsured)}</p>
                        </div>
                      </div>
                      {pilot.taxPercentage && pilot.taxName && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-gray-500 text-[10px] mb-0.5">Tax Details</p>
                          <p className="text-gray-900 text-xs">
                            {pilot.taxName}: {pilot.taxPercentage}% ({pilot.taxType === "addition" ? "Addition to Premium" : "Deduction from Sums Insured"})
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Crew PA Details */}
            {selectedMainCoverages.includes("PA") && crewCoverageType === "24_hour" && crewMembers.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Crew Members — 24 Hour Coverage ({crewMembers.length})</p>
                <div className="space-y-2">
                  {crewMembers.map((member, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Name</p>
                          <p className="text-gray-900 font-medium">{member.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Age</p>
                          <p className="text-gray-900 font-medium">{member.age}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Position</p>
                          <p className="text-gray-900 font-medium capitalize">{member.position || "N/A"}</p>
                        </div>
                        {member.sumsInsured && (
                          <div>
                            <p className="text-gray-500 text-xs mb-1">{placementType === "reinsurance" ? "Sums Reinsured" : "Sums Insured"}</p>
                            <p className="text-gray-900 font-medium">{member.sumsInsuredCurrency || "USD"} {member.sumsInsured}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fleet Details */}
            {!shouldSkipStep3 && fleet.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{selectedMainCoverages.includes('UAS') ? `Fleet Details (${fleet.length} ${fleet.length === 1 ? 'drone' : 'drones'})` : `Fleet Details (${fleet.length} aircraft)`}</p>
                <div className="space-y-3">
                  {fleet.map((aircraft, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative group hover:border-[#004225]/30 transition-all duration-200"
                    >
                      {/* Fleet Number */}
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <span className="text-slate-300 font-bold text-2xl">{index + 1}</span>
                      </div>
                      
                      <div className="overflow-x-auto">
                      <div className="flex gap-3 pl-10 pr-4 flex-wrap">
                        {/* Registration */}
                        <div className="flex-shrink-0" style={{ width: '80px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">{selectedMainCoverages.includes('UAS') ? 'Serial No.' : 'Registration'}</p>
                          <p className="text-slate-900 font-semibold uppercase text-xs whitespace-nowrap overflow-hidden text-ellipsis">{aircraft.registration || "—"}</p>
                        </div>
                        
                        {/* Make/Model */}
                        <div className="flex-shrink-0" style={{ width: '130px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">Make/Model</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-slate-900 font-semibold uppercase text-xs whitespace-nowrap overflow-hidden text-ellipsis cursor-help">
                                  {aircraft.make && aircraft.model ? `${aircraft.make} ${aircraft.model}` : aircraft.make || aircraft.model || "—"}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-900 border-slate-700">
                                <p className="text-sm text-white uppercase">
                                  {aircraft.make && aircraft.model ? `${aircraft.make} ${aircraft.model}` : aircraft.make || aircraft.model || "—"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {/* Base Country / Region */}
                        <div className="flex-shrink-0" style={{ width: '120px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">Base Country / Region</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-slate-900 font-semibold uppercase text-xs whitespace-nowrap overflow-hidden text-ellipsis cursor-help">
                                  {aircraft.baseCountry 
                                    ? `${aircraft.baseCountry}${aircraft.baseRegion ? ` / ${aircraft.baseRegion}` : ''}`
                                    : "—"}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-900 border-slate-700">
                                <p className="text-sm text-white uppercase">
                                  {aircraft.baseCountry 
                                    ? `${aircraft.baseCountry}${aircraft.baseRegion ? ` / ${aircraft.baseRegion}` : ''}`
                                    : "—"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {/* Crew/Pax Seats - Show for HL and PA */}
                        {(selectedMainCoverages.includes('HL') || selectedMainCoverages.includes('PA')) && (
                        <div className="flex-shrink-0" style={{ width: '75px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">Crew/Pax Seats</p>
                          <p className="text-slate-900 font-semibold uppercase text-xs">
                            {aircraft.crewSeats && aircraft.paxSeats 
                              ? `${aircraft.crewSeats} / ${aircraft.paxSeats}` 
                              : aircraft.crewSeats || aircraft.paxSeats || "—"}
                          </p>
                        </div>
                        )}
                        
                        {/* Dual Crew - Show for HL (even if HW is also selected) */}
                        {selectedMainCoverages.includes('HL') && (
                        <div className="flex-shrink-0" style={{ width: '55px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">Dual Crew</p>
                          <div className="flex items-center">
                            {aircraft.isDualCrew ? (
                              <Check className="size-3.5 text-green-600" />
                            ) : (
                              <span className="text-slate-900 font-semibold uppercase text-xs">NO</span>
                            )}
                          </div>
                        </div>
                        )}
                        
                        {/* Aircraft Type / Engine Type - Hide for UAS */}
                        {!selectedMainCoverages.includes('UAS') && (
                        <div className="flex-shrink-0" style={{ width: '90px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">Type</p>
                          <p className="text-slate-900 font-semibold uppercase text-xs">
                            {aircraft.aircraftType && aircraft.engineType
                              ? `${getTypeAbbreviation(aircraft.aircraftType, 'aircraft')} / ${getTypeAbbreviation(aircraft.engineType, 'engine')}`
                              : aircraft.aircraftType 
                                ? getTypeAbbreviation(aircraft.aircraftType, 'aircraft')
                                : aircraft.engineType 
                                  ? getTypeAbbreviation(aircraft.engineType, 'engine')
                                  : "—"}
                          </p>
                        </div>
                        )}
                        
                        
                        {/* Aircraft/Hull Value - Show for HW, HL, or UAS */}
                        {(selectedMainCoverages.includes('HW') || selectedMainCoverages.includes('HL') || selectedMainCoverages.includes('UAS')) && (
                        <div className="flex-shrink-0" style={{ width: '110px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">{selectedMainCoverages.includes('UAS') ? 'Hull Value' : 'Aircraft Value'}</p>
                          <p className="text-slate-900 font-semibold uppercase text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {aircraft.aircraftAgreedValue && aircraft.aircraftAgreedValue !== "" && !isNaN(parseFloat(aircraft.aircraftAgreedValue.toString().replace(/,/g, ""))) 
                              ? `${aircraft.aircraftAgreedValueCurrency} ${parseFloat(aircraft.aircraftAgreedValue.toString().replace(/,/g, "")).toLocaleString()}` 
                              : "—"}
                          </p>
                        </div>
                        )}
                        
                        {/* Liability Limit - Show for HL (even if HW is also selected) or UAS */}
                        {(selectedMainCoverages.includes('HL') || selectedMainCoverages.includes('UAS')) && (
                        <div className="flex-shrink-0" style={{ width: '110px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">
                            Liability Limit {!selectedMainCoverages.includes('UAS') && aircraft.liabilityType && `(${aircraft.liabilityType === 'CSL' ? 'CSL' : 'TPL'})`}
                          </p>
                          <p className="text-slate-900 font-semibold uppercase text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {aircraft.liabilityLimit && aircraft.liabilityLimit !== "" && !isNaN(parseFloat(aircraft.liabilityLimit.toString().replace(/,/g, ""))) 
                              ? `${aircraft.liabilityLimitCurrency} ${parseFloat(aircraft.liabilityLimit.toString().replace(/,/g, "")).toLocaleString()}` 
                              : "—"}
                          </p>
                        </div>
                        )}
                        
                        {/* Hull Deductible - Show for HL (even if HW is also selected) */}
                        {selectedMainCoverages.includes('HL') && (
                        <div className="flex-shrink-0" style={{ width: '110px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">Hull Deductible</p>
                          <p className="text-slate-900 font-semibold uppercase text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {aircraft.hullDeductible && aircraft.hullDeductible !== "" && !isNaN(parseFloat(aircraft.hullDeductible.toString().replace(/,/g, ""))) 
                              ? `${aircraft.hullDeductibleCurrency} ${parseFloat(aircraft.hullDeductible.toString().replace(/,/g, "")).toLocaleString()}` 
                              : "—"}
                          </p>
                        </div>
                        )}
                        
                        {/* Sums Reinsured - Show only for Hull Deductible */}
                        {selectedMainCoverages.includes('HD') && (
                        <div className="flex-shrink-0" style={{ width: '110px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">Sums Reinsured</p>
                          <p className="text-slate-900 font-semibold uppercase text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {aircraft.sumsReinsured && aircraft.sumsReinsured !== "" && !isNaN(parseFloat(aircraft.sumsReinsured.toString().replace(/,/g, ""))) 
                              ? `${aircraft.sumsReinsuredCurrency} ${parseFloat(aircraft.sumsReinsured.toString().replace(/,/g, "")).toLocaleString()}` 
                              : "—"}
                          </p>
                        </div>
                        )}
                        
                        {/* Standard Uses with hover tooltip - Hide for Hull Deductible */}
                        {!selectedMainCoverages.includes('HD') && (
                        <div className="flex-shrink-0" style={{ width: '65px' }}>
                          <p className="text-slate-500 text-[10px] mb-0.5">Std Uses</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 cursor-help">
                                  <Info className="size-3 text-[#004225]" />
                                  <span className="text-slate-900 font-semibold uppercase text-xs">
                                    {aircraft.standardUses?.length || 0}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-900 border-slate-700 max-w-xs">
                                {aircraft.standardUses?.length > 0 ? (
                                  <ul className="text-sm space-y-1">
                                    {aircraft.standardUses.map((use: string, i: number) => (
                                      <li key={i} className="text-white uppercase">• {use.replace("-", " ")}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-slate-400">No standard uses selected</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        )}
                        
                        {/* Special Uses with hover tooltip - Hide for Hull Deductible */}
                        {!selectedMainCoverages.includes('HD') && (
                        <div className="flex-shrink-0" style={{ width: '80px' }}>
                          <p className="text-slate-400 text-[10px] mb-0.5">Spc Uses</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 cursor-help">
                                  <Info className={`size-3 ${aircraft.specialUses?.length > 0 ? 'text-[#004225]' : 'text-orange-400'}`} />
                                  <span className={`font-semibold uppercase text-xs ${aircraft.specialUses?.length > 0 ? 'text-slate-900' : 'text-white'}`}>
                                    {aircraft.specialUses?.length || 0}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-800 border-slate-700 max-w-xs">
                                {aircraft.specialUses?.length > 0 ? (
                                  <ul className="text-sm space-y-1">
                                    {aircraft.specialUses.map((use: string, i: number) => (
                                      <li key={i} className="text-slate-200 uppercase">
                                        • {use === "Other" && aircraft.specialUsesOther 
                                            ? aircraft.specialUsesOther 
                                            : use.replace("-", " ")}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-slate-400">No special uses selected</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        )}
                        
                        {/* Tax with hover tooltip */}
                        <div className="flex-shrink-0" style={{ width: '70px' }}>
                          <p className="text-slate-400 text-[10px] mb-0.5">Tax</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 cursor-help">
                                  <Info className={`size-3 ${aircraft.taxPercentage && aircraft.taxPercentage !== "" ? 'text-[#004225]' : 'text-orange-400'}`} />
                                  <span className={`font-semibold uppercase text-xs ${aircraft.taxPercentage && aircraft.taxPercentage !== "" ? 'text-slate-900' : 'text-white'}`}>
                                    {aircraft.taxPercentage && aircraft.taxPercentage !== "" ? `${aircraft.taxPercentage}%` : "—"}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-800 border-slate-700 max-w-xs">
                                {aircraft.taxPercentage && aircraft.taxPercentage !== "" ? (
                                  <div className="text-sm space-y-1">
                                    <p className="text-slate-200">
                                      <span className="font-semibold">Name:</span> {aircraft.taxName || "N/A"}
                                    </p>
                                    <p className="text-slate-200">
                                      <span className="font-semibold">Type:</span> {aircraft.taxType === "addition" ? "Addition" : "Deduction"}
                                    </p>
                                    <p className="text-slate-200">
                                      <span className="font-semibold">Percentage:</span> {aircraft.taxPercentage}%
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-400">Tax (if applicable)</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aircraft Spares — shown when spares sub-coverage selected or HW (implicitly available) */}
            {(selectedSubCoverages.includes("spares") || selectedMainCoverages.includes("HW")) && aircraftSparesAmount && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Aircraft Spares</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plane className="size-4 text-[#004225]" />
                      <span className="text-gray-700 text-sm font-medium">Spares Value</span>
                    </div>
                    <span className="text-gray-900 font-semibold text-sm">
                      {aircraftSparesCurrency || "USD"} {formatNumberWithCommas(aircraftSparesAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Coverage Details - PA Only */}
            {selectedMainCoverages.includes('PA') && !shouldSkipStep3 && fleet.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Coverage Details</p>
                <div className="space-y-3">
                  {fleet.map((aircraft, index) => {
                    const hasCrewPA = aircraft.crewSumsReinsuredPerSeat && aircraft.crewSumsReinsuredPerSeat !== "" && !isNaN(parseFloat(aircraft.crewSumsReinsuredPerSeat.toString().replace(/,/g, "")));
                    const hasPaxPA = aircraft.paxSumsReinsuredPerSeat && aircraft.paxSumsReinsuredPerSeat !== "" && !isNaN(parseFloat(aircraft.paxSumsReinsuredPerSeat.toString().replace(/,/g, "")));
                    
                    if (!hasCrewPA && !hasPaxPA) return null;
                    
                    const crewPerSeat = hasCrewPA ? parseFloat(aircraft.crewSumsReinsuredPerSeat.toString().replace(/,/g, "")) : 0;
                    const paxPerSeat = hasPaxPA ? parseFloat(aircraft.paxSumsReinsuredPerSeat.toString().replace(/,/g, "")) : 0;
                    const crewSeats = aircraft.crewSeats ? parseInt(aircraft.crewSeats.toString()) : 0;
                    const paxSeats = aircraft.paxSeats ? parseInt(aircraft.paxSeats.toString()) : 0;
                    const crewAggregate = crewPerSeat * crewSeats;
                    const paxAggregate = paxPerSeat * paxSeats;
                    
                    return (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 relative group hover:border-[#004225]/30 transition-all duration-200"
                      >
                        {/* Fleet Number */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <span className="text-slate-300 font-bold text-xl">{index + 1}</span>
                        </div>
                        
                        <div className="pl-10 pr-3 space-y-2">
                          {/* Registration */}
                          <div>
                            <p className="text-slate-500 text-xs font-medium">Registration: <span className="text-slate-900 font-semibold uppercase">{aircraft.registration}</span></p>
                          </div>
                          
                          {/* Crew PA */}
                          {hasCrewPA && (
                            <div className="bg-white border border-gray-200 rounded-md p-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 text-xs font-medium">Crew Sums Reinsured Per Seat</span>
                                <span className="text-[#004225] font-semibold text-xs">
                                  {aircraft.crewSumsReinsuredCurrency} {crewPerSeat.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                <span className="text-gray-500 text-xs">Aggregate ({crewSeats} seats)</span>
                                <span className="text-gray-900 font-bold text-xs">
                                  {aircraft.crewSumsReinsuredCurrency} {crewAggregate.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Pax PA */}
                          {hasPaxPA && (
                            <div className="bg-white border border-gray-200 rounded-md p-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 text-xs font-medium">Pax Sums Reinsured Per Seat</span>
                                <span className="text-[#004225] font-semibold text-xs">
                                  {aircraft.paxSumsReinsuredCurrency} {paxPerSeat.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                <span className="text-gray-500 text-xs">Aggregate ({paxSeats} seats)</span>
                                <span className="text-gray-900 font-bold text-xs">
                                  {aircraft.paxSumsReinsuredCurrency} {paxAggregate.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pilot Details */}
            {!shouldSkipStep3 && fleet.length > 0 && (namedPilots || openPilotWarranty || pilotsUnder65 || (minRequiredHours && Object.keys(minRequiredHours).length > 0) || (opwHours && Object.keys(opwHours).length > 0)) && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Pilot Details</p>
                <div className="space-y-2">
                  {namedPilots && (
                    <div className="flex items-center justify-between py-2.5 px-4 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-gray-700 text-sm font-medium">Named Pilots</span>
                      <span className="text-[#004225] font-semibold text-sm inline-flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Yes{namedPilotsDocument ? ' (Document in Supporting Documents)' : ''}
                      </span>
                    </div>
                  )}
                  {openPilotWarranty && (
                    <div className="space-y-2">
                      {/* Open Pilot Warranty */}
                      <div className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-gray-700 text-sm font-medium">Open Pilot Warranty</span>
                        <span className="text-[#004225] font-semibold text-sm inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Yes
                        </span>
                      </div>
                      
                      {/* Under 65 requirement */}
                      {pilotsUnder65 !== undefined && (
                        <div className={`flex items-center justify-between py-2.5 px-4 rounded-lg border ${
                          pilotsUnder65 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <span className="text-gray-700 text-sm font-medium">All Pilots Under 65 Years</span>
                          <span className={`font-semibold text-sm inline-flex items-center gap-1.5 ${
                            pilotsUnder65 ? 'text-[#004225]' : 'text-gray-500'
                          }`}>
                            {pilotsUnder65 ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Yes
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                No
                              </>
                            )}
                          </span>
                        </div>
                      )}
                      
                      {opwHours && Object.keys(opwHours).length > 0 && (
                        <div className="space-y-3 mt-3">
                          {Object.entries(opwHours).map(([typeKey, hours]) => {
                            const [aircraftType, engineType] = typeKey.split('|');
                            const formatNumber = (val: string) => {
                              if (!val || val === '—') return val;
                              const num = parseInt(val);
                              return isNaN(num) ? val : num.toLocaleString();
                            };
                            const formatHours = (val: string) => {
                              if (!val || val === '—') return '—';
                              if (val === 'type_rated') return 'Type Rated';
                              const num = parseInt(val);
                              return isNaN(num) ? val : `${num.toLocaleString()}h`;
                            };
                            return (
                              <div key={typeKey} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-gray-900 font-semibold text-sm mb-3 uppercase">{aircraftType} / {engineType}</p>
                                <div className="space-y-2">
                                  {/* PIC Hours */}
                                  <div className="grid grid-cols-3 gap-4 text-xs">
                                    <div>
                                      <p className="text-gray-500 mb-1">PIC Total Hours</p>
                                      <p className="text-gray-900 font-medium">
                                        {formatHours(hours.picTotalHours === 'other' ? hours.picTotalHoursOther : hours.picTotalHours)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 mb-1">PIC Engine Hours</p>
                                      <p className="text-gray-900 font-medium">
                                        {formatHours(hours.picEngineHours === 'other' ? hours.picEngineHoursOther : hours.picEngineHours)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 mb-1">PIC Make/Model Hours</p>
                                      <p className="text-gray-900 font-medium">
                                        {formatHours(hours.picMakeModelHours === 'other' ? hours.picMakeModelHoursOther : hours.picMakeModelHours)}
                                      </p>
                                    </div>
                                  </div>
                                  {/* Co-Pilot Hours - Only show if entered */}
                                  {(hours.coPilotTotalHours || hours.coPilotTotalHoursOther || hours.coPilotEngineHours || hours.coPilotEngineHoursOther || hours.coPilotMakeModelHours || hours.coPilotMakeModelHoursOther) && (
                                  <div className="grid grid-cols-3 gap-4 text-xs pt-2 border-t border-gray-200">
                                    <div>
                                      <p className="text-gray-500 mb-1">Co-Pilot Total Hours</p>
                                      <p className="text-gray-900 font-medium">
                                        {formatHours(hours.coPilotTotalHours === 'other' ? hours.coPilotTotalHoursOther : hours.coPilotTotalHours)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 mb-1">Co-Pilot Engine Hours</p>
                                      <p className="text-gray-900 font-medium">
                                        {formatHours(hours.coPilotEngineHours === 'other' ? hours.coPilotEngineHoursOther : hours.coPilotEngineHours)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 mb-1">Co-Pilot Make/Model Hours</p>
                                      <p className="text-gray-900 font-medium">
                                        {formatHours(hours.coPilotMakeModelHours === 'other' ? hours.coPilotMakeModelHoursOther : hours.coPilotMakeModelHours)}
                                      </p>
                                    </div>
                                  </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {!openPilotWarranty && pilotsUnder65 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">All Pilots Under 65</span>
                      <span className="text-[#004225] font-semibold text-sm">✓ Yes</span>
                    </div>
                  )}
                  {minRequiredHours && Object.keys(minRequiredHours).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-500 text-xs mb-2">Minimum Required Hours</p>
                      <div className="space-y-1">
                        {Object.entries(minRequiredHours).map(([typeKey, hours]) => {
                          const [aircraftType, engineType] = typeKey.split('|');
                          return (
                            <div key={typeKey} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 uppercase">{aircraftType} / {engineType}:</span>
                              <span className="text-gray-900 font-medium">{hours.totalHours}h total, {hours.typeHours}h type</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-Limits & Clauses - Hide for UAS/drone submissions and LOL-only */}
            {!shouldSkipStep5 && !selectedMainCoverages.includes('UAS') && !shouldSkipStep3 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Sub-Limits & Clauses</p>
                <div className="space-y-1.5">
                  {medicalExpensesLimit && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Medical Expenses</span>
                      <span className="text-gray-900 font-semibold text-sm">{medicalExpensesCurrency} {formatNumberWithCommas(medicalExpensesLimit)}</span>
                    </div>
                  )}
                  {cargoLiabilityLimit && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Cargo Liability</span>
                      <span className="text-gray-900 font-semibold text-sm">{cargoLiabilityCurrency} {formatNumberWithCommas(cargoLiabilityLimit)}</span>
                    </div>
                  )}
                  {baggageLimit && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Baggage</span>
                      <span className="text-gray-900 font-semibold text-sm">{baggageCurrency} {formatNumberWithCommas(baggageLimit)}</span>
                    </div>
                  )}
                  {passengerSettlementLimit && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Passenger Settlement</span>
                      <span className="text-gray-900 font-semibold text-sm">{passengerSettlementCurrency} {formatNumberWithCommas(passengerSettlementLimit)}</span>
                    </div>
                  )}
                  {pphLimit && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Premises & Hangarkeepers</span>
                      <span className="text-gray-900 font-semibold text-sm">{pphCurrency} {formatNumberWithCommas(pphLimit)}</span>
                    </div>
                  )}
                  {noClaimsBonus && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">No Claims Bonus</span>
                      <span className="text-gray-900 font-semibold text-sm">{noClaimsBonusPercentage}%</span>
                    </div>
                  )}
                  {profitCommission && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Profit Commission</span>
                      <span className="text-gray-900 font-semibold text-sm">{profitCommissionPercentage}% on {profitCommissionBasis}% basis</span>
                    </div>
                  )}
                  {cargoEndorsement && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Cargo Endorsement</span>
                      <span className="text-[#004225] font-semibold text-sm">✓ Included</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Claims History */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Claims History</p>
              {shouldSkipStep3 || selectedMainCoverages.includes('HL') || selectedMainCoverages.includes('HW') ? (
                // LOL-only, HL, or HW: Show claimsHistory array
                <>
                  <p className="text-gray-900 font-semibold text-base mb-3">
                    {claimsHistory.length > 0 ? `Yes (${claimsHistory.length} claim${claimsHistory.length !== 1 ? 's' : ''})` : "No"}
                  </p>
                  {claimsHistory.length > 0 && (
                    <div className="space-y-2">
                      {claimsHistory.map((claim, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Date</p>
                              <p className="text-gray-900 font-medium">{formatDateToUK(claim.claimDate)}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                {(() => {
                                  const claimDate = new Date(claim.claimDate);
                                  const today = new Date();
                                  const diffMs = today.getTime() - claimDate.getTime();
                                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                  const years = Math.floor(diffDays / 365);
                                  const days = diffDays % 365;
                                  if (years > 0) {
                                    return `${years} year${years !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''} ago`;
                                  } else {
                                    return `${days} day${days !== 1 ? 's' : ''} ago`;
                                  }
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Type</p>
                              <p className="text-gray-900 font-medium">
                                {claim.claimType === 'Other' 
                                  ? claim.claimTypeOther 
                                  : coverageMap[claim.claimType] || claim.claimType}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Amount Incurred</p>
                              <p className="text-gray-900 font-medium">{claim.amountPaidCurrency} {formatNumberWithCommas(claim.amountPaid)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Status</p>
                              <p className={`font-medium ${claim.claimStatus.toLowerCase() === 'open' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {claim.claimStatus.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          {claim.description && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-gray-500 text-xs mb-1">Description</p>
                              <p className="text-gray-500 text-sm">{claim.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Other products: Show generalClaimsInfo
                <>
                  <p className="text-gray-900 font-semibold text-base">
                    {generalClaimsInfo === "yes" ? "Yes" : generalClaimsInfo === "no" ? "No" : "—"}
                  </p>
                  {generalClaimsInfo === "yes" && claimsDetails && (
                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-500 text-sm whitespace-pre-wrap">{claimsDetails}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Supporting Documents Upload */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-[#004225] rounded-full" />
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Supporting Documents</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Aircraft logs, maintenance records, previous policies, etc.</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
          
          <div className="relative">
            <label
              htmlFor="supportingDocs"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-[#004225] transition-all duration-200 group"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="size-10 text-gray-400 mb-3 group-hover:text-[#004225] transition-colors" />
                <p className="mb-2 text-sm text-gray-700 font-semibold">
                  <span className="text-[#004225]">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG (Max 10MB per file)
                </p>
              </div>
              <Input
                id="supportingDocs"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSupportingDocuments((prev) => [...prev, ...files]);
                }}
                className="hidden"
              />
            </label>
          </div>

          {(supportingDocuments.length > 0 || namedPilotsDocument) && (
            <div className="space-y-2 mt-4">
              <p className="text-gray-700 text-sm font-semibold">Uploaded Documents ({supportingDocuments.length + (namedPilotsDocument ? 1 : 0)}):</p>
              <div className="space-y-2">
                {namedPilotsDocument && (
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#004225]/10 rounded-lg">
                        <FileText className="size-5 text-[#004225]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-900 text-sm font-medium">{namedPilotsDocument.name}</span>
                        <span className="text-gray-500 text-xs">
                          {(namedPilotsDocument.size / 1024).toFixed(1)} KB • Named Pilots List
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {supportingDocuments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <FileText className="size-5 text-orange-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-900 text-sm font-medium">{file.name}</span>
                        <span className="text-gray-500 text-xs">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSupportingDocuments((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="size-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Facility Selection (Lineslips & Binders) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-[#004225] rounded-full" />
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Facility</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Choose a lineslip and/or binder for each product. Binders provide automatic quoting.</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
          
          <div className="space-y-4">
            {selectedMainCoveragesForLineslips.map(productCode => {
              const eligibleLineslips = getEligibleLineslips(productCode);
              const eligibleBindersList = getEligibleBinders ? getEligibleBinders(productCode) : [];
              const productName = coverageOptions.find((c: any) => c.id === productCode)?.title || productCode;
              const noFacilities = eligibleLineslips.length === 0 && eligibleBindersList.length === 0;
              
              return (
                <div key={productCode} className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
                  <h4 className="text-gray-900 text-lg font-semibold">{productName}</h4>
                  
                  {noFacilities ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm">
                        No active lineslips or binders available for this product that can accommodate your entered limits.
                        Please contact an underwriter or reduce your limit requirements.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Lineslips */}
                      {eligibleLineslips.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Plane className="size-3" /> Lineslips
                          </p>
                          {eligibleLineslips.map((lineslip: any) => (
                            <label
                              key={lineslip.id}
                              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                                selectedLineslips[productCode] === lineslip.id
                                  ? "bg-[#004225]/10 border-[#004225]"
                                  : "bg-white border-gray-300 hover:border-gray-400"
                              }`}
                              onClick={() => {
                                setSelectedLineslips(prev => ({ ...prev, [productCode]: lineslip.id }));
                                // Deselect binder and builder panel for this product when selecting lineslip
                                if (setSelectedBinders) {
                                  setSelectedBinders(prev => { const n = { ...prev }; delete n[productCode]; return n; });
                                }
                                if (setBinBuilderSelections) {
                                  setBinBuilderSelections(prev => { const n = { ...prev }; delete n[productCode]; return n; });
                                }
                              }}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedLineslips[productCode] === lineslip.id
                                  ? "border-[#004225]"
                                  : "border-gray-400"
                              }`}>
                                {selectedLineslips[productCode] === lineslip.id && (
                                  <div className="w-2 h-2 rounded-full bg-[#004225]" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-gray-900 font-semibold">{lineslip.name}</p>
                                  <span className="text-xs px-2 py-1 bg-green-100 border border-green-300 text-green-700 rounded">
                                    {lineslip.reference}
                                  </span>
                                </div>
                                {lineslip.productCode === "HL" && (
                                  <div className="text-gray-600 text-xs mt-2 grid grid-cols-2 gap-2">
                                    <div>Max Hull (FW): ${lineslip.maxHullLimitFixedWing?.toLocaleString("en-US")}</div>
                                    <div>Max Liability (FW): ${lineslip.maxLiabilityLimitFixedWing?.toLocaleString("en-US")}</div>
                                    <div>Max Hull (RW): ${lineslip.maxHullLimitRotaryWing?.toLocaleString("en-US")}</div>
                                    <div>Max Liability (RW): ${lineslip.maxLiabilityLimitRotaryWing?.toLocaleString("en-US")}</div>
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Binders */}
                      {eligibleBindersList.length > 0 && setSelectedBinders && selectedBinders && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="size-3" /> Binders
                            <span className="text-[10px] font-normal text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded ml-1">Auto-Quote</span>
                          </p>
                          {eligibleBindersList.map((binder: any) => (
                            <label
                              key={binder.id}
                              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                                selectedBinders[productCode] === binder.id
                                  ? "bg-amber-50 border-amber-400"
                                  : "bg-white border-gray-300 hover:border-gray-400"
                              }`}
                              onClick={() => {
                                setSelectedBinders(prev => ({ ...prev, [productCode]: binder.id }));
                                // Deselect lineslip and builder panel for this product when selecting binder
                                setSelectedLineslips(prev => { const n = { ...prev }; delete n[productCode]; return n; });
                                if (setBinBuilderSelections) {
                                  setBinBuilderSelections(prev => { const n = { ...prev }; delete n[productCode]; return n; });
                                }
                              }}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedBinders[productCode] === binder.id
                                  ? "border-amber-500"
                                  : "border-gray-400"
                              }`}>
                                {selectedBinders[productCode] === binder.id && (
                                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <p className="text-gray-900 font-semibold">{binder.name}</p>
                                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                      Auto-Rate
                                    </span>
                                  </div>
                                  <span className="text-xs px-2 py-1 bg-amber-100 border border-amber-300 text-amber-700 rounded">
                                    {binder.reference}
                                  </span>
                                </div>
                                {binder.ratingRules && (
                                  <div className="text-gray-600 text-xs mt-2 grid grid-cols-2 gap-2">
                                    {binder.ratingRules.hullRateFixedWing > 0 && <div>Hull FW Rate: {binder.ratingRules.hullRateFixedWing}%</div>}
                                    {binder.ratingRules.hullRateRotaryWing > 0 && <div>Hull RW Rate: {binder.ratingRules.hullRateRotaryWing}%</div>}


                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Binder Builder — multi-market panel stacking */}
                      {allBinders && setBinBuilderSelections && (() => {
                        const builderEligible = (allBinders as Binder[]).filter(
                          (b: Binder) => b.productCode === productCode && b.status === "active" && ((b.combinedLineLimitFW && b.combinedLineLimitFW > 0) || (b.combinedLineLimitRW && b.combinedLineLimitRW > 0))
                        );
                        if (builderEligible.length < 2) return null;
                        const existingPanel = binderBuilderSelections?.[productCode];
                        return (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Layers className="size-3" /> Binder Builder
                              <span className="text-[10px] font-normal text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded ml-1">Multi-Market</span>
                            </p>
                            {existingPanel && existingPanel.length > 0 ? (
                              <div className="bg-indigo-50 border-2 border-indigo-400 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Check className="size-4 text-indigo-600" />
                                    <span className="text-sm font-bold text-indigo-900">Panel Assembled — {existingPanel.length} market{existingPanel.length !== 1 ? "s" : ""}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setShowBinderBuilder(productCode)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2">Edit Panel</button>
                                    <button type="button" onClick={() => { setBinBuilderSelections(prev => { const n = { ...prev }; delete n[productCode]; return n; }); }} className="text-xs text-red-500 hover:text-red-700 font-medium underline underline-offset-2">Remove</button>
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  {existingPanel.map((sel: BinderSelection) => (
                                    <div key={sel.binderId} className="flex items-center justify-between text-xs bg-white rounded-md px-3 py-2 border border-indigo-200">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{sel.binderName}</span>
                                        <span className="text-gray-400">{sel.binderRef}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-indigo-700 font-semibold">{sel.linePercent.toFixed(2)}%</span>
                                        <span className="text-gray-600">{sel.currency} {sel.premium.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-indigo-200 text-sm">
                                  <span className="text-indigo-700 font-medium">Total:</span>
                                  <div className="flex items-center gap-4">
                                    <span className="font-bold text-indigo-900">{existingPanel.reduce((s: number, sel: BinderSelection) => s + sel.linePercent, 0).toFixed(2)}%</span>
                                    <span className="font-bold text-indigo-900">{existingPanel[0]?.currency || "USD"} {existingPanel.reduce((s: number, sel: BinderSelection) => s + sel.premium, 0).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (setSelectedBinders) { setSelectedBinders(prev => { const n = { ...prev }; delete n[productCode]; return n; }); }
                                  setSelectedLineslips(prev => { const n = { ...prev }; delete n[productCode]; return n; });
                                  setShowBinderBuilder(productCode);
                                }}
                                className="w-full p-4 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-3 group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Layers className="size-4 text-white" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-indigo-700 group-hover:text-indigo-900">Open Binder Builder</p>
                                  <p className="text-[10px] text-gray-500">Stack {builderEligible.length} eligible binder markets to reach 100% order</p>
                                </div>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>

        {/* Binder Builder Modal */}
        {showBinderBuilder && allBinders && setBinBuilderSelections && (
          <BinderBuilder
            placement={{ draftData: { fleet, aircraftSparesAmount, pphLimit }, productCode: showBinderBuilder } as any}
            binders={allBinders}
            productCode={showBinderBuilder}
            onConfirm={(sels) => {
              setBinBuilderSelections(prev => ({ ...prev, [showBinderBuilder!]: sels }));
              if (setSelectedBinders) { setSelectedBinders(prev => { const n = { ...prev }; delete n[showBinderBuilder!]; return n; }); }
              setSelectedLineslips(prev => { const n = { ...prev }; delete n[showBinderBuilder!]; return n; });
              setShowBinderBuilder(null);
            }}
            onCancel={() => setShowBinderBuilder(null)}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-5 border-t border-gray-200 mt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md px-6 py-2.5 text-sm font-medium"
          >
            {selectedMainCoverages.includes('UAS') ? '← Back to Claims History' : shouldSkipStep3 ? '← Back to Claims History' : shouldSkipStep5 ? '← Back to Claims History' : '← Back to Sub-Limits'}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmitClick}
            disabled={!selectedMainCoveragesForLineslips.every(productCode => {
              const eligibleLineslips = getEligibleLineslips(productCode);
              const eligibleBindersList = getEligibleBinders ? getEligibleBinders(productCode) : [];
              const hasLineslip = eligibleLineslips.length > 0 && selectedLineslips[productCode];
              const hasBinder = eligibleBindersList.length > 0 && selectedBinders?.[productCode];
              const hasBuilderPanel = binderBuilderSelections?.[productCode]?.length > 0;
              return hasLineslip || hasBinder || hasBuilderPanel;
            }) || isSubmitting}
            className="bg-[#004225] hover:bg-[#003319] text-white font-medium rounded-md px-10 py-2.5 text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Placement →'
            )}
          </Button>
        </div>
      </div>

      {/* Duty of Disclosure Modal */}
      {showDutyOfDisclosure && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-[#004225] rounded-full" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Duty of Disclosure</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Important Legal Notice</p>
                </div>
              </div>
              <button
                onClick={() => setShowDutyOfDisclosure(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Important Legal Notice */}
              <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-4">
                <p className="text-[#92400E] font-semibold mb-2">Important Legal Notice</p>
                <p className="text-[#92400E] text-sm leading-relaxed">
                  You must disclose all material facts that could influence an underwriter's decision to accept this risk and the terms offered.
                </p>
              </div>

              {/* Your Duty of Disclosure */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-base">Your Duty of Disclosure:</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-1">•</span>
                    <span className="text-sm leading-relaxed">All information provided must be true, complete, and accurate to the best of your knowledge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-1">•</span>
                    <span className="text-sm leading-relaxed">You must disclose any material facts that could affect the underwriter's assessment of risk</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-1">•</span>
                    <span className="text-sm leading-relaxed">You must disclose any previous insurance claims, losses, or incidents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-1">•</span>
                    <span className="text-sm leading-relaxed">Failure to disclose material facts may result in the policy being voided or claims being denied</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-1">•</span>
                    <span className="text-sm leading-relaxed">If you're uncertain whether something is material, you should disclose it</span>
                  </li>
                </ul>
              </div>

              {/* Confirmation Box */}
              <div className="bg-[#F3F4F6] rounded-lg p-5">
                <p className="text-gray-700 text-sm mb-3 font-medium">
                  By submitting this placement, you confirm that:
                </p>
                <ul className="space-y-2.5 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-0.5">•</span>
                    <span className="text-sm">All information provided is true and accurate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-0.5">•</span>
                    <span className="text-sm">All material facts have been disclosed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-0.5">•</span>
                    <span className="text-sm">You understand your ongoing duty to disclose any changes to material facts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-900 mt-0.5">•</span>
                    <span className="text-sm">You accept the terms and conditions of the selected lineslip(s)</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={() => setShowDutyOfDisclosure(false)}
                className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 px-5 py-2.5 rounded-md text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSubmit}
                className="bg-[#004225] hover:bg-[#003319] text-white font-medium px-6 py-2.5 rounded-md text-sm"
              >
                I Confirm & Submit Placement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}