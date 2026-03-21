import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";

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

interface ClaimsHistoryModalProps {
  showClaimForm: boolean;
  setShowClaimForm: (show: boolean) => void;
  tempClaim: Claim;
  setTempClaim: (claim: Claim | ((prev: Claim) => Claim)) => void;
  editingClaimIndex: number | null;
  setEditingClaimIndex: (index: number | null) => void;
  claimsHistory: Claim[];
  setClaimsHistory: (claims: Claim[] | ((prev: Claim[]) => Claim[])) => void;
  setHasClaimsHistory: (has: boolean) => void;
  selectedMainCoverages: string[];
  selectedSubCoverages: string[];
  handleSaveClaim: (claim: Claim, isEditing: boolean) => void;
}

export function ClaimsHistoryModal({
  showClaimForm,
  setShowClaimForm,
  tempClaim,
  setTempClaim,
  editingClaimIndex,
  setEditingClaimIndex,
  claimsHistory,
  setClaimsHistory,
  setHasClaimsHistory,
  selectedMainCoverages,
  selectedSubCoverages,
  handleSaveClaim
}: ClaimsHistoryModalProps) {
  const handleCancel = () => {
    setShowClaimForm(false);
    setEditingClaimIndex(null);
    setTempClaim({
      claimDate: "",
      claimType: "",
      claimTypeOther: "",
      amountClaimed: "",
      amountClaimedCurrency: "USD",
      amountPaid: "",
      amountPaidCurrency: "USD",
      claimStatus: "open",
      description: ""
    });
  };

  const handleSave = () => {
    const isValidClaim = tempClaim.claimDate && 
                        tempClaim.claimType && 
                        tempClaim.amountPaid &&
                        tempClaim.description.trim();
    
    if (isValidClaim) {
      handleSaveClaim(tempClaim, editingClaimIndex !== null);
      handleCancel();
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const formatNumberWithCommas = (value: string): string => {
    if (!value) return "";
    const numericValue = value.replace(/,/g, "");
    if (isNaN(Number(numericValue))) return value;
    return Number(numericValue).toLocaleString("en-US");
  };

  return (
    <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
      <DialogContent className="bg-white border-gray-200 max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {editingClaimIndex !== null ? "Edit Claim Details" : "Add Claim Details"}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Enter the details of the previous claim below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Claim Date */}
            <div className="space-y-2">
              <Label htmlFor="claimDate" className="text-gray-900 text-sm font-medium">
                Claim Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="claimDate"
                type="date"
                value={tempClaim.claimDate}
                onChange={(e) => setTempClaim(prev => ({ ...prev, claimDate: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0]}
                className="bg-white border-gray-300 text-gray-900 focus:border-[#004225] focus:ring-[#004225] rounded-lg h-11"
              />
            </div>

            {/* Product Line */}
            <div className="space-y-2">
              <Label htmlFor="claimType" className="text-gray-900 text-sm font-medium">
                Product Line <span className="text-red-500">*</span>
              </Label>
              <Select
                value={tempClaim.claimType}
                onValueChange={(value) => setTempClaim(prev => ({ ...prev, claimType: value }))}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 focus:border-[#004225] focus:ring-[#004225] rounded-lg h-11">
                  <SelectValue placeholder="Select product line" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {(() => {
                    const productLines = [
                      { value: "HL", label: "HL - Hull and Liability" },
                      { value: "HW", label: "Hull War - Hull War" },
                      { value: "PA", label: "PA - Personal Accident" },
                      { value: "LOL", label: "LOL - Loss of Licence" },
                      { value: "HD", label: "HD - Hull Deductible" },
                      { value: "UAS", label: "UAS - Drone Insurance" }
                    ];
                    
                    // Combine main coverages and sub coverages
                    const allSelectedCoverages = [...selectedMainCoverages, ...selectedSubCoverages];
                    
                    // Filter to only show selected coverages
                    return productLines
                      .filter(pl => allSelectedCoverages.includes(pl.value))
                      .map(pl => (
                        <SelectItem key={pl.value} value={pl.value} className="text-gray-900 hover:bg-gray-100">
                          {pl.label}
                        </SelectItem>
                      ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount Incurred */}
          <div className="space-y-2">
            <Label htmlFor="amountIncurred" className="text-gray-900 text-sm font-medium">
              Amount Incurred <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-3">
              <Select
                value={tempClaim.amountPaidCurrency}
                onValueChange={(value) => setTempClaim(prev => ({ ...prev, amountPaidCurrency: value }))}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 focus:border-[#004225] focus:ring-[#004225] rounded-lg w-28 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="USD" className="text-gray-900 hover:bg-gray-100">USD</SelectItem>
                  <SelectItem value="EUR" className="text-gray-900 hover:bg-gray-100">EUR</SelectItem>
                  <SelectItem value="GBP" className="text-gray-900 hover:bg-gray-100">GBP</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="amountIncurred"
                value={tempClaim.amountPaid}
                onChange={(e) => {
                  const formatted = formatNumberWithCommas(e.target.value);
                  setTempClaim(prev => ({ ...prev, amountPaid: formatted }));
                }}
                placeholder="Enter amount"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225] rounded-lg flex-1 h-11"
              />
            </div>
          </div>

          {/* Claim Status */}
          <div className="space-y-2">
            <Label htmlFor="claimStatus" className="text-gray-900 text-sm font-medium">
              Claim Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={tempClaim.claimStatus}
              onValueChange={(value) => setTempClaim(prev => ({ ...prev, claimStatus: value }))}
            >
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 focus:border-[#004225] focus:ring-[#004225] rounded-lg h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="open" className="text-gray-900 hover:bg-gray-100">Open</SelectItem>
                <SelectItem value="closed" className="text-gray-900 hover:bg-gray-100">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="claimDescription" className="text-gray-900 text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="claimDescription"
              value={tempClaim.description}
              onChange={(e) => setTempClaim(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Provide additional details about the claim..."
              rows={4}
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225] rounded-lg resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-[#004225] hover:bg-[#003319] text-white rounded-lg px-6"
          >
            {editingClaimIndex !== null ? "Update Claim" : "Add Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}