import { Button } from "./ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ClaimsHistoryModal } from "./ClaimsHistoryModal";

interface Claim {
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

interface HullWarClaimsHistoryStepProps {
  claimsHistory: Claim[];
  setClaimsHistory: (claims: Claim[] | ((prev: Claim[]) => Claim[])) => void;
  showClaimForm: boolean;
  setShowClaimForm: (show: boolean) => void;
  tempClaim: Claim;
  setTempClaim: (claim: Claim | ((prev: Claim) => Claim)) => void;
  editingClaimIndex: number | null;
  setEditingClaimIndex: (index: number | null) => void;
  setHasClaimsHistory: (has: boolean) => void;
  selectedMainCoverages: string[];
  selectedSubCoverages: string[];
  onBack: () => void;
  onContinue: () => void;
  formatNumberWithCommas: (value: string) => string;
  stepNumber?: number;
  totalSteps?: number;
}

export function HullWarClaimsHistoryStep({
  claimsHistory,
  setClaimsHistory,
  showClaimForm,
  setShowClaimForm,
  tempClaim,
  setTempClaim,
  editingClaimIndex,
  setEditingClaimIndex,
  setHasClaimsHistory,
  selectedMainCoverages,
  selectedSubCoverages,
  onBack,
  onContinue,
  formatNumberWithCommas,
  stepNumber,
  totalSteps
}: HullWarClaimsHistoryStepProps) {
  const handleEditClaim = (index: number) => {
    setTempClaim(claimsHistory[index]);
    setEditingClaimIndex(index);
    setShowClaimForm(true);
  };

  const handleDeleteClaim = (index: number) => {
    setClaimsHistory(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveClaim = (claim: Claim, isEditing: boolean) => {
    if (isEditing && editingClaimIndex !== null) {
      setClaimsHistory(prev => prev.map((c, i) => i === editingClaimIndex ? claim : c));
    } else {
      setClaimsHistory(prev => [...prev, claim]);
    }
    setHasClaimsHistory(true);
    setEditingClaimIndex(null);
  };

  const getProductName = (code: string) => {
    const productMap: Record<string, string> = {
      'HL': 'Hull and Liability',
      'HW': 'Hull War',
      'PA': 'Personal Accident',
      'LOL': 'Loss of Licence',
      'HD': 'Hull Deductible',
      'UAS': 'Drone Insurance'
    };
    return productMap[code] || code;
  };

  const currentStep = stepNumber || 4;
  const totalStepsCount = totalSteps || 5;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Claims History</h1>
              <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                Step {currentStep} of {totalStepsCount} &middot; Provide details of any previous claims
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#004225] bg-green-50 border border-green-200 rounded-md px-3 py-1.5 uppercase tracking-wider">
            Step {currentStep}/{totalStepsCount}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Claims History Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 bg-[#004225] rounded-full" />
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Claims History</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Previous claims in last 5 years</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setShowClaimForm(true)}
                className="bg-[#004225] hover:bg-[#003319] text-white rounded-md h-8 px-3 text-xs font-medium"
              >
                <Plus className="size-3.5 mr-1.5" />
                Add Claim
              </Button>
            </div>
          </div>

          <div className="p-5">
            {claimsHistory.length > 0 && (
              <div className="space-y-3">
                {claimsHistory.map((claim, index) => (
                  <div key={index} className="bg-gray-50/80 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-6">
                        <div className="space-y-0.5">
                          <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Date</p>
                          <p className="text-gray-900 font-medium text-sm">
                            {new Date(claim.claimDate).toLocaleDateString('en-GB', { 
                              day: '2-digit', month: '2-digit', year: 'numeric' 
                            }).replace(/\//g, '/')}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Product</p>
                          <p className="text-gray-900 font-medium text-sm">{getProductName(claim.claimType)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Amount</p>
                          <p className="text-gray-900 font-medium text-sm">
                            {claim.amountPaidCurrency} {formatNumberWithCommas(claim.amountPaid)}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Status</p>
                          <p className={`font-medium capitalize text-sm ${claim.claimStatus === 'open' ? 'text-amber-600' : 'text-gray-600'}`}>
                            {claim.claimStatus}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClaim(index)}
                          className="text-gray-500 hover:text-[#004225] hover:bg-[#004225]/5 h-7 w-7 p-0 rounded-md"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClaim(index)}
                          className="text-gray-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 rounded-md"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    {claim.description && (
                      <div className="pt-2.5 border-t border-gray-100">
                        <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider mb-0.5">Description</p>
                        <p className="text-gray-700 text-sm">{claim.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {claimsHistory.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm">No claims added yet. Click "Add Claim" to add a claim.</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-5 border-t border-gray-200 mt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md px-6 py-2.5 text-sm font-medium"
          >
            ← Back to {selectedMainCoverages.includes('UAS') ? 'Drone' : 'Aircraft'} Details
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="bg-[#004225] hover:bg-[#003319] text-white font-medium rounded-md px-8 py-2.5 text-sm transition-all duration-200"
          >
            Continue to Step {currentStep + 1} →
          </Button>
        </div>
      </div>

      {/* Claims History Modal */}
      <ClaimsHistoryModal
        showClaimForm={showClaimForm}
        setShowClaimForm={setShowClaimForm}
        tempClaim={tempClaim}
        setTempClaim={setTempClaim}
        editingClaimIndex={editingClaimIndex}
        setEditingClaimIndex={setEditingClaimIndex}
        claimsHistory={claimsHistory}
        setClaimsHistory={setClaimsHistory}
        setHasClaimsHistory={setHasClaimsHistory}
        selectedMainCoverages={selectedMainCoverages}
        selectedSubCoverages={selectedSubCoverages}
        handleSaveClaim={handleSaveClaim}
      />
    </div>
  );
}
