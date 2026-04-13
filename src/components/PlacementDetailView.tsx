import { Placement, UserRole, Lineslip, PlacementStatus, Contact } from "../App";
import { Button } from "./ui/button";
import { Building2, Plane, DollarSign, FileText, User, Clock, CheckCircle2, XCircle, Users, AlertTriangle, Edit, Globe, Shield, FileCheck, Send, Ban, Lock, ChevronLeft, Download, Upload, Zap } from "lucide-react";
import { useState } from "react";
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AircraftDetailsModal } from "./AircraftDetailsModal";
import { removeCommas } from "../utils/placementFormHelpers";
import { SlipDocumentViewer, generateBindingSlipBase64, generateEOCBase64, generateClaimsBase64 } from "./SlipDocumentViewer";
import { notifyFirmOrder, notifyBound } from "../utils/notifications";
import { LolQuoteForm } from "./LolQuoteForm";
import { StandardQuoteForm } from "./StandardQuoteForm";

interface PlacementDetailViewProps {
  placement: Placement;
  userRole: UserRole;
  onBack: () => void;
  onSubmitQuote?: (placementId: string, quote: any) => void;
  onDecline?: (placementId: string, reason?: string, reasonDetail?: string) => void;
  onStatusChange?: (placementId: string, newStatus: PlacementStatus) => void;
  onEdit?: (placementId: string) => void;
  lineslips?: Lineslip[];
  currentUser?: any;
  contacts?: Contact[];
  onUpdatePlacement?: (placement: Placement) => void;
  onComplianceRecheck?: (placementId: string) => Promise<void>;
}

