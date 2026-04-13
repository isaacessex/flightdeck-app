import { useState, useEffect } from "react";
import { Placement, Lineslip, Contact } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Users, 
  Building2, 
  DollarSign,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  User
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";

interface PAQuoteFormProps {
  onSubmit: (placement: Omit<Placement, "id">) => void;
  onCancel: () => void;
  onSaveDraft: (placement: Omit<Placement, "id">) => void;
  lineslips: Lineslip[];
  contacts: Contact[];
  draftPlacement?: Placement;
  onAddContact: (contactData: Omit<Contact, "id" | "createdDate" | "lastModified">) => void;
}

interface PAPilot {
  name: string;
  age: string;
  occupation: string;
  sumsInsured: string;
  sumsInsuredCurrency: string;
  medicalHistory: string;
}

function formatContactDisplayName(contact: Contact): string {
  if (contact.type === "Insured" && contact.insuredName) return contact.insuredName;
  if (contact.type === "Cedent" && contact.cedentName) return contact.cedentName;
  return `${contact.firstName} ${contact.lastName}`.trim();
}

export function PAQuoteForm({
  onSubmit,
  onCancel,
  onSaveDraft,
  lineslips,
  contacts,
  draftPlacement,
}: PAQuoteFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Basic Information
  const [insuredName, setInsuredName] = useState("");
  const [riskDetails, setRiskDetails] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedLineslip, setSelectedLineslip] = useState("");
  const [inceptionDate, setInceptionDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  // Step 2: Coverage Details
  const [numberOfPersons, setNumberOfPersons] = useState("");
  const [coverageType, setCoverageType] = useState<string>(""); // "death-only", "death-ptd", "comprehensive"
  const [totalSumsInsured, setTotalSumsInsured] = useState("");
  const [sumsInsuredCurrency, setSumsInsuredCurrency] = useState("USD");
  const [geographicalLimits, setGeographicalLimits] = useState("");
  
  // Step 3: Insured Persons
  const [paPilots, setPaPilots] = useState<PAPilot[]>([]);
  const [showPilotForm, setShowPilotForm] = useState(false);
  const [editingPilotIndex, setEditingPilotIndex] = useState<number | null>(null);
  const [tempPilot, setTempPilot] = useState<PAPilot>({
    name: "",
    age: "",
    occupation: "",
    sumsInsured: "",
    sumsInsuredCurrency: "USD",
    medicalHistory: ""
  });
  
  // Step 4: Additional Benefits
  const [weeklyBenefit, setWeeklyBenefit] = useState(false);
  const [weeklyBenefitAmount, setWeeklyBenefitAmount] = useState("");
  const [weeklyBenefitCurrency, setWeeklyBenefitCurrency] = useState("USD");
  const [medicalExpenses, setMedicalExpenses] = useState(false);
  const [medicalExpensesLimit, setMedicalExpensesLimit] = useState("");
  const [medicalExpensesCurrency, setMedicalExpensesCurrency] = useState("USD");
  const [repatriationCoverage, setRepatriationCoverage] = useState(false);
  const [emergencyEvacuation, setEmergencyEvacuation] = useState(false);
  
  // Step 5: Claims History
  const [hasClaimsHistory, setHasClaimsHistory] = useState(false);
  const [claimsHistory, setClaimsHistory] = useState<any[]>([]);
  const [generalClaimsInfo, setGeneralClaimsInfo] = useState("");
  
  // Load draft data if editing
  useEffect(() => {
    if (draftPlacement) {
      const draft = draftPlacement.draftData;
      if (draft) {
        if (draft.insuredName) setInsuredName(draft.insuredName);
        if (draft.riskDetails) setRiskDetails(draft.riskDetails);
        if (draft.selectedContact) setSelectedContact(draft.selectedContact);
        if (draft.selectedLineslip) setSelectedLineslip(draft.selectedLineslip);
        if (draft.inceptionDate) setInceptionDate(draft.inceptionDate);
        if (draft.expiryDate) setExpiryDate(draft.expiryDate);
        if (draft.numberOfPersons) setNumberOfPersons(draft.numberOfPersons);
        if (draft.coverageType) setCoverageType(draft.coverageType);
        if (draft.totalSumsInsured) setTotalSumsInsured(draft.totalSumsInsured);
        if (draft.sumsInsuredCurrency) setSumsInsuredCurrency(draft.sumsInsuredCurrency);
        if (draft.geographicalLimits) setGeographicalLimits(draft.geographicalLimits);
        if (draft.paPilots) setPaPilots(draft.paPilots);
        if (draft.weeklyBenefit !== undefined) setWeeklyBenefit(draft.weeklyBenefit);
        if (draft.weeklyBenefitAmount) setWeeklyBenefitAmount(draft.weeklyBenefitAmount);
        if (draft.weeklyBenefitCurrency) setWeeklyBenefitCurrency(draft.weeklyBenefitCurrency);
        if (draft.medicalExpenses !== undefined) setMedicalExpenses(draft.medicalExpenses);
        if (draft.medicalExpensesLimit) setMedicalExpensesLimit(draft.medicalExpensesLimit);
        if (draft.medicalExpensesCurrency) setMedicalExpensesCurrency(draft.medicalExpensesCurrency);
        if (draft.repatriationCoverage !== undefined) setRepatriationCoverage(draft.repatriationCoverage);
        if (draft.emergencyEvacuation !== undefined) setEmergencyEvacuation(draft.emergencyEvacuation);
        if (draft.hasClaimsHistory !== undefined) setHasClaimsHistory(draft.hasClaimsHistory);
        if (draft.claimsHistory) setClaimsHistory(draft.claimsHistory);
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
    const draftData = {
      insuredName,
      riskDetails,
      selectedContact,
      selectedLineslip,
      inceptionDate,
      expiryDate,
      numberOfPersons,
      coverageType,
      totalSumsInsured,
      sumsInsuredCurrency,
      geographicalLimits,
      paPilots,
      weeklyBenefit,
      weeklyBenefitAmount,
      weeklyBenefitCurrency,
      medicalExpenses,
      medicalExpensesLimit,
      medicalExpensesCurrency,
      repatriationCoverage,
      emergencyEvacuation,
      hasClaimsHistory,
      claimsHistory,
      generalClaimsInfo
    };

    const placement = {
      brokerName: "Current Broker",
      insuredName,
      productCode: "PA",
      status: "draft" as const,
      submittedDate: new Date().toISOString().split("T")[0],
      draftData,
    } as Omit<Placement, "id">;

    onSaveDraft(placement);
  };

  const handleSubmit = () => {
    const draftData = {
      insuredName,
      riskDetails,
      selectedContact,
      selectedLineslip,
      inceptionDate,
      expiryDate,
      numberOfPersons,
      coverageType,
      totalSumsInsured,
      sumsInsuredCurrency,
      geographicalLimits,
      paPilots,
      weeklyBenefit,
      weeklyBenefitAmount,
      weeklyBenefitCurrency,
      medicalExpenses,
      medicalExpensesLimit,
      medicalExpensesCurrency,
      repatriationCoverage,
      emergencyEvacuation,
      hasClaimsHistory,
      claimsHistory,
      generalClaimsInfo
    };

    const placement = {
      brokerName: "Current Broker",
      insuredName,
      productCode: "PA",
      status: "pending" as const,
      submittedDate: new Date().toISOString().split("T")[0],
      draftData,
    } as Omit<Placement, "id">;

    onSubmit(placement);
  };

  const handleAddPilot = () => {
    if (editingPilotIndex !== null) {
      const updated = [...paPilots];
      updated[editingPilotIndex] = tempPilot;
      setPaPilots(updated);
      setEditingPilotIndex(null);
    } else {
      setPaPilots([...paPilots, tempPilot]);
    }
    setTempPilot({
      name: "",
      age: "",
      occupation: "",
      sumsInsured: "",
      sumsInsuredCurrency: "USD",
      medicalHistory: ""
    });
    setShowPilotForm(false);
  };

  const handleEditPilot = (index: number) => {
    setTempPilot(paPilots[index]);
    setEditingPilotIndex(index);
    setShowPilotForm(true);
  };

  const handleDeletePilot = (index: number) => {
    setPaPilots(paPilots.filter((_, i) => i !== index));
  };

  const steps = [
    { number: 1, title: "Basic Information", icon: Building2 },
    { number: 2, title: "Coverage Details", icon: Shield },
    { number: 3, title: "Insured Persons", icon: Users },
    { number: 4, title: "Additional Benefits", icon: DollarSign },
    { number: 5, title: "Claims History", icon: AlertTriangle },
    { number: 6, title: "Review & Submit", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal Accident Insurance Quote</h1>
          <p className="text-gray-600">Complete the form below to submit a Personal Accident placement request</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        currentStep === step.number
                          ? "bg-[#004225] border-[#004225] text-white"
                          : currentStep > step.number
                          ? "bg-green-100 border-green-500 text-green-700"
                          : "bg-white border-gray-300 text-gray-400"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="mt-2 text-xs font-medium text-gray-600 text-center">
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-all ${
                        currentStep > step.number ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <Card className="p-8 bg-white shadow-sm">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Basic Information</h2>
                <p className="text-sm text-gray-500">Enter the insured details and policy period</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="insuredName">Insured Name *</Label>
                  <Input
                    id="insuredName"
                    value={insuredName}
                    onChange={(e) => setInsuredName(e.target.value)}
                    placeholder="Enter insured name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="riskDetails">Risk Details</Label>
                  <Textarea
                    id="riskDetails"
                    value={riskDetails}
                    onChange={(e) => setRiskDetails(e.target.value)}
                    placeholder="Brief description of the risk"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact">Contact Person *</Label>
                    <Select value={selectedContact} onValueChange={setSelectedContact}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {formatContactDisplayName(contact)} - {contact.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="lineslip">Lineslip / Facility *</Label>
                    <Select value={selectedLineslip} onValueChange={setSelectedLineslip}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select lineslip" />
                      </SelectTrigger>
                      <SelectContent>
                        {lineslips
                          .filter((l) => l.productCode === "PA")
                          .map((lineslip) => (
                            <SelectItem key={lineslip.id} value={lineslip.id}>
                              {lineslip.reference} - {lineslip.underwriters.map((u) => u.name).join(", ")}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inceptionDate">Inception Date *</Label>
                    <Input
                      id="inceptionDate"
                      type="date"
                      value={inceptionDate}
                      onChange={(e) => setInceptionDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiryDate">Expiry Date *</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Coverage Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Coverage Details</h2>
                <p className="text-sm text-gray-500">Specify the coverage parameters</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="numberOfPersons">Number of Insured Persons *</Label>
                  <Input
                    id="numberOfPersons"
                    type="number"
                    value={numberOfPersons}
                    onChange={(e) => setNumberOfPersons(e.target.value)}
                    placeholder="Enter number of persons"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="coverageType">Coverage Type *</Label>
                  <Select value={coverageType} onValueChange={setCoverageType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select coverage type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="death-only">Death Only</SelectItem>
                      <SelectItem value="death-ptd">Death & Permanent Total Disability (PTD)</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive (Death, PTD, PPD)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {coverageType === "death-only" && "Coverage for accidental death only"}
                    {coverageType === "death-ptd" && "Coverage for accidental death and permanent total disability"}
                    {coverageType === "comprehensive" && "Full coverage including death, permanent total disability, and permanent partial disability"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalSumsInsured">Total Sums Insured *</Label>
                    <Input
                      id="totalSumsInsured"
                      value={totalSumsInsured}
                      onChange={(e) => setTotalSumsInsured(e.target.value)}
                      placeholder="Enter total amount"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sumsInsuredCurrency">Currency</Label>
                    <Select value={sumsInsuredCurrency} onValueChange={setSumsInsuredCurrency}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="geographicalLimits">Geographical Limits</Label>
                  <Textarea
                    id="geographicalLimits"
                    value={geographicalLimits}
                    onChange={(e) => setGeographicalLimits(e.target.value)}
                    placeholder="e.g., Worldwide excluding war zones"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Insured Persons */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Insured Persons</h2>
                <p className="text-sm text-gray-500">Add details for each insured person</p>
              </div>

              {!showPilotForm && (
                <Button
                  onClick={() => setShowPilotForm(true)}
                  className="bg-[#004225] hover:bg-[#003119]"
                >
                  <Plus className="size-4 mr-2" />
                  Add Insured Person
                </Button>
              )}

              {showPilotForm && (
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {editingPilotIndex !== null ? "Edit" : "Add"} Insured Person
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Full Name *</Label>
                        <Input
                          value={tempPilot.name}
                          onChange={(e) => setTempPilot({ ...tempPilot, name: e.target.value })}
                          placeholder="Enter name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Age *</Label>
                        <Input
                          type="number"
                          value={tempPilot.age}
                          onChange={(e) => setTempPilot({ ...tempPilot, age: e.target.value })}
                          placeholder="Enter age"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Occupation *</Label>
                      <Input
                        value={tempPilot.occupation}
                        onChange={(e) => setTempPilot({ ...tempPilot, occupation: e.target.value })}
                        placeholder="e.g., Pilot, Crew Member"
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Sums Insured *</Label>
                        <Input
                          value={tempPilot.sumsInsured}
                          onChange={(e) => setTempPilot({ ...tempPilot, sumsInsured: e.target.value })}
                          placeholder="Enter amount"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Select
                          value={tempPilot.sumsInsuredCurrency}
                          onValueChange={(value) => setTempPilot({ ...tempPilot, sumsInsuredCurrency: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Medical History / Pre-existing Conditions</Label>
                      <Textarea
                        value={tempPilot.medicalHistory}
                        onChange={(e) => setTempPilot({ ...tempPilot, medicalHistory: e.target.value })}
                        placeholder="Any relevant medical information"
                        className="mt-1"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddPilot}
                        disabled={!tempPilot.name || !tempPilot.age || !tempPilot.occupation || !tempPilot.sumsInsured}
                        className="bg-[#004225] hover:bg-[#003119]"
                      >
                        {editingPilotIndex !== null ? "Update" : "Add"} Person
                      </Button>
                      <Button
                        onClick={() => {
                          setShowPilotForm(false);
                          setEditingPilotIndex(null);
                          setTempPilot({
                            name: "",
                            age: "",
                            occupation: "",
                            sumsInsured: "",
                            sumsInsuredCurrency: "USD",
                            medicalHistory: ""
                          });
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {paPilots.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Insured Persons ({paPilots.length})</h3>
                  {paPilots.map((pilot, index) => (
                    <Card key={index} className="p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="size-4 text-gray-500" />
                            <span className="font-semibold text-gray-900">{pilot.name}</span>
                            <span className="text-sm text-gray-500">• Age {pilot.age}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Occupation:</span>
                              <div className="font-medium text-gray-900">{pilot.occupation}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Sums Insured:</span>
                              <div className="font-medium text-gray-900">
                                {pilot.sumsInsuredCurrency} {pilot.sumsInsured}
                              </div>
                            </div>
                            {pilot.medicalHistory && (
                              <div>
                                <span className="text-gray-500">Medical History:</span>
                                <div className="font-medium text-gray-900 text-xs">{pilot.medicalHistory}</div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleEditPilot(index)}
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeletePilot(index)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="size-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {paPilots.length === 0 && !showPilotForm && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Users className="size-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No insured persons added yet</p>
                  <p className="text-sm text-gray-500 mt-1">Click "Add Insured Person" to begin</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Additional Benefits */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Additional Benefits</h2>
                <p className="text-sm text-gray-500">Select any optional coverages</p>
              </div>

              <div className="space-y-4">
                {/* Weekly Benefit */}
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="weeklyBenefit"
                      checked={weeklyBenefit}
                      onCheckedChange={(checked) => setWeeklyBenefit(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="weeklyBenefit" className="font-semibold text-gray-900 cursor-pointer">
                        Weekly Benefit (Temporary Total Disability)
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Weekly compensation during temporary total disability
                      </p>
                      {weeklyBenefit && (
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <Label className="text-xs">Weekly Amount</Label>
                            <Input
                              value={weeklyBenefitAmount}
                              onChange={(e) => setWeeklyBenefitAmount(e.target.value)}
                              placeholder="Enter weekly amount"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Currency</Label>
                            <Select value={weeklyBenefitCurrency} onValueChange={setWeeklyBenefitCurrency}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Medical Expenses */}
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="medicalExpenses"
                      checked={medicalExpenses}
                      onCheckedChange={(checked) => setMedicalExpenses(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="medicalExpenses" className="font-semibold text-gray-900 cursor-pointer">
                        Medical Expenses
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Coverage for medical treatment expenses resulting from accident
                      </p>
                      {medicalExpenses && (
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <Label className="text-xs">Limit per Person</Label>
                            <Input
                              value={medicalExpensesLimit}
                              onChange={(e) => setMedicalExpensesLimit(e.target.value)}
                              placeholder="Enter limit"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Currency</Label>
                            <Select value={medicalExpensesCurrency} onValueChange={setMedicalExpensesCurrency}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Repatriation */}
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="repatriationCoverage"
                      checked={repatriationCoverage}
                      onCheckedChange={(checked) => setRepatriationCoverage(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="repatriationCoverage" className="font-semibold text-gray-900 cursor-pointer">
                        Repatriation of Remains
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Coverage for transportation of remains to home country
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Emergency Evacuation */}
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="emergencyEvacuation"
                      checked={emergencyEvacuation}
                      onCheckedChange={(checked) => setEmergencyEvacuation(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="emergencyEvacuation" className="font-semibold text-gray-900 cursor-pointer">
                        Emergency Medical Evacuation
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Emergency medical transportation to nearest adequate facility
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Step 5: Claims History */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Claims History</h2>
                <p className="text-sm text-gray-500">Provide information about past claims</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="hasClaimsHistory"
                    checked={hasClaimsHistory}
                    onCheckedChange={(checked) => setHasClaimsHistory(checked as boolean)}
                  />
                  <Label htmlFor="hasClaimsHistory" className="font-medium cursor-pointer">
                    There is claims history to report
                  </Label>
                </div>

                {hasClaimsHistory && (
                  <div>
                    <Label htmlFor="generalClaimsInfo">Claims Information</Label>
                    <Textarea
                      id="generalClaimsInfo"
                      value={generalClaimsInfo}
                      onChange={(e) => setGeneralClaimsInfo(e.target.value)}
                      placeholder="Provide details of any past claims including dates, nature, and amounts"
                      className="mt-1"
                      rows={5}
                    />
                  </div>
                )}

                {!hasClaimsHistory && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle2 className="size-12 text-green-600 mx-auto mb-3" />
                    <p className="text-gray-900 font-medium">No Claims History</p>
                    <p className="text-sm text-gray-600 mt-1">Clean claims record</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Submit</h2>
                <p className="text-sm text-gray-500">Review your submission before sending</p>
              </div>

              <div className="space-y-4">
                {/* Basic Information */}
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="size-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Insured Name:</span>
                      <div className="font-medium text-gray-900">{insuredName}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Policy Period:</span>
                      <div className="font-medium text-gray-900">
                        {inceptionDate} to {expiryDate}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Coverage Details */}
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="size-4" />
                    Coverage Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Number of Persons:</span>
                      <div className="font-medium text-gray-900">{numberOfPersons}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Coverage Type:</span>
                      <div className="font-medium text-gray-900">
                        {coverageType === "death-only" && "Death Only"}
                        {coverageType === "death-ptd" && "Death & PTD"}
                        {coverageType === "comprehensive" && "Comprehensive"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Sums Insured:</span>
                      <div className="font-medium text-gray-900">
                        {sumsInsuredCurrency} {totalSumsInsured}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Insured Persons */}
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="size-4" />
                    Insured Persons ({paPilots.length})
                  </h3>
                  <div className="space-y-2">
                    {paPilots.map((pilot, index) => (
                      <div key={index} className="text-sm border-l-2 border-[#004225] pl-3 py-1">
                        <div className="font-medium text-gray-900">{pilot.name}</div>
                        <div className="text-gray-600 text-xs">
                          {pilot.occupation} • Age {pilot.age} • {pilot.sumsInsuredCurrency} {pilot.sumsInsured}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Additional Benefits */}
                {(weeklyBenefit || medicalExpenses || repatriationCoverage || emergencyEvacuation) && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="size-4" />
                      Additional Benefits
                    </h3>
                    <div className="space-y-2 text-sm">
                      {weeklyBenefit && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-green-600" />
                          <span>Weekly Benefit: {weeklyBenefitCurrency} {weeklyBenefitAmount}</span>
                        </div>
                      )}
                      {medicalExpenses && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-green-600" />
                          <span>Medical Expenses: {medicalExpensesCurrency} {medicalExpensesLimit}</span>
                        </div>
                      )}
                      {repatriationCoverage && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-green-600" />
                          <span>Repatriation of Remains</span>
                        </div>
                      )}
                      {emergencyEvacuation && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-green-600" />
                          <span>Emergency Medical Evacuation</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="size-4 mr-2" />
                  Back
                </Button>
              )}
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveDraft} variant="outline">
                <Save className="size-4 mr-2" />
                Save Draft
              </Button>
              {currentStep < 6 ? (
                <Button onClick={handleNext} className="bg-[#004225] hover:bg-[#003119]">
                  Next
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!insuredName || !selectedContact || !selectedLineslip || !inceptionDate || !expiryDate}
                  className="bg-[#004225] hover:bg-[#003119]"
                >
                  Submit Placement
                  <CheckCircle2 className="size-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
