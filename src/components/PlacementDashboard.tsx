import { Placement, UserRole, Lineslip } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PlaneTakeoff, Building2, UserX, Search, Radar, ChevronDown, LayoutGrid, Clock, CheckCircle2, FileText, Plus, Shield, Lock, Zap } from "lucide-react";
import { useState, useMemo } from "react";

interface PlacementDashboardProps {
  placements: Placement[];
  userRole: UserRole;
  currentUser?: any;
  onGetQuote?: () => void;
  onClickPlacement?: (placementId: string) => void;
  lineslips?: Lineslip[];
}

export function PlacementDashboard({ placements, onClickPlacement, onGetQuote, userRole, currentUser, lineslips = [] }: PlacementDashboardProps) {

  // Display UMR with "Q" prefix for pre-firm-order statuses
  const displayUMR = (placement: Placement) => {
    const preOrderStatuses = ["draft", "compliance", "pending", "quoted"];
    const prefix = preOrderStatuses.includes(placement.status) ? "Q" : "";
    return `${prefix}${placement.reference}`;
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // Facility-based access control for underwriters
  // Find all lineslip references where the current user's company is the Lead underwriter
  const ledFacilityRefs = useMemo(() => {
    if (userRole !== "underwriter" || !currentUser?.company) return null;
    const companyLower = currentUser.company.toLowerCase().trim();
    return lineslips
      .filter(ls => ls.underwriters.some(u => 
        u.role === "Lead" && u.name.toLowerCase().trim() === companyLower
      ))
      .map(ls => ls.reference);
  }, [userRole, currentUser?.company, lineslips]);

  // Get the product codes the underwriter leads (for display purposes)
  const ledProducts = useMemo(() => {
    if (userRole !== "underwriter" || !currentUser?.company) return [];
    const companyLower = currentUser.company.toLowerCase().trim();
    return lineslips
      .filter(ls => ls.underwriters.some(u => 
        u.role === "Lead" && u.name.toLowerCase().trim() === companyLower
      ))
      .map(ls => ({ productCode: ls.productCode, name: ls.name, reference: ls.reference }));
  }, [userRole, currentUser?.company, lineslips]);

  // Apply facility-based filtering for underwriters before any other filters
  const accessiblePlacements = useMemo(() => {
    if (userRole !== "underwriter" || ledFacilityRefs === null) return placements;
    // Underwriters can only see placements submitted against facilities they lead
    return placements.filter(p => 
      p.facilityRef && ledFacilityRefs.includes(p.facilityRef)
    );
  }, [placements, userRole, ledFacilityRefs]);

  const allRisksCount = accessiblePlacements.filter(p => p.status !== "draft" && p.status !== "compliance").length;
  const awaitingActionCount = accessiblePlacements.filter(p => p.status === "pending").length;
  const firmOrdersCount = accessiblePlacements.filter(p => p.status === "firmorder" || p.status === "bound").length;
  const draftPendingCount = accessiblePlacements.filter(p => p.status === "draft").length;
  const complianceCount = accessiblePlacements.filter(p => p.status === "compliance").length;

  const filteredPlacements = accessiblePlacements.filter((placement) => {
    // Underwriters should never see draft or compliance placements
    if (userRole === "underwriter" && (placement.status === "draft" || placement.status === "compliance")) return false;

    const matchesSearch =
      placement.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      placement.insuredName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      placement.brokerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === "all" || placement.status === selectedStatus;
    const matchesProduct = selectedProduct === "all" || placement.productCode === selectedProduct;

    return matchesSearch && matchesStatus && matchesProduct;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
      compliance: { label: "Compliance", className: "bg-purple-100 text-purple-700" },
      pending: { label: "Pending", className: "bg-orange-100 text-orange-700" },
      declined: { label: "Declined", className: "bg-red-100 text-red-700" },
      quoted: { label: "Quoted", className: "bg-blue-100 text-blue-700" },
      firmorder: { label: "Firm Order", className: "bg-green-100 text-green-700" },
      bound: { label: "Bound", className: "bg-green-100 text-green-700" },
      ntu: { label: "NTU", className: "bg-yellow-100 text-yellow-700" },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const getProductIcon = (productCode: string) => {
    const icons: Record<string, { icon: JSX.Element; color: string }> = {
      HL: { icon: <PlaneTakeoff className="size-4" />, color: "text-blue-600 bg-blue-100" },
      HW: { icon: <Radar className="size-4" />, color: "text-purple-600 bg-purple-100" },
      PA: { icon: <Building2 className="size-4" />, color: "text-green-600 bg-green-100" },
      LOL: { icon: <UserX className="size-4" />, color: "text-orange-600 bg-orange-100" },
      HD: { icon: <PlaneTakeoff className="size-4" />, color: "text-pink-600 bg-pink-100" },
      UAS: { icon: <Radar className="size-4" />, color: "text-cyan-600 bg-cyan-100" },
    };
    return icons[productCode] || { icon: <PlaneTakeoff className="size-4" />, color: "text-gray-600 bg-gray-100" };
  };

  return (
    <div className="space-y-6">
      {/* Underwriter Facility Access Banner */}
      {userRole === "underwriter" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="w-1 h-5 rounded-full bg-[#004225] shrink-0" />
            <Shield className="size-4 text-[#004225]" />
            <h2 className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Facility Access</h2>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{currentUser?.company}</span>
          </div>
          <div className="px-5 py-3">
            {ledProducts.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Lead Underwriter On:</span>
                {ledProducts.map((lp, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded">
                    <Lock className="size-2.5 text-[#004225]" />
                    <span className="text-[11px] font-bold text-[#004225]">{lp.productCode}</span>
                    <span className="text-[10px] text-gray-500">{lp.name}</span>
                    <span className="text-[9px] font-mono text-gray-400">({lp.reference})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <Lock className="size-3.5" />
                <span className="text-xs font-medium">No facilities assigned. Contact your broker administrator to be added as a Lead Underwriter on a facility.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleek Metric Cards */}
      <div className="flex gap-3 items-start">
        <div className={`grid ${userRole === "broker" ? "grid-cols-4" : "grid-cols-3"} gap-2.5 flex-1`}>
          {/* All Risks */}
          <button
            onClick={() => setSelectedStatus("all")}
            className={`bg-white rounded-lg px-3.5 py-2.5 transition-all duration-200 text-left hover:shadow-sm border ${
              selectedStatus === "all" 
                ? "border-[#004225] shadow-sm" 
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${
                selectedStatus === "all" ? "text-[#004225]" : "text-slate-500"
              }`}>
                All Risks
              </div>
              <div className={`p-1 rounded transition-colors ${
                selectedStatus === "all" 
                  ? "bg-[#004225] text-white" 
                  : "bg-slate-100 text-slate-500"
              }`}>
                <LayoutGrid className="size-3" />
              </div>
            </div>
            <div className={`text-2xl font-bold leading-none ${
              selectedStatus === "all" ? "text-[#004225]" : "text-slate-900"
            }`}>
              {allRisksCount}
            </div>
          </button>

          {/* Awaiting Action */}
          <button
            onClick={() => setSelectedStatus("pending")}
            className={`bg-white rounded-lg px-3.5 py-2.5 transition-all duration-200 text-left hover:shadow-sm border ${
              selectedStatus === "pending" 
                ? "border-amber-400 shadow-sm" 
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${
                selectedStatus === "pending" ? "text-amber-600" : "text-slate-500"
              }`}>
                Awaiting Action
              </div>
              <div className={`p-1 rounded transition-colors ${
                selectedStatus === "pending" 
                  ? "bg-amber-500 text-white" 
                  : "bg-amber-50 text-amber-500"
              }`}>
                <Clock className="size-3" />
              </div>
            </div>
            <div className={`text-2xl font-bold leading-none ${
              selectedStatus === "pending" ? "text-amber-600" : "text-slate-900"
            }`}>
              {awaitingActionCount}
            </div>
          </button>

          {/* Firm Orders */}
          <button
            onClick={() => setSelectedStatus("firmorder")}
            className={`bg-white rounded-lg px-3.5 py-2.5 transition-all duration-200 text-left hover:shadow-sm border ${
              selectedStatus === "firmorder" 
                ? "border-emerald-400 shadow-sm" 
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${
                selectedStatus === "firmorder" ? "text-emerald-600" : "text-slate-500"
              }`}>
                Firm Orders
              </div>
              <div className={`p-1 rounded transition-colors ${
                selectedStatus === "firmorder" 
                  ? "bg-emerald-500 text-white" 
                  : "bg-emerald-50 text-emerald-500"
              }`}>
                <CheckCircle2 className="size-3" />
              </div>
            </div>
            <div className={`text-2xl font-bold leading-none ${
              selectedStatus === "firmorder" ? "text-emerald-600" : "text-slate-900"
            }`}>
              {firmOrdersCount}
            </div>
          </button>

          {/* Draft Pending */}
          {userRole === "broker" && (
          <button
            onClick={() => setSelectedStatus("draft")}
            className={`bg-white rounded-lg px-3.5 py-2.5 transition-all duration-200 text-left hover:shadow-sm border ${
              selectedStatus === "draft" 
                ? "border-slate-400 shadow-sm" 
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${
                selectedStatus === "draft" ? "text-slate-600" : "text-slate-500"
              }`}>
                Draft Pending
              </div>
              <div className={`p-1 rounded transition-colors ${
                selectedStatus === "draft" 
                  ? "bg-slate-500 text-white" 
                  : "bg-slate-100 text-slate-500"
              }`}>
                <FileText className="size-3" />
              </div>
            </div>
            <div className={`text-2xl font-bold leading-none ${
              selectedStatus === "draft" ? "text-slate-700" : "text-slate-900"
            }`}>
              {draftPendingCount}
            </div>
          </button>
          )}
          {userRole === "broker" && complianceCount > 0 && (
          <button 
            className={`text-left p-3 rounded-xl transition-all duration-200 min-w-[120px] border ${
              selectedStatus === "compliance" 
                ? "bg-purple-50 border-purple-200 shadow-sm" 
                : "bg-white hover:bg-purple-50/50 border-transparent hover:border-purple-100"
            }`}
            onClick={() => setSelectedStatus(selectedStatus === "compliance" ? "all" : "compliance")}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${
                selectedStatus === "compliance" ? "text-purple-600" : "text-purple-500"
              }`}>
                Compliance
              </div>
              <div className={`p-1 rounded transition-colors ${
                selectedStatus === "compliance" 
                  ? "bg-purple-500 text-white" 
                  : "bg-purple-100 text-purple-500"
              }`}>
                <Shield className="size-3" />
              </div>
            </div>
            <div className={`text-2xl font-bold leading-none ${
              selectedStatus === "compliance" ? "text-purple-700" : "text-purple-900"
            }`}>
              {complianceCount}
            </div>
          </button>
          )}
        </div>

        {/* Get a Quote Button */}
        {userRole === "broker" && (
        <Button 
          onClick={onGetQuote}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-7 py-3.5 text-sm rounded-lg transition-all duration-200 h-auto whitespace-nowrap flex items-center gap-2"
        >
          <Plus className="size-4" />
          New Placement
        </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3 bg-white p-4 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Input
            placeholder="Search by reference, insured, or broker..."
            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 pl-4 pr-10 py-2.5 rounded-lg font-normal"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-50 border-gray-200 text-gray-700 px-4 py-2.5 pr-10 rounded-lg font-normal appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="all">All Status</option>
            {userRole === "broker" && <option value="draft">Draft</option>}
            {userRole === "broker" && <option value="compliance">Compliance</option>}
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
            <option value="quoted">Quoted</option>
            <option value="firmorder">Firm Order</option>
            <option value="bound">Bound</option>
            <option value="ntu">NTU</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Product Dropdown */}
        <div className="relative">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-gray-50 border-gray-200 text-gray-700 px-4 py-2.5 pr-10 rounded-lg font-normal appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="all">All Products</option>
            <option value="HL">Hull and Liability</option>
            <option value="HW">Hull War</option>
            <option value="PA">Personal Accident</option>
            <option value="LOL">Loss of Licence</option>
            <option value="HD">Hull Deductible</option>
            <option value="UAS">Drone Insurance</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Placements Table */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Facility Ref
              </th>
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Insured
              </th>
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Producer
              </th>
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Inception
              </th>
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPlacements.map((placement) => {
              const statusInfo = getStatusBadge(placement.status);
              const productInfo = getProductIcon(placement.productCode);
              
              // Get facility ref - use the placement's facilityRef field
              const getFacilityRef = () => {
                // If status is draft, don't show anything
                if (placement.status === "draft") {
                  return "-";
                }
                
                // Use the facilityRef field from the placement
                return placement.facilityRef || "-";
              };
              
              return (
                <tr
                  key={placement.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-all duration-150 cursor-pointer group"
                  onClick={() => onClickPlacement && onClickPlacement(placement.id)}
                >
                  <td className="py-2.5 px-4 text-xs text-gray-500 font-normal">
                    {new Date(placement.submittedDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).toUpperCase()}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-blue-600 font-semibold hover:underline">
                    {displayUMR(placement)}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-600 font-normal">
                    {getFacilityRef()}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`${productInfo.color} p-1 rounded flex items-center justify-center`}>
                        {productInfo.icon}
                      </div>
                      <span className="text-xs text-gray-700 font-medium">{placement.productCode}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-900 font-medium uppercase">
                    {placement.insuredName}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-600 font-normal uppercase">
                    {placement.brokerCompany}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-600 font-normal">
                    {placement.inceptionDate && !isNaN(new Date(placement.inceptionDate).getTime())
                      ? new Date(placement.inceptionDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).toUpperCase()
                      : "TBA"}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      {placement.quotes?.[0]?.autoQuoted && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700" title="Auto-quoted via binder">
                          <Zap className="size-2.5" />Auto
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredPlacements.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            {userRole === "underwriter" && ledFacilityRefs !== null && ledFacilityRefs.length === 0 ? (
              <div className="space-y-2">
                <Shield className="size-8 text-gray-200 mx-auto" />
                <p className="font-medium text-sm text-gray-500">No Facility Access</p>
                <p className="font-normal text-xs text-gray-400 max-w-md mx-auto">
                  Your company ({currentUser?.company}) is not assigned as Lead Underwriter on any active facility. 
                  Contact your broker to be added to a lineslip.
                </p>
              </div>
            ) : userRole === "underwriter" && accessiblePlacements.length === 0 ? (
              <div className="space-y-2">
                <FileText className="size-8 text-gray-200 mx-auto" />
                <p className="font-medium text-sm text-gray-500">No Submissions Yet</p>
                <p className="font-normal text-xs text-gray-400 max-w-md mx-auto">
                  No placements have been submitted against your facilities yet. They will appear here when brokers submit risks.
                </p>
              </div>
            ) : (
              <p className="font-normal text-sm">No placements found matching your filters.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}