import { useState, useMemo } from "react";
import { Placement, Lineslip, Contact, ProductCode } from "../App";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  FolderOpen,
  Search,
  FileDown,
  Plane,
  DollarSign,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ReportsProjectsProps {
  placements: Placement[];
  lineslips: Lineslip[];
  contacts?: Contact[];
}

const productNames: Record<string, string> = {
  HL: "Hull & Liability",
  HW: "Hull War",
  PA: "Personal Accident",
  LOL: "Loss of Licence",
  HD: "Hull Deductible",
  UAS: "Drone Insurance",
};

export function ReportsProjects({ placements, lineslips, contacts = [] }: ReportsProjectsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"insured" | "value" | "date" | "status">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Group placements by insured as "projects"
  const projects = useMemo(() => {
    const nonDraft = placements.filter((p) => p.status !== "draft" && p.status !== "compliance");
    const grouped: Record<string, Placement[]> = {};
    nonDraft.forEach((p) => {
      const key = p.insuredName.trim().toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return Object.entries(grouped).map(([key, pls]) => {
      const sorted = [...pls].sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
      const totalValue = pls.reduce((s, p) => s + (p.hullValue || 0) + (p.liability || 0), 0);
      const totalPremium = pls.reduce((s, p) => s + (p.quotes?.[0]?.premium || 0), 0);
      const boundCount = pls.filter((p) => p.status === "bound").length;
      const products = [...new Set(pls.map((p) => p.productCode))];
      const latestDate = sorted[0]?.submittedDate || "";
      const insuredName = sorted[0]?.insuredName || key;

      // Determine overall project status
      let projectStatus: "active" | "completed" | "pending" = "pending";
      if (boundCount > 0 && boundCount === pls.length) projectStatus = "completed";
      else if (pls.some((p) => ["quoted", "firmorder", "pending"].includes(p.status))) projectStatus = "active";

      return {
        id: key,
        insuredName,
        placements: sorted,
        totalPlacements: pls.length,
        totalValue,
        totalPremium,
        boundCount,
        products,
        latestDate,
        projectStatus,
        brokerName: sorted[0]?.brokerName || "",
        brokerCompany: sorted[0]?.brokerCompany || "",
      };
    });
  }, [placements]);

  // Filtered
  const filtered = useMemo(() => {
    return projects.filter((proj) => {
      if (productFilter !== "all" && !proj.products.includes(productFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !proj.insuredName.toLowerCase().includes(q) &&
          !proj.brokerName.toLowerCase().includes(q) &&
          !proj.brokerCompany.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [projects, productFilter, searchQuery]);

  // Sorted
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "insured":
          cmp = a.insuredName.localeCompare(b.insuredName);
          break;
        case "value":
          cmp = a.totalValue - b.totalValue;
          break;
        case "date":
          cmp = new Date(a.latestDate).getTime() - new Date(b.latestDate).getTime();
          break;
        case "status":
          cmp = a.projectStatus.localeCompare(b.projectStatus);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDirection]);

  // Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.projectStatus === "active").length;
    const completed = projects.filter((p) => p.projectStatus === "completed").length;
    const totalValue = projects.reduce((s, p) => s + p.totalValue, 0);
    const totalPremium = projects.reduce((s, p) => s + p.totalPremium, 0);
    const avgPlacementsPerProject = total > 0 ? projects.reduce((s, p) => s + p.totalPlacements, 0) / total : 0;
    return { total, active, completed, totalValue, totalPremium, avgPlacementsPerProject };
  }, [projects]);

  // Product breakdown chart
  const productBreakdown = useMemo(() => {
    const counts: Record<string, { product: string; projects: number; placements: number }> = {};
    projects.forEach((proj) => {
      proj.products.forEach((pc) => {
        if (!counts[pc]) counts[pc] = { product: productNames[pc] || pc, projects: 0, placements: 0 };
        counts[pc].projects++;
      });
      proj.placements.forEach((p) => {
        if (!counts[p.productCode]) counts[p.productCode] = { product: productNames[p.productCode] || p.productCode, projects: 0, placements: 0 };
        counts[p.productCode].placements++;
      });
    });
    return Object.values(counts);
  }, [projects]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const getProjectStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-[#004225]/5 text-[#004225] border-[#004225]/20",
      completed: "bg-green-50 text-green-700 border-green-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return map[status] || map.pending;
  };

  const handleExport = () => {
    const csvData = [
      ["Insured", "Placements", "Bound", "Total Value", "Premium", "Products", "Status", "Broker"],
      ...sorted.map((p) => [
        p.insuredName,
        p.totalPlacements.toString(),
        p.boundCount.toString(),
        p.totalValue.toString(),
        p.totalPremium.toString(),
        p.products.join("; "),
        p.projectStatus.toUpperCase(),
        `${p.brokerName} (${p.brokerCompany})`,
      ]),
    ];
    const blob = new Blob([csvData.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-0.5">Projects</h1>
          <p className="text-xs text-gray-500">Placements grouped by insured — track client programmes and multi-line accounts</p>
        </div>
        <Button onClick={handleExport} className="bg-[#004225] hover:bg-[#003319] text-white">
          <FileDown className="size-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by insured or broker..." className="pl-10" />
            </div>
          </div>
          <div className="w-44">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Product</label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {Object.entries(productNames).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Total Projects</p>
          <p className="text-xl font-bold text-gray-900">{metrics.total}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Active</p>
          <p className="text-xl font-bold text-[#004225]">{metrics.active}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Completed</p>
          <p className="text-xl font-bold text-green-600">{metrics.completed}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Total Insured Value</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(metrics.totalValue / 1000000)}M</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Total Premium</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(metrics.totalPremium)}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Avg Lines / Project</p>
          <p className="text-xl font-bold text-gray-900">{metrics.avgPlacementsPerProject.toFixed(1)}</p>
        </Card>
      </div>

      {/* Product Breakdown Chart */}
      {productBreakdown.length > 0 && (
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-[#004225]" />
            Product Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="product" stroke="#9ca3af" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  color: "#111827",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
              />
              <Legend wrapperStyle={{ color: "#6b7280" }} />
              <Bar dataKey="projects" fill="#004225" name="Projects" radius={[4, 4, 0, 0]} />
              <Bar dataKey="placements" fill="#22c55e" name="Placements" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Projects Table */}
      <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
        <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <FolderOpen className="size-3.5 text-[#004225]" />
          All Projects
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("insured")} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Insured
                    {sortField === "insured" && (sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </button>
                </th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Status
                    {sortField === "status" && (sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </button>
                </th>
                <th className="text-center p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Lines</th>
                <th className="text-center p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Bound</th>
                <th className="text-right p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("value")} className="flex items-center gap-1 hover:text-gray-900 transition-colors ml-auto">
                    Total Value
                    {sortField === "value" && (sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </button>
                </th>
                <th className="text-right p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Broker</th>
                <th className="text-center p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.flatMap((proj) => [
                <tr key={proj.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="p-2.5">
                    <span className="text-xs font-medium text-gray-900">{proj.insuredName}</span>
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {proj.products.map((pc) => (
                        <Badge key={pc} className="border text-[10px] font-bold bg-[#004225]/5 text-[#004225] border-[#004225]/20">{pc}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-2.5">
                    <Badge className={`border text-[10px] font-bold ${getProjectStatusBadge(proj.projectStatus)}`}>
                      {proj.projectStatus.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="text-xs font-medium text-gray-900">{proj.totalPlacements}</span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="text-xs font-medium text-green-700">{proj.boundCount}</span>
                  </td>
                  <td className="p-2.5 text-right">
                    <span className="text-xs font-medium text-gray-900">{formatCurrency(proj.totalValue)}</span>
                  </td>
                  <td className="p-2.5 text-right">
                    <span className="text-xs font-medium text-gray-900">{proj.totalPremium > 0 ? formatCurrency(proj.totalPremium) : "—"}</span>
                  </td>
                  <td className="p-2.5">
                    <div>
                      <span className="text-xs text-gray-700">{proj.brokerName}</span>
                      <span className="text-[10px] text-gray-400 block">{proj.brokerCompany}</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      {expandedProject === proj.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  </td>
                </tr>,
                expandedProject === proj.id ? (
                  <tr key={`${proj.id}-exp`} className="bg-gray-50/70">
                    <td colSpan={9} className="p-4">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Placements</p>
                      <div className="space-y-1.5">
                        {proj.placements.map((p) => (
                          <div key={p.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-gray-900">{p.reference}</span>
                              <Badge className="border text-[10px] font-bold bg-[#004225]/5 text-[#004225] border-[#004225]/20">{p.productCode}</Badge>
                              <Badge className={`border text-[10px] font-bold ${
                                p.status === "bound" ? "bg-green-50 text-green-700 border-green-200" :
                                p.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                p.status === "quoted" || p.status === "firmorder" ? "bg-[#004225]/5 text-[#004225] border-[#004225]/20" :
                                p.status === "declined" ? "bg-red-50 text-red-600 border-red-200" :
                                "bg-gray-100 text-gray-500 border-gray-200"
                              }`}>
                                {p.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-500">{new Date(p.submittedDate).toLocaleDateString()}</span>
                              <span className="text-xs font-medium text-gray-900">
                                {p.quotes?.[0]?.premium ? formatCurrency(p.quotes[0].premium) : "—"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : null,
              ])}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="size-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm font-medium">No projects found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}