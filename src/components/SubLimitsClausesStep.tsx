import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Aircraft } from "../types/placementForm";
import { toast } from "sonner";

interface SubLimitsClausesStepProps {
  selectedMainCoverages: string[];
  selectedSubCoverages: string[];
  fleet: Aircraft[];
  medicalExpensesLimit: string;
  setMedicalExpensesLimit: (value: string) => void;
  medicalExpensesCurrency: string;
  setMedicalExpensesCurrency: (value: string) => void;
  cargoLiabilityLimit: string;
  setCargoLiabilityLimit: (value: string) => void;
  cargoLiabilityCurrency: string;
  setCargoLiabilityCurrency: (value: string) => void;
  baggageLimit: string;
  setBaggageLimit: (value: string) => void;
  baggageCurrency: string;
  setBaggageCurrency: (value: string) => void;
  passengerSettlementLimit: string;
  setPassengerSettlementLimit: (value: string) => void;
  passengerSettlementCurrency: string;
  setPassengerSettlementCurrency: (value: string) => void;
  pphLimit: string;
  setPphLimit: (value: string) => void;
  pphCurrency: string;
  setPphCurrency: (value: string) => void;
  noClaimsBonus: boolean;
  setNoClaimsBonus: (value: boolean) => void;
  noClaimsBonusPercentage: string;
  setNoClaimsBonusPercentage: (value: string) => void;
  profitCommission: boolean;
  setProfitCommission: (value: boolean) => void;
  profitCommissionPercentage: string;
  setProfitCommissionPercentage: (value: string) => void;
  profitCommissionBasis: string;
  setProfitCommissionBasis: (value: string) => void;
  cargoEndorsement: boolean;
  setCargoEndorsement: (value: boolean) => void;
  shouldSkipStep3: boolean;
  shouldSkipStep4: boolean;
  onBack: () => void;
  onContinue: () => void;
  formatNumberWithCommas: (value: string) => string;
  removeCommas: (value: string) => string;
  stepNumber?: number;
  totalSteps?: number;
}

