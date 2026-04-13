import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Trash2, Plus, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

interface Pilot {
  name: string;
  age: string;
  salary: string;
  salaryCurrency: string;
  sumInsured: string;
  sumInsuredCurrency: string;
  sumReinsured: string;
  sumReinsuredCurrency: string;
  taxType: string;
  taxPercentage: string;
  taxName: string;
}

interface LOLPilotDetailsStepProps {
  pilots: Pilot[];
  setPilots: (pilots: Pilot[] | ((prev: Pilot[]) => Pilot[])) => void;
  onBack: () => void;
  onContinue: () => void;
  formatNumberWithCommas: (value: string) => string;
  stepNumber?: number;
  totalSteps?: number;
}

export function LOLPilotDetailsStep({
  pilots,
  setPilots,
  onBack,
  onContinue,
  formatNumberWithCommas,
  stepNumber,
  totalSteps,
}: LOLPilotDetailsStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPilot = () => {
    setPilots(prev => [...prev, {
      name: "",
      age: "",
      salary: "",
      salaryCurrency: "USD",
      sumInsured: "",
      sumInsuredCurrency: "USD",
      sumReinsured: "",
      sumReinsuredCurrency: "USD",
      taxType: "addition",
      taxPercentage: "",
      taxName: ""
    }]);
  };

  const handleRemovePilot = (index: number) => {
    setPilots(prev => prev.filter((_, i) => i !== index));
    toast.success("Pilot removed");
  };

  const handlePilotChange = (index: number, field: keyof Pilot, value: string) => {
    setPilots(prev => prev.map((pilot, i) => 
      i === index ? { ...pilot, [field]: value } : pilot
    ));
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      // Parse CSV (skip header row)
      const parsedPilots = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          name: values[0] || "",
          age: values[1] || "",
          salary: values[2] || "",
          salaryCurrency: values[3] || "USD",
          sumInsured: values[4] || "",
          sumInsuredCurrency: values[5] || "USD",
          sumReinsured: values[6] || "",
          sumReinsuredCurrency: values[7] || "USD",
          taxType: values[8] || "addition",
          taxPercentage: values[9] || "",
          taxName: values[10] || ""
        };
      });

      setPilots(parsedPilots);
      toast.success(`${parsedPilots.length} pilot(s) imported successfully`);
    };
    
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadCSVTemplate = () => {
    const template = "Name,Age,Annual Salary,Salary Currency,Sum Insured,Sum Insured Currency,Sum Reinsured,Sum Reinsured Currency,Tax Type,Tax Percentage,Tax Name\nJohn Doe,45,150000,USD,500000,USD,450000,USD,addition,5,VAT";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pilot_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV template downloaded");
  };

  const currentStep = stepNumber || 3;
  const totalStepsCount = totalSteps || 5;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-1">Pilot Details</h1>
            <p className="text-slate-500 text-sm">
              Step {currentStep} of {totalStepsCount}: Loss of Licence - Pilot Information
            </p>
          </div>
          <div className="text-slate-400 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-lg">
            Step {currentStep}/{totalStepsCount}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Content Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          {/* Header with Buttons */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 text-base mb-2">Loss of Licence - Pilot Details</h3>
              <button
                onClick={downloadCSVTemplate}
                className="text-[#004225] hover:text-[#006837] text-sm underline transition-colors flex items-center gap-1.5"
              >
                <Download className="size-3.5" />
                Download CSV Template
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2.5 shadow-sm transition-all duration-200 flex items-center gap-2"
              >
                <Upload className="size-4" />
                Upload CSV
              </Button>
              <Button
                type="button"
                onClick={handleAddPilot}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-5 py-2.5 shadow-sm transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="size-4" />
                Add Pilot
              </Button>
            </div>
          </div>

          {/* Pilots List or Empty State */}
          {pilots.length === 0 ? (
            <div className="text-center py-16 px-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-slate-500 text-base">No pilots added yet. Click "Add Pilot" to get started.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {pilots.map((pilot, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  {/* Pilot Header */}
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-200">
                    <h4 className="text-slate-900 text-base font-semibold">Pilot {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePilot(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {/* Pilot Form Fields */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor={`pilotName-${index}`} className="text-slate-700 text-sm font-medium">
                          Pilot Name *
                        </Label>
                        <Input
                          id={`pilotName-${index}`}
                          value={pilot.name}
                          onChange={(e) => handlePilotChange(index, 'name', e.target.value)}
                          placeholder="Enter pilot name"
                          className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`pilotAge-${index}`} className="text-slate-700 text-sm font-medium">
                          Age *
                        </Label>
                        <Input
                          id={`pilotAge-${index}`}
                          type="number"
                          min="18"
                          max="99"
                          value={pilot.age}
                          onChange={(e) => handlePilotChange(index, 'age', e.target.value)}
                          placeholder="Enter age"
                          className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`pilotSalary-${index}`} className="text-slate-700 text-sm font-medium">
                        Annual Salary *
                      </Label>
                      <div className="flex gap-3">
                        <Select
                          value={pilot.salaryCurrency}
                          onValueChange={(value) => handlePilotChange(index, 'salaryCurrency', value)}
                        >
                          <SelectTrigger className="w-20 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                            <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                            <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id={`pilotSalary-${index}`}
                          value={pilot.salary}
                          onChange={(e) => handlePilotChange(index, 'salary', formatNumberWithCommas(e.target.value))}
                          placeholder="Enter annual salary"
                          className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg flex-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor={`sumInsured-${index}`} className="text-slate-700 text-sm font-medium">
                          Sum Insured *
                        </Label>
                        <div className="flex gap-3">
                          <Select
                            value={pilot.sumInsuredCurrency}
                            onValueChange={(value) => handlePilotChange(index, 'sumInsuredCurrency', value)}
                          >
                            <SelectTrigger className="w-20 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                              <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                              <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id={`sumInsured-${index}`}
                            value={pilot.sumInsured}
                            onChange={(e) => handlePilotChange(index, 'sumInsured', formatNumberWithCommas(e.target.value))}
                            placeholder="Enter sum insured"
                            className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`sumReinsured-${index}`} className="text-slate-700 text-sm font-medium">
                          Sum Reinsured *
                        </Label>
                        <div className="flex gap-3">
                          <Select
                            value={pilot.sumReinsuredCurrency}
                            onValueChange={(value) => handlePilotChange(index, 'sumReinsuredCurrency', value)}
                          >
                            <SelectTrigger className="w-20 bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="USD" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">USD</SelectItem>
                              <SelectItem value="EUR" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">EUR</SelectItem>
                              <SelectItem value="GBP" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id={`sumReinsured-${index}`}
                            value={pilot.sumReinsured}
                            onChange={(e) => handlePilotChange(index, 'sumReinsured', formatNumberWithCommas(e.target.value))}
                            placeholder="Enter sum reinsured"
                            className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tax Details Section */}
                    <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-xl">
                      <h5 className="text-slate-900 text-sm font-semibold">Tax Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`taxType-${index}`} className="text-slate-700 text-sm font-medium">
                            Tax Type
                          </Label>
                          <Select
                            value={pilot.taxType}
                            onValueChange={(value) => handlePilotChange(index, 'taxType', value)}
                          >
                            <SelectTrigger className="bg-white border-gray-300 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="addition" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">Addition</SelectItem>
                              <SelectItem value="deduction" className="text-slate-900 focus:bg-gray-50 focus:text-slate-900">Deduction</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`taxPercentage-${index}`} className="text-slate-700 text-sm font-medium">
                            Tax Percentage
                          </Label>
                          <Input
                            id={`taxPercentage-${index}`}
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={pilot.taxPercentage}
                            onChange={(e) => handlePilotChange(index, 'taxPercentage', e.target.value)}
                            placeholder="e.g., 5"
                            className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`taxName-${index}`} className="text-slate-700 text-sm font-medium">
                            Tax Name
                          </Label>
                          <Input
                            id={`taxName-${index}`}
                            value={pilot.taxName}
                            onChange={(e) => handlePilotChange(index, 'taxName', e.target.value)}
                            placeholder="e.g., VAT"
                            className="bg-white border-gray-300 text-slate-900 placeholder:text-slate-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between items-center pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-6 py-2.5 text-base"
          >
            ← Back to Policy Details
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="bg-[#004225] hover:bg-[#006837] text-white rounded-lg px-8 py-2.5 shadow-sm transition-all duration-200 text-base"
          >
            Continue to Additional Information →
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleCSVUpload}
        className="hidden"
      />
    </div>
  );
}
