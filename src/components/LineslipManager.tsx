import { useState } from "react";
import { Lineslip, LineslipStatus, ProductCode } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Plus, Edit, Pause, StopCircle, Play, FileText } from "lucide-react";

interface LineslipManagerProps {
  lineslips: Lineslip[];
  onAddLineslip: () => void;
  onEditLineslip: (lineslip: Lineslip) => void;
  onPauseLineslip: (id: string) => void;
  onStopLineslip: (id: string) => void;
  onActivateLineslip: (id: string) => void;
}

const productNames: Record<ProductCode, string> = {
  HL: "Hull and Liability",
  HW: "Hull War",
  PA: "Personal Accident",
  LOL: "Loss of Licence",
  HD: "Hull Deductible",
  UAS: "Drone Insurance",
};

const statusColors: Record<LineslipStatus, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  stopped: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-gray-50 text-gray-700 border-gray-200",
};

export function LineslipManager({
  lineslips,
  onAddLineslip,
  onEditLineslip,
  onPauseLineslip,
  onStopLineslip,
  onActivateLineslip,
}: LineslipManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProduct, setFilterProduct] = useState<ProductCode | "all">("all");
  const [filterStatus, setFilterStatus] = useState<LineslipStatus | "all">("all");
  const [confirmStopLineslip, setConfirmStopLineslip] = useState<Lineslip | null>(null);
  const [stopConfirmationText, setStopConfirmationText] = useState("");

  // Helper function to determine if a lineslip is expired
  const getLineslipStatus = (lineslip: Lineslip): LineslipStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(lineslip.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    // If end date has passed and status is not already stopped, mark as expired
    if (endDate < today && lineslip.status !== "stopped") {
      return "expired";
    }
    
    return lineslip.status;
  };

  const handleStopLineslip = () => {
    if (confirmStopLineslip && stopConfirmationText === "STOP LINESLIP") {
      onStopLineslip(confirmStopLineslip.id);
      setConfirmStopLineslip(null);
      setStopConfirmationText("");
    }
  };

  const handleCancelStop = () => {
    setConfirmStopLineslip(null);
    setStopConfirmationText("");
  };

  const filteredLineslips = lineslips.filter((lineslip) => {
    const matchesSearch =
      lineslip.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lineslip.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lineslip.underwriters.some((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesProduct = filterProduct === "all" || lineslip.productCode === filterProduct;
    const matchesStatus = filterStatus === "all" || getLineslipStatus(lineslip) === filterStatus;

    return matchesSearch && matchesProduct && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">Lineslip Manager</h1>
          <p className="text-gray-600">Manage lineslip agreements for all product lines</p>
        </div>
        <Button
          onClick={onAddLineslip}
          className="bg-[#004225] hover:bg-[#003319] text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-all duration-200"
        >
          <Plus className="size-4 mr-2" />
          Add Lineslip
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Active</div>
          <div className="text-2xl font-semibold text-gray-900">
            {lineslips.filter((l) => getLineslipStatus(l) === "active").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-yellow-600 uppercase tracking-wider mb-1">Paused</div>
          <div className="text-2xl font-semibold text-gray-900">
            {lineslips.filter((l) => l.status === "paused").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Expired</div>
          <div className="text-2xl font-semibold text-gray-900">
            {lineslips.filter((l) => getLineslipStatus(l) === "expired").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">Stopped</div>
          <div className="text-2xl font-semibold text-gray-900">
            {lineslips.filter((l) => l.status === "stopped").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-[#004225] uppercase tracking-wider mb-1">Total</div>
          <div className="text-2xl font-semibold text-gray-900">{lineslips.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search by reference, product, or underwriter..."
              className="pl-10 border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value as ProductCode | "all")}
            className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-[#004225]"
          >
            <option value="all">All Products</option>
            <option value="HL">Hull and Liability</option>
            <option value="HW">Hull War</option>
            <option value="PA">Personal Accident</option>
            <option value="LOL">Loss of Licence</option>
            <option value="HD">Hull Deductible</option>
            <option value="UAS">Drone Insurance</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as LineslipStatus | "all")}
            className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-[#004225]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="stopped">Stopped</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Lineslips Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Lineslip Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Reference
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Period From
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Period To
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLineslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="size-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No lineslips found</p>
                    <p className="text-gray-400 text-sm mt-1">Click "Add Lineslip" to create one</p>
                  </td>
                </tr>
              ) : (
                filteredLineslips.map((lineslip) => (
                  <tr
                    key={lineslip.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">{lineslip.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 font-mono text-sm">{lineslip.reference}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-semibold">{lineslip.productCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border uppercase ${
                          statusColors[getLineslipStatus(lineslip)]
                        }`}
                      >
                        {getLineslipStatus(lineslip)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 text-sm">{formatDate(lineslip.startDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 text-sm">{formatDate(lineslip.endDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditLineslip(lineslip)}
                          className="p-2 text-gray-500 hover:text-[#004225] hover:bg-[#004225]/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </button>
                        {lineslip.status === "active" && (
                          <button
                            onClick={() => onPauseLineslip(lineslip.id)}
                            className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all"
                            title="Pause"
                          >
                            <Pause className="size-4" />
                          </button>
                        )}
                        {lineslip.status === "paused" && (
                          <button
                            onClick={() => onActivateLineslip(lineslip.id)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Activate"
                          >
                            <Play className="size-4" />
                          </button>
                        )}
                        {lineslip.status !== "stopped" && (
                          <button
                            onClick={() => setConfirmStopLineslip(lineslip)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Stop"
                          >
                            <StopCircle className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Stopping Lineslip */}
      {confirmStopLineslip && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 rounded-lg">
                <StopCircle className="size-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Stop Lineslip</h2>
            </div>
            <p className="text-gray-600 mb-3">
              Are you sure you want to stop the following lineslip?
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-gray-900 font-semibold mb-1">{confirmStopLineslip.name}</div>
              <div className="text-sm text-gray-600">Reference: {confirmStopLineslip.reference}</div>
              <div className="text-sm text-gray-600">Product: {confirmStopLineslip.productCode}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ This action cannot be undone. Stopped lineslips cannot be reactivated.
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-700 font-medium mb-2">
                Type <span className="font-semibold text-gray-900">STOP LINESLIP</span> to confirm:
              </label>
              <Input
                placeholder="STOP LINESLIP"
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                value={stopConfirmationText}
                onChange={(e) => setStopConfirmationText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleCancelStop}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium px-5 py-2 rounded-lg transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStopLineslip}
                disabled={stopConfirmationText !== "STOP LINESLIP"}
                className={`font-semibold px-5 py-2 rounded-lg transition-all ${
                  stopConfirmationText === "STOP LINESLIP"
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <StopCircle className="size-4 mr-2" />
                Stop Lineslip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}