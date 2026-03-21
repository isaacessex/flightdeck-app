import { useState, useMemo } from "react";
import { Placement, Lineslip } from "../App";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Globe,
  MapPin,
  Plane,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

interface ReportsMapProps {
  placements: Placement[];
  lineslips: Lineslip[];
}

// Regions with sub-regions and representative coordinates
const regionData: Record<string, { label: string; lat: number; lng: number; countries: string[] }> = {
  "uk": { label: "United Kingdom", lat: 54.0, lng: -2.0, countries: ["United Kingdom", "UK", "England", "Scotland", "Wales", "Northern Ireland", "Isle of Man", "Channel Islands", "Jersey", "Guernsey"] },
  "western-europe": { label: "Western Europe", lat: 48.0, lng: 5.0, countries: ["France", "Germany", "Netherlands", "Belgium", "Switzerland", "Austria", "Luxembourg", "Liechtenstein", "Monaco"] },
  "southern-europe": { label: "Southern Europe", lat: 41.0, lng: 14.0, countries: ["Spain", "Italy", "Portugal", "Greece", "Malta", "Cyprus", "Croatia", "Slovenia"] },
  "northern-europe": { label: "Northern Europe", lat: 60.0, lng: 15.0, countries: ["Sweden", "Norway", "Denmark", "Finland", "Iceland", "Ireland"] },
  "eastern-europe": { label: "Eastern Europe", lat: 50.0, lng: 25.0, countries: ["Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria", "Slovakia", "Estonia", "Latvia", "Lithuania", "Ukraine", "Moldova", "Serbia", "Bosnia", "Montenegro", "North Macedonia", "Albania", "Kosovo"] },
  "north-america": { label: "North America", lat: 40.0, lng: -100.0, countries: ["United States", "USA", "US", "Canada", "Mexico"] },
  "caribbean": { label: "Caribbean", lat: 18.0, lng: -72.0, countries: ["Jamaica", "Bahamas", "Trinidad and Tobago", "Barbados", "Cayman Islands", "Bermuda", "Virgin Islands", "Puerto Rico", "Dominican Republic", "Haiti", "Cuba", "Turks and Caicos"] },
  "central-america": { label: "Central America", lat: 14.0, lng: -87.0, countries: ["Guatemala", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama", "Belize"] },
  "south-america": { label: "South America", lat: -15.0, lng: -55.0, countries: ["Brazil", "Argentina", "Chile", "Colombia", "Peru", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname"] },
  "middle-east": { label: "Middle East", lat: 28.0, lng: 45.0, countries: ["UAE", "United Arab Emirates", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain", "Jordan", "Lebanon", "Israel", "Iraq", "Iran", "Yemen", "Syria", "Turkey"] },
  "north-africa": { label: "North Africa", lat: 28.0, lng: 10.0, countries: ["Egypt", "Morocco", "Algeria", "Tunisia", "Libya"] },
  "west-africa": { label: "West Africa", lat: 10.0, lng: -5.0, countries: ["Nigeria", "Ghana", "Senegal", "Ivory Coast", "Cameroon", "Mali", "Burkina Faso", "Niger", "Guinea", "Sierra Leone", "Liberia", "Togo", "Benin", "Gambia"] },
  "east-africa": { label: "East Africa", lat: 0.0, lng: 35.0, countries: ["Kenya", "Ethiopia", "Tanzania", "Uganda", "Rwanda", "Burundi", "Somalia", "South Sudan", "Djibouti", "Eritrea", "Mozambique", "Madagascar"] },
  "southern-africa": { label: "Southern Africa", lat: -25.0, lng: 27.0, countries: ["South Africa", "Namibia", "Botswana", "Zimbabwe", "Zambia", "Angola", "Malawi", "Lesotho", "Eswatini", "Swaziland", "Democratic Republic of Congo", "Republic of Congo"] },
  "south-asia": { label: "South Asia", lat: 22.0, lng: 80.0, countries: ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan", "Maldives", "Afghanistan"] },
  "east-asia": { label: "East Asia", lat: 35.0, lng: 115.0, countries: ["China", "Japan", "South Korea", "North Korea", "Taiwan", "Mongolia", "Hong Kong", "Macau"] },
  "southeast-asia": { label: "Southeast Asia", lat: 5.0, lng: 110.0, countries: ["Singapore", "Malaysia", "Indonesia", "Thailand", "Vietnam", "Philippines", "Myanmar", "Cambodia", "Laos", "Brunei", "Timor-Leste"] },
  "central-asia": { label: "Central Asia", lat: 42.0, lng: 65.0, countries: ["Kazakhstan", "Uzbekistan", "Turkmenistan", "Tajikistan", "Kyrgyzstan", "Georgia", "Armenia", "Azerbaijan"] },
  "oceania": { label: "Oceania", lat: -30.0, lng: 145.0, countries: ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Solomon Islands", "Samoa", "Tonga", "Vanuatu"] },
  "russia": { label: "Russia / CIS", lat: 60.0, lng: 90.0, countries: ["Russia", "Russian Federation", "Belarus"] },
};

// Match a country string to a region
function getRegionForCountry(country: string): string | null {
  const lower = country.toLowerCase().trim();
  for (const [regionKey, data] of Object.entries(regionData)) {
    for (const c of data.countries) {
      if (c.toLowerCase() === lower) return regionKey;
    }
  }
  return null;
}

export function ReportsMap({ placements, lineslips }: ReportsMapProps) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  // Build region-level data from lineslip countries + placement data
  const regionStats = useMemo(() => {
    const stats: Record<string, {
      regionKey: string;
      label: string;
      lineslipCount: number;
      placementCount: number;
      boundCount: number;
      totalValue: number;
      countries: Set<string>;
      lineslipRefs: string[];
    }> = {};

    // From lineslips — they have explicit country lists
    lineslips.forEach((ls) => {
      if (!ls.countries) return;
      ls.countries.forEach((country) => {
        const rk = getRegionForCountry(country);
        if (!rk) return;
        if (!stats[rk]) {
          stats[rk] = {
            regionKey: rk,
            label: regionData[rk].label,
            lineslipCount: 0,
            placementCount: 0,
            boundCount: 0,
            totalValue: 0,
            countries: new Set(),
            lineslipRefs: [],
          };
        }
        stats[rk].countries.add(country);
        if (!stats[rk].lineslipRefs.includes(ls.reference)) {
          stats[rk].lineslipRefs.push(ls.reference);
          stats[rk].lineslipCount++;
        }
      });
    });

    // From placements — use draftData.countries if available
    const nonDraft = placements.filter((p) => p.status !== "draft" && p.status !== "compliance");
    nonDraft.forEach((p) => {
      const countries: string[] = p.draftData?.countries || [];
      const regions = new Set<string>();

      countries.forEach((c: string) => {
        const rk = getRegionForCountry(c);
        if (rk) regions.add(rk);
      });

      // If no countries matched, try insured name / broker company as fallback — skip
      if (regions.size === 0) {
        // Put into "uk" as default since this is London market
        regions.add("uk");
      }

      regions.forEach((rk) => {
        if (!stats[rk]) {
          stats[rk] = {
            regionKey: rk,
            label: regionData[rk].label,
            lineslipCount: 0,
            placementCount: 0,
            boundCount: 0,
            totalValue: 0,
            countries: new Set(),
            lineslipRefs: [],
          };
        }
        stats[rk].placementCount++;
        if (p.status === "bound") stats[rk].boundCount++;
        stats[rk].totalValue += (p.hullValue || 0) + (p.liability || 0);
      });
    });

    return Object.values(stats).sort((a, b) => b.placementCount - a.placementCount);
  }, [lineslips, placements]);

  // Overall metrics
  const totalRegions = regionStats.length;
  const totalPlacements = regionStats.reduce((s, r) => s + r.placementCount, 0);
  const totalLineslips = regionStats.reduce((s, r) => s + r.lineslipCount, 0);
  const totalValue = regionStats.reduce((s, r) => s + r.totalValue, 0);
  const topRegion = regionStats[0];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  // Simple SVG world map with region markers
  const maxPlacements = Math.max(...regionStats.map((r) => r.placementCount), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Geographic Coverage</h1>
        <p className="text-xs text-gray-500">Regional distribution of lineslip coverage and placement activity</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Active Regions</p>
          <p className="text-xl font-bold text-gray-900">{totalRegions}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Coverage Lineslips</p>
          <p className="text-xl font-bold text-[#004225]">{totalLineslips}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Total Placements</p>
          <p className="text-xl font-bold text-gray-900">{totalPlacements}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Total Insured Value</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue / 1000000)}M</p>
        </Card>
      </div>

      {/* Map Visualisation */}
      <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
        <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Globe className="size-3.5 text-[#004225]" />
          World Coverage Map
        </h3>
        <div className="relative bg-[#f0f4f0] rounded-lg overflow-hidden" style={{ height: 380 }}>
          <svg viewBox="-10 -5 380 205" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Simplified continent outlines */}
            {/* North America */}
            <path d="M40,30 L55,25 L70,28 L85,22 L100,30 L105,45 L100,60 L90,70 L80,75 L70,65 L55,60 L45,50 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* Central America */}
            <path d="M70,65 L80,75 L82,85 L78,90 L72,88 L68,80 L65,70 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* South America */}
            <path d="M82,85 L90,88 L100,95 L105,110 L100,130 L95,150 L85,165 L75,160 L70,140 L68,120 L72,100 L78,90 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* Europe */}
            <path d="M160,22 L175,18 L190,20 L195,28 L200,35 L195,42 L188,45 L180,42 L172,45 L165,40 L160,35 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* UK / Ireland */}
            <path d="M152,25 L158,22 L160,28 L157,32 L153,30 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* Africa */}
            <path d="M165,55 L180,50 L195,52 L205,60 L210,75 L208,95 L200,115 L190,130 L180,135 L170,125 L165,110 L160,90 L162,70 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* Russia / Central Asia */}
            <path d="M195,18 L220,12 L250,10 L280,12 L310,15 L320,22 L315,30 L300,32 L280,30 L260,28 L240,30 L220,28 L200,30 L195,25 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* Middle East */}
            <path d="M200,42 L215,38 L225,42 L228,52 L222,58 L210,55 L205,48 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* South Asia */}
            <path d="M240,42 L255,38 L260,48 L255,58 L248,65 L240,60 L238,50 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* East Asia */}
            <path d="M280,25 L300,22 L315,28 L320,38 L310,45 L295,42 L285,38 L278,32 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* Southeast Asia */}
            <path d="M278,55 L290,50 L305,52 L310,60 L305,70 L295,75 L285,72 L278,65 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            {/* Australia */}
            <path d="M290,105 L310,100 L330,102 L340,110 L338,125 L325,135 L310,130 L295,125 L288,115 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />

            {/* Region markers */}
            {regionStats.map((region) => {
              const rd = regionData[region.regionKey];
              if (!rd) return null;
              // Convert lat/lng to SVG coords (simple equirectangular)
              const x = ((rd.lng + 180) / 360) * 360;
              const y = ((90 - rd.lat) / 180) * 200;
              const radius = 4 + (region.placementCount / maxPlacements) * 10;
              const isExpanded = expandedRegion === region.regionKey;

              return (
                <g key={region.regionKey} className="cursor-pointer" onClick={() => setExpandedRegion(isExpanded ? null : region.regionKey)}>
                  {/* Pulse ring */}
                  <circle cx={x} cy={y} r={radius + 3} fill="none" stroke="#004225" strokeWidth="1" opacity="0.3">
                    <animate attributeName="r" from={radius + 2} to={radius + 8} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  {/* Main dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={isExpanded ? "#004225" : "#004225"}
                    opacity={isExpanded ? 1 : 0.7}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  {/* Count label */}
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="7" fontWeight="bold">
                    {region.placementCount}
                  </text>
                  {/* Region name (on hover / expanded) */}
                  {isExpanded && (
                    <text x={x} y={y - radius - 5} textAnchor="middle" fill="#004225" fontSize="7" fontWeight="600">
                      {region.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* Region Breakdown Table */}
      <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
        <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <MapPin className="size-3.5 text-[#004225]" />
          Regional Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="text-center p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Lineslips</th>
                <th className="text-center p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Placements</th>
                <th className="text-center p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Bound</th>
                <th className="text-right p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Insured Value</th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Countries</th>
                <th className="text-center p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {regionStats.flatMap((region) => [
                <tr
                  key={region.regionKey}
                  className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${expandedRegion === region.regionKey ? "bg-gray-50/70" : ""}`}
                >
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#004225]" />
                      <span className="text-xs font-medium text-gray-900">{region.label}</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="text-xs font-medium text-gray-900">{region.lineslipCount}</span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="text-xs font-medium text-gray-900">{region.placementCount}</span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="text-xs font-medium text-green-700">{region.boundCount}</span>
                  </td>
                  <td className="p-2.5 text-right">
                    <span className="text-xs font-medium text-gray-900">{formatCurrency(region.totalValue)}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="text-xs text-gray-500">{region.countries.size} {region.countries.size === 1 ? "country" : "countries"}</span>
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => setExpandedRegion(expandedRegion === region.regionKey ? null : region.regionKey)}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {expandedRegion === region.regionKey ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  </td>
                </tr>,
                expandedRegion === region.regionKey ? (
                  <tr key={`${region.regionKey}-exp`} className="bg-gray-50/70">
                    <td colSpan={7} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Countries Covered</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[...region.countries].sort().map((country) => (
                              <Badge key={country} variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">
                                {country}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {region.lineslipRefs.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Lineslip References</p>
                            <div className="flex flex-wrap gap-1.5">
                              {region.lineslipRefs.map((ref) => (
                                <Badge key={ref} className="border text-[10px] font-bold bg-[#004225]/5 text-[#004225] border-[#004225]/20">
                                  {ref}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null,
              ])}
            </tbody>
          </table>
          {regionStats.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="size-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm font-medium">No geographic data available</p>
              <p className="text-gray-400 text-xs mt-1">Add countries to your lineslips to see coverage</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}