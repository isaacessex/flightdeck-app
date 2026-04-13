import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "./ui/command";
import { Checkbox } from "./ui/checkbox";
import { Search, Info, ExternalLink, ChevronsUpDown } from "lucide-react";
import { countries } from "../utils/countries";

interface EditAircraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedMainCoverages: string[];
  
  // Aircraft form state
  registration: string;
  setRegistration: (value: string) => void;
  aircraftType: string;
  setAircraftType: (value: string) => void;
  engineType: string;
  setEngineType: (value: string) => void;
  make: string;
  setMake: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  baseCountry: string;
  setBaseCountry: (value: string) => void;
  baseRegion: string;
  setBaseRegion: (value: string) => void;
  crewSeats: string;
  setCrewSeats: (value: string) => void;
  paxSeats: string;
  setPaxSeats: (value: string) => void;
  isDualCrew: boolean;
  setIsDualCrew: (value: boolean) => void;
  aircraftAgreedValue: string;
  setAircraftAgreedValue: (value: string) => void;
  aircraftAgreedValueCurrency: string;
  setAircraftAgreedValueCurrency: (value: string) => void;
  liabilityLimit: string;
  setLiabilityLimit: (value: string) => void;
  liabilityLimitCurrency: string;
  setLiabilityLimitCurrency: (value: string) => void;
  liabilityType: "CSL" | "TPL";
  setLiabilityType: (value: "CSL" | "TPL") => void;
  hullDeductible: string;
  setHullDeductible: (value: string) => void;
  hullDeductibleCurrency: string;
  setHullDeductibleCurrency: (value: string) => void;
  standardDeductible: string;
  setStandardDeductible: (value: string) => void;
  standardDeductibleCurrency: string;
  setStandardDeductibleCurrency: (value: string) => void;
  deductibleBuydown: string;
  setDeductibleBuydown: (value: string) => void;
  standardUses: string[];
  setStandardUses: (value: string[] | ((prev: string[]) => string[])) => void;
  specialUses: string[];
  setSpecialUses: (value: string[] | ((prev: string[]) => string[])) => void;
  specialUsesOther: string;
  setSpecialUsesOther: (value: string) => void;
  taxType: string;
  setTaxType: (value: string) => void;
  taxPercentage: string;
  setTaxPercentage: (value: string) => void;
  taxName: string;
  setTaxName: (value: string) => void;
  
  // Handlers
  handleAircraftTypeChange: (type: string) => void;
  handleNumericInput: (value: string, setter: (value: string) => void) => void;
  handleAircraftLookup: () => void;
  isLookingUpAircraft: boolean;
  
  // Options
  standardUsesOptions: string[];
  specialUsesOptions: string[];
}

const currencyOptions = ["USD", "EUR", "GBP", "SGD", "IDR", "MYR", "AUD", "PHP"];

