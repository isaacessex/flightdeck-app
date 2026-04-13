import { useState } from "react";
import { Binder, LineslipStatus, ProductCode } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Plus, Edit, Pause, StopCircle, Play, ShieldCheck, Zap } from "lucide-react";

interface BinderManagerProps {
  binders: Binder[];
  onAddBinder: () => void;
  onEditBinder: (binder: Binder) => void;
  onPauseBinder: (id: string) => void;
  onStopBinder: (id: string) => void;
  onActivateBinder: (id: string) => void;
}

const statusColors: Record<LineslipStatus, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  stopped: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-gray-50 text-gray-700 border-gray-200",
};

export function BinderManager({
  binders,
  onAddBinder,
  onEditBinder,
  onPauseBinder,
  onStopBinder,
  onActivateBinder,
}: BinderManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProduct, setFilterProduct] = useState<ProductCode | "all">("all");
  const [filterStatus, setFilterStatus] = useState<LineslipStatus | "all">("all");
  const [confirmStopBinder, setConfirmStopBinder] = useState<Binder | null>(null);
  const [stopConfirmationText, setStopConfirmationText] = useState("");

  const getBinderStatus = (binder: Binder): LineslipStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(binder.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < today && binder.status !== "stopped") return "expired";
    return binder.status;
  };

  const handleStopBinder = () => {
    if (confirmStopBinder && stopConfirmationText === "STOP BINDER") {
      onStopBinder(confirmStopBinder.id);
      setConfirmStopBinder(null);
      setStopConfirmationText("");
    }
  };

  const handleCancelStop = () => {
    setConfirmStopBinder(null);
    setStopConfirmationText("");
  };

  const filteredBinders = binders.filter((binder) => {
    const matchesSearch =
      binder.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      binder.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      binder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      binder.underwriters.some((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesProduct = filterProduct === "all" || binder.productCode === filterProduct;
    const matchesStatus = filterStatus === "all" || getBinderStatus(binder) === filterStatus;
    return matchesSearch && matchesProduct && matchesStatus;
  });

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
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">Binder Manager</h1>
          <p className="text-gray-600">Manage binder agreements with auto-rating capabilities</p>
        </div>
        <Button
          onClick={onAddBinder}
          className="bg-[#004225] hover:bg-[#003319] text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-all duration-200"
        >
          <Plus className="size-4 mr-2" />
          Add Binder
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Active</div>
          <div className="text-2xl font-semibold text-gray-900">
            {binders.filter((b) => getBinderStatus(b) === "active").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-yellow-600 uppercase tracking-wider mb-1">Paused</div>
          <div className="text-2xl font-semibold text-gray-900">
            {binders.filter((b) => b.status === "paused").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Expired</div>
          <div className="text-2xl font-semibold text-gray-900">
            {binders.filter((b) => getBinderStatus(b) === "expired").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">Stopped</div>
          <div className="text-2xl font-semibold text-gray-900">
            {binders.filter((b) => b.status === "stopped").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-[#004225] uppercase tracking-wider mb-1">Total</div>
          <div className="text-2xl font-semibold text-gray-900">{binders.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search by name, reference, product, or underwriter..."
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

      {/* Binders Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Binder Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Reference
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rating
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
              {filteredBinders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <ShieldCheck className="size-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No binders found</p>
                    <p className="text-gray-400 text-sm mt-1">Click "Add Binder" to create one with auto-rating</p>
                  </td>
                </tr>
              ) : (
                filteredBinders.map((binder) => (
                  <tr
                    key={binder.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">{binder.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 font-mono text-sm">{binder.reference}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-semibold">{binder.productCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Zap className="size-3.5 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Auto-Rate
                        </span>
                      </div>
                      {binder.ratingRules?.approvedUses && binder.ratingRules.approvedUses.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {binder.ratingRules.approvedUses.slice(0, 3).map((use) => (
                            <span key={use} className="text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                              {use}
                            </span>
                          ))}
                          {binder.ratingRules.approvedUses.length > 3 && (
                            <span className="text-[10px] font-medium text-gray-400">
                              +{binder.ratingRules.approvedUses.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-gray-400 italic">All uses</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border uppercase ${
                          statusColors[getBinderStatus(binder)]
                        }`}
                      >
                        {getBinderStatus(binder)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 text-sm">{formatDate(binder.startDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 text-sm">{formatDate(binder.endDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditBinder(binder)}
                          className="p-2 text-gray-500 hover:text-[#004225] hover:bg-[#004225]/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </button>
                        {binder.status === "active" && (
                          <button
                            onClick={() => onPauseBinder(binder.id)}
                            className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all"
                            title="Pause"
                          >
                            <Pause className="size-4" />
                          </button>
                        )}
                        {binder.status === "paused" && (
                          <button
                            onClick={() => onActivateBinder(binder.id)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Activate"
                          >
                            <Play className="size-4" />
                          </button>
                        )}
                        {binder.status !== "stopped" && (
                          <button
                            onClick={() => setConfirmStopBinder(binder)}
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

      {/* Confirmation Modal for Stopping Binder */}
      {confirmStopBinder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 rounded-lg">
                <StopCircle className="size-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Stop Binder</h2>
            </div>
            <p className="text-gray-600 mb-3">
              Are you sure you want to stop the following binder?
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-gray-900 font-semibold mb-1">{confirmStopBinder.name}</div>
              <div className="text-sm text-gray-600">Reference: {confirmStopBinder.reference}</div>
              <div className="text-sm text-gray-600">Product: {confirmStopBinder.productCode}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                This action cannot be undone. Stopped binders cannot be reactivated.
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-700 font-medium mb-2">
                Type <span className="font-semibold text-gray-900">STOP BINDER</span> to confirm:
              </label>
              <Input
                placeholder="STOP BINDER"
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
                onClick={handleStopBinder}
                disabled={stopConfirmationText !== "STOP BINDER"}
                className={`font-semibold px-5 py-2 rounded-lg transition-all ${
                  stopConfirmationText === "STOP BINDER"
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <StopCircle className="size-4 mr-2" />
                Stop Binder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}