export function SubLimitsClausesStep({
  selectedMainCoverages,
  selectedSubCoverages,
  fleet,
  medicalExpensesLimit,
  setMedicalExpensesLimit,
  medicalExpensesCurrency,
  setMedicalExpensesCurrency,
  cargoLiabilityLimit,
  setCargoLiabilityLimit,
  cargoLiabilityCurrency,
  setCargoLiabilityCurrency,
  baggageLimit,
  setBaggageLimit,
  baggageCurrency,
  setBaggageCurrency,
  passengerSettlementLimit,
  setPassengerSettlementLimit,
  passengerSettlementCurrency,
  setPassengerSettlementCurrency,
  pphLimit,
  setPphLimit,
  pphCurrency,
  setPphCurrency,
  noClaimsBonus,
  setNoClaimsBonus,
  noClaimsBonusPercentage,
  setNoClaimsBonusPercentage,
  profitCommission,
  setProfitCommission,
  profitCommissionPercentage,
  setProfitCommissionPercentage,
  profitCommissionBasis,
  setProfitCommissionBasis,
  cargoEndorsement,
  setCargoEndorsement,
  shouldSkipStep3,
  shouldSkipStep4,
  onBack,
  onContinue,
  formatNumberWithCommas,
  removeCommas,
  stepNumber,
  totalSteps,
}: SubLimitsClausesStepProps) {
  const hasHullLiability = selectedMainCoverages.includes("HL");
  const hasPPH = selectedSubCoverages.includes("products_premises_hangarkeepers");

  const currentStep = stepNumber || 5;
  const totalStepsCount = totalSteps || 5;

  // Shared class constants
  const inputClass = "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-8 px-3 text-xs";
  const selectTriggerClass = "w-[80px] bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-50 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-8 text-xs";

  // Section header component
  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3">
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-5 bg-[#004225] rounded-full" />
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  // Page header component
  const PageHeader = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sub-Limits and Clauses</h1>
            <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
              Step {currentStep} of {totalStepsCount} &middot; Sub-limits and policy clauses
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#004225] bg-green-50 border border-green-200 rounded-md px-3 py-1.5 uppercase tracking-wider">
          Step {currentStep}/{totalStepsCount}
        </span>
      </div>
    </div>
  );

  // Navigation component
  const Navigation = ({ onValidate }: { onValidate?: () => void }) => (
    <div className="flex justify-between items-center pt-5 border-t border-gray-200 mt-5">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md px-6 py-2.5 text-sm font-medium"
      >
        {shouldSkipStep3 ? '← Back to LOL Pilot Details' : shouldSkipStep4 ? `← Back to ${selectedMainCoverages.includes('UAS') ? 'Drone' : 'Aircraft'} Details` : '← Back to Pilot Details'}
      </Button>
      <Button
        type="button"
        onClick={onValidate || onContinue}
        className="bg-[#004225] hover:bg-[#003319] text-white font-medium rounded-md px-8 py-2.5 text-sm transition-all duration-200"
      >
        Continue to Step 6 →
      </Button>
    </div>
  );

  // Currency select for sub-limits
  const CurrencySelect = ({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={selectTriggerClass}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border-gray-200">
        <SelectItem value="USD" className="text-gray-900 hover:bg-gray-50 text-xs">USD</SelectItem>
        <SelectItem value="EUR" className="text-gray-900 hover:bg-gray-50 text-xs">EUR</SelectItem>
        <SelectItem value="GBP" className="text-gray-900 hover:bg-gray-50 text-xs">GBP</SelectItem>
      </SelectContent>
    </Select>
  );

  // Check if PPH limit is valid
  const isPphLimitValid = () => {
    if (!hasPPH) return true;
    if (!pphLimit || pphLimit.trim() === "") return false;
    const pphValue = parseFloat(removeCommas(pphLimit));
    for (const aircraft of fleet) {
      if (aircraft.liabilityLimit && aircraft.liabilityLimit.trim() !== "") {
        const aircraftLiabilityValue = parseFloat(removeCommas(aircraft.liabilityLimit));
        if (aircraft.liabilityLimitCurrency === pphCurrency) {
          if (pphValue > aircraftLiabilityValue) return false;
        }
      }
    }
    return true;
  };

  const validateAndContinue = () => {
    if (hasPPH && (!pphLimit || pphLimit.trim() === "")) {
      toast.error("Please enter a liability limit for Products, Premises & Hangarkeepers coverage.");
      return;
    }
    if (hasPPH && pphLimit && pphLimit.trim() !== "") {
      const pphValue = parseFloat(removeCommas(pphLimit));
      for (const aircraft of fleet) {
        if (aircraft.liabilityLimit && aircraft.liabilityLimit.trim() !== "") {
          const aircraftLiabilityValue = parseFloat(removeCommas(aircraft.liabilityLimit));
          if (aircraft.liabilityLimitCurrency === pphCurrency) {
            if (pphValue > aircraftLiabilityValue) {
              toast.error(`Products, Premises & Hangarkeepers limit cannot exceed the aircraft liability limit of ${aircraft.liabilityLimitCurrency} ${formatNumberWithCommas(aircraft.liabilityLimit)} for ${aircraft.registration || 'aircraft'}.`);
              return;
            }
          }
        }
      }
    }
    onContinue();
  };

  // If HL not selected, show skip message
  if (!hasHullLiability) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader />
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <SectionHeader title="Sub-Limits and Clauses" subtitle="This step is only applicable for Hull and Liability coverage" />
            <div className="text-center py-12 px-5">
              <p className="text-gray-400 text-sm">Click Continue to proceed to the next step.</p>
            </div>
          </div>
          <Navigation />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader />

      <div className="space-y-5">
        {/* Sub-Limits Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader title="Sub-Limits" subtitle="Define coverage sub-limits for Hull and Liability policy" />
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Medical and Related Expenses */}
              <div className="space-y-1.5 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                <Label htmlFor="medicalExpenses" className="text-gray-700 text-xs font-semibold">
                  Medical and Related Expenses
                </Label>
                <div className="flex gap-1.5">
                  <CurrencySelect value={medicalExpensesCurrency} onValueChange={setMedicalExpensesCurrency} />
                  <Input
                    id="medicalExpenses"
                    type="text"
                    value={formatNumberWithCommas(medicalExpensesLimit)}
                    onChange={(e) => setMedicalExpensesLimit(removeCommas(e.target.value))}
                    placeholder="Enter limit"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>

              {/* Cargo Legal Liability Limit */}
              <div className="space-y-1.5 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                <Label htmlFor="cargoLiability" className="text-gray-700 text-xs font-semibold">
                  Cargo Legal Liability Limit
                </Label>
                <div className="flex gap-1.5">
                  <CurrencySelect value={cargoLiabilityCurrency} onValueChange={setCargoLiabilityCurrency} />
                  <Input
                    id="cargoLiability"
                    type="text"
                    value={formatNumberWithCommas(cargoLiabilityLimit)}
                    onChange={(e) => {
                      const newValue = removeCommas(e.target.value);
                      setCargoLiabilityLimit(newValue);
                      if (newValue && newValue.trim() !== "") {
                        setCargoEndorsement(true);
                      }
                    }}
                    placeholder="Enter limit"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>

              {/* Baggage and Personal Articles */}
              <div className="space-y-1.5 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                <Label htmlFor="baggage" className="text-gray-700 text-xs font-semibold">
                  Baggage and Personal Articles
                </Label>
                <div className="flex gap-1.5">
                  <CurrencySelect value={baggageCurrency} onValueChange={setBaggageCurrency} />
                  <Input
                    id="baggage"
                    type="text"
                    value={formatNumberWithCommas(baggageLimit)}
                    onChange={(e) => setBaggageLimit(removeCommas(e.target.value))}
                    placeholder="Enter limit"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>

              {/* Passenger Voluntary Settlement */}
              <div className="space-y-1.5 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                <Label htmlFor="passengerSettlement" className="text-gray-700 text-xs font-semibold">
                  Passenger Voluntary Settlement
                </Label>
                <div className="flex gap-1.5">
                  <CurrencySelect value={passengerSettlementCurrency} onValueChange={setPassengerSettlementCurrency} />
                  <Input
                    id="passengerSettlement"
                    type="text"
                    value={formatNumberWithCommas(passengerSettlementLimit)}
                    onChange={(e) => setPassengerSettlementLimit(removeCommas(e.target.value))}
                    placeholder="Enter limit"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clauses Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader title="Clauses" subtitle="Select applicable clauses for this policy" />
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {/* No Claims Bonus (single aircraft) */}
              {fleet.length === 1 && (
                <div className="space-y-2 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <div className="flex items-start space-x-2.5">
                    <Checkbox
                      id="noClaimsBonus"
                      checked={noClaimsBonus}
                      onCheckedChange={(checked) => setNoClaimsBonus(!!checked)}
                      className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225] h-3.5 w-3.5"
                    />
                    <Label htmlFor="noClaimsBonus" className="text-gray-700 text-xs font-semibold cursor-pointer">
                      No Claims Bonus — AVN85
                    </Label>
                  </div>
                  <div className="ml-6 space-y-1">
                    <Label htmlFor="noClaimsBonusPercentage" className="text-gray-500 text-[10px] font-medium">
                      Bonus Percentage (%)
                    </Label>
                    <div className="flex items-center gap-1.5 max-w-xs">
                      <Input
                        id="noClaimsBonusPercentage"
                        type="number" min="0" max="100" step="0.1"
                        value={noClaimsBonusPercentage}
                        onChange={(e) => setNoClaimsBonusPercentage(e.target.value)}
                        placeholder="e.g., 10"
                        disabled={!noClaimsBonus}
                        className={`flex-1 ${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                      <span className="text-gray-500 text-xs">%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Profit Commission (fleet ≥ 2) */}
              {fleet.length >= 2 && (
                <div className="space-y-2 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <div className="flex items-start space-x-2.5">
                    <Checkbox
                      id="profitCommission"
                      checked={profitCommission}
                      onCheckedChange={(checked) => setProfitCommission(!!checked)}
                      className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225] h-3.5 w-3.5"
                    />
                    <Label htmlFor="profitCommission" className="text-gray-700 text-xs font-semibold cursor-pointer">
                      Profit Commission on Renewal Clause
                    </Label>
                  </div>
                  <div className="ml-6 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Input
                          id="profitCommissionPercentage"
                          type="number" min="0" max="100" step="0.1"
                          value={profitCommissionPercentage}
                          onChange={(e) => setProfitCommissionPercentage(e.target.value)}
                          placeholder="e.g., 15"
                          disabled={!profitCommission}
                          className={`w-16 ${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                        <span className="text-gray-500 text-xs">%</span>
                      </div>
                      <span className="text-gray-500 text-[10px]">on a</span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          id="profitCommissionBasis"
                          type="number" min="0" max="100" step="0.1"
                          value={profitCommissionBasis}
                          onChange={(e) => setProfitCommissionBasis(e.target.value)}
                          placeholder="e.g., 70"
                          disabled={!profitCommission}
                          className={`w-16 ${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                        <span className="text-gray-500 text-xs">% Basis</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cargo Legal Liability Endorsement */}
              <div className="flex items-start space-x-2.5 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                <Checkbox
                  id="cargoEndorsement"
                  checked={cargoEndorsement}
                  onCheckedChange={(checked) => setCargoEndorsement(!!checked)}
                  className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225] h-3.5 w-3.5"
                />
                <Label htmlFor="cargoEndorsement" className="text-gray-700 text-xs font-semibold cursor-pointer">
                  Cargo Legal Liability Endorsement — AVN92
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Products, Premises & Hangarkeepers Section */}
        {hasPPH && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <SectionHeader title="Products, Premises & Hangarkeepers" subtitle="Define liability limit for PPH coverage" />
            <div className="p-5">
              <div className="space-y-1.5 p-3 bg-gray-50/80 rounded-lg border border-gray-100 max-w-md">
                <Label htmlFor="pphLimit" className="text-gray-700 text-xs font-semibold">
                  Liability Limit
                </Label>
                <div className="flex gap-1.5">
                  <CurrencySelect value={pphCurrency} onValueChange={setPphCurrency} />
                  <Input
                    id="pphLimit"
                    type="text"
                    value={formatNumberWithCommas(pphLimit)}
                    onChange={(e) => setPphLimit(removeCommas(e.target.value))}
                    placeholder="Enter liability limit"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <Navigation onValidate={validateAndContinue} />
      </div>
    </div>
  );
}