function CurrencySelect({ value, onValueChange, className = "" }: { value: string; onValueChange: (v: string) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`w-[80px] bg-gray-50 border-gray-200 text-gray-700 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-2.5 shrink-0 text-sm ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border-gray-200">
        {currencyOptions.map(c => (
          <SelectItem key={c} value={c} className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">{c}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
      <div className="w-1 h-4 bg-[#004225] rounded-full" />
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
    </div>
  );
}

export function EditAircraftModal({
  isOpen,
  onClose,
  onSave,
  selectedMainCoverages,
  registration,
  setRegistration,
  aircraftType,
  engineType,
  setEngineType,
  make,
  setMake,
  model,
  setModel,
  baseCountry,
  setBaseCountry,
  baseRegion,
  setBaseRegion,
  crewSeats,
  setCrewSeats,
  paxSeats,
  setPaxSeats,
  isDualCrew,
  setIsDualCrew,
  aircraftAgreedValue,
  setAircraftAgreedValue,
  aircraftAgreedValueCurrency,
  setAircraftAgreedValueCurrency,
  liabilityLimit,
  setLiabilityLimit,
  liabilityLimitCurrency,
  setLiabilityLimitCurrency,
  liabilityType,
  setLiabilityType,
  hullDeductible,
  setHullDeductible,
  hullDeductibleCurrency,
  setHullDeductibleCurrency,
  standardDeductible,
  setStandardDeductible,
  standardDeductibleCurrency,
  deductibleBuydown,
  setDeductibleBuydown,
  standardUses,
  setStandardUses,
  specialUses,
  setSpecialUses,
  specialUsesOther,
  setSpecialUsesOther,
  taxType,
  setTaxType,
  taxPercentage,
  setTaxPercentage,
  taxName,
  setTaxName,
  handleAircraftTypeChange,
  handleNumericInput,
  handleAircraftLookup,
  isLookingUpAircraft,
  standardUsesOptions,
  specialUsesOptions,
}: EditAircraftModalProps) {

  const inputClass = "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm";
  const selectTriggerClass = "bg-white border-gray-200 text-gray-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm";
  const labelClass = "text-gray-700 font-medium text-xs";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 !max-w-[1100px] max-h-[90vh] overflow-y-auto rounded-xl">
        {/* Modal Header */}
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[#004225] rounded-full" />
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">Edit {selectedMainCoverages.includes('UAS') ? 'Drone' : 'Aircraft'}</DialogTitle>
              <DialogDescription className="text-gray-500 text-xs mt-0.5">
                Update {selectedMainCoverages.includes('UAS') ? 'drone' : 'aircraft'} details including registration, type, coverage amounts, and usage information.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-5 py-3">
          {/* ── Section 1: Aircraft Identity ── */}
          <div className="space-y-3">
            <SectionHeader title="Aircraft Identity" />
            <div className="grid grid-cols-5 gap-3">
              {/* Registration */}
              <div className="space-y-1">
                <Label htmlFor="edit-registration" className={labelClass}>{selectedMainCoverages.includes('UAS') ? 'Serial No.' : 'Registration'}</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="edit-registration"
                    type="text"
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !selectedMainCoverages.includes('UAS')) { e.preventDefault(); handleAircraftLookup(); } }}
                    placeholder={selectedMainCoverages.includes('UAS') ? 'SN-001' : 'N67VF'}
                    className={inputClass}
                  />
                  {!selectedMainCoverages.includes('UAS') && (
                  <Button
                    type="button"
                    onClick={handleAircraftLookup}
                    disabled={isLookingUpAircraft || !registration.trim()}
                    className="bg-[#004225] hover:bg-[#003319] text-white rounded-md h-9 px-3 disabled:opacity-50 shrink-0"
                    title={`Lookup aircraft details using JetAPI`}
                  >
                    {isLookingUpAircraft ? (
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="size-3.5" />
                    )}
                  </Button>
                  )}
                </div>
              </div>

              {/* Make */}
              <div className="space-y-1">
                <Label htmlFor="edit-make" className={labelClass}>Make</Label>
                <Input
                  id="edit-make" type="text" value={make} onChange={(e) => setMake(e.target.value)}
                  placeholder="Piper"
                  className={inputClass}
                />
              </div>

              {/* Model */}
              <div className="space-y-1">
                <Label htmlFor="edit-model" className={labelClass}>Model</Label>
                <Input
                  id="edit-model" type="text" value={model} onChange={(e) => setModel(e.target.value)}
                  placeholder="PA-28-161 Warrior II"
                  className={inputClass}
                />
              </div>

              {/* Base Country */}
              <div className="space-y-1">
                <Label htmlFor="edit-baseCountry" className={labelClass}>Base Country</Label>
                <Select 
                  value={baseCountry} 
                  onValueChange={(value) => {
                    setBaseCountry(value);
                    const country = countries.find(c => c.name === value);
                    setBaseRegion(country?.region || "");
                  }}
                >
                  <SelectTrigger id="edit-baseCountry" className={selectTriggerClass}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 max-h-[300px]">
                    {countries.map((country) => (
                      <SelectItem key={country.name} value={country.name} className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Base Region */}
              <div className="space-y-1">
                <Label htmlFor="edit-baseRegion" className={labelClass}>Base Region</Label>
                <Input
                  id="edit-baseRegion" type="text" value={baseRegion} readOnly
                  placeholder="Auto-populated"
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-md h-9 px-3 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Aircraft Configuration ── */}
          {!selectedMainCoverages.includes('UAS') && (
          <div className="space-y-3">
            <SectionHeader title="Aircraft Configuration" />
            <div className={`grid ${!selectedMainCoverages.includes('HD') ? 'grid-cols-5' : 'grid-cols-3'} gap-3`}>
              {/* Aircraft Type */}
              <div className="space-y-1">
                <Label htmlFor="edit-aircraftType" className={labelClass}>{selectedMainCoverages.includes('UAS') ? 'Drone' : 'Aircraft'} Type</Label>
                <Select value={aircraftType} onValueChange={handleAircraftTypeChange}>
                  <SelectTrigger id="edit-aircraftType" className={selectTriggerClass}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="fixed-wing" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Fixed Wing</SelectItem>
                    <SelectItem value="rotary-wing" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Rotary Wing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Engine Type */}
              <div className="space-y-1 col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-engineType" className={labelClass}>Engine Type</Label>
                  <a
                    href="https://www.icao.int/publications/doc-8643-aircraft-type-designators/search"
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[#004225] hover:text-[#003319] transition-colors font-medium"
                  >
                    <Info className="size-3" />
                    <span>Find engine type</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>
                <Select value={engineType} onValueChange={setEngineType} disabled={!aircraftType}>
                  <SelectTrigger id="edit-engineType" className={`${selectTriggerClass} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {aircraftType === "fixed-wing" && (
                      <>
                        <SelectItem value="single-engine-piston" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Single Engine Piston</SelectItem>
                        <SelectItem value="multi-engine-piston" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Multi-Engine Piston</SelectItem>
                        <SelectItem value="single-engine-turboprop" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Single Engine Turboprop</SelectItem>
                        <SelectItem value="multi-engine-turboprop" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Multi-Engine Turboprop</SelectItem>
                        <SelectItem value="multi-engine-jet" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Multi-Engine Jet</SelectItem>
                      </>
                    )}
                    {aircraftType === "rotary-wing" && (
                      <>
                        <SelectItem value="single-engine-piston" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Single Engine Piston</SelectItem>
                        <SelectItem value="twin-engine-piston" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Twin Engine Piston</SelectItem>
                        <SelectItem value="single-engine-turbine" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Single Engine Turbine</SelectItem>
                        <SelectItem value="twin-engine-turbine" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900 text-sm">Twin-Engine Turbine</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Crew Seats */}
              {!selectedMainCoverages.includes('HD') && (
              <div className="space-y-1">
                <Label htmlFor="edit-crewSeats" className={labelClass}>Crew Seats</Label>
                <Input
                  id="edit-crewSeats" type="text" value={crewSeats}
                  onChange={(e) => handleNumericInput(e.target.value, setCrewSeats)}
                  placeholder="1"
                  className={inputClass}
                />
              </div>
              )}

              {/* Pax Seats */}
              {!selectedMainCoverages.includes('HD') && (
              <div className="space-y-1">
                <Label htmlFor="edit-paxSeats" className={labelClass}>Pax Seats</Label>
                <Input
                  id="edit-paxSeats" type="text" value={paxSeats}
                  onChange={(e) => handleNumericInput(e.target.value, setPaxSeats)}
                  placeholder="3"
                  className={inputClass}
                />
              </div>
              )}
            </div>
            {/* Dual Crew checkbox */}
            {!selectedMainCoverages.includes('HD') && (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="edit-dualCrew"
                checked={isDualCrew}
                onCheckedChange={(checked) => setIsDualCrew(checked as boolean)}
                className="border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225] w-3.5 h-3.5"
              />
              <Label htmlFor="edit-dualCrew" className="text-gray-700 font-medium text-xs cursor-pointer">Dual Crew?</Label>
            </div>
            )}
          </div>
          )}

          {/* ── Section 3: Coverage & Values ── */}
          <div className="space-y-3">
            <SectionHeader title="Coverage & Values" />
            
            {/* Non-HD: Agreed Value + Hull Deductible row */}
            {!selectedMainCoverages.includes('HD') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-aircraftAgreedValue" className={labelClass}>{selectedMainCoverages.includes('UAS') ? 'Drone' : 'Aircraft'} Agreed Value</Label>
                <div className="flex gap-1.5">
                  <CurrencySelect value={aircraftAgreedValueCurrency} onValueChange={setAircraftAgreedValueCurrency} />
                  <Input
                    id="edit-aircraftAgreedValue" type="text" value={aircraftAgreedValue}
                    onChange={(e) => handleNumericInput(e.target.value, setAircraftAgreedValue)}
                    placeholder="110,000"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>
              {!selectedMainCoverages.includes('UAS') && (
              <div className="space-y-1">
                <Label htmlFor="edit-hullDeductible" className={labelClass}>Hull Deductible</Label>
                <div className="flex gap-1.5">
                  {aircraftType === "fixed-wing" && (
                    <CurrencySelect value={hullDeductibleCurrency} onValueChange={setHullDeductibleCurrency} />
                  )}
                  {aircraftType === "rotary-wing" && (
                    <div className="w-[80px] flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-700 rounded-md h-9 shrink-0 text-sm font-medium">%</div>
                  )}
                  <Input
                    id="edit-hullDeductible" type="text" value={hullDeductible}
                    onChange={(e) => handleNumericInput(e.target.value, setHullDeductible)}
                    placeholder={aircraftType === "fixed-wing" ? "2,500" : aircraftType === "rotary-wing" ? "Enter %" : "Select aircraft type first"}
                    disabled={!aircraftType}
                    className={`flex-1 ${inputClass} disabled:opacity-50`}
                  />
                </div>
              </div>
              )}
              {selectedMainCoverages.includes('UAS') && (
              <div className="space-y-1">
                <Label className={labelClass}>Drone Deductible</Label>
                <div className="flex items-center h-9 px-3 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="text-sm font-medium text-gray-700">10%</span>
                  <span className="text-[10px] text-gray-500 ml-2">of Agreed Value</span>
                </div>
              </div>
              )}
            </div>
            )}

            {/* Non-HD: Liability section */}
            {!selectedMainCoverages.includes('HD') && (
            <div className={`grid ${selectedMainCoverages.includes('UAS') ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              {!selectedMainCoverages.includes('UAS') && (
              <div className="space-y-1.5">
                <Label className={labelClass}>Liability Type</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLiabilityType("CSL")}
                    className={`px-3 py-2 rounded-md font-medium transition-all text-xs ${
                      liabilityType === "CSL"
                        ? "bg-[#004225] text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Combined Single Limit
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiabilityType("TPL")}
                    className={`px-3 py-2 rounded-md font-medium transition-all text-xs ${
                      liabilityType === "TPL"
                        ? "bg-[#004225] text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Third Party Liability
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">
                  {liabilityType === "CSL" 
                    ? "Combined Single Limit covers both Passengers and Third Party" 
                    : "Third Party Liability only (excludes passenger liability)"}
                </p>
              </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="edit-liabilityLimit" className={labelClass}>Liability Limit</Label>
                <div className="flex gap-1.5">
                  <CurrencySelect value={liabilityLimitCurrency} onValueChange={setLiabilityLimitCurrency} />
                  <Input
                    id="edit-liabilityLimit" type="text" value={liabilityLimit}
                    onChange={(e) => handleNumericInput(e.target.value, setLiabilityLimit)}
                    placeholder="1,000,000"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>
            </div>
            )}

            {/* HD-specific: Original Deductible, Buydown, Sums Reinsured */}
            {selectedMainCoverages.includes('HD') && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-standardDeductible" className={labelClass}>Original Deductible</Label>
                <div className="flex gap-1.5">
                  <div className="w-[80px] flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-500 rounded-md h-9 shrink-0 text-xs">{standardDeductibleCurrency}</div>
                  <Input
                    id="edit-standardDeductible" type="text" value={standardDeductible}
                    onChange={(e) => handleNumericInput(e.target.value, setStandardDeductible)}
                    placeholder="Enter amount"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-deductibleBuydown" className={labelClass}>Deductible Buydown</Label>
                <div className="flex gap-1.5">
                  <div className="w-[80px] flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-500 rounded-md h-9 shrink-0 text-xs">{standardDeductibleCurrency}</div>
                  <Input
                    id="edit-deductibleBuydown" type="text" value={deductibleBuydown}
                    onChange={(e) => handleNumericInput(e.target.value, setDeductibleBuydown)}
                    placeholder="Enter amount"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-sumsReinsured" className={labelClass}>Sums Reinsured</Label>
                <div className="flex gap-1.5">
                  <div className="w-[80px] flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-500 rounded-md h-9 shrink-0 text-xs">{standardDeductibleCurrency}</div>
                  <Input
                    id="edit-sumsReinsured" type="text"
                    value={(() => {
                      const standard = parseInt(standardDeductible.replace(/,/g, "") || "0");
                      const buydown = parseInt(deductibleBuydown.replace(/,/g, "") || "0");
                      const difference = standard - buydown;
                      return difference > 0 ? difference.toLocaleString() : "0";
                    })()}
                    readOnly disabled placeholder="Auto-calculated"
                    className="flex-1 bg-gray-50 border-gray-200 text-gray-500 placeholder:text-gray-400 rounded-md h-9 px-3 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            )}
          </div>

          {/* ── Section 4: Usage & Tax ── */}
          <div className="space-y-3">
            <SectionHeader title="Usage & Tax" />

            {/* Standard Uses and Special Uses */}
            {!selectedMainCoverages.includes('HD') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-standardUses" className={labelClass}>Standard Uses</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-white border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-900 focus:border-[#004225] focus:ring-[#004225]/20 h-9 px-3"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
                          {standardUses.length === 0 ? (
                            <span className="text-gray-400 text-sm">Select standard uses</span>
                          ) : (
                            standardUses.map((use) => (
                              <span key={use} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#004225]/10 text-[#004225] rounded text-[10px] font-medium">{use}</span>
                            ))
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-white border-gray-200" align="start">
                    <Command className="bg-white">
                      <CommandList>
                        <CommandGroup>
                          {standardUsesOptions.map((option) => (
                            <CommandItem
                              key={option}
                              onSelect={() => {
                                setStandardUses((prev) =>
                                  prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
                                );
                              }}
                              className="text-gray-900 hover:bg-gray-50 cursor-pointer text-sm"
                            >
                              <Checkbox checked={standardUses.includes(option)} className="mr-2" />
                              {option}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-specialUses" className={labelClass}>Special Uses</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-white border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-900 focus:border-[#004225] focus:ring-[#004225]/20 h-9 px-3"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
                          {specialUses.length === 0 && !specialUsesOther ? (
                            <span className="text-gray-400 text-sm">Select special uses</span>
                          ) : (
                            specialUses.map((use) => (
                              <span key={use} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#004225]/10 text-[#004225] rounded text-[10px] font-medium">
                                {use === "Other" && specialUsesOther ? specialUsesOther : use}
                              </span>
                            ))
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-white border-gray-200" align="start">
                    <Command className="bg-white">
                      <CommandList>
                        <CommandGroup>
                          {specialUsesOptions.map((option) => (
                            <CommandItem
                              key={option}
                              onSelect={() => {
                                setSpecialUses((prev) =>
                                  prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
                                );
                              }}
                              className="text-gray-900 hover:bg-gray-50 cursor-pointer text-sm"
                            >
                              <Checkbox checked={specialUses.includes(option)} className="mr-2" />
                              {option}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {specialUses.includes("Other") && (
                  <Input
                    type="text" value={specialUsesOther}
                    onChange={(e) => setSpecialUsesOther(e.target.value)}
                    placeholder="Specify other special use"
                    className={`${inputClass} mt-1.5`}
                  />
                )}
              </div>
            </div>
            )}

            {/* Tax Information */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-taxType" className={labelClass}>Addition or Deduction</Label>
                <Select value={taxType} onValueChange={setTaxType}>
                  <SelectTrigger id="edit-taxType" className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="addition" className="text-gray-900 hover:bg-gray-50 text-sm">Addition</SelectItem>
                    <SelectItem value="deduction" className="text-gray-900 hover:bg-gray-50 text-sm">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-taxPercentage" className={labelClass}>Percentage Amount (%)</Label>
                <Input
                  id="edit-taxPercentage" type="number" step="0.01" min="0" max="100"
                  value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)}
                  placeholder="e.g., 10"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-taxName" className={labelClass}>Name</Label>
                <Input
                  id="edit-taxName" type="text" value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="e.g., Indonesia Tax"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button" variant="outline" onClick={onClose}
              className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-700 h-9 px-6 text-sm font-medium rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="button" onClick={onSave}
              disabled={!registration || (!selectedMainCoverages.includes('UAS') && !aircraftType)}
              className="bg-[#004225] hover:bg-[#003319] text-white disabled:opacity-50 h-9 px-8 text-sm font-medium rounded-md"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}