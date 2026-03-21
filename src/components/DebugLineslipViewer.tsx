import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export function DebugLineslipViewer() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"insurance" | "reinsurance" | "wordings" | "meta">("reinsurance");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-afd91142/lineslips/debug-sections?name=Hull%20War`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-gray-800">Loading stored HW lineslip data...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const insuranceSections = data?.insuranceWordings || [];
  const reinsuranceSections = data?.reinsuranceWordings || [];
  const legacyWordings = data?.wordings;

  const activeSections = activeTab === "insurance" ? insuranceSections : 
                         activeTab === "reinsurance" ? reinsuranceSections : 
                         Array.isArray(legacyWordings) ? legacyWordings : [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        Stored HW Lineslip: {data?.name || "Not found"}
      </h1>
      
      {data?.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-red-700">
          {data.error}
          {data.availableNames && (
            <div className="mt-2 text-sm">
              Available lineslips: {data.availableNames.join(", ")}
            </div>
          )}
        </div>
      )}
      
      {/* Metadata summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm space-y-1">
        <p><span className="font-semibold">Product:</span> {data?.productCode} | <span className="font-semibold">Type:</span> {data?.placementType}</p>
        <p><span className="font-semibold">insuranceWordings:</span> {data?.hasInsuranceWordings ? `Yes (${data?.insuranceWordingsCount} sections)` : "None"}</p>
        <p><span className="font-semibold">reinsuranceWordings:</span> {data?.hasReinsuranceWordings ? `Yes (${data?.reinsuranceWordingsCount} sections)` : "None"}</p>
        <p><span className="font-semibold">wordings (legacy):</span> type={data?.wordingsType}, isArray={String(data?.wordingsIsArray)}, length={data?.wordingsLength}</p>
        <p><span className="font-semibold">slipSections:</span> {data?.hasSlipSections ? `Yes (${data?.slipSectionsCount})` : "None"}</p>
      </div>

      <p className="text-gray-500 text-xs mb-4">
        Copy the JSON below and paste it back in chat so I can match the default HW template exactly.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "reinsurance", label: `Reinsurance (${reinsuranceSections.length})` },
          { key: "insurance", label: `Insurance (${insuranceSections.length})` },
          { key: "wordings", label: `Legacy wordings (${Array.isArray(legacyWordings) ? legacyWordings.length : 0})` },
          { key: "meta", label: "Raw Meta" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab.key 
                ? "bg-[#004225] text-white" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "meta" ? (
        <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-[600px] overflow-y-auto">
          {JSON.stringify({ 
            name: data?.name, id: data?.id, productCode: data?.productCode, placementType: data?.placementType,
            wordingsType: data?.wordingsType, wordingsIsArray: data?.wordingsIsArray, wordingsLength: data?.wordingsLength,
            hasInsuranceWordings: data?.hasInsuranceWordings, insuranceWordingsCount: data?.insuranceWordingsCount,
            hasReinsuranceWordings: data?.hasReinsuranceWordings, reinsuranceWordingsCount: data?.reinsuranceWordingsCount,
          }, null, 2)}
        </pre>
      ) : (
        <>
          {/* Rendered sections */}
          <div className="space-y-3 mb-8">
            {activeSections.length === 0 && (
              <p className="text-gray-500 italic">No sections found in this field.</p>
            )}
            {activeSections.map((sec: any, i: number) => (
              <div key={sec.id || i} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {sec.id}
                  </span>
                  <span className="text-xs text-gray-400">order: {sec.order}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    sec.type === "fixed" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                  }`}>
                    {sec.type}
                  </span>
                </div>
                <h3 className="text-gray-900 font-semibold text-sm mb-2">{sec.title}</h3>
                <pre className="text-gray-600 text-xs whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded p-3 max-h-80 overflow-y-auto border border-gray-100">
                  {sec.content}
                </pre>
              </div>
            ))}
          </div>

          {/* Raw JSON for copy-paste */}
          <details className="mb-8">
            <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-800 mb-2">
              Show raw JSON (click to expand, then select all and copy)
            </summary>
            <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-[600px] overflow-y-auto select-all">
              {JSON.stringify(activeSections, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
