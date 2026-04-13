import { LayoutDashboard, FileText, Menu, LogOut, BarChart3, Users, Clipboard, ShieldCheck } from "lucide-react";
import { LineslipForm } from "./components/LineslipForm";
import { ReportsPage } from "./components/ReportsPage";
import { ContactManager } from "./components/ContactManager";
import flightdeckLogo from "./assets/58f0b9636c069a6dfa82df8f45f38ac049229655.png";
import { projectId, publicAnonKey } from './utils/supabase/info';
import { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { PlacementDashboard } from "./components/PlacementDashboard";
import { PlacementForm } from "./components/PlacementForm";
import { UnderwriterReview } from "./components/UnderwriterReview";
import { LineslipManager } from "./components/LineslipManager";
import { BinderManager } from "./components/BinderManager";
import { ContactForm } from "./components/ContactForm";
import { PlacementDetailView } from "./components/PlacementDetailView";
import { DebugLineslipViewer } from "./components/DebugLineslipViewer";
import { notifyPending, notifyQuoted } from "./utils/notifications";
import { generateQuoteSlipBase64 } from "./components/SlipDocumentViewer";
import { calculateBinderQuote, isEligibleForAutoQuote } from "./utils/binderAutoQuote";

export type UserRole = "broker" | "underwriter";

export type PlacementStatus = "draft" | "compliance" | "pending" | "quoted" | "firmorder" | "bound" | "declined" | "ntu";

export type LineslipStatus = "active" | "paused" | "stopped" | "expired";

export type ProductCode = "HL" | "HW" | "PA" | "LOL" | "HD" | "UAS";

export type ContactType = "Broker" | "Producing Broker" | "Underwriter" | "Insured" | "Cedent";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  type: ContactType;
  insuredName?: string; // Only for Insured type - replaces firstName/lastName/company
  cedentName?: string; // Only for Cedent type - replaces firstName/lastName/company
  password?: string; // For Broker and Underwriter types
  permissions?: string[]; // Only for Broker type - e.g., ["Super-Admin", "Admin", "Senior", "Broker"]
  brokerContactId?: string; // Only for Producing Broker type - references a Broker contact
  ourCommission?: number; // Only for Producing Broker type - our percentage (0-100)
  producingBrokerCommission?: number; // Only for Producing Broker type - their percentage (0-100)
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  mobilePhone?: string; // For Broker and Underwriter types - includes country code
  createdDate: string;
  lastModified: string;
}

export interface LineslipUnderwriter {
  id: string;
  name: string;
  security: string;
  percentage: number;
  role: "Lead" | "Delegated Support";
}

export interface SlipWordingSection {
  id: string;
  title: string;
  content: string;
  type: "fixed" | "variable";
  order: number;
}

export interface Lineslip {
  id: string;
  name: string;
  reference: string;
  productCode: ProductCode;
  productName: string;
  placementType?: "insurance" | "reinsurance";
  status: "active" | "paused" | "stopped" | "expired";
  startDate: string;
  endDate: string;
  overallLimit: number;
  maxHullLimitFixedWing?: number;
  maxLiabilityLimitFixedWing?: number;
  maxHullLimitRotaryWing?: number;
  maxLiabilityLimitRotaryWing?: number;
  maximumAircraftValue?: number;
  overallAggregate?: number;
  maxSumInsuredPerSeat?: number;
  aggregatePA?: number;
  maxSumInsuredPerPersonLOL?: number;
  aggregateLOL?: number;
  insuranceCompositeBrokerage?: number;
  reinsuranceCompositeBrokerage?: number;
  underwriters: LineslipUnderwriter[];
  wordings: string | string[] | SlipWordingSection[];
  insuranceWordings?: SlipWordingSection[];
  reinsuranceWordings?: SlipWordingSection[];
  insuranceWordings24hPA?: SlipWordingSection[];
  reinsuranceWordings24hPA?: SlipWordingSection[];
  countries: string[];
  createdDate: string;
  lastModified: string;
  attachments?: { id: string; name: string; size: number; uploadDate: string }[];
  authorisedUnderwriterContactIds?: string[]; // Contact IDs of underwriters authorised to quote/view risks
  authorisedProducingBrokerIds?: string[]; // Contact IDs of producing brokers authorised to submit on this lineslip
  // ── Document configuration (EOC Covering Letter & Claims Document) ──
  eocLetterData?: {
    // Insurance version
    insuranceSenderAddress?: string;
    insuranceClientDetails?: string;
    insuranceDateLine?: string;
    insuranceSubjectLine?: string;
    insuranceWelcomeText?: string;
    insurancePremiumPaymentTerms?: string;
    insuranceCommission?: string;
    insuranceTermsAndConditions?: string;
    insuranceDutyOfDisclosure?: string;
    // Reinsurance version
    reinsuranceSenderAddress?: string;
    reinsuranceClientDetails?: string;
    reinsuranceDateLine?: string;
    reinsuranceSubjectLine?: string;
    reinsuranceWelcomeText?: string;
    reinsurancePremiumPaymentTerms?: string;
    reinsuranceCommission?: string;
    reinsuranceTermsAndConditions?: string;
    reinsuranceDutyOfDisclosure?: string;
    // Legacy / shared
    clientDetails?: string;
    dateLine?: string;
    subjectLine?: string;
    welcomeText?: string;
    premiumPaymentTerms?: string;
    commission?: string;
    termsAndConditions?: string;
    dutyOfDisclosure?: string;
    customSubject?: string;
    additionalNotes?: string;
    closingText?: string;
  };
  claimsDocData?: {
    claimsContactName?: string;
    claimsContactEmail?: string;
    claimsContactPhone?: string;
    claimsHandlerCompany?: string;
    notificationPeriodDays?: number;
    additionalProcedures?: string;
  };
}

export interface BinderRating {
  // Hull rates (% of agreed value) — simple fallback for HW/HD
  hullRateFixedWing: number;
  hullRateRotaryWing: number;
  // Base currency for all rate table band thresholds (defaults to USD)
  rateTableCurrency?: string;
  // Hull rate tables (HL product — by value band × engine category)
  hullRateTableFW?: { maxValue: number; sep: number; mep: number; set: number; met: number }[];
  hullRateTableRW?: { maxValue: number; sep: number; mep: number; set: number; met: number }[];
  // Liability rate tables (HL product — flat amounts by limit band × engine category)
  liabilityRateTableFW?: { maxLimit: number; sep: number; mep: number; set: number; met: number }[];
  liabilityRateTableRW?: { maxLimit: number; sep: number; mep: number; set: number; met: number }[];
  // Liability — simple fallback for UAS
  liabilityRateType: "per_seat" | "flat" | "percentage";
  liabilityRate: number;
  liabilityCurrency: string;
  // Liability per-seat (kept alongside rate tables for HL)
  liabilityPerSeatRate?: number;
  liabilityPerSeatCurrency?: string;
  // PPH rate tables (flat amounts by PPH limit band × engine category)
  pphRateTableFW?: { maxLimit: number; sep: number; mep: number; set: number; met: number }[];
  pphRateTableRW?: { maxLimit: number; sep: number; mep: number; set: number; met: number }[];
  // PPH — simple fallback rate
  pphRate: number;
  // War rate (HW product)
  warRate: number;
  // Minimum premium
  // Age loading (aircraft age → additional premium %)
  ageLoadings: { fromYears: number; toYears: number; loadingPercent: number }[];
  // PA / LOL specific
  paRatePerSeat?: number;
  paRateTable?: { maxLimit: number; flightRiskOnly: number; twentyFourHour: number }[];
  // PA 24-Hour rate table (2D: Sum Insured × Age Band — same structure as LOL)
  pa24hAgeBands?: { minAge: number; maxAge: number }[];
  pa24hRateTable?: { maxLimit: number; rates: number[] }[];
  lolRatePerPilot?: number;
  lolRateTable?: { maxLimit: number; rates: number[] }[];
  lolAgeBands?: { minAge: number; maxAge: number }[];
  // Approved uses for auto-quoting eligibility
  approvedUses?: string[];
  // HD (Hull Deductible) rate tables — Rate on Line by Sums Reinsured band × engine category
  hdRateTableFW?: { maxSumReinsured: number; mej: number; metp: number; setp: number }[];
  hdRateTableRW?: { maxSumReinsured: number; tet: number; set: number; tep: number }[];
  // UAS (Drone) rate tables — Hull (% of agreed value) and Liability (flat premium) by drone type
  uasHullRateTable?: { maxValue: number; mr: number; fw: number; hv: number }[];
  uasLiabilityRateTable?: { maxLimit: number; mr: number; fw: number; hv: number }[];
}

