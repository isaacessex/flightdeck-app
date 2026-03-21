import { useState } from "react";
import { Placement, Quote } from "../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { AlertCircle, CheckCircle, FileText, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface UnderwriterReviewProps {
  placements: Placement[];
  onSubmitQuote: (placementId: string, quote: Omit<Quote, "id" | "submittedDate">) => void;
  onDecline: (placementId: string) => void;
}

export function UnderwriterReview({ placements, onSubmitQuote, onDecline }: UnderwriterReviewProps) {
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    underwriterName: "Continental Aviation Underwriters",
    premium: "",
    terms: "",
  });
  
  // LOL-specific state: premiums per pilot
  const [lolPilotPremiums, setLolPilotPremiums] = useState<Record<number, string>>({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmitQuote = () => {
    const isLOL = selectedPlacement?.productCode === "LOL";
    
    if (selectedPlacement) {
      let totalPremium = 0;
      
      if (isLOL) {
        // Calculate total premium from all pilot premiums
        totalPremium = Object.values(lolPilotPremiums).reduce((sum, premium) => {
          return sum + (parseFloat(premium) || 0);
        }, 0);
        
        // Check if all pilots have premiums
        const lolPilots = selectedPlacement.draftData?.lolPilots || [];
        if (lolPilots.length > 0 && Object.keys(lolPilotPremiums).length !== lolPilots.length) {
          alert("Please enter a premium for all pilots");
          return;
        }
      } else {
        totalPremium = parseFloat(quoteForm.premium);
      }
      
      if (totalPremium > 0) {
        onSubmitQuote(selectedPlacement.id, {
          underwriterName: quoteForm.underwriterName,
          premium: totalPremium,
          terms: quoteForm.terms,
        });
        setQuoteDialogOpen(false);
        setQuoteForm({
          underwriterName: "Continental Aviation Underwriters",
          premium: "",
          terms: "",
        });
        setLolPilotPremiums({});
        setSelectedPlacement(null);
      }
    }
  };

  const handleDecline = () => {
    if (selectedPlacement) {
      onDecline(selectedPlacement.id);
      setDeclineDialogOpen(false);
      setSelectedPlacement(null);
    }
  };

  const pendingPlacements = placements.filter((p) => p.status === "pending");
  const reviewedPlacements = placements.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-8">
      {/* Pending Placements */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">Pending Review</h2>
          <p className="text-sm text-slate-400 mt-1">Placements awaiting your underwriting decision</p>
        </div>

        {pendingPlacements.length === 0 ? (
          <Alert className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 backdrop-blur-sm border-slate-700/50 rounded-xl">
            <AlertCircle className="size-4 text-slate-400" />
            <AlertDescription className="text-slate-300">No pending placements at this time.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingPlacements.map((placement) => (
              <Card key={placement.id} className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 backdrop-blur-sm border-slate-700/50 rounded-2xl shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-white text-xl">
                        {placement.id} - {placement.insuredName}
                        <Badge variant="secondary" className="bg-yellow-500/90 text-slate-900 rounded-lg px-3 py-1">Pending</Badge>
                      </CardTitle>
                      <CardDescription className="text-slate-400 mt-2">
                        Submitted by {placement.brokerName} on{" "}
                        {new Date(placement.submittedDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Aircraft Type</p>
                      <p className="font-semibold text-white">{placement.aircraftType}</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Coverage Type</p>
                      <p className="font-semibold text-white">{placement.coverageType}</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium">{placement.productCode === "HW" ? "Aircraft Agreed Value" : "Hull Value"}</p>
                      <p className="font-semibold text-white">
                        {placement.hullValue > 0 ? formatCurrency(placement.hullValue) : "N/A"}
                      </p>
                    </div>
                    {placement.productCode !== "HW" && (
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Liability Limit</p>
                      <p className="font-semibold text-white">{formatCurrency(placement.liability)}</p>
                    </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-2">
                    <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedPlacement(placement)}
                          className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg px-6 py-6 shadow-lg shadow-green-900/30 hover:shadow-xl hover:shadow-green-900/40 transition-all duration-300"
                        >
                          <CheckCircle className="size-4" />
                          Submit Quote
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg bg-gradient-to-br from-slate-900/95 to-slate-900/90 backdrop-blur-xl border-slate-700/50 rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-white text-xl">Submit Quote</DialogTitle>
                          <DialogDescription className="text-slate-400">
                            Provide your quote for {selectedPlacement?.insuredName}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-5 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="underwriterName" className="text-slate-300 text-sm font-medium">Underwriter Name</Label>
                            <Input
                              id="underwriterName"
                              value={quoteForm.underwriterName}
                              onChange={(e) =>
                                setQuoteForm({ ...quoteForm, underwriterName: e.target.value })
                              }
                              className="bg-slate-800/60 border-slate-700/50 text-white rounded-lg py-6 transition-all duration-200"
                            />
                          </div>
                          
                          {/* Show different fields based on placement type */}
                          {selectedPlacement?.productCode === "LOL" ? (
                            // LOL-specific: Per-pilot premiums
                            <div className="space-y-4">
                              <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50">
                                <Label className="text-slate-300 text-sm font-medium mb-3 block">
                                  Premium Per Pilot (USD)
                                </Label>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                  {(selectedPlacement?.draftData?.lolPilots || []).map((pilot: any, index: number) => (
                                    <div key={index} className="bg-slate-900/60 rounded-lg p-3 space-y-2">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-white font-medium text-sm">{pilot.pilotName || `Pilot ${index + 1}`}</span>
                                        <span className="text-slate-400 text-xs">Age: {pilot.age}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-400 text-xs">Limit: ${pilot.limit?.toLocaleString()}</span>
                                      </div>
                                      <Input
                                        type="number"
                                        placeholder="Enter premium"
                                        value={lolPilotPremiums[index] || ""}
                                        onChange={(e) => setLolPilotPremiums({ ...lolPilotPremiums, [index]: e.target.value })}
                                        className="bg-slate-800/60 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg h-10 text-sm mt-2"
                                      />
                                    </div>
                                  ))}
                                </div>
                                {Object.keys(lolPilotPremiums).length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-300 font-medium">Total Premium:</span>
                                      <span className="text-white font-semibold text-lg">
                                        {formatCurrency(Object.values(lolPilotPremiums).reduce((sum, premium) => sum + (parseFloat(premium) || 0), 0))}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Standard premium field for non-LOL placements
                            <div className="space-y-2">
                              <Label htmlFor="premium" className="text-slate-300 text-sm font-medium">Annual Premium (USD)</Label>
                              <Input
                                id="premium"
                                type="number"
                                placeholder="145000"
                                value={quoteForm.premium}
                                onChange={(e) => setQuoteForm({ ...quoteForm, premium: e.target.value })}
                                className="bg-slate-800/60 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg py-6 transition-all duration-200"
                              />
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <Label htmlFor="terms" className="text-slate-300 text-sm font-medium">Terms & Conditions</Label>
                            <Textarea
                              id="terms"
                              placeholder="Standard terms with 10% deductible, etc."
                              value={quoteForm.terms}
                              onChange={(e) => setQuoteForm({ ...quoteForm, terms: e.target.value })}
                              rows={4}
                              className="bg-slate-800/60 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg transition-all duration-200"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setQuoteDialogOpen(false)} className="bg-slate-800/60 border-slate-700/50 text-slate-300 rounded-lg px-6 py-5">
                            Cancel
                          </Button>
                          <Button onClick={handleSubmitQuote} className="bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-semibold rounded-lg px-6 py-5 shadow-lg transition-all duration-300">Submit Quote</Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedPlacement(placement)}
                          className="flex items-center gap-2 bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-red-900/30 hover:text-red-300 hover:border-red-800/50 rounded-lg px-6 py-6 transition-all duration-300"
                        >
                          <XCircle className="size-4" />
                          Decline
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gradient-to-br from-slate-900/95 to-slate-900/90 backdrop-blur-xl border-slate-700/50 rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-white text-xl">Decline Placement</DialogTitle>
                          <DialogDescription className="text-slate-400">
                            Are you sure you want to decline this placement? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => setDeclineDialogOpen(false)} className="bg-slate-800/60 border-slate-700/50 text-slate-300 rounded-lg px-6 py-5">
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDecline} className="bg-red-600 hover:bg-red-500 rounded-lg px-6 py-5">
                            Decline Placement
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Placements */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">Reviewed Placements</h2>
          <p className="text-sm text-slate-400 mt-1">Placements you've already processed</p>
        </div>

        {reviewedPlacements.length === 0 ? (
          <Alert className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 backdrop-blur-sm border-slate-700/50 rounded-xl">
            <AlertCircle className="size-4 text-slate-400" />
            <AlertDescription className="text-slate-300">No reviewed placements yet.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {reviewedPlacements.map((placement) => (
              <Card key={placement.id} className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 backdrop-blur-sm border-slate-700/50 rounded-2xl shadow-xl shadow-black/20">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-white text-xl">
                        {placement.id} - {placement.insuredName}
                        <Badge
                          variant={placement.status === "quoted" ? "default" : "default"}
                          className={`rounded-lg px-3 py-1 ${
                            placement.status === "bound" || placement.status === "firmorder" ? "bg-green-500/90 text-white hover:bg-green-500/90" : placement.status === "quoted" ? "bg-cyan-500/90 text-slate-900 hover:bg-cyan-500/90" : placement.status === "ntu" ? "bg-yellow-500/90 text-white hover:bg-yellow-500/90" : ""
                          }`}
                        >
                          {placement.status === "firmorder" ? "FIRM ORDER" : placement.status === "bound" ? "BOUND" : placement.status === "ntu" ? "NTU" : placement.status.charAt(0).toUpperCase() + placement.status.slice(1)}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-slate-400 mt-2">
                        Submitted by {placement.brokerName} on{" "}
                        {new Date(placement.submittedDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Aircraft Type</p>
                      <p className="font-semibold text-white">{placement.aircraftType}</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Coverage Type</p>
                      <p className="font-semibold text-white">{placement.coverageType}</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium">{placement.productCode === "HW" ? "Aircraft Agreed Value" : "Hull Value"}</p>
                      <p className="font-semibold text-white">
                        {placement.hullValue > 0 ? formatCurrency(placement.hullValue) : "N/A"}
                      </p>
                    </div>
                    {placement.productCode !== "HW" && (
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Liability Limit</p>
                      <p className="font-semibold text-white">{formatCurrency(placement.liability)}</p>
                    </div>
                    )}
                  </div>

                  {placement.quotes && placement.quotes.length > 0 && (
                    <div className="border-t border-slate-700/50 pt-5 mt-4">
                      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <FileText className="size-5" />
                        Your Quote
                      </h4>
                      {placement.quotes.map((quote) => (
                        <div key={quote.id} className="bg-slate-800/60 rounded-xl p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-5">
                            <div className="bg-slate-900/60 rounded-lg p-4">
                              <p className="text-xs text-slate-400 mb-1 font-medium">Premium</p>
                              <p className="font-semibold text-xl text-white">{formatCurrency(quote.premium)}</p>
                            </div>
                            <div className="bg-slate-900/60 rounded-lg p-4">
                              <p className="text-xs text-slate-400 mb-1 font-medium">Submitted</p>
                              <p className="font-medium text-white">{new Date(quote.submittedDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {quote.terms && (
                            <div>
                              <p className="text-xs text-slate-400 mb-2 font-medium">Terms</p>
                              <p className="text-sm text-slate-300 leading-relaxed">{quote.terms}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}