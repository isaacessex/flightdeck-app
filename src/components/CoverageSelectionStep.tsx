import { Shield, Heart, DollarSign, Plane, Ban } from "lucide-react";
import { Button } from "./ui/button";

interface CoverageSelectionStepProps {
  selectedMainCoverages: string[];
  onToggleCoverage: (code: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const coverageOptions = [
  {
    code: "HL",
    name: "Hull and Liability",
    description: "Comprehensive aircraft coverage",
    icon: Plane,
    iconColor: "text-blue-500",
    borderColor: "border-blue-500",
    bgColor: "bg-blue-50",
    hoverBg: "hover:bg-blue-100",
    selectedBg: "bg-blue-50",
  },
  {
    code: "HW",
    name: "Hull War",
    description: "War and terrorism coverage",
    icon: Shield,
    iconColor: "text-purple-500",
    borderColor: "border-purple-500",
    bgColor: "bg-purple-50",
    hoverBg: "hover:bg-purple-100",
    selectedBg: "bg-purple-50",
  },
  {
    code: "PA",
    name: "Personal Accident",
    description: "Personal accident coverage",
    icon: Heart,
    iconColor: "text-green-500",
    borderColor: "border-green-500",
    bgColor: "bg-green-50",
    hoverBg: "hover:bg-green-100",
    selectedBg: "bg-green-50",
  },
  {
    code: "LOL",
    name: "Loss of Licence",
    description: "Loss of licence coverage",
    icon: DollarSign,
    iconColor: "text-orange-500",
    borderColor: "border-orange-500",
    bgColor: "bg-orange-50",
    hoverBg: "hover:bg-orange-100",
    selectedBg: "bg-orange-50",
  },
  {
    code: "HD",
    name: "Hull Deductible",
    description: "Hull deductible coverage",
    icon: DollarSign,
    iconColor: "text-pink-500",
    borderColor: "border-pink-500",
    bgColor: "bg-pink-50",
    hoverBg: "hover:bg-pink-100",
    selectedBg: "bg-pink-50",
  },
  {
    code: "UAS",
    name: "Drones",
    description: "Unmanned aerial systems",
    icon: Ban,
    iconColor: "text-cyan-500",
    borderColor: "border-cyan-500",
    bgColor: "bg-cyan-50",
    hoverBg: "hover:bg-cyan-100",
    selectedBg: "bg-cyan-50",
  },
];

export function CoverageSelectionStep({
  selectedMainCoverages,
  onToggleCoverage,
  onContinue,
  onBack,
}: CoverageSelectionStepProps) {
  const canContinue = selectedMainCoverages.length > 0;

  // Check if HD or UAS is selected
  const hasHdOrUas = selectedMainCoverages.includes("HD") || selectedMainCoverages.includes("UAS");
  
  // Determine which coverages should be disabled
  const getDisabledState = (code: string) => {
    if (code === "HD" || code === "UAS") {
      // HD and UAS are disabled if any other coverage is selected
      const otherCoveragesSelected = selectedMainCoverages.some(c => c !== "HD" && c !== "UAS");
      return otherCoveragesSelected;
    } else {
      // Other coverages are disabled if HD or UAS is selected
      return hasHdOrUas;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Coverage Types</h2>
        <p className="text-gray-600">Select one or more coverage types (click to add/remove)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coverageOptions.map((coverage) => {
          const Icon = coverage.icon;
          const isSelected = selectedMainCoverages.includes(coverage.code);
          const isDisabled = getDisabledState(coverage.code);

          return (
            <button
              key={coverage.code}
              onClick={() => {
                if (!isDisabled) {
                  onToggleCoverage(coverage.code);
                }
              }}
              disabled={isDisabled}
              className={`
                relative p-6 rounded-xl border-2 text-left transition-all
                ${isSelected 
                  ? `${coverage.borderColor} ${coverage.selectedBg} shadow-md` 
                  : isDisabled
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                    : `border-gray-200 bg-white ${coverage.hoverBg} hover:border-gray-300`
                }
              `}
            >
              {/* Checkmark indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${coverage.bgColor}`}>
                  <Icon className={`size-6 ${coverage.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{coverage.name}</h3>
                  <p className="text-sm text-gray-600">{coverage.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {hasHdOrUas && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Hull Deductible and Drones coverage are standalone products and cannot be combined with other coverage types.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          ← Back to Dashboard
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="bg-[#004225] hover:bg-[#003520] text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Step 1 →
        </Button>
      </div>
    </div>
  );
}
