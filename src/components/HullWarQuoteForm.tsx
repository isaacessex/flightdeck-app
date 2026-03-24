import { useState, useEffect } from "react";
import { Placement, Lineslip, Contact } from "../App";
import { formatNumberWithCommas } from "../utils/placementFormHelpers";
import { HullWarReviewStep } from "./HullWarReviewStep";
import { HullWarClaimsHistoryStep } from "./HullWarClaimsHistoryStep";

/** Matches Claim shape in HullWarClaimsHistoryStep for typed state */
interface HullWarClaim {
  claimDate: string;
  claimType: string;
  claimTypeOther: string;
  amountClaimed: string;
  amountClaimedCurrency: string;
  amountPaid: string;
  amountPaidCurrency: string;
  claimStatus: string;
  description: string;
}

const emptyHullWarClaim = (): HullWarClaim => ({
  claimDate: "",
  claimType: "",
  claimTypeOther: "",
  amountClaimed: "",
  amountClaimedCurrency: "USD",
  amountPaid: "",
  amountPaidCurrency: "USD",
  claimStatus: "",
  description: "",
});

interface HullWarQuoteFormProps {
  onSubmit: (placement: Omit<Placement, "id">) => void;
  onCancel: () => void;
  onSaveDraft: (placement: Omit<Placement, "id">) => void;
  lineslips: Lineslip[];
  contacts: Contact[];
  draftPlacement?: Placement;
  onAddContact: (contactData: Omit<Contact, "id" | "createdDate" | "lastModified">) => void;
}