export interface Binder extends Lineslip {
  facilityType: "binder";
  ratingRules: BinderRating;
  combinedLineLimitFW?: number; // Max combined hull + liability this market will bind for Fixed Wing (USD)
  combinedLineLimitRW?: number; // Max combined hull + liability this market will bind for Rotary Wing (USD)
  policyWording?: string; // Wording reference — binders must share wordings to stack in Binder Builder
}

export interface Placement {
  id: string;
  reference: string;
  facilityRef: string;
  brokerName: string;
  brokerCompany: string;
  insuredName: string;
  aircraftType: string;
  productCode: string;
  coverageType: string;
  hullValue: number;
  liability: number;
  submittedDate: string;
  inceptionDate: string;
  status: PlacementStatus;
  quotes?: Quote[];
  declineReason?: string;
  declineReasonDetail?: string;
  draftStep?: number; // Store the current step for draft placements
  draftData?: any; // Store all form data for draft placements
  submittedBy?: string; // Email of the user who submitted
  submittedByName?: string; // Full name of the user who submitted
  submittedByCompany?: string; // Company of the user who submitted
  boundByName?: string; // Name of the underwriter who bound the placement
  boundByCompany?: string; // Company of the underwriter who bound the placement
  boundDate?: string; // Date the placement was bound
  acceptedByName?: string; // Name of the broker who accepted the quote (firm order)
  acceptedByCompany?: string; // Company of the broker who accepted the quote
  acceptedDate?: string; // Date the quote was accepted
  // Compliance / sanctions screening
  complianceData?: {
    status: "pending_review" | "cleared" | "flagged";
    checkedAt: string;
    entities: { name: string; type: "insured" | "reinsured" | "additional_insured"; cleared: boolean; sanctionDetails?: any }[];
    clearedAt?: string;
    certificates?: { id: string; entityName: string; entityType: string; checkedAt: string; result: "clear" | "hit"; details?: string }[];
    lastRefreshAt?: string;
  };
}

