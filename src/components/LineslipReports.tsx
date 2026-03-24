import { useState, useMemo, useCallback, useEffect } from "react";
import { Lineslip, Placement, ProductCode, Contact } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  DollarSign, 
  Search, 
  FileDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Plane,
  Cog
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";

interface LineslipReportsProps {
  lineslips: Lineslip[];
  placements: Placement[];
  contacts?: Contact[];
}

const productNames: Record<ProductCode, string> = {
  HL: "Hull and Liability",
  HW: "Hull War",
  PA: "Personal Accident",
  LOL: "Loss of Licence",
  HD: "Hull Deductible",
  UAS: "Drone Insurance",
};

const productColors: Record<ProductCode, string> = {
  HL: "#3b82f6",
  HW: "#a855f7",
  PA: "#22c55e",
  LOL: "#f59e0b",
  HD: "#ef4444",
  UAS: "#06b6d4",
};

// Map country to region
const getRegionFromCountry = (country: string | undefined): string => {
  if (!country) return 'Unknown';
  
  const countryUpper = country.toUpperCase();
  
  // North America
  if (['USA', 'US', 'UNITED STATES', 'CANADA', 'CA', 'MEXICO', 'MX'].includes(countryUpper)) {
    return 'North America';
  }
  
  // Europe
  if (['UK', 'GB', 'UNITED KINGDOM', 'FRANCE', 'FR', 'GERMANY', 'DE', 'ITALY', 'IT', 'SPAIN', 'ES', 
       'NETHERLANDS', 'NL', 'BELGIUM', 'BE', 'SWITZERLAND', 'CH', 'AUSTRIA', 'AT', 'POLAND', 'PL',
       'SWEDEN', 'SE', 'NORWAY', 'NO', 'DENMARK', 'DK', 'FINLAND', 'FI', 'IRELAND', 'IE',
       'PORTUGAL', 'PT', 'GREECE', 'GR', 'CZECH REPUBLIC', 'CZ', 'ROMANIA', 'RO', 'HUNGARY', 'HU',
       'BULGARIA', 'BG', 'CROATIA', 'HR', 'SLOVENIA', 'SI', 'LUXEMBOURG', 'LU'].includes(countryUpper)) {
    return 'Europe';
  }
  
  // Asia
  if (['CHINA', 'CN', 'JAPAN', 'JP', 'SOUTH KOREA', 'KR', 'KOREA', 'INDIA', 'IN', 'SINGAPORE', 'SG',
       'THAILAND', 'TH', 'MALAYSIA', 'MY', 'INDONESIA', 'ID', 'PHILIPPINES', 'PH', 'VIETNAM', 'VN', 
       'HONG KONG', 'HK', 'TAIWAN', 'TW', 'PAKISTAN', 'PK', 'BANGLADESH', 'BD', 'SRI LANKA', 'LK',
       'MYANMAR', 'MM', 'CAMBODIA', 'KH', 'LAOS', 'LA', 'MONGOLIA', 'MN', 'KAZAKHSTAN', 'KZ',
       'UZBEKISTAN', 'UZ', 'TURKMENISTAN', 'TM'].includes(countryUpper)) {
    return 'Asia';
  }
  
  // Oceania
  if (['AUSTRALIA', 'AU', 'NEW ZEALAND', 'NZ', 'PAPUA NEW GUINEA', 'PG', 'FIJI', 'FJ',
       'SOLOMON ISLANDS', 'SB', 'VANUATU', 'VU', 'SAMOA', 'WS', 'TONGA', 'TO'].includes(countryUpper)) {
    return 'Oceania';
  }
  
  // Middle East
  if (['UAE', 'AE', 'UNITED ARAB EMIRATES', 'SAUDI ARABIA', 'SA', 'QATAR', 'QA', 'KUWAIT', 'KW',
       'BAHRAIN', 'BH', 'OMAN', 'OM', 'ISRAEL', 'IL', 'TURKEY', 'TR', 'LEBANON', 'LB',
       'JORDAN', 'JO', 'IRAQ', 'IQ', 'IRAN', 'IR'].includes(countryUpper)) {
    return 'Middle East';
  }
  
  // Caribbean
  if (['BAHAMAS', 'BS', 'CAYMAN ISLANDS', 'KY', 'BERMUDA', 'BM', 'JAMAICA', 'JM'].includes(countryUpper)) {
    return 'Caribbean';
  }
  
  // Latin America
  if (['BRAZIL', 'BR', 'ARGENTINA', 'AR', 'CHILE', 'CL', 'COLOMBIA', 'CO', 'PERU', 'PE',
       'VENEZUELA', 'VE', 'ECUADOR', 'EC', 'URUGUAY', 'UY', 'PARAGUAY', 'PY'].includes(countryUpper)) {
    return 'Latin America';
  }
  
  // Africa
  if (['SOUTH AFRICA', 'ZA', 'EGYPT', 'EG', 'NIGERIA', 'NG', 'KENYA', 'KE', 'MOROCCO', 'MA',
       'ETHIOPIA', 'ET', 'GHANA', 'GH', 'TUNISIA', 'TN', 'ALGERIA', 'DZ'].includes(countryUpper)) {
    return 'Africa';
  }
  
  // If no match, return the country name itself
  return country;
};