export function HullWarQuoteForm({
  onSubmit,
  onCancel,
  onSaveDraft,
  lineslips,
  contacts,
  draftPlacement,
  onAddContact,
}: HullWarQuoteFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Basic Information
  const [selectedMainCoverages, setSelectedMainCoverages] = useState<string[]>([]);
  const [insuredName, setInsuredName] = useState("");
  const [riskDetails, setRiskDetails] = useState("");
  const [useOfAircraft, setUseOfAircraft] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedLineslip, setSelectedLineslip] = useState("");
  const [inceptionDate, setInceptionDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  // Step 2: Aircraft Details
  const [fleet, setFleet] = useState<any[]>([]);
  const [totalHullValue, setTotalHullValue] = useState("");
  const [hullValueCurrency, setHullValueCurrency] = useState("USD");
  const [geographicalLimits, setGeographicalLimits] = useState("");
  
  // Step 3: War & Allied Perils Coverage
  const [warPerilsIncluded, setWarPerilsIncluded] = useState(true);
  const [alliedPerils, setAlliedPerils] = useState<string[]>(["confiscation", "hijacking", "terrorism"]);
  const [territorialExclusions, setTerritorialExclusions] = useState("");
  
  // Step 4: Claims History
  const [claimsHistory, setClaimsHistory] = useState<HullWarClaim[]>([]);
  const [generalClaimsInfo, setGeneralClaimsInfo] = useState("");
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [tempClaim, setTempClaim] = useState<HullWarClaim>(emptyHullWarClaim);
  const [editingClaimIndex, setEditingClaimIndex] = useState<number | null>(null);
  const [, setHasClaimsHistory] = useState(false);
  
  // Load draft data if editing
  useEffect(() => {
    if (draftPlacement) {
      const draft = draftPlacement.draftData;
      if (draft) {
        // Load all saved data
        if (draft.selectedMainCoverages) setSelectedMainCoverages(draft.selectedMainCoverages);
        if (draft.insuredName) setInsuredName(draft.insuredName);
        if (draft.riskDetails) setRiskDetails(draft.riskDetails);
        if (draft.useOfAircraft) setUseOfAircraft(draft.useOfAircraft);
        if (draft.selectedContact) setSelectedContact(draft.selectedContact);
        if (draft.selectedLineslip) setSelectedLineslip(draft.selectedLineslip);
        if (draft.inceptionDate) setInceptionDate(draft.inceptionDate);
        if (draft.expiryDate) setExpiryDate(draft.expiryDate);
        if (draft.fleet) setFleet(draft.fleet);
        if (draft.totalHullValue) setTotalHullValue(draft.totalHullValue);
        if (draft.hullValueCurrency) setHullValueCurrency(draft.hullValueCurrency);
        if (draft.geographicalLimits) setGeographicalLimits(draft.geographicalLimits);
        if (draft.warPerilsIncluded !== undefined) setWarPerilsIncluded(draft.warPerilsIncluded);
        if (draft.alliedPerils) setAlliedPerils(draft.alliedPerils);
        if (draft.territorialExclusions) setTerritorialExclusions(draft.territorialExclusions);
        if (draft.claimsHistory) {
          setClaimsHistory(draft.claimsHistory as HullWarClaim[]);
          setHasClaimsHistory(draft.claimsHistory.length > 0);
        }
        if (draft.generalClaimsInfo) setGeneralClaimsInfo(draft.generalClaimsInfo);
      }
    }
  }, [draftPlacement]);

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSaveDraft = () => {
    const productCode = selectedMainCoverages?.includes('HD') ? 'HD' : 'HW';
    
    const draftData = {
      selectedMainCoverages,
      insuredName,
      riskDetails,
      useOfAircraft,
      selectedContact,
      selectedLineslip,
      inceptionDate,
      expiryDate,
      fleet,
      totalHullValue,
      hullValueCurrency,
      geographicalLimits,
      warPerilsIncluded,
      alliedPerils,
      territorialExclusions,
      claimsHistory,
      generalClaimsInfo,
    };

    const placement = {
      productCode,
      productName: productCode === 'HD' ? 'Hull Deductible' : 'Hull War',
      insuredName,
      inceptionDate,
      status: "draft" as const,
      underwriter: "",
      createdDate: new Date().toISOString().split("T")[0],
      draftData,
    } as Omit<Placement, "id">;

    onSaveDraft(placement);
  };

  const handleSubmit = () => {
    const productCode = selectedMainCoverages?.includes('HD') ? 'HD' : 'HW';
    
    const draftData = {
      selectedMainCoverages,
      insuredName,
      riskDetails,
      useOfAircraft,
      selectedContact,
      selectedLineslip,
      inceptionDate,
      expiryDate,
      fleet,
      totalHullValue,
      hullValueCurrency,
      geographicalLimits,
      warPerilsIncluded,
      alliedPerils,
      territorialExclusions,
      claimsHistory,
      generalClaimsInfo,
    };

    const placement = {
      productCode,
      productName: productCode === 'HD' ? 'Hull Deductible' : 'Hull War',
      insuredName,
      inceptionDate,
      status: "pending" as const,
      underwriter: "",
      createdDate: new Date().toISOString().split("T")[0],
      draftData,
    } as Omit<Placement, "id">;

    onSubmit(placement);
  };

  // Render different steps
  if (currentStep === 4) {
    return (
      <HullWarClaimsHistoryStep
        claimsHistory={claimsHistory}
        setClaimsHistory={setClaimsHistory}
        showClaimForm={showClaimForm}
        setShowClaimForm={setShowClaimForm}
        tempClaim={tempClaim}
        setTempClaim={setTempClaim}
        editingClaimIndex={editingClaimIndex}
        setEditingClaimIndex={setEditingClaimIndex}
        setHasClaimsHistory={setHasClaimsHistory}
        selectedMainCoverages={selectedMainCoverages}
        selectedSubCoverages={[]}
        onBack={handleBack}
        onContinue={handleNext}
        formatNumberWithCommas={formatNumberWithCommas}
        stepNumber={4}
        totalSteps={5}
      />
    );
  }

  if (currentStep === 5) {
    return (
      <HullWarReviewStep
        placementType="insurance"
        policyStartDate={inceptionDate}
        policyEndDate={expiryDate}
        fleet={fleet}
        claimsHistory={claimsHistory}
        onBack={handleBack}
        onSubmit={handleSubmit}
        isSubmitting={false}
        formatNumberWithCommas={formatNumberWithCommas}
        insuredName={insuredName}
        selectedMainCoverages={selectedMainCoverages}
      />
    );
  }

  // TODO: Implement Steps 1-3
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Hull War Quote Form - Step {currentStep} of 5
          </h2>
          <p className="text-gray-600 mb-6">
            Steps 1-3 coming soon...
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {currentStep < 4 && (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-[#004225] text-white rounded-lg hover:bg-[#003319]"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
