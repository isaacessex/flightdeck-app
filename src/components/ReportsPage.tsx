import { useState, lazy, Suspense } from "react";
import { Lineslip, Placement, Contact } from "../App";
import { Send } from "lucide-react";

// Lazy load report components
const LineslipReports = lazy(() => import("./LineslipReports").then(m => ({ default: m.LineslipReports })));
const ReportsOffers = lazy(() => import("./ReportsOffers").then(m => ({ default: m.ReportsOffers })));
const ReportsProjects = lazy(() => import("./ReportsProjects").then(m => ({ default: m.ReportsProjects })));
const ReportsMap = lazy(() => import("./ReportsMap").then(m => ({ default: m.ReportsMap })));

type ReportTab = "risks" | "lineslips" | "projects" | "map";

interface ReportsPageProps {
  lineslips: Lineslip[];
  placements: Placement[];
  contacts?: Contact[];
}

const tabs: { key: ReportTab; label: string; icon?: React.ReactNode }[] = [
  { key: "risks", label: "Risks" },
  { key: "lineslips", label: "Lineslips", icon: <Send className="size-3.5" /> },
  { key: "projects", label: "Projects" },
  { key: "map", label: "Map" },
];

export function ReportsPage({ lineslips, placements, contacts = [] }: ReportsPageProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("risks");

  return (
    <div className="space-y-0">
      {/* Tab Navigation */}
      <div className="flex items-center gap-0 border-b border-gray-200 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[#004225] text-[#004225]"
                : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
            }`}
          >
            {tab.icon && tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "risks" && (
        <Suspense fallback={<div>Loading...</div>}>
          <LineslipReports lineslips={lineslips} placements={placements} contacts={contacts} />
        </Suspense>
      )}
      {activeTab === "lineslips" && (
        <Suspense fallback={<div>Loading...</div>}>
          <ReportsOffers placements={placements} />
        </Suspense>
      )}
      {activeTab === "projects" && (
        <Suspense fallback={<div>Loading...</div>}>
          <ReportsProjects placements={placements} lineslips={lineslips} contacts={contacts} />
        </Suspense>
      )}
      {activeTab === "map" && (
        <Suspense fallback={<div>Loading...</div>}>
          <ReportsMap placements={placements} lineslips={lineslips} />
        </Suspense>
      )}
    </div>
  );
}