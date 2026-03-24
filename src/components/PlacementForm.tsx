import { useState, useEffect, useRef } from "react";
import { Placement, Lineslip, Contact } from "../App";
import type { Binder } from "../App";
import { ContactForm } from "./ContactForm";
import { ClaimsHistoryModal } from "./ClaimsHistoryModal";
import { HullWarReviewStep } from "./HullWarReviewStep";
import { LOLPilotDetailsStep } from "./LOLPilotDetailsStep";
import { HullWarClaimsHistoryStep } from "./HullWarClaimsHistoryStep";
import { PilotDetailsStep } from "./PilotDetailsStep";
import { SubLimitsClausesStep } from "./SubLimitsClausesStep";
import { ReviewStep } from "./ReviewStep";
import { EditAircraftModal } from "./EditAircraftModal";
import { CoverageSelectionStep } from "./CoverageSelectionStep";
import { CoverageDetailsStep } from "./CoverageDetailsStep";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Checkbox } from "./ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Plane, Shield, Heart, Radar, Check, ChevronsUpDown, ChevronDown, X, Plus, Info, Upload, FileText, DollarSign, Trash2, FileUp, Pencil, Search, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import { lookupAircraft } from "../utils/jetapi";
import { getTypeAbbreviation, formatNumberWithCommas, removeCommas, formatDateToUK } from "../utils/placementFormHelpers";
import { Aircraft, CrewMember, LOLPilot, AdditionalInsured, ClaimHistory } from "../types/placementForm";
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { countries as countriesWithRegions } from "../utils/countries";

interface PlacementFormProps {
  onSubmit: (placement: Omit<Placement, "id" | "submittedDate" | "status" | "reference" | "facilityRef">, forceNew?: boolean, draftIdToUpdate?: string | null) => void;
  onCancel: () => void;
  onSaveDraft: (draftData: Partial<Placement>) => string | null | undefined;
  lineslips: Lineslip[];
  binders?: Binder[];
  contacts: Contact[];
  onAddContact?: (contactData: Omit<Contact, "id" | "createdDate" | "lastModified">) => void;
  draftPlacement?: Placement; // Optional draft placement to edit
  currentDraftId?: string | null; // Track the current draft ID from App.tsx
  onShowPAForm?: () => void; // Callback to show PA form
}

