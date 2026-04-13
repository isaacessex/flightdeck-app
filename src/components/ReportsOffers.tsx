import { useState, useMemo } from "react";
import { Placement } from "../App";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Send,
  CheckCircle2,
  Search,
  FileDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ReportsOffersProps {
  placements: Placement[];
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  quoted: "Quoted",
  firmorder: "Firm Order",
  bound: "Bound",
  declined: "Declined",
  ntu: "NTU",
};

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  quoted: "#004225",
  firmorder: "#004225",
  bound: "#16a34a",
  declined: "#ef4444",
  ntu: "#6b7280",
};

export function ReportsOffers({ placements }: ReportsOffersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"date" | "insured" | "premium" | "status">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Filter out drafts
  const activePlacements = useMemo(() => {
    return placements.filter((p) => p.status !== "draft" && p.status !== "compliance");
  }, [placements]);

  // Filtered placements
  const filtered = useMemo(() => {
    return activePlacements.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !p.insuredName.toLowerCase().includes(q) &&
          !p.reference.toLowerCase().includes(q) &&
          !p.brokerName.toLowerCase().includes(q) &&
          !p.productCode.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [activePlacements, statusFilter, searchQuery]);

  // Sorted
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime();
          break;
        case "insured":
          cmp = a.insuredName.localeCompare(b.insuredName);
          break;
        case "premium": {
          const pa = a.quotes?.[0]?.premium || 0;
          const pb = b.quotes?.[0]?.premium || 0;
          cmp = pa - pb;
          break;
        }
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDirection]);

  // Metrics
  const metrics = useMemo(() => {
    const total = activePlacements.length;
    const pending = activePlacements.filter((p) => p.status === "pending").length;
    const quoted = activePlacements.filter((p) => p.status === "quoted" || p.status === "firmorder").length;
    const bound = activePlacements.filter((p) => p.status === "bound").length;
    const declined = activePlacements.filter((p) => p.status === "declined" || p.status === "ntu").length;
    const conversionRate = total > 0 ? ((bound / total) * 100).toFixed(1) : "0.0";

    // Average time to quote (days between submitted and first quote)
    const quotedPlacements = activePlacements.filter((p) => p.quotes && p.quotes.length > 0);
    let avgDaysToQuote = 0;
    if (quotedPlacements.length > 0) {
      const totalDays = quotedPlacements.reduce((sum, p) => {
        const submitted = new Date(p.submittedDate).getTime();
        const firstQuote = new Date(p.quotes![0].submittedDate).getTime();
        return sum + (firstQuote - submitted) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDaysToQuote = totalDays / quotedPlacements.length;
    }

    return { total, pending, quoted, bound, declined, conversionRate, avgDaysToQuote };
  }, [activePlacements]);

  // Status distribution for pie
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    activePlacements.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      status: statusLabels[status] || status,
      statusKey: status,
      count,
      value: count,
    }));
  }, [activePlacements]);

  // Monthly offer volume
  const monthlyVolume = useMemo(() => {
    const monthly: Record<string, { monthKey: string; month: string; submitted: number; bound: number; declined: number }> = {};
    activePlacements.forEach((p) => {
      const date = new Date(p.submittedDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) {
        monthly[key] = {
          monthKey: key,
          month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          submitted: 0,
          bound: 0,
          declined: 0,
        };
      }
      monthly[key].submitted++;
      if (p.status === "bound") monthly[key].bound++;
      if (p.status === "declined" || p.status === "ntu") monthly[key].declined++;
    });
    return Object.values(monthly).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [activePlacements]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      quoted: "bg-[#004225]/5 text-[#004225] border-[#004225]/20",
      firmorder: "bg-[#004225]/5 text-[#004225] border-[#004225]/20",
      bound: "bg-green-50 text-green-700 border-green-200",
      declined: "bg-red-50 text-red-600 border-red-200",
      ntu: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return map[status] || map.ntu;
  };

  const handleExport = () => {
    const csvData = [
      ["Reference", "Insured", "Product", "Status", "Submitted", "Premium", "Broker"],
      ...sorted.map((p) => [
        p.reference,
        p.insuredName,
        p.productCode,
        p.status.toUpperCase(),
        new Date(p.submittedDate).toLocaleDateString(),
        p.quotes?.[0]?.premium?.toString() || "",
        p.brokerName,
      ]),
    ];
    const blob = new Blob([csvData.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offers-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-0.5">Offers</h1>
          <p className="text-xs text-gray-500">Track placement submissions, quotes, and conversion rates</p>
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
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by insured, reference, broker..."
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-44">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Total Offers</p>
          <p className="text-xl font-bold text-gray-900">{metrics.total}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Pending</p>
          <p className="text-xl font-bold text-amber-600">{metrics.pending}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Quoted</p>
          <p className="text-xl font-bold text-[#004225]">{metrics.quoted}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Bound</p>
          <p className="text-xl font-bold text-green-600">{metrics.bound}</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Conversion Rate</p>
          <p className="text-xl font-bold text-gray-900">{metrics.conversionRate}%</p>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">Avg Days to Quote</p>
          <p className="text-xl font-bold text-gray-900">{metrics.avgDaysToQuote.toFixed(1)}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Status Breakdown */}
        <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
          <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-[#004225]" />
            Status Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusDist}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, count }) => `${status}: ${count}`}
                outerRadius={85}
                dataKey="value"
                nameKey="status"
              >
                {statusDist.map((entry) => (
                  <Cell key={entry.statusKey} fill={statusColors[entry.statusKey] || "#6b7280"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  color: "#111827",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Trend */}
        {monthlyVolume.length > 0 && (
          <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
            <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-[#004225]" />
              Monthly Offer Volume
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: "#6b7280", fontSize: 11 }} />
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
                <Bar dataKey="submitted" fill="#004225" name="Submitted" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bound" fill="#22c55e" name="Bound" radius={[4, 4, 0, 0]} />
                <Bar dataKey="declined" fill="#ef4444" name="Declined" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Offers Table */}
      <Card className="bg-white border border-gray-200 shadow-sm p-3.5">
        <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Send className="size-3.5 text-[#004225]" />
          All Offers
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("insured")} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Insured
                    {sortField === "insured" && (sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </button>
                </th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Status
                    {sortField === "status" && (sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </button>
                </th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("date")} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Submitted
                    {sortField === "date" && (sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </button>
                </th>
                <th className="text-right p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("premium")} className="flex items-center gap-1 hover:text-gray-900 transition-colors ml-auto">
                    Premium
                    {sortField === "premium" && (sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </button>
                </th>
                <th className="text-left p-2.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Broker</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="p-2.5">
                    <span className="text-xs font-medium text-gray-900">{p.reference}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="text-xs text-gray-700">{p.insuredName}</span>
                  </td>
                  <td className="p-2.5">
                    <Badge className="border text-[10px] font-bold bg-[#004225]/5 text-[#004225] border-[#004225]/20">
                      {p.productCode}
                    </Badge>
                  </td>
                  <td className="p-2.5">
                    <Badge className={`border text-[10px] font-bold ${getStatusBadge(p.status)}`}>
                      {p.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-2.5">
                    <span className="text-xs text-gray-500">{new Date(p.submittedDate).toLocaleDateString()}</span>
                  </td>
                  <td className="p-2.5 text-right">
                    <span className="text-xs font-medium text-gray-900">
                      {p.quotes?.[0]?.premium ? formatCurrency(p.quotes[0].premium) : "—"}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span className="text-xs text-gray-500">{p.brokerName}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="size-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm font-medium">No offers found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}