export function LineslipReports({ lineslips, placements, contacts = [] }: LineslipReportsProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductCode | "all">("all");
  const [selectedLineslipId, setSelectedLineslipId] = useState<string>("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [selectedProducingBroker, setSelectedProducingBroker] = useState<string>("all");
  const [selectedRiskStatus, setSelectedRiskStatus] = useState<"all" | "bound" | "declined" | "ntu">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLineslip, setExpandedLineslip] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"reference" | "capacity" | "utilization" | "placements">("reference");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [regionalView, setRegionalView] = useState<"region" | "country">("region");
  const [engineTypeView, setEngineTypeView] = useState<"fixed-wing" | "rotary-wing">("fixed-wing");
  const [aircraftChartStatus, setAircraftChartStatus] = useState<"all" | "pending" | "quoted" | "firmorder" | "bound" | "declined" | "ntu">("all");

  // Reset local aircraft chart filter when global risk status changes to a single-status view
  useEffect(() => {
    if (selectedRiskStatus !== "all") {
      setAircraftChartStatus("all");
    }
  }, [selectedRiskStatus]);

  const [gwpMonthlyCumulative, setGwpMonthlyCumulative] = useState(false);
  const [gwpProductCumulative, setGwpProductCumulative] = useState(false);
  const [debouncedFilters, setDebouncedFilters] = useState({
    product: selectedProduct,
    lineslipId: selectedLineslipId,
    periodFrom,
    periodTo,
    producingBroker: selectedProducingBroker,
    riskStatus: selectedRiskStatus,
    search: searchQuery
  });
  const itemsPerPage = 10;

  // Debounce filter changes to prevent freezing
  useEffect(() => {
    setIsProcessing(true);
    setShowCharts(false); // Hide charts immediately when filter changes
    const timeout = setTimeout(() => {
      setDebouncedFilters({
        product: selectedProduct,
        lineslipId: selectedLineslipId,
        periodFrom,
        periodTo,
        producingBroker: selectedProducingBroker,
        riskStatus: selectedRiskStatus,
        search: searchQuery
      });
      setIsProcessing(false);
      setShowCharts(true); // Show charts after debounce
    }, 300);
    return () => clearTimeout(timeout);
  }, [selectedProduct, selectedLineslipId, periodFrom, periodTo, selectedProducingBroker, selectedRiskStatus, searchQuery]);

  // Producing broker contacts
  const producingBrokers = useMemo(() => {
    return contacts.filter(c => c.type === "Producing Broker");
  }, [contacts]);

  // Also extract unique producing broker names from placements (draftData.producingBroker)
  const allProducingBrokerNames = useMemo(() => {
    const fromContacts = producingBrokers.map(c => `${c.firstName} ${c.lastName}`);
    const fromPlacements = placements
      .map(p => p.draftData?.producingBroker || p.brokerName)
      .filter(Boolean);
    const unique = [...new Set([...fromContacts, ...fromPlacements])].filter(Boolean).sort();
    return unique;
  }, [producingBrokers, placements]);

  // Helper function to check if a lineslip is expired
  const isExpired = (lineslip: Lineslip): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(lineslip.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  };

  // Get effective status
  const getEffectiveStatus = (lineslip: Lineslip) => {
    if (isExpired(lineslip) && lineslip.status !== "stopped") {
      return "expired";
    }
    return lineslip.status;
  };

  // Check if active filters exist
  const hasActiveFilters = selectedProduct !== "all" || selectedLineslipId !== "all" || periodFrom !== "" || periodTo !== "" || selectedProducingBroker !== "all" || selectedRiskStatus !== "all" || searchQuery !== "";

  const clearAllFilters = () => {
    setSelectedProduct("all");
    setSelectedLineslipId("all");
    setPeriodFrom("");
    setPeriodTo("");
    setSelectedProducingBroker("all");
    setSelectedRiskStatus("all");
    setSearchQuery("");
  };

  // Filter placements that reference lineslips  
  const filteredPlacements = useMemo(() => {
    return placements.filter(p => {
      // Filter out drafts and compliance-held placements
      if (p.status === "draft" || p.status === "compliance") return false;

      // Filter by product if not "all"
      if (debouncedFilters.product !== "all" && p.productCode !== debouncedFilters.product) return false;

      // Filter by selected lineslip - using facilityRef directly
      if (debouncedFilters.lineslipId !== "all") {
        const selectedLineslip = lineslips.find(l => l.id === debouncedFilters.lineslipId);
        if (!selectedLineslip || p.facilityRef !== selectedLineslip.reference) return false;
      }

      // Filter by period (inception date)
      if (debouncedFilters.periodFrom) {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        if (inceptionDate && inceptionDate < debouncedFilters.periodFrom) return false;
      }
      if (debouncedFilters.periodTo) {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        if (inceptionDate && inceptionDate > debouncedFilters.periodTo) return false;
      }

      // Filter by producing broker
      if (debouncedFilters.producingBroker !== "all") {
        const placementBroker = p.draftData?.producingBroker || p.brokerName || "";
        if (placementBroker !== debouncedFilters.producingBroker) return false;
      }

      // Filter by risk status
      if (debouncedFilters.riskStatus !== "all") {
        if (p.status !== debouncedFilters.riskStatus) return false;
      }

      return true;
    });
  }, [placements, debouncedFilters]);

  // Filter lineslips
  const filteredLineslips = useMemo(() => {
    return lineslips.filter(l => {
      // Filter by product
      if (debouncedFilters.product !== "all" && l.productCode !== debouncedFilters.product) return false;

      // Filter by selected lineslip
      if (debouncedFilters.lineslipId !== "all" && l.id !== debouncedFilters.lineslipId) return false;

      // Filter by period overlap (lineslip period overlaps with filter range)
      if (debouncedFilters.periodFrom && l.endDate < debouncedFilters.periodFrom) return false;
      if (debouncedFilters.periodTo && l.startDate > debouncedFilters.periodTo) return false;

      // Filter by search query
      if (debouncedFilters.search) {
        const query = debouncedFilters.search.toLowerCase();
        const matchesRef = l.reference.toLowerCase().includes(query);
        const matchesName = l.name.toLowerCase().includes(query);
        const matchesUnderwriter = l.underwriters.some(u => 
          u.name.toLowerCase().includes(query) || 
          u.security.toLowerCase().includes(query)
        );
        if (!matchesRef && !matchesName && !matchesUnderwriter) return false;
      }

      return true;
    });
  }, [lineslips, debouncedFilters]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const activeLineslips = filteredLineslips.filter(l => getEffectiveStatus(l) === "active");
    const totalCapacity = activeLineslips.reduce((sum, l) => sum + l.overallLimit, 0);
    
    // Calculate utilization based on placements
    const boundPlacements = filteredPlacements.filter(p => p.status === "bound");
    const totalUtilized = boundPlacements.reduce((sum, p) => sum + (p.hullValue || 0) + (p.liability || 0), 0);
    const utilizationRate = totalCapacity > 0 ? (totalUtilized / totalCapacity) * 100 : 0;
    
    // Calculate premium volume (approximation based on typical rates)
    const estimatedPremium = boundPlacements.reduce((sum, p) => {
      const totalValue = (p.hullValue || 0) + (p.liability || 0);
      // Typical aviation insurance premium is 1-3% of insured value
      return sum + (totalValue * 0.02);
    }, 0);

    return {
      totalLineslips: filteredLineslips.length,
      activeLineslips: activeLineslips.length,
      totalCapacity,
      totalUtilized,
      utilizationRate,
      totalPlacements: filteredPlacements.length,
      boundPlacements: boundPlacements.length,
      estimatedPremium,
      averageCapacity: activeLineslips.length > 0 ? totalCapacity / activeLineslips.length : 0,
    };
  }, [filteredLineslips, filteredPlacements]);

  // Risk status counts (for filter buttons - calculated from all placements without risk status filter)
  const riskStatusCounts = useMemo(() => {
    // Filter placements without the risk status filter applied
    const placementsWithoutStatusFilter = placements.filter(p => {
      if (p.status === "draft" || p.status === "compliance") return false;
      if (debouncedFilters.product !== "all" && p.productCode !== debouncedFilters.product) return false;
      if (debouncedFilters.lineslipId !== "all") {
        const selectedLineslip = lineslips.find(l => l.id === debouncedFilters.lineslipId);
        if (!selectedLineslip || p.facilityRef !== selectedLineslip.reference) return false;
      }
      if (debouncedFilters.periodFrom) {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        if (inceptionDate && inceptionDate < debouncedFilters.periodFrom) return false;
      }
      if (debouncedFilters.periodTo) {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        if (inceptionDate && inceptionDate > debouncedFilters.periodTo) return false;
      }
      if (debouncedFilters.producingBroker !== "all") {
        const placementBroker = p.draftData?.producingBroker || p.brokerName || "";
        if (placementBroker !== debouncedFilters.producingBroker) return false;
      }
      return true;
    });

    return {
      all: placementsWithoutStatusFilter.length,
      bound: placementsWithoutStatusFilter.filter(p => p.status === "bound").length,
      declined: placementsWithoutStatusFilter.filter(p => p.status === "declined").length,
      ntu: placementsWithoutStatusFilter.filter(p => p.status === "ntu").length,
    };
  }, [placements, lineslips, debouncedFilters.product, debouncedFilters.lineslipId, debouncedFilters.periodFrom, debouncedFilters.periodTo, debouncedFilters.producingBroker]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    if (filteredLineslips.length === 0) return [];
    
    const distribution = filteredLineslips.reduce((acc, l) => {
      const status = getEffectiveStatus(l);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: ((count / filteredLineslips.length) * 100).toFixed(1),
    }));
  }, [filteredLineslips]);

  // Product distribution
  const productDistribution = useMemo(() => {
    if (filteredLineslips.length === 0) return [];
    
    const distribution = filteredLineslips.reduce((acc, l) => {
      acc[l.productCode] = (acc[l.productCode] || 0) + 1;
      return acc;
    }, {} as Record<ProductCode, number>);

    return Object.entries(distribution).map(([code, count]) => ({
      product: productNames[code as ProductCode] || code,
      code: code as ProductCode,
      count,
      value: count,
      percentage: ((count / filteredLineslips.length) * 100).toFixed(1),
    }));
  }, [filteredLineslips]);

  // Capacity by product
  const capacityByProduct = useMemo(() => {
    const capacity = filteredLineslips.reduce((acc, l) => {
      acc[l.productCode] = (acc[l.productCode] || 0) + l.overallLimit;
      return acc;
    }, {} as Record<ProductCode, number>);

    return Object.entries(capacity)
      .map(([code, total]) => ({
        product: productNames[code as ProductCode] || code,
        code: code as ProductCode,
        capacity: total,
        capacityM: total / 1000000,
      }))
      .sort((a, b) => b.capacity - a.capacity);
  }, [filteredLineslips]);

  // Placement trends over time (monthly)
  const placementTrends = useMemo(() => {
    const monthlyData: Record<string, { monthKey: string; month: string; placements: number; bound: number }> = {};

    filteredPlacements.forEach(p => {
      const date = new Date(p.submittedDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          monthKey,
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          placements: 0,
          bound: 0,
        };
      }
      
      monthlyData[monthKey].placements++;
      if (p.status === "bound") {
        monthlyData[monthKey].bound++;
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredPlacements]);

  // Placement Status Distribution
  const placementStatusDistribution = useMemo(() => {
    if (filteredPlacements.length === 0) return [];
    
    const distribution = filteredPlacements.reduce((acc, p) => {
      const status = p.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([status, count]) => ({
      status: status.toUpperCase().replace('-', ' '),
      statusKey: status,
      count,
      value: count,
      percentage: ((count / filteredPlacements.length) * 100).toFixed(1),
    }));
  }, [filteredPlacements]);

  // Insurance vs Reinsurance Distribution
  const insuranceTypeDistribution = useMemo(() => {
    if (filteredPlacements.length === 0) return [];
    
    const distribution = filteredPlacements.reduce((acc, p) => {
      // Find the lineslip for this placement
      const lineslip = lineslips.find(l => l.reference === p.facilityRef);
      const type = lineslip?.placementType || 'insurance'; // Default to insurance if not specified
      const displayType = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize first letter
      acc[displayType] = (acc[displayType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([type, count]) => ({
      type,
      count,
      value: count,
      percentage: ((count / filteredPlacements.length) * 100).toFixed(1),
    }));
  }, [filteredPlacements, lineslips]);

  // Declined Risks by Declinature Reason
  const declinatureReasons = useMemo(() => {
    const declinedPlacements = filteredPlacements.filter(p => p.status === 'declined');
    if (declinedPlacements.length === 0) return [];
    
    const distribution = declinedPlacements.reduce((acc, p) => {
      const reason = p.declineReason || 'Not Specified';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([reason, count]) => ({
      reason,
      count,
      value: count,
      percentage: ((count / declinedPlacements.length) * 100).toFixed(1),
    }));
  }, [filteredPlacements]);

  // Risks by Region
  const contractsByRegion = useMemo(() => {
    const distribution = filteredPlacements.reduce((acc, p) => {
      // Find the lineslip to determine if it's Insurance or Reinsurance
      const lineslip = lineslips.find(l => l.reference === p.facilityRef);
      const placementType = lineslip?.placementType || 'insurance';
      
      // Select country based on placement type
      let country: string | undefined;
      if (placementType === 'insurance') {
        country = p.draftData?.insuredCountry;
      } else {
        country = p.draftData?.reinsuredCountry;
      }
      
      // Map country to region
      const region = getRegionFromCountry(country);
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution)
      .map(([region, count]) => ({
        region,
        count,
      }))
      .filter(({ region }) => region !== 'Unknown')
      .sort((a, b) => b.count - a.count);
  }, [filteredPlacements, lineslips]);

  // Risks by Country
  const risksByCountry = useMemo(() => {
    const distribution = filteredPlacements.reduce((acc, p) => {
      // Find the lineslip to determine if it's Insurance or Reinsurance
      const lineslip = lineslips.find(l => l.reference === p.facilityRef);
      const placementType = lineslip?.placementType || 'insurance';
      
      // Select country based on placement type
      let country: string | undefined;
      if (placementType === 'insurance') {
        country = p.draftData?.insuredCountry;
      } else {
        country = p.draftData?.reinsuredCountry;
      }
      
      // Use the country name or 'Unknown'
      const countryName = country || 'Unknown';
      acc[countryName] = (acc[countryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution)
      .map(([country, count]) => ({
        country,
        count,
      }))
      .filter(({ country }) => country !== 'Unknown')
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Show top 15 countries
  }, [filteredPlacements, lineslips]);

  // Aircraft Type names mapping
  const aircraftTypeNames: Record<string, string> = {
    'fixed-wing': 'Fixed Wing',
    'helicopter': 'Helicopter',
    'glider': 'Glider',
    'ultralight': 'Ultralight',
    'gyroplane': 'Gyroplane',
  };

  // Engine Type names mapping
  const engineTypeNames: Record<string, string> = {
    'piston': 'Single-Engine Piston',
    'multi-engine-piston': 'Multi-Engine Piston',
    'jet': 'Jet',
    'turboprop': 'Multi-Engine Turboprop',
    'turboshaft': 'Turbine',
    'electric': 'Electric',
  };

  // Placements filtered by local aircraft chart status filter
  const aircraftChartPlacements = useMemo(() => {
    if (aircraftChartStatus === "all") return filteredPlacements;
    return filteredPlacements.filter(p => p.status === aircraftChartStatus);
  }, [filteredPlacements, aircraftChartStatus]);

  // Aircraft chart status counts (from filteredPlacements, independent of aircraftChartStatus)
  const aircraftChartStatusCounts = useMemo(() => {
    const counts = { all: filteredPlacements.length, pending: 0, quoted: 0, firmorder: 0, bound: 0, declined: 0, ntu: 0 };
    filteredPlacements.forEach(p => {
      const s = p.status as keyof typeof counts;
      if (s in counts) counts[s]++;
    });
    return counts;
  }, [filteredPlacements]);

  // Aircraft Type Distribution (from fleet data in draftData)
  const aircraftTypeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    aircraftChartPlacements.forEach(p => {
      const fleet = p.draftData?.fleet;
      if (fleet && Array.isArray(fleet)) {
        fleet.forEach((aircraft: any) => {
          const type = aircraft.aircraftType || 'Unknown';
          const displayName = aircraftTypeNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
          distribution[displayName] = (distribution[displayName] || 0) + 1;
        });
      } else if (p.aircraftType) {
        const displayName = aircraftTypeNames[p.aircraftType] || p.aircraftType.charAt(0).toUpperCase() + p.aircraftType.slice(1);
        distribution[displayName] = (distribution[displayName] || 0) + 1;
      }
    });

    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    return Object.entries(distribution)
      .map(([type, count]) => ({
        type,
        count,
        value: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [aircraftChartPlacements]);

  // Engine Type Distribution (from fleet data in draftData), filtered by aircraft category
  const engineTypeDistribution = useMemo(() => {
    const fixedWingTypes = ['fixed-wing', 'glider', 'ultralight'];
    const rotaryWingTypes = ['helicopter', 'gyroplane'];
    const allowedAircraftTypes = engineTypeView === 'fixed-wing' ? fixedWingTypes : rotaryWingTypes;

    const distribution: Record<string, number> = {};
    
    aircraftChartPlacements.forEach(p => {
      const fleet = p.draftData?.fleet;
      if (fleet && Array.isArray(fleet)) {
        fleet.forEach((aircraft: any) => {
          const aType = aircraft.aircraftType || '';
          if (!allowedAircraftTypes.includes(aType)) return;
          const type = aircraft.engineType || 'Unknown';
          const displayName = engineTypeNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
          distribution[displayName] = (distribution[displayName] || 0) + 1;
        });
      }
    });

    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    return Object.entries(distribution)
      .map(([type, count]) => ({
        type,
        count,
        value: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [aircraftChartPlacements, engineTypeView]);

  // Total Bound GWP
  const totalBoundGWP = useMemo(() => {
    return filteredPlacements
      .filter(p => p.status === 'bound')
      .reduce((sum, p) => {
        // Premium is in the quotes array - sum all quote premiums
        const totalPremium = (p.quotes || []).reduce((qSum, q) => qSum + (q.premium || 0), 0);
        return sum + totalPremium;
      }, 0);
  }, [filteredPlacements]);

  // GWP by Year
  const gwpByYear = useMemo(() => {
    const yearlyGWP = filteredPlacements
      .filter(p => p.status === 'bound')
      .reduce((acc, p) => {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        const year = inceptionDate ? new Date(inceptionDate).getFullYear() : 'Unknown';
        const totalPremium = (p.quotes || []).reduce((qSum, q) => qSum + (q.premium || 0), 0);
        acc[year] = (acc[year] || 0) + totalPremium;
        return acc;
      }, {} as Record<string | number, number>);

    return Object.entries(yearlyGWP)
      .map(([year, gwp]) => ({
        year: String(year),
        gwp,
        gwpM: gwp / 1000000,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [filteredPlacements]);

  // Premium by Year and Product (years on X-axis, products as grouped bars)
  const premiumByYearProduct = useMemo(() => {
    // Group by year and product code
    const yearlyData = filteredPlacements
      .filter(p => p.status === 'bound')
      .reduce((acc, p) => {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        const year = inceptionDate ? new Date(inceptionDate).getFullYear() : 'Unknown';
        const totalPremium = (p.quotes || []).reduce((qSum, q) => qSum + (q.premium || 0), 0);
        
        if (!acc[year]) {
          acc[year] = {};
        }
        acc[year][p.productCode] = (acc[year][p.productCode] || 0) + totalPremium;
        return acc;
      }, {} as Record<string | number, Record<string, number>>);

    // Transform to chart data format (years as rows, products as columns)
    return Object.entries(yearlyData)
      .map(([year, productData]) => {
        const row: any = { year: String(year) };
        Object.entries(productData).forEach(([code, premium]) => {
          row[code] = premium;
        });
        return row;
      })
      .sort((a, b) => b.year.localeCompare(a.year)); // Descending order (2025, 2024, 2023...)
  }, [filteredPlacements]);

  // Get unique product codes that have bound premium
  const productCodesWithPremium = useMemo(() => {
    const codes = new Set<ProductCode>();
    filteredPlacements
      .filter(p => p.status === 'bound')
      .forEach(p => codes.add(p.productCode as ProductCode));
    return Array.from(codes);
  }, [filteredPlacements]);

  // Monthly GWP by year (for Bound GWP line chart)
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const gwpByMonth = useMemo(() => {
    const yearMonthData: Record<number, Record<number, number>> = {};

    filteredPlacements
      .filter(p => p.status === 'bound')
      .forEach(p => {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        if (!inceptionDate) return;
        const d = new Date(inceptionDate);
        const year = d.getFullYear();
        const month = d.getMonth(); // 0-11
        const totalPremium = (p.quotes || []).reduce((qSum, q) => qSum + (q.premium || 0), 0);
        if (!yearMonthData[year]) yearMonthData[year] = {};
        yearMonthData[year][month] = (yearMonthData[year][month] || 0) + totalPremium;
      });

    const years = Object.keys(yearMonthData).map(Number).sort((a, b) => b - a).slice(0, 3);

    // Build chart data: one row per month
    return MONTH_NAMES.map((name, idx) => {
      const row: any = { month: name };
      if (!gwpMonthlyCumulative) {
        years.forEach(y => { row[String(y)] = yearMonthData[y]?.[idx] || 0; });
      } else {
        years.forEach(y => {
          let cumulative = 0;
          for (let m = 0; m <= idx; m++) {
            cumulative += yearMonthData[y]?.[m] || 0;
          }
          row[String(y)] = cumulative;
        });
      }
      return row;
    });
  }, [filteredPlacements, gwpMonthlyCumulative]);

  const gwpMonthlyYears = useMemo(() => {
    const yearsSet = new Set<number>();
    filteredPlacements
      .filter(p => p.status === 'bound')
      .forEach(p => {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        if (inceptionDate) yearsSet.add(new Date(inceptionDate).getFullYear());
      });
    return Array.from(yearsSet).sort((a, b) => b - a).slice(0, 3);
  }, [filteredPlacements]);

  const yearLineColors: Record<number, string> = {
    2026: '#003366',
    2025: '#003366',
    2024: '#22d3ee',
    2023: '#bef264',
    2022: '#f59e0b',
    2021: '#ef4444',
  };

  // Current year GWP by Product (monthly line chart)
  const currentYear = new Date().getFullYear();

  const gwpByProductMonth = useMemo(() => {
    const productMonthData: Record<string, Record<number, number>> = {};

    filteredPlacements
      .filter(p => p.status === 'bound')
      .forEach(p => {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        if (!inceptionDate) return;
        const d = new Date(inceptionDate);
        if (d.getFullYear() !== currentYear) return;
        const month = d.getMonth();
        const code = p.productCode;
        const totalPremium = (p.quotes || []).reduce((qSum, q) => qSum + (q.premium || 0), 0);
        if (!productMonthData[code]) productMonthData[code] = {};
        productMonthData[code][month] = (productMonthData[code][month] || 0) + totalPremium;
      });

    const activeProducts = Object.keys(productMonthData) as ProductCode[];

    return MONTH_NAMES.map((name, idx) => {
      const row: any = { month: name };
      if (!gwpProductCumulative) {
        activeProducts.forEach(code => { row[code] = productMonthData[code]?.[idx] || 0; });
      } else {
        activeProducts.forEach(code => {
          let cumulative = 0;
          for (let m = 0; m <= idx; m++) {
            cumulative += productMonthData[code]?.[m] || 0;
          }
          row[code] = cumulative;
        });
      }
      return row;
    });
  }, [filteredPlacements, gwpProductCumulative, currentYear]);

  const currentYearProducts = useMemo(() => {
    const codes = new Set<ProductCode>();
    filteredPlacements
      .filter(p => p.status === 'bound')
      .forEach(p => {
        const inceptionDate = p.draftData?.inceptionDate || p.inceptionDate || p.submittedDate;
        if (inceptionDate && new Date(inceptionDate).getFullYear() === currentYear) {
          codes.add(p.productCode as ProductCode);
        }
      });
    return Array.from(codes);
  }, [filteredPlacements, currentYear]);

  const productLineColors: Record<ProductCode, string> = {
    HW: '#1e3a5f',
    HL: '#22d3ee',
    PA: '#bef264',
    LOL: '#1a2e1a',
    HD: '#6b7280',
    UAS: '#f59e0b',
  };

  // Detailed lineslip data with metrics
  const lineslipDetails = useMemo(() => {
    // First, group placements by product code for faster lookup
    const placementsByProduct = filteredPlacements.reduce((acc, p) => {
      if (p.status !== "draft" && p.status !== "compliance") {
        if (!acc[p.productCode]) {
          acc[p.productCode] = [];
        }
        acc[p.productCode].push(p);
      }
      return acc;
    }, {} as Record<string, Placement[]>);

    return filteredLineslips.map(lineslip => {
      // Get placements for this product code
      const lineslipPlacements = placementsByProduct[lineslip.productCode] || [];
      
      const boundCount = lineslipPlacements.filter(p => p.status === "bound").length;
      const totalUtilized = lineslipPlacements
        .filter(p => p.status === "bound")
        .reduce((sum, p) => sum + (p.hullValue || 0) + (p.liability || 0), 0);
      
      const utilizationRate = lineslip.overallLimit > 0 
        ? (totalUtilized / lineslip.overallLimit) * 100 
        : 0;

      return {
        ...lineslip,
        placementCount: lineslipPlacements.length,
        boundCount,
        totalUtilized,
        utilizationRate,
      };
    });
  }, [filteredLineslips, filteredPlacements]);

  // Sort lineslip details
  const sortedLineslipDetails = useMemo(() => {
    return [...lineslipDetails].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case "reference":
          aValue = a.reference;
          bValue = b.reference;
          break;
        case "capacity":
          aValue = a.overallLimit;
          bValue = b.overallLimit;
          break;
        case "utilization":
          aValue = a.utilizationRate;
          bValue = b.utilizationRate;
          break;
        case "placements":
          aValue = a.placementCount;
          bValue = b.placementCount;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === "asc" 
        ? (aValue as number) - (bValue as number) 
        : (bValue as number) - (aValue as number);
    });
  }, [lineslipDetails, sortField, sortDirection]);

  // Paginate results
  const totalPages = Math.ceil(sortedLineslipDetails.length / itemsPerPage);
  const paginatedDetails = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedLineslipDetails.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedLineslipDetails, currentPage, itemsPerPage]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-50 text-green-700 border-green-200",
      paused: "bg-amber-50 text-amber-700 border-amber-200",
      stopped: "bg-red-50 text-red-700 border-red-200",
      expired: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return colors[status as keyof typeof colors] || colors.expired;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const handleExportReport = () => {
    // Create CSV data
    const csvData = [
      ["Lineslip Reports", `Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["Key Metrics"],
      ["Total Lineslips", metrics.totalLineslips],
      ["Active Lineslips", metrics.activeLineslips],
      ["Total Capacity", formatCurrency(metrics.totalCapacity)],
      ["Total Utilized", formatCurrency(metrics.totalUtilized)],
      ["Utilization Rate", `${metrics.utilizationRate.toFixed(2)}%`],
      ["Total Placements", metrics.totalPlacements],
      ["Bound Placements", metrics.boundPlacements],
      ["Estimated Premium", formatCurrency(metrics.estimatedPremium)],
      [],
      ["Status Distribution"],
      ["Status", "Count", "Percentage"],
      ...statusDistribution.map(s => [s.status, s.count, `${s.percentage}%`]),
      [],
      ["Product Distribution"],
      ["Product", "Count", "Percentage"],
      ...productDistribution.map(p => [p.product, p.count, `${p.percentage}%`]),
      [],
      ["Capacity by Product"],
      ["Product", "Capacity"],
      ...capacityByProduct.map(p => [p.product, formatCurrency(p.capacity)]),
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lineslip-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-0.5">Risks</h1>
          <p className="text-xs text-gray-500">
            Lineslip portfolio analytics filtered by product, facility, period, and producing broker
          </p>
        </div>
        <Button
          onClick={handleExportReport}
          className="bg-[#004225] hover:bg-[#003319] text-white"
        >
          <FileDown className="size-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="bg-white border border-gray-200 shadow-sm p-3.5 relative z-10">
        {/* Row 1: Search */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reference, name, or underwriter..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Row 2: Filter dropdowns and dates */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Product */}
          <div className="w-40">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Product</label>
            <Select value={selectedProduct} onValueChange={(value) => setSelectedProduct(value as ProductCode | "all")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {Object.entries(productNames).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {code} - {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lineslip */}
          <div className="w-52">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Lineslip</label>
            <Select value={selectedLineslipId} onValueChange={setSelectedLineslipId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Lineslips" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lineslips</SelectItem>
                {lineslips
                  .filter(l => selectedProduct === "all" || l.productCode === selectedProduct)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.reference} - {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period From */}
          <div className="w-36">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Period From</label>
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Period To */}
          <div className="w-36">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Period To</label>
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Producing Broker */}
          <div className="w-48">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Producing Broker</label>
            <Select value={selectedProducingBroker} onValueChange={setSelectedProducingBroker}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Brokers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Producing Brokers</SelectItem>
                {allProducingBrokerNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 text-xs text-gray-500 hover:text-gray-700 gap-1"
            >
              <X className="size-3" />
              Clear
            </Button>
          )}
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
            <span className="text-[10px] font-medium text-gray-400 mr-1">Active filters:</span>
            {selectedProduct !== "all" && (
              <Badge className="bg-[#004225]/5 text-[#004225] border-[#004225]/20 text-[10px] font-medium gap-1 pr-1">
                {selectedProduct}
                <button onClick={() => setSelectedProduct("all")} className="hover:text-red-600 ml-0.5"><X className="size-2.5" /></button>
              </Badge>
            )}
            {selectedLineslipId !== "all" && (
              <Badge className="bg-[#004225]/5 text-[#004225] border-[#004225]/20 text-[10px] font-medium gap-1 pr-1">
                {lineslips.find(l => l.id === selectedLineslipId)?.reference || "Lineslip"}
                <button onClick={() => setSelectedLineslipId("all")} className="hover:text-red-600 ml-0.5"><X className="size-2.5" /></button>
              </Badge>
            )}
            {periodFrom && (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] font-medium gap-1 pr-1">
                From: {periodFrom}
                <button onClick={() => setPeriodFrom("")} className="hover:text-red-600 ml-0.5"><X className="size-2.5" /></button>
              </Badge>
            )}
            {periodTo && (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] font-medium gap-1 pr-1">
                To: {periodTo}
                <button onClick={() => setPeriodTo("")} className="hover:text-red-600 ml-0.5"><X className="size-2.5" /></button>
              </Badge>
            )}
            {selectedProducingBroker !== "all" && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium gap-1 pr-1">
                {selectedProducingBroker}
                <button onClick={() => setSelectedProducingBroker("all")} className="hover:text-red-600 ml-0.5"><X className="size-2.5" /></button>
              </Badge>
            )}
            {searchQuery && (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] font-medium gap-1 pr-1">
                "{searchQuery}"
                <button onClick={() => setSearchQuery("")} className="hover:text-red-600 ml-0.5"><X className="size-2.5" /></button>
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Risk Status Filter Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedRiskStatus("all")}
          className="text-left transition-all hover:shadow-md"
        >
          <Card className={`bg-white shadow-sm p-3.5 h-full ${
            selectedRiskStatus === "all"
              ? "border-2 border-[#004225]"
              : "border border-gray-200"
          }`}>
            <div>
              <p className="text-[10px] font-medium text-gray-500 mb-0.5">All Risks</p>
              <p className="text-xl font-bold text-gray-900">{riskStatusCounts.all}</p>
            </div>
          </Card>
        </button>

        <button
          onClick={() => setSelectedRiskStatus("bound")}
          className="text-left transition-all hover:shadow-md"
        >
          <Card className={`bg-white shadow-sm p-3.5 h-full ${
            selectedRiskStatus === "bound"
              ? "border-2 border-[#004225]"
              : "border border-gray-200"
          }`}>
            <div>
              <p className="text-[10px] font-medium text-gray-500 mb-0.5">Bound Risks</p>
              <p className="text-xl font-bold text-gray-900">{riskStatusCounts.bound}</p>
            </div>
          </Card>
        </button>

        <button
          onClick={() => setSelectedRiskStatus("declined")}
          className="text-left transition-all hover:shadow-md"
        >
          <Card className={`bg-white shadow-sm p-3.5 h-full ${
            selectedRiskStatus === "declined"
              ? "border-2 border-[#004225]"
              : "border border-gray-200"
          }`}>
            <div>
              <p className="text-[10px] font-medium text-gray-500 mb-0.5">Declined Risks</p>
              <p className="text-xl font-bold text-gray-900">{riskStatusCounts.declined}</p>
            </div>
          </Card>
        </button>

        <button
          onClick={() => setSelectedRiskStatus("ntu")}
          className="text-left transition-all hover:shadow-md"
        >
          <Card className={`bg-white shadow-sm p-3.5 h-full ${
            selectedRiskStatus === "ntu"
              ? "border-2 border-[#004225]"
              : "border border-gray-200"
          }`}>
            <div>
              <p className="text-[10px] font-medium text-gray-500 mb-0.5">NTU Risks</p>
              <p className="text-xl font-bold text-gray-900">{riskStatusCounts.ntu}</p>
            </div>
          </Card>
        </button>
      </div>

      {/* New Placement Analytics Charts */}
      {showCharts && (
        <>
          {/* Row 1: Placement Status & Insurance Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Placement Status Distribution */}
            {selectedRiskStatus !== "declined" && selectedRiskStatus !== "ntu" && placementStatusDistribution.length > 0 && (
              <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
                <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-[#004225]" />
                  Risks by Status
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={placementStatusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={85}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="status"
                        >
                          {placementStatusDistribution.map((entry) => {
                            const colors: Record<string, string> = {
                              'PENDING': '#f59e0b',
                              'QUOTED': '#3b82f6',
                              'FIRM ORDER': '#8b5cf6',
                              'BOUND': '#22c55e',
                              'DECLINED': '#ef4444',
                              'NTU': '#6b7280',
                            };
                            return (
                              <Cell key={`cell-${entry.statusKey}`} fill={colors[entry.status] || '#9ca3af'} />
                            );
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            color: '#111827',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {placementStatusDistribution.map((entry) => {
                      const colors: Record<string, string> = {
                        'PENDING': '#f59e0b',
                        'QUOTED': '#3b82f6',
                        'FIRM ORDER': '#8b5cf6',
                        'BOUND': '#22c55e',
                        'DECLINED': '#ef4444',
                        'NTU': '#6b7280',
                      };
                      return (
                        <div key={entry.statusKey} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-sm flex-shrink-0" 
                            style={{ backgroundColor: colors[entry.status] || '#9ca3af' }}
                          />
                          <span className="text-xs text-gray-700">{entry.status.charAt(0).toUpperCase() + entry.status.slice(1).toLowerCase()}</span>
                          <span className="text-xs font-semibold text-gray-900 ml-auto">{entry.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* Insurance vs Reinsurance */}
            {insuranceTypeDistribution.length > 0 && (
              <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
                <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Layers className="size-4 text-[#004225]" />
                  Insurance vs Reinsurance
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={insuranceTypeDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={85}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="type"
                        >
                          {insuranceTypeDistribution.map((entry) => (
                            <Cell 
                              key={`cell-${entry.type}`} 
                              fill={entry.type === 'Insurance' ? '#004225' : '#a855f7'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            color: '#111827',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {insuranceTypeDistribution.map((entry) => (
                      <div key={entry.type} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm flex-shrink-0" 
                          style={{ backgroundColor: entry.type === 'Insurance' ? '#004225' : '#a855f7' }}
                        />
                        <span className="text-xs text-gray-700">{entry.type.charAt(0).toUpperCase() + entry.type.slice(1).toLowerCase()}</span>
                        <span className="text-xs font-semibold text-gray-900 ml-auto">{entry.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Row 2: Declined Risks & Risks by Region */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Declined Risks by Declinature Reason */}
            {declinatureReasons.length > 0 && (
              <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
                <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="size-4 text-red-500" />
                  Declined Risks by Reason
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={declinatureReasons}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ reason, percentage }) => `${reason.substring(0, 15)}: ${percentage}%`}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="reason"
                    >
                      {declinatureReasons.map((_, index) => {
                        const colors = ['#ef4444', '#f97316', '#fb923c', '#fdba74', '#fcd34d'];
                        return (
                          <Cell key={`cell-declined-${index}`} fill={colors[index % colors.length]} />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Risks by Region/Country */}
            {(contractsByRegion.length > 0 || risksByCountry.length > 0) && (
              <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Activity className="size-4 text-[#004225]" />
                    {regionalView === "region" ? "Risks by Region" : "Risks by Country (Top 15)"}
                  </h3>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => setRegionalView("region")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                        regionalView === "region"
                          ? "bg-white text-[#004225] shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Region
                    </button>
                    <button
                      onClick={() => setRegionalView("country")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                        regionalView === "country"
                          ? "bg-white text-[#004225] shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Country
                    </button>
                  </div>
                </div>
                
                {regionalView === "region" ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={contractsByRegion}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="region" 
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        label={{ value: 'Number of Risks', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#111827',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar dataKey="count" fill="#004225" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={risksByCountry} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        type="number"
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        label={{ value: 'Number of Risks', position: 'insideBottom', offset: -5, fill: '#6b7280' }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="country" 
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        width={120}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#111827',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar dataKey="count" fill="#004225" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}
          </div>

          {/* Row 3: Aircraft Type & Engine Type */}
          {(aircraftTypeDistribution.length > 0 || engineTypeDistribution.length > 0 || aircraftChartStatus !== "all") && (
          <div className="space-y-3">
            {/* Aircraft Chart Status Filter Buttons - only show when global filter allows multiple statuses */}
            {selectedRiskStatus === "all" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "quoted", label: "Quoted" },
                { key: "firmorder", label: "Firm Order" },
                { key: "bound", label: "Bound" },
                { key: "declined", label: "Declined" },
                { key: "ntu", label: "NTU" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setAircraftChartStatus(key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                    aircraftChartStatus === key
                      ? "bg-[#004225] text-white border-[#004225]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                  }`}
                >
                  {label}
                  <span className={`ml-1.5 text-[10px] ${
                    aircraftChartStatus === key ? "text-white/70" : "text-gray-400"
                  }`}>
                    {aircraftChartStatusCounts[key]}
                  </span>
                </button>
              ))}
            </div>
            )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Aircraft Type Distribution */}
              <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
                <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Plane className="size-4 text-[#004225]" />
                  Risks by Aircraft Type
                </h3>
                {aircraftTypeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={aircraftTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="type"
                    >
                      {aircraftTypeDistribution.map((_, index) => {
                        const colors = ['#004225', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'];
                        return (
                          <Cell key={`cell-aircraft-${index}`} fill={colors[index % colors.length]} />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-gray-400 text-xs">
                    No aircraft data for selected status
                  </div>
                )}
              </Card>

            {/* Engine Type Distribution */}
              <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Cog className="size-4 text-[#004225]" />
                    Risks by Engine Type
                  </h3>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => setEngineTypeView("fixed-wing")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                        engineTypeView === "fixed-wing"
                          ? "bg-white text-[#004225] shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Fixed Wing
                    </button>
                    <button
                      onClick={() => setEngineTypeView("rotary-wing")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                        engineTypeView === "rotary-wing"
                          ? "bg-white text-[#004225] shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Rotary Wing
                    </button>
                  </div>
                </div>
                {engineTypeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={engineTypeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="type" 
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        allowDecimals={false}
                        label={{ value: 'Aircraft Count', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#111827',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar dataKey="count" fill="#004225" radius={[6, 6, 0, 0]}>
                        {engineTypeDistribution.map((_, index) => {
                          const colors = ['#004225', '#065f46', '#047857', '#059669', '#10b981', '#34d399'];
                          return (
                            <Cell key={`cell-engine-${index}`} fill={colors[index % colors.length]} />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-gray-400 text-xs">
                    No {engineTypeView === "fixed-wing" ? "fixed wing" : "rotary wing"} aircraft in current data
                  </div>
                )}
              </Card>
          </div>
          </div>
          )}

          {/* Row 4: GWP by Year & Bound Premium by Product */}
          {selectedRiskStatus !== "declined" && selectedRiskStatus !== "ntu" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* GWP by Year Card */}
            <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
              <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                <DollarSign className="size-4 text-[#004225]" />
                Bound GWP by Year
              </h3>
              {gwpByYear.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={gwpByYear}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#9ca3af" 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      style={{ fontSize: '11px' }}
                      tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ fontSize: '11px' }}
                    />
                    <Bar dataKey="gwp" fill="#004225" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px]">
                  <p className="text-sm text-gray-400">No bound placements yet</p>
                </div>
              )}
            </Card>

            {/* Bound Premium by Product */}
            {premiumByYearProduct.length > 0 && productCodesWithPremium.length > 0 && (
              <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
                <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <BarChart3 className="size-4 text-[#004225]" />
                  Bound Premium by Product
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={premiumByYearProduct}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#9ca3af" 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Premium']}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px' }}
                      iconType="rect"
                    />
                    {productCodesWithPremium.map((code) => (
                      <Bar 
                        key={`product-${code}`}
                        dataKey={code} 
                        fill={productColors[code]} 
                        radius={[4, 4, 0, 0]}
                        name={productNames[code] || code}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
          )}

          {/* Row 5: Bound GWP per Month & Current Year GWP by Product */}
          {selectedRiskStatus !== "declined" && selectedRiskStatus !== "ntu" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Bound GWP per Month */}
            <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <TrendingUp className="size-4 text-[#004225]" />
                  Bound GWP
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGwpMonthlyCumulative(!gwpMonthlyCumulative)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      gwpMonthlyCumulative ? 'bg-[#004225]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        gwpMonthlyCumulative ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-gray-600 font-medium">Cumulative</span>
                </div>
              </div>
              {gwpMonthlyYears.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={gwpByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#9ca3af"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'GWP']}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      iconType="circle"
                    />
                    {gwpMonthlyYears.map((year) => (
                      <Line
                        key={`year-${year}`}
                        type="monotone"
                        dataKey={String(year)}
                        stroke={yearLineColors[year] || '#6b7280'}
                        strokeWidth={2}
                        dot={{ r: 4, fill: yearLineColors[year] || '#6b7280' }}
                        activeDot={{ r: 6 }}
                        name={String(year)}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <p className="text-sm text-gray-400">No bound placements yet</p>
                </div>
              )}
            </Card>

            {/* Current Year GWP by Product */}
            <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <BarChart3 className="size-4 text-[#004225]" />
                  {currentYear} GWP by Product
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGwpProductCumulative(!gwpProductCumulative)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      gwpProductCumulative ? 'bg-[#004225]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        gwpProductCumulative ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-gray-600 font-medium">Cumulative</span>
                </div>
              </div>
              {currentYearProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={gwpByProductMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#9ca3af"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                      formatter={(value: number, name: string) => [formatCurrency(value), productNames[name as ProductCode] || name]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      iconType="circle"
                      formatter={(value: string) => productNames[value as ProductCode] || value}
                    />
                    {currentYearProducts.map((code) => (
                      <Line
                        key={`product-month-${code}`}
                        type="monotone"
                        dataKey={code}
                        stroke={productLineColors[code] || '#6b7280'}
                        strokeWidth={2}
                        dot={{ r: 4, fill: productLineColors[code] || '#6b7280' }}
                        activeDot={{ r: 6 }}
                        name={code}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <p className="text-sm text-gray-400">No bound placements for {currentYear}</p>
                </div>
              )}
            </Card>
          </div>
          )}
        </>
      )}

      {/* Detailed Lineslip Breakdown Table */}
      <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
        <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Eye className="size-4 text-[#004225]" />
          Detailed Lineslip Breakdown
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button 
                    onClick={() => handleSort("reference")}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Reference
                    {sortField === "reference" && (
                      sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                    )}
                  </button>
                </th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Lineslip Name</th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button 
                    onClick={() => handleSort("capacity")}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors ml-auto"
                  >
                    Capacity
                    {sortField === "capacity" && (
                      sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                    )}
                  </button>
                </th>
                <th className="text-right p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button 
                    onClick={() => handleSort("utilization")}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors ml-auto"
                  >
                    Utilization
                    {sortField === "utilization" && (
                      sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                    )}
                  </button>
                </th>
                <th className="text-right p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button 
                    onClick={() => handleSort("placements")}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors ml-auto"
                  >
                    Placements
                    {sortField === "placements" && (
                      sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                    )}
                  </button>
                </th>
                <th className="text-center p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedDetails.flatMap((lineslip) => [
                  <tr 
                    key={lineslip.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-2.5">
                      <span className="text-xs font-medium text-gray-900">{lineslip.reference}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="text-xs text-gray-600">{lineslip.name}</span>
                    </td>
                    <td className="p-2.5">
                      <Badge 
                        className="border text-[10px] font-bold"
                        style={{ 
                          backgroundColor: `${productColors[lineslip.productCode]}15`,
                          color: productColors[lineslip.productCode],
                          borderColor: `${productColors[lineslip.productCode]}40`
                        }}
                      >
                        {lineslip.productCode}
                      </Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge className={`border text-[10px] font-bold ${getStatusBadge(getEffectiveStatus(lineslip))}`}>
                        {getEffectiveStatus(lineslip).toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-right">
                      <span className="text-xs font-medium text-gray-900">
                        {formatCurrency(lineslip.overallLimit / 1000000)}M
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              lineslip.utilizationRate > 80 ? 'bg-red-500' :
                              lineslip.utilizationRate > 60 ? 'bg-amber-500' :
                              'bg-[#004225]'
                            }`}
                            style={{ width: `${Math.min(lineslip.utilizationRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-gray-700 min-w-[36px] text-right">
                          {lineslip.utilizationRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-medium text-gray-900">{lineslip.placementCount}</span>
                        <span className="text-[10px] text-gray-400">{lineslip.boundCount} bound</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedLineslip(expandedLineslip === lineslip.id ? null : lineslip.id)}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        {expandedLineslip === lineslip.id ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    </td>
                  </tr>,
                  
                  /* Expanded Details */
                  expandedLineslip === lineslip.id ? (
                    <tr key={`${lineslip.id}-expanded`} className="bg-gray-50/70">
                      <td colSpan={8} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Period */}
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Period</p>
                            <p className="text-sm text-gray-900">
                              {new Date(lineslip.startDate).toLocaleDateString()} - {new Date(lineslip.endDate).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Underwriters */}
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Underwriters</p>
                            <div className="space-y-1.5">
                              {lineslip.underwriters.map((uw) => (
                                <div key={uw.id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-900">{uw.name} ({uw.security})</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">
                                      {uw.role}
                                    </Badge>
                                    <span className="text-gray-600 text-xs">{uw.percentage}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Limits by Aircraft Type */}
                          {(lineslip.maxHullLimitFixedWing || lineslip.maxLiabilityLimitFixedWing) && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Fixed Wing Limits</p>
                              <div className="text-sm space-y-0.5">
                                {lineslip.maxHullLimitFixedWing && (
                                  <p className="text-gray-900">Hull: {formatCurrency(lineslip.maxHullLimitFixedWing)}</p>
                                )}
                                {lineslip.maxLiabilityLimitFixedWing && (
                                  <p className="text-gray-900">Liability: {formatCurrency(lineslip.maxLiabilityLimitFixedWing)}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {(lineslip.maxHullLimitRotaryWing || lineslip.maxLiabilityLimitRotaryWing) && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Rotary Wing Limits</p>
                              <div className="text-sm space-y-0.5">
                                {lineslip.maxHullLimitRotaryWing && (
                                  <p className="text-gray-900">Hull: {formatCurrency(lineslip.maxHullLimitRotaryWing)}</p>
                                )}
                                {lineslip.maxLiabilityLimitRotaryWing && (
                                  <p className="text-gray-900">Liability: {formatCurrency(lineslip.maxLiabilityLimitRotaryWing)}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Brokerage */}
                          {(lineslip.insuranceCompositeBrokerage || lineslip.reinsuranceCompositeBrokerage) && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Brokerage</p>
                              <div className="text-sm space-y-0.5">
                                {lineslip.insuranceCompositeBrokerage && (
                                  <p className="text-gray-900">Insurance: {lineslip.insuranceCompositeBrokerage}%</p>
                                )}
                                {lineslip.reinsuranceCompositeBrokerage && (
                                  <p className="text-gray-900">Reinsurance: {lineslip.reinsuranceCompositeBrokerage}%</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Countries */}
                          {lineslip.countries && lineslip.countries.length > 0 && (
                            <div className="md:col-span-2 lg:col-span-3">
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Covered Countries</p>
                              <div className="flex flex-wrap gap-1.5">
                                {lineslip.countries.map((country, idx) => (
                                  <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">
                                    {country}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Utilization Details */}
                          <div className="md:col-span-2 lg:col-span-3 bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Utilization Details</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">Total Capacity</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(lineslip.overallLimit / 1000000)}M
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">Utilized</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(lineslip.totalUtilized / 1000000)}M
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">Available</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency((lineslip.overallLimit - lineslip.totalUtilized) / 1000000)}M
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">Utilization Rate</p>
                                <p className={`text-lg font-semibold ${
                                  lineslip.utilizationRate > 80 ? 'text-red-600' :
                                  lineslip.utilizationRate > 60 ? 'text-amber-600' :
                                  'text-[#004225]'
                                }`}>
                                  {lineslip.utilizationRate.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null,
              ])}
            </tbody>
          </table>

          {sortedLineslipDetails.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="size-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm font-medium">No lineslips found matching your criteria</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}