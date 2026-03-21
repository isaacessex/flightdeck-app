import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Shield, Plane, Calendar, FileText, AlertTriangle, Users, CheckCircle2, Sparkles, Upload, X, Globe } from "lucide-react";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

interface HullWarReviewStepProps {
  placementType: string;
  policyStartDate: string;
  policyEndDate: string;
  fleet: any[];
  claimsHistory: any[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  formatNumberWithCommas: (value: string) => string;
  insuredName?: string;
  insuredAddressLine1?: string;
  insuredCity?: string;
  insuredCountry?: string;
  insuredPostcode?: string;
  reinsuredName?: string;
  reinsuredAddressLine1?: string;
  reinsuredCity?: string;
  reinsuredCountry?: string;
  reinsuredPostcode?: string;
  additionalInsureds?: Array<{
    name: string;
    addressLine1: string;
    city: string;
    country: string;
    postcode: string;
  }>;
  isDirect?: boolean;
  producingBroker?: string;
  inceptionTime?: string;
  expiryTime?: string;
  timeZoneOption?: string;
  bothDatesIncluded?: boolean;
  supportingDocuments?: File[];
  setSupportingDocuments?: (docs: File[] | ((prev: File[]) => File[])) => void;
  selectedLineslips?: Record<string, string>;
  setSelectedLineslips?: (value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  getEligibleLineslips?: (productCode: string) => any[];
  selectedMainCoverages?: string[];
  // Binder Selection
  selectedBinders?: Record<string, string>;
  setSelectedBinders?: (value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  getEligibleBinders?: (productCode: string) => any[];
}

export function HullWarReviewStep({
  placementType,
  policyStartDate,
  policyEndDate,
  fleet,
  claimsHistory,
  onBack,
  onSubmit,
  isSubmitting,
  formatNumberWithCommas,
  insuredName,
  insuredAddressLine1,
  insuredCity,
  insuredCountry,
  insuredPostcode,
  reinsuredName,
  reinsuredAddressLine1,
  reinsuredCity,
  reinsuredCountry,
  reinsuredPostcode,
  additionalInsureds,
  isDirect,
  producingBroker,
  inceptionTime,
  expiryTime,
  timeZoneOption,
  bothDatesIncluded,
  supportingDocuments,
  setSupportingDocuments,
  selectedLineslips,
  setSelectedLineslips,
  getEligibleLineslips,
  selectedMainCoverages,
  // Binder Selection
  selectedBinders,
  setSelectedBinders,
  getEligibleBinders
}: HullWarReviewStepProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Determine the product code based on selected coverage
  const productCode = selectedMainCoverages?.includes('HD') ? 'HD' : 'HW';
  const coverageTypeName = selectedMainCoverages?.includes('HD') ? 'Hull Deductible' : 'Hull War';

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 backdrop-blur-sm border-slate-700/50 rounded-2xl shadow-2xl shadow-black/30">
        <CardHeader className="pb-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl text-white">Get a Quote</CardTitle>
              <CardDescription className="text-slate-400 text-lg mt-2">
                Step 5 of 5 - Review
              </CardDescription>
            </div>
            <div className="text-slate-400 text-sm">
              Step 5/5
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <h3 className="text-white text-xl font-semibold flex items-center gap-2">
              <Shield className="size-5 text-orange-400" />
              Placement Summary
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-slate-400 text-sm">Coverage Type</p>
                  <p className="text-white font-semibold text-base">
                    {coverageTypeName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-sm">Placement Type</p>
                  <p className="text-white font-semibold text-base capitalize">
                    {placementType || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-slate-400 text-sm">Producing Broker</p>
                  <p className="text-white font-semibold text-base">
                    {isDirect ? "Direct" : (producingBroker || "—")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-sm">Aircraft in Fleet</p>
                  <p className="text-white font-semibold text-base">{fleet.length}</p>
                </div>
              </div>

              {/* Insured Details */}
              {insuredName && (
                <div className="pt-3 border-t border-slate-700/30">
                  <p className="text-slate-400 text-xs mb-2 flex items-center gap-2">
                    <Users className="size-3.5" />
                    {placementType === "reinsurance" ? "Insured" : "Insured"}
                  </p>
                  <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3 space-y-1.5">
                    <p className="text-white font-semibold text-sm">{insuredName}</p>
                    {insuredAddressLine1 && (
                      <div className="text-xs text-slate-300 space-y-0.5">
                        <p>{insuredAddressLine1}</p>
                        <p>{[insuredCity, insuredCountry, insuredPostcode].filter(Boolean).join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Insureds */}
              {additionalInsureds && additionalInsureds.length > 0 && (
                <div className="pt-2">
                  <p className="text-slate-400 text-xs mb-2">Additional Insureds ({additionalInsureds.length})</p>
                  <div className="space-y-2">
                    {additionalInsureds.map((insured, index) => (
                      <div key={index} className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3 space-y-1.5">
                        <p className="text-white font-semibold text-sm">{insured.name}</p>
                        {insured.addressLine1 && (
                          <div className="text-xs text-slate-400 space-y-0.5">
                            <p>{insured.addressLine1}</p>
                            <p>{[insured.city, insured.country, insured.postcode].filter(Boolean).join(", ")}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reinsured Details */}
              {placementType === "reinsurance" && reinsuredName && (
                <div className="pt-3 border-t border-slate-700/30">
                  <p className="text-slate-400 text-xs mb-2">Reinsured</p>
                  <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3 space-y-1.5">
                    <p className="text-white font-semibold text-sm">{reinsuredName}</p>
                    {reinsuredAddressLine1 && (
                      <div className="text-xs text-slate-300 space-y-0.5">
                        <p>{reinsuredAddressLine1}</p>
                        <p>{[reinsuredCity, reinsuredCountry, reinsuredPostcode].filter(Boolean).join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Policy Period */}
              <div className="pt-3 border-t border-slate-700/30">
                <p className="text-slate-400 text-xs mb-2 flex items-center gap-2">
                  <Calendar className="size-3.5" />
                  Policy Period
                </p>
                <div className="space-y-1">
                  <p className="text-white font-semibold text-sm">
                    {policyStartDate && policyEndDate
                      ? `${new Date(policyStartDate).toLocaleDateString('en-GB')} to ${new Date(policyEndDate).toLocaleDateString('en-GB')}`
                      : "—"}
                  </p>
                  {inceptionTime && expiryTime && (
                    <p className="text-slate-300 text-xs">
                      {inceptionTime} to {expiryTime} ({timeZoneOption === "original-insured" ? "Original Insured Time" : timeZoneOption === "utc" ? "UTC" : "Local Time"})
                    </p>
                  )}
                  {bothDatesIncluded && (
                    <p className="text-slate-400 text-xs">Both days included</p>
                  )}
                </div>
              </div>

              {/* Fleet Details */}
              {fleet.length > 0 && (
                <div className="pt-4 border-t border-slate-700/30">
                  <p className="text-slate-400 text-sm mb-3 flex items-center gap-2">
                    <Plane className="size-4" />
                    Fleet Details ({fleet.length} Aircraft)
                  </p>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {fleet.map((aircraft, index) => (
                      <div key={index} className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-4">
                        {/* All fields in one row */}
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <p className="text-slate-400 text-xs mb-1">Item</p>
                            <p className="text-white text-sm font-semibold">
                              {index + 1}
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-400 text-xs mb-1">Registration</p>
                            <p className="text-white text-sm">
                              {aircraft.registration || "—"}
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-400 text-xs mb-1">Make / Model</p>
                            <p className="text-white text-sm">
                              {[aircraft.make, aircraft.model].filter(Boolean).join(" ") || "—"}
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-400 text-xs mb-1">Base Country / Region</p>
                            <p className="text-white text-sm">
                              {aircraft.baseCountry 
                                ? `${aircraft.baseCountry}${aircraft.baseRegion ? ` / ${aircraft.baseRegion}` : ''}`
                                : "—"}
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-400 text-xs mb-1">Sums Reinsured</p>
                            <p className="text-white text-sm">
                              {aircraft.sumsReinsured ? `${aircraft.sumsReinsuredCurrency || 'USD'} ${formatNumberWithCommas(aircraft.sumsReinsured)}` : "—"}
                            </p>
                          </div>
                          
                          {/* Excluded Countries Button */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg hover:bg-slate-700/60 hover:border-red-500/50 transition-all duration-200 group">
                                <Globe className="size-4 text-red-400 group-hover:text-red-300" />
                                <span className="text-slate-300 text-xs font-medium">Excluded</span>
                                <span className="text-white text-sm font-semibold">
                                  {aircraft.excludedCountries?.length || 0}
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto bg-slate-800 border-slate-700 p-3" align="start">
                              <div className="space-y-2">
                                <p className="text-slate-400 text-xs font-semibold">Flying to Excluded Countries</p>
                                {aircraft.excludedCountries && aircraft.excludedCountries.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {aircraft.excludedCountries.map((country: string, countryIndex: number) => (
                                      <Badge key={countryIndex} className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                        {country}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-500 text-xs">No excluded countries</p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claims History */}
              <div className="pt-4 border-t border-slate-700/30">
                <p className="text-slate-400 text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  Claims History {claimsHistory.length > 0 && `(${claimsHistory.length} Previous Claims)`}
                </p>
                {claimsHistory.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {claimsHistory.map((claim, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="grid grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-slate-400 text-xs mb-1">Date</p>
                            <p className="text-white text-sm">
                              {claim.claimDate ? new Date(claim.claimDate).toLocaleDateString('en-GB') : 
                               claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString('en-GB') : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs mb-1">Product</p>
                            <p className="text-white text-sm">
                              {claim.claimType === "Other" && claim.claimTypeOther ? claim.claimTypeOther : claim.claimType || claim.product || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs mb-1">Amount</p>
                            <p className="text-white text-sm">
                              {claim.amountPaid ? `${claim.amountPaidCurrency || claim.currency || 'USD'} ${formatNumberWithCommas(claim.amountPaid)}` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs mb-1">Status</p>
                            <Badge className={`text-xs ${
                              claim.claimStatus === 'Settled' || claim.status === 'Settled' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              claim.claimStatus === 'Pending' || claim.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              (claim.claimStatus === 'closed' || claim.status === 'closed' || claim.claimStatus === 'Closed' || claim.status === 'Closed') ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }`}>
                              {(claim.claimStatus === 'closed' || claim.status === 'closed' || claim.claimStatus === 'Closed' || claim.status === 'Closed') 
                                ? 'CLOSED' 
                                : (claim.claimStatus || claim.status || "—")}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs mb-1">Description</p>
                          <p className="text-white text-sm">
                            {claim.description || claim.circumstances || "—"}
                          </p>
                        </div>
                        {claim.circumstances && claim.description && (
                          <div className="pt-3 border-t border-red-500/10 mt-3">
                            <p className="text-slate-400 text-xs mb-1">Circumstances</p>
                            <p className="text-slate-300 text-xs">{claim.circumstances}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-400 text-sm font-medium">No Claims within last 5 years</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supporting Documents */}
          <div className="space-y-4">
            <Label className="text-white text-lg font-semibold">Supporting Documents</Label>
            <p className="text-slate-400 text-sm">Upload any relevant documents (aircraft logs, maintenance records, previous policies, etc.)</p>
            
            <div className="relative">
              <label
                htmlFor="supportingDocs"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600/50 rounded-xl cursor-pointer bg-slate-800/30 hover:bg-slate-800/50 hover:border-orange-500/50 transition-all duration-200 group"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="size-10 text-slate-400 mb-3 group-hover:text-orange-400 transition-colors" />
                  <p className="mb-2 text-sm text-slate-300 font-semibold">
                    <span className="text-orange-400">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-400">
                    PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG (Max 10MB per file)
                  </p>
                </div>
                <Input
                  id="supportingDocs"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (setSupportingDocuments) {
                      const files = Array.from(e.target.files || []);
                      setSupportingDocuments((prev) => [...prev, ...files]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {supportingDocuments && supportingDocuments.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-slate-300 text-sm font-semibold">Uploaded Documents ({supportingDocuments.length}):</p>
                <div className="space-y-2">
                  {supportingDocuments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/60 to-slate-800/40 border border-slate-700/50 rounded-xl hover:border-slate-600/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <FileText className="size-5 text-orange-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-medium">{file.name}</span>
                          <span className="text-slate-400 text-xs">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (setSupportingDocuments) {
                            setSupportingDocuments((prev) =>
                              prev.filter((_, i) => i !== index)
                            );
                          }
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

          {/* Lineslip Selection */}
          {getEligibleLineslips && (
            <div className="space-y-4">
              <h3 className="text-white text-xl font-semibold">Select Lineslip</h3>
              <p className="text-slate-400 text-sm">
                Select which lineslip to submit this {coverageTypeName} placement to. Only lineslips that can accommodate your entered limits are shown.
              </p>
              
              {(() => {
                const eligibleLineslips = getEligibleLineslips(productCode);
                
                return eligibleLineslips.length === 0 ? (
                  <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <p className="text-red-300 text-sm">
                      ⚠️ No active lineslips available for {coverageTypeName} that can accommodate your entered limits.
                      Please contact an underwriter or reduce your limit requirements.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eligibleLineslips.map(lineslip => (
                      <label
                        key={lineslip.id}
                        className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedLineslips?.[productCode] === lineslip.id
                            ? "bg-orange-500/10 border-orange-500/50"
                            : "bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50"
                        }`}
                        onClick={() => {
                          if (setSelectedLineslips) {
                            setSelectedLineslips(prev => ({ ...prev, [productCode]: lineslip.id }));
                          }
                        }}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedLineslips?.[productCode] === lineslip.id
                            ? "border-orange-500"
                            : "border-slate-500"
                        }`}>
                          {selectedLineslips?.[productCode] === lineslip.id && (
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-semibold">{lineslip.name}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-2 py-1 bg-green-900/30 border border-green-700/50 text-green-300 rounded">
                                {lineslip.reference}
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Binder Selection */}
          {getEligibleBinders && (
            <div className="space-y-4">
              <h3 className="text-white text-xl font-semibold">Select Binder</h3>
              <p className="text-slate-400 text-sm">
                Select which binder to submit this {coverageTypeName} placement to. Only binders that can accommodate your entered limits are shown.
              </p>
              
              {(() => {
                const eligibleBinders = getEligibleBinders(productCode);
                
                return eligibleBinders.length === 0 ? (
                  <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <p className="text-red-300 text-sm">
                      ⚠️ No active binders available for {coverageTypeName} that can accommodate your entered limits.
                      Please contact an underwriter or reduce your limit requirements.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eligibleBinders.map(binder => (
                      <label
                        key={binder.id}
                        className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedBinders?.[productCode] === binder.id
                            ? "bg-orange-500/10 border-orange-500/50"
                            : "bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50"
                        }`}
                        onClick={() => {
                          if (setSelectedBinders) {
                            setSelectedBinders(prev => ({ ...prev, [productCode]: binder.id }));
                          }
                        }}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedBinders?.[productCode] === binder.id
                            ? "border-orange-500"
                            : "border-slate-500"
                        }`}>
                          {selectedBinders?.[productCode] === binder.id && (
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-semibold">{binder.name}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-2 py-1 bg-green-900/30 border border-green-700/50 text-green-300 rounded">
                                {binder.reference}
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          <Card className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 backdrop-blur-sm border-slate-700/50 rounded-2xl shadow-2xl shadow-black/30">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-700/60 rounded-lg px-8 py-6 transition-all duration-200"
                >
                  ← Back to Claims History
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    // Validate facility selection (lineslip or binder)
                    if (!selectedLineslips?.[productCode] && !selectedBinders?.[productCode]) {
                      toast.error(`Please select a lineslip or binder for ${coverageTypeName} before submitting.`);
                      return;
                    }
                    setIsDialogOpen(true);
                  }}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white font-semibold rounded-lg px-10 py-6 shadow-lg shadow-orange-900/30 hover:shadow-xl hover:shadow-orange-900/40 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Dialog for Confirmation */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Duty of Disclosure</DialogTitle>
            <DialogDescription className="text-slate-300 pt-4 space-y-4">
              <p className="text-xs">
                Before submitting this placement, please confirm that you have complied with your Duty of Disclosure.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
                <p className="text-amber-200 font-semibold">Important Notice:</p>
                <p className="text-slate-200 text-sm leading-relaxed">
                  Under insurance law, you have a duty to disclose to the insurer every matter that you know, or could reasonably be expected to know, 
                  is relevant to the insurer's decision whether to accept the risk and, if so, on what terms.
                </p>
                <p className="text-slate-200 text-sm leading-relaxed">
                  This duty applies until the contract is entered into, varied or renewed. You must ensure that all material facts have been 
                  accurately disclosed in this placement submission.
                </p>
                <p className="text-slate-200 text-sm leading-relaxed">
                  Failure to comply with this duty may result in the insurer reducing or refusing to pay a claim, or cancelling the policy.
                </p>
              </div>
              <p className="text-slate-300 font-medium pt-2 text-base">
                By submitting this placement, you confirm that all information provided is true, accurate, and complete to the best of your knowledge.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-700/60 rounded-lg px-6 py-5 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsDialogOpen(false);
                onSubmit();
              }}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white font-semibold rounded-lg px-8 py-5 shadow-lg shadow-orange-900/30 hover:shadow-xl hover:shadow-orange-900/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I Confirm & Submit Placement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}