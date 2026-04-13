import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Plane, Plus, Trash2, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import React from "react";
import { Aircraft, CrewMember } from "../types/placementForm";

interface OpwHoursType {
  picTotalHours: string;
  picTotalHoursOther: string;
  picEngineHours: string;
  picEngineHoursOther: string;
  picMakeModelHours: string;
  picMakeModelHoursOther: string;
  coPilotTotalHours: string;
  coPilotTotalHoursOther: string;
  coPilotEngineHours: string;
  coPilotEngineHoursOther: string;
  coPilotMakeModelHours: string;
  coPilotMakeModelHoursOther: string;
}

interface PilotDetailsStepProps {
  selectedMainCoverages: string[];
  selectedSubCoverages: string[];
  namedPilots: boolean;
  setNamedPilots: (value: boolean) => void;
  openPilotWarranty: boolean;
  setOpenPilotWarranty: (value: boolean) => void;
  pilotsUnder65: boolean;
  setPilotsUnder65: (value: boolean) => void;
  namedPilotsDocument: File | null;
  setNamedPilotsDocument: (value: File | null) => void;
  fleet: Aircraft[];
  opwHours: Record<string, OpwHoursType>;
  setOpwHours: React.Dispatch<React.SetStateAction<Record<string, OpwHoursType>>>;
  crewCoverageType: string;
  crewMembers: CrewMember[];
  setCrewMembers: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  showCrewMemberForm: boolean;
  setShowCrewMemberForm: (value: boolean) => void;
  tempCrewMember: { name: string; age: string; position: string; sumsInsured: string; sumsInsuredCurrency: string };
  setTempCrewMember: React.Dispatch<React.SetStateAction<{ name: string; age: string; position: string; sumsInsured: string; sumsInsuredCurrency: string }>>;
  crewPositionOther: string;
  setCrewPositionOther: (value: string) => void;
  shouldSkipStep3: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export function PilotDetailsStep({
  selectedMainCoverages,
  selectedSubCoverages,
  namedPilots,
  setNamedPilots,
  openPilotWarranty,
  setOpenPilotWarranty,
  pilotsUnder65,
  setPilotsUnder65,
  namedPilotsDocument,
  setNamedPilotsDocument,
  fleet,
  opwHours,
  setOpwHours,
  crewCoverageType,
  crewMembers,
  setCrewMembers,
  showCrewMemberForm,
  setShowCrewMemberForm,
  tempCrewMember,
  setTempCrewMember,
  crewPositionOther,
  setCrewPositionOther,
  shouldSkipStep3,
  onBack,
  onContinue,
}: PilotDetailsStepProps) {
  const totalSteps = selectedMainCoverages.includes('HL') ? 7 : 5;

  // Shared class constants
  const inputClass = "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 px-3 text-sm";
  const selectTriggerClass = "bg-white border-gray-200 text-gray-900 hover:bg-gray-50 focus:border-[#004225] focus:ring-[#004225]/20 rounded-md h-9 text-sm";
  const labelClass = "text-gray-600 text-xs font-medium";

  // Group aircraft by type (aircraftType + engineType combination)
  const aircraftTypeGroups: Record<string, typeof fleet> = {};
  
  fleet.forEach(aircraft => {
    const typeKey = `${aircraft.aircraftType || 'unknown'}|${aircraft.engineType || 'unknown'}`;
    if (!aircraftTypeGroups[typeKey]) {
      aircraftTypeGroups[typeKey] = [];
    }
    aircraftTypeGroups[typeKey].push(aircraft);
  });

  const typeKeys = Object.keys(aircraftTypeGroups);

  // Helper to get or initialize OPW hours for a type
  const getOpwHoursForType = (typeKey: string): OpwHoursType => {
    if (!opwHours[typeKey]) {
      const newHours: OpwHoursType = {
        picTotalHours: "",
        picTotalHoursOther: "",
        picEngineHours: "",
        picEngineHoursOther: "",
        picMakeModelHours: "",
        picMakeModelHoursOther: "",
        coPilotTotalHours: "",
        coPilotTotalHoursOther: "",
        coPilotEngineHours: "",
        coPilotEngineHoursOther: "",
        coPilotMakeModelHours: "",
        coPilotMakeModelHoursOther: "",
      };
      return newHours;
    }
    return opwHours[typeKey];
  };

  // Helper to update OPW hours for a specific type
  const updateOpwHours = (typeKey: string, field: string, value: string) => {
    setOpwHours(prev => ({
      ...prev,
      [typeKey]: {
        ...(prev[typeKey] || {
          picTotalHours: "",
          picTotalHoursOther: "",
          picEngineHours: "",
          picEngineHoursOther: "",
          picMakeModelHours: "",
          picMakeModelHoursOther: "",
          coPilotTotalHours: "",
          coPilotTotalHoursOther: "",
          coPilotEngineHours: "",
          coPilotEngineHoursOther: "",
          coPilotMakeModelHours: "",
          coPilotMakeModelHoursOther: "",
        }),
        [field]: value
      }
    }));
  };

  // Helper to get readable type name
  const getTypeLabel = (typeKey: string) => {
    const [aircraftType, engineType] = typeKey.split('|');
    
    const aircraftNames: Record<string, string> = {
      'fixed-wing': 'Fixed Wing',
      'helicopter': 'Helicopter',
      'glider': 'Glider',
      'ultralight': 'Ultralight',
      'gyroplane': 'Gyroplane'
    };
    
    const engineNames: Record<string, string> = {
      'piston': 'Single-Engine Piston',
      'multi-engine-piston': 'Multi-Engine Piston',
      'jet': 'Jet',
      'turboprop': 'Multi-Engine Turboprop',
      'turboshaft': 'Turbine',
      'electric': 'Electric'
    };
    
    const aircraft = aircraftNames[aircraftType] || aircraftType.toUpperCase();
    const engine = engineNames[engineType] || engineType.toUpperCase();
    return `${aircraft} / ${engine}`;
  };

  // Section header component
  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3">
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-5 bg-[#004225] rounded-full" />
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-[#004225] rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pilot Details</h1>
              <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                Step 4 of {totalSteps} &middot; Provide pilot and crew information
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#004225] bg-green-50 border border-green-200 rounded-md px-3 py-1.5 uppercase tracking-wider">
            Step 4/{totalSteps}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Pilot Type - Hull and Liability Card */}
        {selectedMainCoverages.includes("HL") && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <SectionHeader title="Pilot Type — Hull and Liability" subtitle="Select the applicable pilot warranty options" />
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center space-x-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    namedPilots ? 'bg-[#004225]/5 border-[#004225]/30' : 'bg-gray-50/80 border-gray-200 hover:border-gray-300'
                  }`} onClick={() => setNamedPilots(!namedPilots)}>
                    <Checkbox
                      id="namedPilots"
                      checked={namedPilots}
                      onCheckedChange={(checked) => setNamedPilots(checked as boolean)}
                      className="border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225] w-4 h-4"
                    />
                    <Label htmlFor="namedPilots" className="text-gray-900 text-sm font-medium cursor-pointer flex-1">
                      Named Pilots
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    openPilotWarranty ? 'bg-[#004225]/5 border-[#004225]/30' : 'bg-gray-50/80 border-gray-200 hover:border-gray-300'
                  }`} onClick={() => setOpenPilotWarranty(!openPilotWarranty)}>
                    <Checkbox
                      id="openPilotWarranty"
                      checked={openPilotWarranty}
                      onCheckedChange={(checked) => setOpenPilotWarranty(checked as boolean)}
                      className="border-gray-300 data-[state=checked]:bg-[#004225] data-[state=checked]:border-[#004225] w-4 h-4"
                    />
                    <Label htmlFor="openPilotWarranty" className="text-gray-900 text-sm font-medium cursor-pointer flex-1">
                      Open Pilot Warranty
                    </Label>
                  </div>
                </div>

                {/* Named Pilots - Document Upload */}
                {namedPilots && (
                  <div className="mt-4 space-y-1.5">
                    <Label htmlFor="namedPilotsDoc" className={labelClass}>
                      Named Pilots Document
                    </Label>
                    <div className="relative">
                      <input
                        id="namedPilotsDoc"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setNamedPilotsDocument(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="namedPilotsDoc"
                        className="flex items-center justify-center gap-2.5 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 hover:border-[#004225]/40 transition-all text-sm"
                      >
                        <Upload className="w-4 h-4 text-[#004225]" />
                        <span className="text-gray-600">
                          {namedPilotsDocument ? namedPilotsDocument.name : "Choose file or drag here"}
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Age Restriction Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-amber-50/60 border-b border-amber-200/60 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-5 bg-amber-500 rounded-full" />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-amber-600" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Age Restriction</h3>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Are all pilots under 65 years old?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPilotsUnder65(true)}
                      className={`py-1.5 px-6 rounded-md font-medium transition-all text-sm ${
                        pilotsUnder65
                          ? 'bg-[#004225] text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-[#004225]/30'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setPilotsUnder65(false)}
                      className={`py-1.5 px-6 rounded-md font-medium transition-all text-sm ${
                        !pilotsUnder65
                          ? 'bg-[#004225] text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-[#004225]/30'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Open Pilot Warranty - Minimum Hours Card */}
        {openPilotWarranty && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-5 bg-[#004225] rounded-full" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Minimum Required Hours by Aircraft Type</h3>
                </div>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded px-2 py-0.5">
                  {typeKeys.length} type{typeKeys.length !== 1 ? 's' : ''} in fleet
                </span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {typeKeys.map((typeKey) => {
                  const aircraftGroup = aircraftTypeGroups[typeKey];
                  const hasDualCrew = aircraftGroup.some(aircraft => aircraft.isDualCrew);
                  const typeHours = getOpwHoursForType(typeKey);

                  return (
                    <div key={typeKey} className="rounded-lg border border-gray-200 overflow-hidden">
                      {/* Type Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Plane className="size-3.5 text-[#004225]" />
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{getTypeLabel(typeKey)}</h4>
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {aircraftGroup.length} aircraft
                        </span>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Pilot in Command */}
                        <div className="space-y-2.5">
                          <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pilot in Command</h5>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className={labelClass}>Total Hours</Label>
                              <Select 
                                value={typeHours.picTotalHours} 
                                onValueChange={(value) => {
                                  updateOpwHours(typeKey, 'picTotalHours', value);
                                  if (value !== "other") updateOpwHours(typeKey, 'picTotalHoursOther', "");
                                }}
                              >
                                <SelectTrigger className={selectTriggerClass}>
                                  <SelectValue placeholder="Select hours" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                  <SelectItem value="2000" className="text-gray-900 hover:bg-gray-50 text-sm">2,000</SelectItem>
                                  <SelectItem value="1500" className="text-gray-900 hover:bg-gray-50 text-sm">1,500</SelectItem>
                                  <SelectItem value="1000" className="text-gray-900 hover:bg-gray-50 text-sm">1,000</SelectItem>
                                  <SelectItem value="other" className="text-gray-900 hover:bg-gray-50 text-sm">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              {typeHours.picTotalHours === "other" && (
                                <Input
                                  type="number" min="0"
                                  value={typeHours.picTotalHoursOther}
                                  onChange={(e) => updateOpwHours(typeKey, 'picTotalHoursOther', e.target.value)}
                                  placeholder="Enter hours"
                                  className={inputClass}
                                />
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className={labelClass}>Engine Hours</Label>
                              <Select 
                                value={typeHours.picEngineHours} 
                                onValueChange={(value) => {
                                  updateOpwHours(typeKey, 'picEngineHours', value);
                                  if (value !== "other") updateOpwHours(typeKey, 'picEngineHoursOther', "");
                                }}
                              >
                                <SelectTrigger className={selectTriggerClass}>
                                  <SelectValue placeholder="Select hours" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                  <SelectItem value="1000" className="text-gray-900 hover:bg-gray-50 text-sm">1,000</SelectItem>
                                  <SelectItem value="750" className="text-gray-900 hover:bg-gray-50 text-sm">750</SelectItem>
                                  <SelectItem value="500" className="text-gray-900 hover:bg-gray-50 text-sm">500</SelectItem>
                                  <SelectItem value="other" className="text-gray-900 hover:bg-gray-50 text-sm">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              {typeHours.picEngineHours === "other" && (
                                <Input
                                  type="number" min="0"
                                  value={typeHours.picEngineHoursOther}
                                  onChange={(e) => updateOpwHours(typeKey, 'picEngineHoursOther', e.target.value)}
                                  placeholder="Enter hours"
                                  className={inputClass}
                                />
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className={labelClass}>Make and Model Hours</Label>
                              <Select 
                                value={typeHours.picMakeModelHours} 
                                onValueChange={(value) => {
                                  updateOpwHours(typeKey, 'picMakeModelHours', value);
                                  if (value !== "other") updateOpwHours(typeKey, 'picMakeModelHoursOther', "");
                                }}
                              >
                                <SelectTrigger className={selectTriggerClass}>
                                  <SelectValue placeholder="Select hours" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                  <SelectItem value="500" className="text-gray-900 hover:bg-gray-50 text-sm">500</SelectItem>
                                  <SelectItem value="250" className="text-gray-900 hover:bg-gray-50 text-sm">250</SelectItem>
                                  <SelectItem value="100" className="text-gray-900 hover:bg-gray-50 text-sm">100</SelectItem>
                                  <SelectItem value="other" className="text-gray-900 hover:bg-gray-50 text-sm">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              {typeHours.picMakeModelHours === "other" && (
                                <Input
                                  type="number" min="0"
                                  value={typeHours.picMakeModelHoursOther}
                                  onChange={(e) => updateOpwHours(typeKey, 'picMakeModelHoursOther', e.target.value)}
                                  placeholder="Enter hours"
                                  className={inputClass}
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Co-Pilot (only if any aircraft in this type has dual crew) */}
                        {hasDualCrew && (
                          <div className="space-y-2.5 pt-3 border-t border-gray-100">
                            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Co-Pilot</h5>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className={labelClass}>Total Hours</Label>
                                <Select 
                                  value={typeHours.coPilotTotalHours} 
                                  onValueChange={(value) => {
                                    updateOpwHours(typeKey, 'coPilotTotalHours', value);
                                    if (value !== "other") updateOpwHours(typeKey, 'coPilotTotalHoursOther', "");
                                  }}
                                >
                                  <SelectTrigger className={selectTriggerClass}>
                                    <SelectValue placeholder="Select hours" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-gray-200">
                                    <SelectItem value="1000" className="text-gray-900 hover:bg-gray-50 text-sm">1,000</SelectItem>
                                    <SelectItem value="500" className="text-gray-900 hover:bg-gray-50 text-sm">500</SelectItem>
                                    <SelectItem value="250" className="text-gray-900 hover:bg-gray-50 text-sm">250</SelectItem>
                                    <SelectItem value="other" className="text-gray-900 hover:bg-gray-50 text-sm">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                {typeHours.coPilotTotalHours === "other" && (
                                  <Input
                                    type="number" min="0"
                                    value={typeHours.coPilotTotalHoursOther}
                                    onChange={(e) => updateOpwHours(typeKey, 'coPilotTotalHoursOther', e.target.value)}
                                    placeholder="Enter hours"
                                    className={inputClass}
                                  />
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className={labelClass}>Engine Hours</Label>
                                <Select 
                                  value={typeHours.coPilotEngineHours} 
                                  onValueChange={(value) => {
                                    updateOpwHours(typeKey, 'coPilotEngineHours', value);
                                    if (value !== "other") updateOpwHours(typeKey, 'coPilotEngineHoursOther', "");
                                  }}
                                >
                                  <SelectTrigger className={selectTriggerClass}>
                                    <SelectValue placeholder="Select hours" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-gray-200">
                                    <SelectItem value="500" className="text-gray-900 hover:bg-gray-50 text-sm">500</SelectItem>
                                    <SelectItem value="250" className="text-gray-900 hover:bg-gray-50 text-sm">250</SelectItem>
                                    <SelectItem value="100" className="text-gray-900 hover:bg-gray-50 text-sm">100</SelectItem>
                                    <SelectItem value="other" className="text-gray-900 hover:bg-gray-50 text-sm">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                {typeHours.coPilotEngineHours === "other" && (
                                  <Input
                                    type="number" min="0"
                                    value={typeHours.coPilotEngineHoursOther}
                                    onChange={(e) => updateOpwHours(typeKey, 'coPilotEngineHoursOther', e.target.value)}
                                    placeholder="Enter hours"
                                    className={inputClass}
                                  />
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className={labelClass}>Make and Model Hours</Label>
                                <Select 
                                  value={typeHours.coPilotMakeModelHours} 
                                  onValueChange={(value) => {
                                    updateOpwHours(typeKey, 'coPilotMakeModelHours', value);
                                    if (value !== "other") updateOpwHours(typeKey, 'coPilotMakeModelHoursOther', "");
                                  }}
                                >
                                  <SelectTrigger className={selectTriggerClass}>
                                    <SelectValue placeholder="Select hours" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-gray-200">
                                    <SelectItem value="250" className="text-gray-900 hover:bg-gray-50 text-sm">250</SelectItem>
                                    <SelectItem value="100" className="text-gray-900 hover:bg-gray-50 text-sm">100</SelectItem>
                                    <SelectItem value="type_rated" className="text-gray-900 hover:bg-gray-50 text-sm">Type Rated</SelectItem>
                                  </SelectContent>
                                </Select>
                                {typeHours.coPilotMakeModelHours === "other" && (
                                  <Input
                                    type="number" min="0"
                                    value={typeHours.coPilotMakeModelHoursOther}
                                    onChange={(e) => updateOpwHours(typeKey, 'coPilotMakeModelHoursOther', e.target.value)}
                                    placeholder="Enter hours"
                                    className={inputClass}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Crew Personal Accident 24-Hour - Named Crew Details Card */}
        {selectedSubCoverages.includes("crew_personal_accident") && crewCoverageType === "24_hour" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-5 bg-[#004225] rounded-full" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Crew PA — 24 Hour Named Crew Details</h3>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowCrewMemberForm(true)}
                  className="bg-[#004225] hover:bg-[#003319] text-white rounded-md h-8 px-3 text-xs font-medium"
                >
                  <Plus className="size-3.5 mr-1.5" />
                  Add Crew Member
                </Button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {/* List of Named Crew Members */}
              {crewMembers.map((pilot, index) => (
                <div
                  key={index}
                  className="bg-gray-50/80 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Crew Member {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCrewMembers(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 rounded-md"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className={labelClass}>Name</Label>
                      <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 text-sm">
                        {pilot.name}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className={labelClass}>Age</Label>
                      <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 text-sm">
                        {pilot.age}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className={labelClass}>Position</Label>
                      <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 text-sm">
                        {pilot.position}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Named Crew Member Form */}
              {showCrewMemberForm && (
                <div className="bg-gray-50/80 border border-[#004225]/20 rounded-lg p-4 space-y-3">
                  <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Add New Crew Member</h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="crewMemberName" className={labelClass}>Name</Label>
                      <Input
                        id="crewMemberName"
                        value={tempCrewMember.name}
                        onChange={(e) => setTempCrewMember(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter crew member name"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="crewMemberAge" className={labelClass}>Age</Label>
                      <Input
                        id="crewMemberAge"
                        type="number"
                        value={tempCrewMember.age}
                        onChange={(e) => setTempCrewMember(prev => ({ ...prev, age: e.target.value }))}
                        placeholder="Enter age"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="crewMemberPosition" className={labelClass}>Position</Label>
                      <Select
                        value={tempCrewMember.position}
                        onValueChange={(value) => {
                          setTempCrewMember(prev => ({ ...prev, position: value }));
                          if (value !== "Other") {
                            setCrewPositionOther("");
                          }
                        }}
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="Pilot" className="text-gray-900 hover:bg-gray-50 text-sm">Pilot</SelectItem>
                          <SelectItem value="Captain" className="text-gray-900 hover:bg-gray-50 text-sm">Captain</SelectItem>
                          <SelectItem value="First Officer" className="text-gray-900 hover:bg-gray-50 text-sm">First Officer</SelectItem>
                          <SelectItem value="Flight Attendant" className="text-gray-900 hover:bg-gray-50 text-sm">Flight Attendant</SelectItem>
                          <SelectItem value="Other" className="text-gray-900 hover:bg-gray-50 text-sm">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {tempCrewMember.position === "Other" && (
                        <Input
                          value={crewPositionOther}
                          onChange={(e) => setCrewPositionOther(e.target.value)}
                          placeholder="Specify position"
                          className={`${inputClass} mt-1.5`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowCrewMemberForm(false);
                        setTempCrewMember({ name: "", age: "", position: "", sumsInsured: "", sumsInsuredCurrency: "USD" });
                        setCrewPositionOther("");
                      }}
                      className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 h-8 px-4 text-xs font-medium rounded-md"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const finalPosition = tempCrewMember.position === "Other" ? crewPositionOther : tempCrewMember.position;
                        
                        if (tempCrewMember.position === "Other" && !crewPositionOther.trim()) {
                          toast.error("Please specify the position");
                          return;
                        }
                        
                        if (tempCrewMember.name && tempCrewMember.age && tempCrewMember.position) {
                          setCrewMembers(prev => [...prev, { 
                            name: tempCrewMember.name, 
                            age: tempCrewMember.age, 
                            position: finalPosition,
                            sumsInsured: tempCrewMember.sumsInsured || "",
                            sumsInsuredCurrency: tempCrewMember.sumsInsuredCurrency || "USD",
                          }]);
                          setTempCrewMember({ name: "", age: "", position: "", sumsInsured: "", sumsInsuredCurrency: "USD" });
                          setCrewPositionOther("");
                          setShowCrewMemberForm(false);
                        }
                      }}
                      className="bg-[#004225] hover:bg-[#003319] text-white h-8 px-4 text-xs font-medium rounded-md"
                    >
                      Add Crew Member
                    </Button>
                  </div>
                </div>
              )}

              {crewMembers.length === 0 && !showCrewMemberForm && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No crew members added yet. Click "Add Crew Member" to begin.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-5 border-t border-gray-200 mt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md px-6 py-2.5 text-sm font-medium"
          >
            {shouldSkipStep3 ? '← Back to Policy Details' : `← Back to ${selectedMainCoverages.includes('UAS') ? 'Drone' : 'Aircraft'} Details`}
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            disabled={!namedPilots && !openPilotWarranty}
            className="bg-[#004225] hover:bg-[#003319] text-white font-medium rounded-md px-8 py-2.5 text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Step 5 →
          </Button>
        </div>
      </div>
    </div>
  );
}