export function PlacementForm({ onSubmit, onCancel, onSaveDraft, lineslips, binders = [], contacts, onAddContact, draftPlacement, currentDraftId, onShowPAForm }: PlacementFormProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0 = coverage selection, 1-5 = actual steps
  const [selectedMainCoverages, setSelectedMainCoverages] = useState<string[]>([]);
  const [placementType, setPlacementType] = useState<"insurance" | "reinsurance" | null>(null);
  const [selectedSubCoverages, setSelectedSubCoverages] = useState<string[]>([]);
  const isUASProduct = selectedMainCoverages.includes('UAS');
  const acLabel = isUASProduct ? 'drone' : 'aircraft';
  const AcLabel = isUASProduct ? 'Drone' : 'Aircraft';
  const [producingBroker, setProducingBroker] = useState("");
  const [isDirect, setIsDirect] = useState(false);
  const [brokerComboboxOpen, setBrokerComboboxOpen] = useState(false);
  const [selectedProducingBrokerId, setSelectedProducingBrokerId] = useState<string | null>(null);
  
  // Track the draft ID locally to handle async state updates
  const [localDraftId, setLocalDraftId] = useState<string | null>(currentDraftId || null);
  
  // DEBUG: Log localDraftId changes
  useEffect(() => {
    console.log('🆔 localDraftId changed:', localDraftId);
  }, [localDraftId]);
  
  // Order Hereon fields - per coverage
  const [orderHereonPercentage, setOrderHereonPercentage] = useState<Record<string, string>>({});
  const [orderHereonBasis, setOrderHereonBasis] = useState<Record<string, "whole" | "order">>({});
  
  // Crew Personal Accident Coverage Type
  const [crewCoverageType, setCrewCoverageType] = useState<"flight_risk" | "on_duty" | "24_hour">("flight_risk");
  
  // Named Crew Members for 24-hour Crew Personal Accident
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [showCrewMemberForm, setShowCrewMemberForm] = useState(false);
  const [editingCrewMemberIndex, setEditingCrewMemberIndex] = useState<number | null>(null);
  const crewMemberCsvInputRef = useRef<HTMLInputElement>(null);
  const [tempCrewMember, setTempCrewMember] = useState({
    name: "",
    age: "",
    position: "",
    sumsInsured: "",
    sumsInsuredCurrency: "USD"
  });
  const [crewPositionOther, setCrewPositionOther] = useState("");
  
  // LOL Pilots for Loss of Licence coverage
  const [lolPilots, setLolPilots] = useState<LOLPilot[]>([]);
  const [showLolPilotForm, setShowLolPilotForm] = useState(false);
  const [editingLolPilotIndex, setEditingLolPilotIndex] = useState<number | null>(null);
  const [tempLolPilot, setTempLolPilot] = useState({
    name: "",
    age: "",
    position: "",
    salary: "",
    salaryCurrency: "USD",
    sumsInsured: "",
    sumsInsuredCurrency: "USD",
    taxType: "addition",
    taxPercentage: "",
    taxName: ""
  });
  
  // CSV upload ref for LOL pilots
  const lolPilotsCsvInputRef = useRef<HTMLInputElement>(null);
  
  // Step 5 - Claims History (for LOL only)
  const [hasClaimsHistory, setHasClaimsHistory] = useState(false);
  const [claimsHistory, setClaimsHistory] = useState<ClaimHistory[]>([]);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [editingClaimIndex, setEditingClaimIndex] = useState<number | null>(null);
  const [tempClaim, setTempClaim] = useState({
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
  
  // Sub-coverage dropdowns state
  const [openSubCoverageDropdowns, setOpenSubCoverageDropdowns] = useState<Record<string, boolean>>({});

  // Track if draft has been loaded to prevent autosave from resetting step
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  // Step 2 fields
  const [insuredName, setInsuredName] = useState("");
  const [insuredAddressLine1, setInsuredAddressLine1] = useState("");
  const [insuredCity, setInsuredCity] = useState("");
  const [insuredCountry, setInsuredCountry] = useState("");
  const [insuredPostcode, setInsuredPostcode] = useState("");
  
  // Insured contact autocomplete states
  const [insuredSearchQuery, setInsuredSearchQuery] = useState("");
  const [showInsuredSuggestions, setShowInsuredSuggestions] = useState(false);
  const [showAddInsuredModal, setShowAddInsuredModal] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedInsuredContact, setSelectedInsuredContact] = useState<Contact | null>(null);
  
  const [additionalInsureds, setAdditionalInsureds] = useState<AdditionalInsured[]>([]);
  const [showAdditionalInsuredForm, setShowAdditionalInsuredForm] = useState(false);
  const [tempAdditionalInsured, setTempAdditionalInsured] = useState({
    name: "",
    addressLine1: "",
    city: "",
    country: "",
    postcode: "",
  });
  
  // Additional insured autocomplete states
  const [additionalInsuredSearchQuery, setAdditionalInsuredSearchQuery] = useState("");
  const [showAdditionalInsuredSuggestions, setShowAdditionalInsuredSuggestions] = useState(false);
  const [showAddAdditionalInsuredModal, setShowAddAdditionalInsuredModal] = useState(false);
  const [showAdditionalInsuredContactForm, setShowAdditionalInsuredContactForm] = useState(false);
  const [selectedAdditionalInsuredContact, setSelectedAdditionalInsuredContact] = useState<Contact | null>(null);
  
  // Reinsured autocomplete states
  const [reinsuredSearchQuery, setReinsuredSearchQuery] = useState("");
  const [showReinsuredSuggestions, setShowReinsuredSuggestions] = useState(false);
  const [showAddReinsuredModal, setShowAddReinsuredModal] = useState(false);
  const [showReinsuredContactForm, setShowReinsuredContactForm] = useState(false);
  const [selectedReinsuredContact, setSelectedReinsuredContact] = useState<Contact | null>(null);
  
  const [reinsuredName, setReinsuredName] = useState("");
  const [reinsuredAddressLine1, setReinsuredAddressLine1] = useState("");
  const [reinsuredCity, setReinsuredCity] = useState("");
  const [reinsuredCountry, setReinsuredCountry] = useState("");
  const [reinsuredPostcode, setReinsuredPostcode] = useState("");
  const [inceptionDate, setInceptionDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [inceptionDateTBA, setInceptionDateTBA] = useState(false);
  const [expiryDateTBA, setExpiryDateTBA] = useState(false);
  const [bothDatesIncluded, setBothDatesIncluded] = useState(true);
  const [inceptionTime, setInceptionTime] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [timeZoneOption, setTimeZoneOption] = useState("original-insured");
  const [countryComboboxOpen, setCountryComboboxOpen] = useState(false);
  
  // Error highlighting states for Step 2 validation
  const [highlightInsuredName, setHighlightInsuredName] = useState(false);
  const [highlightReinsuredName, setHighlightReinsuredName] = useState(false);
  const [highlightInceptionDate, setHighlightInceptionDate] = useState(false);
  const [reinsuredCountryComboboxOpen, setReinsuredCountryComboboxOpen] = useState(false);
  
  // Placement Summary expand/collapse states
  const [showAllLolPilots, setShowAllLolPilots] = useState(false);

  // Step 3 fields - Aircraft Details
  const [registration, setRegistration] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [engineType, setEngineType] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [baseCountry, setBaseCountry] = useState("");
  const [baseRegion, setBaseRegion] = useState("");
  const [aircraftAgreedValue, setAircraftAgreedValue] = useState("");
  const [aircraftAgreedValueCurrency, setAircraftAgreedValueCurrency] = useState("USD");
  const [crewSeats, setCrewSeats] = useState("");
  const [isDualCrew, setIsDualCrew] = useState(false);
  const [paxSeats, setPaxSeats] = useState("");
  const [crewSumsReinsuredPerSeat, setCrewSumsReinsuredPerSeat] = useState("");
  const [crewSumsReinsuredCurrency, setCrewSumsReinsuredCurrency] = useState("USD");
  const [crewTotalPerOccurrence, setCrewTotalPerOccurrence] = useState("");
  const [crewTotalPerOccurrenceCurrency, setCrewTotalPerOccurrenceCurrency] = useState("USD");
  const [paxSumsReinsuredPerSeat, setPaxSumsReinsuredPerSeat] = useState("");
  const [paxSumsReinsuredCurrency, setPaxSumsReinsuredCurrency] = useState("USD");
  const [paxTotalPerOccurrence, setPaxTotalPerOccurrence] = useState("");
  const [paxTotalPerOccurrenceCurrency, setPaxTotalPerOccurrenceCurrency] = useState("USD");
  const [hullDeductible, setHullDeductible] = useState("");
  const [hullDeductibleCurrency, setHullDeductibleCurrency] = useState("USD");
  const [liabilityLimit, setLiabilityLimit] = useState("");
  const [liabilityLimitCurrency, setLiabilityLimitCurrency] = useState("USD");
  const [liabilityType, setLiabilityType] = useState<"CSL" | "TPL">("CSL"); // CSL = Combined Single Limit, TPL = Third Party Liability
  const [sumsReinsured, setSumsReinsured] = useState("");
  const [sumsReinsuredCurrency, setSumsReinsuredCurrency] = useState("USD");
  const [standardUses, setStandardUses] = useState<string[]>([]);
  const [specialUses, setSpecialUses] = useState<string[]>([]);
  const [specialUsesOther, setSpecialUsesOther] = useState("");
  const [excludedCountries, setExcludedCountries] = useState<string[]>([]);
  const [aircraftSparesAmount, setAircraftSparesAmount] = useState("");
  const [aircraftSparesCurrency, setAircraftSparesCurrency] = useState("USD");
  const [taxType, setTaxType] = useState("addition");
  const [taxPercentage, setTaxPercentage] = useState("");
  const [taxName, setTaxName] = useState("");
  
  // JetAPI aircraft lookup states
  const [isLookingUpAircraft, setIsLookingUpAircraft] = useState(false);
  const [aircraftLookupError, setAircraftLookupError] = useState("");
  
  // Hull Deductible specific fields
  const [standardDeductible, setStandardDeductible] = useState("");
  const [standardDeductibleCurrency, setStandardDeductibleCurrency] = useState("USD");
  const [deductibleBuydown, setDeductibleBuydown] = useState("");
  const [deductibleBuydownCurrency, setDeductibleBuydownCurrency] = useState("USD");

  // Step 4 - Fleet Management
  const [fleet, setFleet] = useState<Aircraft[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAircraftIndex, setEditingAircraftIndex] = useState<number | null>(null);
  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);

  // Step 5 - Pilot Details
  const [namedPilots, setNamedPilots] = useState(false);
  const [namedPilotsDocument, setNamedPilotsDocument] = useState<File | null>(null);
  const [openPilotWarranty, setOpenPilotWarranty] = useState(false);
  const [pilotsUnder65, setPilotsUnder65] = useState(false);
  
  // Minimum Required Hours by Aircraft Type
  const [minRequiredHours, setMinRequiredHours] = useState<Record<string, {
    totalHours: string;
    typeHours: string;
  }>>({});
  
  // OPW hours per aircraft/engine type (keyed by type identifier)
  const [opwHours, setOpwHours] = useState<Record<string, {
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
  }>>({});

  // Step 5 - Sub-Limits and Clauses (Hull and Liability only)
  const [medicalExpensesLimit, setMedicalExpensesLimit] = useState("");
  const [medicalExpensesCurrency, setMedicalExpensesCurrency] = useState("USD");
  const [cargoLiabilityLimit, setCargoLiabilityLimit] = useState("");
  const [cargoLiabilityCurrency, setCargoLiabilityCurrency] = useState("USD");
  const [baggageLimit, setBaggageLimit] = useState("");
  const [baggageCurrency, setBaggageCurrency] = useState("USD");
  const [passengerSettlementLimit, setPassengerSettlementLimit] = useState("");
  const [passengerSettlementCurrency, setPassengerSettlementCurrency] = useState("USD");
  const [noClaimsBonus, setNoClaimsBonus] = useState(false);
  const [noClaimsBonusPercentage, setNoClaimsBonusPercentage] = useState("");
  const [profitCommission, setProfitCommission] = useState(false);
  const [profitCommissionPercentage, setProfitCommissionPercentage] = useState("");
  const [profitCommissionBasis, setProfitCommissionBasis] = useState("");
  const [cargoEndorsement, setCargoEndorsement] = useState(false);

  // Products, Premises & Hangarkeepers fields
  const [pphLimit, setPphLimit] = useState("");
  const [pphCurrency, setPphCurrency] = useState("USD");

  // Step 6 - Additional Information
  const [generalClaimsInfo, setGeneralClaimsInfo] = useState<"yes" | "no" | "">("");
  const [claimsDetails, setClaimsDetails] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  
  // Lineslip selection - one lineslip per product
  const [selectedLineslips, setSelectedLineslips] = useState<Record<string, string>>({});
  
  // Binder selection - one binder per product
  const [selectedBinders, setSelectedBinders] = useState<Record<string, string>>({});

  // Binder Builder selections - multi-market panel per product
  const [binderBuilderSelections, setBinBuilderSelections] = useState<Record<string, import("./BinderBuilder").BinderSelection[]>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DEBUG: Log whenever selectedMainCoverages changes
  useEffect(() => {
    console.log('🔄 selectedMainCoverages changed:', selectedMainCoverages);
  }, [selectedMainCoverages]);

  // Sync local draft ID with prop when it changes
  useEffect(() => {
    if (currentDraftId !== localDraftId) {
      console.log('🔄 Syncing localDraftId with currentDraftId:', currentDraftId);
      setLocalDraftId(currentDraftId || null);
    }
  }, [currentDraftId]);

  // Check if certain steps should be skipped based on selected coverages
  // These need to be defined early as they're used in useEffects below
  const shouldSkipStep3 = selectedMainCoverages.length === 1 && selectedMainCoverages.includes('LOL');
  const isPAOnly = selectedMainCoverages.length === 1 && selectedMainCoverages.includes('PA');
  const isPA24Hour = isPAOnly && crewCoverageType === "24_hour" && selectedSubCoverages.includes("crew_personal_accident");
  const shouldSkipStep4 = !selectedMainCoverages.includes('HL') && (selectedMainCoverages.includes('HW') || selectedMainCoverages.includes('HD') || selectedMainCoverages.includes('PA'));
  const shouldSkipStep5 = !selectedMainCoverages.includes('HL') && (selectedMainCoverages.includes('HW') || selectedMainCoverages.includes('HD') || selectedMainCoverages.includes('PA'));

  // Load draft data when editing an existing draft
  // Only run once on initial mount to prevent autosave from resetting the step
  useEffect(() => {
    if (draftPlacement && !hasLoadedDraft) {
      // Check if it's a draft with draftData or a pending placement with regular data
      const draft = draftPlacement.draftData || draftPlacement;
      
      // Restore the current step
      if (draft.currentStep !== undefined) {
        setCurrentStep(draft.currentStep);
      }
      
      // Mark draft as loaded
      setHasLoadedDraft(true);
      
      // Restore all form state
      if (draft.selectedMainCoverages) {
        console.log('📂 Restoring selectedMainCoverages from draft:', draft.selectedMainCoverages);
        setSelectedMainCoverages(draft.selectedMainCoverages);
      }
      if (draft.placementType) setPlacementType(draft.placementType);
      if (draft.selectedSubCoverages) setSelectedSubCoverages(draft.selectedSubCoverages);
      if (draft.producingBroker) setProducingBroker(draft.producingBroker);
      if (draft.isDirect !== undefined) setIsDirect(draft.isDirect);
      if (draft.selectedProducingBrokerId) setSelectedProducingBrokerId(draft.selectedProducingBrokerId);
      if (draft.orderHereonPercentage) setOrderHereonPercentage(draft.orderHereonPercentage);
      if (draft.orderHereonBasis) setOrderHereonBasis(draft.orderHereonBasis);
      if (draft.crewCoverageType) setCrewCoverageType(draft.crewCoverageType);
      if (draft.crewMembers) setCrewMembers(draft.crewMembers);
      if (draft.lolPilots) setLolPilots(draft.lolPilots);
      if (draft.insuredName) setInsuredName(draft.insuredName);
      if (draft.insuredAddressLine1) setInsuredAddressLine1(draft.insuredAddressLine1);
      if (draft.insuredCity) setInsuredCity(draft.insuredCity);
      if (draft.insuredCountry) setInsuredCountry(draft.insuredCountry);
      if (draft.insuredPostcode) setInsuredPostcode(draft.insuredPostcode);
      if (draft.selectedInsuredContact) setSelectedInsuredContact(draft.selectedInsuredContact);
      if (draft.additionalInsureds) setAdditionalInsureds(draft.additionalInsureds);
      if (draft.reinsuredName) setReinsuredName(draft.reinsuredName);
      if (draft.reinsuredAddressLine1) setReinsuredAddressLine1(draft.reinsuredAddressLine1);
      if (draft.reinsuredCity) setReinsuredCity(draft.reinsuredCity);
      if (draft.reinsuredCountry) setReinsuredCountry(draft.reinsuredCountry);
      if (draft.reinsuredPostcode) setReinsuredPostcode(draft.reinsuredPostcode);
      if (draft.selectedReinsuredContact) setSelectedReinsuredContact(draft.selectedReinsuredContact);
      if (draft.inceptionDate) setInceptionDate(draft.inceptionDate);
      if (draft.expiryDate) setExpiryDate(draft.expiryDate);
      if (draft.inceptionDateTBA !== undefined) setInceptionDateTBA(draft.inceptionDateTBA);
      if (draft.expiryDateTBA !== undefined) setExpiryDateTBA(draft.expiryDateTBA);
      if (draft.bothDatesIncluded !== undefined) setBothDatesIncluded(draft.bothDatesIncluded);
      if (draft.inceptionTime) setInceptionTime(draft.inceptionTime);
      if (draft.expiryTime) setExpiryTime(draft.expiryTime);
      if (draft.timeZoneOption) setTimeZoneOption(draft.timeZoneOption);
      if (draft.registration) setRegistration(draft.registration);
      if (draft.aircraftType) setAircraftType(draft.aircraftType);
      if (draft.engineType) setEngineType(draft.engineType);
      if (draft.make) setMake(draft.make);
      if (draft.model) setModel(draft.model);
      if (draft.baseCountry) setBaseCountry(draft.baseCountry);
      if (draft.baseRegion) setBaseRegion(draft.baseRegion);
      if (draft.aircraftAgreedValue) setAircraftAgreedValue(draft.aircraftAgreedValue);
      if (draft.aircraftAgreedValueCurrency) setAircraftAgreedValueCurrency(draft.aircraftAgreedValueCurrency);
      if (draft.crewSeats) setCrewSeats(draft.crewSeats);
      if (draft.isDualCrew !== undefined) setIsDualCrew(draft.isDualCrew);
      if (draft.paxSeats) setPaxSeats(draft.paxSeats);
      if (draft.hullDeductible) setHullDeductible(draft.hullDeductible);
      if (draft.hullDeductibleCurrency) setHullDeductibleCurrency(draft.hullDeductibleCurrency);
      if (draft.liabilityLimit) setLiabilityLimit(draft.liabilityLimit);
      if (draft.liabilityLimitCurrency) setLiabilityLimitCurrency(draft.liabilityLimitCurrency);
      if (draft.liabilityType) setLiabilityType(draft.liabilityType);
      if (draft.sumsReinsured) setSumsReinsured(draft.sumsReinsured);
      if (draft.sumsReinsuredCurrency) setSumsReinsuredCurrency(draft.sumsReinsuredCurrency);
      if (draft.standardUses) setStandardUses(draft.standardUses);
      if (draft.specialUses) setSpecialUses(draft.specialUses);
      if (draft.specialUsesOther) setSpecialUsesOther(draft.specialUsesOther);
      if (draft.excludedCountries) setExcludedCountries(draft.excludedCountries);
      if (draft.aircraftSparesAmount) setAircraftSparesAmount(draft.aircraftSparesAmount);
      if (draft.aircraftSparesCurrency) setAircraftSparesCurrency(draft.aircraftSparesCurrency);
      if (draft.taxType) setTaxType(draft.taxType);
      if (draft.taxPercentage) setTaxPercentage(draft.taxPercentage);
      if (draft.taxName) setTaxName(draft.taxName);
      if (draft.standardDeductible) setStandardDeductible(draft.standardDeductible);
      if (draft.standardDeductibleCurrency) setStandardDeductibleCurrency(draft.standardDeductibleCurrency);
      if (draft.deductibleBuydown) setDeductibleBuydown(draft.deductibleBuydown);
      if (draft.deductibleBuydownCurrency) setDeductibleBuydownCurrency(draft.deductibleBuydownCurrency);
      if (draft.fleet) setFleet(draft.fleet);
      if (draft.namedPilots !== undefined) setNamedPilots(draft.namedPilots);
      if (draft.openPilotWarranty !== undefined) setOpenPilotWarranty(draft.openPilotWarranty);
      if (draft.minRequiredHours) setMinRequiredHours(draft.minRequiredHours);
      if (draft.opwHours) setOpwHours(draft.opwHours);
      if (draft.hasClaimsHistory !== undefined) setHasClaimsHistory(draft.hasClaimsHistory);
      if (draft.claims) setClaimsHistory(draft.claims);
      // Sub-Limits and Clauses
      if (draft.medicalExpensesLimit) setMedicalExpensesLimit(draft.medicalExpensesLimit);
      if (draft.medicalExpensesCurrency) setMedicalExpensesCurrency(draft.medicalExpensesCurrency);
      if (draft.cargoLiabilityLimit) setCargoLiabilityLimit(draft.cargoLiabilityLimit);
      if (draft.cargoLiabilityCurrency) setCargoLiabilityCurrency(draft.cargoLiabilityCurrency);
      if (draft.baggageLimit) setBaggageLimit(draft.baggageLimit);
      if (draft.baggageCurrency) setBaggageCurrency(draft.baggageCurrency);
      if (draft.passengerSettlementLimit) setPassengerSettlementLimit(draft.passengerSettlementLimit);
      if (draft.passengerSettlementCurrency) setPassengerSettlementCurrency(draft.passengerSettlementCurrency);
      if (draft.pphLimit) setPphLimit(draft.pphLimit);
      if (draft.pphCurrency) setPphCurrency(draft.pphCurrency);
      if (draft.noClaimsBonus !== undefined) setNoClaimsBonus(draft.noClaimsBonus);
      if (draft.noClaimsBonusPercentage) setNoClaimsBonusPercentage(draft.noClaimsBonusPercentage);
      if (draft.profitCommission !== undefined) setProfitCommission(draft.profitCommission);
      if (draft.profitCommissionPercentage) setProfitCommissionPercentage(draft.profitCommissionPercentage);
      if (draft.profitCommissionBasis) setProfitCommissionBasis(draft.profitCommissionBasis);
      if (draft.cargoEndorsement !== undefined) setCargoEndorsement(draft.cargoEndorsement);
    }
  }, [draftPlacement]);

  // Auto-save timer - saves draft every 20 seconds
  useEffect(() => {
    // Set up interval to auto-save every 20 seconds
    const autoSaveInterval = setInterval(() => {
      // Only auto-save if we have some meaningful data (not on initial empty form)
      const hasData = selectedMainCoverages.length > 0 || insuredName.trim() !== "";
      
      if (hasData) {
        try {
          console.log('Auto-saving draft...');
          saveDraftProgress();
        } catch (error) {
          console.error('Auto-save error:', error);
        }
      }
    }, 20000); // 20 seconds

    // Clean up interval when component unmounts
    return () => {
      clearInterval(autoSaveInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - timer runs continuously, checking hasData each time

  // Update all fleet aircraft with PA values when they change (for PA-only placements)
  useEffect(() => {
    if (selectedMainCoverages.length === 1 && selectedMainCoverages.includes('PA') && fleet.length > 0) {
      // Only update if values have changed
      const needsUpdate = fleet.some(aircraft => 
        aircraft.crewSumsReinsuredPerSeat !== crewSumsReinsuredPerSeat ||
        aircraft.crewSumsReinsuredCurrency !== crewSumsReinsuredCurrency ||
        aircraft.crewTotalPerOccurrence !== crewTotalPerOccurrence ||
        aircraft.crewTotalPerOccurrenceCurrency !== crewTotalPerOccurrenceCurrency ||
        aircraft.paxSumsReinsuredPerSeat !== paxSumsReinsuredPerSeat ||
        aircraft.paxSumsReinsuredCurrency !== paxSumsReinsuredCurrency ||
        aircraft.paxTotalPerOccurrence !== paxTotalPerOccurrence ||
        aircraft.paxTotalPerOccurrenceCurrency !== paxTotalPerOccurrenceCurrency
      );
      
      if (needsUpdate) {
        setFleet(fleet.map(aircraft => ({
          ...aircraft,
          crewSumsReinsuredPerSeat,
          crewSumsReinsuredCurrency,
          crewTotalPerOccurrence,
          crewTotalPerOccurrenceCurrency,
          paxSumsReinsuredPerSeat,
          paxSumsReinsuredCurrency,
          paxTotalPerOccurrence,
          paxTotalPerOccurrenceCurrency,
        })));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewSumsReinsuredPerSeat, crewSumsReinsuredCurrency, crewTotalPerOccurrence, crewTotalPerOccurrenceCurrency, paxSumsReinsuredPerSeat, paxSumsReinsuredCurrency, paxTotalPerOccurrence, paxTotalPerOccurrenceCurrency]);

  // Auto-skip Step 4 if only LOL is selected or if UAS product (no pilot details needed for drones)
  useEffect(() => {
    // Skip Sub-Limits step for UAS or LOL-only - go directly to Review
    if (currentStep === 5 && (isUASProduct || shouldSkipStep3)) {
      setCurrentStep(6);
    }
  }, [currentStep, shouldSkipStep3, isUASProduct]);

  // Auto-default sub-limit currencies to fleet's liability limit currency when entering Step 5
  useEffect(() => {
    if (currentStep === 5 && fleet.length > 0) {
      const fleetCurrency = fleet[0]?.liabilityLimitCurrency;
      if (fleetCurrency) {
        if (medicalExpensesCurrency === "USD" && !medicalExpensesLimit) setMedicalExpensesCurrency(fleetCurrency);
        if (cargoLiabilityCurrency === "USD" && !cargoLiabilityLimit) setCargoLiabilityCurrency(fleetCurrency);
        if (baggageCurrency === "USD" && !baggageLimit) setBaggageCurrency(fleetCurrency);
        if (passengerSettlementCurrency === "USD" && !passengerSettlementLimit) setPassengerSettlementCurrency(fleetCurrency);
        if (pphCurrency === "USD" && !pphLimit) setPphCurrency(fleetCurrency);
      }
    }
  }, [currentStep]);

  // Handle aircraft type change and reset engine type
  const handleAircraftTypeChange = (type: string) => {
    setAircraftType(type);
    setEngineType(""); // Reset engine type when aircraft type changes
  };

  // Auto-calculate expiry date when inception date changes
  const handleInceptionDateChange = (date: string) => {
    // Validate that inception date is not in the past
    if (date) {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
      
      if (selectedDate < today) {
        toast.error("Inception date cannot be in the past");
        return; // Don't update the state with a past date
      }
    }
    
    setInceptionDate(date);
    
    // Clear highlight when user selects a date
    if (highlightInceptionDate && date) {
      setHighlightInceptionDate(false);
    }
    
    if (date && !inceptionDateTBA) {
      if (bothDatesIncluded) {
        // Both days included: inception + 1 year - 1 day
        const inception = new Date(date);
        const expiry = new Date(inception);
        expiry.setFullYear(expiry.getFullYear() + 1);
        expiry.setDate(expiry.getDate() - 1);
        setExpiryDate(expiry.toISOString().split('T')[0]);
        setExpiryDateTBA(false);
      } else {
        // Not both days included: expiry matches inception
        setExpiryDate(date);
        setExpiryDateTBA(false);
      }
    } else if (inceptionDateTBA) {
      setExpiryDate("");
      setExpiryDateTBA(true);
    } else {
      setExpiryDate("");
    }
  };

  // Handle inception date TBA toggle
  const handleInceptionDateTBAChange = (checked: boolean) => {
    setInceptionDateTBA(checked);
    
    // Clear highlight when TBA is selected
    if (checked && highlightInceptionDate) {
      setHighlightInceptionDate(false);
    }
    
    if (checked) {
      setInceptionDate("");
      setExpiryDate("");
      setExpiryDateTBA(true);
    } else {
      // When unchecking TBA, clear the dates
      setInceptionDate("");
      setExpiryDate("");
      setExpiryDateTBA(false);
    }
  };

  // Handle both dates included checkbox change
  const handleBothDatesIncludedChange = (checked: boolean) => {
    setBothDatesIncluded(checked);
    // Recalculate expiry date based on new setting
    if (inceptionDate) {
      if (checked) {
        // Both days included: inception + 1 year - 1 day
        const inception = new Date(inceptionDate);
        const expiry = new Date(inception);
        expiry.setFullYear(expiry.getFullYear() + 1);
        expiry.setDate(expiry.getDate() - 1);
        setExpiryDate(expiry.toISOString().split('T')[0]);
      } else {
        // Not both days included: expiry matches inception
        setExpiryDate(inceptionDate);
      }
    }
  };

  // Handle inception time change and auto-calculate expiry time (00:01 less)
  const handleInceptionTimeChange = (time: string) => {
    setInceptionTime(time);
    if (time) {
      // Parse the time (HH:MM format)
      const [hours, minutes] = time.split(':').map(Number);
      
      // Create a date object to handle time calculation
      const timeDate = new Date();
      timeDate.setHours(hours);
      timeDate.setMinutes(minutes);
      
      // Subtract 1 minute
      timeDate.setMinutes(timeDate.getMinutes() - 1);
      
      // Format back to HH:MM
      const expiryHours = String(timeDate.getHours()).padStart(2, '0');
      const expiryMinutes = String(timeDate.getMinutes()).padStart(2, '0');
      setExpiryTime(`${expiryHours}:${expiryMinutes}`);
    } else {
      setExpiryTime("");
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Validation for Step 2 - Insured/Reinsured Details
  const isStep2Valid = (): boolean => {
    // Check if insured name is filled
    if (!insuredName.trim()) {
      return false;
    }

    // Check if reinsured is filled (only if placement type is reinsurance)
    if (placementType === "reinsurance" && !reinsuredName.trim()) {
      return false;
    }

    // Check if inception date is filled OR TBA is selected
    if (!inceptionDateTBA && !inceptionDate) {
      return false;
    }

    // Check if additional insured form is open - must be completed or cancelled first
    if (showAdditionalInsuredForm) {
      return false;
    }

    return true;
  };

  // Format number with commas (e.g., 1000 -> 1,000)
  const formatNumberWithCommas = (value: string): string => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    // Add commas for thousands
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Handle CSV upload for LOL pilots
  const handleLolPilotsCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file must contain a header row and at least one data row");
        return;
      }

      // CSV-aware split that handles quoted fields (e.g. "150,000")
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { current += ch; }
          } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ',') { result.push(current.trim()); current = ''; }
            else { current += ch; }
          }
        }
        result.push(current.trim());
        return result;
      };

      // Parse header to get column indices
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('tax'));
      const ageIdx = headers.findIndex(h => h.includes('age'));
      const positionIdx = headers.findIndex(h => h.includes('position'));
      const salaryIdx = headers.findIndex(h => h.includes('salary') && !h.includes('currency'));
      const salaryCurrencyIdx = headers.findIndex(h => h.includes('salary') && h.includes('currency'));
      const sumsInsuredIdx = headers.findIndex(h => (h.includes('sums') || h.includes('sum')) && (h.includes('insured') || h.includes('reinsured')) && !h.includes('currency'));
      const sumsInsuredCurrencyIdx = headers.findIndex(h => (h.includes('sums') || h.includes('sum')) && (h.includes('insured') || h.includes('reinsured')) && h.includes('currency'));
      const taxTypeIdx = headers.findIndex(h => h.includes('tax') && h.includes('type'));
      const taxPercentageIdx = headers.findIndex(h => h.includes('tax') && (h.includes('percentage') || h.includes('%')));
      const taxNameIdx = headers.findIndex(h => h.includes('tax') && h.includes('name'));

      // Check required fields
      if (nameIdx === -1 || ageIdx === -1 || sumsInsuredIdx === -1) {
        toast.error("CSV must contain columns: Name, Age, and Sums Insured (or Sums Reinsured)");
        return;
      }

      const newPilots: typeof lolPilots = [];
      let successCount = 0;
      let errorCount = 0;

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        const name = values[nameIdx] || "";
        const age = values[ageIdx] || "";
        const sumsInsured = values[sumsInsuredIdx] || "";

        // Validate required fields
        if (!name || !age || !sumsInsured) {
          errorCount++;
          continue;
        }

        const pilot = {
          name,
          age,
          position: positionIdx !== -1 ? (values[positionIdx] || "") : "",
          salary: salaryIdx !== -1 ? formatNumberWithCommas(values[salaryIdx] || "") : "",
          salaryCurrency: salaryCurrencyIdx !== -1 ? (values[salaryCurrencyIdx] || "USD") : "USD",
          sumsInsured: formatNumberWithCommas(sumsInsured),
          sumsInsuredCurrency: sumsInsuredCurrencyIdx !== -1 ? (values[sumsInsuredCurrencyIdx] || "USD") : "USD",
          taxType: taxTypeIdx !== -1 ? (values[taxTypeIdx] || "addition") : "addition",
          taxPercentage: taxPercentageIdx !== -1 ? (values[taxPercentageIdx] || "") : "",
          taxName: taxNameIdx !== -1 ? (values[taxNameIdx] || "") : ""
        };

        newPilots.push(pilot);
        successCount++;
      }

      if (successCount > 0) {
        setLolPilots(prev => [...prev, ...newPilots]);
        toast.success(`Successfully added ${successCount} insured person${successCount > 1 ? 's' : ''}`);
      }
      
      if (errorCount > 0) {
        toast.warning(`${errorCount} row${errorCount > 1 ? 's' : ''} skipped due to missing required fields`);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read CSV file");
    };

    reader.readAsText(file);
    
    // Reset input
    if (lolPilotsCsvInputRef.current) {
      lolPilotsCsvInputRef.current.value = '';
    }
  };

  // Handle CSV upload for 24-hour Crew PA members
  const handleCrewMemberCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) { toast.error("CSV must contain a header row and at least one data row"); return; }

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []; let current = ''; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) { if (ch === '"' && line[i+1] === '"') { current += '"'; i++; } else if (ch === '"') { inQuotes = false; } else { current += ch; } }
          else { if (ch === '"') { inQuotes = true; } else if (ch === ',') { result.push(current.trim()); current = ''; } else { current += ch; } }
        }
        result.push(current.trim()); return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const ageIdx = headers.findIndex(h => h.includes('age'));
      const positionIdx = headers.findIndex(h => h.includes('position') || h.includes('role'));
      const sumsIdx = headers.findIndex(h => (h.includes('sums') || h.includes('sum')) && !h.includes('currency'));
      const sumsCurrIdx = headers.findIndex(h => (h.includes('sums') || h.includes('sum')) && h.includes('currency'));

      if (nameIdx === -1 || ageIdx === -1 || sumsIdx === -1) {
        toast.error("CSV must contain columns: Name, Age, and Sums Insured"); return;
      }

      const newMembers: CrewMember[] = [];
      let successCount = 0; let errorCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const name = values[nameIdx] || ""; const age = values[ageIdx] || ""; const sumsInsured = values[sumsIdx] || "";
        if (!name || !age || !sumsInsured) { errorCount++; continue; }
        newMembers.push({
          name, age,
          position: positionIdx !== -1 ? (values[positionIdx] || "") : "",
          sumsInsured: formatNumberWithCommas(sumsInsured),
          sumsInsuredCurrency: sumsCurrIdx !== -1 ? (values[sumsCurrIdx] || "USD") : "USD"
        });
        successCount++;
      }

      if (successCount > 0) {
        setCrewMembers(prev => [...prev, ...newMembers]);
        toast.success(`Successfully added ${successCount} crew member${successCount > 1 ? 's' : ''}`);
      }
      if (errorCount > 0) toast.warning(`${errorCount} row${errorCount > 1 ? 's' : ''} skipped`);
    };
    reader.onerror = () => toast.error("Failed to read CSV file");
    reader.readAsText(file);
    if (crewMemberCsvInputRef.current) crewMemberCsvInputRef.current.value = '';
  };

  // Save draft helper function
  const saveDraftProgress = async () => {
    // Get the broker's company from the selected producing broker contact
    const selectedBrokerContact = selectedProducingBrokerId 
      ? contacts.find(c => c.id === selectedProducingBrokerId)
      : null;
    
    // Upload namedPilotsDocument to storage if it exists and hasn't been uploaded yet
    let uploadedFilePath: string | undefined = undefined;
    if (namedPilotsDocument && !draftPlacement?.draftData?.documents?.some((d: any) => d.name === namedPilotsDocument.name && d.documentType === 'namedPilots')) {
      try {
        const formData = new FormData();
        formData.append('file', namedPilotsDocument);
        formData.append('placementId', draftPlacement?.id || 'temp-' + Date.now());
        formData.append('documentType', 'namedPilots');
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-afd91142/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          uploadedFilePath = data.filePath;
          console.log('✅ Named pilots document uploaded:', uploadedFilePath);
        } else {
          console.error('❌ Failed to upload named pilots document:', await response.text());
        }
      } catch (error) {
        console.error('❌ Error uploading named pilots document:', error);
      }
    }
    
    // Gather ALL form data and current step
    const draftData: Partial<Placement> = {
      brokerName: isDirect ? "Direct" : producingBroker,
      brokerCompany: isDirect ? "Direct" : (selectedBrokerContact?.company || ""),
      insuredName: insuredName,
      inceptionDate: inceptionDate,
      // Parse values with commas removed
      hullValue: aircraftAgreedValue ? parseInt(aircraftAgreedValue.replace(/,/g, "")) : 0,
      liability: liabilityLimit ? parseInt(liabilityLimit.replace(/,/g, "")) : 0,
      aircraftType: aircraftType || make || model || "",
      productCode: selectedMainCoverages[0]?.toUpperCase() || "",
      coverageType: selectedMainCoverages.join(", ") || "",
      draftStep: currentStep,
      draftData: {
        currentStep,
        selectedMainCoverages,
        placementType,
        selectedSubCoverages,
        producingBroker,
        isDirect,
        selectedProducingBrokerId,
        orderHereonPercentage,
        orderHereonBasis,
        crewCoverageType,
        crewMembers,
        lolPilots,
        insuredName,
        insuredAddressLine1,
        insuredCity,
        insuredCountry,
        insuredPostcode,
        selectedInsuredContact,
        additionalInsureds,
        reinsuredName,
        reinsuredAddressLine1,
        reinsuredCity,
        reinsuredCountry,
        reinsuredPostcode,
        selectedReinsuredContact,
        inceptionDate,
        expiryDate,
        inceptionDateTBA,
        expiryDateTBA,
        bothDatesIncluded,
        inceptionTime,
        expiryTime,
        timeZoneOption,
        registration,
        aircraftType,
        engineType,
        make,
        model,
        baseCountry,
        baseRegion,
        aircraftAgreedValue,
        aircraftAgreedValueCurrency,
        crewSeats,
        isDualCrew,
        paxSeats,
        hullDeductible,
        hullDeductibleCurrency,
        liabilityLimit,
        liabilityLimitCurrency,
        liabilityType,
        sumsReinsured,
        sumsReinsuredCurrency,
        standardUses,
        specialUses,
        specialUsesOther,
        aircraftSparesAmount,
        aircraftSparesCurrency,
        excludedCountries,
        taxType,
        taxPercentage,
        taxName,
        standardDeductible,
        standardDeductibleCurrency,
        deductibleBuydown,
        deductibleBuydownCurrency,
        fleet,
        namedPilots,
        openPilotWarranty,
        pilotsUnder65,
        minRequiredHours,
        opwHours,
        hasClaimsHistory,
        claims: claimsHistory,
        selectedLineslips,
        selectedBinders,
        binderBuilderSelections,
        // Sub-Limits and Clauses
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
        noClaimsBonus,
        noClaimsBonusPercentage,
        profitCommission,
        profitCommissionPercentage,
        profitCommissionBasis,
        cargoEndorsement,
        // Combine named pilots document with supporting documents
        documents: [
          ...(draftPlacement?.draftData?.documents || []),
          // Add named pilots document if it exists and hasn't been added yet
          ...(namedPilotsDocument && !draftPlacement?.draftData?.documents?.some((d: any) => d.name === namedPilotsDocument.name && d.documentType === 'namedPilots') 
            ? [{
                name: namedPilotsDocument.name,
                size: namedPilotsDocument.size,
                type: namedPilotsDocument.type,
                uploadedDate: new Date().toISOString(),
                uploadedBy: 'Broker', // You might want to get the actual broker name
                documentType: 'namedPilots', // Tag it so we can identify it later
                filePath: uploadedFilePath // Path in Supabase Storage
              }]
            : []
          ),
        ],
      }
    };

    console.log('💾 Saving draft with claims:', { hasClaimsHistory, claimsCount: claimsHistory.length, claims: claimsHistory });
    console.log('📄 Documents being saved:', draftData.draftData?.documents?.length || 0, 'documents');
    console.log('🌍 Excluded countries being saved:', { excludedCountries, count: excludedCountries.length });
    const savedDraftId = onSaveDraft(draftData);
    if (savedDraftId) {
      setLocalDraftId(savedDraftId);
      console.log('💾 Draft ID captured in PlacementForm:', savedDraftId);
    }
    
    // Return both the draftData and the draft ID for immediate use
    return { draftData: draftData.draftData, draftId: savedDraftId || localDraftId };
  };

  // Handle cancel with auto-save
  const handleCancelWithSave = () => {
    // Save draft before canceling if there's meaningful data
    const hasData = selectedMainCoverages.length > 0 || insuredName.trim() !== "";
    
    if (hasData) {
      try {
        console.log('💾 Saving draft before canceling...');
        saveDraftProgress();
        toast.success('Draft saved successfully');
      } catch (error) {
        console.error('Error saving draft on cancel:', error);
      }
    }
    
    // Call the original onCancel
    onCancel();
  };

  // Handle numeric input with comma formatting
  const handleNumericInput = (value: string, setter: (value: string) => void) => {
    const formatted = formatNumberWithCommas(value);
    setter(formatted);
  };

  // Handle hull deductible input - allows decimals for rotary-wing, integers for fixed-wing
  const handleHullDeductibleInput = (value: string) => {
    if (aircraftType === "rotary-wing") {
      // For rotary-wing, allow decimals (e.g., 2.5)
      // Remove all characters except digits and decimal point
      let cleaned = value.replace(/[^\d.]/g, '');
      
      // Ensure only one decimal point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      
      setHullDeductible(cleaned);
    } else {
      // For fixed-wing, use standard numeric formatting with commas
      handleNumericInput(value, setHullDeductible);
    }
  };

  // Helper function to check if a lineslip is eligible for the entered limits
  const isLineslipEligible = (lineslip: Lineslip, productCode: string): boolean => {
    // Check if lineslip is active
    if (lineslip.status !== "active") return false;
    
    // Check if product code matches
    if (lineslip.productCode !== productCode) return false;

    // Check if insured country matches lineslip countries
    if (lineslip.countries && lineslip.countries.length > 0) {
      if (!insuredCountry || !lineslip.countries.includes(insuredCountry)) {
        return false;
      }
    }

    // Check if producing broker is authorised for this lineslip
    if (lineslip.authorisedProducingBrokerIds && lineslip.authorisedProducingBrokerIds.length > 0) {
      if (!selectedProducingBrokerId || !lineslip.authorisedProducingBrokerIds.includes(selectedProducingBrokerId)) {
        return false;
      }
    }

    // Get the entered limits based on product type
    if (productCode === "HL") {
      // For Hull and Liability, check all aircraft in fleet
      for (const aircraft of fleet) {
        const hullValue = parseInt(removeCommas(aircraft.aircraftAgreedValue || "0"));
        const liabValue = parseInt(removeCommas(aircraft.liabilityLimit || "0"));
        
        if (aircraft.aircraftType === "fixed-wing") {
          if (lineslip.maxHullLimitFixedWing && hullValue > lineslip.maxHullLimitFixedWing) return false;
          if (lineslip.maxLiabilityLimitFixedWing && liabValue > lineslip.maxLiabilityLimitFixedWing) return false;
        } else if (aircraft.aircraftType === "rotary-wing") {
          if (lineslip.maxHullLimitRotaryWing && hullValue > lineslip.maxHullLimitRotaryWing) return false;
          if (lineslip.maxLiabilityLimitRotaryWing && liabValue > lineslip.maxLiabilityLimitRotaryWing) return false;
        }
      }
    } else if (productCode === "HW") {
      // For Hull War, check maximum aircraft value
      for (const aircraft of fleet) {
        const hullValue = parseInt(removeCommas(aircraft.aircraftAgreedValue || "0"));
        if (lineslip.maximumAircraftValue && hullValue > lineslip.maximumAircraftValue) return false;
      }
    } else if (productCode === "PA") {
      // For Personal Accident, check per seat limit
      // This would need PA-specific fields which aren't in the aircraft object yet
      // For now, just check product match
    } else if (productCode === "LOL") {
      // For Loss of Licence, check per person limit
      // This would need LOL-specific fields which aren't in the aircraft object yet
      // For now, just check product match
    }

    return true;
  };

  // Get eligible lineslips for a product code
  const getEligibleLineslips = (productCode: string): Lineslip[] => {
    return lineslips.filter(lineslip => isLineslipEligible(lineslip, productCode));
  };

  // Get eligible binders for a product code (lineslip rules + combined line limit check)
  const getEligibleBinders = (productCode: string): Binder[] => {
    return binders.filter(binder => {
      if (!isLineslipEligible(binder as any, productCode)) return false;
      // For HL binders with combined line limits, check per-aircraft combined exposure
      if (productCode === "HL" && (binder.combinedLineLimitFW || binder.combinedLineLimitRW)) {
        for (const aircraft of fleet) {
          const hullValue = parseInt(removeCommas(aircraft.aircraftAgreedValue || "0"));
          const liabValue = parseInt(removeCommas(aircraft.liabilityLimit || "0"));
          const combined = hullValue + liabValue;
          if (aircraft.aircraftType === "fixed-wing" && binder.combinedLineLimitFW && combined > binder.combinedLineLimitFW) return false;
          if (aircraft.aircraftType === "rotary-wing" && binder.combinedLineLimitRW && combined > binder.combinedLineLimitRW) return false;
        }
      }
      return true;
    });
  };

  // Get producing broker contacts from Contact Manager
  const producingBrokerContacts = contacts.filter(contact => contact.type === "Producing Broker");
  
  // Get insured contacts from Contact Manager
  const insuredContacts = contacts.filter(contact => contact.type === "Insured");
  
  // Filter insured contacts based on search query
  const filteredInsuredContacts = insuredContacts.filter(contact => 
    contact.insuredName?.toLowerCase().includes(insuredSearchQuery.toLowerCase())
  );
  
  // Handle insured name input change
  const handleInsuredNameChange = (value: string) => {
    setInsuredName(value);
    setInsuredSearchQuery(value);
    setShowInsuredSuggestions(true);
    setSelectedInsuredContact(null);
    
    // Clear highlight when user starts typing
    if (highlightInsuredName) {
      setHighlightInsuredName(false);
    }
    
    // Clear address fields when name is removed
    if (!value.trim()) {
      setInsuredAddressLine1("");
      setInsuredCity("");
      setInsuredCountry("");
      setInsuredPostcode("");
    }
  };
  
  // Handle selecting an insured contact from suggestions
  const handleSelectInsuredContact = (contact: Contact) => {
    setSelectedInsuredContact(contact);
    setInsuredName(contact.insuredName || "");
    setInsuredAddressLine1(contact.address || "");
    setInsuredCity(contact.city || "");
    setInsuredCountry(contact.country || "");
    setInsuredPostcode(contact.postalCode || "");
    setInsuredSearchQuery(contact.insuredName || "");
    setShowInsuredSuggestions(false);
    setShowAddInsuredModal(false);
  };
  
  // Handle "Add to Contact Manager" action
  const handleAddInsuredToContacts = () => {
    setShowAddInsuredModal(false);
    setShowContactForm(true);
  };
  
  // Save new insured contact from form
  const handleSaveInsuredContact = (contactData: Omit<Contact, "id" | "createdDate" | "lastModified">) => {
    if (onAddContact) {
      onAddContact(contactData);
      // After saving, auto-fill the form with the new contact data
      setInsuredName(contactData.insuredName || "");
      setInsuredAddressLine1(contactData.address || "");
      setInsuredCity(contactData.city || "");
      setInsuredCountry(contactData.country || "");
      setInsuredPostcode(contactData.postalCode || "");
      setShowContactForm(false);
      toast.success("Insured contact added successfully!");
    }
  };
  
  // Additional insured autocomplete handlers
  const handleAdditionalInsuredNameChange = (value: string) => {
    setTempAdditionalInsured({ ...tempAdditionalInsured, name: value });
    setAdditionalInsuredSearchQuery(value);
    setShowAdditionalInsuredSuggestions(true);
    setSelectedAdditionalInsuredContact(null);
    
    // Clear address fields when name is removed
    if (!value.trim()) {
      setTempAdditionalInsured({
        name: "",
        addressLine1: "",
        city: "",
        country: "",
        postcode: "",
      });
    }
  };
  
  const handleSelectAdditionalInsuredContact = (contact: Contact) => {
    setSelectedAdditionalInsuredContact(contact);
    setTempAdditionalInsured({
      name: contact.insuredName || "",
      addressLine1: contact.address || "",
      city: contact.city || "",
      country: contact.country || "",
      postcode: contact.postalCode || "",
    });
    setAdditionalInsuredSearchQuery(contact.insuredName || "");
    setShowAdditionalInsuredSuggestions(false);
    setShowAddAdditionalInsuredModal(false);
  };
  
  const handleAddAdditionalInsuredToContacts = () => {
    setShowAddAdditionalInsuredModal(false);
    setShowAdditionalInsuredContactForm(true);
  };
  
  const handleSaveAdditionalInsuredContact = (contactData: Omit<Contact, "id" | "createdDate" | "lastModified">) => {
    if (onAddContact) {
      onAddContact(contactData);
      // After saving, auto-fill the form with the new contact data
      setTempAdditionalInsured({
        name: contactData.insuredName || "",
        addressLine1: contactData.address || "",
        city: contactData.city || "",
        country: contactData.country || "",
        postcode: contactData.postalCode || "",
      });
      setShowAdditionalInsuredContactForm(false);
      toast.success("Additional insured contact added successfully!");
    }
  };

  // Reinsured autocomplete handlers
  const cedentContacts = contacts.filter(contact => contact.type === "Cedent");
  
  const filteredCedentContacts = cedentContacts.filter(contact => 
    contact.cedentName?.toLowerCase().includes(reinsuredSearchQuery.toLowerCase())
  );
  
  const handleReinsuredNameChange = (value: string) => {
    setReinsuredName(value);
    setReinsuredSearchQuery(value);
    setShowReinsuredSuggestions(true);
    setSelectedReinsuredContact(null);
    
    // Clear highlight when user starts typing
    if (highlightReinsuredName) {
      setHighlightReinsuredName(false);
    }
    
    // Clear address fields when name is removed
    if (!value.trim()) {
      setReinsuredAddressLine1("");
      setReinsuredCity("");
      setReinsuredCountry("");
      setReinsuredPostcode("");
    }
  };
  
  const handleSelectReinsuredContact = (contact: Contact) => {
    setSelectedReinsuredContact(contact);
    setReinsuredName(contact.cedentName || "");
    setReinsuredAddressLine1(contact.address || "");
    setReinsuredCity(contact.city || "");
    setReinsuredCountry(contact.country || "");
    setReinsuredPostcode(contact.postalCode || "");
    setReinsuredSearchQuery(contact.cedentName || "");
    setShowReinsuredSuggestions(false);
    setShowAddReinsuredModal(false);
  };
  
  const handleAddReinsuredToContacts = () => {
    setShowAddReinsuredModal(false);
    setShowReinsuredContactForm(true);
  };
  
  const handleSaveReinsuredContact = (contactData: Omit<Contact, "id" | "createdDate" | "lastModified">) => {
    if (onAddContact) {
      onAddContact(contactData);
      // After saving, auto-fill the form with the new contact data
      setReinsuredName(contactData.cedentName || "");
      setReinsuredAddressLine1(contactData.address || "");
      setReinsuredCity(contactData.city || "");
      setReinsuredCountry(contactData.country || "");
      setReinsuredPostcode(contactData.postalCode || "");
      setShowReinsuredContactForm(false);
      toast.success("Cedent contact added successfully!");
    }
  };

  // Aircraft/Drone uses options
  const standardUsesOptions = isUASProduct ? [
    "Agriculture",
    "Cleaning/Maintenance",
    "Commercial",
    "Construction",
    "Education",
    "Events (Corporate)",
    "Infrastructure",
    "Instruction",
    "Mapping/Survey",
    "Media/News",
    "Movie/TV/Film",
    "Property Survey",
    "Real Estate",
    "Recreation",
    "Sales/Demo",
    "Surveillance",
    "Wildlife/Conservation",
  ] : [
    "PBP",
    "Industrial Aid",
    "Commercial",
    "Charter",
    "Medevac",
    "Air Ambulance",
    "Photography",
    "Rental",
  ];

  const specialUsesOptions = isUASProduct ? [
    "Fire Fighting",
    "Law Enforcement",
    "Military",
    "Package Delivery",
    "Search and Rescue",
    "Other",
  ] : [
    "Governmental",
    "Police",
    "Flight School",
    "Ab-initio",
    "Boarder Control",
    "Other",
  ];

  // Sanctioned/Excluded Countries — grouped by LSW617J letter
  const sanctionedCountryGroups: { label: string; countries: string[] }[] = [
    {
      label: "(a) Africa",
      countries: [
        "Algeria", "Burundi", "Central African Republic", "Democratic Republic of Congo",
        "Ethiopia", "Far North Region of Cameroon", "Kenya", "Mali", "Mauritania",
        "Nigeria", "Somalia", "The Republic of Sudan", "South Sudan",
      ],
    },
    {
      label: "(b) Caribbean",
      countries: ["Haiti"],
    },
    {
      label: "(c) Asia",
      countries: ["Afghanistan", "Jammu & Kashmir", "Myanmar", "North Korea", "Pakistan"],
    },
    {
      label: "(d) Eastern Europe / Caucasus",
      countries: [
        "Abkhazia", "Nagorno-Karabakh", "The Republic of Belarus",
        "The Russian Federation", "South Ossetia", "Ukraine",
      ],
    },
    {
      label: "(e) Middle East / North Africa",
      countries: [
        "Iran", "Iraq", "Israel", "Lebanon", "Libya",
        "North Sinai Province of Egypt", "Syria", "Yemen",
      ],
    },
  ];
  const sanctionedCountries = sanctionedCountryGroups.flatMap(g => g.countries);

  // EEA Countries
  const eeaCountries = [
    "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
    "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
    "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta",
    "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia",
    "Spain", "Sweden", "Iceland", "Liechtenstein", "Norway"
  ];

  // Countries list by region
  const countries = [
    // Asia
    "Afghanistan", "Armenia", "Azerbaijan", "Bahrain", "Bangladesh", "Bhutan", "Brunei", 
    "Cambodia", "China", "Georgia", "Hong Kong", "India", "Indonesia", "Iran", "Iraq", 
    "Israel", "Japan", "Jordan", "Kazakhstan", "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", 
    "Macau", "Malaysia", "Maldives", "Mongolia", "Myanmar", "Nepal", "North Korea", 
    "Oman", "Pakistan", "Palestine", "Philippines", "Qatar", "Saudi Arabia", "Singapore", 
    "South Korea", "Sri Lanka", "Syria", "Taiwan", "Tajikistan", "Thailand", "Timor-Leste", 
    "Turkey", "Turkmenistan", "United Arab Emirates", "Uzbekistan", "Vietnam", "Yemen",
    // Pacific
    "Australia", "Fiji", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", 
    "New Zealand", "Palau", "Papua New Guinea", "Samoa", "Solomon Islands", "Tonga", 
    "Tuvalu", "Vanuatu",
    // Europe
    "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", 
    "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", 
    "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", 
    "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova", "Monaco", 
    "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", 
    "Romania", "Russia", "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", 
    "Sweden", "Switzerland", "Ukraine", "United Kingdom", "Vatican City",
    // Middle East (additional to those in Asia)
    // Americas
    "Antigua and Barbuda", "Argentina", "Bahamas", "Barbados", "Belize", "Bolivia", 
    "Brazil", "Canada", "Chile", "Colombia", "Costa Rica", "Cuba", "Dominica", 
    "Dominican Republic", "Ecuador", "El Salvador", "Grenada", "Guatemala", "Guyana", 
    "Haiti", "Honduras", "Jamaica", "Mexico", "Nicaragua", "Panama", "Paraguay", "Peru", 
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", 
    "Suriname", "Trinidad and Tobago", "United States", "Uruguay", "Venezuela"
  ].sort();

  const isEEACountry = (country: string): boolean => {
    return eeaCountries.some(eeaCountry => 
      country.toLowerCase().includes(eeaCountry.toLowerCase()) ||
      eeaCountry.toLowerCase().includes(country.toLowerCase())
    );
  };

  const [formData, setFormData] = useState({
    brokerName: "Direct",
    insuredName: "",
    aircraftType: "",
    productCode: "HL",
    coverageType: "Hull & Liability",
    hullValue: "",
    liability: "",
    inceptionDate: "",
    aircraftManufacturer: "",
    yearOfManufacture: "",
    serialNumber: "",
    homeBase: "",
    primaryUse: "",
    annualFlightHours: "",
    pilotExperience: "",
    additionalInfo: "",
  });

  const coverageOptions = [
    {
      id: "HL",
      title: "HULL AND LIABILITY",
      icon: <Plane className="size-6" />,
      color: "bg-white",
      borderColor: "border-blue-200",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
      description: "Comprehensive aircraft coverage"
    },
    {
      id: "HW",
      title: "HULL WAR",
      icon: <Shield className="size-6" />,
      color: "bg-white",
      borderColor: "border-purple-200",
      iconColor: "text-purple-500",
      iconBg: "bg-purple-50",
      description: "War and terrorism coverage"
    },
    {
      id: "PA",
      title: "PERSONAL ACCIDENT",
      icon: <Heart className="size-6" />,
      color: "bg-white",
      borderColor: "border-green-200",
      iconColor: "text-green-500",
      iconBg: "bg-green-50",
      description: "Personal accident coverage"
    },
    {
      id: "LOL",
      title: "LOSS OF LICENCE",
      icon: <FileText className="size-6" />,
      color: "bg-white",
      borderColor: "border-amber-200",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      description: "Loss of licence coverage"
    },
    {
      id: "HD",
      title: "HULL DEDUCTIBLE",
      icon: <DollarSign className="size-6" />,
      color: "bg-white",
      borderColor: "border-rose-200",
      iconColor: "text-rose-500",
      iconBg: "bg-rose-50",
      description: "Hull deductible coverage"
    },
    {
      id: "UAS",
      title: "DRONES",
      icon: <Radar className="size-6" />,
      color: "bg-white",
      borderColor: "border-cyan-200",
      iconColor: "text-cyan-500",
      iconBg: "bg-cyan-50",
      description: "Unmanned aerial systems"
    },
  ];

  const subCoverageOptions: Record<string, { id: string; label: string; disabled?: boolean }[]> = {
    HL: [
      { id: "hull_liability", label: "Hull and Liability", disabled: true }, // Always selected
      { id: "spares", label: "Spares" },
      { id: "products_premises_hangarkeepers", label: "Products, Premises & Hangarkeepers" },
    ],
    HW: [],
    PA: [
      { id: "crew_personal_accident", label: "Crew Personal Accident" },
      { id: "passenger_personal_accident", label: "Passenger Personal Accident" },
    ],
    LOL: [],
    HD: [],
    UAS: [
      { id: "drone_hull", label: "Drone Hull" },
      { id: "drone_liability", label: "Drone Liability" },
    ],
  };

  const toggleSubCoverage = (coverageId: string) => {
    if (selectedSubCoverages.includes(coverageId)) {
      setSelectedSubCoverages(selectedSubCoverages.filter((c) => c !== coverageId));
    } else {
      // PA mutual exclusivity: selecting Pax PA while 24-Hour Crew is active → reset crew to flight_risk
      if (coverageId === "passenger_personal_accident" && crewCoverageType === "24_hour") {
        setCrewCoverageType("flight_risk");
      }
      setSelectedSubCoverages([...selectedSubCoverages, coverageId]);
    }
  };

  const handleMainCoverageSelect = (coverageId: string) => {
    console.log('🔘 Coverage clicked:', coverageId);
    console.log('🔘 Current selectedMainCoverages before:', selectedMainCoverages);
    
    // If clicking on already selected coverage, deselect it
    if (selectedMainCoverages.includes(coverageId)) {
      console.log('🔘 Deselecting coverage');
      setSelectedMainCoverages(selectedMainCoverages.filter((c) => c !== coverageId));
      setSelectedSubCoverages([]);
    } else {
      // If Drones is selected or being selected, enforce exclusivity
      if (coverageId === "UAS" || selectedMainCoverages.includes("UAS")) {
        console.log('🔘 UAS exclusivity - replacing all with:', coverageId);
        setSelectedMainCoverages([coverageId]);
        setSelectedSubCoverages([]);
      } else {
        console.log('🔘 Adding coverage to selection');
        const newSelection = [...selectedMainCoverages, coverageId];
        console.log('🔘 New selectedMainCoverages:', newSelection);
        setSelectedMainCoverages(newSelection);
        setSelectedSubCoverages([]);
      }
    }
  };

  // Check if any selected coverage requires sub-coverages
  const requiresSubCoverages = selectedMainCoverages.some(coverage => {
    const options = subCoverageOptions[coverage] || [];
    return options.length > 0;
  });

  const canProceedStep1 = !!(placementType && selectedMainCoverages.length > 0 && (!requiresSubCoverages || selectedSubCoverages.length > 0) && (isDirect || selectedProducingBrokerId));
  
  // Debug logging
  console.log('Step 1 Validation:', {
    placementType,
    selectedMainCoverages,
    selectedSubCoverages,
    requiresSubCoverages,
    isDirect,
    selectedProducingBrokerId,
    canProceedStep1
  });

  // Step 0: Coverage Selection (pre-step before step 1)
  if (currentStep === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <CoverageSelectionStep
          selectedMainCoverages={selectedMainCoverages}
          onToggleCoverage={handleMainCoverageSelect}
          onContinue={() => setCurrentStep(1)}
          onBack={handleCancelWithSave}
        />
      </div>
    );
  }

  // Step 1: Insurance/Reinsurance + Sub-coverages
  if (currentStep === 1) {
    return (
      <CoverageDetailsStep
        selectedMainCoverages={selectedMainCoverages}
        selectedSubCoverages={selectedSubCoverages}
        setSelectedSubCoverages={setSelectedSubCoverages}
        placementType={placementType}
        setPlacementType={setPlacementType}
        setCurrentStep={setCurrentStep}
        isDirect={isDirect}
        setIsDirect={setIsDirect}
        producingBroker={producingBroker}
        setProducingBroker={setProducingBroker}
        selectedProducingBrokerId={selectedProducingBrokerId}
        setSelectedProducingBrokerId={setSelectedProducingBrokerId}
        brokerComboboxOpen={brokerComboboxOpen}
        setBrokerComboboxOpen={setBrokerComboboxOpen}
        producingBrokerContacts={producingBrokerContacts}
        coverageOptions={coverageOptions}
        subCoverageOptions={subCoverageOptions}
        orderHereonPercentage={orderHereonPercentage}
        setOrderHereonPercentage={setOrderHereonPercentage}
        orderHereonBasis={orderHereonBasis}
        setOrderHereonBasis={setOrderHereonBasis}
        crewCoverageType={crewCoverageType}
        setCrewCoverageType={setCrewCoverageType}
        toggleSubCoverage={toggleSubCoverage}
        isUASProduct={isUASProduct}
        canProceedStep1={canProceedStep1}
        requiresSubCoverages={requiresSubCoverages}
      />
    );
  }

  // Step 2: Insured/Reinsured Details
  if (currentStep === 2) {
    return (
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Insured/Reinsured Details</h1>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                  Step 2 of {selectedMainCoverages.includes('HL') ? 7 : 5} &middot; Provide details of the insured/reinsured
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#004225] bg-green-50 border border-green-200 rounded-md px-3 py-1.5 uppercase tracking-wider">
              Step 2/{selectedMainCoverages.includes('HL') ? 7 : 5}
            </span>
          </div>
        </div>

        <div className="space-y-6">
            {/* Reinsured Details - Show first when reinsurance is selected */}
            {placementType === "reinsurance" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-1 h-5 bg-[#004225] rounded-full" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Reinsured Details</h3>
                </div>
                <div className="space-y-5">
                  {/* Reinsured Name - Full Width with Autocomplete */}
                  <div className="space-y-2">
                    <Label htmlFor="reinsuredName" className="text-slate-900 text-sm font-medium">
                      Reinsured Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="reinsuredName"
                        value={reinsuredName}
                        onChange={(e) => handleReinsuredNameChange(e.target.value)}
                        onFocus={() => setShowReinsuredSuggestions(true)}
                        onBlur={() => {
                          // Delay to allow clicking on suggestions
                          setTimeout(() => {
                            setShowReinsuredSuggestions(false);
                            // Check if reinsured name doesn't match any existing contact
                            if (reinsuredSearchQuery.trim() && filteredCedentContacts.length === 0 && !selectedReinsuredContact) {
                              setShowAddReinsuredModal(true);
                            }
                          }, 200);
                        }}
                        placeholder="Enter reinsured name"
                        className={`bg-gray-50 ${highlightReinsuredName ? 'border-red-500 border-2' : 'border-gray-200'} text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm`}
                      />
                      
                      {/* Autocomplete Dropdown */}
                      {showReinsuredSuggestions && filteredCedentContacts.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          <div className="p-2 border-b border-gray-100">
                            <p className="text-xs text-slate-500">Select from existing cedent contacts:</p>
                          </div>
                          {filteredCedentContacts.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectReinsuredContact(contact);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <p className="text-sm text-slate-900 font-medium">{contact.cedentName}</p>
                              {contact.address && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {contact.address}, {contact.city}, {contact.country} {contact.postalCode}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Address Line 1 and City - Two Columns */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reinsuredAddressLine1" className="text-slate-900 text-sm font-medium">
                        Address Line 1
                      </Label>
                      <Input
                        id="reinsuredAddressLine1"
                        value={reinsuredAddressLine1}
                        onChange={(e) => setReinsuredAddressLine1(e.target.value)}
                        placeholder="Enter address line 1"
                        className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reinsuredCity" className="text-slate-900 text-sm font-medium">
                        City
                      </Label>
                      <Input
                        id="reinsuredCity"
                        value={reinsuredCity}
                        onChange={(e) => setReinsuredCity(e.target.value)}
                        placeholder="Enter city"
                        className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Country and Postcode - Two Columns */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reinsuredCountry" className="text-slate-900 text-sm font-medium">
                        Country
                      </Label>
                      <Popover open={reinsuredCountryComboboxOpen} onOpenChange={setReinsuredCountryComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={reinsuredCountryComboboxOpen}
                            className="w-full justify-between bg-gray-50 border-gray-200 text-slate-900 hover:bg-gray-100 hover:text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg px-4 text-sm h-[42px] font-normal"
                          >
                            <span className={reinsuredCountry ? "text-slate-900" : "text-slate-400"}>
                              {reinsuredCountry || "Select country"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border-gray-200" align="start">
                        <Command className="bg-white">
                          <CommandInput 
                            placeholder="Type to search countries..." 
                            className="h-9 bg-white text-slate-900 border-gray-200"
                          />
                          <CommandList>
                            <CommandEmpty className="text-slate-500 py-6 text-center">No country found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-auto">
                              {countries.map((country) => (
                                <CommandItem
                                  key={country}
                                  value={country}
                                  onSelect={(currentValue) => {
                                    setReinsuredCountry(currentValue === reinsuredCountry ? "" : currentValue);
                                    setReinsuredCountryComboboxOpen(false);
                                  }}
                                  className="text-slate-900 hover:bg-gray-50 aria-selected:bg-gray-50"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 text-[#004225] ${
                                      reinsuredCountry === country ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {country}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reinsuredPostcode" className="text-slate-900 text-sm font-medium">
                        Postcode
                      </Label>
                      <Input
                        id="reinsuredPostcode"
                        value={reinsuredPostcode}
                        onChange={(e) => setReinsuredPostcode(e.target.value)}
                        placeholder="Enter postcode"
                        className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Add Reinsured to Contact Manager Modal */}
                {showAddReinsuredModal && (
                  <Dialog open={showAddReinsuredModal} onOpenChange={setShowAddReinsuredModal}>
                    <DialogContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl text-gray-900 font-semibold">Cedent Not Found</DialogTitle>
                        <DialogDescription className="text-gray-600 text-base mt-2">
                          The cedent "{reinsuredSearchQuery}" is not in your Contact Manager.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <p className="text-gray-700 text-sm">
                          Would you like to add <span className="text-[#004225] font-semibold">"{reinsuredSearchQuery}"</span> to your Contact Manager for future use?
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-xs text-gray-700">
                            💡 Adding this cedent to your Contact Manager will save their details and make it easier to select them in future quotes.
                          </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddReinsuredModal(false)}
                            className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg py-6"
                          >
                            Continue Without Saving
                          </Button>
                          <Button
                            type="button"
                            onClick={handleAddReinsuredToContacts}
                            className="flex-1 bg-[#004225] hover:bg-[#003319] text-white font-semibold rounded-lg py-6"
                          >
                            Add to Contact Manager
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Contact Form Modal - For adding new cedent */}
                {showReinsuredContactForm && (
                  <ContactForm
                    contacts={contacts}
                    onSave={handleSaveReinsuredContact}
                    onCancel={() => setShowReinsuredContactForm(false)}
                    contact={undefined}
                    initialCedentName={reinsuredSearchQuery}
                    initialType="Cedent"
                  />
                )}
                </div>
              </div>
            )}

            {/* Insured Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-1 h-5 bg-[#004225] rounded-full" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Insured Details</h3>
              </div>
              <div className="space-y-5">
                {/* Insured Name - Full Width with Autocomplete */}
                <div className="space-y-2">
                  <Label htmlFor="insuredName" className="text-slate-900 text-sm font-medium">
                    Insured Name
                  </Label>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 relative">
                      <Input
                        id="insuredName"
                        value={insuredName}
                        onChange={(e) => handleInsuredNameChange(e.target.value)}
                        onFocus={() => setShowInsuredSuggestions(true)}
                        onBlur={() => {
                          // Delay to allow clicking on suggestions
                          setTimeout(() => {
                            setShowInsuredSuggestions(false);
                            // Check if insured name doesn't match any existing contact
                            if (insuredSearchQuery.trim() && filteredInsuredContacts.length === 0 && !selectedInsuredContact) {
                              setShowAddInsuredModal(true);
                            }
                          }, 200);
                        }}
                        placeholder="Enter insured name"
                        className={`bg-gray-50 ${highlightInsuredName ? 'border-red-500 border-2' : 'border-gray-200'} text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm`}
                      />
                      
                      {/* Autocomplete Dropdown */}
                      {showInsuredSuggestions && filteredInsuredContacts.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          <div className="p-2 border-b border-gray-100">
                            <p className="text-xs text-slate-500">Select from existing insured contacts:</p>
                          </div>
                          {filteredInsuredContacts.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectInsuredContact(contact);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <p className="text-sm text-slate-900 font-medium">{contact.insuredName}</p>
                              {contact.address && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {contact.address}, {contact.city}, {contact.country} {contact.postalCode}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-1">
                      <div className="h-full flex items-center justify-center rounded-lg border bg-gray-50 border-gray-200 transition-all duration-200">
                        {insuredCountry.trim() && (
                          <span className={`font-semibold text-sm ${isEEACountry(insuredCountry) ? "text-blue-600" : "text-orange-600"}`}>
                            {isEEACountry(insuredCountry) ? "EEA" : "NON-EEA"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Address Line 1 and City - Two Columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insuredAddressLine1" className="text-slate-900 text-sm font-medium">
                      Address Line 1
                    </Label>
                    <Input
                      id="insuredAddressLine1"
                      value={insuredAddressLine1}
                      onChange={(e) => setInsuredAddressLine1(e.target.value)}
                      placeholder="Enter address line 1"
                      className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuredCity" className="text-slate-900 text-sm font-medium">
                      City
                    </Label>
                    <Input
                      id="insuredCity"
                      value={insuredCity}
                      onChange={(e) => setInsuredCity(e.target.value)}
                      placeholder="Enter city"
                      className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                    />
                  </div>
                </div>
                
                {/* Country and Postcode - Two Columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insuredCountry" className="text-slate-900 text-sm font-medium">
                      Country
                    </Label>
                    <Popover open={countryComboboxOpen} onOpenChange={setCountryComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryComboboxOpen}
                          className="w-full justify-between bg-gray-50 border-gray-200 text-slate-900 hover:bg-gray-100 hover:text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg px-4 text-sm h-[42px] font-normal"
                        >
                          <span className={insuredCountry ? "text-slate-900" : "text-slate-400"}>
                            {insuredCountry || "Select country"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border-gray-200" align="start">
                        <Command className="bg-white">
                          <CommandInput 
                            placeholder="Type to search countries..." 
                            className="h-9 bg-white text-slate-900 border-gray-200"
                          />
                          <CommandList>
                            <CommandEmpty className="text-slate-500 py-6 text-center">No country found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-auto">
                              {countries.map((country) => (
                                <CommandItem
                                  key={country}
                                  value={country}
                                  onSelect={(currentValue) => {
                                    setInsuredCountry(currentValue === insuredCountry ? "" : currentValue);
                                    setCountryComboboxOpen(false);
                                  }}
                                  className="text-slate-900 hover:bg-gray-50 aria-selected:bg-gray-50"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 text-[#004225] ${
                                      insuredCountry === country ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {country}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuredPostcode" className="text-slate-900 text-sm font-medium">
                      Postcode
                    </Label>
                    <Input
                      id="insuredPostcode"
                      value={insuredPostcode}
                      onChange={(e) => setInsuredPostcode(e.target.value)}
                      placeholder="Enter postcode"
                      className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Add Additional Insured Section */}
            <div className="space-y-4">
              {/* Add Additional Insured Button */}
              <Button
                type="button"
                onClick={() => setShowAdditionalInsuredForm(true)}
                className="w-full bg-white border border-gray-200 text-[#004225] hover:bg-gray-50 rounded-xl py-3 text-sm font-medium transition-all duration-200 shadow-sm"
              >
                + Add Additional Insured
              </Button>

              {/* Additional Insured Form */}
              {showAdditionalInsuredForm && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 animate-in fade-in duration-300 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-5 bg-[#004225] rounded-full" />
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Additional Insured Details</h4>
                  </div>
                  <div className="space-y-5">
                    {/* Name - Full Width with Autocomplete */}
                    <div className="space-y-2">
                      <Label htmlFor="additionalInsuredName" className="text-slate-900 text-sm font-medium">
                        Name
                      </Label>
                      <div className="relative">
                        <Input
                          id="additionalInsuredName"
                          value={tempAdditionalInsured.name}
                          onChange={(e) => handleAdditionalInsuredNameChange(e.target.value)}
                          onFocus={() => setShowAdditionalInsuredSuggestions(true)}
                          onBlur={() => {
                            // Delay to allow clicking on suggestions
                            setTimeout(() => {
                              setShowAdditionalInsuredSuggestions(false);
                              // Check if additional insured name doesn't match any existing contact
                              const filteredAdditionalInsuredContacts = insuredContacts.filter(contact => 
                                contact.insuredName?.toLowerCase().includes(additionalInsuredSearchQuery.toLowerCase())
                              );
                              if (additionalInsuredSearchQuery.trim() && filteredAdditionalInsuredContacts.length === 0 && !selectedAdditionalInsuredContact) {
                                setShowAddAdditionalInsuredModal(true);
                              }
                            }, 200);
                          }}
                          placeholder="Enter additional insured name"
                          className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                        />
                        
                        {/* Autocomplete Dropdown */}
                        {showAdditionalInsuredSuggestions && insuredContacts.filter(contact => 
                          contact.insuredName?.toLowerCase().includes(additionalInsuredSearchQuery.toLowerCase())
                        ).length > 0 && (
                          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            <div className="p-3 border-b border-gray-100 bg-gray-50">
                              <p className="text-xs text-slate-600 font-medium">Select from existing insured contacts:</p>
                            </div>
                            {insuredContacts.filter(contact => 
                              contact.insuredName?.toLowerCase().includes(additionalInsuredSearchQuery.toLowerCase())
                            ).map((contact) => (
                              <button
                                key={contact.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectAdditionalInsuredContact(contact);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <p className="text-sm text-slate-900 font-semibold">{contact.insuredName}</p>
                                {contact.address && (
                                  <p className="text-xs text-slate-600 mt-1">
                                    {contact.address}, {contact.city}, {contact.country} {contact.postalCode}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Address Line 1 and City - Two Columns */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="additionalInsuredAddressLine1" className="text-slate-900 text-sm font-medium">
                          Address Line 1
                        </Label>
                        <Input
                          id="additionalInsuredAddressLine1"
                          value={tempAdditionalInsured.addressLine1}
                          onChange={(e) => setTempAdditionalInsured({ ...tempAdditionalInsured, addressLine1: e.target.value })}
                          placeholder="Enter address line 1"
                          className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="additionalInsuredCity" className="text-slate-900 text-sm font-medium">
                          City
                        </Label>
                        <Input
                          id="additionalInsuredCity"
                          value={tempAdditionalInsured.city}
                          onChange={(e) => setTempAdditionalInsured({ ...tempAdditionalInsured, city: e.target.value })}
                          placeholder="Enter city"
                          className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Country and Postcode - Two Columns */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="additionalInsuredCountry" className="text-slate-900 text-sm font-medium">
                          Country
                        </Label>
                        <Input
                          id="additionalInsuredCountry"
                          value={tempAdditionalInsured.country}
                          onChange={(e) => setTempAdditionalInsured({ ...tempAdditionalInsured, country: e.target.value })}
                          placeholder="Enter country"
                          className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="additionalInsuredPostcode" className="text-slate-900 text-sm font-medium">
                          Postcode
                        </Label>
                        <Input
                          id="additionalInsuredPostcode"
                          value={tempAdditionalInsured.postcode}
                          onChange={(e) => setTempAdditionalInsured({ ...tempAdditionalInsured, postcode: e.target.value })}
                          placeholder="Enter postcode"
                          className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowAdditionalInsuredForm(false);
                        setTempAdditionalInsured({
                          name: "",
                          addressLine1: "",
                          city: "",
                          country: "",
                          postcode: "",
                        });
                        setAdditionalInsuredSearchQuery("");
                        setShowAdditionalInsuredSuggestions(false);
                        setSelectedAdditionalInsuredContact(null);
                      }}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg px-6 py-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (tempAdditionalInsured.name.trim()) {
                          setAdditionalInsureds([...additionalInsureds, tempAdditionalInsured]);
                          setShowAdditionalInsuredForm(false);
                          setTempAdditionalInsured({
                            name: "",
                            addressLine1: "",
                            city: "",
                            country: "",
                            postcode: "",
                          });
                          setAdditionalInsuredSearchQuery("");
                          setShowAdditionalInsuredSuggestions(false);
                          setSelectedAdditionalInsuredContact(null);
                        }
                      }}
                      className="bg-[#004225] hover:bg-[#003319] text-white font-medium rounded-lg px-8 py-2"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}

              {/* Display Additional Insureds */}
              {additionalInsureds.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-4 bg-[#004225] rounded-full" />
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Additional Insureds ({additionalInsureds.length})</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {additionalInsureds.map((insured, index) => {
                      const addressParts = [
                        insured.addressLine1,
                        insured.city,
                        insured.postcode,
                        insured.country
                      ].filter(Boolean);
                      const fullAddress = addressParts.join(', ');
                      
                      return (
                        <div
                          key={index}
                          className="bg-white border border-[#004225] rounded-full px-3 py-1.5 flex items-center gap-2 group hover:bg-green-50 transition-all duration-200 relative"
                          title={fullAddress || 'No address provided'}
                        >
                          <svg className="size-3.5 text-[#004225]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[#004225] font-medium text-xs">{insured.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAdditionalInsureds(additionalInsureds.filter((_, i) => i !== index));
                            }}
                            className="text-[#004225] hover:text-red-600 transition-colors duration-200"
                          >
                            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Add Additional Insured to Contact Manager Modal */}
              {showAddAdditionalInsuredModal && (
                <Dialog open={showAddAdditionalInsuredModal} onOpenChange={setShowAddAdditionalInsuredModal}>
                  <DialogContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-2xl text-gray-900 font-semibold">Additional Insured Not Found</DialogTitle>
                      <DialogDescription className="text-gray-600 text-base mt-2">
                        The insured "{additionalInsuredSearchQuery}" is not in your Contact Manager.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <p className="text-gray-700 text-sm">
                        Would you like to add <span className="text-[#004225] font-semibold">"{additionalInsuredSearchQuery}"</span> to your Contact Manager for future use?
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-xs text-gray-700">
                          Adding this insured to your Contact Manager will save their details and make it easier to select them in future quotes.
                        </p>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddAdditionalInsuredModal(false)}
                          className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg py-6"
                        >
                          Continue Without Saving
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddAdditionalInsuredToContacts}
                          className="flex-1 bg-[#004225] hover:bg-[#003319] text-white font-semibold rounded-lg py-6"
                        >
                          Add to Contact Manager
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {/* Contact Form Modal - For adding new additional insured */}
              {showAdditionalInsuredContactForm && (
                <ContactForm
                  contacts={contacts}
                  onSave={handleSaveAdditionalInsuredContact}
                  onCancel={() => setShowAdditionalInsuredContactForm(false)}
                  contact={undefined}
                  initialInsuredName={additionalInsuredSearchQuery}
                  initialType="Insured"
                />
              )}
            </div>

            {/* Inception Dates */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-1 h-5 bg-[#004225] rounded-full" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Inception Dates</h3>
              </div>
              <div className="grid grid-cols-[0.7fr_0.7fr_0.3fr] gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="inceptionDate" className="text-slate-900 text-sm font-medium">
                    Inception Date
                  </Label>
                  {inceptionDateTBA ? (
                    <div className={`bg-orange-50 border-2 ${highlightInceptionDate ? 'border-red-500' : 'border-orange-200'} rounded-lg py-2 px-3 text-xs text-orange-600 font-medium flex items-center justify-center`}>
                      To Be Announced
                    </div>
                  ) : (
                    <Input
                      id="inceptionDate"
                      type="date"
                      value={inceptionDate}
                      onChange={(e) => handleInceptionDateChange(e.target.value)}
                      min={getTodayDate()}
                      placeholder="Select inception date"
                      className={`bg-gray-50 ${highlightInceptionDate ? 'border-red-500 border-2' : 'border-gray-200'} text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm`}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate" className="text-slate-900 text-sm font-medium">
                    Expiry Date
                  </Label>
                  {expiryDateTBA ? (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg py-2 px-3 text-xs text-orange-600 font-medium flex items-center justify-center">
                      To Be Announced
                    </div>
                  ) : (
                    <Input
                      id="expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      placeholder="Auto-calculated from inception date"
                      className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                    />
                  )}
                </div>
                <div className="flex items-center space-x-2 pb-1">
                  <Checkbox
                    id="inceptionDateTBA"
                    checked={inceptionDateTBA}
                    onCheckedChange={(checked) => handleInceptionDateTBAChange(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225]"
                  />
                  <Label 
                    htmlFor="inceptionDateTBA" 
                    className="text-slate-600 text-sm font-medium cursor-pointer whitespace-nowrap"
                  >
                    TBA
                  </Label>
                </div>
              </div>
              
              {/* Both Days Included Checkbox */}
              <div className="flex items-center space-x-3 pt-4">
                <Checkbox
                  id="bothDatesIncluded"
                  checked={bothDatesIncluded}
                  onCheckedChange={(checked) => handleBothDatesIncludedChange(checked as boolean)}
                  disabled={inceptionDateTBA}
                  className="border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Label 
                  htmlFor="bothDatesIncluded" 
                  className={`font-medium text-sm ${inceptionDateTBA ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900 cursor-pointer'}`}
                >
                  Both Days Included
                </Label>
              </div>

              {/* Exact Timings Section - Only shown when Both Days Included is unchecked */}
              {!bothDatesIncluded && (
                <div className="space-y-4 pt-6 border-t border-gray-100 mt-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="inceptionTime" className={`text-sm font-medium ${inceptionDateTBA ? 'text-slate-400' : 'text-slate-900'}`}>
                        Inception Time
                      </Label>
                      <Input
                        id="inceptionTime"
                        type="time"
                        value={inceptionTime}
                        onChange={(e) => handleInceptionTimeChange(e.target.value)}
                        disabled={inceptionDateTBA}
                        placeholder="Select inception time"
                        className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryTime" className={`text-sm font-medium ${inceptionDateTBA ? 'text-slate-400' : 'text-slate-900'}`}>
                        Expiry Time
                      </Label>
                      <Input
                        id="expiryTime"
                        type="time"
                        value={expiryTime}
                        onChange={(e) => setExpiryTime(e.target.value)}
                        disabled={inceptionDateTBA}
                        placeholder="Select expiry time"
                        className="bg-gray-50 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Time Zone Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="timeZone" className={`text-sm font-medium ${inceptionDateTBA ? 'text-slate-400' : 'text-slate-900'}`}>
                      Time Zone
                    </Label>
                    <Select value={timeZoneOption} onValueChange={setTimeZoneOption} disabled={inceptionDateTBA}>
                      <SelectTrigger 
                        id="timeZone"
                        className="bg-gray-50 border-gray-200 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg py-3 text-sm"
                      >
                        <SelectValue placeholder="Select time zone" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="original-insured" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                          Time at the Original Insured
                        </SelectItem>
                        <SelectItem value="cedent" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                          Times at the Cedent
                        </SelectItem>
                        <SelectItem value="gmt" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                          GMT
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              </div>
            </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-5 border-t border-gray-200 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCurrentStep(1)}
              className="text-slate-500 hover:text-slate-900 hover:bg-gray-50 rounded-lg px-5 py-2.5 text-sm font-medium border border-gray-200"
            >
              ← Back
            </Button>
            <div className="flex items-center gap-3">
              {!isStep2Valid() && (
                <div className="text-amber-600 text-xs font-medium">
                  {!insuredName.trim() ? "Enter Insured Name" :
                   placementType === "reinsurance" && !reinsuredName.trim() ? "Enter Reinsured Name" :
                   !inceptionDateTBA && !inceptionDate ? "Select Inception Date or TBA" :
                   showAdditionalInsuredForm ? "Complete or Cancel the Additional Insured form" : ""}
                </div>
              )}
              <Button
                type="button"
                onClick={() => {
                  // Reset all highlights first
                  setHighlightInsuredName(false);
                  setHighlightReinsuredName(false);
                  setHighlightInceptionDate(false);
                  
                  if (!isStep2Valid()) {
                    let errorMessage = "Please complete the following required fields:\n";
                    if (!insuredName.trim()) {
                      errorMessage += "• Insured Name\n";
                      setHighlightInsuredName(true);
                    }
                    if (placementType === "reinsurance" && !reinsuredName.trim()) {
                      errorMessage += "• Reinsured Name\n";
                      setHighlightReinsuredName(true);
                    }
                    if (!inceptionDateTBA && !inceptionDate) {
                      errorMessage += "• Inception Date (or select TBA)\n";
                      setHighlightInceptionDate(true);
                    }
                    if (showAdditionalInsuredForm) {
                      errorMessage += "• Complete or Cancel the Additional Insured form\n";
                    }
                    toast.error(errorMessage);
                    return;
                  }
                  // Don't call saveDraftProgress() here - auto-save handles it
                  // Go to Step 3 - will show LOL Pilot Details if shouldSkipStep3 is true
                  setCurrentStep(3);
                }}
                disabled={!isStep2Valid()}
                className={`font-medium rounded-lg px-8 py-2.5 transition-all duration-200 ${
                  isStep2Valid() 
                    ? 'bg-[#004225] hover:bg-[#003319] text-white' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {shouldSkipStep3 ? 'Continue to Step 3 (Insured Person Details) →' : isPA24Hour ? 'Continue to Step 3 (Crew Member Details) →' : 'Continue to Step 3 →'}
              </Button>
            </div>
          </div>
        
        {/* Add Insured Modal - Appears when insured name not found */}
        {showAddInsuredModal && (
          <Dialog open={showAddInsuredModal} onOpenChange={setShowAddInsuredModal}>
            <DialogContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-gray-900 font-semibold">Insured Not Found</DialogTitle>
                <DialogDescription className="text-gray-600 text-base mt-2">
                  The insured "{insuredSearchQuery}" is not in your Contact Manager.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-gray-700 text-sm">
                  Would you like to add <span className="text-[#004225] font-semibold">"{insuredSearchQuery}"</span> to your Contact Manager for future use?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-gray-700">
                    Adding this insured to your Contact Manager will save their details and make it easier to select them in future quotes.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddInsuredModal(false)}
                    className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg py-6"
                  >
                    Continue Without Saving
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddInsuredToContacts}
                    className="flex-1 bg-[#004225] hover:bg-[#003319] text-white font-semibold rounded-lg py-6"
                  >
                    Add to Contact Manager
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Contact Form Modal - For adding new insured */}
        {showContactForm && (
          <ContactForm
            contacts={contacts}
            onSave={handleSaveInsuredContact}
            onCancel={() => setShowContactForm(false)}
            contact={undefined}
            initialInsuredName={insuredSearchQuery}
            initialType="Insured"
          />
        )}
        </div>
      </div>
    );
  }

  // JetAPI aircraft lookup function
  const handleAircraftLookup = async () => {
    if (!registration.trim()) {
      toast.error("Please enter a registration number first");
      return;
    }

    setIsLookingUpAircraft(true);
    setAircraftLookupError("");

    // Clear existing aircraft data before lookup
    setMake("");
    setModel("");
    setAircraftType("");
    setEngineType("");
    setCrewSeats("");
    setPaxSeats("");

    const result = await lookupAircraft(registration);
    
    setIsLookingUpAircraft(false);

    if (!result.success) {
      // More user-friendly message for not-found errors
      const isNotFound = result.error?.includes('not found') || result.error?.includes('not be in the JetAPI database');
      
      if (isNotFound) {
        toast(`${AcLabel} not found in database - please enter details manually`, {
          duration: 4000,
        });
        setAircraftLookupError("Not found - enter manually");
      } else {
        toast.error(result.error || `Failed to lookup ${acLabel}`);
        setAircraftLookupError(result.error || "Lookup failed");
      }
      return;
    }

    // Auto-populate form fields with aircraft data
    if (result.data) {
      if (result.data.make) setMake(result.data.make);
      if (result.data.model) setModel(result.data.model);
      if (result.data.aircraftType) setAircraftType(result.data.aircraftType);
      if (result.data.engineType) setEngineType(result.data.engineType);
      if (result.data.crewSeats) setCrewSeats(result.data.crewSeats);
      if (result.data.paxSeats) setPaxSeats(result.data.paxSeats);
    }

    if (result.fieldsPopulated > 0) {
      toast.success(`${AcLabel} data loaded! ${result.fieldsPopulated} field${result.fieldsPopulated > 1 ? 's' : ''} populated.`);
    } else {
      toast.warning(`${AcLabel} found, but no additional details available to populate.`);
    }
  };

  // Helper functions for fleet management
  const addCurrentAircraftToFleet = () => {
    // Check if registration already exists in fleet
    const isDuplicate = fleet.some(aircraft => 
      aircraft.registration.toLowerCase().trim() === registration.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setIsDuplicateAlertOpen(true);
      return;
    }
    
    // Calculate Sums Reinsured for Hull Deductible (Standard Deductible - Deductible Buydown)
    const calculatedSumsReinsured = selectedMainCoverages.includes('HD') 
      ? (() => {
          const standard = parseInt(standardDeductible.replace(/,/g, "") || "0");
          const buydown = parseInt(deductibleBuydown.replace(/,/g, "") || "0");
          const difference = standard - buydown;
          return difference > 0 ? difference.toString() : "0";
        })()
      : sumsReinsured;
    
    const currentAircraft: Aircraft = {
      registration,
      aircraftType,
      engineType,
      make,
      model,
      baseCountry,
      baseRegion,
      crewSeats,
      paxSeats,
      isDualCrew,
      hullDeductible,
      hullDeductibleCurrency,
      aircraftAgreedValue,
      aircraftAgreedValueCurrency,
      liabilityLimit,
      liabilityLimitCurrency,
      liabilityType,
      sumsReinsured: calculatedSumsReinsured,
      sumsReinsuredCurrency: selectedMainCoverages.includes('HD') ? standardDeductibleCurrency : sumsReinsuredCurrency,
      crewSumsReinsuredPerSeat,
      crewSumsReinsuredCurrency,
      crewTotalPerOccurrence,
      crewTotalPerOccurrenceCurrency,
      paxSumsReinsuredPerSeat,
      paxSumsReinsuredCurrency,
      paxTotalPerOccurrence,
      paxTotalPerOccurrenceCurrency,
      standardDeductible,
      standardDeductibleCurrency,
      deductibleBuydown,
      deductibleBuydownCurrency,
      standardUses,
      specialUses,
      specialUsesOther,
      excludedCountries,
      taxType,
      taxPercentage,
      taxName,
    };
    setFleet([...fleet, currentAircraft]);
    
    // Reset fields for next aircraft
    setRegistration("");
    setAircraftType("");
    setEngineType("");
    setMake("");
    setModel("");
    setCrewSeats("");
    setPaxSeats("");
    setIsDualCrew(false);
    setHullDeductible("");
    setAircraftAgreedValue("");
    setLiabilityLimit("");
    setSumsReinsured("");
    setStandardUses([]);
    setSpecialUses([]);
    setSpecialUsesOther("");
    setExcludedCountries([]);
    setTaxType("addition");
    setTaxPercentage("");
    setTaxName("");
  };

  const handleDroneCsvUpload = async (file: File) => {
    const parseRows = (lines: string[][]) => {
      try {
        if (lines.length < 2) {
          toast.error('File must have a header row and at least one data row');
          return;
        }
        const headers = lines[0].map(h => h.trim().toLowerCase());
        const snIdx = headers.findIndex(h => h.includes('serial'));
        const makeIdx = headers.findIndex(h => h === 'make');
        const modelIdx = headers.findIndex(h => h === 'model');
        const valueIdx = headers.findIndex(h => h.includes('agreed') || h.includes('value'));
        const liabIdx = headers.findIndex(h => h.includes('liab') || h.includes('limit'));
        const countryIdx = headers.findIndex(h => (h.includes('base') && h.includes('country')) || h === 'country');
        const stdUsesIdx = headers.findIndex(h => h.includes('standard') && h.includes('use'));
        const splUsesIdx = headers.findIndex(h => h.includes('special') && h.includes('use'));

        if (snIdx === -1 || makeIdx === -1 || modelIdx === -1) {
          toast.error('CSV must contain Serial Number, Make, and Model columns');
          return;
        }

        let added = 0;
        let skipped = 0;
        const newDrones: Aircraft[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].map(c => (c ?? '').toString().trim());
          const sn = cols[snIdx] || '';
          const mk = cols[makeIdx] || '';
          const mdl = cols[modelIdx] || '';
          if (!sn || !mk || !mdl) { skipped++; continue; }

          const isDup = fleet.some(a => a.registration.toLowerCase() === sn.toLowerCase()) ||
                        newDrones.some(a => a.registration.toLowerCase() === sn.toLowerCase());
          if (isDup) { skipped++; continue; }

          const av = valueIdx !== -1 ? (cols[valueIdx] || '').replace(/[^0-9]/g, '') : '';
          const ll = liabIdx !== -1 ? (cols[liabIdx] || '').replace(/[^0-9]/g, '') : '';

          // Parse pipe-separated uses and validate against allowed options
          const parsedStdUses = stdUsesIdx !== -1 && cols[stdUsesIdx]
            ? cols[stdUsesIdx].split('|').map(u => u.trim()).filter(u => standardUsesOptions.includes(u))
            : standardUses;
          const parsedSplUses = splUsesIdx !== -1 && cols[splUsesIdx]
            ? cols[splUsesIdx].split('|').map(u => u.trim()).filter(u => specialUsesOptions.includes(u))
            : specialUses;

          newDrones.push({
            registration: sn,
            aircraftType: '',
            engineType: '',
            make: mk,
            model: mdl,
            baseCountry: countryIdx !== -1 && cols[countryIdx] ? cols[countryIdx] : baseCountry,
            baseRegion,
            crewSeats: '',
            paxSeats: '',
            isDualCrew: false,
            hullDeductible: '',
            hullDeductibleCurrency: aircraftAgreedValueCurrency,
            aircraftAgreedValue: av,
            aircraftAgreedValueCurrency,
            liabilityLimit: ll,
            liabilityLimitCurrency,
            liabilityType: 'TPL',
            sumsReinsured: '',
            sumsReinsuredCurrency: 'USD',
            crewSumsReinsuredPerSeat,
            crewSumsReinsuredCurrency,
            crewTotalPerOccurrence,
            crewTotalPerOccurrenceCurrency,
            paxSumsReinsuredPerSeat,
            paxSumsReinsuredCurrency,
            paxTotalPerOccurrence,
            paxTotalPerOccurrenceCurrency,
            standardDeductible,
            standardDeductibleCurrency,
            deductibleBuydown,
            deductibleBuydownCurrency,
            standardUses: parsedStdUses,
            specialUses: parsedSplUses,
            specialUsesOther: parsedSplUses.includes('Other') ? specialUsesOther : '',
            excludedCountries,
            taxType,
            taxPercentage,
            taxName,
          });
          added++;
        }

        if (newDrones.length > 0) {
          setFleet([...fleet, ...newDrones]);
        }
        toast.success(`Imported ${added} drone${added !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} skipped (duplicate or incomplete)` : ''}`);
      } catch (err) {
        toast.error('Failed to parse file');
      }
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const csvLines = text.split(/\r?\n/).filter(line => line.trim());
      const rows = csvLines.map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
          else { current += ch; }
        }
        result.push(current.trim());
        return result;
      });
      parseRows(rows);
    };
    reader.readAsText(file);
  };

  const removeAircraftFromFleet = (index: number) => {
    setFleet(fleet.filter((_, i) => i !== index));
  };

  const editAircraftInFleet = (index: number) => {
    const aircraft = fleet[index];
    // Populate form fields with aircraft data
    setRegistration(aircraft.registration);
    setAircraftType(aircraft.aircraftType);
    setEngineType(aircraft.engineType);
    setMake(aircraft.make);
    setModel(aircraft.model);
    setBaseCountry(aircraft.baseCountry || "");
    setBaseRegion(aircraft.baseRegion || "");
    setCrewSeats(aircraft.crewSeats);
    setPaxSeats(aircraft.paxSeats);
    setIsDualCrew(aircraft.isDualCrew);
    setHullDeductible(aircraft.hullDeductible);
    setHullDeductibleCurrency(aircraft.hullDeductibleCurrency);
    setAircraftAgreedValue(aircraft.aircraftAgreedValue);
    setAircraftAgreedValueCurrency(aircraft.aircraftAgreedValueCurrency);
    setLiabilityLimit(aircraft.liabilityLimit);
    setLiabilityLimitCurrency(aircraft.liabilityLimitCurrency);
    setLiabilityType(aircraft.liabilityType || "CSL");
    setSumsReinsured(aircraft.sumsReinsured);
    setSumsReinsuredCurrency(aircraft.sumsReinsuredCurrency);
    setCrewSumsReinsuredPerSeat(aircraft.crewSumsReinsuredPerSeat || "");
    setCrewSumsReinsuredCurrency(aircraft.crewSumsReinsuredCurrency || "USD");
    setCrewTotalPerOccurrence(aircraft.crewTotalPerOccurrence || "");
    setCrewTotalPerOccurrenceCurrency(aircraft.crewTotalPerOccurrenceCurrency || "USD");
    setPaxSumsReinsuredPerSeat(aircraft.paxSumsReinsuredPerSeat || "");
    setPaxSumsReinsuredCurrency(aircraft.paxSumsReinsuredCurrency || "USD");
    setPaxTotalPerOccurrence(aircraft.paxTotalPerOccurrence || "");
    setPaxTotalPerOccurrenceCurrency(aircraft.paxTotalPerOccurrenceCurrency || "USD");
    setStandardDeductible(aircraft.standardDeductible || "");
    setStandardDeductibleCurrency(aircraft.standardDeductibleCurrency || "USD");
    setDeductibleBuydown(aircraft.deductibleBuydown || "");
    setDeductibleBuydownCurrency(aircraft.deductibleBuydownCurrency || "USD");
    setStandardUses(aircraft.standardUses);
    setSpecialUses(aircraft.specialUses);
    setSpecialUsesOther(aircraft.specialUsesOther);
    setTaxType(aircraft.taxType);
    setTaxPercentage(aircraft.taxPercentage);
    setTaxName(aircraft.taxName);
    
    // Store the index and open modal
    setEditingAircraftIndex(index);
    setIsEditModalOpen(true);
  };
  
  const saveEditedAircraft = () => {
    if (editingAircraftIndex === null) return;
    
    // Check if registration already exists in fleet (excluding current aircraft being edited)
    const isDuplicate = fleet.some((aircraft, index) => 
      index !== editingAircraftIndex && 
      aircraft.registration.toLowerCase().trim() === registration.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setIsDuplicateAlertOpen(true);
      return;
    }
    
    // Calculate Sums Reinsured for Hull Deductible (Standard Deductible - Deductible Buydown)
    const calculatedSumsReinsured = selectedMainCoverages.includes('HD') 
      ? (() => {
          const standard = parseInt(standardDeductible.replace(/,/g, "") || "0");
          const buydown = parseInt(deductibleBuydown.replace(/,/g, "") || "0");
          const difference = standard - buydown;
          return difference > 0 ? difference.toString() : "0";
        })()
      : sumsReinsured;
    
    // Create updated aircraft object
    const updatedAircraft: Aircraft = {
      registration,
      aircraftType,
      engineType,
      make,
      model,
      baseCountry,
      baseRegion,
      crewSeats,
      paxSeats,
      isDualCrew,
      hullDeductible,
      hullDeductibleCurrency,
      aircraftAgreedValue,
      aircraftAgreedValueCurrency,
      liabilityLimit,
      liabilityLimitCurrency,
      sumsReinsured: calculatedSumsReinsured,
      sumsReinsuredCurrency: selectedMainCoverages.includes('HD') ? standardDeductibleCurrency : sumsReinsuredCurrency,
      standardDeductible,
      standardDeductibleCurrency,
      deductibleBuydown,
      deductibleBuydownCurrency,
      standardUses,
      specialUses,
      specialUsesOther,
      excludedCountries,
      taxType,
      taxPercentage,
      taxName
    };
    
    // Update the aircraft in the fleet
    const updatedFleet = [...fleet];
    updatedFleet[editingAircraftIndex] = updatedAircraft;
    setFleet(updatedFleet);
    
    // Close modal and reset
    setIsEditModalOpen(false);
    setEditingAircraftIndex(null);
    
    // Clear form
    setRegistration("");
    setAircraftType("");
    setEngineType("");
    setMake("");
    setModel("");
    setCrewSeats("");
    setPaxSeats("");
    setIsDualCrew(false);
    setHullDeductible("");
    setAircraftAgreedValue("");
    setLiabilityLimit("");
    setStandardUses([]);
    setSpecialUses([]);
    setSpecialUsesOther("");
    setTaxType("addition");
    setTaxPercentage("");
    setTaxName("");
  };
  
  const cancelEditAircraft = () => {
    setIsEditModalOpen(false);
    setEditingAircraftIndex(null);
    
    // Clear form
    setRegistration("");
    setAircraftType("");
    setEngineType("");
    setMake("");
    setModel("");
    setCrewSeats("");
    setPaxSeats("");
    setIsDualCrew(false);
    setHullDeductible("");
    setAircraftAgreedValue("");
    setLiabilityLimit("");
    setStandardUses([]);
    setSpecialUses([]);
    setSpecialUsesOther("");
    setTaxType("addition");
    setTaxPercentage("");
    setTaxName("");
  };

  // Step 3: Aircraft Details OR LOL Pilot Details
  if (currentStep === 3) {
    const aircraftLabel = AcLabel;
    const aircraftLabelLower = acLabel;
    // Show LOL Pilot Details if only LOL is selected
    if (shouldSkipStep3) {
      return (
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Insured Person Details</h1>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                    Step 3 of {selectedMainCoverages.includes('HL') ? 7 : 5} &middot; Loss of Licence
                  </p>
                </div>
              </div>
              <div className="text-slate-400 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-lg">
                Step 3/{selectedMainCoverages.includes('HL') ? 7 : 5}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              {/* Header with Buttons */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1">Loss of Licence - Insured Person Details</h3>
                  <p className="text-xs text-gray-500 mb-2">{lolPilots.length} Insured Person{lolPilots.length !== 1 ? 's' : ''} Added</p>
                  <button 
                    type="button"
                    onClick={() => {
                      const csvContent = `Name,Age,Position,Salary Currency,Annual Salary,Sums Insured Currency,Sums Insured,Tax Type,Tax Percentage,Tax Name\nJohn Smith,45,Captain,USD,"150,000",USD,"500,000",addition,5,Income Tax\nSarah Johnson,38,First Officer,USD,"125,000",USD,"400,000",addition,4.5,State Tax\nMichael Chen,52,Captain,EUR,"180,000",EUR,"600,000",deduction,3,Withholding\nEmma Williams,41,Flight Attendant,GBP,"140,000",GBP,"450,000",addition,6,VAT\nRobert Brown,49,Pilot,USD,"165,000",USD,"550,000",addition,5.5,Federal Tax\nLisa Martinez,36,First Officer,USD,"110,000",USD,"350,000",addition,4,Local Tax\nDavid Anderson,55,Captain,USD,"200,000",USD,"700,000",deduction,2.5,Pension\nJennifer Lee,43,Flight Engineer,CAD,"155,000",CAD,"480,000",addition,5,Provincial Tax`;
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', 'lol-pilots-template.csv');
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-sm text-[#004225] hover:text-[#006837] underline mt-1 inline-block cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Download className="size-3.5" />
                    Download CSV Template
                  </button>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => lolPilotsCsvInputRef.current?.click()}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2.5 shadow-sm transition-all duration-200 flex items-center gap-2"
                  >
                    <FileUp className="size-4" />
                    Upload CSV
                  </Button>
                  <input
                    ref={lolPilotsCsvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleLolPilotsCsvUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowLolPilotForm(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-5 py-2.5 shadow-sm transition-all duration-200 flex items-center gap-2"
                  >
                    <Plus className="size-4" />
                    Add Insured Person
                  </Button>
                </div>
              </div>

              {/* Pilots List or Empty State */}
              {lolPilots.length === 0 && !showLolPilotForm ? (
                <div className="text-center py-16 px-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-slate-500 text-base">No insured persons added yet. Click "Add Insured Person" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lolPilots.map((pilot, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-semibold text-slate-900 text-sm">Insured Person {index + 1}</h5>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingLolPilotIndex(index);
                              setTempLolPilot({ ...pilot });
                              setShowLolPilotForm(true);
                            }}
                            className="text-[#004225] hover:text-[#003319] hover:bg-green-50 h-7 w-7 p-0"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLolPilots(prev => prev.filter((_, i) => i !== index));
                              toast.success("Pilot removed");
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-3">
                          <div className="space-y-0.5">
                            <Label className="text-gray-500 text-[10px] font-medium">Name</Label>
                            <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">
                              {pilot.name}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-gray-500 text-[10px] font-medium">Position</Label>
                            <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">
                              {pilot.position || "N/A"}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-gray-500 text-[10px] font-medium">Age</Label>
                            <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">
                              {pilot.age}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-gray-500 text-[10px] font-medium">Annual Salary</Label>
                            <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">
                              {pilot.salary ? `${pilot.salaryCurrency} ${pilot.salary}` : "N/A"}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-gray-500 text-[10px] font-medium">{placementType === "reinsurance" ? "Sums Reinsured" : "Sums Insured"}</Label>
                            <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">
                              {pilot.sumsInsuredCurrency} {pilot.sumsInsured}
                            </div>
                          </div>
                        </div>
                        {pilot.taxPercentage && (
                          <div className="space-y-0.5">
                            <Label className="text-gray-500 text-[10px] font-medium">Tax</Label>
                            <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">
                              {pilot.taxType === "addition" ? "+" : "-"}{pilot.taxPercentage}% {pilot.taxName && `(${pilot.taxName})`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add LOL Pilot Modal */}
            <Dialog open={showLolPilotForm} onOpenChange={(open) => { setShowLolPilotForm(open); if (!open) setEditingLolPilotIndex(null); }}>
              <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader className="pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-[#004225] rounded-full" />
                    <div>
                      <DialogTitle className="text-lg font-bold text-gray-900">{editingLolPilotIndex !== null ? 'Edit Insured Person' : 'Add New Insured Person'}</DialogTitle>
                      <DialogDescription className="text-gray-500 text-xs mt-0.5">
                        {editingLolPilotIndex !== null ? 'Update the insured person details below.' : 'Enter the insured person details below.'} Fields marked with * are required.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Row 1: Name, Age and Position */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="lolPilotName" className="text-gray-700 text-xs font-medium">
                        Name *
                      </Label>
                      <Input
                        id="lolPilotName"
                        value={tempLolPilot.name}
                        onChange={(e) => setTempLolPilot(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter pilot name"
                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lolPilotAge" className="text-gray-700 text-xs font-medium">
                        Age *
                      </Label>
                      <Input
                        id="lolPilotAge"
                        type="number"
                        value={tempLolPilot.age}
                        onChange={(e) => setTempLolPilot(prev => ({ ...prev, age: e.target.value }))}
                        placeholder="Enter age"
                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lolPilotPosition" className="text-gray-700 text-xs font-medium">
                        Position
                      </Label>
                      <Input
                        id="lolPilotPosition"
                        value={tempLolPilot.position}
                        onChange={(e) => setTempLolPilot(prev => ({ ...prev, position: e.target.value }))}
                        placeholder="e.g. Captain, First Officer"
                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 2: Annual Salary */}
                  <div className="space-y-1.5">
                    <Label htmlFor="lolPilotSalary" className="text-gray-700 text-xs font-medium">
                      Annual Salary
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={tempLolPilot.salaryCurrency}
                        onValueChange={(value) => setTempLolPilot(prev => ({ ...prev, salaryCurrency: value }))}
                      >
                        <SelectTrigger className="w-[80px] bg-gray-50 border-gray-200 text-gray-700 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-2.5 shrink-0 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="USD" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">USD</SelectItem>
                          <SelectItem value="EUR" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">EUR</SelectItem>
                          <SelectItem value="GBP" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="lolPilotSalary"
                        value={tempLolPilot.salary}
                        onChange={(e) => {
                          const formatted = formatNumberWithCommas(e.target.value);
                          setTempLolPilot(prev => ({ ...prev, salary: formatted }));
                        }}
                        placeholder="Enter amount"
                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm flex-1"
                      />
                    </div>
                  </div>

                  {/* Row 3: Sums Insured/Reinsured */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="lolPilotSumsInsured" className="text-gray-700 text-xs font-medium">
                        {placementType === "reinsurance" ? "Sums Reinsured" : "Sums Insured"} *
                      </Label>
                      <p className="text-[10px] text-gray-400">Note: Cannot exceed 5x annual salary</p>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={tempLolPilot.sumsInsuredCurrency}
                        onValueChange={(value) => setTempLolPilot(prev => ({ ...prev, sumsInsuredCurrency: value }))}
                      >
                        <SelectTrigger className="w-[80px] bg-gray-50 border-gray-200 text-gray-700 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-2.5 shrink-0 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="USD" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">USD</SelectItem>
                          <SelectItem value="EUR" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">EUR</SelectItem>
                          <SelectItem value="GBP" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="lolPilotSumsInsured"
                        value={tempLolPilot.sumsInsured}
                        onChange={(e) => {
                          const formatted = formatNumberWithCommas(e.target.value);
                          setTempLolPilot(prev => ({ ...prev, sumsInsured: formatted }));
                        }}
                        placeholder="Enter amount"
                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm flex-1"
                      />
                    </div>
                  </div>

                  {/* Tax Section - Optional */}
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <Label className="text-gray-700 text-xs font-medium mb-3 block">Tax (Optional)</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="lolPilotTaxType" className="text-gray-500 text-[10px] font-medium">
                          Type
                        </Label>
                        <Select
                          value={tempLolPilot.taxType}
                          onValueChange={(value) => setTempLolPilot(prev => ({ ...prev, taxType: value }))}
                        >
                          <SelectTrigger className="bg-white border-gray-200 text-gray-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="addition" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Addition (+)</SelectItem>
                            <SelectItem value="deduction" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Deduction (-)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lolPilotTaxPercentage" className="text-gray-500 text-[10px] font-medium">
                          Percentage
                        </Label>
                        <Input
                          id="lolPilotTaxPercentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={tempLolPilot.taxPercentage}
                          onChange={(e) => setTempLolPilot(prev => ({ ...prev, taxPercentage: e.target.value }))}
                          placeholder="%"
                          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lolPilotTaxName" className="text-gray-500 text-[10px] font-medium">
                          Tax Name
                        </Label>
                        <Input
                          id="lolPilotTaxName"
                          value={tempLolPilot.taxName}
                          onChange={(e) => setTempLolPilot(prev => ({ ...prev, taxName: e.target.value }))}
                          placeholder="e.g. IPT"
                          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowLolPilotForm(false);
                        setEditingLolPilotIndex(null);
                        setTempLolPilot({
                          name: "",
                          age: "",
                          position: "",
                          salary: "",
                          salaryCurrency: "USD",
                          sumsInsured: "",
                          sumsInsuredCurrency: "USD",
                          taxType: "addition",
                          taxPercentage: "",
                          taxName: ""
                        });
                      }}
                      className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-700 h-9 px-6 text-sm font-medium rounded-md"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (tempLolPilot.name && tempLolPilot.age && tempLolPilot.sumsInsured) {
                          if (editingLolPilotIndex !== null) {
                            setLolPilots(prev => prev.map((p, i) => i === editingLolPilotIndex ? tempLolPilot : p));
                            toast.success("Pilot updated successfully");
                          } else {
                            setLolPilots(prev => [...prev, tempLolPilot]);
                            toast.success("Insured person added successfully");
                          }
                          setEditingLolPilotIndex(null);
                          setTempLolPilot({
                            name: "",
                            age: "",
                            position: "",
                            salary: "",
                            salaryCurrency: "USD",
                            sumsInsured: "",
                            sumsInsuredCurrency: "USD",
                            taxType: "addition",
                            taxPercentage: "",
                            taxName: ""
                          });
                          setShowLolPilotForm(false);
                        } else {
                          toast.error("Please fill in all required fields");
                        }
                      }}
                      className="bg-[#004225] hover:bg-[#003319] text-white h-9 px-8 text-sm font-medium rounded-md"
                    >
                      {editingLolPilotIndex !== null ? 'Save Changes' : 'Add Insured Person'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Navigation Footer */}
            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg px-6 py-2.5 text-sm font-medium"
              >
                ← Back to Policy Details
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (lolPilots.length === 0) {
                    toast.error("Please add at least one pilot for Loss of Licence coverage");
                    return;
                  }
                  setCurrentStep(4);
                }}
                disabled={lolPilots.length === 0}
                className="bg-[#004225] hover:bg-[#003319] text-white font-medium rounded-lg px-8 py-2.5 shadow-sm transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Step 4 (Claims History) →
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // PA 24-Hour Crew — show crew members form (like LOL)
    if (isPA24Hour) {
      const siLabel = placementType === "reinsurance" ? "Sums Reinsured" : "Sums Insured";
      return (
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Crew Member Details</h1>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                    Step 3 of 5 &middot; Crew Personal Accident — 24 Hour Cover
                  </p>
                </div>
              </div>
              <div className="text-slate-400 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-lg">Step 3/5</div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1">Named Crew Members</h3>
                  <p className="text-xs text-gray-500 mb-2">{crewMembers.length} Crew Member{crewMembers.length !== 1 ? 's' : ''} Added</p>
                  <button
                    type="button"
                    onClick={() => {
                      const csvContent = `Name,Age,Position,${siLabel} Currency,${siLabel}\nJohn Smith,45,Captain,USD,"500,000"\nSarah Johnson,38,First Officer,USD,"400,000"\nMichael Chen,52,Captain,EUR,"600,000"`;
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.setAttribute('href', URL.createObjectURL(blob));
                      link.setAttribute('download', 'crew-pa-24hour-template.csv');
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link); link.click(); document.body.removeChild(link);
                    }}
                    className="text-sm text-[#004225] hover:text-[#006837] underline mt-1 inline-block cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Download className="size-3.5" />
                    Download CSV Template
                  </button>
                </div>
                <div className="flex gap-3">
                  <Button type="button" onClick={() => crewMemberCsvInputRef.current?.click()} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2.5 shadow-sm transition-all duration-200 flex items-center gap-2">
                    <FileUp className="size-4" /> Upload CSV
                  </Button>
                  <input ref={crewMemberCsvInputRef} type="file" accept=".csv" onChange={handleCrewMemberCsvUpload} className="hidden" />
                  <Button type="button" onClick={() => { setEditingCrewMemberIndex(null); setTempCrewMember({ name: "", age: "", position: "", sumsInsured: "", sumsInsuredCurrency: "USD" }); setShowCrewMemberForm(true); }} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-5 py-2.5 shadow-sm transition-all duration-200 flex items-center gap-2">
                    <Plus className="size-4" /> Add Crew Member
                  </Button>
                </div>
              </div>

              {crewMembers.length === 0 && !showCrewMemberForm ? (
                <div className="text-center py-16 px-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-slate-500 text-base">No crew members added yet. Click &quot;Add Crew Member&quot; to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {crewMembers.map((member, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-semibold text-slate-900 text-sm">Crew Member {index + 1}</h5>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingCrewMemberIndex(index); setTempCrewMember({ ...member }); setShowCrewMemberForm(true); }} className="text-[#004225] hover:text-[#003319] hover:bg-green-50 h-7 w-7 p-0">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setCrewMembers(prev => prev.filter((_, i) => i !== index)); toast.success("Crew member removed"); }} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-0.5">
                          <Label className="text-gray-500 text-[10px] font-medium">Name</Label>
                          <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">{member.name}</div>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-gray-500 text-[10px] font-medium">Position</Label>
                          <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">{member.position || "N/A"}</div>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-gray-500 text-[10px] font-medium">Age</Label>
                          <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">{member.age}</div>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-gray-500 text-[10px] font-medium">{siLabel}</Label>
                          <div className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-slate-900 text-xs">{member.sumsInsuredCurrency} {member.sumsInsured}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit Crew Member Modal */}
            <Dialog open={showCrewMemberForm} onOpenChange={(open) => { setShowCrewMemberForm(open); if (!open) setEditingCrewMemberIndex(null); }}>
              <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader className="pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-[#004225] rounded-full" />
                    <div>
                      <DialogTitle className="text-lg font-bold text-gray-900">{editingCrewMemberIndex !== null ? 'Edit Crew Member' : 'Add New Crew Member'}</DialogTitle>
                      <p className="text-xs text-gray-500 mt-0.5">Crew PA — 24 Hour Cover</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Name <span className="text-red-500">*</span></Label>
                      <Input value={tempCrewMember.name} onChange={(e) => setTempCrewMember({...tempCrewMember, name: e.target.value})} placeholder="Full Name" className="bg-white border-gray-200 h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Age <span className="text-red-500">*</span></Label>
                      <Input value={tempCrewMember.age} onChange={(e) => setTempCrewMember({...tempCrewMember, age: e.target.value})} placeholder="e.g. 45" type="number" className="bg-white border-gray-200 h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Position</Label>
                      <Input value={tempCrewMember.position} onChange={(e) => setTempCrewMember({...tempCrewMember, position: e.target.value})} placeholder="e.g. Captain, First Officer" className="bg-white border-gray-200 h-9 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">{siLabel} Currency</Label>
                      <select value={tempCrewMember.sumsInsuredCurrency} onChange={(e) => setTempCrewMember({...tempCrewMember, sumsInsuredCurrency: e.target.value})} className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white">
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">{siLabel} <span className="text-red-500">*</span></Label>
                      <Input value={tempCrewMember.sumsInsured} onChange={(e) => setTempCrewMember({...tempCrewMember, sumsInsured: formatNumberWithCommas(e.target.value)})} placeholder="e.g. 500,000" className="bg-white border-gray-200 h-9 text-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button type="button" onClick={() => { setShowCrewMemberForm(false); setEditingCrewMemberIndex(null); setTempCrewMember({ name: "", age: "", position: "", sumsInsured: "", sumsInsuredCurrency: "USD" }); }} className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50 h-9 px-6 text-sm font-medium rounded-md">
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => {
                    if (tempCrewMember.name && tempCrewMember.age && tempCrewMember.sumsInsured) {
                      if (editingCrewMemberIndex !== null) {
                        setCrewMembers(prev => prev.map((m, i) => i === editingCrewMemberIndex ? tempCrewMember : m));
                        toast.success("Crew member updated");
                      } else {
                        setCrewMembers(prev => [...prev, tempCrewMember]);
                        toast.success("Crew member added");
                      }
                      setEditingCrewMemberIndex(null);
                      setTempCrewMember({ name: "", age: "", position: "", sumsInsured: "", sumsInsuredCurrency: "USD" });
                      setShowCrewMemberForm(false);
                    } else {
                      toast.error("Please fill in Name, Age, and " + siLabel);
                    }
                  }} className="bg-[#004225] hover:bg-[#003319] text-white h-9 px-8 text-sm font-medium rounded-md">
                    {editingCrewMemberIndex !== null ? 'Save Changes' : 'Add Crew Member'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg px-6 py-2.5 text-sm font-medium">
                ← Back to Policy Details
              </Button>
              <Button type="button" onClick={() => {
                if (crewMembers.length === 0) { toast.error("Please add at least one crew member"); return; }
                setCurrentStep(4);
              }} disabled={crewMembers.length === 0} className="bg-[#004225] hover:bg-[#003319] text-white font-medium rounded-lg px-8 py-2.5 shadow-sm transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Continue to Step 4 (Claims History) →
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{aircraftLabel} Details</h1>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                  Step 3 of {selectedMainCoverages.includes('HL') ? 7 : 5} &middot; Enter {aircraftLabelLower} information
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#004225] bg-green-50 border border-green-200 rounded-md px-3 py-1.5 uppercase tracking-wider">
              Step 3/{selectedMainCoverages.includes('HL') ? 7 : 5}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Aircraft Details Form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* BASIC INFORMATION */}
              <div className="p-6 pb-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-1 h-5 bg-[#004225] rounded-full" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Basic Information</h3>
                </div>
                <div className="space-y-4">
                  {/* Make and Model - shown first for UAS */}
                  {isUASProduct && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="make-uas" className="text-slate-700 text-sm font-medium">
                        Make
                      </Label>
                      <Input
                        id="make-uas"
                        type="text"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        placeholder={`Enter ${aircraftLabelLower} make`}
                        className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model-uas" className="text-slate-700 text-sm font-medium">
                        Model
                      </Label>
                      <Input
                        id="model-uas"
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={`Enter ${aircraftLabelLower} model`}
                        className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                      />
                    </div>
                  </div>
                  )}

                  {/* Registration/Serial Number, Aircraft Type, Engine Type */}
                  <div className={`grid ${isUASProduct ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
                    <div className="space-y-2">
                      <Label htmlFor="registration" className="text-slate-700 text-sm font-medium">
                        {isUASProduct ? 'Serial Number' : 'Registration'} {!isUASProduct && <span className="text-slate-500 text-xs">(include dash if applicable, e.g. G-IROF)</span>}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="registration"
                          type="text"
                          value={registration}
                          onChange={(e) => setRegistration(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!isUASProduct) handleAircraftLookup();
                            }
                          }}
                          placeholder={isUASProduct ? "Enter serial number" : "Enter registration"}
                          className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm flex-1"
                        />
                        {!isUASProduct && (
                        <Button
                          type="button"
                          onClick={handleAircraftLookup}
                          disabled={isLookingUpAircraft || !registration.trim()}
                          className="bg-[#004225] hover:bg-[#00563] text-white rounded-lg h-10 px-4 disabled:opacity-50"
                          title={`Lookup ${aircraftLabelLower} details using JetAPI`}
                        >
                          {isLookingUpAircraft ? (
                            <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Search className="size-4" />
                          )}
                        </Button>
                        )}
                      </div>
                    </div>
                    {isUASProduct && (
                    <div className="space-y-2">
                      <Label htmlFor="droneDeductible" className="text-slate-700 text-sm font-medium">
                        Drone Deductible
                      </Label>
                      <div className="flex items-center px-3 h-10 bg-gray-50 border border-gray-300 rounded-lg text-sm text-slate-700 font-medium">
                        10%
                      </div>
                    </div>
                    )}
                    {!isUASProduct && (
                    <div className="space-y-2">
                      <Label htmlFor="aircraftType" className="text-slate-700 text-sm font-medium">
                        {aircraftLabel} Type
                      </Label>
                      <Select value={aircraftType} onValueChange={handleAircraftTypeChange}>
                        <SelectTrigger 
                          id="aircraftType"
                          className="bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                        >
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="fixed-wing" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                            Fixed Wing
                          </SelectItem>
                          <SelectItem value="rotary-wing" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                            Rotary Wing
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    )}
                    {!isUASProduct && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="engineType" className="text-slate-700 text-sm font-medium">
                          Engine Type
                        </Label>
                        <a
                          href="https://www.icao.int/publications/doc-8643-aircraft-type-designators/search"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#004225] hover:text-[#00563] transition-colors"
                          title="Search ICAO aircraft type designators"
                        >
                          <Info className="size-3.5" />
                          <span>Find engine type</span>
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                      <Select value={engineType} onValueChange={setEngineType} disabled={!aircraftType}>
                        <SelectTrigger 
                          id="engineType"
                          className="bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <SelectValue placeholder="Select engine" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {aircraftType === "fixed-wing" && (
                            <>
                              <SelectItem value="single-engine-piston" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Single Engine Piston
                              </SelectItem>
                              <SelectItem value="multi-engine-piston" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Multi-Engine Piston
                              </SelectItem>
                              <SelectItem value="single-engine-turboprop" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Single Engine Turboprop
                              </SelectItem>
                              <SelectItem value="multi-engine-turboprop" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Multi-Engine Turboprop
                              </SelectItem>
                              <SelectItem value="multi-engine-jet" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Multi-Engine Jet
                              </SelectItem>
                            </>
                          )}
                          {aircraftType === "rotary-wing" && (
                            <>
                              <SelectItem value="single-engine-piston" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Single Engine Piston
                              </SelectItem>
                              <SelectItem value="twin-engine-piston" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Twin Engine Piston
                              </SelectItem>
                              <SelectItem value="single-engine-turbine" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Single Engine Turbine
                              </SelectItem>
                              <SelectItem value="twin-engine-turbine" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">
                                Twin-Engine Turbine
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    )}
                  </div>

                  {/* Make and Model - shown here for non-UAS, hidden for PA-only */}
                  {!isUASProduct && !isPAOnly && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="make" className="text-slate-700 text-sm font-medium">
                        Make
                      </Label>
                      <Input
                        id="make"
                        type="text"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        placeholder={`Enter ${aircraftLabelLower} make`}
                        className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model" className="text-slate-700 text-sm font-medium">
                        Model
                      </Label>
                      <Input
                        id="model"
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={`Enter ${aircraftLabelLower} model`}
                        className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                      />
                    </div>
                  </div>
                  )}

                  {/* Base Country and Base Region */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="baseCountry" className="text-slate-700 text-sm font-medium">
                        Base Country
                      </Label>
                      <Select 
                        value={baseCountry} 
                        onValueChange={(value) => {
                          setBaseCountry(value);
                          const country = countriesWithRegions.find(c => c.name === value);
                          setBaseRegion(country?.region || "");
                        }}
                      >
                        <SelectTrigger 
                          id="baseCountry"
                          className="bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                        >
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 max-h-[300px]">
                          {countriesWithRegions.map((country) => (
                            <SelectItem 
                              key={country.name} 
                              value={country.name}
                              className="text-slate-900 focus:bg-gray-50 focus:text-slate-900"
                            >
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baseRegion" className="text-slate-700 text-sm font-medium">
                        Base Region
                      </Label>
                      <Input
                        id="baseRegion"
                        type="text"
                        value={baseRegion}
                        readOnly
                        placeholder="Auto-populated"
                        className="bg-gray-50 border-gray-300 text-slate-900 placeholder:text-slate-400 rounded-lg h-10 text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Crew and Pax Seats - Show only for PA-only coverage */}
                  {selectedMainCoverages.length === 1 && selectedMainCoverages.includes('PA') && (
                    <div className={`gap-4 mt-4 ${
                      selectedSubCoverages.includes('crew_personal_accident') && selectedSubCoverages.includes('passenger_personal_accident')
                        ? 'grid grid-cols-2'
                        : 'grid grid-cols-1'
                    }`}>
                      {selectedSubCoverages.includes('crew_personal_accident') && (
                        <div className="space-y-2">
                          <Label htmlFor="paCrewSeats" className="text-slate-700 text-sm font-medium">
                            Crew Seats
                          </Label>
                          <Input
                            id="paCrewSeats"
                            type="text"
                            value={crewSeats}
                            onChange={(e) => handleNumericInput(e.target.value, setCrewSeats)}
                            placeholder="Enter crew seats"
                            className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                          />
                        </div>
                      )}
                      {selectedSubCoverages.includes('passenger_personal_accident') && (
                        <div className="space-y-2">
                          <Label htmlFor="paPaxSeats" className="text-slate-700 text-sm font-medium">
                            Passenger Seats
                          </Label>
                          <Input
                            id="paPaxSeats"
                            type="text"
                            value={paxSeats}
                            onChange={(e) => handleNumericInput(e.target.value, setPaxSeats)}
                            placeholder="Enter passenger seats"
                            className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* HULL DEDUCTIBLE DETAILS - Show only for HD coverage */}
              {selectedMainCoverages.includes('HD') && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-1 h-5 bg-[#004225] rounded-full" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Hull Deductible Details</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="standardDeductible" className="text-slate-700 text-sm font-medium">
                        Original Deductible
                      </Label>
                      <div className="flex gap-2">
                        <Select value={standardDeductibleCurrency} onValueChange={(value) => {
                          setStandardDeductibleCurrency(value);
                          setDeductibleBuydownCurrency(value);
                        }}>
                          <SelectTrigger className="w-20 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                            <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                            <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                            <SelectItem value="SGD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">SGD</SelectItem>
                            <SelectItem value="IDR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">IDR</SelectItem>
                            <SelectItem value="MYR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">MYR</SelectItem>
                            <SelectItem value="AUD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">AUD</SelectItem>
                            <SelectItem value="PHP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">PHP</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id="standardDeductible"
                          type="text"
                          value={standardDeductible}
                          onChange={(e) => handleNumericInput(e.target.value, setStandardDeductible)}
                          placeholder="Enter value"
                          className="flex-1 bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deductibleBuydown" className="text-slate-700 text-sm font-medium">
                        Deductible Buydown
                      </Label>
                      <div className="flex gap-2">
                        <div className="w-20 flex items-center justify-center bg-gray-50 border border-gray-300 text-slate-500 rounded-lg text-sm h-10 shrink-0">
                          {standardDeductibleCurrency}
                        </div>
                        <Input
                          id="deductibleBuydown"
                          type="text"
                          value={deductibleBuydown}
                          onChange={(e) => handleNumericInput(e.target.value, setDeductibleBuydown)}
                          placeholder="Enter value"
                          className="flex-1 bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sumsReinsured" className="text-slate-700 text-sm font-medium">
                        Sums Reinsured
                      </Label>
                      <div className="flex gap-2">
                        <div className="w-20 flex items-center justify-center bg-gray-50 border border-gray-300 text-slate-500 rounded-lg text-sm h-10 shrink-0">
                          {standardDeductibleCurrency}
                        </div>
                        <Input
                          id="sumsReinsured"
                          type="text"
                          value={(() => {
                            const standard = parseInt(standardDeductible.replace(/,/g, "") || "0");
                            const buydown = parseInt(deductibleBuydown.replace(/,/g, "") || "0");
                            const difference = standard - buydown;
                            return difference > 0 ? difference.toLocaleString() : "0";
                          })()}
                          readOnly
                          disabled
                          placeholder="Auto-calculated"
                          className="flex-1 bg-gray-50 border-gray-300 text-slate-500 placeholder:text-slate-400 rounded-lg h-10 text-sm cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AIRCRAFT CONFIGURATION - Show for Hull and Liability */}
              {selectedMainCoverages.includes('HL') && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-1 h-5 bg-[#004225] rounded-full" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Aircraft Configuration</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="crewSeats" className="text-slate-700 text-sm font-medium">
                        Crew Seats
                      </Label>
                      <Input
                        id="crewSeats"
                        type="text"
                        value={crewSeats}
                        onChange={(e) => handleNumericInput(e.target.value, setCrewSeats)}
                        placeholder="Enter crew seats"
                        className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paxSeats" className="text-slate-700 text-sm font-medium">
                        Pax Seats
                      </Label>
                      <Input
                        id="paxSeats"
                        type="text"
                        value={paxSeats}
                        onChange={(e) => handleNumericInput(e.target.value, setPaxSeats)}
                        placeholder="Enter pax seats"
                        className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 text-sm font-medium block">
                        Dual Crew?
                      </Label>
                      <div className="flex items-center h-10 px-4 bg-gray-50 border border-gray-300 rounded-lg">
                        <Checkbox
                          id="dualCrew"
                          checked={isDualCrew}
                          onCheckedChange={(checked) => setIsDualCrew(checked as boolean)}
                          className="border-gray-400 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225] w-5 h-5"
                        />
                        <Label htmlFor="dualCrew" className="ml-3 text-slate-700 text-sm cursor-pointer font-medium">
                          {isDualCrew ? 'Yes' : 'No'}
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hullDeductible" className="text-slate-700 text-sm font-medium">
                        Hull Deductible
                      </Label>
                      <div className="flex gap-2">
                        {(aircraftType === "fixed-wing" || isUASProduct) && (
                          <Select value={hullDeductibleCurrency} onValueChange={setHullDeductibleCurrency}>
                            <SelectTrigger className="w-20 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                              <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                              <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                              <SelectItem value="SGD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">SGD</SelectItem>
                              <SelectItem value="IDR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">IDR</SelectItem>
                              <SelectItem value="MYR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">MYR</SelectItem>
                              <SelectItem value="AUD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">AUD</SelectItem>
                              <SelectItem value="PHP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">PHP</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {aircraftType === "rotary-wing" && (
                          <div className="w-20 flex items-center justify-center bg-gray-50 border border-gray-300 text-slate-900 rounded-lg text-sm h-10 shrink-0">
                            %
                          </div>
                        )}
                        {!aircraftType && !isUASProduct && (
                          <div className="w-20 flex items-center justify-center bg-gray-50 border border-gray-300 text-slate-400 rounded-lg text-sm h-10 shrink-0">
                            —
                          </div>
                        )}
                        <Input
                          id="hullDeductible"
                          type="text"
                          value={hullDeductible}
                          onChange={(e) => handleHullDeductibleInput(e.target.value)}
                          placeholder={isUASProduct ? "Enter amount" : aircraftType === "fixed-wing" ? "Enter amount" : aircraftType === "rotary-wing" ? "Enter %" : "Select aircraft type first"}
                          disabled={!isUASProduct && !aircraftType}
                          className="flex-1 bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COVERAGE AMOUNTS - Hide for Hull Deductible and PA-only */}
              {!selectedMainCoverages.includes('HD') && !(selectedMainCoverages.length === 1 && selectedMainCoverages.includes('PA')) && !(isUASProduct && !selectedSubCoverages.includes('drone_hull') && !selectedSubCoverages.includes('drone_liability')) && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-1 h-5 bg-[#004225] rounded-full" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Coverage Amounts</h3>
                  </div>
                  
                  {/* Show Aircraft Agreed Value and Liability Limit - Title Above, Boxes Below */}
                  <div className="flex items-start gap-6">
                    {/* Aircraft Agreed Value */}
                    {(!isUASProduct || selectedSubCoverages.includes('drone_hull')) && (
                    <div className="space-y-2">
                      <Label htmlFor="aircraftAgreedValue" className="text-slate-700 text-sm font-medium">
                        {aircraftLabel} Agreed Value
                      </Label>
                      <div className="flex gap-2">
                        <Select value={aircraftAgreedValueCurrency} onValueChange={setAircraftAgreedValueCurrency}>
                          <SelectTrigger className="w-32 !h-10 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                            <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                            <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                            <SelectItem value="SGD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">SGD</SelectItem>
                            <SelectItem value="IDR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">IDR</SelectItem>
                            <SelectItem value="MYR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">MYR</SelectItem>
                            <SelectItem value="AUD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">AUD</SelectItem>
                            <SelectItem value="PHP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">PHP</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id="aircraftAgreedValue"
                          type="text"
                          value={aircraftAgreedValue}
                          onChange={(e) => handleNumericInput(e.target.value, setAircraftAgreedValue)}
                          placeholder="Enter value"
                          className="w-72 bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                        />
                      </div>
                    </div>
                    )}

                    {/* Liability Limit */}
                    {(selectedMainCoverages.includes('HL') || (isUASProduct && selectedSubCoverages.includes('drone_liability'))) && (
                      <div className="space-y-2">
                        <Label htmlFor="liabilityLimit" className="text-slate-700 text-sm font-medium">
                          Liability Limit
                        </Label>
                        <div className="flex gap-2">
                          {!isUASProduct && (
                            <Select value={liabilityType} onValueChange={setLiabilityType}>
                              <SelectTrigger className="w-64 !h-10 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200">
                                <SelectItem value="CSL" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">Combined Single Limit</SelectItem>
                                <SelectItem value="TPL" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">Third Party Liability</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Select value={liabilityLimitCurrency} onValueChange={setLiabilityLimitCurrency}>
                            <SelectTrigger className="w-32 !h-10 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                              <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                              <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                              <SelectItem value="SGD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">SGD</SelectItem>
                              <SelectItem value="IDR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">IDR</SelectItem>
                              <SelectItem value="MYR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">MYR</SelectItem>
                              <SelectItem value="AUD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">AUD</SelectItem>
                              <SelectItem value="PHP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">PHP</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="liabilityLimit"
                            type="text"
                            value={liabilityLimit}
                            onChange={(e) => handleNumericInput(e.target.value, setLiabilityLimit)}
                            placeholder="Enter limit"
                            className="w-64 bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AIRCRAFT USAGE - Hide for Hull Deductible */}
              {!selectedMainCoverages.includes('HD') && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-1 h-5 bg-[#004225] rounded-full" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{aircraftLabel} Usage</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="standardUses" className="text-slate-700 text-sm font-medium">
                        Standard Uses
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start bg-white border-gray-300 text-slate-900 hover:bg-gray-50 hover:text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm font-normal"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
                                {standardUses.length === 0 ? (
                                  <span className="text-slate-400">Select standard uses</span>
                                ) : (
                                  standardUses.map((use) => (
                                    <span
                                      key={use}
                                      className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#004225]/10 text-[#004225] rounded text-xs font-medium"
                                    >
                                      {use}
                                    </span>
                                  ))
                                )}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-white border-gray-200" align="start">
                          <Command className="bg-white">
                            <CommandList>
                              <CommandGroup>
                                {standardUsesOptions.map((option) => (
                                  <CommandItem
                                    key={option}
                                    onSelect={() => {
                                      setStandardUses((prev) =>
                                        prev.includes(option)
                                          ? prev.filter((item) => item !== option)
                                          : [...prev, option]
                                      );
                                    }}
                                    className="text-slate-900 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={standardUses.includes(option)}
                                      className="mr-2 border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225]"
                                    />
                                    {option}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialUses" className="text-slate-700 text-sm font-medium">
                        Special Uses
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start bg-white border-gray-300 text-slate-900 hover:bg-gray-50 hover:text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm font-normal"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
                                {specialUses.length === 0 && !specialUsesOther ? (
                                  <span className="text-slate-400">Select special uses</span>
                                ) : (
                                  <>
                                    {specialUses.map((use) => (
                                      <span
                                        key={use}
                                        className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#004225]/10 text-[#004225] rounded text-xs font-medium"
                                      >
                                        {use === "Other" && specialUsesOther ? specialUsesOther : use}
                                      </span>
                                    ))}
                                  </>
                                )}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-white border-gray-200" align="start">
                          <Command className="bg-white">
                            <CommandList>
                              <CommandGroup>
                                {specialUsesOptions.map((option) => (
                                  <CommandItem
                                    key={option}
                                    onSelect={() => {
                                      setSpecialUses((prev) => {
                                        const newUses = prev.includes(option)
                                          ? prev.filter((item) => item !== option)
                                          : [...prev, option];
                                        
                                        // Clear the "Other" text if unchecking "Other"
                                        if (option === "Other" && prev.includes(option)) {
                                          setSpecialUsesOther("");
                                        }
                                        
                                        return newUses;
                                      });
                                    }}
                                    className="text-slate-900 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={specialUses.includes(option)}
                                      className="mr-2 border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225]"
                                    />
                                    {option}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {specialUses.includes("Other") && (
                                <div className="p-3 border-t border-gray-200 bg-gray-50">
                                  <label className="text-xs text-slate-600 mb-1.5 block font-medium">
                                    Specify other use:
                                  </label>
                                  <Input
                                    type="text"
                                    value={specialUsesOther}
                                    onChange={(e) => setSpecialUsesOther(e.target.value)}
                                    placeholder="e.g., Parachute Drops, Cargo, etc."
                                    className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}

              {/* TAX INFORMATION */}
              <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-1 h-5 bg-[#004225] rounded-full" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tax Information</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxType" className="text-slate-700 text-sm font-medium">
                      Addition or Deduction
                    </Label>
                    <Select value={taxType} onValueChange={setTaxType}>
                      <SelectTrigger
                        id="taxType"
                        className="bg-white border-gray-300 text-slate-900 hover:bg-gray-50 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="addition" className="text-slate-900 hover:bg-gray-50">Addition</SelectItem>
                        <SelectItem value="deduction" className="text-slate-900 hover:bg-gray-50">Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxPercentage" className="text-slate-700 text-sm font-medium">
                      Percentage Amount (%)
                    </Label>
                    <Input
                      id="taxPercentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(e.target.value)}
                      placeholder="10"
                      className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxName" className="text-slate-700 text-sm font-medium">
                      Name
                    </Label>
                    <Input
                      id="taxName"
                      type="text"
                      value={taxName}
                      onChange={(e) => setTaxName(e.target.value)}
                      placeholder="e.g., Indonesia Tax"
                      className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Add to Fleet Button */}
              <div className="px-6 py-5 bg-gray-50/50 border-t border-gray-200">
                <Button
                  type="button"
                  onClick={addCurrentAircraftToFleet}
                  disabled={
                    !registration || 
                    (!isUASProduct && !aircraftType) || 
                    (!isUASProduct && !engineType) || 
                    (!isPAOnly && !make) || 
                    (!isPAOnly && !model) || 
                    // For PA-only: require crew/pax seats instead of aircraft agreed value
                    (isPAOnly 
                      ? (
                          (selectedSubCoverages.includes('crew_personal_accident') && !crewSeats) ||
                          (selectedSubCoverages.includes('passenger_personal_accident') && !paxSeats)
                        )
                      // For HD: require Original Deductible + Deductible Buydown instead of aircraftAgreedValue
                      : selectedMainCoverages.includes('HD')
                        ? (!standardDeductible || !deductibleBuydown)
                        : !aircraftAgreedValue
                    ) ||
                    // Only require these fields for HL coverage
                    (selectedMainCoverages.includes('HL') && (!crewSeats || !hullDeductible || !liabilityLimit))
                  }
                  className="w-full bg-[#004225] hover:bg-[#003119] text-white font-semibold rounded-lg px-6 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#004225] text-sm"
                >
                  <Plus className="size-4 mr-2" />
                  Add to Fleet
                </Button>
                <p className="text-xs text-slate-400 text-center mt-2 uppercase tracking-wider">
                  {(!registration || (!isUASProduct && !aircraftType) || (!isUASProduct && !engineType) || (!isPAOnly && !make) || (!isPAOnly && !model) || 
                    (isPAOnly 
                      ? (
                          (selectedSubCoverages.includes('crew_personal_accident') && !crewSeats) ||
                          (selectedSubCoverages.includes('passenger_personal_accident') && !paxSeats)
                        )
                      : selectedMainCoverages.includes('HD')
                        ? (!standardDeductible || !deductibleBuydown)
                        : !aircraftAgreedValue
                    ) || 
                    (selectedMainCoverages.includes('HL') && (!crewSeats || !hullDeductible || !liabilityLimit)))
                    ? `Complete all required fields to add this ${aircraftLabelLower}`
                    : `Click to add this ${aircraftLabelLower} and enter details for another`
                  }
                </p>
              </div>

              {/* Mass Upload for Drones */}
              {isUASProduct && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-0.5 h-4 bg-[#004225] rounded-full" />
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Or Mass Upload via CSV</p>
                </div>
                <div
                  className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#004225]/50 hover:bg-green-50/30 transition-all duration-200 cursor-pointer group"
                  onClick={() => document.getElementById('drone-csv-upload')?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
                      handleDroneCsvUpload(file);
                    } else {
                      toast.error('Please upload a CSV or Excel file');
                    }
                  }}
                >
                  <input
                    id="drone-csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDroneCsvUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <FileUp className="size-8 text-gray-400 group-hover:text-[#004225] mx-auto mb-2 transition-colors" />
                  <p className="text-sm font-medium text-slate-700">Drop CSV or Excel file here or click to browse</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Required columns: Serial Number, Make, Model
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Optional: Agreed Value, Liability Limit, Base Country, Standard Uses, Special Uses
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-xs text-[#004225] hover:text-[#003119] underline underline-offset-2 font-medium"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const loadXLSX = () => new Promise<any>((resolve, reject) => {
                        if ((window as any).XLSX) { resolve((window as any).XLSX); return; }
                        const s = document.createElement('script');
                        s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
                        s.onload = () => resolve((window as any).XLSX);
                        s.onerror = () => reject(new Error('Failed to load SheetJS'));
                        document.head.appendChild(s);
                      });
                      try {
                        const XLSX = await loadXLSX();
                        const wb = XLSX.utils.book_new();
                        const hdrs = ['Serial Number','Make','Model','Currency','Agreed Value','Liability Limit','Base Country','Standard Uses','Special Uses'];
                        const mainData = [
                          hdrs,
                          ['SN-001','DJI','Mavic 3 Enterprise','USD','5000','1000000','United Kingdom','Agriculture','Fire Fighting'],
                        ];
                        const ws = XLSX.utils.aoa_to_sheet(mainData);
                        ws['!cols'] = hdrs.map((h: string) => ({ wch: h === 'Serial Number' ? 18 : h === 'Make' || h === 'Model' ? 22 : h === 'Currency' ? 12 : h === 'Base Country' ? 20 : 22 }));
                        const countryNames = countriesWithRegions.map((c: any) => c.name);
                        const currencyFormula = '"USD,GBP,EUR,CAD,AUD,CHF,JPY,AED,SGD,HKD"';
                        const stdFormula = `"${standardUsesOptions.join(',')}"`;
                        const splFormula = `"${specialUsesOptions.join(',')}"`;
                        // Build reference sheet with countries, standard uses, special uses
                        const refRows: string[][] = [
                          ['Countries'], ...countryNames.map((n: string) => [n]),
                          [''], ['Standard Uses'], ...standardUsesOptions.map((o: string) => [o]),
                          [''], ['Special Uses'], ...specialUsesOptions.map((o: string) => [o]),
                        ];
                        const refWs = XLSX.utils.aoa_to_sheet(refRows);
                        refWs['!cols'] = [{ wch: 30 }];
                        const countryEndRow = 1 + countryNames.length;
                        const countryRefFormula = `'Valid Options'!$A$2:$A$${countryEndRow}`;
                        if (!ws['!dataValidation']) ws['!dataValidation'] = [];
                        ws['!dataValidation'].push(
                          { sqref: 'D2:D101', type: 'list', formula1: currencyFormula, showErrorMessage: true },
                          { sqref: 'G2:G101', type: 'list', formula1: countryRefFormula, showErrorMessage: true },
                          { sqref: 'H2:H101', type: 'list', formula1: stdFormula, showErrorMessage: true },
                          { sqref: 'I2:I101', type: 'list', formula1: splFormula, showErrorMessage: true },
                        );
                        XLSX.utils.book_append_sheet(wb, ws, 'Drone Fleet');
                        XLSX.utils.book_append_sheet(wb, refWs, 'Valid Options');
                        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'drone_fleet_template.xlsx'; a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Template generation error:', err);
                        toast.error('Failed to generate Excel template');
                      }
                    }}
                  >
                    Download Excel Template
                  </button>
                </div>
              </div>
              )}

            </div>

            {/* Fleet Display Card - Only show if there are aircraft in the fleet */}
            {fleet.length > 0 && (
              <Card className="bg-white border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="pb-0 pt-0 px-0 border-b border-gray-200">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-[#004225] rounded-full" />
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Fleet {aircraftLabel}s</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      {fleet.length === 0 ? `No ${aircraftLabelLower}s added to fleet` : fleet.length === 1 ? `1 ${aircraftLabelLower} in your fleet` : `${fleet.length} ${aircraftLabelLower}s in your fleet`}
                    </CardDescription>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#004225] bg-green-50 border border-green-200 rounded-md px-3 py-1.5 uppercase tracking-wider">{fleet.length} Total</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {fleet.map((aircraft, index) => (
                  <div
                    key={index}
                    className="flex items-center group hover:bg-gray-50/70 transition-colors duration-150 relative"
                  >
                    {/* Row number */}
                    <div className="w-12 flex-shrink-0 flex items-center justify-center self-stretch border-r border-gray-100">
                      <span className="text-sm font-bold text-gray-300">{index + 1}</span>
                    </div>

                    {/* Scrollable data columns */}
                    <div className="flex-1 overflow-x-auto min-w-0">
                      <div className="flex items-center min-w-max">
                        {/* Registration */}
                        <div className="px-4 py-3.5" style={{ width: isPAOnly ? '140px' : '110px' }}>
                          {isPAOnly ? (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Reg.</p>
                              <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">{aircraft.registration || "—"}</p>
                            </div>
                          ) : (
                            <>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{isUASProduct ? 'Serial No.' : 'Registration'}</p>
                              <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">{aircraft.registration || "—"}</p>
                            </>
                          )}
                        </div>

                        {/* Make/Model - hidden for PA-only */}
                        {!isPAOnly && (
                        <div className="px-4 py-3.5" style={{ width: '180px' }}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Make/Model</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs font-semibold text-slate-900 uppercase truncate cursor-help">
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
                        )}

                        {/* Base Country/Region */}
                        <div className="px-4 py-3.5" style={{ width: isPAOnly ? '220px' : '170px' }}>
                          {isPAOnly ? (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Base</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs font-semibold text-slate-900 uppercase truncate cursor-help">
                                      {aircraft.baseCountry && aircraft.baseRegion
                                        ? `${aircraft.baseCountry} / ${aircraft.baseRegion}`
                                        : aircraft.baseCountry || aircraft.baseRegion || "—"}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 border-slate-700">
                                    <div className="text-sm text-white space-y-1">
                                      <p><span className="font-semibold">Country:</span> {aircraft.baseCountry || "N/A"}</p>
                                      <p><span className="font-semibold">Region:</span> {aircraft.baseRegion || "N/A"}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : (
                            <>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Base Country/Region</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs font-semibold text-slate-900 uppercase truncate cursor-help">
                                      {aircraft.baseCountry && aircraft.baseRegion
                                        ? `${aircraft.baseCountry} / ${aircraft.baseRegion}`
                                        : aircraft.baseCountry || aircraft.baseRegion || "—"}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 border-slate-700">
                                    <div className="text-sm text-white space-y-1">
                                      <p><span className="font-semibold">Country:</span> {aircraft.baseCountry || "N/A"}</p>
                                      <p><span className="font-semibold">Region:</span> {aircraft.baseRegion || "N/A"}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>

                        {/* Crew/Pax Seats */}
                        {(selectedMainCoverages.includes('HL') || (selectedMainCoverages.length === 1 && selectedMainCoverages.includes('PA'))) && (
                        <div className="px-4 py-3.5" style={{ width: isPAOnly ? '130px' : '100px' }}>
                          {isPAOnly ? (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Crew/Pax</p>
                              <p className="text-xs font-semibold text-slate-900">
                                {aircraft.crewSeats && aircraft.paxSeats
                                  ? `${aircraft.crewSeats} / ${aircraft.paxSeats}`
                                  : aircraft.crewSeats || aircraft.paxSeats || "—"}
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Crew/Pax</p>
                              <p className="text-xs font-semibold text-slate-900">
                                {aircraft.crewSeats && aircraft.paxSeats
                                  ? `${aircraft.crewSeats} / ${aircraft.paxSeats}`
                                  : aircraft.crewSeats || aircraft.paxSeats || "—"}
                              </p>
                            </>
                          )}
                        </div>
                        )}

                        {/* Dual Crew */}
                        {selectedMainCoverages.includes('HL') && (
                        <div className="px-4 py-3.5" style={{ width: '80px' }}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Dual Crew</p>
                          <div className="flex items-center">
                            {aircraft.isDualCrew ? (
                              <Check className="size-3.5 text-green-600" />
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">NO</span>
                            )}
                          </div>
                        </div>
                        )}

                        {/* Type - Hide for UAS */}
                        {!isUASProduct && (
                        <div className="px-4 py-3.5" style={{ width: isPAOnly ? '140px' : '90px' }}>
                          {isPAOnly ? (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Type</p>
                              <p className="text-xs font-semibold text-slate-900 uppercase">
                                {aircraft.aircraftType && aircraft.engineType
                                  ? `${getTypeAbbreviation(aircraft.aircraftType, 'aircraft')} / ${getTypeAbbreviation(aircraft.engineType, 'engine')}`
                                  : aircraft.aircraftType
                                    ? getTypeAbbreviation(aircraft.aircraftType, 'aircraft')
                                    : aircraft.engineType
                                      ? getTypeAbbreviation(aircraft.engineType, 'engine')
                                      : "—"}
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Type</p>
                              <p className="text-xs font-semibold text-slate-900 uppercase">
                                {aircraft.aircraftType && aircraft.engineType
                                  ? `${getTypeAbbreviation(aircraft.aircraftType, 'aircraft')} / ${getTypeAbbreviation(aircraft.engineType, 'engine')}`
                                  : aircraft.aircraftType
                                    ? getTypeAbbreviation(aircraft.aircraftType, 'aircraft')
                                    : aircraft.engineType
                                      ? getTypeAbbreviation(aircraft.engineType, 'engine')
                                      : "—"}
                              </p>
                            </>
                          )}
                        </div>
                        )}

                        {/* Agreed Value */}
                        {!selectedMainCoverages.includes('HD') && !(selectedMainCoverages.length === 1 && selectedMainCoverages.includes('PA')) && (
                        <div className="px-4 py-3.5" style={{ width: '130px' }}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Agreed Value</p>
                          <p className="text-xs font-semibold text-slate-900">
                            {aircraft.aircraftAgreedValue && aircraft.aircraftAgreedValue !== "" && !isNaN(parseFloat(aircraft.aircraftAgreedValue.replace(/,/g, "")))
                              ? `${aircraft.aircraftAgreedValueCurrency} ${parseFloat(aircraft.aircraftAgreedValue.replace(/,/g, "")).toLocaleString()}`
                              : "—"}
                          </p>
                        </div>
                        )}

                        {/* Deductible */}
                        {selectedMainCoverages.includes('HL') && (
                        <div className="px-4 py-3.5" style={{ width: '130px' }}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Deductible</p>
                          <p className="text-xs font-semibold text-slate-900">
                            {aircraft.hullDeductible && aircraft.hullDeductible !== "" && !isNaN(parseFloat(aircraft.hullDeductible.replace(/,/g, "")))
                              ? `${aircraft.hullDeductibleCurrency} ${parseFloat(aircraft.hullDeductible.replace(/,/g, "")).toLocaleString()}`
                              : "—"}
                          </p>
                        </div>
                        )}

                        {/* Liability Limit */}
                        {(selectedMainCoverages.includes('HL') || (isUASProduct && selectedSubCoverages.includes('drone_liability'))) && (
                        <div className="px-4 py-3.5" style={{ width: '150px' }}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                            Liability {!isUASProduct && aircraft.liabilityType && `(${aircraft.liabilityType === 'CSL' ? 'CSL' : 'TPL'})`}
                          </p>
                          <p className="text-xs font-semibold text-slate-900">
                            {aircraft.liabilityLimit && aircraft.liabilityLimit !== "" && !isNaN(parseFloat(aircraft.liabilityLimit.replace(/,/g, "")))
                              ? `${aircraft.liabilityLimitCurrency} ${parseFloat(aircraft.liabilityLimit.replace(/,/g, "")).toLocaleString()}`
                              : "—"}
                          </p>
                        </div>
                        )}

                        {/* Sums Reinsured */}
                        {selectedMainCoverages.includes('HD') && (
                        <div className="px-4 py-3.5" style={{ width: '130px' }}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Sums Reinsured</p>
                          <p className="text-xs font-semibold text-slate-900">
                            {aircraft.sumsReinsured && aircraft.sumsReinsured !== "" && !isNaN(parseFloat(aircraft.sumsReinsured.replace(/,/g, "")))
                              ? `${aircraft.sumsReinsuredCurrency} ${parseFloat(aircraft.sumsReinsured.replace(/,/g, "")).toLocaleString()}`
                              : "—"}
                          </p>
                        </div>
                        )}

                        {/* Std Uses */}
                        {!selectedMainCoverages.includes('HD') && (
                        <div className="px-4 py-3.5" style={{ width: isPAOnly ? '110px' : '80px' }}>
                          {isPAOnly ? (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Std Uses</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Info className="size-3 text-[#004225]" />
                                      <span className="text-xs font-semibold text-slate-900">{aircraft.standardUses?.length || 0}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 border-slate-700 max-w-xs">
                                    {aircraft.standardUses?.length > 0 ? (
                                      <ul className="text-sm space-y-1">
                                        {aircraft.standardUses.map((use, i) => (
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
                          ) : (
                            <>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Std Uses</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Info className="size-3 text-[#004225]" />
                                      <span className="text-xs font-semibold text-slate-900">{aircraft.standardUses?.length || 0}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 border-slate-700 max-w-xs">
                                    {aircraft.standardUses?.length > 0 ? (
                                      <ul className="text-sm space-y-1">
                                        {aircraft.standardUses.map((use, i) => (
                                          <li key={i} className="text-white uppercase">• {use.replace("-", " ")}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-slate-400">No standard uses selected</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                        )}

                        {/* Spc Uses */}
                        {!selectedMainCoverages.includes('HD') && (
                        <div className="px-4 py-3.5" style={{ width: isPAOnly ? '110px' : '80px' }}>
                          {isPAOnly ? (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Spc Uses</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Info className={`size-3 ${aircraft.specialUses?.length > 0 ? 'text-[#004225]' : 'text-orange-400'}`} />
                                      <span className={`font-semibold text-xs ${aircraft.specialUses?.length > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {Array.isArray(aircraft.specialUses) ? aircraft.specialUses.length : 0}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 border-slate-700 max-w-xs">
                                    {aircraft.specialUses?.length > 0 ? (
                                      <ul className="text-sm space-y-1">
                                        {aircraft.specialUses.map((use, i) => (
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
                          ) : (
                            <>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Spc Uses</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Info className={`size-3 ${aircraft.specialUses?.length > 0 ? 'text-[#004225]' : 'text-orange-400'}`} />
                                      <span className={`font-semibold text-xs ${aircraft.specialUses?.length > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {Array.isArray(aircraft.specialUses) ? aircraft.specialUses.length : 0}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 border-slate-700 max-w-xs">
                                    {aircraft.specialUses?.length > 0 ? (
                                      <ul className="text-sm space-y-1">
                                        {aircraft.specialUses.map((use, i) => (
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
                            </>
                          )}
                        </div>
                        )}

                        {/* Tax */}
                        <div className="px-4 py-3.5" style={{ width: isPAOnly ? '90px' : '70px' }}>
                          {isPAOnly ? (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Tax</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Info className={`size-3 ${aircraft.taxPercentage && aircraft.taxPercentage !== "" ? 'text-[#004225]' : 'text-gray-300'}`} />
                                      <span className={`font-semibold text-xs ${aircraft.taxPercentage && aircraft.taxPercentage !== "" ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {aircraft.taxPercentage && aircraft.taxPercentage !== "" ? `${aircraft.taxPercentage}%` : "—"}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 border-slate-700 max-w-xs">
                                    {aircraft.taxPercentage && aircraft.taxPercentage !== "" ? (
                                      <div className="text-sm space-y-1">
                                        <p className="text-slate-200"><span className="font-semibold">Name:</span> {aircraft.taxName || "N/A"}</p>
                                        <p className="text-slate-200"><span className="font-semibold">Type:</span> {aircraft.taxType === "addition" ? "Addition" : "Deduction"}</p>
                                        <p className="text-slate-200"><span className="font-semibold">Percentage:</span> {aircraft.taxPercentage}%</p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-400">Tax (if applicable)</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : (
                            <>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Tax</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Info className={`size-3 ${aircraft.taxPercentage && aircraft.taxPercentage !== "" ? 'text-[#004225]' : 'text-gray-300'}`} />
                                      <span className={`font-semibold text-xs ${aircraft.taxPercentage && aircraft.taxPercentage !== "" ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {aircraft.taxPercentage && aircraft.taxPercentage !== "" ? `${aircraft.taxPercentage}%` : "—"}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 border-slate-700 max-w-xs">
                                    {aircraft.taxPercentage && aircraft.taxPercentage !== "" ? (
                                      <div className="text-sm space-y-1">
                                        <p className="text-slate-200"><span className="font-semibold">Name:</span> {aircraft.taxName || "N/A"}</p>
                                        <p className="text-slate-200"><span className="font-semibold">Type:</span> {aircraft.taxType === "addition" ? "Addition" : "Deduction"}</p>
                                        <p className="text-slate-200"><span className="font-semibold">Percentage:</span> {aircraft.taxPercentage}%</p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-400">Tax (if applicable)</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex-shrink-0 flex items-center gap-1.5 px-3 self-stretch border-l border-gray-100">
                      <button
                        type="button"
                        onClick={() => editAircraftInFleet(index)}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#004225] hover:border-[#004225]/30 hover:bg-[#004225]/5 transition-all duration-150 shadow-sm"
                        title={`Edit ${aircraftLabelLower}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAircraftFromFleet(index)}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all duration-150 shadow-sm"
                        title={`Remove ${aircraftLabelLower}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </CardContent>
            </Card>
            )}

            {/* Aircraft Spares Card - Hide for HD, PA-only, and UAS */}
            {!selectedMainCoverages.includes('HD') && !(selectedMainCoverages.length === 1 && selectedMainCoverages.includes('PA')) && !isUASProduct && (
            <Card className="bg-white border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="pb-0 pt-0 px-0 border-b border-gray-200">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-1 h-8 bg-[#004225] rounded-full" />
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{aircraftLabel} Spares</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      {selectedMainCoverages.includes('HL') && selectedMainCoverages.includes('HW') 
                        ? 'Optional spares coverage for Hull and Liability and Hull War' 
                        : selectedMainCoverages.includes('HW') 
                          ? 'Optional spares coverage for Hull War' 
                          : 'Configure spares coverage if selected in Step 1'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
          <CardContent>
            {(selectedSubCoverages.includes("spares") || selectedMainCoverages.includes('HW')) ? (
              <div className="grid grid-cols-2 gap-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="aircraftSparesCurrency" className="text-slate-700 text-sm font-medium">
                    Currency
                  </Label>
                  <Select value={aircraftSparesCurrency} onValueChange={setAircraftSparesCurrency}>
                    <SelectTrigger
                      id="aircraftSparesCurrency"
                      className="bg-white border-gray-300 text-slate-900 hover:bg-gray-50 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                    >
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="USD" className="text-slate-900 hover:bg-slate-100">USD</SelectItem>
                      <SelectItem value="EUR" className="text-slate-900 hover:bg-slate-100">EUR</SelectItem>
                      <SelectItem value="GBP" className="text-slate-900 hover:bg-slate-100">GBP</SelectItem>
                      <SelectItem value="JPY" className="text-slate-900 hover:bg-slate-100">JPY</SelectItem>
                      <SelectItem value="AUD" className="text-slate-900 hover:bg-slate-100">AUD</SelectItem>
                      <SelectItem value="CAD" className="text-slate-900 hover:bg-slate-100">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aircraftSparesAmount" className="text-slate-700 text-sm font-medium">
                    Amount
                  </Label>
                  <Input
                    id="aircraftSparesAmount"
                    type="text"
                    value={aircraftSparesAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, "");
                      if (value === "" || /^\d+$/.test(value)) {
                        const formattedValue = value ? parseInt(value).toLocaleString() : "";
                        setAircraftSparesAmount(formattedValue);
                      }
                    }}
                    placeholder="Enter spares amount"
                    className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center mt-6">
                <p className="text-slate-600 text-sm">
                  {selectedMainCoverages.includes('HW') 
                    ? `${aircraftLabel} Spares is available for Hull War coverage. Enter amount above if needed.`
                    : 'Coverage not selected. Please select "Spares" in Step 1 to configure this coverage.'}
                </p>
              </div>
            )}
              </CardContent>
            </Card>
            )}

            {/* Geographical Limits Card - Policy Level - Hide for UAS */}
            {!isUASProduct && (
            <Card className="bg-white border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="pb-0 pt-0 px-0 border-b border-gray-200">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-1 h-8 bg-[#004225] rounded-full" />
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Geographical Limits</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Specify any excluded countries for the policy
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">
                    Flying to LSW617 Countries
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start bg-white border-gray-300 text-slate-900 hover:bg-gray-50 hover:text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm font-normal"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
                            {excludedCountries.length === 0 ? (
                              <span className="text-slate-400">Select excluded countries (if any)</span>
                            ) : (
                              excludedCountries.map((country) => (
                                <span
                                  key={country}
                                  className="inline-flex items-center gap-0.5 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium"
                                >
                                  {country}
                                </span>
                              ))
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-white border-gray-200" align="start">
                      <Command className="bg-white">
                        <CommandInput 
                          placeholder="Search countries..." 
                          className="bg-white border-gray-200 text-slate-900 placeholder:text-slate-400"
                        />
                        <CommandList>
                          <CommandEmpty className="text-slate-500 text-sm py-6 text-center">No country found.</CommandEmpty>
                          {sanctionedCountryGroups.map((group) => (
                            <CommandGroup key={group.label} heading={group.label} className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                              {group.countries.map((country) => (
                                <CommandItem
                                  key={country}
                                  onSelect={() => {
                                    setExcludedCountries((prev) =>
                                      prev.includes(country)
                                        ? prev.filter((item) => item !== country)
                                        : [...prev, country]
                                    );
                                  }}
                                  className="text-slate-900 hover:bg-gray-50 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={excludedCountries.includes(country)}
                                    className="mr-2 border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225]"
                                  />
                                  {country}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-slate-500 text-xs mt-1.5">
                    Leave empty if not flying to any sanctioned/excluded countries
                  </p>
                </div>
              </CardContent>
            </Card>
            )}

            {/* PA Coverage Amounts Card - Only for PA coverage */}
            {selectedMainCoverages.length === 1 && selectedMainCoverages.includes('PA') && (
              <Card className="bg-white border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="pb-0 pt-0 px-0 border-b border-gray-200">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="w-1 h-8 bg-[#004225] rounded-full" />
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Coverage Amounts</CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Specify per-seat coverage amounts for Personal Accident
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className={`gap-4 ${
                    selectedSubCoverages.includes('crew_personal_accident') && selectedSubCoverages.includes('passenger_personal_accident')
                      ? 'grid grid-cols-2'
                      : 'grid grid-cols-1'
                  }`}>
                    {selectedSubCoverages.includes('crew_personal_accident') && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="crewSumsReinsuredPerSeat" className="text-slate-700 text-sm font-medium">
                            Crew Sums Reinsured Per Seat
                          </Label>
                          <div className="flex gap-2">
                          <Select value={crewSumsReinsuredCurrency} onValueChange={setCrewSumsReinsuredCurrency}>
                            <SelectTrigger className="w-20 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                              <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                              <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                              <SelectItem value="SGD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">SGD</SelectItem>
                              <SelectItem value="IDR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">IDR</SelectItem>
                              <SelectItem value="MYR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">MYR</SelectItem>
                              <SelectItem value="AUD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">AUD</SelectItem>
                              <SelectItem value="PHP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">PHP</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="crewSumsReinsuredPerSeat"
                            type="text"
                            value={crewSumsReinsuredPerSeat}
                            onChange={(e) => handleNumericInput(e.target.value, setCrewSumsReinsuredPerSeat)}
                            placeholder="Enter amount"
                            className="flex-1 bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                          />
                        </div>
                        </div>

                      </div>
                    )}
                    {selectedSubCoverages.includes('passenger_personal_accident') && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="paxSumsReinsuredPerSeat" className="text-slate-700 text-sm font-medium">
                            Pax Sums Reinsured Per Seat
                          </Label>
                          <div className="flex gap-2">
                          <Select value={paxSumsReinsuredCurrency} onValueChange={setPaxSumsReinsuredCurrency}>
                            <SelectTrigger className="w-20 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                              <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                              <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                              <SelectItem value="SGD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">SGD</SelectItem>
                              <SelectItem value="IDR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">IDR</SelectItem>
                              <SelectItem value="MYR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">MYR</SelectItem>
                              <SelectItem value="AUD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">AUD</SelectItem>
                              <SelectItem value="PHP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">PHP</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="paxSumsReinsuredPerSeat"
                            type="text"
                            value={paxSumsReinsuredPerSeat}
                            onChange={(e) => handleNumericInput(e.target.value, setPaxSumsReinsuredPerSeat)}
                            placeholder="Enter amount"
                            className="flex-1 bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg h-10 text-sm"
                          />
                        </div>
                        </div>

                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-5 border-t border-gray-200 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="text-slate-500 hover:text-slate-900 hover:bg-gray-50 rounded-lg px-5 py-2.5 text-sm font-medium border border-gray-200"
              >
              ← Back
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => {
                  // Validate that at least one aircraft is in the fleet
                  if (fleet.length === 0) {
                    toast.error(`Please add at least one ${acLabel} to the fleet before continuing`);
                    return;
                  }
                  
                  // Validate spares amount only if spares coverage is selected (not for Hull War or UAS)
                  if (!isUASProduct && selectedSubCoverages.includes("spares") && 
                      (!aircraftSparesAmount || aircraftSparesAmount.trim() === "")) {
                    toast.error(`Please enter an ${AcLabel} Spares amount before continuing`);
                    return;
                  }
                  
                  // Validate PA Coverage Amounts if PA coverage is selected
                  if (selectedMainCoverages.includes('PA')) {
                    if (selectedSubCoverages.includes('crew_personal_accident') && (!crewSumsReinsuredPerSeat || crewSumsReinsuredPerSeat.trim() === "")) {
                      toast.error("Please enter Crew Sums Reinsured Per Seat in Coverage Amounts");
                      return;
                    }
                    if (selectedSubCoverages.includes('passenger_personal_accident') && (!paxSumsReinsuredPerSeat || paxSumsReinsuredPerSeat.trim() === "")) {
                      toast.error("Please enter Pax Sums Reinsured Per Seat in Coverage Amounts");
                      return;
                    }
                  }
                  
                  // Don't call saveDraftProgress() here - auto-save handles it
                  // Go to Step 4 (Claims History for UAS, Pilot Details for others)
                  setCurrentStep(currentStep + 1);
                }}
                disabled={
                  fleet.length === 0 || 
                  (selectedSubCoverages.includes("spares") && 
                   (!aircraftSparesAmount || aircraftSparesAmount.trim() === "")) ||
                  (selectedMainCoverages.includes('PA') && selectedSubCoverages.includes('crew_personal_accident') && (!crewSumsReinsuredPerSeat || crewSumsReinsuredPerSeat.trim() === "")) ||
                  (selectedMainCoverages.includes('PA') && selectedSubCoverages.includes('passenger_personal_accident') && (!paxSumsReinsuredPerSeat || paxSumsReinsuredPerSeat.trim() === ""))
                }
                className={`font-medium rounded-lg px-8 py-2.5 text-sm transition-all duration-200 ${
                  fleet.length > 0 && 
                  !(selectedSubCoverages.includes("spares") && 
                    (!aircraftSparesAmount || aircraftSparesAmount.trim() === "")) &&
                  !(selectedMainCoverages.includes('PA') && selectedSubCoverages.includes('crew_personal_accident') && (!crewSumsReinsuredPerSeat || crewSumsReinsuredPerSeat.trim() === "")) &&
                  !(selectedMainCoverages.includes('PA') && selectedSubCoverages.includes('passenger_personal_accident') && (!paxSumsReinsuredPerSeat || paxSumsReinsuredPerSeat.trim() === ""))
                    ? 'bg-[#004225] hover:bg-[#003319] text-white' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue to Step 4 →
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Aircraft Modal */}
        <EditAircraftModal
          isOpen={isEditModalOpen}
          onClose={cancelEditAircraft}
          onSave={saveEditedAircraft}
          selectedMainCoverages={selectedMainCoverages}
          registration={registration}
          setRegistration={setRegistration}
          aircraftType={aircraftType}
          setAircraftType={setAircraftType}
          engineType={engineType}
          setEngineType={setEngineType}
          make={make}
          setMake={setMake}
          model={model}
          setModel={setModel}
          baseCountry={baseCountry}
          setBaseCountry={setBaseCountry}
          baseRegion={baseRegion}
          setBaseRegion={setBaseRegion}
          crewSeats={crewSeats}
          setCrewSeats={setCrewSeats}
          paxSeats={paxSeats}
          setPaxSeats={setPaxSeats}
          isDualCrew={isDualCrew}
          setIsDualCrew={setIsDualCrew}
          aircraftAgreedValue={aircraftAgreedValue}
          setAircraftAgreedValue={setAircraftAgreedValue}
          aircraftAgreedValueCurrency={aircraftAgreedValueCurrency}
          setAircraftAgreedValueCurrency={setAircraftAgreedValueCurrency}
          liabilityLimit={liabilityLimit}
          setLiabilityLimit={setLiabilityLimit}
          liabilityLimitCurrency={liabilityLimitCurrency}
          setLiabilityLimitCurrency={setLiabilityLimitCurrency}
          liabilityType={liabilityType}
          setLiabilityType={setLiabilityType}
          hullDeductible={hullDeductible}
          setHullDeductible={setHullDeductible}
          hullDeductibleCurrency={hullDeductibleCurrency}
          setHullDeductibleCurrency={setHullDeductibleCurrency}
          standardDeductible={standardDeductible}
          setStandardDeductible={setStandardDeductible}
          standardDeductibleCurrency={standardDeductibleCurrency}
          setStandardDeductibleCurrency={setStandardDeductibleCurrency}
          deductibleBuydown={deductibleBuydown}
          setDeductibleBuydown={setDeductibleBuydown}
          standardUses={standardUses}
          setStandardUses={setStandardUses}
          specialUses={specialUses}
          setSpecialUses={setSpecialUses}
          specialUsesOther={specialUsesOther}
          setSpecialUsesOther={setSpecialUsesOther}
          taxType={taxType}
          setTaxType={setTaxType}
          taxPercentage={taxPercentage}
          setTaxPercentage={setTaxPercentage}
          taxName={taxName}
          setTaxName={setTaxName}
          handleAircraftTypeChange={handleAircraftTypeChange}
          handleNumericInput={handleNumericInput}
          handleAircraftLookup={handleAircraftLookup}
          isLookingUpAircraft={isLookingUpAircraft}
          standardUsesOptions={standardUsesOptions}
          specialUsesOptions={specialUsesOptions}
        />

        {/* Registration Duplication Alert */}
        <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
          <AlertDialogContent className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white text-xl">Registration Duplication</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                A {acLabel} with this {isUASProduct ? 'serial number' : 'registration number'} already exists in the fleet. Please use a different {isUASProduct ? 'serial number' : 'registration number'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction 
                onClick={() => setIsDuplicateAlertOpen(false)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Step 4: Pilot Details (aircraft) or Claims History (UAS/HW/HD/PA/LOL-only)
  if (currentStep === 4) {
    // Show Claims History for LOL-only submissions
    if (shouldSkipStep3) {
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
          selectedSubCoverages={selectedSubCoverages}
          onBack={() => setCurrentStep(3)}
          onContinue={() => setCurrentStep(6)}
          formatNumberWithCommas={formatNumberWithCommas}
          stepNumber={4}
          totalSteps={5}
        />
      );
    }

    // Show Claims History for UAS products
    if (isUASProduct) {
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
          selectedSubCoverages={selectedSubCoverages}
          onBack={() => setCurrentStep(3)}
          onContinue={() => setCurrentStep(6)}
          formatNumberWithCommas={formatNumberWithCommas}
          stepNumber={4}
          totalSteps={5}
        />
      );
    }

    // Show Claims History if only Hull War or Hull Deductible is selected
    if (shouldSkipStep4) {
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
          selectedSubCoverages={selectedSubCoverages}
          onBack={() => setCurrentStep(3)}
          onContinue={() => setCurrentStep(6)}
          formatNumberWithCommas={formatNumberWithCommas}
        />
      );
    }
    
    return (
      <PilotDetailsStep
        selectedMainCoverages={selectedMainCoverages}
        selectedSubCoverages={selectedSubCoverages}
        namedPilots={namedPilots}
        setNamedPilots={setNamedPilots}
        openPilotWarranty={openPilotWarranty}
        setOpenPilotWarranty={setOpenPilotWarranty}
        pilotsUnder65={pilotsUnder65}
        setPilotsUnder65={setPilotsUnder65}
        namedPilotsDocument={namedPilotsDocument}
        setNamedPilotsDocument={setNamedPilotsDocument}
        fleet={fleet}
        minRequiredHours={minRequiredHours}
        setMinRequiredHours={setMinRequiredHours}
        opwHours={opwHours}
        setOpwHours={setOpwHours}
        crewCoverageType={crewCoverageType}
        crewMembers={crewMembers}
        setCrewMembers={setCrewMembers}
        showCrewMemberForm={showCrewMemberForm}
        setShowCrewMemberForm={setShowCrewMemberForm}
        tempCrewMember={tempCrewMember}
        setTempCrewMember={setTempCrewMember}
        crewPositionOther={crewPositionOther}
        setCrewPositionOther={setCrewPositionOther}
        shouldSkipStep3={shouldSkipStep3}
        onBack={() => setCurrentStep(shouldSkipStep3 ? 2 : 3)}
        onContinue={() => setCurrentStep(5)}
      />
    );
  }

  // Step 5: Sub-Limits and Clauses
  if (currentStep === 5) {
    return (
      <SubLimitsClausesStep
        selectedMainCoverages={selectedMainCoverages}
        selectedSubCoverages={selectedSubCoverages}
        fleet={fleet}
        medicalExpensesLimit={medicalExpensesLimit}
        setMedicalExpensesLimit={setMedicalExpensesLimit}
        medicalExpensesCurrency={medicalExpensesCurrency}
        setMedicalExpensesCurrency={setMedicalExpensesCurrency}
        cargoLiabilityLimit={cargoLiabilityLimit}
        setCargoLiabilityLimit={setCargoLiabilityLimit}
        cargoLiabilityCurrency={cargoLiabilityCurrency}
        setCargoLiabilityCurrency={setCargoLiabilityCurrency}
        baggageLimit={baggageLimit}
        setBaggageLimit={setBaggageLimit}
        baggageCurrency={baggageCurrency}
        setBaggageCurrency={setBaggageCurrency}
        passengerSettlementLimit={passengerSettlementLimit}
        setPassengerSettlementLimit={setPassengerSettlementLimit}
        passengerSettlementCurrency={passengerSettlementCurrency}
        setPassengerSettlementCurrency={setPassengerSettlementCurrency}
        pphLimit={pphLimit}
        setPphLimit={setPphLimit}
        pphCurrency={pphCurrency}
        setPphCurrency={setPphCurrency}
        noClaimsBonus={noClaimsBonus}
        setNoClaimsBonus={setNoClaimsBonus}
        noClaimsBonusPercentage={noClaimsBonusPercentage}
        setNoClaimsBonusPercentage={setNoClaimsBonusPercentage}
        profitCommission={profitCommission}
        setProfitCommission={setProfitCommission}
        profitCommissionPercentage={profitCommissionPercentage}
        setProfitCommissionPercentage={setProfitCommissionPercentage}
        profitCommissionBasis={profitCommissionBasis}
        setProfitCommissionBasis={setProfitCommissionBasis}
        cargoEndorsement={cargoEndorsement}
        setCargoEndorsement={setCargoEndorsement}
        shouldSkipStep3={shouldSkipStep3}
        shouldSkipStep4={shouldSkipStep4}
        onBack={() => setCurrentStep(shouldSkipStep3 ? 3 : shouldSkipStep4 ? 3 : 4)}
        onContinue={() => setCurrentStep(6)}
        formatNumberWithCommas={formatNumberWithCommas}
        removeCommas={removeCommas}
        stepNumber={5}
        totalSteps={selectedMainCoverages.includes('HL') ? 7 : 5}
      />
    );
  }

  // Step 6: Claims History (for Hull & Liability) or Review (for others)
  if (currentStep === 6) {
    // For Hull & Liability, show Claims History first before Review
    const hasHullLiability = selectedMainCoverages.includes('HL');
    
    if (hasHullLiability) {
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
          selectedSubCoverages={selectedSubCoverages}
          onBack={() => setCurrentStep(5)}
          onContinue={() => setCurrentStep(7)}
          formatNumberWithCommas={formatNumberWithCommas}
          stepNumber={6}
          totalSteps={7}
        />
      );
    }
    
    // For other products (not HL), go directly to Review at Step 6
    return (
      <ReviewStep
        selectedMainCoverages={selectedMainCoverages}
        selectedSubCoverages={selectedSubCoverages}
        placementType={placementType}
        producingBroker={producingBroker}
        isDirect={isDirect}
        insuredName={insuredName}
        insuredAddressLine1={insuredAddressLine1}
        insuredCity={insuredCity}
        insuredCountry={insuredCountry}
        insuredPostcode={insuredPostcode}
        additionalInsureds={additionalInsureds}
        reinsuredName={reinsuredName}
        reinsuredAddressLine1={reinsuredAddressLine1}
        reinsuredCity={reinsuredCity}
        reinsuredCountry={reinsuredCountry}
        reinsuredPostcode={reinsuredPostcode}
        inceptionDate={inceptionDate}
        expiryDate={expiryDate}
        inceptionDateTBA={inceptionDateTBA}
        expiryDateTBA={expiryDateTBA}
        bothDatesIncluded={bothDatesIncluded}
        inceptionTime={inceptionTime}
        expiryTime={expiryTime}
        timeZoneOption={timeZoneOption}
        fleet={fleet}
        lolPilots={lolPilots}
        excludedCountries={excludedCountries}
        medicalExpensesLimit={medicalExpensesLimit}
        medicalExpensesCurrency={medicalExpensesCurrency}
        cargoLiabilityLimit={cargoLiabilityLimit}
        cargoLiabilityCurrency={cargoLiabilityCurrency}
        baggageLimit={baggageLimit}
        baggageCurrency={baggageCurrency}
        passengerSettlementLimit={passengerSettlementLimit}
        passengerSettlementCurrency={passengerSettlementCurrency}
        pphLimit={pphLimit}
        pphCurrency={pphCurrency}
        aircraftSparesAmount={aircraftSparesAmount}
        aircraftSparesCurrency={aircraftSparesCurrency}
        noClaimsBonus={noClaimsBonus}
        noClaimsBonusPercentage={noClaimsBonusPercentage}
        profitCommission={profitCommission}
        profitCommissionPercentage={profitCommissionPercentage}
        profitCommissionBasis={profitCommissionBasis}
        cargoEndorsement={cargoEndorsement}
        claimsHistory={claimsHistory}
        generalClaimsInfo={generalClaimsInfo}
        claimsDetails={claimsDetails}
        supportingDocuments={supportingDocuments}
        setSupportingDocuments={setSupportingDocuments}
        selectedMainCoveragesForLineslips={selectedMainCoverages}
        selectedLineslips={selectedLineslips}
        setSelectedLineslips={setSelectedLineslips}
        getEligibleLineslips={getEligibleLineslips}
        coverageOptions={coverageOptions}
        selectedBinders={selectedBinders}
        setSelectedBinders={setSelectedBinders}
        getEligibleBinders={getEligibleBinders}
        allBinders={binders}
        binderBuilderSelections={binderBuilderSelections}
        setBinBuilderSelections={setBinBuilderSelections}
        shouldSkipStep3={shouldSkipStep3}
        shouldSkipStep5={shouldSkipStep5}
        onBack={() => setCurrentStep(isUASProduct ? 4 : shouldSkipStep3 ? 4 : isPA24Hour ? 4 : shouldSkipStep5 ? 4 : 5)}
        onSubmit={async (e?: any) => {
          if (e) e.preventDefault();
          setIsSubmitting(true);
          try {
            // Construct placement data to submit
            const selectedBrokerContact = selectedProducingBrokerId 
              ? contacts.find(c => c.id === selectedProducingBrokerId)
              : null;
            
            // Await the draft data to ensure all fields are included
            const { draftData, draftId } = await saveDraftProgress();
            
            console.log('🔍 [Coverage Details Step] selectedMainCoverages:', selectedMainCoverages);
            console.log('🔍 [Coverage Details Step] Total coverages to submit:', selectedMainCoverages.length);
            console.log('🔍 [Coverage Details Step] isDraftPlacement:', !!draftPlacement);
            console.log('🆔 [Coverage Details Step] localDraftId BEFORE LOOP:', localDraftId);
            console.log('🆔 [Coverage Details Step] draftId from saveDraftProgress:', draftId);
            
            // Create separate submissions for each selected coverage
            for (let i = 0; i < selectedMainCoverages.length; i++) {
              const coverageId = selectedMainCoverages[i];
              console.log(`🎯 [Coverage Details Step] Creating placement ${i + 1} of ${selectedMainCoverages.length} with productCode:`, coverageId);
              const placementData = {
                brokerName: isDirect ? "Direct" : producingBroker,
                brokerCompany: isDirect ? "Direct" : (selectedBrokerContact?.company || ""),
                insuredName,
                aircraftType: aircraftType || "",
                productCode: coverageId,
                coverageType: placementType || "insurance",
                hullValue: parseFloat(removeCommas(aircraftAgreedValue)) || 0,
                liability: parseFloat(removeCommas(liabilityLimit)) || 0,
                inceptionDate,
                draftData: draftData, // saveDraftProgress already returns the nested draftData
              };
              
              console.log(`📦 [Coverage Details Step] Submitting placement with productCode:`, placementData.productCode);
              
              // If editing a draft and this is not the first coverage, force creation of new placement
              const forceNew = Boolean(draftId) && i > 0;
              console.log(`🔧 [Coverage Details Step] forceNew flag:`, forceNew, `(draftId: ${draftId}, i: ${i})`);
              await onSubmit(placementData, forceNew, draftId);
              console.log(`✅ [Coverage Details Step] Placement ${i + 1} submitted`);
            }
            
            const productNames = selectedMainCoverages.map(coverageId => {
              const coverage = coverageOptions.find(c => c.id === coverageId);
              return coverage?.title || coverageId;
            });
            
            if (selectedMainCoverages.length > 1) {
              toast.success(
                `${selectedMainCoverages.length} placements submitted successfully! Each product will be sent to its specialist underwriter: ${productNames.join(", ")}.`
              );
            } else {
              toast.success(
                `Placement submitted successfully! ${productNames[0]} is now pending review by the underwriter.`
              );
            }
            
            onCancel();
          } finally {
            setIsSubmitting(false);
          }
        }}
        isSubmitting={isSubmitting}
        setGeneralClaimsInfo={setGeneralClaimsInfo}
        setClaimsDetails={setClaimsDetails}
        formatDateToUK={formatDateToUK}
        formatNumberWithCommas={formatNumberWithCommas}
        orderHereonPercentage={orderHereonPercentage}
        orderHereonBasis={orderHereonBasis}
        crewCoverageType={crewCoverageType}
        crewMembers={crewMembers}
        namedPilots={namedPilots}
        openPilotWarranty={openPilotWarranty}
        pilotsUnder65={pilotsUnder65}
        namedPilotsDocument={namedPilotsDocument}
        minRequiredHours={minRequiredHours}
        opwHours={opwHours}
      />
    );
  }

  // Step 7: Review (only for Hull & Liability after Claims History)
  if (currentStep === 7) {
    return (
      <ReviewStep
        selectedMainCoverages={selectedMainCoverages}
        selectedSubCoverages={selectedSubCoverages}
        placementType={placementType}
        producingBroker={producingBroker}
        isDirect={isDirect}
        insuredName={insuredName}
        insuredAddressLine1={insuredAddressLine1}
        insuredCity={insuredCity}
        insuredCountry={insuredCountry}
        insuredPostcode={insuredPostcode}
        additionalInsureds={additionalInsureds}
        reinsuredName={reinsuredName}
        reinsuredAddressLine1={reinsuredAddressLine1}
        reinsuredCity={reinsuredCity}
        reinsuredCountry={reinsuredCountry}
        reinsuredPostcode={reinsuredPostcode}
        inceptionDate={inceptionDate}
        expiryDate={expiryDate}
        inceptionDateTBA={inceptionDateTBA}
        expiryDateTBA={expiryDateTBA}
        bothDatesIncluded={bothDatesIncluded}
        inceptionTime={inceptionTime}
        expiryTime={expiryTime}
        timeZoneOption={timeZoneOption}
        fleet={fleet}
        lolPilots={lolPilots}
        excludedCountries={excludedCountries}
        medicalExpensesLimit={medicalExpensesLimit}
        medicalExpensesCurrency={medicalExpensesCurrency}
        cargoLiabilityLimit={cargoLiabilityLimit}
        cargoLiabilityCurrency={cargoLiabilityCurrency}
        baggageLimit={baggageLimit}
        baggageCurrency={baggageCurrency}
        passengerSettlementLimit={passengerSettlementLimit}
        passengerSettlementCurrency={passengerSettlementCurrency}
        pphLimit={pphLimit}
        pphCurrency={pphCurrency}
        aircraftSparesAmount={aircraftSparesAmount}
        aircraftSparesCurrency={aircraftSparesCurrency}
        noClaimsBonus={noClaimsBonus}
        noClaimsBonusPercentage={noClaimsBonusPercentage}
        profitCommission={profitCommission}
        profitCommissionPercentage={profitCommissionPercentage}
        profitCommissionBasis={profitCommissionBasis}
        cargoEndorsement={cargoEndorsement}
        claimsHistory={claimsHistory}
        generalClaimsInfo={generalClaimsInfo}
        claimsDetails={claimsDetails}
        supportingDocuments={supportingDocuments}
        setSupportingDocuments={setSupportingDocuments}
        selectedMainCoveragesForLineslips={selectedMainCoverages}
        selectedLineslips={selectedLineslips}
        setSelectedLineslips={setSelectedLineslips}
        getEligibleLineslips={getEligibleLineslips}
        coverageOptions={coverageOptions}
        selectedBinders={selectedBinders}
        setSelectedBinders={setSelectedBinders}
        getEligibleBinders={getEligibleBinders}
        allBinders={binders}
        binderBuilderSelections={binderBuilderSelections}
        setBinBuilderSelections={setBinBuilderSelections}
        shouldSkipStep3={shouldSkipStep3}
        shouldSkipStep5={shouldSkipStep5}
        namedPilots={namedPilots}
        openPilotWarranty={openPilotWarranty}
        pilotsUnder65={pilotsUnder65}
        namedPilotsDocument={namedPilotsDocument}
        minRequiredHours={minRequiredHours}
        opwHours={opwHours}
        onBack={() => setCurrentStep(6)}
        onSubmit={async (e?: any) => {
          if (e) e.preventDefault();
          setIsSubmitting(true);
          try {
            const selectedBrokerContact = selectedProducingBrokerId 
              ? contacts.find(c => c.id === selectedProducingBrokerId)
              : null;
            
            // Await the draft data to ensure all fields are included
            const { draftData, draftId } = await saveDraftProgress();
            
            console.log('🔍 [Pilot Warranty Step] selectedMainCoverages:', selectedMainCoverages);
            console.log('🔍 [Pilot Warranty Step] Total coverages to submit:', selectedMainCoverages.length);
            console.log('🔍 [Pilot Warranty Step] isDraftPlacement:', !!draftPlacement);
            console.log('🆔 [Pilot Warranty Step] localDraftId BEFORE LOOP:', localDraftId);
            console.log('🆔 [Pilot Warranty Step] draftId from saveDraftProgress:', draftId);
            console.log('🔥 [Pilot Warranty Step] STARTING SUBMISSION LOOP');
            
            // Create separate submissions for each selected coverage
            for (let i = 0; i < selectedMainCoverages.length; i++) {
              console.log(`🔥 [Pilot Warranty Step] Loop iteration START - i=${i}`);
              const coverageId = selectedMainCoverages[i];
              console.log(`🎯 [Pilot Warranty Step] Loop iteration ${i}: Creating placement ${i + 1} of ${selectedMainCoverages.length} with productCode:`, coverageId);
              const placementData = {
                brokerName: isDirect ? "Direct" : producingBroker,
                brokerCompany: isDirect ? "Direct" : (selectedBrokerContact?.company || ""),
                insuredName,
                aircraftType: aircraftType || "",
                productCode: coverageId,
                coverageType: placementType || "insurance",
                hullValue: parseFloat(removeCommas(aircraftAgreedValue)) || 0,
                liability: parseFloat(removeCommas(liabilityLimit)) || 0,
                inceptionDate,
                draftData: draftData, // saveDraftProgress already returns the nested draftData
              };
              
              console.log(`📦 [Pilot Warranty Step] Submitting placement with productCode:`, placementData.productCode);
              
              // If editing a draft and this is not the first coverage, force creation of new placement
              const forceNew = Boolean(draftId) && i > 0;
              console.log(`🔧 [Pilot Warranty Step] forceNew flag:`, forceNew, `(draftId: ${draftId}, i: ${i})`);
              await onSubmit(placementData, forceNew, draftId);
              console.log(`✅ [Pilot Warranty Step] Placement ${i + 1} submitted`);
            }
            
            const productNames = selectedMainCoverages.map(coverageId => {
              const coverage = coverageOptions.find(c => c.id === coverageId);
              return coverage?.title || coverageId;
            });
            
            if (selectedMainCoverages.length > 1) {
              toast.success(
                `${selectedMainCoverages.length} placements submitted successfully! Each product will be sent to its specialist underwriter: ${productNames.join(", ")}.`
              );
            } else {
              toast.success(
                `Placement submitted successfully! ${productNames[0]} is now pending review by the underwriter.`
              );
            }
            
            onCancel();
          } finally {
            setIsSubmitting(false);
          }
        }}
        isSubmitting={isSubmitting}
        setGeneralClaimsInfo={setGeneralClaimsInfo}
        setClaimsDetails={setClaimsDetails}
        formatDateToUK={formatDateToUK}
        formatNumberWithCommas={formatNumberWithCommas}
        orderHereonPercentage={orderHereonPercentage}
        orderHereonBasis={orderHereonBasis}
        crewCoverageType={crewCoverageType}
        crewMembers={crewMembers}
      />
    );
  }

  return null;
}

export default PlacementForm;