export function PlacementDetailView({ placement, userRole, onBack, onSubmitQuote, onDecline, onStatusChange, onEdit, lineslips = [], currentUser, contacts = [], onUpdatePlacement, onComplianceRecheck }: PlacementDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"insured" | "aircraft" | "sublimits" | "pilots" | "claims" | "documents" | "premium">("insured");
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteTerms, setQuoteTerms] = useState("");
  // Currency is now derived from broker's placement data (aircraftAgreedValueCurrency)
  const [_quoteWrittenLine, setQuoteWrittenLine] = useState("100");
  const [quoteEndorsements, setQuoteEndorsements] = useState("");
  const [quoteHullRates, setQuoteHullRates] = useState<Record<string, string>>({});
  const [quoteLiabilityPremiums, setQuoteLiabilityPremiums] = useState<Record<string, string>>({});
  const [_quoteSparesPremium, setQuoteSparesPremium] = useState("");
  const [quoteSparesRate, setQuoteSparesRate] = useState("");
  const [quoteSparesIncludedInHull, setQuoteSparesIncludedInHull] = useState(false);
  const [quotePphPremium, setQuotePphPremium] = useState("");
  const [quoteConfiscationIncluded, setQuoteConfiscationIncluded] = useState(true); // HW only: Include/Exclude confiscation (LSW555D)
  const [_quoteLolPremium, setQuoteLolPremium] = useState(""); // LOL: single premium input
  const [quoteLolRateMode, setQuoteLolRateMode] = useState<"flat" | "ageBand">("flat");
  const [quoteLolFlatRate, setQuoteLolFlatRate] = useState("");
  const [quoteLolAgeBandRates, setQuoteLolAgeBandRates] = useState<Record<string, string>>({});
  const [quoteLolPersonRates, setQuoteLolPersonRates] = useState<Record<number, string>>({}); // per-person rate overrides
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showBrokerDeclineReasons, setShowBrokerDeclineReasons] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showBindConfirm, setShowBindConfirm] = useState(false);
  const [showQuoteConfirm, setShowQuoteConfirm] = useState(false);
  const [pendingQuoteData, setPendingQuoteData] = useState<any>(null);
  const [showDeclineFinalConfirm, setShowDeclineFinalConfirm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineReasonDetail, setDeclineReasonDetail] = useState("");
  
  // Editable inception dates for broker quoted actions
  // If TBA was set during submission, dates start empty for broker to fill in
  const [brokerInceptionDate, setBrokerInceptionDate] = useState(
    placement.draftData?.inceptionDateTBA ? "" : (placement.draftData?.inceptionDate || placement.inceptionDate || "")
  );
  const [brokerExpiryDate, setBrokerExpiryDate] = useState(
    placement.draftData?.expiryDateTBA ? "" : (placement.draftData?.expiryDate || "")
  );
  const [brokerBothDaysIncluded, setBrokerBothDaysIncluded] = useState(
    placement.draftData?.bothDatesIncluded !== undefined ? placement.draftData.bothDatesIncluded : true
  );
  const [brokerInceptionTime, setBrokerInceptionTime] = useState(placement.draftData?.inceptionTime || "");
  const [brokerExpiryTime, setBrokerExpiryTime] = useState(placement.draftData?.expiryTime || "");
  const [brokerTimeZoneOption, setBrokerTimeZoneOption] = useState(placement.draftData?.timeZoneOption || "original-insured");

  // Track whether dates were carried over from original submission
  const datesCarriedOver = !!(
    !placement.draftData?.inceptionDateTBA &&
    (placement.draftData?.inceptionDate || placement.inceptionDate)
  );

  // Earliest allowed inception = today minus 3 days
  const minInceptionDate = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 3);
    return d.toISOString().split("T")[0];
  })();

  // Check if inception date is backdated more than 3 days
  const inceptionBackdatedTooFar = (() => {
    if (!brokerInceptionDate) return false;
    return brokerInceptionDate < minInceptionDate;
  })();

  // Dates are fully confirmed when date fields are set AND (both days included OR times + timezone are set) AND not backdated too far
  const datesFullyConfirmed = !!(
    brokerInceptionDate && brokerExpiryDate &&
    (brokerBothDaysIncluded || (brokerInceptionTime && brokerExpiryTime)) &&
    !inceptionBackdatedTooFar
  );

  const handleBrokerInceptionTimeChange = (time: string) => {
    setBrokerInceptionTime(time);
    if (time) {
      const [hours, minutes] = time.split(":").map(Number);
      let adjMinutes = minutes - 1;
      let adjHours = hours;
      if (adjMinutes < 0) {
        adjMinutes = 59;
        adjHours = adjHours - 1;
        if (adjHours < 0) adjHours = 23;
      }
      const expiryT = `${String(adjHours).padStart(2, "0")}:${String(adjMinutes).padStart(2, "0")}`;
      setBrokerExpiryTime(expiryT);
      if (onUpdatePlacement) {
        onUpdatePlacement({
          ...placement,
          draftData: { ...placement.draftData, inceptionTime: time, expiryTime: expiryT, timeZoneOption: brokerTimeZoneOption },
        });
      }
    } else {
      if (onUpdatePlacement) {
        onUpdatePlacement({
          ...placement,
          draftData: { ...placement.draftData, inceptionTime: time, timeZoneOption: brokerTimeZoneOption },
        });
      }
    }
  };

  const handleBrokerExpiryTimeChange = (time: string) => {
    setBrokerExpiryTime(time);
    if (onUpdatePlacement) {
      onUpdatePlacement({
        ...placement,
        draftData: { ...placement.draftData, expiryTime: time },
      });
    }
  };

  const handleBrokerTimeZoneChange = (tz: string) => {
    setBrokerTimeZoneOption(tz);
    if (onUpdatePlacement) {
      onUpdatePlacement({
        ...placement,
        draftData: { ...placement.draftData, timeZoneOption: tz },
      });
    }
  };

  const handleBrokerInceptionChange = (date: string) => {
    setBrokerInceptionDate(date);
    let newExpiry = brokerExpiryDate;
    if (date) {
      const inception = new Date(date);
      if (brokerBothDaysIncluded) {
        const expiry = new Date(inception);
        expiry.setFullYear(expiry.getFullYear() + 1);
        expiry.setDate(expiry.getDate() - 1);
        newExpiry = expiry.toISOString().split("T")[0];
      } else {
        newExpiry = date;
      }
      setBrokerExpiryDate(newExpiry);
    }
    if (onUpdatePlacement) {
      onUpdatePlacement({
        ...placement,
        inceptionDate: date,
        draftData: {
          ...placement.draftData,
          inceptionDate: date,
          expiryDate: newExpiry,
          bothDatesIncluded: brokerBothDaysIncluded,
          inceptionDateTBA: false,
          expiryDateTBA: false,
        },
      });
    }
  };

  const handleBrokerExpiryChange = (date: string) => {
    setBrokerExpiryDate(date);
    if (onUpdatePlacement) {
      onUpdatePlacement({
        ...placement,
        draftData: { ...placement.draftData, expiryDate: date, expiryDateTBA: false },
      });
    }
  };

  const handleBrokerBothDaysToggle = (checked: boolean) => {
    setBrokerBothDaysIncluded(checked);
    let newExpiry = brokerExpiryDate;
    if (brokerInceptionDate) {
      const inception = new Date(brokerInceptionDate);
      if (checked) {
        const expiry = new Date(inception);
        expiry.setFullYear(expiry.getFullYear() + 1);
        expiry.setDate(expiry.getDate() - 1);
        newExpiry = expiry.toISOString().split("T")[0];
      } else {
        newExpiry = brokerInceptionDate;
      }
      setBrokerExpiryDate(newExpiry);
    }
    // Clear time fields when toggling back to "both days included"
    if (checked) {
      setBrokerInceptionTime("");
      setBrokerExpiryTime("");
    }
    if (onUpdatePlacement) {
      onUpdatePlacement({
        ...placement,
        draftData: {
          ...placement.draftData,
          bothDatesIncluded: checked,
          expiryDate: newExpiry,
          ...(checked ? { inceptionTime: "", expiryTime: "" } : {}),
        },
      });
    }
  };


  const getProductName = (code: string) => {
    const products: Record<string, string> = {
      HL: "Hull & Liability",
      HW: "Hull War",
      PA: "Personal Accident",
      LOL: "Loss of Licence",
      HD: "Hull Deductible",
      UAS: "Drone Insurance",
    };
    return products[code] || code;
  };

  const canEdit = userRole === "broker" && (placement.status === "pending" || placement.status === "compliance") && onEdit;
  const isHullWar = placement.productCode === "HW";
  const isHullDeductible = placement.productCode === "HD";
  const isPA = placement.productCode === "PA";
  const isLOL = placement.productCode === "LOL";
  const isUAS = placement.productCode === "UAS";
  const isDrone = isUAS;
  const is24HourPA = isPA && (placement.draftData?.crewCoverageType === "24_hour");

  // Check if risk has special uses
  const fleet = placement.draftData?.fleet || [];
  const hasSpecialUses = fleet.some((aircraft: any) => aircraft.specialUses && aircraft.specialUses.length > 0);
  
  // Check for policy-level excluded countries
  const excludedCountries = placement.draftData?.excludedCountries || [];
  const hasExcludedCountries = excludedCountries.length > 0;
  
  // Check for claims/losses - only for this product code
  const claims = placement.draftData?.claims || [];
  const relevantClaims = claims.filter((claim: any) => claim.claimType === placement.productCode);
  const hasClaimsHistory = placement.draftData?.hasClaimsHistory && relevantClaims.length > 0;
  
  // Check for pilots over 65 (pilotsUnder65 = false means there ARE pilots 65 or older)
  // Only relevant for LOL placements (not PA, Hull War, or Hull Deductible)
  const lolPilots = placement.draftData?.lolPilots || [];
  const hasPilotsOver65 = isLOL && lolPilots.some((pilot: any) => pilot.age && parseInt(pilot.age) > 65);
  
  const showRiskAlert = hasSpecialUses || hasExcludedCountries || hasClaimsHistory || hasPilotsOver65;

  // Build tabs array conditionally to avoid duplicates for Hull War/Hull Deductible
  const tabs = [
    { id: "insured", label: "Insured Details", icon: Building2 },
    // Hide Aircraft Details tab for LOL-only and 24-Hour PA
    ...(!isLOL && !is24HourPA ? [{ id: "aircraft" as const, label: placement.productCode === "UAS" ? "Drone Details" : "Aircraft Details", icon: Plane }] : []),
    // Only show Premium tab when placement has been quoted — positioned after Aircraft Details
    ...(placement.quotes && placement.quotes.length > 0 && ["quoted", "firmorder", "bound", "ntu"].includes(placement.status)
      ? [{ id: "premium" as const, label: "Premium", icon: DollarSign }]
      : []),
    // Only show Sub-Limits/Clauses tab if NOT PA, UAS, or LOL — rename for Hull War
    ...(!isPA && !isUAS && !isLOL && !isHullDeductible ? [{ id: "sublimits" as const, label: isHullWar ? "Spares Coverage" : "Sub-Limits/Clauses", icon: isHullWar ? Plane : FileCheck }] : []),
    // Only show Pilot Details tab if NOT Hull War, Hull Deductible, or UAS — rename for LOL
    ...(!isHullWar && !isHullDeductible && !isUAS ? [{ id: "pilots" as const, label: isLOL ? "Insured Person Details" : isPA ? "Coverage Details" : "Pilot Details", icon: Users }] : []),
    { id: "claims", label: "Claims History", icon: AlertTriangle },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  // Get facility reference - use the placement's facilityRef field
  const getFacilityRef = () => {
    return placement.facilityRef || "-";
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-7xl mx-auto">
        {/* Risk Alert Banner */}
        {showRiskAlert && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-50/40 px-5 py-2.5 mb-3 shadow-sm">
            <div className="flex items-center justify-center size-7 rounded-md bg-amber-100 border border-amber-200/60">
              <AlertTriangle className="size-3.5 text-amber-600" />
            </div>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 flex-1">
              <span className="text-amber-800 text-[11px] font-bold uppercase tracking-wider">Risk Alerts</span>
              <div className="w-px h-3.5 bg-amber-200/80" />
              {hasClaimsHistory && (
                <span className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500 ring-2 ring-red-500/20" />Claims History</span>
              )}
              {hasSpecialUses && (
                <span className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />Special Uses</span>
              )}
              {hasPilotsOver65 && (
                <span className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 ring-2 ring-orange-500/20" />Insured Persons Over 65</span>
              )}
              {hasExcludedCountries && (
                <span className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-600 ring-2 ring-red-600/20" />LSW617 Exclusions</span>
              )}
            </div>
          </div>
        )}

        {/* Header Card */}
        <div className="rounded-t-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
          {/* Top accent line */}
          <div className="h-[3px] bg-gradient-to-r from-[#004225] via-[#004225]/60 to-transparent" />

          {/* Nav bar */}
          <div className="flex items-center justify-between px-6 py-2.5">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-gray-400 hover:text-[#004225] text-xs font-medium transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Dashboard
            </button>
            <span className="text-sm font-bold uppercase tracking-widest text-gray-700">Placement Details</span>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                placement.status === "draft" ? "bg-gray-100 text-gray-500" :
                placement.status === "compliance" ? "bg-purple-50 text-purple-600 ring-1 ring-purple-200/60" :
                placement.status === "pending" ? "bg-amber-50 text-amber-600 ring-1 ring-amber-200/60" :
                placement.status === "quoted" ? "bg-[#004225]/5 text-[#004225] ring-1 ring-[#004225]/15" :
                placement.status === "firmorder" ? "bg-[#004225]/5 text-[#004225] ring-1 ring-[#004225]/15" :
                placement.status === "bound" ? "bg-[#004225]/10 text-[#004225] ring-1 ring-[#004225]/20" :
                placement.status === "declined" ? "bg-gray-100 text-gray-500 ring-1 ring-gray-200/60" :
                "bg-gray-100 text-gray-500 ring-1 ring-gray-200/60"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  placement.status === "compliance" ? "bg-purple-500" :
                  placement.status === "pending" ? "bg-amber-500" :
                  placement.status === "quoted" ? "bg-[#004225]" :
                  placement.status === "firmorder" ? "bg-[#004225]" :
                  placement.status === "bound" ? "bg-[#004225]" :
                  placement.status === "declined" ? "bg-gray-400" :
                  placement.status === "ntu" ? "bg-gray-400" :
                  "bg-gray-400"
                }`} />
                {placement.status === "firmorder" ? "FIRM ORDER" : placement.status === "ntu" ? "NTU" : placement.status.toUpperCase()}
              </div>
              {canEdit && (
                <Button
                  onClick={() => onEdit(placement.id)}
                  className="bg-[#004225] hover:bg-[#003319] text-white px-4 py-1.5 rounded font-semibold text-[11px] transition-colors"
                >
                  <Edit className="size-3 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Hero section */}
          <div className="px-6 pt-5 pb-5">
            {/* Insured name with left accent */}
            <div className="flex items-start gap-3 mb-5">
              <div className="w-1 h-8 rounded-full bg-[#004225] mt-0.5 shrink-0" />
              <h1 className="text-gray-900 text-[30px] font-extrabold tracking-tight leading-none">{placement.insuredName}</h1>
            </div>

            {/* UMR + Product row */}
            <div className="flex items-end gap-6 ml-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">UMR</div>
                <div className="text-lg font-bold font-mono text-gray-800 tracking-tight leading-none">{["draft","compliance","pending","quoted"].includes(placement.status) ? "Q" : ""}{placement.reference}</div>
              </div>
              <div className="w-px h-7 bg-gray-200/80" />
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Product</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-[#004225] tracking-tight leading-none">{placement.productCode}</span>
                  <span className="text-[13px] font-medium text-gray-400">{getProductName(placement.productCode)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key details strip */}
          <div className="border-t border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              <div className="px-6 py-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Coverage</div>
                <div className="text-sm font-semibold text-gray-800 capitalize">{placement.coverageType}</div>
              </div>
              <div className="px-6 py-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Inception</div>
                <div className="text-sm font-semibold text-gray-800 tabular-nums">
                  {placement.inceptionDate && !isNaN(new Date(placement.inceptionDate).getTime())
                    ? new Date(placement.inceptionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
                    : "TBA"}
                </div>
              </div>
              <div className="px-6 py-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Facility</div>
                <div className="text-sm font-semibold text-gray-800 font-mono">{getFacilityRef()}</div>
              </div>
              <div className="px-6 py-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Submitted</div>
                <div className="text-sm font-semibold text-gray-800 tabular-nums">
                  {new Date(placement.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COMPLIANCE BANNER ═══ */}
        {placement.status === "compliance" && placement.complianceData && userRole === "broker" && (
          <ComplianceBanner placement={placement} onRecheck={onComplianceRecheck} />
        )}

        {/* Tabs & Content */}
        <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-hidden shadow-sm">
          <div className="flex border-b border-gray-200 bg-white px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-150 ${
                    isActive
                      ? "text-[#004225]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Icon className={`size-3 ${isActive ? "text-[#004225]" : "text-gray-400"}`} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#004225] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === "insured" && <InsuredDetailsTab placement={placement} facilityRef={getFacilityRef()} />}
            {activeTab === "aircraft" && <AircraftDetailsTab placement={placement} />}
            {activeTab === "sublimits" && <SublimitsTab placement={placement} />}
            {activeTab === "pilots" && <PilotsDetailsTab placement={placement} />}
            {activeTab === "claims" && <ClaimsHistoryTab placement={placement} />}
            {activeTab === "documents" && <DocumentsTab placement={placement} currentUser={currentUser} onUpdatePlacement={onUpdatePlacement} lineslips={lineslips} contacts={contacts} />}
            {activeTab === "premium" && <PremiumTab placement={placement} />}
          </div>
        </div>

        {/* Floating Action Button + Slide-out Panel */}
        {(() => {
          // Facility-based access control for underwriters
          // Check if the current underwriter's company is the Lead on the facility for this placement
          const isLeadUnderwriter = (() => {
            if (userRole !== "underwriter" || !currentUser?.company) return false;
            const companyLower = currentUser.company.toLowerCase().trim();
            const matchingLineslip = lineslips.find(ls => ls.reference === placement.facilityRef);
            if (!matchingLineslip) return false;
            return matchingLineslip.underwriters.some(u => 
              u.role === "Lead" && u.name.toLowerCase().trim() === companyLower
            );
          })();

          // Determine if there's an actionable state for this role
          // Underwriters can only act if they are the Lead on the facility
          const isUnderwriterActionable = userRole === "underwriter" && isLeadUnderwriter && ["pending", "quoted", "firmorder", "bound", "declined"].includes(placement.status);
          const isBrokerActionable = userRole === "broker" && placement.status === "quoted" && placement.quotes && placement.quotes.length > 0;
          const showFab = isUnderwriterActionable || isBrokerActionable;

          if (!showFab) return null;

          // FAB styling based on status
          const fabConfig: Record<string, { bg: string; pulse: string; icon: JSX.Element; label: string }> = {
            pending: { bg: "bg-[#004225] hover:bg-[#003319]", pulse: "bg-[#004225]/40", icon: <Send className="size-5" />, label: "Review" },
            quoted: { bg: "bg-[#004225] hover:bg-[#003319]", pulse: "bg-[#004225]/40", icon: <FileText className="size-5" />, label: "Quote" },
            firmorder: { bg: "bg-[#004225] hover:bg-[#003319]", pulse: "bg-[#004225]/40", icon: <Lock className="size-5" />, label: "Bind" },
            bound: { bg: "bg-[#004225] hover:bg-[#003319]", pulse: "", icon: <CheckCircle2 className="size-5" />, label: "Bound" },
            declined: { bg: "bg-gray-700 hover:bg-gray-800", pulse: "", icon: <XCircle className="size-5" />, label: "Declined" },
          };
          const brokerFab = { bg: "bg-[#004225] hover:bg-[#003319]", pulse: "bg-[#004225]/40", icon: <FileCheck className="size-5" />, label: "Quote" };
          const fab = isBrokerActionable ? brokerFab : (fabConfig[placement.status] || fabConfig.pending);
          const needsAttention = placement.status === "pending" || placement.status === "firmorder" || isBrokerActionable;

          return (
            <>
              {/* Side-edge Tab Button - fixed to right edge */}
              {!showActionPanel && (
                <button
                  onClick={() => setShowActionPanel(true)}
                  className={`fixed right-0 top-1/3 z-40 flex items-center gap-2 px-2.5 py-4 ${fab.bg.split(' ')[0]} text-white rounded-l-xl shadow-lg transition-all duration-200 hover:shadow-xl`}
                  style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                >
                  {needsAttention && (
                    <span className="absolute -left-1 top-2 w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse border-2 border-white" />
                  )}
                  <span className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                    {fab.icon}
                    {userRole === "underwriter" ? "Underwriter Actions" : "Broker Actions"}
                  </span>
                </button>
              )}

              {/* Backdrop */}
              {showActionPanel && (
                <div
                  className="fixed inset-0 bg-black/20 z-40 transition-opacity"
                  onClick={() => {
                    setShowActionPanel(false);
                    setShowQuoteForm(false);
                    setShowDeclineConfirm(false);
                    setShowBrokerDeclineReasons(false);
                    setShowBindConfirm(false);
                  }}
                />
              )}

              {/* Slide-out Panel */}
              <div className={`fixed right-0 top-0 h-full w-[680px] bg-white shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col ${showActionPanel ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Panel Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 bg-[#004225] rounded-full" />
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          {userRole === "underwriter" ? "Underwriter Actions" : "Broker Actions"}
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">
                          {placement.insuredName} — {placement.productCode} — {["draft","compliance","pending","quoted"].includes(placement.status) ? "Q" : ""}{placement.reference}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowActionPanel(false);
                        setShowQuoteForm(false);
                        setShowDeclineConfirm(false);
                        setShowBrokerDeclineReasons(false);
                        setShowBindConfirm(false);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                    >
                      <XCircle className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="px-6 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${
                      placement.status === "pending" ? "bg-amber-500" :
                      placement.status === "quoted" ? "bg-[#004225]" :
                      placement.status === "firmorder" ? "bg-[#004225]" :
                      placement.status === "bound" ? "bg-[#004225]" :
                      "bg-gray-500"
                    }`} />
                    <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                      {placement.status === "firmorder" ? "FIRM ORDER" : placement.status.toUpperCase()}
                    </span>
                    <span className="text-gray-300 text-xs">•</span>
                    <span className="text-gray-500 text-[10px]">
                      {placement.status === "pending" && userRole === "underwriter" && "Awaiting your review"}
                      {placement.status === "quoted" && userRole === "underwriter" && "Awaiting broker's firm order"}
                      {placement.status === "quoted" && userRole === "broker" && "Review and accept quotation"}
                      {placement.status === "firmorder" && "Ready to bind"}
                      {placement.status === "bound" && "Completed"}
                      {placement.status === "declined" && "No action required"}
                    </span>
                  </div>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* UNDERWRITER: PENDING */}
                  {userRole === "underwriter" && placement.status === "pending" && (
                    <>
                      {!showQuoteForm && !showDeclineConfirm && (
                        <div className="space-y-3">
                          <button
                            onClick={() => setShowQuoteForm(true)}
                            className="w-full flex items-center gap-3 px-5 py-4 bg-[#004225] hover:bg-[#003319] text-white rounded-xl transition-colors group"
                          >
                            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
                              <Send className="size-5" />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-sm">Submit Quote</div>
                              <div className="text-white/60 text-xs">Provide premium and terms</div>
                            </div>
                          </button>
                          <button
                            onClick={() => setShowDeclineConfirm(true)}
                            className="w-full flex items-center gap-3 px-5 py-4 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl transition-colors"
                          >
                            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                              <Ban className="size-5" />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-sm">Decline</div>
                              <div className="text-red-400 text-xs">Reject this placement</div>
                            </div>
                          </button>
                        </div>
                      )}

                      {showQuoteForm && (() => {
                        const resetQuoteForm = () => {
                          setShowQuoteForm(false);
                          setQuoteTerms("");
                          setQuoteWrittenLine("100");
                          setQuoteEndorsements("");
                          setQuoteHullRates({});
                          setQuoteLiabilityPremiums({});
                          setQuoteSparesPremium("");
                          setQuoteSparesRate("");
                          setQuoteSparesIncludedInHull(false);
                          setQuotePphPremium("");
                          setQuoteConfiscationIncluded(true);
                          setQuoteLolPremium("");
                          setQuoteLolRateMode("flat");
                          setQuoteLolFlatRate("");
                          setQuoteLolAgeBandRates({});
                          setQuoteLolPersonRates({});
                        };

                        if (isLOL) {
                          return (
                            <LolQuoteForm
                              placement={placement}
                              currentUser={currentUser}
                              quoteEndorsements={quoteEndorsements}
                              quoteTerms={quoteTerms}
                              quoteLolRateMode={quoteLolRateMode}
                              setQuoteLolRateMode={setQuoteLolRateMode}
                              quoteLolFlatRate={quoteLolFlatRate}
                              setQuoteLolFlatRate={setQuoteLolFlatRate}
                              quoteLolAgeBandRates={quoteLolAgeBandRates}
                              setQuoteLolAgeBandRates={setQuoteLolAgeBandRates}
                              quoteLolPersonRates={quoteLolPersonRates}
                              setQuoteLolPersonRates={setQuoteLolPersonRates}
                              setPendingQuoteData={setPendingQuoteData}
                              setShowQuoteConfirm={setShowQuoteConfirm}
                              resetQuoteForm={resetQuoteForm}
                            />
                          );
                        }
                        return (
                          <StandardQuoteForm
                            placement={placement}
                            currentUser={currentUser}
                            isHullWar={isHullWar}
                            isDrone={isDrone}
                            quoteHullRates={quoteHullRates}
                            setQuoteHullRates={setQuoteHullRates}
                            quoteLiabilityPremiums={quoteLiabilityPremiums}
                            setQuoteLiabilityPremiums={setQuoteLiabilityPremiums}
                            quoteSparesRate={quoteSparesRate}
                            setQuoteSparesRate={setQuoteSparesRate}
                            quoteSparesIncludedInHull={quoteSparesIncludedInHull}
                            setQuoteSparesIncludedInHull={setQuoteSparesIncludedInHull}
                            quotePphPremium={quotePphPremium}
                            setQuotePphPremium={setQuotePphPremium}
                            quoteConfiscationIncluded={quoteConfiscationIncluded}
                            setQuoteConfiscationIncluded={setQuoteConfiscationIncluded}
                            quoteEndorsements={quoteEndorsements}
                            quoteTerms={quoteTerms}
                            setPendingQuoteData={setPendingQuoteData}
                            setShowQuoteConfirm={setShowQuoteConfirm}
                            resetQuoteForm={resetQuoteForm}
                          />
                        );
                      })()}
                      {showDeclineConfirm && (
                        <div className="space-y-4">
                          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                              <Ban className="size-5 text-red-600" />
                              <h4 className="text-red-900 font-semibold text-sm">Decline Placement</h4>
                            </div>
                            <p className="text-red-700 text-sm mb-4">
                              Please select a reason for declining this placement.
                            </p>

                            {/* Decline Reason Selection */}
                            <div className="space-y-2 mb-4">
                              {[
                                { value: "Current Market", label: "Current Market" },
                                { value: "Committed", label: "Committed" },
                                { value: "Out of Appetite", label: "Out of Appetite" },
                                { value: "Seen and Declined Elsewhere", label: "Seen and Declined Elsewhere" },
                                { value: "Broker asked to Decline", label: "Broker asked to Decline" },
                                { value: "Other", label: "Other" },
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    setDeclineReason(option.value);
                                    if (option.value !== "Other") setDeclineReasonDetail("");
                                  }}
                                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                    declineReason === option.value
                                      ? "border-red-400 bg-red-100 text-red-800"
                                      : "border-red-200 bg-white text-gray-700 hover:bg-red-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                      declineReason === option.value ? "border-red-500" : "border-gray-300"
                                    }`}>
                                      {declineReason === option.value && (
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                      )}
                                    </div>
                                    {option.label}
                                  </div>
                                </button>
                              ))}
                            </div>

                            {/* Other reason text input */}
                            {declineReason === "Other" && (
                              <div className="mb-4">
                                <label className="block text-red-800 text-[11px] font-semibold mb-1.5 uppercase tracking-wider">Reason</label>
                                <textarea
                                  value={declineReasonDetail}
                                  onChange={(e) => setDeclineReasonDetail(e.target.value)}
                                  placeholder="Please provide a reason for declining..."
                                  rows={3}
                                  className="w-full px-3 py-2.5 rounded-lg border border-red-300 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-200 outline-none resize-none bg-white"
                                  autoFocus
                                />
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setShowDeclineFinalConfirm(true);
                                }}
                                disabled={!declineReason || (declineReason === "Other" && !declineReasonDetail.trim())}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Decline Placement
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowDeclineConfirm(false);
                                  setDeclineReason("");
                                  setDeclineReasonDetail("");
                                }}
                                variant="outline"
                                className="px-5 py-2.5 rounded-lg"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* UNDERWRITER: QUOTED */}
                  {userRole === "underwriter" && placement.status === "quoted" && placement.quotes && placement.quotes.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 py-4">
                        <Clock className="size-5 text-[#004225]" />
                        <span className="text-base font-semibold text-gray-700">Waiting for broker to accept quotation</span>
                      </div>
                      {false && placement.quotes?.map((quote) => {
                        const qcs: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };
                        const qsym = qcs[quote.currency] || "$";
                        const qFleet: any[] = placement.draftData?.fleet || [];
                        return (
                        <div key={quote.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-700 text-xs font-bold">{quote.id}</span>
                            <span className="text-gray-500 text-xs">{new Date(quote.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-gray-900 text-lg font-bold">{qsym}{quote.premium.toLocaleString()}</div>
                            <span className="text-blue-600 text-xs font-semibold">{quote.currency || "USD"}</span>
                          </div>
                          {/* Pricing breakdown */}
                          <div className="space-y-1 text-xs">
                            {quote.hullRates && quote.hullRates.length > 0 && (
                              <div className="space-y-0.5">
                                {quote.hullRates.map((hr) => {
                                  const aircraft = qFleet.find((a: any) => a.registration?.toUpperCase() === hr.registration?.toUpperCase());
                                  return (
                                  <div key={hr.registration} className="flex justify-between text-gray-600">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-900">{hr.registration}</span>
                                      {aircraft && <span className="text-[10px] text-gray-500">{aircraft.make} {aircraft.model}</span>}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-gray-400 text-[10px]">{hr.rate}%</div>
                                      <div className="font-medium">{qsym}{hr.hullPremium.toLocaleString()}</div>
                                    </div>
                                  </div>
                                  );
                                })}
                                <div className="flex justify-between font-medium text-gray-700 pt-0.5 border-t border-blue-200">
                                  <span>{isHullWar ? "Hull War" : "Hull"} Total</span>
                                  <span>{qsym}{quote.hullPremiumTotal?.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                            {!isHullWar && (quote.liabilityRates && quote.liabilityRates.length > 0 ? (
                              <div className="space-y-0.5">
                                {quote.liabilityRates.map((lr) => {
                                  const aircraft = qFleet.find((a: any) => a.registration?.toUpperCase() === lr.registration?.toUpperCase());
                                  return (
                                  <div key={lr.registration} className="flex justify-between text-gray-600">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-900">{lr.registration}</span>
                                      <span className="text-[10px] text-gray-500">
                                        {lr.liabilityType} {qsym}{lr.liabilityLimit?.toLocaleString()}
                                        {aircraft && ` · ${aircraft.make} ${aircraft.model}`}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">{qsym}{lr.premium.toLocaleString()}</div>
                                    </div>
                                  </div>
                                  );
                                })}
                                <div className="flex justify-between font-medium text-gray-700 pt-0.5 border-t border-blue-200">
                                  <span>Liability Total</span>
                                  <span>{qsym}{quote.liabilityPremium?.toLocaleString()}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between text-gray-600">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900">Liability</span>
                                  {qFleet.length > 0 && qFleet.map((qAc: any, qIdx: number) => {
                                    const acLiabType = qAc.liabilityType || "CSL";
                                    const acLiabCurrency = qAc.liabilityLimitCurrency || "USD";
                                    const acLiabLimit = qAc.liabilityLimit ? String(qAc.liabilityLimit).replace(/,/g, "") : "";
                                    const acLiabLimitNum = parseFloat(acLiabLimit) || 0;
                                    return acLiabLimitNum > 0 ? (
                                      <span key={qAc.registration || qIdx} className="text-[10px] text-gray-500">
                                        {(qAc.registration || "").toUpperCase()} — {acLiabType} {qcs[acLiabCurrency] || "$"}{acLiabLimitNum.toLocaleString()}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                                <span className="font-medium">{qsym}{quote.liabilityPremium?.toLocaleString()}</span>
                              </div>
                            ))}
                            {(quote.sparesPremium != null || quote.sparesIncludedInHull) && (
                              <div className="flex justify-between text-gray-600">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900">Spares</span>
                                  {quote.sparesIncludedInHull ? (
                                    <span className="text-[10px] text-gray-500">Included in {isHullWar ? "Hull War" : "Hull"}</span>
                                  ) : quote.sparesRate != null && (
                                    <span className="text-[10px] text-gray-500">{quote.sparesRate}% rate</span>
                                  )}
                                </div>
                                <span className="font-medium">{quote.sparesIncludedInHull ? `Included in ${isHullWar ? "Hull War" : "Hull"} Rate` : `${qsym}${quote.sparesPremium?.toLocaleString() || "0"}`}</span>
                              </div>
                            )}
                            {quote.pphPremium != null && quote.pphPremium > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>Products, Premises & Hangarkeepers</span>
                                <span>{qsym}{quote.pphPremium.toLocaleString()}</span>
                              </div>
                            )}
                            {/* Total & Order Premium */}
                            <div className="border-t border-blue-200 pt-1 mt-1 space-y-0.5">
                              <div className="flex justify-between">
                                <span className="font-bold text-gray-900 uppercase">Total Premium</span>
                                <span className="font-bold text-gray-900">{qsym}{quote.premium.toLocaleString()}</span>
                              </div>
                              {(() => {
                                const ohpQ = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
                                const orderPremQ = Math.round(quote.premium * ohpQ / 100);
                                return (
                                  <div className="flex justify-between">
                                    <span className="font-bold text-[#004225] uppercase">Order Premium ({ohpQ}%)</span>
                                    <span className="font-bold text-[#004225]">{qsym}{orderPremQ.toLocaleString()}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          {quote.quoteValidUntil && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className="size-3" />
                              <span>Valid until <span className="font-medium text-gray-700">{new Date(quote.quoteValidUntil).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span></span>
                            </div>
                          )}
                          {quote.endorsements && (
                            <div>
                              <div className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Endorsements</div>
                              <div className="text-gray-700 text-sm whitespace-pre-line">{quote.endorsements}</div>
                            </div>
                          )}
                          {quote.terms && quote.terms !== "Standard terms" && (
                            <div>
                              <div className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Terms & Conditions</div>
                              <div className="text-gray-700 text-sm whitespace-pre-line">{quote.terms}</div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                      
                    </div>
                  )}

                  {/* UNDERWRITER: FIRM ORDER */}
                  {userRole === "underwriter" && placement.status === "firmorder" && (
                    <>
                      {!showBindConfirm ? (
                        <div className="space-y-3">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="size-4 text-green-600" />
                              <span className="text-green-900 text-sm font-semibold">Firm Order Received</span>
                            </div>
                            <p className="text-green-700 text-xs">The broker has submitted a firm order. You can now bind this placement.</p>
                          </div>

                          {/* Inception / Expiry Dates */}
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Inception</span>
                              <span className="font-semibold text-gray-900">
                                {(placement.draftData?.inceptionDate || placement.inceptionDate)
                                  ? new Date((placement.draftData?.inceptionDate || placement.inceptionDate) + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
                                  : "TBA"}
                                {placement.draftData?.bothDatesIncluded === false && placement.draftData?.inceptionTime && ` at ${placement.draftData.inceptionTime}`}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Expiry</span>
                              <span className="font-semibold text-gray-900">
                                {placement.draftData?.expiryDate
                                  ? new Date(placement.draftData.expiryDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
                                  : "TBA"}
                                {placement.draftData?.bothDatesIncluded === false && placement.draftData?.expiryTime && ` at ${placement.draftData.expiryTime}`}
                              </span>
                            </div>
                            {placement.draftData?.bothDatesIncluded === false && placement.draftData?.timeZoneOption && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Time Zone</span>
                                <span className="font-medium text-gray-900">
                                  {placement.draftData.timeZoneOption === "original-insured" ? "Original Insured" : placement.draftData.timeZoneOption === "cedent" ? "Cedent" : "GMT"}
                                </span>
                              </div>
                            )}
                            {(placement.draftData?.bothDatesIncluded !== false) && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Period</span>
                                <span className="font-medium text-gray-900">Both days included</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => setShowBindConfirm(true)}
                            className="w-full flex items-center gap-3 px-5 py-4 bg-[#004225] hover:bg-[#003319] text-white rounded-xl transition-colors"
                          >
                            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
                              <Lock className="size-5" />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-sm">Confirm Firm Order and Bind</div>
                              <div className="text-white/60 text-xs">Finalize and bind this risk</div>
                            </div>
                          </button>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                          <div className="flex items-center gap-2.5 mb-3">
                            <Lock className="size-5 text-green-700" />
                            <h4 className="text-green-900 font-semibold text-sm">Confirm Bind</h4>
                          </div>
                          <p className="text-green-700 text-sm mb-4">
                            Binding this placement is final. Are you sure you want to proceed?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                // Store who bound this placement
                                const boundName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Unknown";
                                const boundCompany = currentUser?.company || "";
                                const updatedPlacement = { ...placement, status: "bound" as const, boundByName: boundName, boundByCompany: boundCompany, boundDate: new Date().toISOString().split("T")[0] };
                                onUpdatePlacement?.(updatedPlacement);
                                // Generate bound documents and send BOUND notification with attachments (fire and forget)
                                const selectedLineslipId = placement.draftData?.selectedLineslips?.[placement.productCode];
                                const placementLineslip = lineslips.find(l => l.id === selectedLineslipId);
                                const bindingSlip = generateBindingSlipBase64(updatedPlacement, placementLineslip);
                                const eocLetter = generateEOCBase64(updatedPlacement, placementLineslip, currentUser);
                                const claimsDoc = generateClaimsBase64(updatedPlacement, placementLineslip);
                                notifyBound(placement, contacts, boundName, boundCompany, { bindingSlip, eocLetter, claimsDoc });
                                setShowBindConfirm(false);
                                setShowActionPanel(false);
                              }}
                              className="flex-1 bg-[#004225] hover:bg-[#003319] text-white font-semibold py-2.5 rounded-lg"
                            >
                              Confirm Bind
                            </Button>
                            <Button
                              onClick={() => setShowBindConfirm(false)}
                              variant="outline"
                              className="px-5 py-2.5 rounded-lg"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* UNDERWRITER: BOUND */}
                  {userRole === "underwriter" && placement.status === "bound" && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
                      <CheckCircle2 className="size-6 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-green-900 font-semibold text-sm">Placement Bound</p>
                        <p className="text-green-700 text-xs mt-1">This placement has been successfully bound. No further action required.</p>
                      </div>
                    </div>
                  )}

                  {/* UNDERWRITER: DECLINED */}
                  {userRole === "underwriter" && placement.status === "declined" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <XCircle className="size-6 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-red-900 font-semibold text-sm">Placement Declined</p>
                          <p className="text-red-700 text-xs mt-1">This placement was declined.</p>
                        </div>
                      </div>
                      {placement.declineReason && (
                        <div className="border-t border-red-200 pt-3">
                          <div className="text-red-800 text-[10px] font-semibold uppercase tracking-wider mb-1">Reason</div>
                          <div className="text-red-900 text-sm font-medium">{placement.declineReason}</div>
                          {placement.declineReasonDetail && (
                            <div className="text-red-700 text-sm mt-1">{placement.declineReasonDetail}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BROKER: QUOTED - Firm Order */}
                  {userRole === "broker" && placement.status === "quoted" && placement.quotes && placement.quotes.length > 0 && (
                    <div className="space-y-3">
                      {/* Confirm Inception Dates */}
                      <div className={`border rounded-xl p-4 space-y-3 ${
                        datesFullyConfirmed
                          ? "bg-emerald-50/50 border-emerald-200"
                          : "bg-amber-50/50 border-amber-200"
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Clock className={`size-4 ${datesFullyConfirmed ? "text-[#004225]" : "text-amber-600"}`} />
                            <h4 className="text-sm font-semibold text-gray-900">Confirm Inception Dates</h4>
                          </div>
                          {datesFullyConfirmed ? (
                            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="size-3" />
                              <span>Confirmed</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Required
                            </div>
                          )}
                        </div>
                        {datesCarriedOver && brokerInceptionDate && (
                          <div className="text-[10px] text-gray-500 -mt-1">Carried over from submission — edit if needed</div>
                        )}
                        {!datesCarriedOver && !brokerInceptionDate && (
                          <div className="text-[10px] text-amber-600 -mt-1">Inception was TBA — please select dates to proceed</div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Inception</label>
                            <input
                              type="date"
                              value={brokerInceptionDate}
                              min={minInceptionDate}
                              onChange={(e) => handleBrokerInceptionChange(e.target.value)}
                              className={`w-full h-10 px-3 text-sm font-semibold text-gray-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                                inceptionBackdatedTooFar
                                  ? "border-red-400 focus:ring-red-300/30 focus:border-red-500"
                                  : "border-gray-300 focus:ring-[#004225]/30 focus:border-[#004225]"
                              }`}
                            />
                            {inceptionBackdatedTooFar && (
                              <p className="text-[10px] text-red-600 mt-1">Cannot backdate more than 3 days from today</p>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Expiry</label>
                            <input
                              type="date"
                              value={brokerExpiryDate}
                              onChange={(e) => handleBrokerExpiryChange(e.target.value)}
                              className="w-full h-10 px-3 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/30 focus:border-[#004225]"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={brokerBothDaysIncluded}
                            onChange={(e) => handleBrokerBothDaysToggle(e.target.checked)}
                            className="size-3.5 rounded border-gray-300 text-[#004225] focus:ring-[#004225]/30 accent-[#004225]"
                          />
                          <span className="text-[11px] text-gray-600">Both days included</span>
                        </label>
                        {/* Time & Timezone fields — shown when "Both days included" is NOT ticked */}
                        {!brokerBothDaysIncluded && (
                          <div className="space-y-3 pt-2 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Inception Time</label>
                                <input
                                  type="time"
                                  value={brokerInceptionTime}
                                  onChange={(e) => handleBrokerInceptionTimeChange(e.target.value)}
                                  className="w-full h-10 px-3 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/30 focus:border-[#004225]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Expiry Time</label>
                                <input
                                  type="time"
                                  value={brokerExpiryTime}
                                  onChange={(e) => handleBrokerExpiryTimeChange(e.target.value)}
                                  className="w-full h-10 px-3 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/30 focus:border-[#004225]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Time Zone</label>
                              <select
                                value={brokerTimeZoneOption}
                                onChange={(e) => handleBrokerTimeZoneChange(e.target.value)}
                                className="w-full h-10 px-3 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/30 focus:border-[#004225] appearance-none"
                              >
                                <option value="original-insured">Time at the Original Insured</option>
                                <option value="cedent">Times at the Cedent</option>
                                <option value="gmt">GMT</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                      {false && <div className="flex items-center gap-2 mb-1">
                        <FileCheck className="size-4 text-blue-600" />
                        <h4 className="text-sm font-semibold text-gray-900">Quote Received</h4>
                      </div>}
                      {false && placement.quotes?.map((quote) => {
                        const qcs2: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };
                        const qsym2 = qcs2[quote.currency] || "$";
                        const qFleet2: any[] = placement.draftData?.fleet || [];
                        return (
                        <div key={quote.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-900 text-xs font-semibold">{quote.underwriterName}</span>
                            <span className="text-gray-500 text-xs">{new Date(quote.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-gray-900 text-lg font-bold">{qsym2}{quote.premium.toLocaleString()}</div>
                            <span className="text-blue-600 text-xs font-semibold">{quote.currency || "USD"}</span>

                          </div>
                          {/* Pricing breakdown */}
                          <div className="space-y-1 text-xs">
                            {quote.hullRates && quote.hullRates.length > 0 && (
                              <div className="space-y-0.5">
                                {quote.hullRates.map((hr) => {
                                  const aircraft = qFleet2.find((a: any) => a.registration?.toUpperCase() === hr.registration?.toUpperCase());
                                  return (
                                  <div key={hr.registration} className="flex justify-between text-gray-600">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-900">{hr.registration}</span>
                                      {aircraft && <span className="text-[10px] text-gray-500">{aircraft.make} {aircraft.model}</span>}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-gray-400 text-[10px]">{hr.rate}%</div>
                                      <div className="font-medium">{qsym2}{hr.hullPremium.toLocaleString()}</div>
                                    </div>
                                  </div>
                                  );
                                })}
                                <div className="flex justify-between font-medium text-gray-700 pt-0.5 border-t border-blue-200">
                                  <span>{isHullWar ? "Hull War" : "Hull"} Total</span>
                                  <span>{qsym2}{quote.hullPremiumTotal?.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                            {!isHullWar && (quote.liabilityRates && quote.liabilityRates.length > 0 ? (
                              <div className="space-y-0.5">
                                {quote.liabilityRates.map((lr) => {
                                  const aircraft = qFleet2.find((a: any) => a.registration?.toUpperCase() === lr.registration?.toUpperCase());
                                  return (
                                  <div key={lr.registration} className="flex justify-between text-gray-600">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-900">{lr.registration}</span>
                                      <span className="text-[10px] text-gray-500">
                                        {lr.liabilityType} {qsym2}{lr.liabilityLimit?.toLocaleString()}
                                        {aircraft && ` · ${aircraft.make} ${aircraft.model}`}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">{qsym2}{lr.premium.toLocaleString()}</div>
                                    </div>
                                  </div>
                                  );
                                })}
                                <div className="flex justify-between font-medium text-gray-700 pt-0.5 border-t border-blue-200">
                                  <span>Liability Total</span>
                                  <span>{qsym2}{quote.liabilityPremium?.toLocaleString()}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between text-gray-600">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900">Liability</span>
                                  {qFleet2.length > 0 && qFleet2.map((qAc2: any, qIdx2: number) => {
                                    const acLiabType2 = qAc2.liabilityType || "CSL";
                                    const acLiabCurrency2 = qAc2.liabilityLimitCurrency || "USD";
                                    const acLiabLimit2 = qAc2.liabilityLimit ? String(qAc2.liabilityLimit).replace(/,/g, "") : "";
                                    const acLiabLimitNum2 = parseFloat(acLiabLimit2) || 0;
                                    return acLiabLimitNum2 > 0 ? (
                                      <span key={qAc2.registration || qIdx2} className="text-[10px] text-gray-500">
                                        {(qAc2.registration || "").toUpperCase()} — {acLiabType2} {qcs2[acLiabCurrency2] || "$"}{acLiabLimitNum2.toLocaleString()}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                                <span className="font-medium">{qsym2}{quote.liabilityPremium?.toLocaleString()}</span>
                              </div>
                            ))}
                            {(quote.sparesPremium != null || quote.sparesIncludedInHull) && (
                              <div className="flex justify-between text-gray-600">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900">Spares</span>
                                  {quote.sparesIncludedInHull ? (
                                    <span className="text-[10px] text-gray-500">Included in {isHullWar ? "Hull War" : "Hull"}</span>
                                  ) : quote.sparesRate != null && (
                                    <span className="text-[10px] text-gray-500">{quote.sparesRate}% rate</span>
                                  )}
                                </div>
                                <span className="font-medium">{quote.sparesIncludedInHull ? `Included in ${isHullWar ? "Hull War" : "Hull"} Rate` : `${qsym2}${quote.sparesPremium?.toLocaleString() || "0"}`}</span>
                              </div>
                            )}
                            {quote.pphPremium != null && quote.pphPremium > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>Products, Premises & Hangarkeepers</span>
                                <span>{qsym2}{quote.pphPremium.toLocaleString()}</span>
                              </div>
                            )}
                            {/* Total & Order Premium */}
                            <div className="border-t border-blue-200 pt-1 mt-1 space-y-0.5">
                              <div className="flex justify-between">
                                <span className="font-bold text-gray-900 uppercase">Total Premium</span>
                                <span className="font-bold text-gray-900">{qsym2}{quote.premium.toLocaleString()}</span>
                              </div>
                              {(() => {
                                const ohpQ2 = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
                                const orderPremQ2 = Math.round(quote.premium * ohpQ2 / 100);
                                return (
                                  <div className="flex justify-between">
                                    <span className="font-bold text-[#004225] uppercase">Order Premium ({ohpQ2}%)</span>
                                    <span className="font-bold text-[#004225]">{qsym2}{orderPremQ2.toLocaleString()}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          {quote.endorsements && (
                            <div>
                              <div className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Endorsements</div>
                              <div className="text-gray-700 text-sm whitespace-pre-line">{quote.endorsements}</div>
                            </div>
                          )}
                          {quote.terms && quote.terms !== "Standard terms" && (
                            <div>
                              <div className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Terms & Conditions</div>
                              <div className="text-gray-700 text-sm whitespace-pre-line">{quote.terms}</div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                      <button
                        onClick={() => {
                          if (!datesFullyConfirmed) return;
                          setShowAcceptConfirm(true);
                        }}
                        disabled={!datesFullyConfirmed}
                        className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl transition-colors ${
                          datesFullyConfirmed
                            ? "bg-[#004225] hover:bg-[#00331c] text-white cursor-pointer"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          datesFullyConfirmed ? "bg-white/15" : "bg-gray-300/50"
                        }`}>
                          <Send className="size-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm">Accept Quotation</div>
                          <div className={`text-xs ${
                            datesFullyConfirmed ? "text-white/60" : "text-gray-400"
                          }`}>
                            {datesFullyConfirmed
                              ? "Accept quote and proceed to bind"
                              : "Confirm inception dates to proceed"}
                          </div>
                        </div>
                      </button>
                      {!showBrokerDeclineReasons ? (
                        <button
                          onClick={() => setShowBrokerDeclineReasons(true)}
                          className="w-full flex items-center gap-3 px-5 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
                            <XCircle className="size-5" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-sm">Decline</div>
                            <div className="text-white/60 text-xs">Decline this quote</div>
                          </div>
                        </button>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
                          <div className="flex items-center gap-2.5">
                            <Ban className="size-5 text-red-600" />
                            <h4 className="text-red-900 font-semibold text-sm">Decline Quote</h4>
                          </div>
                          <p className="text-red-700 text-sm">
                            Please select a reason for declining this quote.
                          </p>

                          <div className="space-y-2">
                            {[
                              { value: "Too Expensive", label: "Too Expensive" },
                              { value: "Not Taken Up", label: "Not Taken Up" },
                              { value: "Other", label: "Other" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => {
                                  setDeclineReason(option.value);
                                  if (option.value !== "Other") setDeclineReasonDetail("");
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                  declineReason === option.value
                                    ? "border-red-400 bg-red-100 text-red-800"
                                    : "border-red-200 bg-white text-gray-700 hover:bg-red-50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    declineReason === option.value ? "border-red-500" : "border-gray-300"
                                  }`}>
                                    {declineReason === option.value && (
                                      <div className="w-2 h-2 rounded-full bg-red-500" />
                                    )}
                                  </div>
                                  {option.label}
                                </div>
                              </button>
                            ))}
                          </div>

                          {declineReason === "Other" && (
                            <div>
                              <label className="block text-red-800 text-[11px] font-semibold mb-1.5 uppercase tracking-wider">Reason</label>
                              <textarea
                                value={declineReasonDetail}
                                onChange={(e) => setDeclineReasonDetail(e.target.value)}
                                placeholder="Please provide a reason for declining..."
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 resize-none"
                              />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              onClick={() => setShowDeclineFinalConfirm(true)}
                              disabled={!declineReason || (declineReason === "Other" && !declineReasonDetail.trim())}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Decline Quote
                            </Button>
                            <Button
                              onClick={() => {
                                setShowBrokerDeclineReasons(false);
                                setDeclineReason("");
                                setDeclineReasonDetail("");
                              }}
                              variant="outline"
                              className="px-5 py-2.5 rounded-lg"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </div>
      {/* Decline Confirmation Modal */}
      {showDeclineFinalConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeclineFinalConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] p-6 space-y-4 mx-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Ban className="size-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Confirm Decline</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Insured</span>
                <span className="font-semibold text-gray-900">{placement.insuredName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reason</span>
                <span className="font-semibold text-red-700">{declineReason}</span>
              </div>
              {declineReason === "Other" && declineReasonDetail && (
                <div className="pt-1 border-t border-red-200">
                  <span className="text-gray-500 text-xs">Detail</span>
                  <p className="text-sm text-gray-800 mt-0.5">{declineReasonDetail}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {userRole === "broker"
                ? "Are you sure you want to decline this quote? The underwriter will be notified of your decision."
                : "Are you sure you want to decline this placement? The broker will be notified of your decision."}
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => {
                  onDecline?.(placement.id, declineReason, declineReasonDetail || undefined);
                  setShowDeclineFinalConfirm(false);
                  setShowDeclineConfirm(false);
                  setShowBrokerDeclineReasons(false);
                  setShowActionPanel(false);
                  setDeclineReason("");
                  setDeclineReasonDetail("");
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
              >
                <Ban className="size-4" />
                Confirm Decline
              </Button>
              <Button
                onClick={() => setShowDeclineFinalConfirm(false)}
                variant="outline"
                className="px-5 py-2.5 rounded-lg"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Quotation Confirmation Modal */}
      {showAcceptConfirm && (() => {
        const latestQuote = placement.quotes?.[placement.quotes.length - 1];
        const qcs: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };
        const qsym = latestQuote ? (qcs[latestQuote.currency] || "$") : "$";
        const ohp = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
        const orderPrem = latestQuote ? Math.round(latestQuote.premium * ohp / 100) : 0;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAcceptConfirm(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] p-6 space-y-4 mx-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#004225]/10 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-[#004225]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Accept Quotation</h3>
                  <p className="text-xs text-gray-500">Confirm acceptance and proceed to bind</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Insured</span>
                  <span className="font-semibold text-gray-900">{placement.insuredName}</span>
                </div>
                {latestQuote && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Premium</span>
                      <span className="font-bold text-[#004225]">{qsym}{latestQuote.premium.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Order Premium ({ohp}%)</span>
                      <span className="font-bold text-[#004225]/70">{qsym}{orderPrem.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Currency</span>
                      <span className="font-semibold text-blue-600">{latestQuote.currency || "USD"}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Inception</span>
                  <span className="font-medium text-gray-900">
                    {brokerInceptionDate ? new Date(brokerInceptionDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : "—"}
                    {!brokerBothDaysIncluded && brokerInceptionTime && ` at ${brokerInceptionTime}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expiry</span>
                  <span className="font-medium text-gray-900">
                    {brokerExpiryDate ? new Date(brokerExpiryDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : "—"}
                    {!brokerBothDaysIncluded && brokerExpiryTime && ` at ${brokerExpiryTime}`}
                  </span>
                </div>
                {!brokerBothDaysIncluded && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Time Zone</span>
                    <span className="font-medium text-gray-900">
                      {brokerTimeZoneOption === "original-insured" ? "Original Insured" : brokerTimeZoneOption === "cedent" ? "Cedent" : "GMT"}
                    </span>
                  </div>
                )}
                {brokerBothDaysIncluded && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Period</span>
                    <span className="font-medium text-gray-900">Both days included</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                By accepting this quotation, you are confirming the terms and instructing the underwriter to bind coverage. This action cannot be undone.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => {
                    // Persist broker's confirmed/adjusted dates to the placement object
                    const updatedPlacement = {
                      ...placement,
                      draftData: {
                        ...placement.draftData,
                        inceptionDate: brokerInceptionDate || placement.draftData?.inceptionDate,
                        expiryDate: brokerExpiryDate || placement.draftData?.expiryDate,
                        bothDatesIncluded: brokerBothDaysIncluded,
                        inceptionTime: brokerInceptionTime || placement.draftData?.inceptionTime,
                        expiryTime: brokerExpiryTime || placement.draftData?.expiryTime,
                        timeZoneOption: brokerTimeZoneOption || placement.draftData?.timeZoneOption,
                        inceptionDateTBA: false,
                      },
                      inceptionDate: brokerInceptionDate || placement.inceptionDate,
                      acceptedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Unknown",
                      acceptedByCompany: currentUser?.company || "",
                      acceptedDate: new Date().toISOString().split("T")[0],
                    };
                    onUpdatePlacement?.(updatedPlacement);
                    onStatusChange?.(placement.id, "firmorder");
                    // Send FIRM ORDER notification to underwriters (fire and forget)
                    notifyFirmOrder(
                      placement,
                      contacts,
                      lineslips,
                      currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Unknown",
                      currentUser?.company || ""
                    );
                    setShowAcceptConfirm(false);
                    setShowActionPanel(false);
                  }}
                  className="flex-1 bg-[#004225] hover:bg-[#003319] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  Confirm Acceptance
                </Button>
                <Button
                  onClick={() => setShowAcceptConfirm(false)}
                  variant="outline"
                  className="px-5 py-2.5 rounded-lg"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quote Submission Confirmation Modal */}
      {showQuoteConfirm && pendingQuoteData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowQuoteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] p-6 space-y-4 mx-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#004225]/10 rounded-xl flex items-center justify-center">
                <Send className="size-5 text-[#004225]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Confirm Quote Submission</h3>
                <p className="text-xs text-gray-500">This action will send the quote to the broker</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Insured</span>
                <span className="font-semibold text-gray-900">{placement.insuredName}</span>
              </div>
              {pendingQuoteData.lolPremiumsByCurrency && pendingQuoteData.lolPremiumsByCurrency.length > 1 ? (
                <>
                  {pendingQuoteData.lolPremiumsByCurrency.map((ct: any) => {
                    const cSym = ct.currency === "GBP" ? "£" : ct.currency === "EUR" ? "€" : "$";
                    const ohpConf = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
                    const orderPrem = Math.round(ct.premium * ohpConf / 100);
                    return (
                      <div key={ct.currency} className="space-y-1.5 pt-1.5 border-t border-gray-100 first:border-t-0 first:pt-0">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Premium ({ct.currency})</span>
                          <span className="font-bold text-[#004225]">{cSym}{ct.premium.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Order Premium ({ohpConf}%) ({ct.currency})</span>
                          <span className="font-bold text-[#004225]/70">{cSym}{orderPrem.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Currencies</span>
                    <div className="flex gap-1.5">
                      {pendingQuoteData.lolPremiumsByCurrency.map((ct: any) => (
                        <span key={ct.currency} className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs">{ct.currency}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Premium</span>
                    <span className="font-bold text-[#004225]">
                      {pendingQuoteData.currency === "GBP" ? "£" : pendingQuoteData.currency === "EUR" ? "€" : "$"}
                      {pendingQuoteData.premium.toLocaleString()}
                    </span>
                  </div>
                  {(() => {
                    const ohpConf = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
                    const orderPremConf = Math.round(pendingQuoteData.premium * ohpConf / 100);
                    const confSym = pendingQuoteData.currency === "GBP" ? "£" : pendingQuoteData.currency === "EUR" ? "€" : "$";
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Order Premium ({ohpConf}%)</span>
                        <span className="font-bold text-[#004225]/70">{confSym}{orderPremConf.toLocaleString()}</span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Currency</span>
                    <span className="font-semibold text-blue-600">{pendingQuoteData.currency || "USD"}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valid Until</span>
                <span className="font-medium text-gray-900">
                  {new Date(pendingQuoteData.quoteValidUntil).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                </span>
              </div>
              {pendingQuoteData.confiscationIncluded !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Confiscation (LSW555D)</span>
                  <span className={`font-semibold ${pendingQuoteData.confiscationIncluded ? "text-green-600" : "text-amber-600"}`}>
                    {pendingQuoteData.confiscationIncluded ? "Included" : "Excluded"}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Once submitted, the broker will be able to review your quote and proceed with the placement.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => {
                  onSubmitQuote?.(placement.id, pendingQuoteData);
                  setShowQuoteConfirm(false);
                  setPendingQuoteData(null);
                  setShowQuoteForm(false);
                  setQuoteTerms("");
                  setQuoteWrittenLine("100");
                  setQuoteEndorsements("");
                  setQuoteHullRates({});
                  setQuoteLiabilityPremiums({});
                  setQuoteSparesPremium("");
                  setQuoteSparesRate("");
                  setQuoteSparesIncludedInHull(false);
                  setQuotePphPremium("");
                  setQuoteConfiscationIncluded(true);
                  setShowActionPanel(false);
                }}
                className="flex-1 bg-[#004225] hover:bg-[#003319] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
              >
                <Send className="size-4" />
                Confirm & Submit
              </Button>
              <Button
                onClick={() => {
                  setShowQuoteConfirm(false);
                  setPendingQuoteData(null);
                }}
                variant="outline"
                className="px-5 py-2.5 rounded-lg"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Premium Tab Component — shown after placement is quoted
function PremiumTab({ placement }: { placement: Placement }) {
  const quote = placement.quotes?.[0];
  if (!quote) return <div className="text-sm text-gray-500">No quote data available.</div>;

  const cs: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };
  const sym = cs[quote.currency] || "$";
  const qFleet: any[] = placement.draftData?.fleet || [];
  const ohp = parseFloat(placement.draftData?.orderHereonPercentage?.[placement.productCode] || "100") || 100;
  const orderPremium = Math.round(quote.premium * ohp / 100);

  // Spares info
  const sparesValue = placement.draftData?.sparesValue ? String(placement.draftData.sparesValue).replace(/,/g, "") : "0";
  const sparesValueNum = parseFloat(sparesValue) || 0;
  const isHW = placement.productCode === "HW";
  const isHD = placement.productCode === "HD";
  const hullLabel = isHD ? "Hull Deductible" : isHW ? "Hull War" : "Hull";
  const isPA = placement.productCode === "PA";
  const subCoverages: string[] = placement.draftData?.selectedSubCoverages || [];
  const hasCrewPA = subCoverages.includes("crew_personal_accident");
  const hasPaxPA = subCoverages.includes("passenger_personal_accident");
  const crewCoverageType = placement.draftData?.crewCoverageType || "flight_risk";
  const crewTypeLabel = crewCoverageType === "flight_risk" ? "Flight Risk" : crewCoverageType === "on_duty" ? "On Duty" : crewCoverageType === "24_hour" ? "24 Hour" : crewCoverageType;
  const is24HourPA = isPA && crewCoverageType === "24_hour";

  return (
    <div className="space-y-6">
      {/* Auto-Quote Banner */}
      {quote.autoQuoted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Zap className="size-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-800">Auto-Quoted via Binder</h4>
              <p className="text-xs text-amber-600 mt-0.5">
                This premium was automatically calculated using the rating rules from binder{" "}
                <span className="font-semibold">{quote.binderName || "—"}</span>{" "}
                <span className="text-amber-500">({quote.binderRef || "—"})</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-amber-500 font-medium">Written Line</div>
              <div className="text-sm font-bold text-amber-800">{quote.writtenLine}%</div>
            </div>
          </div>
          {(quote.ageLoadingAmount > 0) && (
            <div className="mt-3 pt-3 border-t border-amber-200 flex flex-wrap gap-3">
              {quote.ageLoadingAmount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                  Age Loading: +{sym}{Math.round(quote.ageLoadingAmount).toLocaleString()}
                </span>
              )}
              {quote.warPremium > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                  War Premium: {sym}{Math.round(quote.warPremium).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quote header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <DollarSign className="size-4 text-[#004225]" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Premium Breakdown</h3>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{quote.currency}</span>
        </div>
        {quote.quoteValidUntil && placement.status === "quoted" && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
            <Clock className="size-3" />Valid until {new Date(quote.quoteValidUntil).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
          </div>
        )}
      </div>

      {/* PA: Crew Personal Accident Section */}
      {isPA && hasCrewPA && quote.crewPARows && quote.crewPARows.length > 0 && (() => {
        const crewCurrency = quote.crewPARows[0]?.currency || quote.currency;
        const crewSym = cs[crewCurrency] || "$";
        const isReinsurance = placement.draftData?.placementType === "reinsurance";
        const sumsLabel = isReinsurance ? "Sums Reinsured" : "Sums Insured";
        const colCount = is24HourPA ? 5 : 6;
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <Users className="size-3.5 text-[#004225]" />
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Crew Personal Accident</h4>
              <span className="text-[10px] font-medium text-[#004225]/60 bg-[#004225]/8 px-1.5 py-0.5 rounded">{crewTypeLabel}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">{is24HourPA ? "Name" : "Registration"}</th>
                  {is24HourPA && <th className="text-left px-4 py-2 font-medium">Position</th>}
                  {is24HourPA && <th className="text-center px-4 py-2 font-medium">Age</th>}
                  <th className="text-right px-4 py-2 font-medium">{is24HourPA ? sumsLabel : "Limit Per Seat"}</th>
                  {!is24HourPA && <th className="text-right px-4 py-2 font-medium">Seats</th>}
                  {!is24HourPA && <th className="text-right px-4 py-2 font-medium">Aggregate</th>}
                  <th className="text-right px-4 py-2 font-medium">Rate %</th>
                  <th className="text-right px-4 py-2 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody>
                {quote.crewPARows.map((row: any) => (
                  <tr key={row.reg} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{is24HourPA ? (row.name || row.reg) : row.reg}</td>
                    {is24HourPA && <td className="px-4 py-2.5 text-gray-600">{row.position || "\u2014"}</td>}
                    {is24HourPA && <td className="px-4 py-2.5 text-center text-gray-600">{row.age || "\u2014"}</td>}
                    <td className="px-4 py-2.5 text-right text-gray-600">{crewSym}{(is24HourPA ? row.aggregate : row.limitPerSeat)?.toLocaleString()}</td>
                    {!is24HourPA && <td className="px-4 py-2.5 text-right text-gray-600">{row.seats}</td>}
                    {!is24HourPA && <td className="px-4 py-2.5 text-right text-gray-600">{crewSym}{row.aggregate?.toLocaleString()}</td>}
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.rate}%</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{crewSym}{row.premium?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              {!is24HourPA && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={colCount - 1} className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Crew PA Premium Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#004225]">{crewSym}{quote.crewPAPremiumTotal?.toLocaleString()}</td>
                </tr>
              </tfoot>
              )}
            </table>
          </div>
        );
      })()}

      {/* PA: Passenger Personal Accident Section */}
      {isPA && hasPaxPA && quote.paxPARows && quote.paxPARows.length > 0 && (() => {
        const paxCurrency = quote.paxPARows[0]?.currency || quote.currency;
        const paxSym = cs[paxCurrency] || "$";
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <Users className="size-3.5 text-blue-600" />
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Passenger Personal Accident</h4>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Registration</th>
                  <th className="text-right px-4 py-2 font-medium">Limit Per Seat</th>
                  <th className="text-right px-4 py-2 font-medium">Seats</th>
                  <th className="text-right px-4 py-2 font-medium">Aggregate</th>
                  <th className="text-right px-4 py-2 font-medium">Rate %</th>
                  <th className="text-right px-4 py-2 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody>
                {quote.paxPARows.map((row: any) => (
                  <tr key={row.reg} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{row.reg}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{paxSym}{row.limitPerSeat?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.seats}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{paxSym}{row.aggregate?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.rate}%</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{paxSym}{row.premium?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={5} className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Pax PA Premium Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-blue-700">{paxSym}{quote.paxPAPremiumTotal?.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })()}

      {/* Hull / Hull War Section */}
      {!isPA && quote.hullRates && quote.hullRates.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{hullLabel}</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">Registration</th>
                <th className="text-left px-4 py-2 font-medium">Aircraft</th>
                <th className="text-right px-4 py-2 font-medium">{isHD ? "Sums Reinsured" : isHW ? "Aircraft Agreed Value" : `${hullLabel} Value`}</th>
                <th className="text-right px-4 py-2 font-medium">{isHD ? "Rate on Line %" : "Rate %"}</th>
                <th className="text-right px-4 py-2 font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              {quote.hullRates.map((hr) => {
                const aircraft = qFleet.find((a: any) => a.registration?.toUpperCase() === hr.registration?.toUpperCase());
                return (
                  <tr key={hr.registration} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{hr.registration}</td>
                    <td className="px-4 py-2.5 text-gray-600">{aircraft ? `${aircraft.make} ${aircraft.model}` : hr.aircraftType}</td>
                    <td className={`px-4 py-2.5 text-right ${isHD ? "font-semibold text-[#004225]" : "text-gray-600"}`}>{sym}{hr.hullValue?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{hr.rate}%</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{sym}{hr.hullPremium?.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">{hullLabel} Premium Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-[#004225]">{sym}{quote.hullPremiumTotal?.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Liability Section — hidden for Hull War, PA, and HD */}
      {!isPA && placement.productCode !== "HW" && !isHD && (quote.liabilityRates && quote.liabilityRates.length > 0 || quote.liabilityPremium > 0) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Liability</h4>
          </div>
          {quote.liabilityRates && quote.liabilityRates.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Registration</th>
                  <th className="text-left px-4 py-2 font-medium">Aircraft</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-right px-4 py-2 font-medium">Limit</th>
                  <th className="text-right px-4 py-2 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody>
                {quote.liabilityRates.map((lr) => {
                  const aircraft = qFleet.find((a: any) => a.registration?.toUpperCase() === lr.registration?.toUpperCase());
                  return (
                    <tr key={lr.registration} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-gray-900">{lr.registration}</td>
                      <td className="px-4 py-2.5 text-gray-600">{aircraft ? `${aircraft.make} ${aircraft.model}` : "-"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${lr.liabilityType === "CSL" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                          {lr.liabilityType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{sym}{lr.liabilityLimit?.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{sym}{lr.premium?.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Liability Premium Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#004225]">{sym}{quote.liabilityPremium?.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-gray-600">Liability Premium</span>
              <span className="text-sm font-bold text-[#004225]">{sym}{quote.liabilityPremium?.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Spares Section */}
      {!isPA && (quote.sparesPremium != null || quote.sparesIncludedInHull) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Spares</h4>
          </div>
          {quote.sparesIncludedInHull ? (
            <div className="px-4 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600">Include Spares within {hullLabel} Rate</span>
                  {sparesValueNum > 0 && <p className="text-xs text-gray-400 mt-0.5">Spares Value: {sym}{sparesValueNum.toLocaleString()}</p>}
                </div>
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Include Spares within {hullLabel} Rate</span>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-right px-4 py-2 font-medium">Spares Value</th>
                  <th className="text-right px-4 py-2 font-medium">Rate %</th>
                  <th className="text-right px-4 py-2 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 text-right text-gray-600">{sparesValueNum > 0 ? `${sym}${sparesValueNum.toLocaleString()}` : "-"}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{quote.sparesRate != null ? `${quote.sparesRate}%` : "-"}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{sym}{quote.sparesPremium?.toLocaleString()}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Spares Premium Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#004225]">{sym}{quote.sparesPremium?.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* PPH Section */}
      {!isPA && quote.pphPremium != null && quote.pphPremium > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Products, Premises & Hangarkeepers</h4>
          </div>
          <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">PPH Premium</span>
            <span className="text-sm font-bold text-[#004225]">{sym}{quote.pphPremium.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Total Premium Summary */}
      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        {/* BRG header strip */}
        <div className="flex items-center gap-2.5 bg-[#004225] px-5 py-2.5">
          <div className="w-1 h-4 bg-white/40 rounded-full" />
          <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">Premium Summary</h4>
        </div>
        {/* Line items */}
        <div className="bg-white">
          {isPA && quote.crewPAPremiumTotal > 0 && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Crew PA</span>
              <span className="text-sm font-medium text-gray-900">{sym}{quote.crewPAPremiumTotal.toLocaleString()}</span>
            </div>
          )}
          {isPA && quote.paxPAPremiumTotal > 0 && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Pax PA</span>
              <span className="text-sm font-medium text-gray-900">{sym}{quote.paxPAPremiumTotal.toLocaleString()}</span>
            </div>
          )}
          {!isPA && quote.hullPremiumTotal > 0 && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">{hullLabel}</span>
              <span className="text-sm font-medium text-gray-900">{sym}{quote.hullPremiumTotal.toLocaleString()}</span>
            </div>
          )}
          {!isPA && placement.productCode !== "HW" && !isHD && quote.liabilityPremium > 0 && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Liability</span>
              <span className="text-sm font-medium text-gray-900">{sym}{quote.liabilityPremium.toLocaleString()}</span>
            </div>
          )}
          {(quote.sparesPremium != null && quote.sparesPremium > 0) && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Spares</span>
              <span className="text-sm font-medium text-gray-900">{sym}{quote.sparesPremium.toLocaleString()}</span>
            </div>
          )}
          {quote.sparesIncludedInHull && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Spares</span>
              <span className="text-xs font-semibold text-green-600">Include Spares within {hullLabel} Rate</span>
            </div>
          )}
          {quote.pphPremium != null && quote.pphPremium > 0 && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Products, Premises & Hangarkeepers</span>
              <span className="text-sm font-medium text-gray-900">{sym}{quote.pphPremium.toLocaleString()}</span>
            </div>
          )}
          {/* Total Premium row */}
          <div className="flex justify-between items-center px-5 py-3.5 border-t border-gray-200">
            <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Total Premium</span>
            <span className="text-lg font-extrabold text-gray-900">{sym}{quote.premium.toLocaleString()}</span>
          </div>
          {/* Order Premium accent row */}
          <div className="flex items-stretch bg-amber-50/60 border-t border-gray-200">
            <div className="w-1.5 bg-[#004225] rounded-r" />
            <div className="flex justify-between items-center flex-1 px-4 py-3.5">
              <span className="text-sm font-bold text-[#004225] uppercase tracking-wide">Order Premium ({ohp}%)</span>
              <span className="text-lg font-extrabold text-[#004225]">{sym}{orderPremium.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Endorsements */}
      {quote.endorsements && (
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Endorsements</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.endorsements}</p>
          </div>
        </div>
      )}

      {/* Quoted/Bound by */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
        <User className="size-4" />
        <span>
          {placement.status === "bound" && placement.boundByName
            ? `Bound by ${placement.boundByName}`
            : `Quoted by ${quote.underwriterName}`}
        </span>
      </div>
    </div>
  );
}

// Insured Details Tab Component
function InsuredDetailsTab({ placement, facilityRef: _facilityRef }: { placement: Placement; facilityRef: string }) {
  const reinsuredName = placement.draftData?.reinsuredName;
  const cedentName = placement.insuredName;
  const additionalInsureds = placement.draftData?.additionalInsureds || [];
  
  // Construct insured address from individual fields
  const insuredAddressParts = [
    placement.draftData?.insuredAddressLine1,
    placement.draftData?.insuredCity,
    placement.draftData?.insuredPostcode,
    placement.draftData?.insuredCountry
  ].filter(Boolean);
  const insuredAddress = insuredAddressParts.length > 0 ? insuredAddressParts.join(', ') : null;
  
  // Construct reinsured address from individual fields
  const reinsuredAddressParts = [
    placement.draftData?.reinsuredAddressLine1,
    placement.draftData?.reinsuredCity,
    placement.draftData?.reinsuredPostcode,
    placement.draftData?.reinsuredCountry
  ].filter(Boolean);
  const reinsuredAddress = reinsuredAddressParts.length > 0 ? reinsuredAddressParts.join(', ') : null;
  
  return (
    <div className="space-y-6">
      {/* Insured and Reinsured Side by Side */}
      <div className="grid grid-cols-2 gap-5">
        {/* Insured */}
        <div className="border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <Building2 className="size-4 text-[#004225]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Insured</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Name</div>
              <div className="text-gray-900 text-sm font-semibold">{cedentName}</div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Address</div>
              <div className="text-gray-700 text-sm leading-relaxed">
                {insuredAddress || <span className="text-gray-400 italic text-xs">No address provided</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Reinsured */}
        {reinsuredName ? (
          <div className="border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <Building2 className="size-4 text-[#004225]" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Reinsured</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Name</div>
                <div className="text-gray-900 text-sm font-semibold">{reinsuredName}</div>
              </div>
              <div>
                <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Address</div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  {reinsuredAddress || <span className="text-gray-400 italic text-xs">No address provided</span>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg flex items-center justify-center p-8">
            <div className="text-center">
              <Building2 className="size-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-xs font-medium">No reinsured party</p>
              <p className="text-gray-300 text-[10px] mt-0.5">Direct insurance placement</p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Insureds */}
      {additionalInsureds && additionalInsureds.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <Users className="size-4 text-[#004225]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Additional Insureds</h3>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{additionalInsureds.length}</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              {additionalInsureds.map((insured: any, index: number) => (
                <div key={index} className="border border-gray-100 rounded-md p-4 space-y-3">
                  <div>
                    <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Name</div>
                    <div className="text-gray-900 text-sm font-semibold">{insured.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Address</div>
                    <div className="text-gray-700 text-xs leading-relaxed">
                      {[insured.addressLine1, insured.city, insured.postcode, insured.country].filter(Boolean).join(', ') || (
                        <span className="text-gray-400 italic">No address provided</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* Order Details - Always show for the placement's product code, defaulting to 100% / Whole Account */}
      {(() => {
        const orderPercentage = placement.draftData?.orderHereonPercentage || {};
        const orderBasis = placement.draftData?.orderHereonBasis || {};
        const productCode = placement.productCode;
        const percentage = orderPercentage[productCode] || "100";
        const basis = orderBasis[productCode] || "whole";
        const coverageMap: Record<string, string> = {
          HL: "Hull & Liability",
          HW: "Hull War",
          PA: "Personal Accident",
          LOL: "Loss of Licence",
          HD: "Hull Deductible",
          UAS: "Drone Insurance",
        };
        
        return (
          <div className="border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <FileCheck className="size-4 text-[#004225]" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Order Details</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-6 items-center">
                <div>
                  <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Coverage</div>
                  <div className="text-gray-900 text-sm font-semibold">{coverageMap[productCode] || productCode}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Percentage</div>
                  <div className="text-gray-900 text-lg font-bold">{percentage}%</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Basis</div>
                  <div className="text-[#004225] text-sm font-semibold">{`${percentage || "100"}% of 100% ${basis === "whole" ? "Of Whole" : "Of Order"}`}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Broker Information */}
      <div className="border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <User className="size-4 text-[#004225]" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Broker Information</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Producer</div>
              <div className="text-gray-900 text-sm font-semibold">{placement.brokerCompany || "DIRECT"}</div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Broker</div>
              <div className="text-gray-900 text-sm font-semibold">
                {placement.submittedByName || "Unknown"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Aircraft/Drone Details Tab
function AircraftDetailsTab({ placement }: { placement: Placement }) {
  const isUAS = placement.productCode === "UAS";
  const aircraftLabel = isUAS ? "Drone" : "Aircraft";
  const aircraftLabelLower = isUAS ? "drone" : "aircraft";
  const fleet = placement.draftData?.fleet || [];
  const isHullDeductible = placement.productCode === "HD";
  const isHullWar = placement.productCode === "HW";
  const isPA = placement.productCode === "PA";
  const [selectedAircraft, setSelectedAircraft] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aircraftDataCache, setAircraftDataCache] = useState<Record<string, any>>({});
  const [prefetchingReg, setPrefetchingReg] = useState<string | null>(null);

  // Check for policy-level excluded countries
  const excludedCountries = placement.draftData?.excludedCountries || [];
  const hasExcludedCountries = excludedCountries.length > 0;

  // Debug logging
  console.log('🔍 PlacementDetailView - Excluded Countries Debug:', {
    excludedCountries,
    hasExcludedCountries,
    draftData: placement.draftData,
    fullPlacement: placement
  });

  // Prefetch aircraft data on hover
  const prefetchAircraftData = async (registration: string) => {
    // Skip if already cached or currently prefetching
    if (aircraftDataCache[registration] || prefetchingReg === registration) {
      return;
    }

    setPrefetchingReg(registration);

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142/aircraft/lookup/${encodeURIComponent(registration)}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAircraftDataCache(prev => ({
          ...prev,
          [registration]: data.aircraft
        }));
      }
    } catch (err) {
      console.error("Prefetch error:", err);
    } finally {
      setPrefetchingReg(null);
    }
  };

  // Helper function to abbreviate aircraft type
  const abbreviateAircraftType = (type: string) => {
    const typeMap: Record<string, string> = {
      "fixed-wing": "FW",
      "rotary-wing": "RW",
      "drone": "UAS"
    };
    return typeMap[type.toLowerCase()] || type;
  };

  // Helper function to abbreviate engine type
  const abbreviateEngineType = (type: string) => {
    const engineMap: Record<string, string> = {
      "single-engine-piston": "SEP",
      "multi-engine-piston": "MEP",
      "single-engine-turboprop": "SET",
      "multi-engine-turboprop": "MET",
      "single-engine-jet": "SEJ",
      "multi-engine-jet": "MEJ"
    };
    return engineMap[type.toLowerCase()] || type.toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 mb-4">
        <Plane className="size-4 text-[#004225]" />
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{aircraftLabel} Details</h3>
        {fleet.length > 0 && (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{fleet.length} {aircraftLabelLower}{fleet.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      
      {fleet.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Plane className="size-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No aircraft information provided</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <TooltipProvider>
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50/70 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">#</th>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{isUAS ? 'Serial No.' : 'Reg'}</th>
                      {!isPA && <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Make/Model</th>}
                      {isPA && <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Crew</th>}
                      {isPA && <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Pax</th>}
                      {!isHullWar && !isPA && !isUAS && !isHullDeductible && <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Crew/Pax</th>}
                      {!isHullWar && !isPA && !isUAS && !isHullDeductible && <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Dual</th>}
                      {!isUAS && <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Type</th>}
                      <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Base</th>
                      {!isPA && !isHullDeductible && <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Agreed Value</th>}
                      {isHullDeductible && <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Original Deductible</th>}
                      {isHullDeductible && <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Buy-Down Ded.</th>}
                      {isHullDeductible && <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Sums Reinsured</th>}
                      {!isHullWar && !isPA && !isHullDeductible && <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Deductible</th>}
                      {!isHullWar && !isPA && !isHullDeductible && <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Liability</th>}
                      {!isHullDeductible && <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Std</th>}
                      {!isHullDeductible && <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Spc</th>}
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fleet.map((aircraft: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-2 py-2.5 text-xs text-gray-400 font-medium">{index + 1}</td>
                        <td className="px-2 py-2.5 text-xs text-blue-600 font-bold cursor-pointer hover:text-blue-800 hover:underline" onClick={() => {
                          setSelectedAircraft(aircraft);
                          setIsModalOpen(true);
                        }} onMouseEnter={() => prefetchAircraftData(aircraft.registration)}>
                          {aircraft.registration ? aircraft.registration.toUpperCase() : 'N/A'}
                        </td>
                        {!isPA && <td className="px-2 py-2.5 text-xs text-gray-900 font-medium">
                          {aircraft.make} {aircraft.model}
                        </td>}
                        {isPA && <td className="px-2 py-2.5 text-xs text-gray-700 text-center">{aircraft.crewSeats || '0'}</td>}
                        {isPA && <td className="px-2 py-2.5 text-xs text-gray-700 text-center">{aircraft.paxSeats || '0'}</td>}
                        {!isHullWar && !isPA && !isUAS && !isHullDeductible && <td className="px-2 py-2.5 text-xs text-gray-700 text-center">{aircraft.crewSeats || '0'} / {aircraft.paxSeats || '0'}</td>}
                        {!isHullWar && !isPA && !isUAS && !isHullDeductible && <td className="px-2 py-2.5 text-center">
                          <span className={`text-[10px] font-bold ${aircraft.isDualCrew ? 'text-green-600' : 'text-gray-400'}`}>
                            {aircraft.isDualCrew ? 'YES' : 'NO'}
                          </span>
                        </td>}
                        {!isUAS && <td className="px-2 py-2.5 text-xs text-gray-700 font-semibold">
                          {aircraft.aircraftType && aircraft.engineType 
                            ? `${abbreviateAircraftType(aircraft.aircraftType)} / ${abbreviateEngineType(aircraft.engineType)}` 
                            : 'N/A'}
                        </td>}
                        <td className="px-2 py-2.5 text-xs text-gray-700 font-medium whitespace-nowrap">
                          {aircraft.baseCountry 
                            ? <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">{aircraft.baseCountry}{aircraft.baseRegion ? ` / ${aircraft.baseRegion}` : ''}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{aircraft.baseCountry}{aircraft.baseRegion ? ` / ${aircraft.baseRegion}` : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        {!isPA && !isHullDeductible && <td className="px-2 py-2.5 text-xs text-gray-900 font-semibold text-right whitespace-nowrap">
                          {aircraft.aircraftAgreedValueCurrency} {Number((aircraft.aircraftAgreedValue || '0').toString().replace(/,/g, '') || 0).toLocaleString()}
                        </td>}
                        {isHullDeductible && <td className="px-2 py-2.5 text-xs text-gray-900 font-semibold text-right whitespace-nowrap">
                          {aircraft.standardDeductibleCurrency || 'USD'} {Number((aircraft.standardDeductible || '0').toString().replace(/,/g, '') || 0).toLocaleString()}
                        </td>}
                        {isHullDeductible && <td className="px-2 py-2.5 text-xs text-gray-900 font-semibold text-right whitespace-nowrap">
                          {aircraft.deductibleBuydownCurrency || 'USD'} {Number((aircraft.deductibleBuydown || '0').toString().replace(/,/g, '') || 0).toLocaleString()}
                        </td>}
                        {isHullDeductible && <td className="px-2 py-2.5 text-xs text-[#004225] font-bold text-right whitespace-nowrap">
                          {aircraft.standardDeductibleCurrency || 'USD'} {(Number((aircraft.standardDeductible || '0').toString().replace(/,/g, '') || 0) - Number((aircraft.deductibleBuydown || '0').toString().replace(/,/g, '') || 0)).toLocaleString()}
                        </td>}
                        {!isHullWar && !isPA && !isHullDeductible && <td className="px-2 py-2.5 text-xs text-gray-900 font-semibold text-right whitespace-nowrap">
                          <div>
                            {isUAS 
                              ? '10%'
                              : aircraft.aircraftType?.toLowerCase() === 'rotary-wing' 
                                ? `${aircraft.hullDeductible || '0'}%`
                                : `${aircraft.hullDeductibleCurrency} ${Number((aircraft.hullDeductible || '0').toString().replace(/,/g, '') || 0).toLocaleString()}`
                            }
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                            {isUAS
                              ? 'of Agreed Value'
                              : aircraft.aircraftType?.toLowerCase() === 'rotary-wing' 
                                ? 'Including Total Loss'
                                : 'Excluding Total Loss'
                            }
                          </div>
                        </td>}
                        {!isHullWar && !isPA && !isHullDeductible && <td className="px-2 py-2.5 text-xs text-gray-900 font-semibold text-right whitespace-nowrap">
                          <div>
                            {aircraft.liabilityLimitCurrency} {Number((aircraft.liabilityLimit || '0').toString().replace(/,/g, '') || 0).toLocaleString()}
                          </div>
                          {aircraft.liabilityType && !isUAS && (
                            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                              {aircraft.liabilityType === 'CSL' ? 'CSL' : 'TPL'}
                            </div>
                          )}
                        </td>}
                        {!isHullDeductible && <td className="px-2 py-2.5 text-center">
                          {aircraft.standardUses && aircraft.standardUses.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold cursor-help">
                                  {aircraft.standardUses.length}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold text-xs">Standard Uses:</p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {aircraft.standardUses.map((use: string, i: number) => (
                                      <li key={i} className="text-xs">{use}</li>
                                    ))}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>}
                        {!isHullDeductible && <td className="px-2 py-2.5 text-center">
                          {aircraft.specialUses && aircraft.specialUses.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold cursor-help">
                                  {aircraft.specialUses.length}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold text-xs">Special Uses:</p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {aircraft.specialUses.map((use: string, i: number) => (
                                      <li key={i} className="text-xs">{use}</li>
                                    ))}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>}
                        <td className="px-2 py-2.5 text-center">
                          {aircraft.taxPercentage && aircraft.taxName ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold cursor-help">
                                  ✓
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold text-xs">Tax:</p>
                                  <p className="text-xs">{aircraft.taxName}: {aircraft.taxPercentage}%</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TooltipProvider>
            </div>
          </div>

          {/* Excluded Countries Warning Card - Compact version under fleet */}
          {hasExcludedCountries && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <div className="flex items-start gap-2">
                <div className="bg-red-500 p-1.5 rounded flex-shrink-0">
                  <Globe className="size-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-red-900 font-semibold text-xs mb-1">LSW617 Excluded Countries</h4>
                  <p className="text-red-800 text-xs mb-2">
                    Flights to excluded/sanctioned countries:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {excludedCountries.map((country: string, idx: number) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded"
                      >
                        {country}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aircraft Details Modal */}
          {isModalOpen && selectedAircraft && (
            <AircraftDetailsModal
              aircraft={selectedAircraft}
              onClose={() => {
                setIsModalOpen(false);
                setSelectedAircraft(null);
              }}
              cachedData={aircraftDataCache[selectedAircraft.registration]}
              isHullWar={isHullWar}
              isUAS={isUAS}
            />
          )}
        </>
      )}
    </div>
  );
}

// Sublimits Tab
function SublimitsTab({ placement }: { placement: Placement }) {
  // Get sublimit data from placement
  const medicalExpensesLimit = placement.draftData?.medicalExpensesLimit;
  const medicalExpensesCurrency = placement.draftData?.medicalExpensesCurrency || 'USD';
  const cargoLiabilityLimit = placement.draftData?.cargoLiabilityLimit;
  const cargoLiabilityCurrency = placement.draftData?.cargoLiabilityCurrency || 'USD';
  const baggageLimit = placement.draftData?.baggageLimit;
  const baggageCurrency = placement.draftData?.baggageCurrency || 'USD';
  const passengerSettlementLimit = placement.draftData?.passengerSettlementLimit;
  const passengerSettlementCurrency = placement.draftData?.passengerSettlementCurrency || 'USD';
  const pphLimit = placement.draftData?.pphLimit;
  const pphCurrency = placement.draftData?.pphCurrency || 'USD';
  const aircraftSparesAmount = placement.draftData?.aircraftSparesAmount;
  const aircraftSparesCurrency = placement.draftData?.aircraftSparesCurrency || 'USD';
  
  // Get clauses/endorsements
  const noClaimsBonus = placement.draftData?.noClaimsBonus;
  const noClaimsBonusPercentage = placement.draftData?.noClaimsBonusPercentage;
  const profitCommission = placement.draftData?.profitCommission;
  const profitCommissionPercentage = placement.draftData?.profitCommissionPercentage;
  const profitCommissionBasis = placement.draftData?.profitCommissionBasis;
  const cargoEndorsement = placement.draftData?.cargoEndorsement;
  
  // Determine what to show based on product code
  const isHL = placement.productCode === 'HL';
  const isHW = placement.productCode === 'HW';
  
  // Check if there's any data to display (filtered by product)
  const hasSubLimits = isHL && (medicalExpensesLimit || cargoLiabilityLimit || baggageLimit || passengerSettlementLimit);
  const hasPPH = isHL && pphLimit;
  const hasAircraftSpares = aircraftSparesAmount; // Available for both HL and HW
  const hasClauses = isHL && (noClaimsBonus || profitCommission || cargoEndorsement);
  const hasAnyData = hasSubLimits || hasPPH || hasAircraftSpares || hasClauses;
  
  return (
    <div className="space-y-3">
      {!hasAnyData ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 text-center">
          {isHW ? <Plane className="size-6 text-gray-200 mx-auto mb-1.5" /> : <FileCheck className="size-6 text-gray-200 mx-auto mb-1.5" />}
          <p className="text-gray-400 text-[10px] font-medium">{isHW ? "No spares coverage information provided" : "No sub-limits or clauses information provided"}</p>
        </div>
      ) : (
        <>
          {/* Sub-Limits Section */}
          {hasSubLimits && (
            <div className="border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                <DollarSign className="size-3.5 text-[#004225]" />
                <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Sub-Limits</h3>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-2.5">
                {medicalExpensesLimit && (
                  <div className="border border-gray-100 rounded px-3 py-2">
                    <div className="text-gray-400 text-[10px] font-bold mb-0.5 uppercase tracking-widest">Medical Expenses</div>
                    <div className="text-gray-900 text-sm font-bold">
                      {medicalExpensesCurrency} {parseInt(medicalExpensesLimit.replace(/,/g, '')).toLocaleString()}
                    </div>
                  </div>
                )}
                {cargoLiabilityLimit && (
                  <div className="border border-gray-100 rounded px-3 py-2">
                    <div className="text-gray-400 text-[10px] font-bold mb-0.5 uppercase tracking-widest">Cargo Liability</div>
                    <div className="text-gray-900 text-sm font-bold">
                      {cargoLiabilityCurrency} {parseInt(cargoLiabilityLimit.replace(/,/g, '')).toLocaleString()}
                    </div>
                  </div>
                )}
                {baggageLimit && (
                  <div className="border border-gray-100 rounded px-3 py-2">
                    <div className="text-gray-400 text-[10px] font-bold mb-0.5 uppercase tracking-widest">Baggage</div>
                    <div className="text-gray-900 text-sm font-bold">
                      {baggageCurrency} {parseInt(baggageLimit.replace(/,/g, '')).toLocaleString()}
                    </div>
                  </div>
                )}
                {passengerSettlementLimit && (
                  <div className="border border-gray-100 rounded px-3 py-2">
                    <div className="text-gray-400 text-[10px] font-bold mb-0.5 uppercase tracking-widest">Passenger Settlement</div>
                    <div className="text-gray-900 text-sm font-bold">
                      {passengerSettlementCurrency} {parseInt(passengerSettlementLimit.replace(/,/g, '')).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Products, Premises & Hangarkeepers Section */}
          {hasPPH && (
            <div className="border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                <Shield className="size-3.5 text-[#004225]" />
                <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Products, Premises & Hangarkeepers</h3>
              </div>
              <div className="px-4 py-3">
                <div className="border border-gray-100 rounded px-3 py-2 max-w-xs">
                  <div className="text-gray-400 text-[10px] font-bold mb-0.5 uppercase tracking-widest">Limit</div>
                  <div className="text-gray-900 text-sm font-bold">
                    {pphCurrency} {parseInt(pphLimit.replace(/,/g, '')).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Aircraft Spares Section */}
          {hasAircraftSpares && (
            <div className="border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                <Plane className="size-3.5 text-[#004225]" />
                <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Aircraft Spares</h3>
              </div>
              <div className="px-4 py-3">
                <div className="border border-gray-100 rounded px-3 py-2 max-w-xs">
                  <div className="text-gray-400 text-[10px] font-bold mb-0.5 uppercase tracking-widest">Spares Value</div>
                  <div className="text-gray-900 text-sm font-bold">
                    {aircraftSparesCurrency} {parseInt(aircraftSparesAmount.replace(/,/g, '')).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Clauses & Endorsements Section */}
          {hasClauses && (
            <div className="border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                <FileCheck className="size-3.5 text-[#004225]" />
                <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Clauses & Endorsements</h3>
              </div>
              <div className="px-4 py-3 space-y-2">
                {noClaimsBonus && (
                  <div className="flex items-center justify-between border border-gray-100 rounded px-3 py-2">
                    <div>
                      <div className="text-gray-900 font-semibold text-sm">No Claims Bonus</div>
                      <div className="text-gray-400 text-[10px] uppercase tracking-widest">Claim-free discount</div>
                    </div>
                    <div className="text-[#004225] text-base font-bold">
                      {noClaimsBonusPercentage}%
                    </div>
                  </div>
                )}
                {profitCommission && (
                  <div className="flex items-center justify-between border border-gray-100 rounded px-3 py-2">
                    <div className="text-gray-900 font-semibold text-sm">Profit Commission</div>
                    <div className="text-gray-900 text-sm font-bold">
                      {profitCommissionPercentage}% on a {profitCommissionBasis}% Basis
                    </div>
                  </div>
                )}
                {cargoEndorsement && (
                  <div className="flex items-center gap-2 border border-gray-100 rounded px-3 py-2">
                    <CheckCircle2 className="size-3.5 text-[#004225]" />
                    <div>
                      <div className="text-gray-900 font-semibold text-sm">Cargo Endorsement</div>
                      <div className="text-gray-400 text-[10px] uppercase tracking-widest">Additional cargo coverage included</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Pilot Details Tab
function PilotsDetailsTab({ placement }: { placement: Placement }) {
  const isHullWar = placement.productCode === "HW";
  const isHullDeductible = placement.productCode === "HD";
  const isLOL = placement.productCode === "LOL";
  const isPA = placement.productCode === "PA";
  const isUAS = placement.productCode === "UAS";
  const aircraftLabel = isUAS ? "Drone" : "Aircraft";
  const fleet = placement.draftData?.fleet || [];
  const lolPilots = placement.draftData?.lolPilots || [];
  
  // Get pilot warranty information
  const namedPilots = placement.draftData?.namedPilots || false;
  const openPilotWarranty = placement.draftData?.openPilotWarranty || false;
  const pilotsUnder65 = placement.draftData?.pilotsUnder65 ?? false;
  const opwHours = placement.draftData?.opwHours || {};
  const minRequiredHours = placement.draftData?.minRequiredHours || {};
  const crewMembers = placement.draftData?.crewMembers || [];
  const crewCoverageType = placement.draftData?.crewCoverageType || "";
  
  // DEBUG: Log all pilot data
  console.log('=== PILOT/CREW DEBUG ===');
  console.log('Product Code:', placement.productCode);
  console.log('Named Pilots:', namedPilots);
  console.log('Open Pilot Warranty:', openPilotWarranty);
  console.log('OPW Hours:', opwHours);
  console.log('Min Required Hours:', minRequiredHours);
  console.log('Crew Members:', crewMembers);
  console.log('Full draftData:', placement.draftData);
  console.log('========================');
  
  // Group aircraft by type for OPW display (using aircraftType|engineType format)
  const aircraftTypeGroups: Record<string, any[]> = {};
  fleet.forEach((aircraft: any) => {
    const typeKey = `${aircraft.aircraftType}|${aircraft.engineType}`;
    if (!aircraftTypeGroups[typeKey]) {
      aircraftTypeGroups[typeKey] = [];
    }
    aircraftTypeGroups[typeKey].push(aircraft);
  });
  
  console.log('Aircraft Type Groups:', aircraftTypeGroups);
  
  if (isLOL) {
    // Show LOL Pilot Details
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 mb-4">
          <Users className="size-4 text-[#004225]" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Insured Person Details</h3>
          {lolPilots.length > 0 && (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{lolPilots.length} insured person{lolPilots.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        
        {lolPilots.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Users className="size-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-xs font-medium">No pilot information provided</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lolPilots.map((pilot: any, index: number) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-6 gap-4">
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Name</div>
                    <div className="text-gray-900 text-sm font-medium">{pilot.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Age</div>
                    <div className="text-gray-900 text-sm font-medium">{pilot.age || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Position</div>
                    <div className="text-gray-900 text-sm font-medium">{pilot.position || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Annual Salary</div>
                    <div className="text-gray-900 text-sm font-medium">{pilot.salary ? `${pilot.salaryCurrency} ${Number(String(pilot.salary).replace(/,/g, '')).toLocaleString()}` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Sums Insured</div>
                    <div className="text-gray-900 text-sm font-medium">{pilot.sumsInsured ? `${pilot.sumsInsuredCurrency} ${Number(String(pilot.sumsInsured).replace(/,/g, '')).toLocaleString()}` : 'N/A'}</div>
                  </div>
                  {pilot.taxPercentage && (
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Tax</div>
                      <div className="text-gray-900 text-sm font-medium">{pilot.taxName || pilot.taxType} {pilot.taxPercentage}%</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show Aircraft/Fleet Details for Hull War & Hull Deductible
  if (isHullWar || isHullDeductible) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 mb-4">
          <Plane className="size-4 text-[#004225]" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{aircraftLabel} Details</h3>
        </div>
        
        {fleet.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Plane className="size-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-xs font-medium">No aircraft information provided</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fleet.map((aircraft: any, index: number) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <div className="font-semibold text-gray-900 mb-3 text-sm">Aircraft {index + 1}</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Registration</div>
                    <div className="text-gray-900 text-sm font-medium">{aircraft.registration || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Make/Model</div>
                    <div className="text-gray-900 text-sm font-medium">{aircraft.make} {aircraft.model}</div>
                  </div>
                  {!isHullDeductible && <div>
                    <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Agreed Value</div>
                    <div className="text-gray-900 text-sm font-medium">
                      {aircraft.aircraftAgreedValueCurrency} {aircraft.aircraftAgreedValue?.toLocaleString()}
                    </div>
                  </div>}
                  {isHullDeductible && <>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Original Deductible</div>
                      <div className="text-gray-900 text-sm font-medium">
                        {aircraft.standardDeductibleCurrency || 'USD'} {Number((aircraft.standardDeductible || '0').toString().replace(/,/g, '') || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Buy-Down Deductible</div>
                      <div className="text-gray-900 text-sm font-medium">
                        {aircraft.deductibleBuydownCurrency || 'USD'} {Number((aircraft.deductibleBuydown || '0').toString().replace(/,/g, '') || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Sums Reinsured</div>
                      <div className="text-[#004225] text-sm font-bold">
                        {aircraft.standardDeductibleCurrency || 'USD'} {(Number((aircraft.standardDeductible || '0').toString().replace(/,/g, '') || 0) - Number((aircraft.deductibleBuydown || '0').toString().replace(/,/g, '') || 0)).toLocaleString()}
                      </div>
                    </div>
                  </>}
                  {aircraft.baseCountry && (
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Base Country</div>
                      <div className="text-gray-900 text-sm font-medium">{aircraft.baseCountry}</div>
                    </div>
                  )}
                  {aircraft.baseRegion && (
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Base Region</div>
                      <div className="text-gray-900 text-sm font-medium">{aircraft.baseRegion}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show Pilot Details for HL, PA, and UAS
  return (
    <div className="space-y-6">
      {/* Under 65 Section - Not for PA */}
      {!isPA && openPilotWarranty && (
        <div className="border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Users className="size-4 text-[#004225]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Age Requirement</h3>
          </div>
          <div className={`flex items-center justify-between p-4 rounded-lg border ${
            pilotsUnder65
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div>
              <div className="text-gray-500 text-[11px] font-medium mb-1 uppercase tracking-wider">All Pilots Under 65 Years</div>
              <div className={`text-sm font-semibold ${
                pilotsUnder65 ? 'text-[#004225]' : 'text-gray-600'
              }`}>
                {pilotsUnder65 ? 'Yes' : 'No'}
              </div>
            </div>
            <div className={`text-2xl ${pilotsUnder65 ? 'text-[#004225]' : 'text-gray-400'}`}>
              {pilotsUnder65 ? '✓' : '✗'}
            </div>
          </div>
        </div>
      )}

      {/* Pilot Warranty Section - Not for PA */}
      {!isPA && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <Users className="size-4 text-[#004225]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Pilot Warranty</h3>
          </div>

          <div className="space-y-4">
          {namedPilots && (
            <div className="border border-gray-200 rounded-lg p-5">
              <span className="text-[10px] font-bold text-[#004225] bg-[#004225]/10 px-2 py-1 rounded uppercase tracking-wider inline-block mb-4">
                Named Pilots
              </span>
              
              {Object.keys(aircraftTypeGroups).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(aircraftTypeGroups).map(([typeKey, aircrafts]: [string, any[]]) => {
                    const firstAircraft = aircrafts[0];
                    
                    return (
                      <div key={typeKey}>
                        <div className="text-gray-900 text-sm font-medium">
                          {firstAircraft.make} {firstAircraft.model}
                          <span className="text-gray-400 font-normal ml-1.5">
                            ({aircrafts.length} aircraft)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-500 text-sm mb-3">Named Pilots selected but no aircraft types configured</div>
              )}
              
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="text-gray-500 text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Named Pilots Document
                </div>
                <div className="text-sm">
                  {(() => {
                    // First try to find a document tagged as namedPilots
                    let namedPilotsDoc = placement.draftData?.documents?.find((doc: any) => doc.documentType === 'namedPilots');
                    
                    // If not found and namedPilots is true, assume the first document might be it
                    // (backwards compatibility for documents uploaded before we added the tag)
                    if (!namedPilotsDoc && placement.draftData?.namedPilots && placement.draftData?.documents?.length > 0) {
                      namedPilotsDoc = placement.draftData.documents[0];
                    }
                    
                    return namedPilotsDoc ? (
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-blue-600" />
                        <button
                          onClick={async () => {
                            if (!namedPilotsDoc.filePath) {
                              alert('This document was uploaded before file storage was implemented. Please re-upload it.');
                              return;
                            }
                            
                            try {
                              // Fetch signed URL from server
                              const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-afd91142/documents/url/${encodeURIComponent(namedPilotsDoc.filePath)}`, {
                                headers: {
                                  'Authorization': `Bearer ${publicAnonKey}`,
                                }
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                // Open document in new tab
                                window.open(data.signedUrl, '_blank');
                              } else {
                                alert('Failed to get download URL. Please try again.');
                              }
                            } catch (error) {
                              console.error('Error downloading document:', error);
                              alert('Failed to download document. Please try again.');
                            }
                          }}
                          className="text-gray-900 font-medium hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                        >
                          {namedPilotsDoc.name}
                        </button>
                        <span className="text-gray-500 text-xs">
                          ({(namedPilotsDoc.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">No document uploaded</span>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {openPilotWarranty && (
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-[10px] font-bold text-[#004225] bg-[#004225]/10 px-2 py-1 rounded uppercase tracking-wider">
                  OPW — Open Pilot Warranty
                </span>
              </div>
              
              {Object.keys(aircraftTypeGroups).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(aircraftTypeGroups).map(([typeKey, aircrafts]: [string, any[]]) => {
                    const firstAircraft = aircrafts[0];
                    const hours = opwHours[typeKey];
                    
                    console.log('DEBUG - Rendering OPW for typeKey:', typeKey);
                    console.log('DEBUG - Hours data:', hours);
                    
                    return (
                      <div key={typeKey} className="border border-gray-100 rounded-md p-4">
                        <div className="font-semibold text-gray-900 mb-3 text-sm">
                          {firstAircraft.make} {firstAircraft.model}
                          <span className="text-gray-500 font-normal ml-2">
                            ({aircrafts.length} {aircrafts.length === 1 ? 'aircraft' : 'aircraft'})
                          </span>
                        </div>
                        
                        {hours ? (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                                PIC Total Hours
                              </div>
                              <div className="text-gray-900 text-sm font-semibold">
                                {(() => {
                                  const value = hours.picTotalHours === 'other' ? hours.picTotalHoursOther : hours.picTotalHours;
                                  if (!value) return 'N/A';
                                  const num = parseInt(value);
                                  return isNaN(num) ? value : `${num.toLocaleString()}h`;
                                })()}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                                PIC Engine Hours
                              </div>
                              <div className="text-gray-900 text-sm font-semibold">
                                {(() => {
                                  const value = hours.picEngineHours === 'other' ? hours.picEngineHoursOther : hours.picEngineHours;
                                  if (!value) return 'N/A';
                                  const num = parseInt(value);
                                  return isNaN(num) ? value : `${num.toLocaleString()}h`;
                                })()}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                                PIC Make/Model Hours
                              </div>
                              <div className="text-gray-900 text-sm font-semibold">
                                {(() => {
                                  const value = hours.picMakeModelHours === 'other' ? hours.picMakeModelHoursOther : hours.picMakeModelHours;
                                  if (!value) return 'N/A';
                                  if (value === 'type_rated') return 'Type Rated';
                                  const num = parseInt(value);
                                  return isNaN(num) ? value : `${num.toLocaleString()}h`;
                                })()}
                              </div>
                            </div>
                            
                            {/* Co-Pilot Hours Row - Only show if any co-pilot data exists */}
                            {(hours.coPilotTotalHours || hours.coPilotTotalHoursOther || hours.coPilotEngineHours || hours.coPilotEngineHoursOther || hours.coPilotMakeModelHours || hours.coPilotMakeModelHoursOther) && (
                              <>
                                <div className="col-span-3 border-t border-gray-200 my-2"></div>
                                <div>
                                  <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                                    Co-Pilot Total Hours
                                  </div>
                                  <div className="text-gray-900 text-sm font-semibold">
                                    {(() => {
                                      const value = hours.coPilotTotalHours === 'other' ? hours.coPilotTotalHoursOther : hours.coPilotTotalHours;
                                      if (!value) return '—';
                                      const num = parseInt(value);
                                      return isNaN(num) ? value : `${num.toLocaleString()}h`;
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                                    Co-Pilot Engine Hours
                                  </div>
                                  <div className="text-gray-900 text-sm font-semibold">
                                    {(() => {
                                      const value = hours.coPilotEngineHours === 'other' ? hours.coPilotEngineHoursOther : hours.coPilotEngineHours;
                                      if (!value) return '—';
                                      const num = parseInt(value);
                                      return isNaN(num) ? value : `${num.toLocaleString()}h`;
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                                    Co-Pilot Make/Model Hours
                                  </div>
                                  <div className="text-gray-900 text-sm font-semibold">
                                    {(() => {
                                      const value = hours.coPilotMakeModelHours === 'other' ? hours.coPilotMakeModelHoursOther : hours.coPilotMakeModelHours;
                                      if (!value) return '—';
                                      if (value === 'type_rated') return 'Type Rated';
                                      const num = parseInt(value);
                                      return isNaN(num) ? value : `${num.toLocaleString()}h`;
                                    })()}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">No hours requirements specified</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">OPW selected but no aircraft types configured</div>
              )}
            </div>
          )}

          {!namedPilots && !openPilotWarranty && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <Users className="size-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No pilot warranty information provided</p>
            </div>
          )}
          </div>
        </div>
      )}

      {/* PA Coverage Details */}
      {isPA && fleet.length > 0 && (() => {
        const selectedSubCoverages = placement.draftData?.selectedSubCoverages || [];
        const hasCrewPA = selectedSubCoverages.includes('crew_personal_accident');
        const hasPaxPA = selectedSubCoverages.includes('passenger_personal_accident');
        const coverageTypeLabel = crewCoverageType === 'flight_risk' ? 'Flight Risk' : crewCoverageType === 'on_duty' ? 'On Duty' : crewCoverageType === '24_hour' ? '24 Hour' : crewCoverageType;
        
        // Calculate aggregates across fleet
        const totalCrewSeats = fleet.reduce((sum: number, a: any) => sum + (parseInt(a.crewSeats) || 0), 0);
        const totalPaxSeats = fleet.reduce((sum: number, a: any) => sum + (parseInt(a.paxSeats) || 0), 0);
        const crewPerSeat = parseInt(removeCommas(fleet[0]?.crewSumsReinsuredPerSeat || '0')) || 0;
        const paxPerSeat = parseInt(removeCommas(fleet[0]?.paxSumsReinsuredPerSeat || '0')) || 0;
        const crewAggregate = crewPerSeat * totalCrewSeats;
        const paxAggregate = paxPerSeat * totalPaxSeats;
        const crewCurrency = fleet[0]?.crewSumsReinsuredCurrency || 'USD';
        const paxCurrency = fleet[0]?.paxSumsReinsuredCurrency || 'USD';

        return (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <Shield className="size-4 text-[#004225]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Coverage Details</h3>
          </div>
          
          {/* Selected PA Types */}
          <div className="flex flex-wrap gap-2 mb-4">
            {hasCrewPA && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#004225] bg-[#004225]/10 border border-[#004225]/20 px-3 py-1.5 rounded-md uppercase tracking-wider">
                <Users className="size-3" />
                Crew Personal Accident
                {coverageTypeLabel && <span className="text-[#004225]/70 ml-1">— {coverageTypeLabel}</span>}
              </span>
            )}
            {hasPaxPA && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-md uppercase tracking-wider">
                <Users className="size-3" />
                Passenger Personal Accident
              </span>
            )}
          </div>

          {/* Per-Aircraft Breakdown */}
          <div className="space-y-4">
            {fleet.map((aircraft: any, idx: number) => {
              const acCrewPerSeat = parseInt(removeCommas(aircraft.crewSumsReinsuredPerSeat || '0')) || 0;
              const acPaxPerSeat = parseInt(removeCommas(aircraft.paxSumsReinsuredPerSeat || '0')) || 0;
              const acCrewSeats = parseInt(aircraft.crewSeats) || 0;
              const acPaxSeats = parseInt(aircraft.paxSeats) || 0;
              const acCrewCurrency = aircraft.crewSumsReinsuredCurrency || 'USD';
              const acPaxCurrency = aircraft.paxSumsReinsuredCurrency || 'USD';
              const acCrewAggregate = acCrewPerSeat * acCrewSeats;
              const acPaxAggregate = acPaxPerSeat * acPaxSeats;

              return (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-stretch">
                    {/* Row number */}
                    <div className="w-14 flex-shrink-0 flex items-center justify-center bg-gray-50 border-r border-gray-200">
                      <span className="text-lg font-bold text-gray-300">{idx + 1}</span>
                    </div>
                    
                    <div className="flex-1">
                      {/* Registration header */}
                      <div className="px-5 pt-3.5 pb-2 border-b border-gray-100">
                        <span className="text-xs text-gray-500">Registration: </span>
                        <span className="text-xs font-bold text-slate-900 uppercase">{aircraft.registration || '—'}</span>
                      </div>

                      {/* Coverage rows */}
                      <div className="divide-y divide-gray-100">
                        {hasCrewPA && acCrewPerSeat > 0 && (
                          <div className="px-5 py-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-gray-600">Crew Sums Reinsured Per Seat</span>
                              <span className="text-[13px] font-semibold text-[#004225]">{acCrewCurrency} {acCrewPerSeat.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-gray-400">Aggregate ({acCrewSeats} seat{acCrewSeats !== 1 ? 's' : ''})</span>
                              <span className="text-[13px] font-bold text-slate-900">{acCrewCurrency} {acCrewAggregate.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        {hasPaxPA && acPaxPerSeat > 0 && (
                          <div className="px-5 py-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-gray-600">Pax Sums Reinsured Per Seat</span>
                              <span className="text-[13px] font-semibold text-blue-700">{acPaxCurrency} {acPaxPerSeat.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-gray-400">Aggregate ({acPaxSeats} seat{acPaxSeats !== 1 ? 's' : ''})</span>
                              <span className="text-[13px] font-bold text-slate-900">{acPaxCurrency} {acPaxAggregate.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fleet Totals */}
          {(hasCrewPA || hasPaxPA) && (
            <div className="mt-4 bg-[#004225]/5 border border-[#004225]/15 rounded-lg overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-14 flex-shrink-0 flex items-center justify-center border-r border-[#004225]/15">
                  <span className="text-[10px] font-bold text-[#004225] uppercase tracking-wider">Total</span>
                </div>
                <div className="flex-1 px-5 py-3">
                  <div className="space-y-1.5">
                    {hasCrewPA && crewAggregate > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-gray-600">Crew PA — Total Aggregate ({totalCrewSeats} seat{totalCrewSeats !== 1 ? 's' : ''})</span>
                        <span className="text-[13px] font-bold text-[#004225]">{crewCurrency} {crewAggregate.toLocaleString()}</span>
                      </div>
                    )}
                    {hasPaxPA && paxAggregate > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-gray-600">Pax PA — Total Aggregate ({totalPaxSeats} seat{totalPaxSeats !== 1 ? 's' : ''})</span>
                        <span className="text-[13px] font-bold text-blue-700">{paxCurrency} {paxAggregate.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Per Occurrence Totals */}
          {(fleet[0]?.crewTotalPerOccurrence || fleet[0]?.paxTotalPerOccurrence) && (
            <div className="mt-4 bg-white border border-gray-200 rounded-lg p-5">
              <div className="grid grid-cols-2 gap-6">
                {fleet[0].crewTotalPerOccurrence && (
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">
                      Crew Total Per Occurrence
                    </div>
                    <div className="text-gray-900 text-lg font-semibold">
                      {fleet[0].crewTotalPerOccurrenceCurrency} {parseInt(removeCommas(fleet[0].crewTotalPerOccurrence))?.toLocaleString()}
                    </div>
                  </div>
                )}
                {fleet[0].paxTotalPerOccurrence && (
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">
                      Passenger Total Per Occurrence
                    </div>
                    <div className="text-gray-900 text-lg font-semibold">
                      {fleet[0].paxTotalPerOccurrenceCurrency} {parseInt(removeCommas(fleet[0].paxTotalPerOccurrence))?.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* Crew Members Section (for PA coverage) */}
      {crewMembers.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <Users className="size-4 text-[#004225]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Crew Coverage</h3>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-5">
            {crewCoverageType && (
              <div className="mb-4">
                <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                  Coverage Type
                </div>
                <div className="text-gray-900 text-sm font-semibold">
                  {crewCoverageType === 'unnamed' ? 'Unnamed Crew' : 'Named Crew'}
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {crewMembers.map((member: any, index: number) => (
                <div key={index} className="border border-gray-100 rounded-md p-4">
                  <div className="grid grid-cols-[2fr_0.7fr_1fr_1.5fr] gap-4">
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Name</div>
                      <div className="text-gray-900 text-sm font-medium">{member.name || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Age</div>
                      <div className="text-gray-900 text-sm font-medium">{member.age || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Role</div>
                      <div className="text-gray-900 text-sm font-medium">{member.position || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Limit</div>
                      <div className="text-gray-900 text-sm font-medium">
                        {member.sumsInsuredCurrency || '$'}{member.sumsInsured || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Claims History Tab
function ClaimsHistoryTab({ placement }: { placement: Placement }) {
  const claims = placement.draftData?.claims || [];
  const hasClaimsHistory = placement.draftData?.hasClaimsHistory;

  // Filter claims to only show those for this specific product code
  const relevantClaims = claims.filter((claim: any) => claim.claimType === placement.productCode);

  const getProductName = (code: string) => {
    const products: Record<string, string> = {
      HL: "Hull & Liability",
      HW: "Hull War",
      PA: "Personal Accident",
      LOL: "Loss of Licence",
      HD: "Hull Deductible",
      UAS: "Drone Insurance",
    };
    return products[code] || code;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-4">
        <AlertTriangle className="size-4 text-[#004225]" />
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Claims History</h3>
        {relevantClaims.length > 0 && (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{relevantClaims.length} claims</span>
        )}
      </div>
      
      {!hasClaimsHistory || relevantClaims.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="size-8 text-[#004225]/30 mx-auto mb-1.5" />
          <p className="text-gray-700 text-xs font-semibold">No Claims History</p>
          <p className="text-gray-400 text-[10px] mt-0.5">Clean claims record</p>
        </div>
      ) : (
        <div className="space-y-2">
          {relevantClaims.map((claim: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-gray-400 text-[10px] font-medium mb-1 uppercase tracking-wide">Date</div>
                  <div className="text-gray-900 text-xs font-semibold">
                    {claim.claimDate ? new Date(claim.claimDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).toUpperCase() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px] font-medium mb-1 uppercase tracking-wide">Type</div>
                  <div className="text-gray-900 text-xs font-semibold">{getProductName(claim.claimType) || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px] font-medium mb-1 uppercase tracking-wide">Amount $</div>
                  <div className="text-gray-900 text-xs font-semibold">
                    {claim.amountPaid || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px] font-medium mb-1 uppercase tracking-wide">Status</div>
                  <div className="text-gray-900 text-xs font-semibold capitalize">{claim.claimStatus || 'N/A'}</div>
                </div>
              </div>
              {claim.description && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-gray-400 text-[10px] font-medium mb-0.5 uppercase tracking-wide">Description</div>
                  <div className="text-gray-700 text-xs">{claim.description}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ COMPLIANCE BANNER COMPONENT ═══
function ComplianceBanner({ placement, onRecheck }: { placement: Placement; onRecheck?: (id: string) => Promise<void> }) {
  const [isRechecking, setIsRechecking] = useState(false);
  const cd = placement.complianceData;
  if (!cd) return null;
  
  const flaggedEntities = cd.entities.filter(e => !e.cleared);
  const lastCheck = cd.lastRefreshAt || cd.checkedAt;
  const timeSinceCheck = lastCheck ? Math.round((Date.now() - new Date(lastCheck).getTime()) / 60000) : null;
  
  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      await onRecheck?.(placement.id);
    } finally {
      setIsRechecking(false);
    }
  };

  return (
    <div className="mx-0 mt-3 border border-purple-200 bg-purple-50/80 rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg shrink-0 mt-0.5">
            <Shield className="size-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-purple-900">Compliance Review Required</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-700 rounded-full">
                Sanctions Screening
              </span>
            </div>
            <p className="text-xs text-purple-700 mb-3">
              One or more entities have been flagged during sanctions screening. This submission is held pending compliance clearance
              and will not be visible to underwriters until cleared.
            </p>
            
            {/* Flagged entities */}
            <div className="space-y-2 mb-3">
              {flaggedEntities.map((entity, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/60 border border-purple-200 rounded-lg px-3 py-2">
                  <XCircle className="size-3.5 text-red-500 shrink-0" />
                  <span className="text-xs font-semibold text-gray-900">{entity.name}</span>
                  <span className="text-[10px] font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                    {entity.type.replace('_', ' ')}
                  </span>
                  {entity.sanctionDetails && (
                    <span className="text-[10px] text-red-600 ml-auto">
                      {entity.sanctionDetails.programs?.join(', ') || 'Sanctions match found'}
                    </span>
                  )}
                </div>
              ))}
              {/* Clear entities */}
              {cd.entities.filter(e => e.cleared).map((entity, i) => (
                <div key={`clear-${i}`} className="flex items-center gap-2 bg-white/40 border border-gray-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">{entity.name}</span>
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                    {entity.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-green-600 ml-auto">Cleared</span>
                </div>
              ))}
            </div>

            {/* Actions & info */}
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-purple-600">
                {timeSinceCheck !== null && (
                  <span>Last checked: {timeSinceCheck < 1 ? 'just now' : timeSinceCheck < 60 ? `${timeSinceCheck}m ago` : `${Math.round(timeSinceCheck / 60)}h ago`}</span>
                )}
                <span className="ml-2 text-purple-400">• Auto-refreshes every 30 minutes</span>
              </div>
              <button
                onClick={handleRecheck}
                disabled={isRechecking}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isRechecking ? (
                  <>
                    <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Re-checking...
                  </>
                ) : (
                  <>
                    <Shield className="size-3" />
                    Re-check Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Documents Tab
function DocumentsTab({ placement, currentUser, onUpdatePlacement, lineslips = [], contacts = [] }: { placement: Placement; currentUser?: any; onUpdatePlacement?: (placement: Placement) => void; lineslips?: Lineslip[]; contacts?: Contact[] }) {
  const [documents, setDocuments] = useState<any[]>(placement.draftData?.documents || []);
  const [isUploading, setIsUploading] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  console.log('DocumentsTab - onUpdatePlacement:', typeof onUpdatePlacement);

  // Find the matching lineslip for this placement
  const matchingLineslip = lineslips.find((ls) => {
    // Match by facilityRef or by product code + selectedLineslips
    if (placement.facilityRef && ls.reference === placement.facilityRef) return true;
    const selectedLineslipId = placement.draftData?.selectedLineslips?.[placement.productCode];
    if (selectedLineslipId && ls.id === selectedLineslipId) return true;
    return false;
  });

  // Determine which auto-generated documents to show based on status
  const isQuoted = ["quoted", "firmorder", "bound", "ntu"].includes(placement.status);
  const isBound = ["bound"].includes(placement.status);
  const hasQuote = placement.quotes && placement.quotes.length > 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      console.log('Current user data:', currentUser);
      const uploaderName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown User';
      console.log('Uploader name:', uploaderName);
      
      const newDocuments: any[] = [];

      // Upload each file to Supabase Storage
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('placementId', placement.id);
        formData.append('documentType', 'general');

        const uploadResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-afd91142/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errData = await uploadResponse.json().catch(() => ({}));
          console.error('Failed to upload file:', file.name, errData);
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadData = await uploadResponse.json();
        console.log('File uploaded to storage:', uploadData);

        newDocuments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedDate: new Date().toISOString(),
          uploadedBy: uploaderName,
          filePath: uploadData.filePath,
        });
      }
      
      console.log('New documents uploaded:', newDocuments);

      const updatedDocuments = [...documents, ...newDocuments];
      setDocuments(updatedDocuments);

      // Save to database
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-afd91142/placements/${placement.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          draftData: {
            ...placement.draftData,
            documents: updatedDocuments,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document metadata');
      }

      console.log('Documents saved successfully');
      console.log('About to call onUpdatePlacement:', typeof onUpdatePlacement);
      
      // Update parent state
      if (onUpdatePlacement) {
        console.log('Calling onUpdatePlacement with documents:', updatedDocuments.length);
        onUpdatePlacement({
          ...placement,
          draftData: {
            ...placement.draftData,
            documents: updatedDocuments,
          },
        });
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload documents');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Determine if we're in firm order status (not yet bound but firm order docs needed)
  const isFirmOrder = ["firmorder"].includes(placement.status);

  return (
    <div className="space-y-6">

      {/* ═══ UPLOADED DOCUMENTS ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em]">Uploaded Documents</h4>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <div className="bg-[#004225] hover:bg-[#003320] text-white px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors">
              <Upload className="size-3" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </div>
          </label>
        </div>

        {documents.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-lg py-8 text-center">
            <Upload className="size-5 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-xs">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {documents.map((doc: any, index: number) => (
              <div key={index} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                    <FileText className="size-3.5 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{formatFileSize(doc.size)}</div>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Date</div>
                  <div className="text-xs text-gray-600">
                    {new Date(doc.uploadedDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }).toUpperCase()}
                  </div>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Uploaded By</div>
                  <div className="text-xs text-gray-600">{doc.uploadedBy || 'Unknown'}</div>
                </div>
                <button
                  onClick={async () => {
                    if (!doc.filePath) {
                      alert('This document was uploaded before file storage was implemented. Please re-upload it.');
                      return;
                    }
                    try {
                      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-afd91142/documents/url/${encodeURIComponent(doc.filePath)}`, {
                        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
                      });
                      if (response.ok) {
                        const data = await response.json();
                        const link = document.createElement('a');
                        link.href = data.signedUrl;
                        link.download = doc.name || 'document';
                        link.target = '_blank';
                        link.click();
                      } else {
                        alert('Failed to get download URL. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error downloading document:', error);
                      alert('Failed to download document. Please try again.');
                    }
                  }}
                  className="shrink-0 border border-gray-200 hover:border-[#004225] hover:text-[#004225] text-gray-600 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="size-3" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ SANCTIONS CERTIFICATES ═══ */}
      {placement.complianceData?.certificates && placement.complianceData.certificates.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-3">Sanctions Screening Certificates</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {placement.complianceData.certificates
              .filter((cert, idx, arr) => {
                // Show only the latest certificate per entity
                const laterIdx = arr.findIndex((c, i) => i > idx && c.entityName === cert.entityName);
                return laterIdx === -1;
              })
              .map((cert) => (
              <div key={cert.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                <div className="shrink-0">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${cert.result === "clear" ? "bg-green-50" : "bg-red-50"}`}>
                    {cert.result === "clear" ? (
                      <CheckCircle2 className="size-3.5 text-green-500" />
                    ) : (
                      <XCircle className="size-3.5 text-red-500" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{cert.entityName}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                      cert.result === "clear" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {cert.result === "clear" ? "CLEARED" : "HIT"}
                    </span>
                    <span className="capitalize">{cert.entityType.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Screened</div>
                  <div className="text-xs text-gray-600">
                    {new Date(cert.checkedAt).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    }).toUpperCase()}
                  </div>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Time</div>
                  <div className="text-xs text-gray-600">
                    {new Date(cert.checkedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ GENERATED QUOTE DOCUMENTS ═══ */}
      {isQuoted && hasQuote && (
        <div>
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-3">Generated Quote Documents</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <SlipDocumentViewer
              placement={placement}
              lineslip={matchingLineslip}
              documentType="quotation"
              embedded
            />
          </div>
        </div>
      )}

      {/* ═══ GENERATED FIRM ORDER DOCUMENTS ═══ */}
      {(isFirmOrder || isBound) && hasQuote && (
        <div>
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-3">Generated Firm Order Documents</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
            <SlipDocumentViewer
              placement={placement}
              lineslip={matchingLineslip}
              documentType="firmorder"
              embedded
            />
            <SlipDocumentViewer
              placement={placement}
              lineslip={matchingLineslip}
              documentType="eoc_covering_letter"
              embedded
              currentUser={currentUser}
            />
            <SlipDocumentViewer
              placement={placement}
              lineslip={matchingLineslip}
              documentType="claims_document"
              embedded
            />
          </div>
        </div>
      )}

      {/* Audit Trail Button & Panel */}
      {placement.status !== "draft" && (
        <div className="mt-4">
          <button
            onClick={() => setShowAuditTrail(!showAuditTrail)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 text-gray-400 group-hover:text-[#004225] transition-colors" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-[#004225] transition-colors">Audit Trail</span>
            </div>
            <svg className={`size-4 text-gray-400 transition-transform duration-200 ${showAuditTrail ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>

          {showAuditTrail && (() => {
            // Helper: look up a contact's company by full name or email
            const lookupCompany = (fullName?: string, email?: string) => {
              if (!contacts.length) return "";
              if (email) {
                const byEmail = contacts.find(c => c.email?.toLowerCase() === email.toLowerCase());
                if (byEmail?.company) return byEmail.company;
              }
              if (fullName) {
                const match = contacts.find(c => `${c.firstName} ${c.lastName}` === fullName);
                if (match?.company) return match.company;
              }
              return "";
            };
            // Helper: look up a contact's full name by email
            const lookupName = (email?: string) => {
              if (!email || !contacts.length) return "";
              const match = contacts.find(c => c.email?.toLowerCase() === email.toLowerCase());
              return match ? `${match.firstName} ${match.lastName}` : "";
            };
              // Derive stage completion from status for placements created before audit fields existed
              const isAccepted = !!(placement.acceptedByName || placement.status === "firmorder" || placement.status === "bound");
              const isBound = !!(placement.boundByName || placement.status === "bound");

              // Resolve accepted display info — fall back to submitter (broker) for pre-existing placements
              const acceptedName = placement.acceptedByName || (isAccepted ? (placement.submittedByName || lookupName(placement.submittedBy) || "—") : "");
              const acceptedCompany = placement.acceptedByCompany || (isAccepted ? (placement.submittedByCompany || lookupCompany(placement.submittedByName, placement.submittedBy) || lookupCompany(acceptedName)) : "");
              // Resolve bound display info — fall back to latest quote underwriter for pre-existing placements
              const lastQuote = placement.quotes?.[placement.quotes.length - 1];
              const lastQuoteDate = lastQuote?.submittedDate || "";
              const acceptedDate = placement.acceptedDate || (isAccepted ? lastQuoteDate : "");

              const boundName = placement.boundByName || (isBound ? (lastQuote?.underwriterName || "—") : "");
              const boundCompany = placement.boundByCompany || (isBound ? (lastQuote?.underwriterCompany || lookupCompany(boundName)) : "");
              const boundDateVal = placement.boundDate || (isBound ? lastQuoteDate : "");

              return (
            <div className="mt-2 border border-gray-200 rounded-lg bg-white p-5">
              <div className="flex items-center gap-0">
                {/* Submitted */}
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-[#004225] flex items-center justify-center">
                      <CheckCircle2 className="size-2 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#004225] uppercase tracking-wider">Submitted</div>
                    <div className="text-[11px] text-gray-800 font-semibold">{placement.submittedByName || lookupName(placement.submittedBy) || "—"}</div>
                    <div className="text-[10px] text-gray-500">{placement.submittedByCompany || lookupCompany(placement.submittedByName, placement.submittedBy) || ""}</div>
                    <div className="text-[10px] text-gray-400">{placement.submittedDate ? new Date(placement.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : ""}</div>
                  </div>
                </div>

                {/* Connector */}
                <div className={`flex-1 mx-3 ${placement.quotes && placement.quotes.length > 0 ? "border-t-2 border-[#004225]" : "border-t-2 border-dashed border-gray-300"}`} />

                {/* Quoted */}
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${placement.quotes && placement.quotes.length > 0 ? "bg-[#004225]" : "bg-gray-300"}`}>
                      {placement.quotes && placement.quotes.length > 0 && <CheckCircle2 className="size-2 text-white" />}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${placement.quotes && placement.quotes.length > 0 ? "text-[#004225]" : "text-gray-400"}`}>Quoted</div>
                    {placement.quotes && placement.quotes.length > 0 ? (
                      <>
                        <div className="text-[11px] text-gray-800 font-semibold">{placement.quotes[placement.quotes.length - 1].underwriterName}</div>
                        <div className="text-[10px] text-gray-500">{placement.quotes[placement.quotes.length - 1].underwriterCompany || lookupCompany(placement.quotes[placement.quotes.length - 1].underwriterName) || ""}</div>
                        <div className="text-[10px] text-gray-400">{new Date(placement.quotes[placement.quotes.length - 1].submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</div>
                      </>
                    ) : (
                      <div className="text-[11px] text-gray-300 italic">Pending</div>
                    )}
                  </div>
                </div>

                {/* Connector */}
                <div className={`flex-1 mx-3 ${isAccepted ? "border-t-2 border-[#004225]" : "border-t-2 border-dashed border-gray-300"}`} />

                {/* Accepted */}
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${isAccepted ? "bg-[#004225]" : "bg-gray-300"}`}>
                      {isAccepted && <CheckCircle2 className="size-2 text-white" />}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isAccepted ? "text-[#004225]" : "text-gray-400"}`}>Accepted</div>
                    {isAccepted ? (
                      <>
                        <div className="text-[11px] text-gray-800 font-semibold">{acceptedName}</div>
                        <div className="text-[10px] text-gray-500">{acceptedCompany}</div>
                        {acceptedDate && <div className="text-[10px] text-gray-400">{new Date(acceptedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</div>}
                      </>
                    ) : (
                      <div className="text-[11px] text-gray-300 italic">Pending</div>
                    )}
                  </div>
                </div>

                {/* Connector */}
                <div className={`flex-1 mx-3 ${isBound ? "border-t-2 border-[#004225]" : "border-t-2 border-dashed border-gray-300"}`} />

                {/* Bound */}
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${isBound ? "bg-[#004225]" : "bg-gray-300"}`}>
                      {isBound && <CheckCircle2 className="size-2 text-white" />}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isBound ? "text-[#004225]" : "text-gray-400"}`}>Bound</div>
                    {isBound ? (
                      <>
                        <div className="text-[11px] text-gray-800 font-semibold">{boundName}</div>
                        <div className="text-[10px] text-gray-500">{boundCompany}</div>
                        {boundDateVal && <div className="text-[10px] text-gray-400">{new Date(boundDateVal).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</div>}
                      </>
                    ) : (
                      <div className="text-[11px] text-gray-300 italic">Pending</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
              );
          })()}
        </div>
      )}
    </div>
  );
}