export interface Quote {
  id: string;
  underwriterName: string;
  underwriterCompany?: string;
  premium: number; // Total calculated premium
  currency: string;
  writtenLine: number;
  hullRates: { registration: string; aircraftType: string; hullValue: number; rate: number; hullPremium: number }[];
  hullPremiumTotal: number;
  liabilityPremium: number;
  liabilityRates?: { registration: string; liabilityType: string; liabilityLimit: number; premium: number }[];
  sparesPremium?: number;
  sparesRate?: number;
  sparesIncludedInHull?: boolean;
  pphPremium?: number;
  quoteValidUntil?: string;
  endorsements?: string;
  confiscationIncluded?: boolean; // HW only: true = Including, false = Excluding confiscation (LSW555D)
  terms: string;
  submittedDate: string;
  // ── Quotation PDF snapshot — frozen at quote time so the quote PDF never changes ──
  placementSnapshot?: {
    draftData: Record<string, any>;
    insuredName: string;
    productCode: string;
    brokerName: string;
    brokerCompany: string;
    reference: string;
    facilityRef?: string;
    inceptionDate?: string;
    expiryDate?: string;
  };
  // Allow additional properties from quote form
  originalInceptionDate?: string;
  originalExpiryDate?: string;
  [key: string]: any;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Contact | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("broker");
  const [currentView, setCurrentView] = useState<"dashboard" | "submit" | "review" | "lineslipManager" | "lineslipForm" | "lineslipReports" | "contactManager" | "placementDetail" | "debugHW" | "binderManager" | "binderForm">("dashboard");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingLineslip, setEditingLineslip] = useState<Lineslip | null>(null);
  const [editingBinder, setEditingBinder] = useState<Binder | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [_isDarkMode, _setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('aerocover-dark-mode');
    return saved === 'true';
  });
  
  // Initialize with Super Admin user
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "CON-001",
      firstName: "Isaac",
      lastName: "Fuente",
      email: "isaacbenfuente@gmail.com",
      phone: "",
      company: "AeroCover",
      role: "Super Administrator",
      type: "Broker",
      password: "Windows011",
      permissions: ["Super-Admin", "Admin", "Senior", "Broker"],
      createdDate: new Date().toISOString().split("T")[0],
      lastModified: new Date().toISOString().split("T")[0],
      notes: "System Super Administrator - Full Access",
    }
  ]);
  const [lineslips, setLineslips] = useState<Lineslip[]>([]);
  const [binders, setBinders] = useState<Binder[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLineslips, setIsLoadingLineslips] = useState(true);
  const [isLoadingBinders, setIsLoadingBinders] = useState(true);
  const [isLoadingPlacements, setIsLoadingPlacements] = useState(true);

  // Load placements from database on mount
  useEffect(() => {
    const loadPlacements = async () => {
      try {
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
        
        // Load placements from database
        const response = await fetch(`${serverUrl}/placements`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Debug log to check excludedCountries after loading
          data.placements?.forEach((p: Placement) => {
            if (p.draftData?.excludedCountries?.length > 0) {
              console.log(`🌍 Loaded placement ${p.id} with excluded countries:`, p.draftData.excludedCountries);
            }
          });
          
          setPlacements(data.placements || []);
          console.log('✅ Loaded placements from database:', data.placements?.length || 0);
        }
        
      } catch (error) {
        console.error('Error loading placements:', error);
      } finally {
        setIsLoadingPlacements(false);
      }
    };

    loadPlacements();
  }, []);

  // Load contacts from database on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
        
        const response = await fetch(`${serverUrl}/contacts`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Keep the super admin, but load others from database
          const loadedContacts = data.contacts || [];
          const superAdmin = contacts[0]; // The hardcoded super admin
          
          // If there are loaded contacts, use them along with super admin
          if (loadedContacts.length > 0) {
            setContacts(loadedContacts);
          } else {
            // No contacts in DB, just keep super admin
            setContacts([superAdmin]);
          }
          console.log('✅ Loaded contacts from database:', loadedContacts.length);
        }
        
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, []);

  // Load lineslips from database on mount
  useEffect(() => {
    const loadLineslips = async () => {
      try {
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
        
        const response = await fetch(`${serverUrl}/lineslips`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setLineslips(data.lineslips || []);
          console.log('✅ Loaded lineslips from database:', data.lineslips?.length || 0);
        }
        
      } catch (error) {
        console.error('Error loading lineslips:', error);
      } finally {
        setIsLoadingLineslips(false);
      }
    };

    loadLineslips();
  }, []);

  // Load binders from database on mount
  useEffect(() => {
    const loadBinders = async () => {
      try {
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
        
        const response = await fetch(`${serverUrl}/binders`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setBinders(data.binders || []);
          console.log('✅ Loaded binders from database:', data.binders?.length || 0);
        }
        
      } catch (error) {
        console.error('Error loading binders:', error);
      } finally {
        setIsLoadingBinders(false);
      }
    };

    loadBinders();
  }, []);

  // Save placements to database whenever they change
  useEffect(() => {
    if (!isLoadingPlacements) {
      const savePlacements = async () => {
        try {
          const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
          
          // Debug log to check excludedCountries before saving
          placements.forEach(p => {
            if (p.draftData?.excludedCountries?.length > 0) {
              console.log(`🌍 Saving placement ${p.id} with excluded countries:`, p.draftData.excludedCountries);
            }
          });
          
          await fetch(`${serverUrl}/placements`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ placements }),
          });
        } catch (error) {
          console.error('Error saving placements to database:', error);
        }
      };

      savePlacements();
    }
  }, [placements, isLoadingPlacements]);

  // Save contacts to database whenever they change
  useEffect(() => {
    if (!isLoading) {
      const abortController = new AbortController();
      
      const saveContacts = async (retries = 2) => {
        try {
          const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
          const response = await fetch(`${serverUrl}/contacts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contacts }),
            signal: abortController.signal,
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('Server error saving contacts:', response.status, errData);
          }
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            // Request was intentionally aborted — ignore
            return;
          }
          if (retries > 0) {
            console.warn(`Retrying contact save (${retries} retries left)...`);
            await new Promise(r => setTimeout(r, 1000));
            return saveContacts(retries - 1);
          }
          console.error('Error saving contacts to database:', error);
        }
      };

      // Debounce the save to avoid rapid-fire during bulk operations
      const timeoutId = setTimeout(saveContacts, 500);
      return () => {
        clearTimeout(timeoutId);
        abortController.abort();
      };
    }
  }, [contacts, isLoading]);

  // Save lineslips to database whenever they change
  useEffect(() => {
    if (!isLoadingLineslips) {
      const saveLineslips = async () => {
        try {
          const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
          await fetch(`${serverUrl}/lineslips`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lineslips }),
          });
        } catch (error) {
          console.error('Error saving lineslips to database:', error);
        }
      };

      saveLineslips();
    }
  }, [lineslips, isLoadingLineslips]);

  // Save binders to database whenever they change
  useEffect(() => {
    if (!isLoadingBinders) {
      const saveBinders = async () => {
        try {
          const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
          await fetch(`${serverUrl}/binders`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ binders }),
          });
        } catch (error) {
          console.error('Error saving binders to database:', error);
        }
      };

      saveBinders();
    }
  }, [binders, isLoadingBinders]);

  const handleNewPlacement = async (placement: Omit<Placement, "id" | "submittedDate" | "status" | "reference" | "facilityRef">, forceNew = false, draftIdToUpdate?: string | null) => {
    const effectiveDraftId = draftIdToUpdate ?? currentDraftId;
    console.log('🚀 handleNewPlacement called with:', {
      productCode: placement.productCode,
      currentDraftId,
      draftIdToUpdate,
      effectiveDraftId,
      forceNew,
      willUpdate: effectiveDraftId && !forceNew,
      willCreateNew: !effectiveDraftId || forceNew
    });
    
    // ── Compliance / Sanctions Check ──
    console.log('🔍 Running compliance sanctions check...');
    let complianceResult: Placement["complianceData"] | undefined = undefined;
    let complianceFlagged = false;
    
    try {
      const entities: Array<{ name: string; type: "insured" | "reinsured" | "additional_insured" }> = [];
      
      // Add insured name
      if (placement.insuredName) {
        entities.push({ name: placement.insuredName, type: "insured" });
      }
      
      // Add reinsured name (if applicable)
      if (placement.draftData?.reinsuredName) {
        entities.push({ name: placement.draftData.reinsuredName, type: "reinsured" });
      }
      
      // Add additional insureds
      if (placement.draftData?.additionalInsureds && Array.isArray(placement.draftData.additionalInsureds)) {
        placement.draftData.additionalInsureds.forEach((addl: any) => {
          if (addl.name) {
            entities.push({ name: addl.name, type: "additional_insured" });
          }
        });
      }
      
      if (entities.length > 0) {
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
        const response = await fetch(`${serverUrl}/sanctions/check`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entities }),
        });
        
        const now = new Date().toISOString();
        
        if (response.ok) {
          const sanctionsResult = await response.json();
          console.log('🔍 Sanctions check result:', sanctionsResult);
          
          const entityResults = entities.map((e) => {
            const match = sanctionsResult.results?.find((r: any) => r.name === e.name);
            return {
              name: e.name,
              type: e.type,
              cleared: match ? !match.isSanctioned : true,
              sanctionDetails: match?.sanctionDetails,
            };
          });
          
          const certificates = entities.map((e) => {
            const match = sanctionsResult.results?.find((r: any) => r.name === e.name);
            return {
              id: `SC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              entityName: e.name,
              entityType: e.type,
              checkedAt: now,
              result: (match?.isSanctioned ? "hit" : "clear") as "hit" | "clear",
              details: match?.sanctionDetails ? JSON.stringify(match.sanctionDetails) : undefined,
            };
          });
          
          complianceFlagged = !sanctionsResult.passed;
          complianceResult = {
            status: complianceFlagged ? "flagged" : "cleared",
            checkedAt: now,
            entities: entityResults,
            certificates,
            clearedAt: complianceFlagged ? undefined : now,
            lastRefreshAt: now,
          };
          
          if (complianceFlagged) {
            console.log('⚠️ Compliance hit detected — placement will go to COMPLIANCE status');
          } else {
            console.log('✅ Compliance check passed — all entities cleared');
          }
        } else {
          // API error — log but don't block. Auto-clear for now.
          const errorData = await response.json().catch(() => ({}));
          console.warn('⚠️ Sanctions API error (auto-clearing):', errorData);
          complianceResult = {
            status: "cleared",
            checkedAt: now,
            entities: entities.map((e) => ({ name: e.name, type: e.type, cleared: true })),
            certificates: entities.map((e) => ({
              id: `SC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              entityName: e.name,
              entityType: e.type,
              checkedAt: now,
              result: "clear" as const,
              details: "Auto-cleared: sanctions API unavailable",
            })),
            clearedAt: now,
            lastRefreshAt: now,
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Sanctions check network error (auto-clearing):', error);
      const now = new Date().toISOString();
      const entities: Array<{ name: string; type: "insured" | "reinsured" | "additional_insured" }> = [];
      if (placement.insuredName) entities.push({ name: placement.insuredName, type: "insured" });
      if (placement.draftData?.reinsuredName) entities.push({ name: placement.draftData.reinsuredName, type: "reinsured" });
      (placement.draftData?.additionalInsureds || []).forEach((a: any) => { if (a.name) entities.push({ name: a.name, type: "additional_insured" }); });
      complianceResult = {
        status: "cleared",
        checkedAt: now,
        entities: entities.map((e) => ({ name: e.name, type: e.type, cleared: true })),
        certificates: entities.map((e) => ({
          id: `SC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          entityName: e.name,
          entityType: e.type,
          checkedAt: now,
          result: "clear" as const,
          details: "Auto-cleared: sanctions service unreachable",
        })),
        clearedAt: now,
        lastRefreshAt: now,
      };
    }
    
    // Check if we're updating an existing draft (and not forcing a new placement)
    if (effectiveDraftId && !forceNew) {
      console.log('📝 Updating existing placement:', effectiveDraftId);
      const existingPlacement = placements.find(p => p.id === effectiveDraftId);
      console.log('📄 Existing documents:', existingPlacement?.draftData?.documents?.length || 0);
      console.log('📄 Incoming documents:', placement.draftData?.documents?.length || 0);
      console.log('🌍 Existing excludedCountries:', existingPlacement?.draftData?.excludedCountries);
      console.log('🌍 Incoming excludedCountries:', placement.draftData?.excludedCountries);
      
      // Get the facility ref from the selected lineslip for this product
      const selectedLineslipId = placement.draftData?.selectedLineslips?.[placement.productCode];
      const selectedLineslip = lineslips.find(l => l.id === selectedLineslipId);
      
      // Check if a binder was selected for auto-quoting
      const selectedBinderId = placement.draftData?.selectedBinders?.[placement.productCode];
      const selectedBinder = binders.find(b => b.id === selectedBinderId);
      
      const facilityRef = selectedLineslip?.reference || selectedBinder?.reference || existingPlacement?.facilityRef || '';
      
      // Update existing draft to pending status - USE FUNCTIONAL UPDATE
      setPlacements((prevPlacements) =>
        prevPlacements.map((p) => {
          if (p.id === effectiveDraftId) {
            const updatedPlacement: any = {
              ...p,
              ...placement,
              productCode: placement.productCode,
              facilityRef: facilityRef,
              draftData: {
                ...p.draftData,
                ...placement.draftData,
                documents: p.draftData?.documents || [],
              },
              status: complianceFlagged ? ("compliance" as const) : ("pending" as const),
              submittedDate: new Date().toISOString().split("T")[0],
              submittedBy: currentUser?.email,
              submittedByName: `${currentUser?.firstName} ${currentUser?.lastName}`,
              submittedByCompany: currentUser?.company,
              complianceData: complianceResult,
            };
            console.log('📄 Updated placement documents:', updatedPlacement.draftData?.documents?.length || 0);
            console.log('🌍 Updated placement excludedCountries:', updatedPlacement.draftData?.excludedCountries);
            console.log('🎯 Updated placement productCode:', updatedPlacement.productCode);
            console.log('📋 Updated placement facilityRef:', updatedPlacement.facilityRef, '(lineslip:', selectedLineslip?.name || 'None', ')');
            
            // If compliance flagged, skip auto-quote and notifications — broker must clear first
            if (complianceFlagged) {
              console.log('🛑 Compliance flagged — skipping auto-quote and notifications');
              return updatedPlacement;
            }
            
            // ── BINDER BUILDER PANEL AUTO-QUOTE (update path) ──
            const updBuilderPanel = placement.draftData?.binderBuilderSelections?.[placement.productCode];
            if (updBuilderPanel && Array.isArray(updBuilderPanel) && updBuilderPanel.length > 0) {
              console.log('🏗️ [Update] Binder Builder panel detected with', updBuilderPanel.length, 'markets');
              const allQuotes: Quote[] = [];
              for (const panelEntry of updBuilderPanel) {
                const panelBinder = binders.find(b => b.id === panelEntry.binderId);
                if (!panelBinder) continue;
                const elig = isEligibleForAutoQuote(updatedPlacement as Placement, panelBinder);
                if (!elig.eligible) continue;
                const aqr = calculateBinderQuote(updatedPlacement as Placement, panelBinder);
                const scaledPremium = Math.round(aqr.quote.premium * (panelEntry.linePercent / 100) * 100) / 100;
                allQuotes.push({
                  ...aqr.quote,
                  id: `Q-${String(allQuotes.length + 1).padStart(3, "0")}`,
                  submittedDate: new Date().toISOString().split("T")[0],
                  premium: scaledPremium,
                  writtenLine: panelEntry.linePercent,
                  terms: aqr.quote.terms + `\nPanel share: ${panelEntry.linePercent}% of 100% order`,
                } as Quote);
              }
              if (allQuotes.length > 0) {
                updatedPlacement.status = "quoted";
                updatedPlacement.quotes = allQuotes;
                updatedPlacement.facilityRef = updBuilderPanel[0]?.binderRef || updatedPlacement.facilityRef;
                const totalPremium = allQuotes.reduce((s: number, q: Quote) => s + q.premium, 0);
                const pFacility = binders.find(b => b.id === updBuilderPanel[0]?.binderId) || selectedLineslip;
                const qSlipB64 = generateQuoteSlipBase64(updatedPlacement as Placement, pFacility as any);
                notifyQuoted(updatedPlacement as Placement, contacts, {
                  underwriterName: `Panel (${allQuotes.length} markets)`,
                  underwriterCompany: updBuilderPanel.map((e: any) => e.binderName).join(", "),
                  premium: totalPremium,
                  currency: allQuotes[0]?.currency || "USD",
                }, qSlipB64);
              } else {
                notifyPending(updatedPlacement as Placement, contacts, lineslips);
              }
            }
            // ── SINGLE BINDER AUTO-QUOTE ──
            else if (selectedBinder) {
              const eligibility = isEligibleForAutoQuote(updatedPlacement as Placement, selectedBinder);
              
              if (eligibility.eligible) {
                console.log('⚡ Binder auto-quote triggered for binder:', selectedBinder.name, selectedBinder.reference);
                const autoQuoteResult = calculateBinderQuote(updatedPlacement as Placement, selectedBinder);
                console.log('⚡ Auto-quote breakdown:', autoQuoteResult.breakdown);
                
                const autoQuote = {
                  ...autoQuoteResult.quote,
                  id: `Q-${String((updatedPlacement.quotes?.length || 0) + 1).padStart(3, "0")}`,
                  submittedDate: new Date().toISOString().split("T")[0],
                } as Quote;
                
                updatedPlacement.status = "quoted";
                updatedPlacement.quotes = [...(updatedPlacement.quotes || []), autoQuote];
                
                console.log('⚡ Auto-quoted placement → QUOTED status with premium:', autoQuoteResult.quote.currency, autoQuoteResult.quote.premium);
                
                // Send QUOTED notification (skip PENDING for binder auto-quotes)
                const placementFacility = selectedLineslip || selectedBinder;
                const quoteSlipBase64 = generateQuoteSlipBase64(updatedPlacement as Placement, placementFacility as any);
                notifyQuoted(updatedPlacement as Placement, contacts, {
                  underwriterName: autoQuoteResult.quote.underwriterName,
                  underwriterCompany: autoQuoteResult.quote.underwriterCompany,
                  premium: autoQuoteResult.quote.premium,
                  currency: autoQuoteResult.quote.currency,
                }, quoteSlipBase64);
              } else {
                console.log('⚠️ Binder auto-quote skipped — uses not eligible:', eligibility.reason);
                // Falls through to PENDING — requires manual underwriter review
                notifyPending(updatedPlacement as Placement, contacts, lineslips);
              }
            } else {
              // Send PENDING notification to underwriters (fire and forget)
              notifyPending(updatedPlacement as Placement, contacts, lineslips);
            }
            return updatedPlacement;
          }
          return p;
        })
      );
      setCurrentDraftId(null);
    } else {
      // Create new placement with unique ID - USE FUNCTIONAL UPDATE
      setPlacements((prevPlacements) => {
        const existingIds = prevPlacements.map(p => {
          const match = p.id.match(/PL-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        
        const existingRefs = prevPlacements.map(p => {
          const match = p.reference.match(/FLY26(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        const nextRef = existingRefs.length > 0 ? Math.max(...existingRefs) + 1 : 1;
        
        // Get the facility ref from the selected lineslip for this product
        const selectedLineslipId = placement.draftData?.selectedLineslips?.[placement.productCode];
        const selectedLineslip = lineslips.find(l => l.id === selectedLineslipId);
        
        // Check if a binder was selected for auto-quoting
        const selectedBinderId = placement.draftData?.selectedBinders?.[placement.productCode];
        const selectedBinder = binders.find(b => b.id === selectedBinderId);
        
        const facilityRef = selectedLineslip?.reference || selectedBinder?.reference || `LS26${String(nextRef).padStart(4, "0")}`;
        
        const newPlacement: Placement = {
          ...placement,
          productCode: placement.productCode,
          id: `PL-${String(nextId).padStart(3, "0")}`,
          reference: `FLY26${String(nextRef).padStart(4, "0")}`,
          facilityRef: facilityRef,
          submittedDate: new Date().toISOString().split("T")[0],
          status: complianceFlagged ? "compliance" : "pending",
          submittedBy: currentUser?.email,
          submittedByName: `${currentUser?.firstName} ${currentUser?.lastName}`,
          submittedByCompany: currentUser?.company,
          complianceData: complianceResult,
        };
        console.log('🎯 New placement productCode:', newPlacement.productCode);
        console.log('🆔 New placement ID:', newPlacement.id);
        console.log('📋 Facility Ref:', facilityRef, '(lineslip:', selectedLineslip?.name || 'None', ', binder:', selectedBinder?.name || 'None', ')');
        console.log('📊 Previous placements count:', prevPlacements.length);
        
        // If compliance flagged, skip auto-quote and notifications — broker must clear first
        if (complianceFlagged) {
          console.log('🛑 Compliance flagged — skipping auto-quote and notifications for new placement');
          return [newPlacement, ...prevPlacements];
        }
        
        // ── BINDER BUILDER PANEL AUTO-QUOTE ──
        const builderPanel = placement.draftData?.binderBuilderSelections?.[placement.productCode];
        if (builderPanel && Array.isArray(builderPanel) && builderPanel.length > 0) {
          console.log('🏗️ Binder Builder panel detected with', builderPanel.length, 'markets');
          const allQuotes: Quote[] = [];
          
          for (const panelEntry of builderPanel) {
            const panelBinder = binders.find(b => b.id === panelEntry.binderId);
            if (!panelBinder) { console.warn('⚠️ Binder Builder: binder not found:', panelEntry.binderId); continue; }
            
            const eligibility = isEligibleForAutoQuote(newPlacement, panelBinder);
            if (!eligibility.eligible) { 
              console.warn('⚠️ Binder Builder: binder ineligible:', panelBinder.name, eligibility.reason);
              continue; 
            }
            
            const autoQuoteResult = calculateBinderQuote(newPlacement, panelBinder);
            // Scale premium to the binder's line share
            const scaledPremium = Math.round(autoQuoteResult.quote.premium * (panelEntry.linePercent / 100) * 100) / 100;
            
            const autoQuote = {
              ...autoQuoteResult.quote,
              id: `Q-${String(allQuotes.length + 1).padStart(3, "0")}`,
              submittedDate: new Date().toISOString().split("T")[0],
              premium: scaledPremium,
              writtenLine: panelEntry.linePercent,
              terms: autoQuoteResult.quote.terms + `\nPanel share: ${panelEntry.linePercent}% of 100% order`,
            } as Quote;
            allQuotes.push(autoQuote);
            console.log(`🏗️ Panel quote from ${panelBinder.name}: ${panelEntry.linePercent}% → ${autoQuoteResult.quote.currency} ${scaledPremium}`);
          }
          
          if (allQuotes.length > 0) {
            newPlacement.status = "quoted";
            newPlacement.quotes = allQuotes;
            
            const totalPremium = allQuotes.reduce((s, q) => s + q.premium, 0);
            console.log('🏗️ Binder Builder panel auto-quoted → QUOTED with total premium:', allQuotes[0]?.currency, totalPremium);
            
            // Use first binder as the primary facility ref
            newPlacement.facilityRef = builderPanel[0]?.binderRef || newPlacement.facilityRef;
            
            const placementFacility = binders.find(b => b.id === builderPanel[0]?.binderId) || selectedLineslip;
            const quoteSlipBase64 = generateQuoteSlipBase64(newPlacement, placementFacility as any);
            notifyQuoted(newPlacement, contacts, {
              underwriterName: `Panel (${allQuotes.length} markets)`,
              underwriterCompany: builderPanel.map((e: any) => e.binderName).join(", "),
              premium: totalPremium,
              currency: allQuotes[0]?.currency || "USD",
            }, quoteSlipBase64);
          } else {
            notifyPending(newPlacement, contacts, lineslips);
          }
        }
        // ── SINGLE BINDER AUTO-QUOTE ──
        else if (selectedBinder) {
          const eligibility = isEligibleForAutoQuote(newPlacement, selectedBinder);
          
          if (eligibility.eligible) {
            console.log('⚡ Binder auto-quote triggered for new placement, binder:', selectedBinder.name, selectedBinder.reference);
            const autoQuoteResult = calculateBinderQuote(newPlacement, selectedBinder);
            console.log('⚡ Auto-quote breakdown:', autoQuoteResult.breakdown);
            
            const autoQuote = {
              ...autoQuoteResult.quote,
              id: `Q-${String((newPlacement.quotes?.length || 0) + 1).padStart(3, "0")}`,
              submittedDate: new Date().toISOString().split("T")[0],
            } as Quote;
            
            newPlacement.status = "quoted";
            newPlacement.quotes = [autoQuote];
            
            console.log('⚡ Auto-quoted new placement → QUOTED status with premium:', autoQuoteResult.quote.currency, autoQuoteResult.quote.premium);
            
            // Send QUOTED notification
            const placementFacility = selectedLineslip || selectedBinder;
            const quoteSlipBase64 = generateQuoteSlipBase64(newPlacement, placementFacility as any);
            notifyQuoted(newPlacement, contacts, {
              underwriterName: autoQuoteResult.quote.underwriterName,
              underwriterCompany: autoQuoteResult.quote.underwriterCompany,
              premium: autoQuoteResult.quote.premium,
              currency: autoQuoteResult.quote.currency,
            }, quoteSlipBase64);
          } else {
            console.log('⚠️ Binder auto-quote skipped for new placement — uses not eligible:', eligibility.reason);
            // Falls through to PENDING — requires manual underwriter review
            notifyPending(newPlacement, contacts, lineslips);
          }
        } else {
          // Send PENDING notification to underwriters (fire and forget)
          notifyPending(newPlacement, contacts, lineslips);
        }
        return [newPlacement, ...prevPlacements];
      });
    }
    // After resubmitting an edited risk, navigate to its detail view instead of dashboard
    if (effectiveDraftId && !forceNew) {
      setSelectedPlacementId(effectiveDraftId);
      setCurrentView("placementDetail");
    } else {
      setCurrentView("dashboard");
    }
  };

  const handleSubmitQuote = (placementId: string, quote: Omit<Quote, "id" | "submittedDate">) => {
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id === placementId) {
          const newQuote = {
            ...quote,
            id: `Q-${String((p.quotes?.length || 0) + 1).padStart(3, "0")}`,
            submittedDate: new Date().toISOString().split("T")[0],
            placementSnapshot: {
              draftData: { ...(p.draftData || {}) },
              insuredName: p.insuredName,
              productCode: p.productCode,
              brokerName: p.brokerName,
              brokerCompany: p.brokerCompany,
              reference: p.reference,
              facilityRef: p.facilityRef,
              inceptionDate: p.draftData?.inceptionDate || p.inceptionDate,
              expiryDate: p.draftData?.expiryDate,
            },
          } as Quote;
          // Send QUOTED notification to broker + preferred broker contact (fire and forget)
          // Generate the quote slip PDF and attach it to the email
          const updatedPlacement = {
            ...p,
            status: "quoted" as PlacementStatus,
            quotes: [...(p.quotes || []), newQuote],
          };
          const selectedLineslipId = p.draftData?.selectedLineslips?.[p.productCode];
          const placementLineslip = lineslips.find(l => l.id === selectedLineslipId);
          const quoteSlipBase64 = generateQuoteSlipBase64(updatedPlacement, placementLineslip);
          notifyQuoted(p, contacts, {
            underwriterName: quote.underwriterName,
            underwriterCompany: quote.underwriterCompany,
            premium: quote.premium,
            currency: quote.currency,
          }, quoteSlipBase64);
          return updatedPlacement;
        }
        return p;
      })
    );
  };

  const handleDeclinePlacement = (placementId: string, reason?: string, reasonDetail?: string) => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === placementId ? { ...p, status: "declined" as PlacementStatus, declineReason: reason, declineReasonDetail: reasonDetail } : p))
    );
  };

  const handleStatusChange = (placementId: string, newStatus: PlacementStatus) => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === placementId ? { ...p, status: newStatus } : p))
    );
  };

  // ── Compliance re-check: re-run sanctions and transition to PENDING if cleared ──
  const handleComplianceRecheck = async (placementId: string) => {
    const placement = placements.find(p => p.id === placementId);
    if (!placement || placement.status !== "compliance") return;

    console.log('🔄 Re-checking compliance for placement:', placementId);

    const entities: Array<{ name: string; type: "insured" | "reinsured" | "additional_insured" }> = [];
    if (placement.insuredName) entities.push({ name: placement.insuredName, type: "insured" });
    if (placement.draftData?.reinsuredName) entities.push({ name: placement.draftData.reinsuredName, type: "reinsured" });
    (placement.draftData?.additionalInsureds || []).forEach((a: any) => { if (a.name) entities.push({ name: a.name, type: "additional_insured" }); });

    try {
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;
      const response = await fetch(`${serverUrl}/sanctions/check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities }),
      });

      const now = new Date().toISOString();

      if (response.ok) {
        const result = await response.json();
        const entityResults = entities.map((e) => {
          const match = result.results?.find((r: any) => r.name === e.name);
          return { name: e.name, type: e.type, cleared: match ? !match.isSanctioned : true, sanctionDetails: match?.sanctionDetails };
        });
        const certificates = entities.map((e) => {
          const match = result.results?.find((r: any) => r.name === e.name);
          return {
            id: `SC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            entityName: e.name, entityType: e.type, checkedAt: now,
            result: (match?.isSanctioned ? "hit" : "clear") as "hit" | "clear",
            details: match?.sanctionDetails ? JSON.stringify(match.sanctionDetails) : undefined,
          };
        });

        const stillFlagged = !result.passed;
        const newComplianceData: Placement["complianceData"] = {
          status: stillFlagged ? "flagged" : "cleared",
          checkedAt: placement.complianceData?.checkedAt || now,
          entities: entityResults,
          certificates: [...(placement.complianceData?.certificates || []), ...certificates],
          clearedAt: stillFlagged ? undefined : now,
          lastRefreshAt: now,
        };

        setPlacements((prev) => prev.map((p) => {
          if (p.id !== placementId) return p;
          if (stillFlagged) {
            return { ...p, complianceData: newComplianceData };
          }
          // Cleared — move to pending and trigger notifications
          console.log('✅ Compliance cleared — transitioning to PENDING');
          notifyPending(p, contacts, lineslips);
          return { ...p, status: "pending" as PlacementStatus, complianceData: newComplianceData };
        }));
      } else {
        // API error — update lastRefreshAt but don't change status
        setPlacements((prev) => prev.map((p) =>
          p.id === placementId ? { ...p, complianceData: { ...p.complianceData!, lastRefreshAt: now } } : p
        ));
      }
    } catch (error) {
      console.error('Compliance re-check error:', error);
    }
  };

  // Auto-transition quoted placements to NTU after 30 days with no action
  useEffect(() => {
    if (isLoadingPlacements) return;

    const now = new Date();
    let hasChanges = false;

    const updated = placements.map((p) => {
      if (p.status !== "quoted" || !p.quotes || p.quotes.length === 0) return p;

      // Get the most recent quote
      const latestQuote = p.quotes[p.quotes.length - 1];

      // Use quoteValidUntil if available, otherwise 30 days from quote submittedDate
      let expiryDate: Date;
      if (latestQuote.quoteValidUntil) {
        expiryDate = new Date(latestQuote.quoteValidUntil);
      } else {
        expiryDate = new Date(latestQuote.submittedDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
      }

      if (now > expiryDate) {
        hasChanges = true;
        console.log(`⏰ NTU: Placement ${p.id} (${p.reference}) quote expired on ${expiryDate.toISOString().split("T")[0]} — transitioning to NTU`);
        return { ...p, status: "ntu" as PlacementStatus };
      }
      return p;
    });

    if (hasChanges) {
      setPlacements(updated);
    }
  }, [placements, isLoadingPlacements]);

  // Auto-refresh compliance placements every 30 minutes
  const complianceIds = placements.filter(p => p.status === "compliance").map(p => p.id).join(",");
  useEffect(() => {
    if (!complianceIds) return;

    const interval = setInterval(() => {
      const ids = complianceIds.split(",");
      console.log('🔄 Auto-refreshing compliance checks for', ids.length, 'placements');
      ids.forEach(id => handleComplianceRecheck(id));
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [complianceIds]);

  const handleSaveDraft = (draftData: Partial<Placement>) => {
    if (currentDraftId) {
      // Update existing draft
      setPlacements(
        placements.map((p) => 
          p.id === currentDraftId 
            ? { ...p, ...draftData }
            : p
        )
      );
    } else {
      // Create new draft with unique ID based on highest existing ID + 1
      const existingIds = placements.map(p => {
        const match = p.id.match(/PL-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      
      const existingRefs = placements.map(p => {
        const match = p.reference.match(/FLY26(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const nextRef = existingRefs.length > 0 ? Math.max(...existingRefs) + 1 : 1;
      
      const existingFacilityRefs = placements.map(p => {
        const match = p.facilityRef?.match(/LS26(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const nextFacilityRef = existingFacilityRefs.length > 0 ? Math.max(...existingFacilityRefs) + 1 : 1;
      
      const newDraft: Placement = {
        id: `PL-${String(nextId).padStart(3, "0")}`,
        reference: `FLY26${String(nextRef).padStart(4, "0")}`,
        facilityRef: `LS26${String(nextFacilityRef).padStart(4, "0")}`,
        submittedDate: new Date().toISOString(),
        status: "draft",
        brokerName: draftData.brokerName || "",
        brokerCompany: draftData.brokerCompany || "",
        insuredName: draftData.insuredName || "",
        aircraftType: draftData.aircraftType || "",
        productCode: draftData.productCode || "",
        coverageType: draftData.coverageType || "",
        hullValue: draftData.hullValue || 0,
        liability: draftData.liability || 0,
        inceptionDate: draftData.inceptionDate || "",
        ...draftData,
      };
      setPlacements([newDraft, ...placements]);
      setCurrentDraftId(newDraft.id);
      return newDraft.id;
    }
    return currentDraftId;
  };

  // Lineslip handlers
  const handleAddLineslip = () => {
    setEditingLineslip(null);
    setCurrentView("lineslipForm");
  };

  const handleEditLineslip = (lineslip: Lineslip) => {
    setEditingLineslip(lineslip);
    setCurrentView("lineslipForm");
  };

  const handleSaveLineslip = (lineslipData: Omit<Lineslip, "id" | "createdDate" | "lastModified">) => {
    const now = new Date().toISOString().split("T")[0];
    
    if (editingLineslip) {
      // Update existing lineslip
      setLineslips(
        lineslips.map((l) =>
          l.id === editingLineslip.id
            ? { ...l, ...lineslipData, lastModified: now }
            : l
        )
      );
    } else {
      // Create new lineslip with unique ID
      const maxId = lineslips.reduce((max, l) => {
        const num = parseInt(l.id.replace("LS-", ""));
        return num > max ? num : max;
      }, 0);
      const newLineslip: Lineslip = {
        ...lineslipData,
        id: `LS-${String(maxId + 1).padStart(3, "0")}`,
        createdDate: now,
        lastModified: now,
      };
      setLineslips([newLineslip, ...lineslips]);
    }
    
    setEditingLineslip(null);
    setCurrentView("lineslipManager");
  };

  const handlePauseLineslip = (id: string) => {
    setLineslips(
      lineslips.map((l) =>
        l.id === id
          ? { ...l, status: "paused" as LineslipStatus, lastModified: new Date().toISOString().split("T")[0] }
          : l
      )
    );
  };

  const handleStopLineslip = (id: string) => {
    setLineslips(
      lineslips.map((l) =>
        l.id === id
          ? { ...l, status: "stopped" as LineslipStatus, lastModified: new Date().toISOString().split("T")[0] }
          : l
      )
    );
  };

  const handleActivateLineslip = (id: string) => {
    setLineslips(
      lineslips.map((l) =>
        l.id === id
          ? { ...l, status: "active" as LineslipStatus, lastModified: new Date().toISOString().split("T")[0] }
          : l
      )
    );
  };

  // Binder handlers
  const handleAddBinder = () => {
    setEditingBinder(null);
    setCurrentView("binderForm");
  };

  const handleEditBinder = (binder: Binder) => {
    setEditingBinder(binder);
    setCurrentView("binderForm");
  };

  const handleSaveBinder = (binderData: Omit<Binder, "id" | "createdDate" | "lastModified">) => {
    const now = new Date().toISOString().split("T")[0];
    
    if (editingBinder) {
      // Update existing binder
      setBinders(
        binders.map((b) =>
          b.id === editingBinder.id
            ? { ...b, ...binderData, lastModified: now }
            : b
        )
      );
    } else {
      // Create new binder with unique ID
      const maxId = binders.reduce((max, b) => {
        const num = parseInt(b.id.replace("BD-", ""));
        return num > max ? num : max;
      }, 0);
      const newBinder: Binder = {
        ...binderData,
        id: `BD-${String(maxId + 1).padStart(3, "0")}`,
        createdDate: now,
        lastModified: now,
      };
      setBinders([newBinder, ...binders]);
    }
    
    setEditingBinder(null);
    setCurrentView("binderManager");
  };

  const handlePauseBinder = (id: string) => {
    setBinders(
      binders.map((b) =>
        b.id === id
          ? { ...b, status: "paused" as LineslipStatus, lastModified: new Date().toISOString().split("T")[0] }
          : b
      )
    );
  };

  const handleStopBinder = (id: string) => {
    setBinders(
      binders.map((b) =>
        b.id === id
          ? { ...b, status: "stopped" as LineslipStatus, lastModified: new Date().toISOString().split("T")[0] }
          : b
      )
    );
  };

  const handleActivateBinder = (id: string) => {
    setBinders(
      binders.map((b) =>
        b.id === id
          ? { ...b, status: "active" as LineslipStatus, lastModified: new Date().toISOString().split("T")[0] }
          : b
      )
    );
  };

  // Contact handlers  
  const handleAddContact = () => {
    setEditingContact(null);
    setShowContactForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowContactForm(true);
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  // Authentication handler
  const handleLogin = (email: string, password: string): boolean => {
    const user = contacts.find(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
    );
    
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setUserRole(user.type === "Underwriter" ? "underwriter" : "broker");
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView("dashboard");
    setIsMenuOpen(false);
  };

  // Handle clicking on a placement in the dashboard
  const handleClickPlacement = (placementId: string) => {
    const placement = placements.find((p) => p.id === placementId);
    if (!placement) return;

    // If it's a draft, allow editing
    if (placement.status === "draft") {
      setCurrentDraftId(placementId);
      setCurrentView("submit");
    }
    // For other statuses, you could navigate to a detail view in the future
    else {
      setSelectedPlacementId(placementId);
      setCurrentView("placementDetail");
    }
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#F8F9FA] flex flex-col border-r border-gray-200">
        {/* Logo Header */}
        <button 
          onClick={() => setCurrentView("dashboard")}
          className="flex items-center gap-3 px-6 py-6"
        >
          <img src={flightdeckLogo} alt="FLIGHTDECK" className="h-10" />
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-4">
          <div className="space-y-1">
            {/* Dashboard */}
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative ${
                currentView === "dashboard"
                  ? 'bg-[#E8F5E9] text-[#004225] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#004225] before:rounded-r'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="size-5 shrink-0" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>

            {/* Get a Quote - Broker only */}
            {userRole === "broker" && (
              <button
                onClick={() => {
                  setCurrentView("submit");
                  setCurrentDraftId(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative ${
                  currentView === "submit"
                    ? 'bg-[#E8F5E9] text-[#004225] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#004225] before:rounded-r'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FileText className="size-5 shrink-0" />
                <span className="text-sm font-medium">Get a Quote</span>
              </button>
            )}

            {/* Lineslip Manager - Broker only */}
            {userRole === "broker" && (
              <button
                onClick={() => setCurrentView("lineslipManager")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative ${
                  currentView === "lineslipManager" || currentView === "lineslipForm"
                    ? 'bg-[#E8F5E9] text-[#004225] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#004225] before:rounded-r'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Clipboard className="size-5 shrink-0" />
                <span className="text-sm font-medium">Lineslip Manager</span>
              </button>
            )}

            {/* Binder Manager - Broker only */}
            {userRole === "broker" && (
              <button
                onClick={() => setCurrentView("binderManager")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative ${
                  currentView === "binderManager" || currentView === "binderForm"
                    ? 'bg-[#E8F5E9] text-[#004225] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#004225] before:rounded-r'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ShieldCheck className="size-5 shrink-0" />
                <span className="text-sm font-medium">Binder Manager</span>
              </button>
            )}

            {/* Contact Manager - Broker only */}
            {userRole === "broker" && (
              <button
                onClick={() => setCurrentView("contactManager")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative ${
                  currentView === "contactManager"
                    ? 'bg-[#E8F5E9] text-[#004225] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#004225] before:rounded-r'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="size-5 shrink-0" />
                <span className="text-sm font-medium">Contact Manager</span>
              </button>
            )}

            {/* Reports */}
            <button
              onClick={() => setCurrentView("lineslipReports")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative ${
                currentView === "lineslipReports"
                  ? 'bg-[#E8F5E9] text-[#004225] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#004225] before:rounded-r'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="size-5 shrink-0" />
              <span className="text-sm font-medium">Reports</span>
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-3 px-5 py-4 border-t border-gray-200 hover:bg-gray-100 transition-all duration-150"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 bg-gradient-to-br from-green-700 to-green-800 text-white">
            {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold truncate text-gray-900">
              {currentUser?.firstName} {currentUser?.lastName}
            </div>
            <div className="text-xs truncate text-gray-500">
              {currentUser?.email}
            </div>
          </div>
        </button>
      </aside>

      {/* Profile Menu Overlay */}
      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          
          <div className="fixed left-4 bottom-24 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden py-1">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                // Settings functionality would go here
                console.log('Settings clicked');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Menu className="size-4 text-gray-500" />
              <span className="text-sm font-medium">Settings</span>
            </button>
            
            <div className="border-t border-gray-100 my-1" />
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="size-4 text-gray-500" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {currentView === "dashboard" && (
          <PlacementDashboard 
            placements={placements} 
            userRole={userRole}
            currentUser={currentUser}
            onGetQuote={() => {
              setCurrentDraftId(null);
              setCurrentView("submit");
            }}
            onClickPlacement={handleClickPlacement}
            lineslips={lineslips}
          />
        )}
        {currentView === "submit" && (
          <PlacementForm
            onSubmit={handleNewPlacement}
            onCancel={() => {
              setCurrentView("dashboard");
              setCurrentDraftId(null);
            }}
            onSaveDraft={handleSaveDraft}
            lineslips={lineslips}
            binders={binders}
            contacts={contacts}
            currentDraftId={currentDraftId}
            draftPlacement={currentDraftId ? placements.find(p => p.id === currentDraftId) : undefined}
            onAddContact={(contactData) => {
              const now = new Date().toISOString().split("T")[0];
              const maxId = contacts.reduce((max, c) => {
                const num = parseInt(c.id.replace("CON-", ""));
                return num > max ? num : max;
              }, 0);
              const newContact: Contact = {
                ...contactData,
                id: `CON-${String(maxId + 1).padStart(3, "0")}`,
                createdDate: now,
                lastModified: now,
              };
              setContacts([newContact, ...contacts]);
            }}
          />
        )}
        {currentView === "review" && <UnderwriterReview placements={placements} onSubmitQuote={handleSubmitQuote} onDecline={handleDeclinePlacement} />}
        {currentView === "lineslipManager" && (
          <LineslipManager
            lineslips={lineslips}
            onAddLineslip={handleAddLineslip}
            onEditLineslip={handleEditLineslip}
            onPauseLineslip={handlePauseLineslip}
            onStopLineslip={handleStopLineslip}
            onActivateLineslip={handleActivateLineslip}
          />
        )}
        {currentView === "lineslipForm" && (
          <LineslipForm
            lineslip={editingLineslip || undefined}
            existingLineslips={lineslips}
            contacts={contacts}
            onSave={handleSaveLineslip}
            onCancel={() => {
              setEditingLineslip(null);
              setCurrentView("lineslipManager");
            }}
          />
        )}
        {currentView === "binderManager" && (
          <BinderManager
            binders={binders}
            onAddBinder={handleAddBinder}
            onEditBinder={handleEditBinder}
            onPauseBinder={handlePauseBinder}
            onStopBinder={handleStopBinder}
            onActivateBinder={handleActivateBinder}
          />
        )}
        {currentView === "binderForm" && (
          <LineslipForm
            lineslip={editingBinder || undefined}
            existingLineslips={[...lineslips, ...binders]}
            contacts={contacts}
            mode="binder"
            onSave={(data) => handleSaveBinder({ ...data, facilityType: "binder", ratingRules: (data as any).ratingRules || editingBinder?.ratingRules || { hullRateFixedWing: 0, hullRateRotaryWing: 0, liabilityRateType: "per_seat", liabilityRate: 0, liabilityCurrency: "USD", pphRate: 0, warRate: 0, ageLoadings: [], approvedUses: [] } })}
            onCancel={() => {
              setEditingBinder(null);
              setCurrentView("binderManager");
            }}
          />
        )}
        {currentView === "lineslipReports" && <ReportsPage lineslips={lineslips} placements={placements} contacts={contacts} />}
        {currentView === "contactManager" && (
          <ContactManager 
            contacts={contacts}
            onAddContact={handleAddContact}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
            onBulkImportContacts={(importedContacts) => {
              const now = new Date().toISOString().split("T")[0];
              const maxId = contacts.reduce((max, c) => {
                const num = parseInt(c.id.replace("CON-", ""));
                return num > max ? num : max;
              }, 0);
              const newContacts: Contact[] = importedContacts.map((c, i) => ({
                id: `CON-${String(maxId + i + 1).padStart(3, "0")}`,
                firstName: c.firstName || "",
                lastName: c.lastName || "",
                email: c.email || "",
                phone: c.phone || "",
                company: c.company || "",
                role: c.role || "",
                type: (c.type || "Insured") as ContactType,
                insuredName: c.insuredName || "",
                cedentName: c.cedentName || "",
                address: c.address || undefined,
                city: c.city || undefined,
                country: c.country || undefined,
                postalCode: c.postalCode || undefined,
                createdDate: now,
                lastModified: now,
              }));
              setContacts([...newContacts, ...contacts]);
            }}
          />
        )}
        {showContactForm && (
          <ContactForm
            contact={editingContact || undefined}
            contacts={contacts}
            onSave={(contactData) => {
              const now = new Date().toISOString().split("T")[0];
              
              if (editingContact) {
                // Update existing contact - filter out undefined values to preserve existing data (e.g. password)
                const filteredData = Object.fromEntries(
                  Object.entries(contactData).filter(([_, v]) => v !== undefined)
                );
                setContacts(
                  contacts.map((c) =>
                    c.id === editingContact.id
                      ? { ...c, ...filteredData, lastModified: now }
                      : c
                  )
                );
              } else {
                // Create new contact with unique ID
                const maxId = contacts.reduce((max, c) => {
                  const num = parseInt(c.id.replace("CON-", ""));
                  return num > max ? num : max;
                }, 0);
                const newContact: Contact = {
                  ...contactData,
                  id: `CON-${String(maxId + 1).padStart(3, "0")}`,
                  createdDate: now,
                  lastModified: now,
                };
                setContacts([newContact, ...contacts]);
              }
              
              setEditingContact(null);
              setShowContactForm(false);
            }}
            onCancel={() => {
              setEditingContact(null);
              setShowContactForm(false);
            }}
          />
        )}
        {currentView === "debugHW" && (
          <div>
            <button
              onClick={() => setCurrentView("dashboard")}
              className="mb-4 text-sm text-[#004225] hover:underline"
            >
              &larr; Back to Dashboard
            </button>
            <DebugLineslipViewer />
          </div>
        )}
        {currentView === "placementDetail" && selectedPlacementId && placements.find(p => p.id === selectedPlacementId) && (
          <PlacementDetailView
            placement={placements.find(p => p.id === selectedPlacementId)!}
            userRole={userRole}
            onBack={() => {
              setCurrentView("dashboard");
              setSelectedPlacementId(null);
            }}
            onSubmitQuote={handleSubmitQuote}
            onDecline={handleDeclinePlacement}
            onStatusChange={handleStatusChange}
            onEdit={(placementId) => {
              setCurrentDraftId(placementId);
              setCurrentView("submit");
            }}
            lineslips={lineslips}
            currentUser={currentUser}
            contacts={contacts}
            onUpdatePlacement={(updatedPlacement) => {
              setPlacements(placements.map(p => 
                p.id === updatedPlacement.id ? updatedPlacement : p
              ));
            }}
            onComplianceRecheck={handleComplianceRecheck}
          />
        )}
      </main>
    </div>
  );
}