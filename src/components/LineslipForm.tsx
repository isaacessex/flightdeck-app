import { useState, useRef, useEffect } from "react";
import { Lineslip, LineslipUnderwriter, ProductCode, SlipWordingSection, Contact } from "../App";
import type { BinderRating } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X, Plus, Trash2, Upload, File, Check, ChevronsUpDown, ChevronDown, ChevronUp, Lock, Unlock, Search, UserCheck, FileText, Shield, DollarSign, BookOpen, Settings, Bell, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { toast } from "sonner";
import { EmailTemplatePreview } from "./EmailTemplatePreview";

interface LineslipFormProps {
  lineslip?: Lineslip;
  existingLineslips: Lineslip[];
  contacts?: Contact[];
  mode?: "lineslip" | "binder";
  onSave: (lineslip: Omit<Lineslip, "id" | "createdDate" | "lastModified">) => void;
  onCancel: () => void;
}

const productOptions: { code: ProductCode; name: string }[] = [
  { code: "HL", name: "Hull and Liability" },
  { code: "HW", name: "Hull War" },
  { code: "PA", name: "Personal Accident" },
  { code: "LOL", name: "Loss of Licence" },
  { code: "HD", name: "Hull Deductible" },
  { code: "UAS", name: "Drone Insurance" },
];

// Comprehensive list of countries (excluding sanctioned countries)
const countriesByRegion = {
  "Europe": [
    "Albania", "Andorra", "Austria", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia",
    "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece",
    "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania",
    "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia",
    "Norway", "Poland", "Portugal", "Romania", "San Marino", "Serbia", "Slovakia", "Slovenia",
    "Spain", "Sweden", "Switzerland", "Ukraine", "United Kingdom", "Vatican City",
  ],
  "Middle East": [
    "Bahrain", "Iraq", "Israel", "Jordan", "Kuwait", "Lebanon", "Oman", "Palestine",
    "Qatar", "Saudi Arabia", "Turkey", "United Arab Emirates", "Yemen",
  ],
  "Africa": [
    "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon", "Cape Verde",
    "Central African Republic", "Chad", "Comoros", "Congo", "Democratic Republic of the Congo",
    "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia",
    "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya",
    "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia",
    "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone",
    "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda",
    "Zambia", "Zimbabwe",
  ],
  "Asia": [
    "Afghanistan", "Armenia", "Azerbaijan", "Bangladesh", "Bhutan", "Brunei",
    "Cambodia", "China", "Georgia", "Hong Kong", "India", "Indonesia", "Japan",
    "Kazakhstan", "Kyrgyzstan", "Laos", "Macau", "Malaysia", "Maldives", "Mongolia",
    "Nepal", "Pakistan", "Philippines", "Singapore", "South Korea", "Sri Lanka",
    "Taiwan", "Tajikistan", "Thailand", "Timor-Leste", "Turkmenistan", "Uzbekistan", "Vietnam",
  ],
  "North America": [
    "Antigua and Barbuda", "Bahamas", "Barbados", "Belize", "Canada", "Costa Rica", "Dominica",
    "Dominican Republic", "El Salvador", "Grenada", "Guatemala", "Haiti", "Honduras", "Jamaica",
    "Mexico", "Nicaragua", "Panama", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Trinidad and Tobago", "United States",
  ],
  "South America": [
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay",
    "Peru", "Suriname", "Uruguay", "Venezuela",
  ],
  "Oceania": [
    "Australia", "Fiji", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", "New Zealand",
    "Palau", "Papua New Guinea", "Samoa", "Solomon Islands", "Tonga", "Tuvalu", "Vanuatu",
  ],
};

const availableCountries = Object.values(countriesByRegion).flat().sort();

// Default slip wording sections dispatcher — returns Insurance or Reinsurance template
// Accepts optional productCode to return product-specific templates (e.g. HW Hull War)
// Optional subType differentiates PA variants: "24_hour" vs default (flight_risk / on_duty)
export const getDefaultSlipSections = (placementType: "insurance" | "reinsurance" = "reinsurance", productCode?: string, subType?: string): SlipWordingSection[] => {
  if (productCode === "HW") {
    if (placementType === "insurance") return getDefaultHWInsuranceSlipSections();
    return getDefaultHWReinsuranceSlipSections();
  }
  if (productCode === "PA") {
    if (subType === "24_hour") {
      if (placementType === "insurance") return getDefaultPA24HInsuranceSlipSections();
      return getDefaultPA24HReinsuranceSlipSections();
    }
    if (placementType === "insurance") return getDefaultPAInsuranceSlipSections();
    return getDefaultPAReinsuranceSlipSections();
  }
  if (placementType === "insurance") return getDefaultInsuranceSlipSections();
  return getDefaultReinsuranceSlipSections();
};

// ── INSURANCE template ──────────────────────────────────────────────
// Mirrors the reinsurance template format with insurance-specific adaptations:
//   • No "Reinsured" section (sec-3 removed)
//   • Interests: no "To indemnify the Reinsured…" wrapper
//   • "Sums Insured" not "Sums Reinsured"
//   • "Insurance Conditions" not "Reinsurance Conditions" (+ Insurer language throughout)
//   • Conditions: no "Original Insurance per:" wrapper
//   • Insured/Insurer terminology throughout (not Reinsured/Reinsurer)
const getDefaultInsuranceSlipSections = (): SlipWordingSection[] => [
  {
    id: "sec-1",
    title: "Type of Insurance",
    content: "{{aviation_type_text}}",
    type: "variable",
    order: 1,
  },
  {
    id: "sec-2",
    title: "Unique Market Reference",
    content: "{{umr}}",
    type: "variable",
    order: 2,
  },
  {
    id: "sec-2b",
    title: "Attaching to Facility Reference Number",
    content: "{{broker_reference}}",
    type: "variable",
    order: 2.5,
  },
  {
    id: "sec-4",
    title: "Insured",
    content: "{{insured_name}}\n\n{{insured_address}}\n\nAdditional Insured(s): {{additional_insureds}}",
    type: "variable",
    order: 4,
  },
  {
    id: "sec-5",
    title: "Period",
    content: "{{period_text}}",
    type: "variable",
    order: 5,
  },
  {
    id: "sec-6",
    title: "Interests",
    content: "Section One:\n\n  Hull:\n  Accidental loss of or damage to the Aircraft as per the Schedule of Aircraft.\n\n  Aircraft Liability:\n  The Insured's legal liability to third parties, passengers (including baggage and personal articles) and arising out of the ownership, operation or use of the Aircraft as per the Schedule of Aircraft.\n\nSection Two:\n\n  Spares:\n  Spares being owned by the Insured or owned by others for which the Insured is responsible and has been required to insure them.",
    type: "fixed",
    order: 6,
  },
  {
    id: "sec-7",
    title: "Sums Insured",
    content: "Section One:\n\n  Hull:\n  Agreed Values as per the Schedule of Aircraft subject to a maximum Agreed Value of the following any one Aircraft:\n\n    Fixed Wing: {{max_agreed_value_fixed_wing}}\n    Rotary Wing: {{max_agreed_value_rotary_wing}}\n\n  Aircraft Liability:\n  As per each aircraft under Aircraft Schedule.\n\nSection Two:\n\n  Spares:\n  {{spares_limit_text}}\n\nTotal Overall Policy Annual Aggregate Limit:\n  {{total_aircraft_values}}\n\nIn addition the maximum Agreed Value any one Aircraft shall not exceed {{hw_max_agreed_value}} any one Aircraft.",
    type: "variable",
    order: 7,
  },
  {
    id: "sec-8",
    title: "Deductibles",
    content: "As per each aircraft under Aircraft Schedule.",
    type: "variable",
    order: 8,
  },
  {
    id: "sec-9",
    title: "Situation",
    content: "Worldwide subject to the following Geographic Areas Exclusion Clause LSW617J (Amended):\n\n1. Notwithstanding any provision to the contrary within this insurance it is agreed that this insurance excludes any loss, damage, cost or expense of whatsoever nature directly or indirectly caused by, resulting from or in connection with war, invasion, acts of foreign enemies, hostilities or warlike operations (whether war be declared or not), civil war, revolution, rebellion, insurrection, civil commotion assuming the proportions of or amounting to an uprising, military or usurped power, or confiscation, nationalisation, seizure, detention, appropriation, requisition for title or use by or under the order of any government (whether civil, military or de facto) in respect of the following territories:\n\n(a) Algeria; Burundi; Far North Region of Cameroon; Central African Republic; Democratic Republic of Congo; Ethiopia; Kenya; Mali; Mauritania; Nigeria; Somalia; The Republic of Sudan; South Sudan.\n(b) Haiti.\n(c) Afghanistan; Jammu & Kashmir; Myanmar; North Korea; Pakistan.\n(d) Abkhazia; Nagorno-Karabakh; The Republic of Belarus; The Russian Federation; South Ossetia; Ukraine.\n(e) Iran; Iraq; Israel; Lebanon; Libya; North Sinai Province of Egypt; Syria; Yemen.\n\n2. However coverage pursuant to this Policy is granted:\n(a) overflight of and technical stops in territories listed in 1 above provided no passengers embark or disembark and no cargo loaded or discharged;\n(b) in the event of force majeure.\n\n3. Any excluded country may be covered by underwriters' individual agreement if required and subject to an additional premium, terms and conditions as underwriters may decide.\n\n16/09/25 LSW617J",
    type: "fixed",
    order: 9,
  },
  // sec-10 "Insurance Conditions" intentionally omitted from insurance template —
  // these clauses are only relevant to the reinsurance template (as "Reinsurance Conditions").
  {
    id: "sec-11",
    title: "Conditions",
    content: "London Aircraft Insurance Policy AVN1C (no proposal form to be completed)\n\nSection I of AVN1C, number of days amended to 15 days for unreported Aircraft.\n\nCoverage 1(b) of Section III of AVN1C amended to include coverage for liability arising out of the ownership, maintenance, operation or use of the Aircraft.\n\nGeneral Conditions 4, 7 and 10 of AVN1C deleted.\n\nPassenger Extension Clause\nAirfreight of Spares Clause\nBabes In Arms Clause\n\nAdditions and Deletions (Combined) — AVN19A\nUnlicensed Landing Ground Suitability Clause — AVN23A\nNuclear Risks Exclusion Clause — AVN38B\nNoise and Pollution and Other Perils Exclusion — AVN46B\nAVN48B deleted subject to AVN52E (sub-limit USD 35,000)\nPersonal Injury Extension — AVN60A\nAgreed Value Clause — AVN61\nLiability to Pilots and Crew Clause — AVN73\nPilot Indemnity Clause — AVN74\nSupplementary Payments Clause — AVN76\nUnauthorised Use Clause — AVN77 (theft only)\nForced Landing Clause — AVN78 (amended)\nMedical and Related Expenses — AVN80\nOut Of Notified Hours Clause — AVN81\nTrespassers Cost Clause — AVN91 (limit USD 10,000)\nBreach of Air Navigation Regulations — AVN94\nDate Recognition — AVN2001A, AVN2000A\nAsbestos Exclusion — 2488AGM00003\n\n\"Insured\" definition — Two Way Cross Liability — LSW715\n\n30 days cancellation notice — AVN115\n\nLeased engines and components: In the event that any engine or component part is leased, the interest of the lessor is noted and agreed.\n\nContractual provisions: Any hold harmless, indemnity, waiver of subrogation or similar contractual provision — AVN67B/C.\n\nConstructive Total Loss: 75% of Agreed Value.\n\n{{confiscation_text}}\n\n{{open_pilot_warranty}}\n\nSoftware Affirmation Clause — LMA5450\nElectronic Data Event Liability Exclusion — LIIBA 001\nFraudulent Claims — AVN100A\nSanctions and Embargo Clause — AVN111",
    type: "fixed",
    order: 11,
  },
  {
    id: "sec-12",
    title: "Schedule of Aircraft",
    content: "As attached.\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 12,
  },
  {
    id: "sec-13",
    title: "Express Warranties",
    content: "None other than as may exist in the Policy or as agreed with the Leading Insurer from time to time.",
    type: "fixed",
    order: 13,
  },
  {
    id: "sec-14",
    title: "Conditions Precedent",
    content: "None other than as may exist in the Policy or as agreed with the Leading Insurer from time to time.",
    type: "fixed",
    order: 14,
  },
  {
    id: "sec-15",
    title: "Subjectivities",
    content: "None",
    type: "variable",
    order: 15,
  },
  {
    id: "sec-16",
    title: "Choice of Law & Jurisdiction",
    content: "Insured's country of domicile.\n\nAny dispute arising out of or in connection with this insurance shall be subject to the jurisdiction of the courts of the Insured's country of domicile.",
    type: "variable",
    order: 16,
  },
  {
    id: "sec-17",
    title: "Premium",
    content: "As attached.\n\n{{premium_amount}}",
    type: "variable",
    order: 17,
  },
  {
    id: "sec-18",
    title: "Premium Payment Terms",
    content: "Payable in equal quarterly instalments to insurers via {{broker_name}} subject to the Premium Payment Clause AVNGA (paragraph 2 deleted)\n{{quarterly_instalment_dates}}\nAppointed broker: {{broker_name}}.",
    type: "variable",
    order: 18,
  },
  {
    id: "sec-19",
    title: "Taxes Payable by Insured",
    content: "As attached.",
    type: "variable",
    order: 19,
  },
  {
    id: "sec-20",
    title: "Taxes Payable by Insurer",
    content: "As attached.",
    type: "variable",
    order: 20,
  },
  {
    id: "sec-21",
    title: "Insurer Contract Documentation",
    content: "Contract certainty to be achieved prior to inception or within 30 days of binding, whichever is the later.\n\nAny changes to the terms of this policy shall be documented by endorsement issued by the broker and agreed by the Leading Insurer.\n\nInsured advisory note to be provided within 7 days of binding.",
    type: "fixed",
    order: 21,
  },
  {
    id: "sec-22",
    title: "Several Liability Notice Insurance",
    content: "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001",
    type: "fixed",
    order: 22,
  },
  {
    id: "sec-23",
    title: "Order Hereon",
    content: "{{order_hereon_text}}",
    type: "variable",
    order: 23,
  },
  {
    id: "sec-23b",
    title: "Claims Information",
    content: "{{product_name}} claims advised in the last 5 years:\n\n{{claims_history_text}}",
    type: "variable",
    order: 24,
  },
  {
    id: "sec-24",
    title: "Aircraft Schedule (Attachment)",
    content: "AIRCRAFT SCHEDULE\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 25,
  },
  {
    id: "sec-25",
    title: "Aircraft Uses (Attachment)",
    content: "AIRCRAFT USES\n\n{{aircraft_uses_text}}",
    type: "variable",
    order: 26,
  },
  {
    id: "sec-26",
    title: "Geographical Limits",
    content: "GEOGRAPHICAL LIMITS\n\n{{geographical_limits_text}}",
    type: "variable",
    order: 27,
  },
  {
    id: "sec-27",
    title: "Premium Breakdown (Attachment)",
    content: "PREMIUM BREAKDOWN\n(per annum & pro rata for the period, as applicable)\n\n{{premium_breakdown_text}}",
    type: "variable",
    order: 28,
  },
  {
    id: "sec-28",
    title: "Notification of Security",
    content: "NOTIFICATION OF SECURITY\n\nINSURED: {{insured_name}}\nUNIQUE MARKET REFERENCE: {{umr}}\nPERIOD: Subject Approval, No Risk\nTYPE: {{aviation_type_text}}\n\nSubject to the LSW 1001 clause the final basis of Security is detailed as follows:\n\nOrder hereon: {{order_hereon_text}}\nDeclaration under delegated underwriting contract: {{broker_reference}}\n\nEffected with:\n\n{{underwriter_table_text}}\n\n{{quoting_underwriter}} {{quote_date}}",
    type: "variable",
    order: 29,
  },
];

// ── REINSURANCE template ──────────────────────────────────────────────
const getDefaultReinsuranceSlipSections = (): SlipWordingSection[] => [
  {
    id: "sec-1",
    title: "Type of Insurance",
    content: "{{aviation_type_text}}",
    type: "variable",
    order: 1,
  },
  {
    id: "sec-2",
    title: "Unique Market Reference",
    content: "{{umr}}",
    type: "variable",
    order: 2,
  },
  {
    id: "sec-2b",
    title: "Attaching to Facility Reference Number",
    content: "{{broker_reference}}",
    type: "variable",
    order: 2.5,
  },
  {
    id: "sec-3",
    title: "Reinsured",
    content: "{{reinsured_name}}\n\n{{reinsured_address}}",
    type: "variable",
    order: 3,
  },
  {
    id: "sec-4",
    title: "Insured",
    content: "{{insured_name}}\n\n{{insured_address}}\n\nAdditional Insured(s): {{additional_insureds}}",
    type: "variable",
    order: 4,
  },
  {
    id: "sec-5",
    title: "Period",
    content: "{{period_text}}",
    type: "variable",
    order: 5,
  },
  {
    id: "sec-6",
    title: "Interests",
    content: "To indemnify the {{insured_or_reinsured}} in respect of a Policy or Policies issued by them to the Insured in respect of:\n\nSection One:\n\n  Hull:\n  Accidental loss of or damage to the Aircraft as per the Schedule of Aircraft.\n\n  Aircraft Liability:\n  The Insured's legal liability to third parties, passengers (including baggage and personal articles) and arising out of the ownership, operation or use of the Aircraft as per the Schedule of Aircraft.\n\nSection Two:\n\n  Spares:\n  Spares being owned by the Insured or owned by others for which the Insured is responsible and has been required to insure them.",
    type: "fixed",
    order: 6,
  },
  {
    id: "sec-7",
    title: "Sums Reinsured",
    content: "Section One:\n\n  Hull:\n  Agreed Values as per the Schedule of Aircraft subject to a maximum Agreed Value of the following any one Aircraft:\n\n    Fixed Wing: {{max_agreed_value_fixed_wing}}\n    Rotary Wing: {{max_agreed_value_rotary_wing}}\n\n  Aircraft Liability:\n  As per each aircraft under Aircraft Schedule.\n\nSection Two:\n\n  Spares:\n  {{spares_limit_text}}\n\nTotal Overall Policy Annual Aggregate Limit:\n  {{total_aircraft_values}}\n\nIn addition the maximum Agreed Value any one Aircraft shall not exceed {{hw_max_agreed_value}} any one Aircraft.",
    type: "variable",
    order: 7,
  },
  {
    id: "sec-8",
    title: "Deductibles",
    content: "As per each aircraft under Aircraft Schedule.",
    type: "variable",
    order: 8,
  },
  {
    id: "sec-9",
    title: "Situation",
    content: "Worldwide subject to the following Geographic Areas Exclusion Clause LSW617J (Amended):\n\n1. Notwithstanding any provision to the contrary within this insurance it is agreed that this insurance excludes any loss, damage, cost or expense of whatsoever nature directly or indirectly caused by, resulting from or in connection with war, invasion, acts of foreign enemies, hostilities or warlike operations (whether war be declared or not), civil war, revolution, rebellion, insurrection, civil commotion assuming the proportions of or amounting to an uprising, military or usurped power, or confiscation, nationalisation, seizure, detention, appropriation, requisition for title or use by or under the order of any government (whether civil, military or de facto) in respect of the following territories:\n\n(a) Algeria; Burundi; Far North Region of Cameroon; Central African Republic; Democratic Republic of Congo; Ethiopia; Kenya; Mali; Mauritania; Nigeria; Somalia; The Republic of Sudan; South Sudan.\n(b) Haiti.\n(c) Afghanistan; Jammu & Kashmir; Myanmar; North Korea; Pakistan.\n(d) Abkhazia; Nagorno-Karabakh; The Republic of Belarus; The Russian Federation; South Ossetia; Ukraine.\n(e) Iran; Iraq; Israel; Lebanon; Libya; North Sinai Province of Egypt; Syria; Yemen.\n\n2. However coverage pursuant to this Policy is granted:\n(a) overflight of and technical stops in territories listed in 1 above provided no passengers embark or disembark and no cargo loaded or discharged;\n(b) in the event of force majeure.\n\n3. Any excluded country may be covered by underwriters' individual agreement if required and subject to an additional premium, terms and conditions as underwriters may decide.\n\n16/09/25 LSW617J",
    type: "fixed",
    order: 9,
  },
  {
    id: "sec-10",
    title: "Reinsurance Conditions",
    content: "Reinsurance Subscription and Claims Control Clause:\n\n1. Leading Reinsurer shall be responsible for making all decisions in connection with the handling of claims under this Contract.\n2. All claims settlements by the Leading Reinsurer shall be binding on all Reinsurers subscribing hereto.\n3. The Reinsured shall:\n   (a) give prompt notice to the Leading Reinsurer of any occurrence which may give rise to a claim;\n   (b) provide the Leading Reinsurer with all information and assistance as may be required;\n   (c) take all reasonable steps to mitigate any loss.\n\nAVN41A (Amended) — Leading Reinsurer Agreement:\nThe Leading Reinsurer shall have authority to agree claims, amendments, extensions and other matters on behalf of all subscribing Reinsurers. Any change of Leading Reinsurer shall be notified to the Reinsured and all subscribing Reinsurers.\n\nContracts (Rights of Third Parties) Act 1999 — AVN72:\nNo third party shall have any right to enforce any term of this contract by virtue of the Contracts (Rights of Third Parties) Act 1999 or any similar legislation in any jurisdiction.\n\nSimultaneous Settlement (Reinsurance) Clause — LPO438:\nNotwithstanding anything contained herein to the contrary, it is a condition of this Reinsurance that the Reinsurer(s) shall simultaneously settle their respective proportional share of any valid claim agreed by Leading Reinsurer.\n\nReinsurance Cancellation Clause AVN112 (30 days):\nThis contract may be cancelled by either party giving 30 days written notice to the other party.\n\nCut-Through Clause:\nIn the event of the insolvency of the Reinsured, this contract shall not be avoided by the Reinsurer and the Reinsurer's share of any loss shall be payable directly to the Insured.\n\nSanctions and Embargo Clause — AVN111(R):\nNo Reinsurer shall be deemed to provide cover and no Reinsurer shall be liable to pay any claim or provide any benefit hereunder to the extent that the provision of such cover, payment of such claim or provision of such benefit would expose that Reinsurer to any sanction, prohibition or restriction.\n\nElectronic Data Event Liability Exclusion — LIIBA 001 12.09.2019:\nThis contract does not insure any loss, damage, liability or expense directly or indirectly caused by or contributed to by or arising from the use or operation of any computer, computer system, computer software programme, malicious code, computer virus, computer process or any other electronic system.\n\nReinsurer Review Clause:\n(a) In the event of a security downgrade of any Reinsurer subscribing hereto, the Reinsured shall have the right to request replacement of such Reinsurer.\n(b) In the event that any Reinsurer gives notice to withdraw from aviation business, this contract shall continue in force for the unexpired period subject to the remaining Reinsurers.\n\nDefinitions: S&P rating of A- or above; AM Best rating of A- or above.",
    type: "fixed",
    order: 10,
  },
  {
    id: "sec-11",
    title: "Conditions",
    content: "Original Insurance per:\n\nSection One: London Aircraft Insurance Policy AVN1C (no proposal form to be completed)\nSection Two: Except as amended herein\n\nSection I of AVN1C, number of days amended to 15 days for unreported Aircraft.\n\nCoverage 1(b) of Section III of AVN1C amended to include coverage for liability arising out of the ownership, maintenance, operation or use of the Aircraft.\n\nGeneral Conditions 4, 7 and 10 of AVN1C deleted.\n\nPassenger Extension Clause\nAirfreight of Spares Clause\nBabes In Arms Clause\n\nAdditions and Deletions (Combined) — AVN19A\nUnlicensed Landing Ground Suitability Clause — AVN23A\nNuclear Risks Exclusion Clause — AVN38B\nNoise and Pollution and Other Perils Exclusion — AVN46B\nAVN48B deleted subject to AVN52E (sub-limit USD 35,000)\nPersonal Injury Extension — AVN60A\nAgreed Value Clause — AVN61\nLiability to Pilots and Crew Clause — AVN73\nPilot Indemnity Clause — AVN74\nSupplementary Payments Clause — AVN76\nUnauthorised Use Clause — AVN77 (theft only)\nForced Landing Clause — AVN78 (amended)\nMedical and Related Expenses — AVN80\nOut Of Notified Hours Clause — AVN81\nTrespassers Cost Clause — AVN91 (limit USD 10,000)\nBreach of Air Navigation Regulations — AVN94\nDate Recognition — AVN2001A, AVN2000A\nAsbestos Exclusion — 2488AGM00003\n\n\"Insured\" definition — Two Way Cross Liability — LSW715\n\n30 days cancellation notice — AVN115\n\nLeased engines and components: In the event that any engine or component part is leased, the interest of the lessor is noted and agreed.\n\nContractual provisions: Any hold harmless, indemnity, waiver of subrogation or similar contractual provision — AVN67B/C.\n\nConstructive Total Loss: 75% of Agreed Value.\n\n{{confiscation_text}}\n\n{{open_pilot_warranty}}\n\nSoftware Affirmation Clause — LMA5450\nElectronic Data Event Liability Exclusion — LIIBA 001\nFraudulent Claims — AVN100A\nSanctions and Embargo Clause — AVN111",
    type: "fixed",
    order: 11,
  },
  {
    id: "sec-12",
    title: "Schedule of Aircraft",
    content: "As attached.\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 12,
  },
  {
    id: "sec-13",
    title: "Express Warranties",
    content: "None other than as may exist in the Original Insurance or as agreed with the Leading Reinsurer from time to time.",
    type: "fixed",
    order: 13,
  },
  {
    id: "sec-14",
    title: "Conditions Precedent",
    content: "None other than as may exist in the Original Insurance or as agreed with the Leading Reinsurer from time to time.",
    type: "fixed",
    order: 14,
  },
  {
    id: "sec-15",
    title: "Subjectivities",
    content: "None",
    type: "variable",
    order: 15,
  },
  {
    id: "sec-16",
    title: "Choice of Law & Jurisdiction",
    content: "Reinsured's country of domicile.\n\nAny dispute arising out of or in connection with this reinsurance shall be subject to the jurisdiction of the courts of the Reinsured's country of domicile.",
    type: "variable",
    order: 16,
  },
  {
    id: "sec-17",
    title: "Premium",
    content: "As attached.\n\n{{premium_amount}}",
    type: "variable",
    order: 17,
  },
  {
    id: "sec-18",
    title: "Premium Payment Terms",
    content: "Payable in equal quarterly instalments to reinsurers via {{broker_name}} subject to the Premium Payment Clause AVNGA (paragraph 2 deleted)\n{{quarterly_instalment_dates}}\nAppointed broker: {{broker_name}}.",
    type: "variable",
    order: 18,
  },
  {
    id: "sec-19",
    title: "Taxes Payable by Reinsured",
    content: "As attached.",
    type: "variable",
    order: 19,
  },
  {
    id: "sec-20",
    title: "Taxes Payable by Reinsurer",
    content: "As attached.",
    type: "variable",
    order: 20,
  },
  {
    id: "sec-21",
    title: "Reinsurer Contract Documentation",
    content: "Contract certainty to be achieved prior to inception or within 30 days of binding, whichever is the later.\n\nAny changes to the terms of this contract shall be documented by endorsement issued by the broker and agreed by the Leading Reinsurer.\n\nReinsured advisory note to be provided within 7 days of binding.",
    type: "fixed",
    order: 21,
  },
  {
    id: "sec-22",
    title: "Several Liability Notice Insurance",
    content: "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001",
    type: "fixed",
    order: 22,
  },
  {
    id: "sec-23",
    title: "Order Hereon",
    content: "{{order_hereon_text}}",
    type: "variable",
    order: 23,
  },
  {
    id: "sec-23b",
    title: "Claims Information",
    content: "{{product_name}} claims advised in the last 5 years:\n\n{{claims_history_text}}",
    type: "variable",
    order: 24,
  },
  {
    id: "sec-24",
    title: "Aircraft Schedule (Attachment)",
    content: "AIRCRAFT SCHEDULE\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 25,
  },
  {
    id: "sec-25",
    title: "Aircraft Uses (Attachment)",
    content: "AIRCRAFT USES\n\n{{aircraft_uses_text}}",
    type: "variable",
    order: 26,
  },
  {
    id: "sec-26",
    title: "Geographical Limits",
    content: "GEOGRAPHICAL LIMITS\n\n{{geographical_limits_text}}",
    type: "variable",
    order: 27,
  },
  {
    id: "sec-27",
    title: "Premium Breakdown (Attachment)",
    content: "PREMIUM BREAKDOWN\n(per annum & pro rata for the period, as applicable)\n\n{{premium_breakdown_text}}",
    type: "variable",
    order: 28,
  },
  {
    id: "sec-28",
    title: "Notification of Security",
    content: "NOTIFICATION OF SECURITY\n\nREINSURED: {{reinsured_name}}\nINSURED: {{insured_name}}\nUNIQUE MARKET REFERENCE: {{umr}}\nPERIOD: Subject Approval, No Risk\nTYPE: {{aviation_type_text}}\n\nSubject to the LSW 1001 clause the final basis of Security is detailed as follows:\n\nOrder hereon: {{order_hereon_text}}\nDeclaration under delegated underwriting contract: {{broker_reference}}\n\nEffected with:\n\n{{underwriter_table_text}}\n\n{{quoting_underwriter}} {{quote_date}}",
    type: "variable",
    order: 29,
  },
];

// ── HULL WAR (HW) INSURANCE template ──────────────────────────────────
// HW-specific: War perils wording for Interests & Sums, no Section One/Two split,
// no liability clauses, confiscation/LSW555D in Conditions, no sec-10.
const getDefaultHWInsuranceSlipSections = (): SlipWordingSection[] => [
  {
    id: "sec-1",
    title: "Type of Insurance",
    content: "AVIATION HULL AND SPARES WAR AND ASSOCIATED PERILS {{placement_type_upper}}",
    type: "variable",
    order: 1,
  },
  {
    id: "sec-2",
    title: "Unique Market Reference",
    content: "{{umr}}",
    type: "variable",
    order: 2,
  },
  {
    id: "sec-2b",
    title: "Attaching to Facility Reference Number",
    content: "{{broker_reference}}",
    type: "variable",
    order: 2.5,
  },
  {
    id: "sec-4",
    title: "Insured",
    content: "{{insured_name}}\n\n{{insured_address}}\n\nAdditional Insured(s): {{additional_insureds}}",
    type: "variable",
    order: 4,
  },
  {
    id: "sec-5",
    title: "Period",
    content: "{{period_text}}",
    type: "variable",
    order: 5,
  },
  {
    id: "sec-6",
    title: "Interests",
    content: "To indemnify the {{insured_or_reinsured}} in respect of a Policy or Policies issued by them to the Insured in respect of:\n\nHull War and Spares and Associated Perils\n\nHull:\nTo cover Aircraft in accordance with the Aircraft Schedule.\n\nSpares:\nSpares (as defined in the Hull All Risk coverage, Spare Parts and Equipment) being owned by the Insured or owned by others for which the Insured irresponsible and has been required to insure them.\n\nAGAINST Loss or damage caused by War and Allied Risks as specified in paragraphs (a) and (c) to (g) of the War Exclusion and Allied Risks (Aviation) Clause AVN48B and in addition confiscation and extortion and hijack expenses.\n\nHowever, with respect to Aircraft Spare Parts, the coverage provided with respect to hazards as specified in paragraph (a) of Clause AVN 48B shall only apply as long as such property is in transit by air or water, as defined under \"Duration\" in the CL388 War Institute (Air Freight) Clause and \"Duration\" in the CL385 Institute (Cargo) Clause.",
    type: "fixed",
    order: 6,
  },
  {
    id: "sec-7",
    title: "Sums Insured",
    content: "Hull:\nAgreed Values according to Aircraft Schedule subject to a maximum Agreed Value of any Aircraft not exceeding 125% of Highest aircraft value (on top of aircraft value) subject to an overall maximum of {{hw_max_agreed_value}} or currency equivalent.\n\nSpares:\n{{spares_limit_text}}\n\nIn addition:\n\nExtortion and Hi-Jack Expenses Limit\n90% of 10% of the highest aircraft agreed value as stated in the schedule of aircraft any one loss and in the annual aggregate (warranted 10% of any payment uninsured).\n\nSection One Paragraph (e) of LSW555D:\nConfiscation, nationalisation, seizure, restraint, detention, appropriation, requisition for title or use by or under the order of any government (whether civil, military or de facto) or public or local authority.\n\nSubject to an aggregate limit of {{total_aircraft_values}} in any one annual period within Total Overall Policy Annual Aggregate\n\nTotal Overall Policy Annual Aggregate Limit:\n{{total_aircraft_values}}",
    type: "variable",
    order: 7,
  },
  {
    id: "sec-8",
    title: "Deductibles",
    content: "Nil",
    type: "variable",
    order: 8,
  },
  {
    id: "sec-9",
    title: "Situation",
    content: "Worldwide subject to the following Geographic Areas Exclusion Clause LSW617J (Amended):\n\n1. Notwithstanding any provision to the contrary within this insurance it is agreed that this insurance excludes any loss, damage, cost or expense of whatsoever nature directly or indirectly caused by, resulting from or in connection with war, invasion, acts of foreign enemies, hostilities or warlike operations (whether war be declared or not), civil war, revolution, rebellion, insurrection, civil commotion assuming the proportions of or amounting to an uprising, military or usurped power, or confiscation, nationalisation, seizure, detention, appropriation, requisition for title or use by or under the order of any government (whether civil, military or de facto) in respect of the following territories:\n\n(a) Algeria; Burundi; Far North Region of Cameroon; Central African Republic; Democratic Republic of Congo; Ethiopia; Kenya; Mali; Mauritania; Nigeria; Somalia; The Republic of Sudan; South Sudan.\n(b) Haiti.\n(c) Afghanistan; Jammu & Kashmir; Myanmar; North Korea; Pakistan.\n(d) Abkhazia; Nagorno-Karabakh; The Republic of Belarus; The Russian Federation; South Ossetia; Ukraine.\n(e) Iran; Iraq; Israel; Lebanon; Libya; North Sinai Province of Egypt; Syria; Yemen.\n\n2. However coverage pursuant to this Policy is granted:\n(a) overflight of and technical stops in territories listed in 1 above provided no passengers embark or disembark and no cargo loaded or discharged;\n(b) in the event of force majeure.\n\n3. Any excluded country may be covered by underwriters' individual agreement if required and subject to an additional premium, terms and conditions as underwriters may decide.\n\n16/09/25 LSW617J",
    type: "fixed",
    order: 9,
  },
  {
    id: "sec-11",
    title: "Conditions",
    content: "Hull War Policy and Allied Risks LSW555D \n\nexcept as amended herein.\n\n{{confiscation_text}} confiscation, nationalisation, seizure, restraint, detention, appropriation, requisition for title or use by or under the order of the government(s) of aircraft registry (whether civil, military or de facto) or public or local authority - exclusion (b) of LSW555D deleted.\n\nCancellation Revision and Automatic Termination provisions per Section Five of LSW 555D amended to provide that automatic termination only applies in respect of War perils (i.e. as paragraph (a) of Section One of LSW 555D).\n\nIn the event of cancellation by Insurers or automatic termination in accordance with Provisions 1(c) and 2 of Section Five of LSW 555D a pro rata return of premium shall be payable to the Insured.\n\nAdditions to and deletions from the Schedule of Aircraft, substitutions of Aircraft and Agreed Value changes are automatically covered hereunder subject to not exceeding a maximum Agreed Value of 125% of the highest aircraft agreed value as stated in the schedule of aircraft subject always to an overall maximum of {{hw_max_agreed_value}} (or currency equivalent at date of attachment) any one Aircraft, with declaration to Insurers monthly and pro rata premium adjustment at expiry.\n\nSupplementary Payments Clause (AVN76 (amended)) – Provided always that Insurers' liability shall not exceed 15% of the maximum declared aircraft agreed value as detailed under the Schedule of Aircraft any one incident over all paragraphs insured which is included within the aggregate limit applicable to this Insurance and not in addition.\n\nIn the event of the Period of Insurance being greater than twelve (12) months the aggregate limit of liability for the total period shall be and shall in no event exceed the annual aggregate limits stated in this Insurance, plus pro rata of such aggregate limits, of which not more than the annual aggregate limit set forth in this Insurance shall be applicable for either (i) the first twelve months, or (ii) for the remainder of the Period of Insurance respectively.\n\nSoftware Affirmation Clause LMA 5450\n\nLeased Engines Clause\nWhen leased engines / components (other than as covered under this Insurance) are installed on an Aircraft insured hereunder, the agreed value of such Aircraft shall be automatically increased, at pro rata additional premium, by the amount required to be insured under the lease agreement in respect of such engines / components for the period that such engines / components are installed on the Aircraft. Where such amount is not specified in the lease agreement, this shall be the fair market value of such engines / components as agreed between the Insurers and the owners of the engines / components at the time of the loss. A maximum Agreed Value of 125% of the highest aircraft agreed value as stated in the schedule of aircraft subject always to an overall maximum of {{hw_max_agreed_value}} (or currency equivalent at date of attachment) any one Aircraft, with declaration to Insurers monthly and pro rata premium adjustment at expiry.\n\nBenefit of salvage of the removed engine / component to the Insurers in the event that the Aircraft is the subject of a claim adjustable on the basis of a total loss.\n\nInsurers hereon agree to automatically include coverage for contractual provisions including hold harmless agreements, indemnity agreements, waivers of subrogation, additional Insureds, breach of warranty, loss payees, leased spares and equipment agreed values arising in the normal course of the Insured's business or operations, including all such contractual provisions and evidence of insurance executed prior to the inception of this Insurance. An additional premium of USD 100 is deemed to be charged on each agreement where breach of warranty is required, including in respect of Airline Finance/Lease Contract Endorsement AVN67B/C (Hull War), receipt of which is hereby acknowledged at the inception of this Insurance or subsequent effective date of such agreement.\n\nOther contractual agreements outside the normal course of the Insured's business or operations are subject to the agreement of the Insurers prior to the effective date of the contract(s).\n\nIn the event that the Insured or their employees are rendered by any peril covered by this Insurance unable to protect the Aircraft from damage or wear, tear or gradual deterioration or are prevented from performing any service to any part of the Aircraft made necessary by the passage of time, this Insurance shall cover all costs and expenses necessarily incurred to reinstate the Aircraft to its condition immediately prior to exposure to such perils.\n\nIn respect of parts, engines or sub-assemblies detached from any Aircraft for any purpose, including repair or overhaul, and not replaced, coverage provided hereunder shall continue on an Agreed Value basis for full replacement value, including whilst such parts, engines or sub-assemblies are in transit.",
    type: "fixed",
    order: 11,
  },
  {
    id: "sec-12",
    title: "Schedule of Aircraft",
    content: "As attached.",
    type: "variable",
    order: 12,
  },
  {
    id: "sec-13",
    title: "Express Warranties",
    content: "None other than as may exist in the Policy or as agreed with the Leading Insurer from time to time.",
    type: "fixed",
    order: 13,
  },
  {
    id: "sec-14",
    title: "Conditions Precedent",
    content: "None other than as may exist in the Policy or as agreed with the Leading Insurer from time to time.",
    type: "fixed",
    order: 14,
  },
  {
    id: "sec-15",
    title: "Subjectivities",
    content: "None",
    type: "variable",
    order: 15,
  },
  {
    id: "sec-16",
    title: "Choice of Law & Jurisdiction",
    content: "Insured's country of domicile.\n\nAny dispute arising out of or in connection with this insurance shall be subject to the jurisdiction of the courts of the Insured's country of domicile.",
    type: "variable",
    order: 16,
  },
  {
    id: "sec-17",
    title: "Premium",
    content: "As attached.",
    type: "variable",
    order: 17,
  },
  {
    id: "sec-18",
    title: "Premium Payment Terms",
    content: "Payable in equal quarterly instalments to insurers via {{broker_name}} subject to the Premium Payment Clause AVN6A (paragraph 2 deleted)\n{{quarterly_instalment_dates}}\nAppointed broker: {{broker_name}}.",
    type: "variable",
    order: 18,
  },
  {
    id: "sec-19",
    title: "Taxes Payable by Insured",
    content: "As attached.",
    type: "variable",
    order: 19,
  },
  {
    id: "sec-20",
    title: "Taxes Payable by Insurer",
    content: "As attached.",
    type: "variable",
    order: 20,
  },
  {
    id: "sec-21",
    title: "Insurer Contract Documentation",
    content: "Contract certainty to be achieved prior to inception or within 30 days of binding, whichever is the later.\n\nAny changes to the terms of this policy shall be documented by endorsement issued by the broker and agreed by the Leading Insurer.\n\nInsured advisory note to be provided within 7 days of binding.",
    type: "fixed",
    order: 21,
  },
  {
    id: "sec-22",
    title: "Several Liability Notice Insurance",
    content: "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001",
    type: "fixed",
    order: 22,
  },
  {
    id: "sec-23",
    title: "Order Hereon",
    content: "{{order_hereon_text}}",
    type: "variable",
    order: 23,
  },
  {
    id: "sec-23b",
    title: "Claims Information",
    content: "{{product_name}} claims advised in the last 5 years:\n\n{{claims_history_text}}",
    type: "variable",
    order: 24,
  },
  {
    id: "sec-24",
    title: "Aircraft Schedule (Attachment)",
    content: "AIRCRAFT SCHEDULE\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 25,
  },
  {
    id: "sec-25",
    title: "Aircraft Uses (Attachment)",
    content: "AIRCRAFT USES\n\n{{aircraft_uses_text}}",
    type: "variable",
    order: 26,
  },
  {
    id: "sec-26",
    title: "Geographical Limits",
    content: "{{geographical_limits_text}}",
    type: "variable",
    order: 27,
  },
  {
    id: "sec-27",
    title: "Premium Breakdown (Attachment)",
    content: "PREMIUM BREAKDOWN\n(per annum & pro rata for the period, as applicable)\n\n{{premium_breakdown_text}}",
    type: "variable",
    order: 28,
  },
  {
    id: "sec-28",
    title: "Notification of Security",
    content: "NOTIFICATION OF SECURITY\n\nINSURED: {{insured_name}}\nUNIQUE MARKET REFERENCE: {{umr}}\nPERIOD: Subject Approval, No Risk\nTYPE: AVIATION HULL AND LIABILITY {{placement_type_upper}}\n\nSubject to the LSW 1001 clause the final basis of Security is detailed as follows:\n\nOrder hereon: {{order_hereon_text}}\nDeclaration under delegated underwriting contract: {{broker_reference}}\n\nEffected with:\n\n{{underwriter_table_text}}\n\n{{quoting_underwriter}} {{quote_date}}",
    type: "variable",
    order: 29,
  },
];

// ── HULL WAR (HW) REINSURANCE template ──────────────────────────────────
// HW-specific reinsurance variant: includes Reinsured section (sec-3),
// reinsurance wrapper on Interests, Reinsurance Conditions (sec-10),
// and HW-stripped Conditions (sec-11).
const getDefaultHWReinsuranceSlipSections = (): SlipWordingSection[] => [
  {
    id: "sec-1",
    title: "Type of Insurance",
    content: "AVIATION HULL AND SPARES WAR AND ASSOCIATED PERILS {{placement_type_upper}}",
    type: "variable",
    order: 1,
  },
  {
    id: "sec-2",
    title: "Unique Market Reference",
    content: "{{umr}}",
    type: "variable",
    order: 2,
  },
  {
    id: "sec-2b",
    title: "Attaching to Facility Reference Number",
    content: "{{broker_reference}}",
    type: "variable",
    order: 2.5,
  },
  {
    id: "sec-3",
    title: "Reinsured",
    content: "{{reinsured_name}}\n\n{{reinsured_address}}",
    type: "variable",
    order: 3,
  },
  {
    id: "sec-4",
    title: "Insured",
    content: "{{insured_name}}\n\n{{insured_address}}\n\nAdditional Insured(s): {{additional_insureds}}",
    type: "variable",
    order: 4,
  },
  {
    id: "sec-5",
    title: "Period",
    content: "{{period_text}}",
    type: "variable",
    order: 5,
  },
  {
    id: "sec-6",
    title: "Interests",
    content: "To indemnify the {{insured_or_reinsured}} in respect of a Policy or Policies issued by them to the Insured in respect of:\n\nHull War and Spares and Associated Perils\n\n1. Hull\nTo cover Aircraft in accordance with the Aircraft Schedule.\n\n2. Spares\nSpares (as defined in the Hull All Risk coverage, Spare Parts and Equipment) being owned by the Insured or owned by others for which the Insured irresponsible and has been required to insure them.\n\nAGAINST Loss or damage caused by War and Allied Risks as specified in paragraphs (a) and (c) to (g) of the War Exclusion and Allied Risks (Aviation) Clause AVN48B and in addition confiscation and extortion and hijack expenses.\n\nHowever, with respect to Aircraft Spare Parts, the coverage provided with respect to hazards as specified in paragraph (a) of Clause AVN 48B shall only apply as long as such property is in transit by air or water, as defined under \"Duration\" in the CL388 War Institute (Air Freight) Clause and \"Duration\" in the CL385 Institute (Cargo) Clause.",
    type: "fixed",
    order: 6,
  },
  {
    id: "sec-7",
    title: "Sums Reinsured",
    content: "Hull:\nAgreed Values according to Aircraft Schedule subject to a maximum Agreed Value of any Aircraft not exceeding 125% of Highest aircraft value (on top of aircraft value) subject to an overall maximum of {{hw_max_agreed_value}} or currency equivalent.\n\nSpares:\n{{spares_limit_text}}\n\nIn addition:\n\nExtortion and Hi-Jack Expenses Limit\n90% of 10% of the highest aircraft agreed value as stated in the schedule of aircraft any one loss and in the annual aggregate (warranted 10% of any payment uninsured).\n\nSection One Paragraph (e) of LSW555D:\nConfiscation, nationalisation, seizure, restraint, detention, appropriation, requisition for title or use by or under the order of any government (whether civil, military or de facto) or public or local authority.\n\nSubject to an aggregate limit of {{hw_max_agreed_value}} in any one annual period within Total Overall Policy Annual Aggregate\n\nTotal Overall Policy Annual Aggregate Limit:\n{{hw_max_agreed_value}}",
    type: "variable",
    order: 7,
  },
  {
    id: "sec-8",
    title: "Deductibles",
    content: "Nil.",
    type: "variable",
    order: 8,
  },
  {
    id: "sec-9",
    title: "Situation",
    content: "Worldwide subject to the following Geographic Areas Exclusion Clause LSW617J (Amended):\n\n1. Notwithstanding any provision to the contrary within this insurance it is agreed that this insurance excludes any loss, damage, cost or expense of whatsoever nature directly or indirectly caused by, resulting from or in connection with any of the following regardless of any other cause or event contributing concurrently or in any other sequence to the loss:\n(a) war, invasion, acts of foreign enemies, hostilities or warlike operations whether war be declared or not;\n(b) civil war, revolution, rebellion, insurrection, civil commotion assuming the proportions of or amounting to an uprising, military or usurped power;\n(c) confiscation, nationalisation, seizure, detention, appropriation, requisition for title or use by or under the order of any government whether civil, military or de facto;\n(d) Cuba, Iran, North Korea, Syria, the Crimea region of Ukraine, and the Donetsk and Luhansk regions of Ukraine;\n(e) Venezuela.\n\n2. However coverage pursuant to this Policy is granted:\n(a) overflight of and technical stops in territories listed in 1 above provided no passengers embark or disembark and no cargo loaded or discharged;\n(b) in the event of force majeure.\n\n3. Any excluded country may be covered by underwriters' individual agreement if required and subject to an additional premium, terms and conditions as underwriters may decide.\n\n16/09/25 LSW617J",
    type: "fixed",
    order: 9,
  },
  {
    id: "sec-10",
    title: "Reinsurance Conditions",
    content: "In addition to the terms and conditions set out in the Original Insurance terms, conditions and exclusions, this reinsurance is subject to the following:\n\nReinsurance Subscription and Claims Control Clause:\n\nThis is a reinsurance of the Reinsured and except as provided by paragraph 2 thereof, or as terms may otherwise be stated in this reinsurance, warranted the same coverage terms and conditions as those applying to the Reinsured as agreed at inception.\n\nSubject to the foregoing, it is a condition precedent to any liability under this reinsurance that:\n\na) No amendment to the terms or conditions or additions to or deletions from the original insurance shall be binding upon reinsurers hereon unless prior agreement has been obtained from the said reinsurers or except as may be otherwise provided for in this reinsurance.\n\nb) The Reinsured shall upon knowledge of any loss which may give rise to a claim under this reinsurance, advise the reinsurers thereof within a period of seven days (inadvertent omission of advice excepted);\n\nc) The Reinsured shall furnish the reinsurers with all information available respecting such loss or losses, and the reinsurers shall have the sole right to appoint adjusters, assessors, surveyors and/or lawyers and to control all negotiations, adjustments and settlements in connection with such loss or losses.\n\nAVN 41A (amended)\n\nSimultaneous Settlement (Reinsurance) Clause LPO 438.\n\nCancellation Clause as in the Original Policy.\n\nContracts (Rights of Third Parties) Act 1999 Exclusion Clause AVN 72.\n\nSanctions and Embargo Clause AVN 111(R).\n\nReinsurer Review Clause\n\nNotwithstanding anything in this reinsurance to the contrary, in the event that an individual subscribing reinsurer:\n\na) is subject to a security downgrade which at any time is below the Lockton approved security standards for Insurers (being 'BBB' as rated by S&P, and/or 'A minus' as rated by AM Best, and/or unencumbered policyholders' surplus as stipulated in said guidelines), or\n\nb) gives notice that they intend to withdraw from writing business in the aviation reinsurance market, then the reinsured shall have the option to reduce or terminate such reinsurer's participation, at that time.\n\nCleaned Text\nIf such reinsurer is the leading reinsurer the reinsured shall also have the option to change its status to a following reinsurer after selecting a new leading reinsurer.\n\nThe change of leader status option by the reinsured may also apply in the event that a leading reinsurer, or their parent company, is subject to a material change being a change of majority ownership or controlling interest. No reduction or termination of the leading reinsurer's participation shall apply in this event.\n\nAny change of leader shall be agreed by all other reinsurers.\n\nThe effective date of any reduction, termination or changed status shall be at the sole discretion of the Reinsured and shall be subject to advice in writing to the reinsurer, issued via {{broker_name}}, and shall not be prior to the date on which the reinsured issues such advice.\n\nThe premium due to the reinsurer as respects that part of their participation which is terminated shall be the earned premium or pro rata of premium (as applicable) up to the date of reduction or of termination. However, in the event that the incurred claims at the effective date of reduction or termination of a reinsurer's participation exceed the earned or pro rata premium (as applicable) due to the reinsurer, any return premium shall be subject to mutual agreement.\n\nAs used herein, 'S&P' refers to 'Standard & Poor's Insurance Rating (a division of the McGraw-Hill Companies)' and 'AM Best' refers to 'A.M. Best Company Inc' or successors of both.",
    type: "fixed",
    order: 10,
  },
  {
    id: "sec-11",
    title: "Conditions",
    content: "Original Insurance per Hull War Policy and Allied Risks LSW555D except as amended herein.\n\nIncluding confiscation, nationalisation, seizure, restraint, detention, appropriation, requisition for title or use by or under the order of the government(s) of aircraft registry (whether civil, military or de facto) or public or local authority - exclusion (b) of LSW555D deleted.\n\nCancellation Revision and Automatic Termination provisions per Section Five of LSW 555D amended to provide that automatic termination only applies in respect of War perils (i.e. as paragraph (a) of Section One of LSW 555D).\n\nIn the event of cancellation by Insurers or automatic termination in accordance with Provisions 1(c) and 2 of Section Five of LSW 555D a pro rata return of premium shall be payable to the Insured.\n\nAdditions to and deletions from the Schedule of Aircraft, substitutions of Aircraft and Agreed Value changes are automatically covered hereunder subject to not exceeding a maximum Agreed Value of 125% of the highest aircraft agreed value as stated in the schedule of aircraft subject always to an overall maximum of {{hw_max_agreed_value}} (or currency equivalent at date of attachment) any one Aircraft, with declaration to Insurers monthly and pro rata premium adjustment at expiry.\n\nSupplementary Payments Clause (AVN76 (amended)) – Provided always that Insurers' liability shall not exceed 15% of the maximum declared aircraft agreed value as detailed under the Schedule of Aircraft any one incident over all paragraphs insured which is included within the aggregate limit applicable to this Insurance and not in addition.\n\nIn the event of the Period of Insurance being greater than twelve (12) months the aggregate limit of liability for the total period shall be and shall in no event exceed the annual aggregate limits stated in this Insurance, plus pro rata of such aggregate limits, of which not more than the annual aggregate limit set forth in this Insurance shall be applicable for either (i) the first twelve months, or (ii) for the remainder of the Period of Insurance respectively.\n\nSoftware Affirmation Clause LMA 5450\n\nLeased Engines Clause\nWhen leased engines / components (other than as covered under this Insurance) are installed on an Aircraft insured hereunder, the agreed value of such Aircraft shall be automatically increased, at pro rata additional premium, by the amount required to be insured under the lease agreement in respect of such engines / components for the period that such engines / components are installed on the Aircraft. Where such amount is not specified in the lease agreement, this shall be the fair market value of such engines / components as agreed between the Insurers and the owners of the engines / components at the time of the loss. A maximum Agreed Value of 125% of the highest aircraft agreed value as stated in the schedule of aircraft subject always to an overall maximum of {{hw_max_agreed_value}} (or currency equivalent at date of attachment) any one Aircraft, with declaration to Insurers monthly and pro rata premium adjustment at expiry.\n\nBenefit of salvage of the removed engine / component to the Insurers in the event that the Aircraft is the subject of a claim adjustable on the basis of a total loss.\n\nInsurers hereon agree to automatically include coverage for contractual provisions including hold harmless agreements, indemnity agreements, waivers of subrogation, additional Insureds, breach of warranty, loss payees, leased spares and equipment agreed values arising in the normal course of the Insured's business or operations, including all such contractual provisions and evidence of insurance executed prior to the inception of this Insurance. An additional premium of USD 100 is deemed to be charged on each agreement where breach of warranty is required, including in respect of Airline Finance/Lease Contract Endorsement AVN67B/C (Hull War), receipt of which is hereby acknowledged at the inception of this Insurance or subsequent effective date of such agreement.\n\nOther contractual agreements outside the normal course of the Insured's business or operations are subject to the agreement of the Insurers prior to the effective date of the contract(s).\n\nIn the event that the Insured or their employees are rendered by any peril covered by this Insurance unable to protect the Aircraft from damage or wear, tear or gradual deterioration or are prevented from performing any service to any part of the Aircraft made necessary by the passage of time, this Insurance shall cover all costs and expenses necessarily incurred to reinstate the Aircraft to its condition immediately prior to exposure to such perils.\n\nIn respect of parts, engines or sub-assemblies detached from any Aircraft for any purpose, including repair or overhaul, and not replaced, coverage provided hereunder shall continue on an Agreed Value basis for full replacement value, including whilst such parts, engines or sub-assemblies are in transit.",
    type: "fixed",
    order: 11,
  },
  {
    id: "sec-12",
    title: "Schedule of Aircraft",
    content: "As attached.",
    type: "variable",
    order: 12,
  },
  {
    id: "sec-13",
    title: "Express Warranties",
    content: "None other than as may exist in the Original Insurance or as agreed with the Leading Reinsurer from time to time.",
    type: "fixed",
    order: 13,
  },
  {
    id: "sec-14",
    title: "Conditions Precedent",
    content: "None other than as may exist in the Original Insurance or as agreed with the Leading Reinsurer from time to time.",
    type: "fixed",
    order: 14,
  },
  {
    id: "sec-15",
    title: "Subjectivities",
    content: "None",
    type: "variable",
    order: 15,
  },
  {
    id: "sec-16",
    title: "Choice of Law & Jurisdiction",
    content: "This Reinsurance shall be governed by and construed in accordance with the law of the Reinsured's country of domicile and each party agrees to submit to the exclusive jurisdiction of the courts of the Reinsured's country of domicile in any dispute arising hereunder.",
    type: "variable",
    order: 16,
  },
  {
    id: "sec-17",
    title: "Premium",
    content: "As attached.",
    type: "variable",
    order: 17,
  },
  {
    id: "sec-18",
    title: "Premium Payment Terms",
    content: "Payable in equal quarterly instalments to reinsurers via {{broker_name}} subject to the Premium Payment Clause AVN6A (paragraph 2 deleted)\n{{quarterly_instalment_dates}}\nAppointed broker: {{broker_name}}.",
    type: "variable",
    order: 18,
  },
  {
    id: "sec-19",
    title: "Taxes Payable by Reinsured",
    content: "As attached.",
    type: "variable",
    order: 19,
  },
  {
    id: "sec-20",
    title: "Taxes Payable by Reinsurer",
    content: "As attached.",
    type: "variable",
    order: 20,
  },
  {
    id: "sec-21",
    title: "Reinsurer Contract Documentation",
    content: "This document details the contract entered into by the reinsurer and constitutes the contract document.\n\nContract change documentation:\nThe contract change document(s) signed by reinsurer shall form the evidence of the changes agreed.\n\nReinsured are advised that if any terms, clauses or conditions are unclear they should contact {{broker_name}} immediately.",
    type: "fixed",
    order: 21,
  },
  {
    id: "sec-22",
    title: "Several Liability Notice Insurance",
    content: "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001",
    type: "fixed",
    order: 22,
  },
  {
    id: "sec-23",
    title: "Order Hereon",
    content: "{{order_hereon_text}}",
    type: "variable",
    order: 23,
  },
  {
    id: "sec-23b",
    title: "Claims Information",
    content: "{{product_name}} claims advised in the last 5 years:\n\n{{claims_history_text}}",
    type: "variable",
    order: 24,
  },
  {
    id: "sec-24",
    title: "Aircraft Schedule (Attachment)",
    content: "AIRCRAFT SCHEDULE\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 25,
  },
  {
    id: "sec-25",
    title: "Aircraft Uses (Attachment)",
    content: "AIRCRAFT USES\n\n{{aircraft_uses_text}}",
    type: "variable",
    order: 26,
  },
  {
    id: "sec-26",
    title: "Geographical Limits",
    content: "{{geographical_limits_text}}",
    type: "variable",
    order: 27,
  },
  {
    id: "sec-27",
    title: "Premium Breakdown (Attachment)",
    content: "PREMIUM BREAKDOWN\n(per annum & pro rata for the period, as applicable)\n\n{{premium_breakdown_text}}",
    type: "variable",
    order: 28,
  },
  {
    id: "sec-28",
    title: "Notification of Security",
    content: "NOTIFICATION OF SECURITY\n\nREINSURED: {{reinsured_name}}\nINSURED: {{insured_name}}\nUNIQUE MARKET REFERENCE: {{umr}}\nPERIOD: Subject Approval, No Risk\nTYPE: AVIATION HULL AND SPARES WAR AND ASSOCIATED PERILS {{placement_type_upper}}\n\nSubject to the LSW 1001 clause the final basis of Security is detailed as follows:\n\nOrder hereon: {{order_hereon_text}}\nDeclaration under delegated underwriting contract: {{broker_reference}}\n\nEffected with:\n\n{{underwriter_table_text}}\n\n{{quoting_underwriter}} {{quote_date}}",
    type: "variable",
    order: 29,
  },
];

// ── PERSONAL ACCIDENT (PA) INSURANCE template — Flight Risk / On-Duty ─────────
// Aircraft-based: covers crew and/or passengers during flight operations or on-duty periods.
// Interests & Sums reference per-seat limits and per-aircraft aggregates.
const getDefaultPAInsuranceSlipSections = (): SlipWordingSection[] => [
  {
    id: "sec-1",
    title: "Type of Insurance",
    content: "AVIATION PERSONAL ACCIDENT {{placement_type_upper}}",
    type: "variable",
    order: 1,
  },
  {
    id: "sec-2",
    title: "Unique Market Reference",
    content: "{{umr}}",
    type: "variable",
    order: 2,
  },
  {
    id: "sec-2b",
    title: "Attaching to Facility Reference Number",
    content: "{{broker_reference}}",
    type: "variable",
    order: 2.5,
  },
  {
    id: "sec-4",
    title: "Insured",
    content: "{{insured_name}}\n\n{{insured_address}}\n\nAdditional Insured(s): {{additional_insureds}}",
    type: "variable",
    order: 4,
  },
  {
    id: "sec-5",
    title: "Period",
    content: "{{period_text}}",
    type: "variable",
    order: 5,
  },
  {
    id: "sec-6",
    title: "Interests",
    content: "Personal Accident cover in respect of:\n\n  Crew Personal Accident:\n  Bodily injury to or death of crew members arising out of or in connection with the operation, maintenance or use of the Aircraft as per the Schedule of Aircraft.\n\n  Passenger Personal Accident:\n  Bodily injury to or death of fare-paying and/or non-fare-paying passengers whilst boarding, on board or alighting from the Aircraft as per the Schedule of Aircraft.",
    type: "fixed",
    order: 6,
  },
  {
    id: "sec-7",
    title: "Sums Insured",
    content: "Crew Personal Accident:\n  As per each aircraft under Aircraft Schedule — limit per seat per crew member as scheduled.\n\nPassenger Personal Accident:\n  As per each aircraft under Aircraft Schedule — limit per seat per passenger as scheduled.\n\nMaximum Aggregate Limit per Aircraft:\n  As per the Schedule of Aircraft.\n\nOverall Policy Annual Aggregate Limit:\n  {{pa_overall_aggregate}}",
    type: "variable",
    order: 7,
  },
  {
    id: "sec-7b",
    title: "Benefits",
    content: "Accidental Death: 100% of Sum Insured\nPermanent Total Disablement: 100% of Sum Insured\nTemporary Total Disablement: As agreed\nMedical Expenses: As agreed\n\nAs more fully defined in the Policy wording.",
    type: "fixed",
    order: 7.5,
  },
  {
    id: "sec-8",
    title: "Deductibles",
    content: "Nil, unless otherwise specified per the Schedule of Aircraft.",
    type: "variable",
    order: 8,
  },
  {
    id: "sec-9",
    title: "Situation",
    content: "Worldwide subject to the following Geographic Areas Exclusion Clause LSW617J (Amended):\n\n1. Notwithstanding any provision to the contrary within this insurance it is agreed that this insurance excludes any loss, damage, cost or expense of whatsoever nature directly or indirectly caused by, resulting from or in connection with war, invasion, acts of foreign enemies, hostilities or warlike operations (whether war be declared or not), civil war, revolution, rebellion, insurrection, civil commotion assuming the proportions of or amounting to an uprising, military or usurped power, or confiscation, nationalisation, seizure, detention, appropriation, requisition for title or use by or under the order of any government (whether civil, military or de facto) in respect of the following territories:\n\n(a) Algeria; Burundi; Far North Region of Cameroon; Central African Republic; Democratic Republic of Congo; Ethiopia; Kenya; Mali; Mauritania; Nigeria; Somalia; The Republic of Sudan; South Sudan.\n(b) Haiti.\n(c) Afghanistan; Jammu & Kashmir; Myanmar; North Korea; Pakistan.\n(d) Abkhazia; Nagorno-Karabakh; The Republic of Belarus; The Russian Federation; South Ossetia; Ukraine.\n(e) Iran; Iraq; Israel; Lebanon; Libya; North Sinai Province of Egypt; Syria; Yemen.\n\n2. However coverage pursuant to this Policy is granted:\n(a) overflight of and technical stops in territories listed in 1 above provided no passengers embark or disembark and no cargo loaded or discharged;\n(b) in the event of force majeure.\n\n3. Any excluded country may be covered by underwriters' individual agreement if required and subject to an additional premium, terms and conditions as underwriters may decide.\n\n16/09/25 LSW617J",
    type: "fixed",
    order: 9,
  },
  {
    id: "sec-11",
    title: "Conditions",
    content: "London Aircraft Insurance Policy AVN1C (no proposal form to be completed)\n\nPersonal Accident Extension Clause — AVN60A\n\nNuclear Risks Exclusion Clause — AVN38B\nNoise and Pollution and Other Perils Exclusion — AVN46B\nWar, Hi-Jacking and Other Perils Exclusion Clause — AVN48B\n\nAdditions and Deletions (Combined) — AVN19A\n\n\"Insured\" definition — Two Way Cross Liability — LSW715\n\n30 days cancellation notice — AVN115\n\nSoftware Affirmation Clause — LMA5450\nElectronic Data Event Liability Exclusion — LIIBA 001\nFraudulent Claims — AVN100A\nSanctions and Embargo Clause — AVN111\n\nPre-Existing Conditions Exclusion:\nThis insurance does not cover any claim arising from a pre-existing medical condition unless declared to and accepted by Insurers.\n\nSuicide and Self-Inflicted Injury Exclusion:\nThis insurance does not cover death or disablement resulting from suicide, attempted suicide or intentional self-inflicted injury.\n\nAlcohol and Drugs Exclusion:\nThis insurance does not cover any claim arising whilst the Insured Person is under the influence of alcohol or non-prescribed drugs.",
    type: "fixed",
    order: 11,
  },
  {
    id: "sec-12",
    title: "Schedule of Aircraft",
    content: "As attached.\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 12,
  },
  {
    id: "sec-13",
    title: "Express Warranties",
    content: "None other than as may exist in the Policy or as agreed with the Leading Insurer from time to time.",
    type: "fixed",
    order: 13,
  },
  {
    id: "sec-14",
    title: "Conditions Precedent",
    content: "None other than as may exist in the Policy or as agreed with the Leading Insurer from time to time.",
    type: "fixed",
    order: 14,
  },
  {
    id: "sec-15",
    title: "Subjectivities",
    content: "None",
    type: "variable",
    order: 15,
  },
  {
    id: "sec-16",
    title: "Choice of Law & Jurisdiction",
    content: "Insured's country of domicile.\n\nAny dispute arising out of or in connection with this insurance shall be subject to the jurisdiction of the courts of the Insured's country of domicile.",
    type: "variable",
    order: 16,
  },
  {
    id: "sec-17",
    title: "Premium",
    content: "As attached.\n\n{{premium_amount}}",
    type: "variable",
    order: 17,
  },
  {
    id: "sec-18",
    title: "Premium Payment Terms",
    content: "Payable in equal quarterly instalments to insurers via {{broker_name}} subject to the Premium Payment Clause AVNGA (paragraph 2 deleted)\n{{quarterly_instalment_dates}}\nAppointed broker: {{broker_name}}.",
    type: "variable",
    order: 18,
  },
  {
    id: "sec-19",
    title: "Taxes Payable by Insured",
    content: "As attached.",
    type: "variable",
    order: 19,
  },
  {
    id: "sec-20",
    title: "Taxes Payable by Insurer",
    content: "As attached.",
    type: "variable",
    order: 20,
  },
  {
    id: "sec-21",
    title: "Insurer Contract Documentation",
    content: "Contract certainty to be achieved prior to inception or within 30 days of binding, whichever is the later.\n\nAny changes to the terms of this policy shall be documented by endorsement issued by the broker and agreed by the Leading Insurer.\n\nInsured advisory note to be provided within 7 days of binding.",
    type: "fixed",
    order: 21,
  },
  {
    id: "sec-22",
    title: "Several Liability Notice Insurance",
    content: "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001",
    type: "fixed",
    order: 22,
  },
  {
    id: "sec-23",
    title: "Order Hereon",
    content: "{{order_hereon_text}}",
    type: "variable",
    order: 23,
  },
  {
    id: "sec-23b",
    title: "Claims Information",
    content: "{{product_name}} claims advised in the last 5 years:\n\n{{claims_history_text}}",
    type: "variable",
    order: 24,
  },
  {
    id: "sec-24",
    title: "Aircraft Schedule (Attachment)",
    content: "AIRCRAFT SCHEDULE\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 25,
  },
  {
    id: "sec-27",
    title: "Premium Breakdown (Attachment)",
    content: "PREMIUM BREAKDOWN\n(per annum & pro rata for the period, as applicable)\n\n{{premium_breakdown_text}}",
    type: "variable",
    order: 28,
  },
  {
    id: "sec-28",
    title: "Notification of Security",
    content: "NOTIFICATION OF SECURITY\n\nINSURED: {{insured_name}}\nUNIQUE MARKET REFERENCE: {{umr}}\nPERIOD: Subject Approval, No Risk\nTYPE: AVIATION PERSONAL ACCIDENT {{placement_type_upper}}\n\nSubject to the LSW 1001 clause the final basis of Security is detailed as follows:\n\nOrder hereon: {{order_hereon_text}}\nDeclaration under delegated underwriting contract: {{broker_reference}}\n\nEffected with:\n\n{{underwriter_table_text}}\n\n{{quoting_underwriter}} {{quote_date}}",
    type: "variable",
    order: 29,
  },
];

// ── PERSONAL ACCIDENT (PA) REINSURANCE template — Flight Risk / On-Duty ───────
// Reinsurance wrapper around the aircraft-based PA template.
const getDefaultPAReinsuranceSlipSections = (): SlipWordingSection[] => [
  {
    id: "sec-1",
    title: "Type of Insurance",
    content: "AVIATION PERSONAL ACCIDENT {{placement_type_upper}}",
    type: "variable",
    order: 1,
  },
  {
    id: "sec-2",
    title: "Unique Market Reference",
    content: "{{umr}}",
    type: "variable",
    order: 2,
  },
  {
    id: "sec-2b",
    title: "Attaching to Facility Reference Number",
    content: "{{broker_reference}}",
    type: "variable",
    order: 2.5,
  },
  {
    id: "sec-3",
    title: "Reinsured",
    content: "{{reinsured_name}}\n\n{{reinsured_address}}",
    type: "variable",
    order: 3,
  },
  {
    id: "sec-4",
    title: "Insured",
    content: "{{insured_name}}\n\n{{insured_address}}\n\nAdditional Insured(s): {{additional_insureds}}",
    type: "variable",
    order: 4,
  },
  {
    id: "sec-5",
    title: "Period",
    content: "{{period_text}}",
    type: "variable",
    order: 5,
  },
  {
    id: "sec-6",
    title: "Interests",
    content: "To indemnify the {{insured_or_reinsured}} in respect of a Policy or Policies issued by them to the Insured in respect of:\n\nPersonal Accident cover in respect of:\n\n  Crew Personal Accident:\n  Bodily injury to or death of crew members arising out of or in connection with the operation, maintenance or use of the Aircraft as per the Schedule of Aircraft.\n\n  Passenger Personal Accident:\n  Bodily injury to or death of fare-paying and/or non-fare-paying passengers whilst boarding, on board or alighting from the Aircraft as per the Schedule of Aircraft.",
    type: "fixed",
    order: 6,
  },
  {
    id: "sec-7",
    title: "Sums Reinsured",
    content: "Crew Personal Accident:\n  As per each aircraft under Aircraft Schedule — limit per seat per crew member as scheduled.\n\nPassenger Personal Accident:\n  As per each aircraft under Aircraft Schedule — limit per seat per passenger as scheduled.\n\nMaximum Aggregate Limit per Aircraft:\n  As per the Schedule of Aircraft.\n\nOverall Policy Annual Aggregate Limit:\n  {{pa_overall_aggregate}}",
    type: "variable",
    order: 7,
  },
  {
    id: "sec-7b",
    title: "Benefits",
    content: "Accidental Death: 100% of Sum Insured\nPermanent Total Disablement: 100% of Sum Insured\nTemporary Total Disablement: As agreed\nMedical Expenses: As agreed\n\nAs more fully defined in the Policy wording.",
    type: "fixed",
    order: 7.5,
  },
  {
    id: "sec-8",
    title: "Deductibles",
    content: "Nil, unless otherwise specified per the Schedule of Aircraft.",
    type: "variable",
    order: 8,
  },
  {
    id: "sec-9",
    title: "Situation",
    content: "Worldwide subject to the following Geographic Areas Exclusion Clause LSW617J (Amended):\n\n1. Notwithstanding any provision to the contrary within this insurance it is agreed that this insurance excludes any loss, damage, cost or expense of whatsoever nature directly or indirectly caused by, resulting from or in connection with war, invasion, acts of foreign enemies, hostilities or warlike operations (whether war be declared or not), civil war, revolution, rebellion, insurrection, civil commotion assuming the proportions of or amounting to an uprising, military or usurped power, or confiscation, nationalisation, seizure, detention, appropriation, requisition for title or use by or under the order of any government (whether civil, military or de facto) in respect of the following territories:\n\n(a) Algeria; Burundi; Far North Region of Cameroon; Central African Republic; Democratic Republic of Congo; Ethiopia; Kenya; Mali; Mauritania; Nigeria; Somalia; The Republic of Sudan; South Sudan.\n(b) Haiti.\n(c) Afghanistan; Jammu & Kashmir; Myanmar; North Korea; Pakistan.\n(d) Abkhazia; Nagorno-Karabakh; The Republic of Belarus; The Russian Federation; South Ossetia; Ukraine.\n(e) Iran; Iraq; Israel; Lebanon; Libya; North Sinai Province of Egypt; Syria; Yemen.\n\n2. However coverage pursuant to this Policy is granted:\n(a) overflight of and technical stops in territories listed in 1 above provided no passengers embark or disembark and no cargo loaded or discharged;\n(b) in the event of force majeure.\n\n3. Any excluded country may be covered by underwriters' individual agreement if required and subject to an additional premium, terms and conditions as underwriters may decide.\n\n16/09/25 LSW617J",
    type: "fixed",
    order: 9,
  },
  {
    id: "sec-10",
    title: "Reinsurance Conditions",
    content: "Reinsurance Subscription and Claims Control Clause:\n\n1. Leading Reinsurer shall be responsible for making all decisions in connection with the handling of claims under this Contract.\n2. All claims settlements by the Leading Reinsurer shall be binding on all Reinsurers subscribing hereto.\n3. The Reinsured shall:\n   (a) give prompt notice to the Leading Reinsurer of any occurrence which may give rise to a claim;\n   (b) provide the Leading Reinsurer with all information and assistance as may be required;\n   (c) take all reasonable steps to mitigate any loss.\n\nAVN41A (Amended) — Leading Reinsurer Agreement\n\nContracts (Rights of Third Parties) Act 1999 — AVN72\n\nSimultaneous Settlement (Reinsurance) Clause — LPO438\n\nReinsurance Cancellation Clause AVN112 (30 days)\n\nCut-Through Clause\n\nSanctions and Embargo Clause — AVN111(R)\n\nElectronic Data Event Liability Exclusion — LIIBA 001 12.09.2019\n\nReinsurer Review Clause:\nDefinitions: S&P rating of A- or above; AM Best rating of A- or above.",
    type: "fixed",
    order: 10,
  },
  {
    id: "sec-11",
    title: "Conditions",
    content: "Original Insurance per:\n\nLondon Aircraft Insurance Policy AVN1C (no proposal form to be completed)\n\nPersonal Accident Extension Clause — AVN60A\n\nNuclear Risks Exclusion Clause — AVN38B\nNoise and Pollution and Other Perils Exclusion — AVN46B\nWar, Hi-Jacking and Other Perils Exclusion Clause — AVN48B\n\nAdditions and Deletions (Combined) — AVN19A\n\n\"Insured\" definition — Two Way Cross Liability — LSW715\n\n30 days cancellation notice — AVN115\n\nSoftware Affirmation Clause — LMA5450\nElectronic Data Event Liability Exclusion — LIIBA 001\nFraudulent Claims — AVN100A\nSanctions and Embargo Clause — AVN111\n\nPre-Existing Conditions Exclusion\nSuicide and Self-Inflicted Injury Exclusion\nAlcohol and Drugs Exclusion",
    type: "fixed",
    order: 11,
  },
  {
    id: "sec-12",
    title: "Schedule of Aircraft",
    content: "As attached.\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 12,
  },
  {
    id: "sec-13",
    title: "Express Warranties",
    content: "None other than as may exist in the Original Insurance or as agreed with the Leading Reinsurer from time to time.",
    type: "fixed",
    order: 13,
  },
  {
    id: "sec-14",
    title: "Conditions Precedent",
    content: "None other than as may exist in the Original Insurance or as agreed with the Leading Reinsurer from time to time.",
    type: "fixed",
    order: 14,
  },
  {
    id: "sec-15",
    title: "Subjectivities",
    content: "None",
    type: "variable",
    order: 15,
  },
  {
    id: "sec-16",
    title: "Choice of Law & Jurisdiction",
    content: "Reinsured's country of domicile.\n\nAny dispute arising out of or in connection with this reinsurance shall be subject to the jurisdiction of the courts of the Reinsured's country of domicile.",
    type: "variable",
    order: 16,
  },
  {
    id: "sec-17",
    title: "Premium",
    content: "As attached.\n\n{{premium_amount}}",
    type: "variable",
    order: 17,
  },
  {
    id: "sec-18",
    title: "Premium Payment Terms",
    content: "Payable in equal quarterly instalments to reinsurers via {{broker_name}} subject to the Premium Payment Clause AVNGA (paragraph 2 deleted)\n{{quarterly_instalment_dates}}\nAppointed broker: {{broker_name}}.",
    type: "variable",
    order: 18,
  },
  {
    id: "sec-19",
    title: "Taxes Payable by Reinsured",
    content: "As attached.",
    type: "variable",
    order: 19,
  },
  {
    id: "sec-20",
    title: "Taxes Payable by Reinsurer",
    content: "As attached.",
    type: "variable",
    order: 20,
  },
  {
    id: "sec-21",
    title: "Reinsurer Contract Documentation",
    content: "Contract certainty to be achieved prior to inception or within 30 days of binding, whichever is the later.\n\nAny changes to the terms of this contract shall be documented by endorsement issued by the broker and agreed by the Leading Reinsurer.\n\nReinsured advisory note to be provided within 7 days of binding.",
    type: "fixed",
    order: 21,
  },
  {
    id: "sec-22",
    title: "Several Liability Notice Insurance",
    content: "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001",
    type: "fixed",
    order: 22,
  },
  {
    id: "sec-23",
    title: "Order Hereon",
    content: "{{order_hereon_text}}",
    type: "variable",
    order: 23,
  },
  {
    id: "sec-23b",
    title: "Claims Information",
    content: "{{product_name}} claims advised in the last 5 years:\n\n{{claims_history_text}}",
    type: "variable",
    order: 24,
  },
  {
    id: "sec-24",
    title: "Aircraft Schedule (Attachment)",
    content: "AIRCRAFT SCHEDULE\n\n{{fleet_schedule_text}}",
    type: "variable",
    order: 25,
  },
  {
    id: "sec-27",
    title: "Premium Breakdown (Attachment)",
    content: "PREMIUM BREAKDOWN\n(per annum & pro rata for the period, as applicable)\n\n{{premium_breakdown_text}}",
    type: "variable",
    order: 28,
  },
  {
    id: "sec-28",
    title: "Notification of Security",
    content: "NOTIFICATION OF SECURITY\n\nREINSURED: {{reinsured_name}}\nINSURED: {{insured_name}}\nUNIQUE MARKET REFERENCE: {{umr}}\nPERIOD: Subject Approval, No Risk\nTYPE: AVIATION PERSONAL ACCIDENT {{placement_type_upper}}\n\nSubject to the LSW 1001 clause the final basis of Security is detailed as follows:\n\nOrder hereon: {{order_hereon_text}}\nDeclaration under delegated underwriting contract: {{broker_reference}}\n\nEffected with:\n\n{{underwriter_table_text}}\n\n{{quoting_underwriter}} {{quote_date}}",
    type: "variable",
    order: 29,
  },
];

// ── PERSONAL ACCIDENT 24-HOUR INSURANCE template ──────────────────────────────
// Person-based (like LOL): covers named crew members 24 hours a day, not tied to aircraft.
// No Schedule of Aircraft — replaced with Schedule of Insured Persons.
const getDefaultPA24HInsuranceSlipSections = (): SlipWordingSection[] => [
  {
    id: "sec-1",
    title: "Type of Insurance",
    content: "AVIATION PERSONAL ACCIDENT (24-HOUR) {{placement_type_upper}}",
    type: "variable",
    order: 1,
  },
  {
    id: "sec-2",
    title: "Unique Market Reference",
    content: "{{umr}}",
    type: "variable",
    order: 2,
  },
  {
    id: "sec-2b",
    title: "Attaching to Facility Reference Number",
    content: "{{broker_reference}}",
    type: "variable",
    order: 2.5,
  },
  {
    id: "sec-4",
    title: "Insured",
    content: "{{insured_name}}\n\n{{insured_address}}\n\nAdditional Insured(s): {{additional_insureds}}",
    type: "variable",
    order: 4,
  },
  {
    id: "sec-5",
    title: "Period",
    content: "{{period_text}}",
    type: "variable",
    order: 5,
  },
  {
    id: "sec-6",
    title: "Interests",
    content: "Personal Accident cover (24-Hour basis) in respect of:\n\nBodily injury to or death of the Insured Persons named in the Schedule of Insured Persons, howsoever caused, 24 hours a day, 7 days a week, whether or not arising out of or in connection with aviation activities.\n\nThis cover applies worldwide and is not restricted to periods of flight, duty or employment.",
    type: "fixed",
    order: 6,
  },
  {
    id: "sec-7",
    title: "Sums Insured",
    content: "As per the Schedule of Insured Persons.\n\nMaximum Sum Insured per Insured Person:\n  {{pa_max_sum_per_person}}\n\nOverall Policy Annual Aggregate Limit:\n  {{pa_overall_aggregate}}",
    type: "variable",
    order: 7,
  },
  {
    id: "sec-7b",
    title: "Benefits",
    content: "Accidental Death: 100% of Sum Insured\nPermanent Total Disablement: 100% of Sum Insured\nTemporary Total Disablement: As agreed (weekly benefit)\nMedical Expenses: As agreed\n\nAs more fully defined in the Policy wording.",
    type: "fixed",
    order: 7.5,
  },
  {
    id: "sec-8",
    title: "Deductibles",
    content: "Nil.",
    type: "variable",
    order: 8,
  },
  {
    id: "sec-9",
    title: "Situation",
    content: "Worldwide — 24-hour cover.\n\nSubject to Sanctions and Embargo Clause — AVN111.",
    type: "fixed",
    order: 9,
  },
  {
    id: "sec-11",
    title: "Conditions",
    content: "Aviation Personal Accident Policy (24-Hour basis)\n\nNuclear Risks Exclusion Clause — AVN38B\nWar, Hi-Jacking and Other Perils Exclusion Clause — AVN48B\n\n\"Insured\" definition — Two Way Cross Liability — LSW715\n\n30 days cancellation notice — AVN115\n\nSoftware Affirmation Clause — LMA5450\nElectronic Data Event Liability Exclusion — LIIBA 001\nFraudulent Claims — AVN100A\nSanctions and Embargo Clause — AVN111\n\nPre-Existing Conditions Exclusion:\nThis insurance does not cover any claim arising from a pre-existing medical condition unless declared to and accepted by Insurers.\n\nSuicide and Self-Inflicted Injury Exclusion:\nThis insurance does not cover death or disablement resulting from suicide, attempted suicide or intentional self-inflicted injury.\n\nAlcohol and Drugs Exclusion:\nThis insurance does not cover any claim arising whilst the Insured Person is under the influence of alcohol or non-prescribed drugs.\n\nAge Limitations:\nCover ceases upon the Insured Person attaining the age of 70 years, unless specifically agreed by Insurers.\n\nMedical Examination:\nInsurers reserve the right to require a medical examination of any Insured Person at their own expense.",
    type: "fixed",
    order: 11,
  },
  {
    id: "sec-12",
    title: "Schedule of Insured Persons",
    content: "As attached.\n\n{{crew_schedule_text}}",
    type: "variable",
    order: 12,
  },
  {
    id: "sec-13",
    title: "Express Warranties",
    content: "None other than as may exist in the Policy or as agreed with the Leading Insurer from time to time.",
    type: "fixed",
    order: 13,
  },
  {
    id: "sec-14",
    title: "Conditions Precedent",
    content: "None other than as may exist in the Policy or as agreed with the Leading Insurer from time to time.",
    type: "fixed",
    order: 14,
  },
  {
    id: "sec-15",
    title: "Subjectivities",
    content: "None",
    type: "variable",
    order: 15,
  },
  {
    id: "sec-16",
    title: "Choice of Law & Jurisdiction",
    content: "Insured's country of domicile.\n\nAny dispute arising out of or in connection with this insurance shall be subject to the jurisdiction of the courts of the Insured's country of domicile.",
    type: "variable",
    order: 16,
  },
  {
    id: "sec-17",
    title: "Premium",
    content: "As attached.\n\n{{premium_amount}}",
    type: "variable",
    order: 17,
  },
  {
    id: "sec-18",
    title: "Premium Payment Terms",
    content: "Payable in equal quarterly instalments to insurers via {{broker_name}} subject to the Premium Payment Clause AVNGA (paragraph 2 deleted)\n{{quarterly_instalment_dates}}\nAppointed broker: {{broker_name}}.",
    type: "variable",
    order: 18,
  },
  {
    id: "sec-19",
    title: "Taxes Payable by Insured",
    content: "As attached.",
    type: "variable",
    order: 19,
  },
  {
    id: "sec-20",
    title: "Taxes Payable by Insurer",
    content: "As attached.",
    type: "variable",
    order: 20,
  },
  {
    id: "sec-21",
    title: "Insurer Contract Documentation",
    content: "Contract certainty to be achieved prior to inception or within 30 days of binding, whichever is the later.\n\nAny changes to the terms of this policy shall be documented by endorsement issued by the broker and agreed by the Leading Insurer.\n\nInsured advisory note to be provided within 7 days of binding.",
    type: "fixed",
    order: 21,
  },
  {
    id: "sec-22",
    title: "Several Liability Notice Insurance",
    content: "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001",
    type: "fixed",
    order: 22,
  },
  {
    id: "sec-23",
    title: "Order Hereon",
    content: "{{order_hereon_text}}",
    type: "variable",
    order: 23,
  },
  {
    id: "sec-23b",
    title: "Claims Information",
    content: "{{product_name}} claims advised in the last 5 years:\n\n{{claims_history_text}}",
    type: "variable",
    order: 24,
  },
  {
    id: "sec-24",
    title: "Schedule of Insured Persons (Attachment)",
    content: "SCHEDULE OF INSURED PERSONS\n\n{{crew_schedule_text}}",
    type: "variable",
    order: 25,
  },
  {
    id: "sec-27",
    title: "Premium Breakdown (Attachment)",
    content: "PREMIUM BREAKDOWN\n(per annum & pro rata for the period, as applicable)\n\n{{premium_breakdown_text}}",
    type: "variable",
    order: 28,
  },
  {
    id: "sec-28",
    title: "Notification of Security",
    content: "NOTIFICATION OF SECURITY\n\nINSURED: {{insured_name}}\nUNIQUE MARKET REFERENCE: {{umr}}\nPERIOD: Subject Approval, No Risk\nTYPE: AVIATION PERSONAL ACCIDENT (24-HOUR) {{placement_type_upper}}\n\nSubject to the LSW 1001 clause the final basis of Security is detailed as follows:\n\nOrder hereon: {{order_hereon_text}}\nDeclaration under delegated underwriting contract: {{broker_reference}}\n\nEffected with:\n\n{{underwriter_table_text}}\n\n{{quoting_underwriter}} {{quote_date}}",
    type: "variable",
    order: 29,
  },
];

// ── PERSONAL ACCIDENT 24-HOUR REINSURANCE template ────────────────────────────
// Reinsurance wrapper around the 24-Hour person-based PA template.
const getDefaultPA24HReinsuranceSlipSections = (): SlipWordingSection[] => [
  {
    id: "sec-1",
    title: "Type of Insurance",
    content: "AVIATION PERSONAL ACCIDENT (24-HOUR) {{placement_type_upper}}",
    type: "variable",
    order: 1,
  },
  {
    id: "sec-2",
    title: "Unique Market Reference",
    content: "{{umr}}",
    type: "variable",
    order: 2,
  },
  {
    id: "sec-2b",
    title: "Attaching to Facility Reference Number",
    content: "{{broker_reference}}",
    type: "variable",
    order: 2.5,
  },
  {
    id: "sec-3",
    title: "Reinsured",
    content: "{{reinsured_name}}\n\n{{reinsured_address}}",
    type: "variable",
    order: 3,
  },
  {
    id: "sec-4",
    title: "Insured",
    content: "{{insured_name}}\n\n{{insured_address}}\n\nAdditional Insured(s): {{additional_insureds}}",
    type: "variable",
    order: 4,
  },
  {
    id: "sec-5",
    title: "Period",
    content: "{{period_text}}",
    type: "variable",
    order: 5,
  },
  {
    id: "sec-6",
    title: "Interests",
    content: "To indemnify the {{insured_or_reinsured}} in respect of a Policy or Policies issued by them to the Insured in respect of:\n\nPersonal Accident cover (24-Hour basis) in respect of:\n\nBodily injury to or death of the Insured Persons named in the Schedule of Insured Persons, howsoever caused, 24 hours a day, 7 days a week, whether or not arising out of or in connection with aviation activities.\n\nThis cover applies worldwide and is not restricted to periods of flight, duty or employment.",
    type: "fixed",
    order: 6,
  },
  {
    id: "sec-7",
    title: "Sums Reinsured",
    content: "As per the Schedule of Insured Persons.\n\nMaximum Sum Insured per Insured Person:\n  {{pa_max_sum_per_person}}\n\nOverall Policy Annual Aggregate Limit:\n  {{pa_overall_aggregate}}",
    type: "variable",
    order: 7,
  },
  {
    id: "sec-7b",
    title: "Benefits",
    content: "Accidental Death: 100% of Sum Insured\nPermanent Total Disablement: 100% of Sum Insured\nTemporary Total Disablement: As agreed (weekly benefit)\nMedical Expenses: As agreed\n\nAs more fully defined in the Policy wording.",
    type: "fixed",
    order: 7.5,
  },
  {
    id: "sec-8",
    title: "Deductibles",
    content: "Nil.",
    type: "variable",
    order: 8,
  },
  {
    id: "sec-9",
    title: "Situation",
    content: "Worldwide — 24-hour cover.\n\nSubject to Sanctions and Embargo Clause — AVN111(R).",
    type: "fixed",
    order: 9,
  },
  {
    id: "sec-10",
    title: "Reinsurance Conditions",
    content: "Reinsurance Subscription and Claims Control Clause:\n\n1. Leading Reinsurer shall be responsible for making all decisions in connection with the handling of claims under this Contract.\n2. All claims settlements by the Leading Reinsurer shall be binding on all Reinsurers subscribing hereto.\n3. The Reinsured shall:\n   (a) give prompt notice to the Leading Reinsurer of any occurrence which may give rise to a claim;\n   (b) provide the Leading Reinsurer with all information and assistance as may be required;\n   (c) take all reasonable steps to mitigate any loss.\n\nAVN41A (Amended) — Leading Reinsurer Agreement\n\nContracts (Rights of Third Parties) Act 1999 — AVN72\n\nSimultaneous Settlement (Reinsurance) Clause — LPO438\n\nReinsurance Cancellation Clause AVN112 (30 days)\n\nCut-Through Clause\n\nSanctions and Embargo Clause — AVN111(R)\n\nElectronic Data Event Liability Exclusion — LIIBA 001 12.09.2019\n\nReinsurer Review Clause:\nDefinitions: S&P rating of A- or above; AM Best rating of A- or above.",
    type: "fixed",
    order: 10,
  },
  {
    id: "sec-11",
    title: "Conditions",
    content: "Original Insurance per:\n\nAviation Personal Accident Policy (24-Hour basis)\n\nNuclear Risks Exclusion Clause — AVN38B\nWar, Hi-Jacking and Other Perils Exclusion Clause — AVN48B\n\n\"Insured\" definition — Two Way Cross Liability — LSW715\n\n30 days cancellation notice — AVN115\n\nSoftware Affirmation Clause — LMA5450\nElectronic Data Event Liability Exclusion — LIIBA 001\nFraudulent Claims — AVN100A\nSanctions and Embargo Clause — AVN111\n\nPre-Existing Conditions Exclusion\nSuicide and Self-Inflicted Injury Exclusion\nAlcohol and Drugs Exclusion\nAge Limitations (cover ceases at age 70 unless agreed)\nMedical Examination clause",
    type: "fixed",
    order: 11,
  },
  {
    id: "sec-12",
    title: "Schedule of Insured Persons",
    content: "As attached.\n\n{{crew_schedule_text}}",
    type: "variable",
    order: 12,
  },
  {
    id: "sec-13",
    title: "Express Warranties",
    content: "None other than as may exist in the Original Insurance or as agreed with the Leading Reinsurer from time to time.",
    type: "fixed",
    order: 13,
  },
  {
    id: "sec-14",
    title: "Conditions Precedent",
    content: "None other than as may exist in the Original Insurance or as agreed with the Leading Reinsurer from time to time.",
    type: "fixed",
    order: 14,
  },
  {
    id: "sec-15",
    title: "Subjectivities",
    content: "None",
    type: "variable",
    order: 15,
  },
  {
    id: "sec-16",
    title: "Choice of Law & Jurisdiction",
    content: "Reinsured's country of domicile.\n\nAny dispute arising out of or in connection with this reinsurance shall be subject to the jurisdiction of the courts of the Reinsured's country of domicile.",
    type: "variable",
    order: 16,
  },
  {
    id: "sec-17",
    title: "Premium",
    content: "As attached.\n\n{{premium_amount}}",
    type: "variable",
    order: 17,
  },
  {
    id: "sec-18",
    title: "Premium Payment Terms",
    content: "Payable in equal quarterly instalments to reinsurers via {{broker_name}} subject to the Premium Payment Clause AVNGA (paragraph 2 deleted)\n{{quarterly_instalment_dates}}\nAppointed broker: {{broker_name}}.",
    type: "variable",
    order: 18,
  },
  {
    id: "sec-19",
    title: "Taxes Payable by Reinsured",
    content: "As attached.",
    type: "variable",
    order: 19,
  },
  {
    id: "sec-20",
    title: "Taxes Payable by Reinsurer",
    content: "As attached.",
    type: "variable",
    order: 20,
  },
  {
    id: "sec-21",
    title: "Reinsurer Contract Documentation",
    content: "Contract certainty to be achieved prior to inception or within 30 days of binding, whichever is the later.\n\nAny changes to the terms of this contract shall be documented by endorsement issued by the broker and agreed by the Leading Reinsurer.\n\nReinsured advisory note to be provided within 7 days of binding.",
    type: "fixed",
    order: 21,
  },
  {
    id: "sec-22",
    title: "Several Liability Notice Insurance",
    content: "The subscribing insurers' obligations under contracts of insurance to which they subscribe are several and not joint and are limited solely to the extent of their individual subscriptions. The subscribing insurers are not responsible for the subscription of any co-subscribing insurer who for any reason does not satisfy all or part of its obligations.\n\nLSW 1001",
    type: "fixed",
    order: 22,
  },
  {
    id: "sec-23",
    title: "Order Hereon",
    content: "{{order_hereon_text}}",
    type: "variable",
    order: 23,
  },
  {
    id: "sec-23b",
    title: "Claims Information",
    content: "{{product_name}} claims advised in the last 5 years:\n\n{{claims_history_text}}",
    type: "variable",
    order: 24,
  },
  {
    id: "sec-24",
    title: "Schedule of Insured Persons (Attachment)",
    content: "SCHEDULE OF INSURED PERSONS\n\n{{crew_schedule_text}}",
    type: "variable",
    order: 25,
  },
  {
    id: "sec-27",
    title: "Premium Breakdown (Attachment)",
    content: "PREMIUM BREAKDOWN\n(per annum & pro rata for the period, as applicable)\n\n{{premium_breakdown_text}}",
    type: "variable",
    order: 28,
  },
  {
    id: "sec-28",
    title: "Notification of Security",
    content: "NOTIFICATION OF SECURITY\n\nREINSURED: {{reinsured_name}}\nINSURED: {{insured_name}}\nUNIQUE MARKET REFERENCE: {{umr}}\nPERIOD: Subject Approval, No Risk\nTYPE: AVIATION PERSONAL ACCIDENT (24-HOUR) {{placement_type_upper}}\n\nSubject to the LSW 1001 clause the final basis of Security is detailed as follows:\n\nOrder hereon: {{order_hereon_text}}\nDeclaration under delegated underwriting contract: {{broker_reference}}\n\nEffected with:\n\n{{underwriter_table_text}}\n\n{{quoting_underwriter}} {{quote_date}}",
    type: "variable",
    order: 29,
  },
];

// Dynamic placeholders that auto-populate from submission data
const availablePlaceholders = [
  { tag: "{{insured_name}}", label: "Insured Name" },
  { tag: "{{insured_address}}", label: "Insured Address" },
  { tag: "{{insured_country}}", label: "Insured Country" },
  { tag: "{{period_from}}", label: "Period From" },
  { tag: "{{period_to}}", label: "Period To" },
  { tag: "{{product_name}}", label: "Product Name" },
  { tag: "{{umr}}", label: "Unique Market Reference" },
  { tag: "{{aircraft_schedule}}", label: "Aircraft Schedule" },
  { tag: "{{geographical_limits}}", label: "Geographical Limits" },
  { tag: "{{hull_value}}", label: "Hull Insured Value" },
  { tag: "{{liability_limit}}", label: "Liability Limit" },
  { tag: "{{deductible_hull}}", label: "Hull Deductible" },
  { tag: "{{premium_amount}}", label: "Premium Amount" },
  { tag: "{{premium_rate}}", label: "Premium Rate" },
  { tag: "{{broker_name}}", label: "Broker Name" },
  { tag: "{{broker_reference}}", label: "Broker Reference" },
  { tag: "{{underwriter_schedule}}", label: "Underwriter / Security Schedule" },
  { tag: "{{underwriter_table_text}}", label: "Underwriter Table (Line Size | Underwriter Name)" },
  { tag: "{{quoting_underwriter}}", label: "Quoting Underwriter Name" },
  { tag: "{{quote_date}}", label: "Quote Date" },
  { tag: "{{quote_valid_until}}", label: "Quote Valid Until Date" },
  { tag: "{{spares_value}}", label: "Spares Value" },
  { tag: "{{spares_limit_text}}", label: "Spares Limit (if applicable — Not Covered when not selected)" },
  { tag: "{{total_aircraft_values}}", label: "Total Aircraft Values (sum of all aircraft agreed values)" },
  { tag: "{{order_hereon_text}}", label: "Order Hereon (e.g. 90% of 100% Of Whole)" },
  { tag: "{{claims_history_text}}", label: "Claims History (formatted list or Nil)" },
  { tag: "{{fleet_schedule_text}}", label: "Fleet Schedule (Reg | Type | M&M | Country | Region)" },
  { tag: "{{aircraft_uses_text}}", label: "Aircraft Uses (Reg | Standard & Special Uses)" },
  { tag: "{{geographical_limits_text}}", label: "Geographical Limits (declared & not declared countries)" },
  { tag: "{{premium_breakdown_text}}", label: "Premium Breakdown (per-aircraft schedule with tax)" },
  { tag: "{{placement_type}}", label: "Placement Type (Insurance / Reinsurance)" },
  { tag: "{{placement_type_upper}}", label: "Placement Type Uppercase" },
  { tag: "{{aviation_type_text}}", label: "Aviation Type Text (product-code-aware, e.g. AVIATION HULL AND SPARES WAR...)" },
  { tag: "{{insured_or_reinsured}}", label: "Insured or Reinsured (contextual label)" },
  { tag: "{{insured_or_reinsured_name}}", label: "Insured or Reinsured Name (contextual)" },
  { tag: "{{reinsured_name}}", label: "Reinsured Name" },
  { tag: "{{reinsured_address}}", label: "Reinsured Address" },
  { tag: "{{additional_insureds}}", label: "Additional Insured(s)" },
  { tag: "{{liability_type}}", label: "Liability Type (Combined Single Limit / Third Party Liability)" },
  { tag: "{{liability_type_short}}", label: "Liability Type Short (CSL / TPL)" },
  { tag: "{{max_agreed_value}}", label: "Max Agreed Value per Aircraft (from Lineslip)" },
  { tag: "{{max_agreed_value_fixed_wing}}", label: "Max Agreed Value — Fixed Wing" },
  { tag: "{{max_agreed_value_rotary_wing}}", label: "Max Agreed Value — Rotary Wing" },
  { tag: "{{max_liability_fixed_wing}}", label: "Max Liability Limit — Fixed Wing" },
  { tag: "{{max_liability_rotary_wing}}", label: "Max Liability Limit — Rotary Wing" },
  { tag: "{{hw_max_agreed_value}}", label: "Hull War — Maximum Aircraft Value" },
  { tag: "{{hw_overall_aggregate}}", label: "Hull War — Overall Aggregate" },
  { tag: "{{quarterly_instalment_dates}}", label: "Quarterly Instalment Dates (4 dates from inception)" },
  { tag: "{{pa_overall_aggregate}}", label: "PA — Overall Policy Annual Aggregate Limit" },
  { tag: "{{pa_max_sum_per_person}}", label: "PA 24-Hour — Maximum Sum Insured per Person" },
  { tag: "{{crew_schedule_text}}", label: "Crew / Insured Persons Schedule (Name | Position | Age | Sum Insured)" },
];

// Helper: parse legacy wordings into sections
function parseExistingWordings(wordings: string | string[] | SlipWordingSection[] | undefined, pType: "insurance" | "reinsurance" = "reinsurance", pCode?: string, subType?: string): SlipWordingSection[] {
  if (!wordings) return getDefaultSlipSections(pType, pCode, subType);
  // Already structured
  if (Array.isArray(wordings) && wordings.length > 0 && typeof wordings[0] === "object" && "title" in (wordings[0] as any)) {
    // Auto-migrate: replace hardcoded USD amounts in Sums Reinsured "In addition" with placeholder
    const sections = (wordings as SlipWordingSection[]).map((s) => {
      if ((s.title === "Sums Reinsured" || s.title === "Sums Insured") && s.content.includes("In addition")) {
        const inAddIdx = s.content.indexOf("In addition");
        const before = s.content.slice(0, inAddIdx);
        const after = s.content.slice(inAddIdx)
          .replace(/(?:USD|GBP|EUR)\s*[\d,]+(?:\.\d+)?/g, "{{hw_max_agreed_value}}");
        return { ...s, content: before + after };
      }
      return s;
    });
    // Auto-migrate: replace ALL {{hw_overall_aggregate}} with {{total_aircraft_values}} in Sums sections
    const sections2 = sections.map((s) => {
      if ((s.title === "Sums Reinsured" || s.title === "Sums Insured") && s.content.includes("{{hw_overall_aggregate}}")) {
        return { ...s, content: s.content.replace(/\{\{hw_overall_aggregate\}\}/g, "{{total_aircraft_values}}") };
      }
      return s;
    });
    return sections2;
  }
  // Legacy string or string[] — fall back to defaults
  return getDefaultSlipSections(pType, pCode, subType);
}

export function LineslipForm({ lineslip, existingLineslips, contacts = [], mode = "lineslip", onSave, onCancel }: LineslipFormProps) {
  const isBinder = mode === "binder";
  const entityLabel = isBinder ? "Binder" : "Lineslip";
  // For new lineslips, gate on product selection before showing the full form
  const [productSelected, setProductSelected] = useState<boolean>(!!lineslip);
  const [name, setName] = useState(lineslip?.name || "");
  const [reference, setReference] = useState(lineslip?.reference || "");
  const [productCode, setProductCode] = useState<ProductCode>(lineslip?.productCode || "HL");
  const [startDate, setStartDate] = useState(lineslip?.startDate || "");
  const [endDate, setEndDate] = useState(lineslip?.endDate || "");
  const [overallLimit, setOverallLimit] = useState(lineslip?.overallLimit?.toString() || "");
  const [maxHullLimitFixedWing, setMaxHullLimitFixedWing] = useState(lineslip?.maxHullLimitFixedWing?.toString() || "");
  const [maxLiabilityLimitFixedWing, setMaxLiabilityLimitFixedWing] = useState(lineslip?.maxLiabilityLimitFixedWing?.toString() || "");
  const [maxHullLimitRotaryWing, setMaxHullLimitRotaryWing] = useState(lineslip?.maxHullLimitRotaryWing?.toString() || "");
  const [maxLiabilityLimitRotaryWing, setMaxLiabilityLimitRotaryWing] = useState(lineslip?.maxLiabilityLimitRotaryWing?.toString() || "");
  const [maxHullLimit, setMaxHullLimit] = useState(lineslip?.maxHullLimit?.toString() || "");
  const [maxLiabilityLimit, setMaxLiabilityLimit] = useState(lineslip?.maxLiabilityLimit?.toString() || "");
  const [maximumAircraftValue, setMaximumAircraftValue] = useState(lineslip?.maximumAircraftValue?.toString() || "");
  const [overallAggregate, setOverallAggregate] = useState(lineslip?.overallAggregate?.toString() || "");
  const [maxSumInsuredPerSeat, setMaxSumInsuredPerSeat] = useState(lineslip?.maxSumInsuredPerSeat?.toString() || "");
  const [aggregatePA, setAggregatePA] = useState(lineslip?.aggregatePA?.toString() || "");
  const [maxSumInsuredPerPersonLOL, setMaxSumInsuredPerPersonLOL] = useState(lineslip?.maxSumInsuredPerPersonLOL?.toString() || "");
  const [aggregateLOL, setAggregateLOL] = useState(lineslip?.aggregateLOL?.toString() || "");
  const [insuranceCompositeBrokerage, setInsuranceCompositeBrokerage] = useState(lineslip?.insuranceCompositeBrokerage?.toString() || "");
  const [reinsuranceCompositeBrokerage, setReinsuranceCompositeBrokerage] = useState(lineslip?.reinsuranceCompositeBrokerage?.toString() || "");
  const [placementType, setPlacementType] = useState<"insurance" | "reinsurance">(lineslip?.placementType || "reinsurance");
  
  // Dual slip wording sections — one per template type, independently editable
  const [insuranceSections, setInsuranceSections] = useState<SlipWordingSection[]>(
    () => parseExistingWordings(lineslip?.insuranceWordings, "insurance", lineslip?.productCode)
  );
  const [reinsuranceSections, setReinsuranceSections] = useState<SlipWordingSection[]>(
    () => parseExistingWordings(lineslip?.reinsuranceWordings || lineslip?.wordings, "reinsurance", lineslip?.productCode)
  );

  // PA 24-Hour separate wording sections — only used when productCode is PA
  const [insurance24hPASections, setInsurance24hPASections] = useState<SlipWordingSection[]>(
    () => parseExistingWordings(lineslip?.insuranceWordings24hPA, "insurance", "PA", "24_hour")
  );
  const [reinsurance24hPASections, setReinsurance24hPASections] = useState<SlipWordingSection[]>(
    () => parseExistingWordings(lineslip?.reinsuranceWordings24hPA, "reinsurance", "PA", "24_hour")
  );

  // PA wording variant toggle: "standard" (Flight Risk / On-Duty) vs "24_hour"
  const [paWordingVariant, setPaWordingVariant] = useState<"standard" | "24_hour">("standard");

  // Active sections derived from the selected placement type AND PA variant
  const slipSections = productCode === "PA" && paWordingVariant === "24_hour"
    ? (placementType === "insurance" ? insurance24hPASections : reinsurance24hPASections)
    : (placementType === "insurance" ? insuranceSections : reinsuranceSections);
  const setSlipSections = productCode === "PA" && paWordingVariant === "24_hour"
    ? (placementType === "insurance" ? setInsurance24hPASections : setReinsurance24hPASections)
    : (placementType === "insurance" ? setInsuranceSections : setReinsuranceSections);

  const [formTab, setFormTab] = useState<"general" | "limits" | "commission" | "security" | "wordings" | "documents" | "notifications" | "rating">("general");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showPlaceholderPicker, setShowPlaceholderPicker] = useState<string | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // When productCode changes on a NEW lineslip (no existing saved wordings),
  // reset both insurance and reinsurance templates to the correct product-specific defaults.
  const prevProductCodeRef = useRef<string>(productCode);
  useEffect(() => {
    if (prevProductCodeRef.current !== productCode) {
      prevProductCodeRef.current = productCode;
      // Only auto-reset if creating a new lineslip OR if the existing lineslip has no saved wordings
      if (!lineslip || (!lineslip.insuranceWordings && !lineslip.reinsuranceWordings && !lineslip.wordings)) {
        setInsuranceSections(getDefaultSlipSections("insurance", productCode));
        setReinsuranceSections(getDefaultSlipSections("reinsurance", productCode));
        // Also reset PA 24-Hour templates when switching to/from PA
        if (productCode === "PA") {
          setInsurance24hPASections(getDefaultSlipSections("insurance", "PA", "24_hour"));
          setReinsurance24hPASections(getDefaultSlipSections("reinsurance", "PA", "24_hour"));
        }
      }
    }
  }, [productCode, lineslip]);
  
  const [countries, setCountries] = useState<string[]>(lineslip?.countries || []);
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: number; uploadDate: string }[]>(
    lineslip?.attachments || []
  );
  const [underwriters, setUnderwriters] = useState<LineslipUnderwriter[]>(
    lineslip?.underwriters || [
      {
        id: "1",
        name: "",
        security: "",
        percentage: 0,
        role: "Lead",
      },
    ]
  );

  // Authorised underwriter contacts — those who can quote and view risks/reports on this lineslip
  const [authorisedUnderwriterIds, setAuthorisedUnderwriterIds] = useState<string[]>(
    lineslip?.authorisedUnderwriterContactIds || []
  );
  const [uwSearchQuery, setUwSearchQuery] = useState("");

  // Authorised producing broker contacts — those who can submit on this lineslip
  const [authorisedPBIds, setAuthorisedPBIds] = useState<string[]>(
    lineslip?.authorisedProducingBrokerIds || []
  );
  const [pbSearchQuery, setPbSearchQuery] = useState("");
  const [uwDropdownOpen, setUwDropdownOpen] = useState(false);
  const uwDropdownRef = useRef<HTMLDivElement>(null);

  // ── Binder Builder fields (binder mode only) ──
  const existingBinder = lineslip as any;
  const [combinedLineLimitFW, setCombinedLineLimitFW] = useState(existingBinder?.combinedLineLimitFW?.toString() || "");
  const [combinedLineLimitRW, setCombinedLineLimitRW] = useState(existingBinder?.combinedLineLimitRW?.toString() || "");
  const [policyWording, setPolicyWording] = useState(existingBinder?.policyWording || "");

  // ── Rating Module state (binder mode only) ──
  const existingRating = (lineslip as any)?.ratingRules as BinderRating | undefined;
  const [ratingHullFW, setRatingHullFW] = useState(existingRating?.hullRateFixedWing?.toString() || "");
  const [ratingHullRW, setRatingHullRW] = useState(existingRating?.hullRateRotaryWing?.toString() || "");
  const [hdRateTableFW, setHdRateTableFW] = useState<{ maxSumReinsured: number; mej: number; metp: number; setp: number }[]>(existingRating?.hdRateTableFW || []);
  const [hdRateTableRW, setHdRateTableRW] = useState<{ maxSumReinsured: number; tet: number; set: number; tep: number }[]>(existingRating?.hdRateTableRW || []);
  const [hdRateTab, setHdRateTab] = useState<"fw" | "rw">("fw");
  const [ratingLiabilityType, setRatingLiabilityType] = useState<"per_seat" | "flat" | "percentage">(existingRating?.liabilityRateType || "per_seat");
  const [ratingLiabilityRate, setRatingLiabilityRate] = useState(existingRating?.liabilityRate?.toString() || "");
  const [ratingLiabilityCurrency, setRatingLiabilityCurrency] = useState(existingRating?.liabilityCurrency || "USD");
  const [rateTableCurrency, setRateTableCurrency] = useState(existingRating?.rateTableCurrency || "USD");
  const [ratingWarRate, setRatingWarRate] = useState(existingRating?.warRate?.toString() || "");
  const [ratingAgeLoadings, setRatingAgeLoadings] = useState<{ fromYears: number; toYears: number; loadingPercent: number }[]>(existingRating?.ageLoadings || []);

  const [ratingPaPerSeat, setRatingPaPerSeat] = useState(existingRating?.paRatePerSeat?.toString() || "");
  const [ratingLolPerPilot, setRatingLolPerPilot] = useState(existingRating?.lolRatePerPilot?.toString() || "");
  const [ratingApprovedUses, setRatingApprovedUses] = useState<string[]>(existingRating?.approvedUses || []);

  // ── PA Rate Table (limit bands × coverage type) ──
  type PaRateTableRow = { maxLimit: number; flightRiskOnly: number; twentyFourHour: number };
  const defaultPaRateTable: PaRateTableRow[] = [
    { maxLimit: 50000, flightRiskOnly: 0.35, twentyFourHour: 0.55 },
    { maxLimit: 100000, flightRiskOnly: 0.30, twentyFourHour: 0.48 },
    { maxLimit: 250000, flightRiskOnly: 0.25, twentyFourHour: 0.40 },
    { maxLimit: 500000, flightRiskOnly: 0.22, twentyFourHour: 0.35 },
    { maxLimit: 1000000, flightRiskOnly: 0.18, twentyFourHour: 0.30 },
  ];
  const [paRateTable, setPaRateTable] = useState<PaRateTableRow[]>(existingRating?.paRateTable || []);

  // ── PA 24-Hour Rate Table (2D: sum insured bands × age bands — same pattern as LOL) ──
  type Pa24hAgeBand = { minAge: number; maxAge: number };
  type Pa24hRateTableRow = { maxLimit: number; rates: number[] }; // rates[i] = rate for ageBands[i]
  const defaultPa24hAgeBands: Pa24hAgeBand[] = [
    { minAge: 18, maxAge: 30 },
    { minAge: 31, maxAge: 40 },
    { minAge: 41, maxAge: 50 },
    { minAge: 51, maxAge: 60 },
    { minAge: 61, maxAge: 70 },
  ];
  const defaultPa24hRateTable: Pa24hRateTableRow[] = [
    { maxLimit: 50000,   rates: [0.45, 0.50, 0.60, 0.75, 1.10] },
    { maxLimit: 100000,  rates: [0.40, 0.45, 0.52, 0.65, 0.95] },
    { maxLimit: 250000,  rates: [0.35, 0.38, 0.45, 0.55, 0.80] },
    { maxLimit: 500000,  rates: [0.30, 0.33, 0.40, 0.48, 0.70] },
    { maxLimit: 1000000, rates: [0.25, 0.28, 0.35, 0.42, 0.60] },
  ];
  const [pa24hAgeBands, setPa24hAgeBands] = useState<Pa24hAgeBand[]>(existingRating?.pa24hAgeBands || []);
  const [pa24hRateTable, setPa24hRateTable] = useState<Pa24hRateTableRow[]>(existingRating?.pa24hRateTable || []);

  // ── LOL Rate Table (sum insured bands × age bands) ──
  type LolAgeBand = { minAge: number; maxAge: number };
  type LolRateTableRow = { maxLimit: number; rates: number[] }; // rates[i] = rate for ageBands[i]
  const defaultLolAgeBands: LolAgeBand[] = [
    { minAge: 18, maxAge: 30 },
    { minAge: 31, maxAge: 40 },
    { minAge: 41, maxAge: 50 },
    { minAge: 51, maxAge: 60 },
    { minAge: 61, maxAge: 70 },
  ];
  const defaultLolRateTable: LolRateTableRow[] = [
    { maxLimit: 50000,   rates: [1.00, 1.10, 1.25, 1.50, 2.00] },
    { maxLimit: 100000,  rates: [0.90, 1.00, 1.10, 1.35, 1.80] },
    { maxLimit: 250000,  rates: [0.75, 0.85, 1.00, 1.20, 1.60] },
    { maxLimit: 500000,  rates: [0.65, 0.75, 0.85, 1.05, 1.40] },
    { maxLimit: 1000000, rates: [0.55, 0.65, 0.75, 0.90, 1.20] },
  ];
  const [lolAgeBands, setLolAgeBands] = useState<LolAgeBand[]>(existingRating?.lolAgeBands || []);
  const [lolRateTable, setLolRateTable] = useState<LolRateTableRow[]>(existingRating?.lolRateTable || []);

  // ── Hull & Liability Rate Tables (HL product binder mode) ──
  type RateTableRow = { maxValue: number; sep: number; mep: number; set: number; met: number };
  type LiabTableRow = { maxLimit: number; sep: number; mep: number; set: number; met: number };

  const defaultHullTableFW: RateTableRow[] = [
    { maxValue: 100000, sep: 2.0, mep: 1.8, set: 1.62, met: 1.4 },
    { maxValue: 150000, sep: 1.8, mep: 1.62, set: 1.46, met: 1.26 },
    { maxValue: 250000, sep: 1.585, mep: 1.43, set: 1.285, met: 1.11 },
    { maxValue: 350000, sep: 1.45, mep: 1.31, set: 1.178, met: 1.02 },
    { maxValue: 500000, sep: 1.325, mep: 1.2, set: 1.075, met: 0.93 },
    { maxValue: 750000, sep: 1.2, mep: 1.08, set: 0.9675, met: 0.837 },
    { maxValue: 1000000, sep: 1.11, mep: 1.0, set: 0.9, met: 0.7745 },
    { maxValue: 1250000, sep: 1.05, mep: 0.94, set: 0.845, met: 0.506 },
    { maxValue: 1500000, sep: 0.998, mep: 0.89, set: 0.81, met: 0.44 },
    { maxValue: 2000000, sep: 0.9235, mep: 0.83, set: 0.745, met: 0.4 },
  ];
  const defaultHullTableRW: RateTableRow[] = [
    { maxValue: 100000, sep: 2.4, mep: 2.16, set: 1.944, met: 1.68 },
    { maxValue: 150000, sep: 2.16, mep: 1.944, set: 1.752, met: 1.512 },
    { maxValue: 250000, sep: 1.902, mep: 1.716, set: 1.542, met: 1.332 },
    { maxValue: 350000, sep: 1.74, mep: 1.572, set: 1.414, met: 1.224 },
    { maxValue: 500000, sep: 1.59, mep: 1.44, set: 1.29, met: 1.116 },
    { maxValue: 750000, sep: 1.44, mep: 1.296, set: 1.161, met: 1.004 },
    { maxValue: 1000000, sep: 1.332, mep: 1.2, set: 1.08, met: 0.929 },
    { maxValue: 1250000, sep: 1.26, mep: 1.128, set: 1.014, met: 0.607 },
    { maxValue: 1500000, sep: 1.198, mep: 1.068, set: 0.972, met: 0.528 },
    { maxValue: 2000000, sep: 1.108, mep: 0.996, set: 0.894, met: 0.48 },
  ];
  const defaultLiabTableFW: LiabTableRow[] = [
    { maxLimit: 100000, sep: 200, mep: 275, set: 175, met: 250 },
    { maxLimit: 250000, sep: 450, mep: 525, set: 425, met: 500 },
    { maxLimit: 500000, sep: 575, mep: 600, set: 550, met: 575 },
    { maxLimit: 1000000, sep: 750, mep: 825, set: 750, met: 800 },
    { maxLimit: 2500000, sep: 1250, mep: 1500, set: 1250, met: 1250 },
    { maxLimit: 5000000, sep: 1750, mep: 2000, set: 1500, met: 1500 },
    { maxLimit: 10000000, sep: 2250, mep: 2500, set: 2000, met: 2250 },
  ];
  const defaultLiabTableRW: LiabTableRow[] = [
    { maxLimit: 100000, sep: 250, mep: 345, set: 220, met: 315 },
    { maxLimit: 250000, sep: 565, mep: 655, set: 530, met: 625 },
    { maxLimit: 500000, sep: 720, mep: 750, set: 690, met: 720 },
    { maxLimit: 1000000, sep: 940, mep: 1030, set: 940, met: 1000 },
    { maxLimit: 2500000, sep: 1565, mep: 1875, set: 1565, met: 1565 },
    { maxLimit: 5000000, sep: 2190, mep: 2500, set: 1875, met: 1875 },
    { maxLimit: 10000000, sep: 2815, mep: 3125, set: 2500, met: 2815 },
  ];

  const [hullTableFW, setHullTableFW] = useState<RateTableRow[]>(existingRating?.hullRateTableFW || []);
  const [hullTableRW, setHullTableRW] = useState<RateTableRow[]>(existingRating?.hullRateTableRW || []);
  const [liabTableFW, setLiabTableFW] = useState<LiabTableRow[]>(existingRating?.liabilityRateTableFW || []);
  const [liabTableRW, setLiabTableRW] = useState<LiabTableRow[]>(existingRating?.liabilityRateTableRW || []);
  const [liabPerSeatRate, setLiabPerSeatRate] = useState(existingRating?.liabilityPerSeatRate?.toString() || "");
  const [liabPerSeatCurrency, setLiabPerSeatCurrency] = useState(existingRating?.liabilityPerSeatCurrency || "USD");
  // PPH rate tables (same structure as liability — flat amounts by limit band × engine category)
  const defaultPphTableFW: LiabTableRow[] = [
    { maxLimit: 50000, sep: 150, mep: 200, set: 125, met: 175 },
    { maxLimit: 100000, sep: 275, mep: 350, set: 225, met: 300 },
    { maxLimit: 250000, sep: 425, mep: 525, set: 375, met: 475 },
    { maxLimit: 500000, sep: 600, mep: 725, set: 525, met: 650 },
    { maxLimit: 1000000, sep: 850, mep: 1000, set: 750, met: 900 },
  ];
  const defaultPphTableRW: LiabTableRow[] = [
    { maxLimit: 50000, sep: 190, mep: 250, set: 155, met: 220 },
    { maxLimit: 100000, sep: 345, mep: 440, set: 280, met: 375 },
    { maxLimit: 250000, sep: 530, mep: 655, set: 470, met: 595 },
    { maxLimit: 500000, sep: 750, mep: 905, set: 655, met: 815 },
    { maxLimit: 1000000, sep: 1065, mep: 1250, set: 940, met: 1125 },
  ];
  const [pphTableFW, setPphTableFW] = useState<LiabTableRow[]>(existingRating?.pphRateTableFW || []);
  const [pphTableRW, setPphTableRW] = useState<LiabTableRow[]>(existingRating?.pphRateTableRW || []);
  const [rateTableTab, setRateTableTab] = useState<"fw" | "rw">("fw");

  // ── UAS (Drone) Hull & Liability Rate Tables ──
  type UasHullRow = { maxValue: number; mr: number; fw: number; hv: number };
  type UasLiabRow = { maxLimit: number; mr: number; fw: number; hv: number };
  const defaultUasHullTable: UasHullRow[] = [
    { maxValue: 5000, mr: 3.5, fw: 4.0, hv: 4.5 },
    { maxValue: 10000, mr: 3.0, fw: 3.5, hv: 4.0 },
    { maxValue: 25000, mr: 2.5, fw: 3.0, hv: 3.5 },
    { maxValue: 50000, mr: 2.0, fw: 2.5, hv: 3.0 },
    { maxValue: 100000, mr: 1.5, fw: 2.0, hv: 2.5 },
    { maxValue: 250000, mr: 1.0, fw: 1.5, hv: 2.0 },
  ];
  const defaultUasLiabTable: UasLiabRow[] = [
    { maxLimit: 250000, mr: 150, fw: 200, hv: 225 },
    { maxLimit: 500000, mr: 250, fw: 325, hv: 375 },
    { maxLimit: 1000000, mr: 400, fw: 500, hv: 575 },
    { maxLimit: 2500000, mr: 625, fw: 775, hv: 900 },
    { maxLimit: 5000000, mr: 900, fw: 1100, hv: 1275 },
    { maxLimit: 10000000, mr: 1250, fw: 1500, hv: 1750 },
  ];
  const [uasHullTable, setUasHullTable] = useState<UasHullRow[]>(existingRating?.uasHullRateTable || []);
  const [uasLiabTable, setUasLiabTable] = useState<UasLiabRow[]>(existingRating?.uasLiabilityRateTable || []);

  // Approved uses options (same as PlacementForm)
  const approvedStandardUsesOptions = [
    "PBP",
    "Industrial Aid",
    "Commercial",
    "Charter",
    "Medevac",
    "Air Ambulance",
    "Photography",
    "Rental",
  ];
  const approvedSpecialUsesOptions = [
    "Governmental",
    "Police",
    "Flight School",
    "Ab-initio",
    "Boarder Control",
    "Other",
  ];

  // ── EOC Covering Letter configuration ──
  const [eocTemplateType, setEocTemplateType] = useState<"insurance" | "reinsurance">("insurance");

  // Insurance EOC fields
  const [eocInsSenderAddress, setEocInsSenderAddress] = useState(lineslip?.eocLetterData?.insuranceSenderAddress || "Lockton Companies (Singapore) Pte Ltd\n50 Raffles Pl, #37-01/06 Singapore Land Tower\nSingapore 048623");
  const [eocInsClientDetails, setEocInsClientDetails] = useState(lineslip?.eocLetterData?.insuranceClientDetails || "{{Insured Name}}\n{{Insured Address}}");
  const [eocInsDateLine, setEocInsDateLine] = useState(lineslip?.eocLetterData?.insuranceDateLine || "{{Date Underwriter Confirms Bound}}");
  const [eocInsSubjectLine, setEocInsSubjectLine] = useState(() => {
    const saved = lineslip?.eocLetterData?.insuranceSubjectLine;
    const OLD_DEFAULT = "Re: Evidence of Cover \u2014 Aviation {{Product}} Insurance";
    return (saved && saved !== OLD_DEFAULT) ? saved : "{{Insured Name}}, {{Product}}, Insurance";
  });
  const [eocInsWelcomeText, setEocInsWelcomeText] = useState(lineslip?.eocLetterData?.insuranceWelcomeText || "We are pleased to confirm that cover has been bound on your behalf in respect of the above-referenced risk. This letter serves as your Evidence of Cover (\"EOC\") and confirms the principal terms and conditions of the placement.\n\nPlease review these documents carefully to ensure they align with your requirements. If any details differ from your understanding, kindly notify us immediately. Otherwise, we will proceed on the basis that the documentation is correct.");
  const [eocInsPremiumPaymentTerms, setEocInsPremiumPaymentTerms] = useState(lineslip?.eocLetterData?.insurancePremiumPaymentTerms || "Premium is due within 30 days of inception or as otherwise agreed. Failure to pay premium by the due date may result in Underwriters exercising their right to cancel cover in accordance with the Premium Payment Clause.");
  const [eocInsCommission, setEocInsCommission] = useState(lineslip?.eocLetterData?.insuranceCommission || "Total Commission is {{Total Commission}} Split between {{Broker Company}} at {{Broker Split}} and {{Producing Broker}} {{Producing Broker Split}}.");
  const [eocInsTermsAndConditions, setEocInsTermsAndConditions] = useState(lineslip?.eocLetterData?.insuranceTermsAndConditions || "Full terms and conditions of this placement are set out in the Binding Slip document, which should be read in conjunction with this letter. In the event of any inconsistency between this covering letter and the Binding Slip, the terms of the Binding Slip shall prevail.\n\nWe also draw your attention to:\n\n- Geographical exclusions - please review and ensure that these meet your requirements.\n- Premium Payment Clause noting that Underwriters have the right to issue 30 days' notice of cancellation if the premium is not paid by the due date.");
  const [eocInsDutyOfDisclosure, setEocInsDutyOfDisclosure] = useState(lineslip?.eocLetterData?.insuranceDutyOfDisclosure || "Under the terms of the Insurance Act 2015, you have a duty to make a fair presentation of the risk prior to inception, renewal or variation of your insurance. Failure to do so may allow the insurer to avoid the policy, reduce the amount payable on a claim or change the terms of the insurance. You must therefore ensure that all material information is disclosed to us prior to inception, renewal or variation of this policy.\n\nPlease do not hesitate to contact us should you have any queries regarding the above or require any further information.");

  // Reinsurance EOC fields
  const [eocReinsSenderAddress, setEocReinsSenderAddress] = useState(lineslip?.eocLetterData?.reinsuranceSenderAddress || "Lockton Companies (Singapore) Pte Ltd\n50 Raffles Pl, #37-01/06 Singapore Land Tower\nSingapore 048623");
  const [eocReinsClientDetails, setEocReinsClientDetails] = useState(lineslip?.eocLetterData?.reinsuranceClientDetails || "{{Producing Broker Details}}");
  const [eocReinsDateLine, setEocReinsDateLine] = useState(lineslip?.eocLetterData?.reinsuranceDateLine || "{{Date Underwriter Confirms Bound}}");
  const [eocReinsSubjectLine, setEocReinsSubjectLine] = useState(() => {
    const saved = lineslip?.eocLetterData?.reinsuranceSubjectLine;
    const OLD_DEFAULT = "Re: Evidence of Cover \u2014 Aviation {{Product}} Reinsurance";
    return (saved && saved !== OLD_DEFAULT) ? saved : "{{Reinsured Name}}, {{Insured Name}}, {{Product}}, {{Insurance or Reinsurance}}";
  });
  const [eocReinsWelcomeText, setEocReinsWelcomeText] = useState(lineslip?.eocLetterData?.reinsuranceWelcomeText || "Following your instructions for the above-referenced account, please find your Policy Document enclosed as evidence of cover.\n\nPlease review these documents carefully to ensure they align with your requirements. If any details differ from your understanding, kindly notify us immediately. Otherwise, we will proceed on the basis that the documentation is correct.");
  const [eocReinsPremiumPaymentTerms, setEocReinsPremiumPaymentTerms] = useState(lineslip?.eocLetterData?.reinsurancePremiumPaymentTerms || "We require payment to be made to us by wire transfer no later than 14 days prior to the settlement due date specified herein, to ensure we can remit funds to Reinsurers in a timely manner.");
  const [eocReinsCommission, setEocReinsCommission] = useState(lineslip?.eocLetterData?.reinsuranceCommission || "Total Commission is {{Total Commission}} Split between {{Broker Company}} at {{Broker Split}} and {{Producing Broker}} {{Producing Broker Split}}.\n\nPlease note that we have provided these terms using a lineslip facility. A lineslip is an arrangement intended to streamline the placing of a risk where, typically, we have identified in advance a number of Reinsurers that will insure a proportion of a particular class of risk. It therefore becomes a cost-effective method to place risks as terms may only have to be agreed with a limited number of the Reinsurers participating in the lineslip. For disclosure purposes, please note we may be entitled to administration costs for managing the lineslip. We will earn a Subscription Market Brokerage (SMB) which reflects administrative services performed on behalf of insurers to complete a subscription market placement, and which is calculated as a percentage of your insurance premium.");
  const [eocReinsTermsAndConditions, setEocReinsTermsAndConditions] = useState(lineslip?.eocLetterData?.reinsuranceTermsAndConditions || "We also draw your attention to the Policy terms and conditions as fully detailed herein including\n\n- Geographical exclusions - please review and ensure that these meet your requirements and that in operating your aircraft you will not be in breach of this.\n- Premium Payment Clause noting that Underwriters have the right to issue 30 days' notice of cancellation if the premium is not paid by the due date.");
  const [eocReinsDutyOfDisclosure, setEocReinsDutyOfDisclosure] = useState(lineslip?.eocLetterData?.reinsuranceDutyOfDisclosure || "Under the terms of the Insurance Act 2015, you have a duty to make a fair presentation of the risk prior to inception, renewal or variation of your insurance. Failure to do so may allow the insurer to avoid the policy, reduce the amount payable on a claim or change the terms of the insurance. You must therefore ensure that all material information is disclosed to us prior to inception, renewal or variation of this policy.\n\nPlease do not hesitate to contact us should you have any queries regarding the above or require any further information.");

  // Active EOC fields based on selected template type
  const eocSenderAddress = eocTemplateType === "insurance" ? eocInsSenderAddress : eocReinsSenderAddress;
  const setEocSenderAddress = eocTemplateType === "insurance" ? setEocInsSenderAddress : setEocReinsSenderAddress;
  const eocClientDetails = eocTemplateType === "insurance" ? eocInsClientDetails : eocReinsClientDetails;
  const setEocClientDetails = eocTemplateType === "insurance" ? setEocInsClientDetails : setEocReinsClientDetails;
  const eocDateLine = eocTemplateType === "insurance" ? eocInsDateLine : eocReinsDateLine;
  const setEocDateLine = eocTemplateType === "insurance" ? setEocInsDateLine : setEocReinsDateLine;
  const eocSubjectLine = eocTemplateType === "insurance" ? eocInsSubjectLine : eocReinsSubjectLine;
  const setEocSubjectLine = eocTemplateType === "insurance" ? setEocInsSubjectLine : setEocReinsSubjectLine;
  const eocWelcomeText = eocTemplateType === "insurance" ? eocInsWelcomeText : eocReinsWelcomeText;
  const setEocWelcomeText = eocTemplateType === "insurance" ? setEocInsWelcomeText : setEocReinsWelcomeText;
  const eocPremiumPaymentTerms = eocTemplateType === "insurance" ? eocInsPremiumPaymentTerms : eocReinsPremiumPaymentTerms;
  const setEocPremiumPaymentTerms = eocTemplateType === "insurance" ? setEocInsPremiumPaymentTerms : setEocReinsPremiumPaymentTerms;
  const eocCommission = eocTemplateType === "insurance" ? eocInsCommission : eocReinsCommission;
  const setEocCommission = eocTemplateType === "insurance" ? setEocInsCommission : setEocReinsCommission;
  const eocTermsAndConditions = eocTemplateType === "insurance" ? eocInsTermsAndConditions : eocReinsTermsAndConditions;
  const setEocTermsAndConditions = eocTemplateType === "insurance" ? setEocInsTermsAndConditions : setEocReinsTermsAndConditions;
  const eocDutyOfDisclosure = eocTemplateType === "insurance" ? eocInsDutyOfDisclosure : eocReinsDutyOfDisclosure;
  const setEocDutyOfDisclosure = eocTemplateType === "insurance" ? setEocInsDutyOfDisclosure : setEocReinsDutyOfDisclosure;

  const [eocCustomSubject, setEocCustomSubject] = useState(lineslip?.eocLetterData?.customSubject || "");
  const [eocAdditionalNotes, setEocAdditionalNotes] = useState(lineslip?.eocLetterData?.additionalNotes || "");
  const [eocClosingText, setEocClosingText] = useState(lineslip?.eocLetterData?.closingText || "");

  // ── Claims Document configuration ──
  const [claimsContactName, setClaimsContactName] = useState(lineslip?.claimsDocData?.claimsContactName || "");
  const [claimsContactEmail, setClaimsContactEmail] = useState(lineslip?.claimsDocData?.claimsContactEmail || "");
  const [claimsContactPhone, setClaimsContactPhone] = useState(lineslip?.claimsDocData?.claimsContactPhone || "");
  const [claimsHandlerCompany, setClaimsHandlerCompany] = useState(lineslip?.claimsDocData?.claimsHandlerCompany || "");
  const [claimsNotifDays, setClaimsNotifDays] = useState(lineslip?.claimsDocData?.notificationPeriodDays?.toString() || "7");
  const [claimsAdditionalProc, setClaimsAdditionalProc] = useState(lineslip?.claimsDocData?.additionalProcedures || "");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (uwDropdownRef.current && !uwDropdownRef.current.contains(e.target as Node)) {
        setUwDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter underwriter contacts from the contacts list
  const underwriterContacts = contacts.filter((c) => c.type === "Underwriter");
  const filteredUnderwriterContacts = underwriterContacts.filter((c) => {
    if (!uwSearchQuery) return true;
    const q = uwSearchQuery.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const toggleAuthorisedUnderwriter = (contactId: string) => {
    setAuthorisedUnderwriterIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllUnderwriters = () => {
    setAuthorisedUnderwriterIds(underwriterContacts.map((c) => c.id));
  };

  const deselectAllUnderwriters = () => {
    setAuthorisedUnderwriterIds([]);
  };

  // Handler: select product on the gate screen and initialize correct templates
  const handleProductSelect = (code: ProductCode) => {
    setProductCode(code);
    setInsuranceSections(getDefaultSlipSections("insurance", code));
    setReinsuranceSections(getDefaultSlipSections("reinsurance", code));
    // Initialize PA 24-Hour templates when PA is selected
    if (code === "PA") {
      setInsurance24hPASections(getDefaultSlipSections("insurance", "PA", "24_hour"));
      setReinsurance24hPASections(getDefaultSlipSections("reinsurance", "PA", "24_hour"));
      setPaWordingVariant("standard");
    }
    setProductSelected(true);
  };

  // Handler: go back to product selection (only for new lineslips)
  const handleChangeProduct = () => {
    setProductSelected(false);
  };

  // Format number with commas
  const formatNumberWithCommas = (value: string): string => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    return parseInt(numericValue, 10).toLocaleString("en-US");
  };

  const parseFormattedNumber = (value: string): string => {
    return value.replace(/,/g, "");
  };

  const handleNumberChange = (value: string, setter: (value: string) => void) => {
    const plainValue = parseFormattedNumber(value);
    setter(plainValue);
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleAddUnderwriter = () => {
    const hasLead = underwriters.some((u) => u.role === "Lead");
    setUnderwriters([
      ...underwriters,
      {
        id: Date.now().toString(),
        name: "",
        security: "",
        percentage: 0,
        role: hasLead ? "Delegated Support" : "Lead",
      },
    ]);
  };

  const handleRemoveUnderwriter = (id: string) => {
    if (underwriters.length > 1) {
      setUnderwriters(underwriters.filter((u) => u.id !== id));
    }
  };

  const handleUnderwriterChange = (id: string, field: keyof LineslipUnderwriter, value: string | number) => {
    if (field === "role" && value === "Lead") {
      setUnderwriters(
        underwriters.map((u) =>
          u.id === id ? { ...u, [field]: value } : { ...u, role: "Delegated Support" }
        )
      );
    } else {
      setUnderwriters(
        underwriters.map((u) => (u.id === id ? { ...u, [field]: value } : u))
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      uploadDate: new Date().toISOString(),
    }));
    setAttachments([...attachments, ...newAttachments]);
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Slip section handlers
  const handleSectionChange = (id: string, field: keyof SlipWordingSection, value: string) => {
    setSlipSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleToggleSectionType = (id: string) => {
    setSlipSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, type: s.type === "fixed" ? "variable" : "fixed" } : s))
    );
  };

  const handleAddSection = () => {
    const maxOrder = slipSections.reduce((max, s) => Math.max(max, s.order), 0);
    const newSection: SlipWordingSection = {
      id: `sec-${Date.now()}`,
      title: "New Section",
      content: "",
      type: "fixed",
      order: maxOrder + 1,
    };
    setSlipSections([...slipSections, newSection]);
    setExpandedSection(newSection.id);
  };

  const handleRemoveSection = (id: string) => {
    setSlipSections((prev) => prev.filter((s) => s.id !== id));
    if (expandedSection === id) setExpandedSection(null);
  };

  const handleMoveSection = (id: string, direction: "up" | "down") => {
    const sorted = [...slipSections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === id);
    if (direction === "up" && idx > 0) {
      const prevOrder = sorted[idx - 1].order;
      const currOrder = sorted[idx].order;
      setSlipSections((prev) =>
        prev.map((s) => {
          if (s.id === sorted[idx].id) return { ...s, order: prevOrder };
          if (s.id === sorted[idx - 1].id) return { ...s, order: currOrder };
          return s;
        })
      );
    } else if (direction === "down" && idx < sorted.length - 1) {
      const nextOrder = sorted[idx + 1].order;
      const currOrder = sorted[idx].order;
      setSlipSections((prev) =>
        prev.map((s) => {
          if (s.id === sorted[idx].id) return { ...s, order: nextOrder };
          if (s.id === sorted[idx + 1].id) return { ...s, order: currOrder };
          return s;
        })
      );
    }
  };

  const insertPlaceholder = (sectionId: string, tag: string) => {
    const textarea = textareaRefs.current[sectionId];
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = slipSections.find((s) => s.id === sectionId)?.content || "";
      const newContent = currentContent.substring(0, start) + tag + currentContent.substring(end);
      handleSectionChange(sectionId, "content", newContent);
      // Restore cursor position after the inserted tag
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      // Fallback: append to end
      const currentContent = slipSections.find((s) => s.id === sectionId)?.content || "";
      handleSectionChange(sectionId, "content", currentContent + tag);
    }
    setShowPlaceholderPicker(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProduct = productOptions.find((p) => p.code === productCode);

    const lineslipData: Omit<Lineslip, "id" | "createdDate" | "lastModified"> = {
      name,
      reference,
      productCode,
      productName: selectedProduct?.name || "",
      placementType,
      status: lineslip?.status || "active",
      startDate,
      endDate,
      overallLimit: parseFloat(overallLimit),
      ...(productCode === "HL" && !isBinder && {
        maxHullLimitFixedWing: parseFloat(maxHullLimitFixedWing),
        maxLiabilityLimitFixedWing: parseFloat(maxLiabilityLimitFixedWing),
        maxHullLimitRotaryWing: parseFloat(maxHullLimitRotaryWing),
        maxLiabilityLimitRotaryWing: parseFloat(maxLiabilityLimitRotaryWing),
      }),
      ...(productCode === "UAS" && {
        maxHullLimit: parseFloat(maxHullLimit),
        maxLiabilityLimit: parseFloat(maxLiabilityLimit),
      }),
      ...(productCode === "HW" && {
        maximumAircraftValue: parseFloat(maximumAircraftValue),
        overallAggregate: parseFloat(overallAggregate),
      }),
      ...(productCode === "PA" && {
        maxSumInsuredPerSeat: parseFloat(maxSumInsuredPerSeat),
        aggregatePA: parseFloat(aggregatePA),
      }),
      ...(productCode === "LOL" && {
        maxSumInsuredPerPersonLOL: parseFloat(maxSumInsuredPerPersonLOL),
        aggregateLOL: parseFloat(aggregateLOL),
      }),
      underwriters: underwriters.map((u) => ({
        ...u,
        percentage: typeof u.percentage === "string" ? parseFloat(u.percentage) : u.percentage,
      })),
      wordings: slipSections,
      insuranceWordings: insuranceSections,
      reinsuranceWordings: reinsuranceSections,
      ...(productCode === "PA" && {
        insuranceWordings24hPA: insurance24hPASections,
        reinsuranceWordings24hPA: reinsurance24hPASections,
      }),
      countries,
      attachments,
      insuranceCompositeBrokerage: parseFloat(insuranceCompositeBrokerage),
      reinsuranceCompositeBrokerage: parseFloat(reinsuranceCompositeBrokerage),
      authorisedUnderwriterContactIds: authorisedUnderwriterIds,
      authorisedProducingBrokerIds: authorisedPBIds,
      // ── Document configuration ──
      eocLetterData: {
        // Insurance version
        insuranceSenderAddress: eocInsSenderAddress || undefined,
        insuranceClientDetails: eocInsClientDetails || undefined,
        insuranceDateLine: eocInsDateLine || undefined,
        insuranceSubjectLine: eocInsSubjectLine || undefined,
        insuranceWelcomeText: eocInsWelcomeText || undefined,
        insurancePremiumPaymentTerms: eocInsPremiumPaymentTerms || undefined,
        insuranceCommission: eocInsCommission || undefined,
        insuranceTermsAndConditions: eocInsTermsAndConditions || undefined,
        insuranceDutyOfDisclosure: eocInsDutyOfDisclosure || undefined,
        // Reinsurance version
        reinsuranceSenderAddress: eocReinsSenderAddress || undefined,
        reinsuranceClientDetails: eocReinsClientDetails || undefined,
        reinsuranceDateLine: eocReinsDateLine || undefined,
        reinsuranceSubjectLine: eocReinsSubjectLine || undefined,
        reinsuranceWelcomeText: eocReinsWelcomeText || undefined,
        reinsurancePremiumPaymentTerms: eocReinsPremiumPaymentTerms || undefined,
        reinsuranceCommission: eocReinsCommission || undefined,
        reinsuranceTermsAndConditions: eocReinsTermsAndConditions || undefined,
        reinsuranceDutyOfDisclosure: eocReinsDutyOfDisclosure || undefined,
        // Shared
        customSubject: eocCustomSubject || undefined,
        additionalNotes: eocAdditionalNotes || undefined,
        closingText: eocClosingText || undefined,
      },
      claimsDocData: (claimsContactName || claimsContactEmail || claimsContactPhone || claimsHandlerCompany || claimsNotifDays !== "7" || claimsAdditionalProc) ? {
        claimsContactName: claimsContactName || undefined,
        claimsContactEmail: claimsContactEmail || undefined,
        claimsContactPhone: claimsContactPhone || undefined,
        claimsHandlerCompany: claimsHandlerCompany || undefined,
        notificationPeriodDays: parseInt(claimsNotifDays) || 7,
        additionalProcedures: claimsAdditionalProc || undefined,
      } : undefined,
    };

    // If binder mode, attach binder-specific fields
    if (isBinder) {
      (lineslipData as any).facilityType = "binder";
      if (combinedLineLimitFW) (lineslipData as any).combinedLineLimitFW = parseFloat(combinedLineLimitFW.replace(/,/g, "")) || undefined;
      if (combinedLineLimitRW) (lineslipData as any).combinedLineLimitRW = parseFloat(combinedLineLimitRW.replace(/,/g, "")) || undefined;
      if (policyWording) (lineslipData as any).policyWording = policyWording;
      (lineslipData as any).ratingRules = {
        rateTableCurrency: rateTableCurrency !== "USD" ? rateTableCurrency : undefined,
        hullRateFixedWing: parseFloat(ratingHullFW) || 0,
        hullRateRotaryWing: parseFloat(ratingHullRW) || 0,
        hullRateTableFW: hullTableFW.length > 0 ? hullTableFW : undefined,
        hullRateTableRW: hullTableRW.length > 0 ? hullTableRW : undefined,
        liabilityRateTableFW: liabTableFW.length > 0 ? liabTableFW : undefined,
        liabilityRateTableRW: liabTableRW.length > 0 ? liabTableRW : undefined,
        liabilityRateType: ratingLiabilityType,
        liabilityRate: parseFloat(ratingLiabilityRate) || 0,
        liabilityCurrency: ratingLiabilityCurrency,
        liabilityPerSeatRate: parseFloat(liabPerSeatRate) || undefined,
        liabilityPerSeatCurrency: liabPerSeatCurrency || undefined,
        pphRateTableFW: pphTableFW.length > 0 ? pphTableFW : undefined,
        pphRateTableRW: pphTableRW.length > 0 ? pphTableRW : undefined,
        pphRate: 0,
        warRate: parseFloat(ratingWarRate) || 0,
        ageLoadings: ratingAgeLoadings,

        paRatePerSeat: parseFloat(ratingPaPerSeat) || undefined,
        paRateTable: paRateTable.length > 0 ? paRateTable : undefined,
        pa24hAgeBands: pa24hAgeBands.length > 0 ? pa24hAgeBands : undefined,
        pa24hRateTable: pa24hRateTable.length > 0 ? pa24hRateTable : undefined,
        lolRatePerPilot: parseFloat(ratingLolPerPilot) || undefined,
        lolRateTable: lolRateTable.length > 0 ? lolRateTable : undefined,
        lolAgeBands: lolAgeBands.length > 0 ? lolAgeBands : undefined,
        approvedUses: ratingApprovedUses.length > 0 ? ratingApprovedUses : undefined,
        hdRateTableFW: hdRateTableFW.length > 0 ? hdRateTableFW : undefined,
        hdRateTableRW: hdRateTableRW.length > 0 ? hdRateTableRW : undefined,
        uasHullRateTable: uasHullTable.length > 0 ? uasHullTable : undefined,
        uasLiabilityRateTable: uasLiabTable.length > 0 ? uasLiabTable : undefined,
      };
    }

    // Check for duplicate reference number
    const isDuplicateReference = existingLineslips.some((ls) => ls.reference === reference && ls.id !== lineslip?.id);
    if (isDuplicateReference) {
      toast.error("Reference number already exists. Please use a unique reference number.");
      return;
    }

    onSave(lineslipData);
  };

  const totalPercentage = underwriters.reduce(
    (sum, u) => sum + (typeof u.percentage === "string" ? parseFloat(u.percentage || "0") : u.percentage),
    0
  );

  const sortedSections = [...slipSections].sort((a, b) => a.order - b.order);

  // Count how many placeholders a section's content contains
  const countPlaceholders = (content: string) => {
    const matches = content.match(/\{\{[^}]+\}\}/g);
    return matches ? matches.length : 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {lineslip ? `Edit ${entityLabel}` : !productSelected ? "Select Product Line" : `Add New ${entityLabel}`}
            </h2>
            <p className="text-gray-600 text-sm mt-0.5">
              {!productSelected ? `Choose the product line for this ${entityLabel.toLowerCase()}` : `Configure ${entityLabel.toLowerCase()} agreement details and underwriter allocations`}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Product Selection Gate — shown first for new lineslips */}
        {!productSelected && (
          <div className="px-6 py-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {productOptions.map((product) => (
                <button
                  key={product.code}
                  type="button"
                  onClick={() => handleProductSelect(product.code)}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-[#004225] hover:bg-[#004225]/5 transition-all duration-200 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-[#004225]/10 flex items-center justify-center transition-colors">
                    <span className="text-sm font-bold text-gray-500 group-hover:text-[#004225] transition-colors">{product.code}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 group-hover:text-[#004225] text-center transition-colors">{product.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form — shown after product is selected */}
        {productSelected && <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden" style={{ maxHeight: "calc(90vh - 64px)" }}>
          {/* ── Tab Bar ── */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 flex gap-0 overflow-x-auto shrink-0">
            {([
              { id: "general" as const, label: "General", icon: FileText },
              { id: "limits" as const, label: "Limits", icon: Shield },
              ...(isBinder ? [{ id: "rating" as const, label: "Rating Module", icon: Zap }] : []),
              { id: "commission" as const, label: "Commission", icon: DollarSign },
              { id: "security" as const, label: "Security", icon: UserCheck },
              { id: "wordings" as const, label: "Policy Wordings", icon: BookOpen },
              { id: "documents" as const, label: "Generated Docs", icon: Settings },
              { id: "notifications" as const, label: "Notifications", icon: Bell },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFormTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  formTab === tab.id
                    ? "border-[#004225] text-[#004225]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab Content (scrollable) ── */}
          <div className="overflow-y-auto flex-1">
          <div className="px-6 py-6 space-y-6">

            {/* ═══════════════════ TAB: General ═══════════════════ */}
            {formTab === "general" && <>
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Lineslip Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Hull and Liability Lineslip"
                    className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reference Number *
                    </label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g., LS26001"
                      className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Product Line *
                    </label>
                    {lineslip ? (
                      /* Editing existing lineslip — use the popover selector */
                      <Popover>
                        <PopoverTrigger>
                          <div className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-[#004225] flex items-center justify-between">
                            {productOptions.find((product) => product.code === productCode)?.name || "Select Product"}
                            <ChevronsUpDown className="size-4 text-gray-400" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search products..." />
                            <CommandList>
                              <CommandEmpty>No products found.</CommandEmpty>
                              <CommandGroup>
                                {productOptions.map((product) => (
                                  <CommandItem key={product.code} value={product.code} onSelect={(value) => setProductCode(value as ProductCode)}>
                                    {product.name} ({product.code})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      /* New lineslip — show selected product with Change button */
                      <div className="w-full bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg flex items-center justify-between">
                        <span className="font-medium">{productOptions.find((p) => p.code === productCode)?.name} ({productCode})</span>
                        <button
                          type="button"
                          onClick={handleChangeProduct}
                          className="text-xs text-[#004225] hover:text-[#003319] font-semibold underline underline-offset-2"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Period */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Period
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date *
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                  />
                </div>
              </div>
            </div>

            {/* Binder Builder Config moved into the Limits tab above */}

            {/* Attachments */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Attachments
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Files
                  </label>
                  <Button
                    type="button"
                    onClick={() => document.getElementById("fileInput")?.click()}
                    className="bg-[#004225] hover:bg-[#003319] text-white"
                  >
                    <Upload className="size-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <input
                  type="file"
                  id="fileInput"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <File className="size-4 mr-2 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {attachment.name}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({formatFileSize(attachment.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Authorised Producing Brokers */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Authorised Producing Brokers
              </h3>
              <p className="text-xs text-gray-600">
                Select which Producing Brokers are authorised to submit placements on this lineslip. When a placement is submitted, the selected Producing Broker must be on this list.
              </p>

              {(() => {
                const pbContacts = (contacts || []).filter(c => c.type === "Producing Broker");
                const filteredPBContacts = pbContacts.filter(c => {
                  if (!pbSearchQuery) return true;
                  const q = pbSearchQuery.toLowerCase();
                  return (
                    c.firstName?.toLowerCase().includes(q) ||
                    c.lastName?.toLowerCase().includes(q) ||
                    c.company?.toLowerCase().includes(q) ||
                    c.email?.toLowerCase().includes(q)
                  );
                });

                return (
                  <div className="space-y-3">
                    {/* Quick buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => setAuthorisedPBIds(pbContacts.map(c => c.id))}
                        className="bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5 h-auto"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setAuthorisedPBIds([])}
                        className="bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5 h-auto"
                      >
                        Deselect All
                      </Button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        value={pbSearchQuery}
                        onChange={(e) => setPbSearchQuery(e.target.value)}
                        placeholder="Search producing brokers by name, company, or email..."
                        className="pl-10 border-gray-300 focus:border-[#004225] focus:ring-[#004225] h-[38px]"
                      />
                    </div>

                    {/* Checkbox list */}
                    {pbContacts.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        No Producing Broker contacts found. Add Producing Brokers in Contact Manager first.
                      </p>
                    ) : (
                      <div className="border border-gray-200 rounded-lg max-h-[280px] overflow-y-auto divide-y divide-gray-100">
                        {filteredPBContacts.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No producing brokers match "{pbSearchQuery}"
                          </div>
                        ) : (
                          filteredPBContacts.map((contact) => {
                            const isSelected = authorisedPBIds.includes(contact.id);
                            return (
                              <button
                                key={contact.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setAuthorisedPBIds(authorisedPBIds.filter(id => id !== contact.id));
                                  } else {
                                    setAuthorisedPBIds([...authorisedPBIds, contact.id]);
                                  }
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                  isSelected ? "bg-cyan-50/50" : "hover:bg-gray-50"
                                }`}
                              >
                                <div
                                  className={`rounded flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected ? "bg-cyan-600 text-white" : "border-2 border-gray-300"
                                  }`}
                                  style={{ width: 18, height: 18 }}
                                >
                                  {isSelected && <Check className="size-3" />}
                                </div>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                  {contact.firstName?.[0]}{contact.lastName?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-900">
                                    {contact.company}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-2">{contact.firstName} {contact.lastName}</span>
                                </div>
                                <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{contact.email}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Selected count */}
                    {authorisedPBIds.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg">
                        <UserCheck className="size-4 text-cyan-700" />
                        <span className="text-xs font-semibold text-cyan-800">
                          {authorisedPBIds.length} producing broker{authorisedPBIds.length !== 1 ? "s" : ""} authorised
                        </span>
                      </div>
                    )}

                    {authorisedPBIds.length === 0 && pbContacts.length > 0 && (
                      <p className="text-xs text-amber-600 italic">
                        ⚠ No producing brokers selected. All producing brokers will be able to submit on this lineslip.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
            </>}

            {/* ═══════════════════ TAB: Limits ═══════════════════ */}
            {formTab === "limits" && <>
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Limits
              </h3>
              <div className="space-y-4">
                {productCode === "HL" && !isBinder && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Hull Limit, Fixed Wing (USD) *
                        </label>
                        <Input
                          value={formatNumberWithCommas(maxHullLimitFixedWing)}
                          onChange={(e) => handleNumberChange(e.target.value, setMaxHullLimitFixedWing)}
                          placeholder="e.g., 50,000,000"
                          className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Liability Limit, Fixed Wing (USD) *
                        </label>
                        <Input
                          value={formatNumberWithCommas(maxLiabilityLimitFixedWing)}
                          onChange={(e) => handleNumberChange(e.target.value, setMaxLiabilityLimitFixedWing)}
                          placeholder="e.g., 25,000,000"
                          className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Hull Limit, Rotary Wing (USD) *
                        </label>
                        <Input
                          value={formatNumberWithCommas(maxHullLimitRotaryWing)}
                          onChange={(e) => handleNumberChange(e.target.value, setMaxHullLimitRotaryWing)}
                          placeholder="e.g., 50,000,000"
                          className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Liability Limit, Rotary Wing (USD) *
                        </label>
                        <Input
                          value={formatNumberWithCommas(maxLiabilityLimitRotaryWing)}
                          onChange={(e) => handleNumberChange(e.target.value, setMaxLiabilityLimitRotaryWing)}
                          placeholder="e.g., 25,000,000"
                          className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                        />
                      </div>
                    </div>
                  </>
                )}
                {(productCode === "HL" || productCode === "HW") && isBinder && (() => {
                  const fmtUSD = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v}`;
                  const exposureTiers = [1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000];
                  const renderShareHelper = (rawValue: string) => {
                    const limitVal = parseFloat((rawValue || "0").replace(/,/g, ""));
                    if (!limitVal || limitVal <= 0) return null;
                    const shares = exposureTiers
                      .filter(t => t >= limitVal * 0.25)
                      .slice(0, 4)
                      .map(t => ({ exposure: t, pct: Math.min(100, (limitVal / t) * 100) }));
                    if (shares.length === 0) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {shares.map(s => (
                          <span
                            key={s.exposure}
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${
                              s.pct >= 100
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : s.pct >= 50
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-gray-50 border-gray-200 text-gray-500"
                            }`}
                          >
                            <span className="font-semibold">{s.pct >= 100 ? "100" : s.pct.toFixed(1)}%</span>
                            <span className="opacity-70">of {fmtUSD(s.exposure)}</span>
                          </span>
                        ))}
                      </div>
                    );
                  };
                  return (
                    <>
                      <p className="text-xs text-gray-500 -mt-1">
                        {productCode === "HW"
                          ? "The Combined Line Limit defines the maximum hull value + spares exposure this binder market will bind per aircraft type. This is used by the Binder Builder to calculate each market's percentage share."
                          : "The Combined Line Limit defines the maximum total exposure (hull value + liability limit + spares + PPH if applicable) this binder market will bind per aircraft type. This is used by the Binder Builder to calculate each market's percentage share."}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Combined Line Limit — Fixed Wing (USD) *
                          </label>
                          <Input
                            value={formatNumberWithCommas(combinedLineLimitFW)}
                            onChange={(e) => handleNumberChange(e.target.value, setCombinedLineLimitFW)}
                            placeholder="e.g., 5,000,000"
                            className="border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">{productCode === "HW" ? "Max hull value + spares for fixed wing aircraft" : "Max total exposure (hull + liability + spares + PPH) for fixed wing aircraft"}</p>
                          {renderShareHelper(combinedLineLimitFW)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Combined Line Limit — Rotary Wing (USD) *
                          </label>
                          <Input
                            value={formatNumberWithCommas(combinedLineLimitRW)}
                            onChange={(e) => handleNumberChange(e.target.value, setCombinedLineLimitRW)}
                            placeholder="e.g., 3,000,000"
                            className="border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">{productCode === "HW" ? "Max hull value + spares for rotary wing aircraft" : "Max total exposure (hull + liability + spares + PPH) for rotary wing aircraft"}</p>
                          {renderShareHelper(combinedLineLimitRW)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Policy Wording Reference
                        </label>
                        <Input
                          value={policyWording}
                          onChange={(e) => setPolicyWording(e.target.value)}
                          placeholder="e.g., AVN1C / Lloyd's MAR 2024"
                          className="border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Binders must share the same wording to stack in the Binder Builder</p>
                      </div>
                    </>
                  );
                })()}
                {productCode === "HW" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Maximum Aircraft Value (USD) *
                      </label>
                      <Input
                        value={formatNumberWithCommas(maximumAircraftValue)}
                        onChange={(e) => handleNumberChange(e.target.value, setMaximumAircraftValue)}
                        placeholder="e.g., 100,000,000"
                        className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Overall Aggregate (USD) *
                      </label>
                      <Input
                        value={formatNumberWithCommas(overallAggregate)}
                        onChange={(e) => handleNumberChange(e.target.value, setOverallAggregate)}
                        placeholder="e.g., 500,000,000"
                        className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                      />
                    </div>
                  </div>
                )}
                {productCode === "PA" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Max Sum Insured Per Seat / Person (USD) *
                      </label>
                      <Input
                        value={formatNumberWithCommas(maxSumInsuredPerSeat)}
                        onChange={(e) => handleNumberChange(e.target.value, setMaxSumInsuredPerSeat)}
                        placeholder="e.g., 100,000"
                        className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Aggregate PA (USD) *
                      </label>
                      <Input
                        value={formatNumberWithCommas(aggregatePA)}
                        onChange={(e) => handleNumberChange(e.target.value, setAggregatePA)}
                        placeholder="e.g., 500,000"
                        className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                      />
                    </div>
                  </div>
                )}
                {productCode === "LOL" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Max Sum Insured Per Person (USD) *
                      </label>
                      <Input
                        value={formatNumberWithCommas(maxSumInsuredPerPersonLOL)}
                        onChange={(e) => handleNumberChange(e.target.value, setMaxSumInsuredPerPersonLOL)}
                        placeholder="e.g., 100,000"
                        className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Aggregate Loss of Licence (USD) *
                      </label>
                      <Input
                        value={formatNumberWithCommas(aggregateLOL)}
                        onChange={(e) => handleNumberChange(e.target.value, setAggregateLOL)}
                        placeholder="e.g., 500,000"
                        className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                      />
                    </div>
                  </div>
                )}
                {productCode === "UAS" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Maximum Hull Limit (USD) *
                      </label>
                      <Input
                        value={formatNumberWithCommas(maxHullLimit)}
                        onChange={(e) => handleNumberChange(e.target.value, setMaxHullLimit)}
                        placeholder="e.g., 500,000"
                        className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Maximum Liability Limit (USD) *
                      </label>
                      <Input
                        value={formatNumberWithCommas(maxLiabilityLimit)}
                        onChange={(e) => handleNumberChange(e.target.value, setMaxLiabilityLimit)}
                        placeholder="e.g., 1,000,000"
                        className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                      />
                    </div>
                  </div>
                )}
                {(productCode === "HD" || productCode === "UAS") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {productCode === "HD" ? "Max Sums Insured/Reinsured Per Aircraft (USD) *" : "Overall Limit (USD) *"}
                    </label>
                    <Input
                      value={formatNumberWithCommas(overallLimit)}
                      onChange={(e) => handleNumberChange(e.target.value, setOverallLimit)}
                      placeholder="e.g., 250,000"
                      className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Countries */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Countries
              </h3>
              <p className="text-xs text-gray-600">
                Specify which countries this lineslip covers. This will match against the insured's country when brokers submit placements.
              </p>
              <div className="space-y-3">
                {/* Quick Selection Buttons */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Quick Select:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => setCountries(availableCountries)}
                      className="bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5 h-auto"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCountries([])}
                      className="bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5 h-auto"
                    >
                      Deselect All
                    </Button>
                    {Object.entries(countriesByRegion).map(([region, regionCountries]) => (
                      <Button
                        key={region}
                        type="button"
                        onClick={() => {
                          const newCountries = [...new Set([...countries, ...regionCountries])];
                          setCountries(newCountries);
                        }}
                        className="bg-[#004225] hover:bg-[#003319] text-white text-xs px-3 py-1.5 h-auto"
                      >
                        + {region}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Individual Country Selection */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span className={countries.length > 0 ? "text-gray-900" : "text-gray-400"}>
                        {countries.length > 0
                          ? `${countries.length} countr${countries.length === 1 ? 'y' : 'ies'} selected`
                          : "Select countries..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command className="bg-white border-gray-200">
                      <CommandInput placeholder="Search countries..." className="border-gray-200" />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {availableCountries.map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={() => {
                                if (countries.includes(country)) {
                                  setCountries(countries.filter((c) => c !== country));
                                } else {
                                  setCountries([...countries, country]);
                                }
                              }}
                              className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div
                                  className={`w-4 h-4 border rounded flex items-center justify-center ${
                                    countries.includes(country)
                                      ? "bg-[#004225] border-[#004225]"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {countries.includes(country) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                {country}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {countries.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    {countries.map((country, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-700"
                      >
                        {country}
                        <button
                          type="button"
                          onClick={() => setCountries(countries.filter((_, i) => i !== index))}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {countries.length === 0 && (
                  <p className="text-xs text-gray-500 italic">No countries added yet. Add countries to specify coverage territories.</p>
                )}
              </div>
            </div>

            {/* Approved Uses for Auto-Quoting (Binder only, not for HD) */}
            {isBinder && productCode !== 'HD' && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Approved Uses</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Select which aircraft uses this binder can automatically quote. If none are selected, all uses are eligible.</p>
                </div>
                {ratingApprovedUses.length > 0 && (
                  <button type="button" onClick={() => setRatingApprovedUses([])} className="text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 px-2.5 py-1 rounded-lg transition-all">
                    Clear All
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Standard Uses</p>
                  <div className="grid grid-cols-4 gap-2">
                    {approvedStandardUsesOptions.map((use) => {
                      const isSelected = ratingApprovedUses.includes(use);
                      return (
                        <label
                          key={use}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all text-sm ${
                            isSelected
                              ? "bg-amber-50 border-amber-400 text-amber-800"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setRatingApprovedUses(prev =>
                                isSelected ? prev.filter(u => u !== use) : [...prev, use]
                              );
                            }}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          {use}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Special Uses</p>
                  <div className="grid grid-cols-4 gap-2">
                    {approvedSpecialUsesOptions.map((use) => {
                      const isSelected = ratingApprovedUses.includes(use);
                      return (
                        <label
                          key={use}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all text-sm ${
                            isSelected
                              ? "bg-amber-50 border-amber-400 text-amber-800"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setRatingApprovedUses(prev =>
                                isSelected ? prev.filter(u => u !== use) : [...prev, use]
                              );
                            }}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          {use}
                        </label>
                      );
                    })}
                  </div>
                </div>
                {ratingApprovedUses.length > 0 && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <Zap className="size-3.5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">
                      <span className="font-semibold">{ratingApprovedUses.length}</span> use{ratingApprovedUses.length !== 1 ? "s" : ""} approved: {ratingApprovedUses.join(", ")}. 
                      Placements with uses outside this list will follow standard underwriter review.
                    </p>
                  </div>
                )}
                {ratingApprovedUses.length === 0 && (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <Shield className="size-3.5 text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-500">
                      No use restrictions — all uses will be eligible for auto-quoting via this binder.
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}

            </>}

            {/* ═══════════════════ TAB: Rating Module (Binder only) ═══════════════════ */}
            {formTab === "rating" && isBinder && <>
            <div className="space-y-6">
              {/* Rating Module Header */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="size-5 text-amber-600" />
                  <h3 className="text-base font-semibold text-gray-900">Auto-Rating Configuration</h3>
                </div>
                <p className="text-sm text-gray-600">Configure rate tables to automatically calculate premiums when a risk is submitted to this binder.</p>
              </div>

              {/* Rate Table Base Currency */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Rate Table Base Currency</h3>
                    <p className="text-xs text-gray-500 mt-0.5">All band thresholds (hull values, liability limits, sum insured) are denominated in this currency. When a placement uses a different currency, values are automatically converted at indicative FX rates for band lookup.</p>
                  </div>
                  <select value={rateTableCurrency} onChange={(e) => setRateTableCurrency(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-w-[100px]">
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                    <option value="CHF">CHF</option>
                    <option value="SGD">SGD</option>
                    <option value="AED">AED</option>
                    <option value="HKD">HKD</option>
                  </select>
                </div>
              </div>

              {/* ── HL / HW Product: Hull Rate Tables (+ Liability for HL only) ── */}
              {(productCode === "HL" || productCode === "HW") && (<>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-base font-semibold text-gray-900">{productCode === "HW" ? "Hull War Rate Table" : "Hull Rate Table"}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      <button type="button" onClick={() => setRateTableTab("fw")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${rateTableTab === "fw" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Fixed Wing</button>
                      <button type="button" onClick={() => setRateTableTab("rw")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${rateTableTab === "rw" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Rotary Wing</button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Rate as % of agreed hull value. Values between bands are linearly interpolated for precision.</p>

                {/* Hull Table */}
                {(() => {
                  const table = rateTableTab === "fw" ? hullTableFW : hullTableRW;
                  const setTable = rateTableTab === "fw" ? setHullTableFW : setHullTableRW;
                  const defaultTable = rateTableTab === "fw" ? defaultHullTableFW : defaultHullTableRW;
                  return (
                    <>
                      {table.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <p className="text-sm text-gray-500 mb-3">No hull rate bands configured for {rateTableTab === "fw" ? "Fixed Wing" : "Rotary Wing"}.</p>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => setTable(defaultTable)} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                              <Zap className="size-3 inline mr-1" />Load Default Template
                            </button>
                            <button type="button" onClick={() => setTable([{ maxValue: 0, sep: 0, mep: 0, set: 0, met: 0 }])} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                              <Plus className="size-3 inline mr-1" />Add Empty Row
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-36">{rateTableTab === "fw" ? "Fixed Wing" : "Rotary Wing"} ({productCode === "HW" ? "Hull War" : "Hull"})</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">SE Piston</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">ME Piston</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">SE Turbine</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">ME Turbine</th>
                                  <th className="w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {table.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                        <input type="number" min="0" step="1000" value={row.maxValue || ""} onChange={(e) => { const u = [...table]; u[idx] = { ...u[idx], maxValue: parseFloat(e.target.value) || 0 }; setTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                      </div>
                                    </td>
                                    {(["sep", "mep", "set", "met"] as const).map((col) => (
                                      <td key={col} className="px-2 py-1.5">
                                        <input type="number" min="0" step="0.001" value={row[col] || ""} onChange={(e) => { const u = [...table]; u[idx] = { ...u[idx], [col]: parseFloat(e.target.value) || 0 }; setTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0.000%" />
                                      </td>
                                    ))}
                                    <td className="px-1 py-1.5">
                                      <button type="button" onClick={() => setTable(table.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                        <Trash2 className="size-3" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                            <button type="button" onClick={() => setTable([...table, { maxValue: 0, sep: 0, mep: 0, set: 0, met: 0 }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                              <Plus className="size-3" />Add Band
                            </button>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setTable(defaultTable)} className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors">Reset to defaults</button>
                              <span className="text-[10px] text-gray-300">|</span>
                              <button type="button" onClick={() => setTable([])} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Liability Rate Table (HL only — HW has no liability component) */}
              {productCode === "HL" && <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-base font-semibold text-gray-900">Liability Rate Table</h3>
                </div>
                <p className="text-xs text-gray-500">Flat premium amount by liability limit band. If the exact limit isn't in the table, the price from the next higher band is used.</p>

                {(() => {
                  const table = rateTableTab === "fw" ? liabTableFW : liabTableRW;
                  const setTable = rateTableTab === "fw" ? setLiabTableFW : setLiabTableRW;
                  const defaultTable = rateTableTab === "fw" ? defaultLiabTableFW : defaultLiabTableRW;
                  return (
                    <>
                      {table.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <p className="text-sm text-gray-500 mb-3">No liability rate bands configured for {rateTableTab === "fw" ? "Fixed Wing" : "Rotary Wing"}.</p>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => setTable(defaultTable)} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                              <Zap className="size-3 inline mr-1" />Load Default Template
                            </button>
                            <button type="button" onClick={() => setTable([{ maxLimit: 0, sep: 0, mep: 0, set: 0, met: 0 }])} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                              <Plus className="size-3 inline mr-1" />Add Empty Row
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-36">{rateTableTab === "fw" ? "Fixed Wing" : "Rotary Wing"} (Liability)</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">SE Piston</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">ME Piston</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">SE Turbine</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">ME Turbine</th>
                                  <th className="w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {table.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                        <input type="number" min="0" step="1000" value={row.maxLimit || ""} onChange={(e) => { const u = [...table]; u[idx] = { ...u[idx], maxLimit: parseFloat(e.target.value) || 0 }; setTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                      </div>
                                    </td>
                                    {(["sep", "mep", "set", "met"] as const).map((col) => (
                                      <td key={col} className="px-2 py-1.5">
                                        <div className="flex items-center gap-0.5">
                                          <span className="text-[10px] text-gray-300">$</span>
                                          <input type="number" min="0" step="1" value={row[col] || ""} onChange={(e) => { const u = [...table]; u[idx] = { ...u[idx], [col]: parseFloat(e.target.value) || 0 }; setTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0" />
                                        </div>
                                      </td>
                                    ))}
                                    <td className="px-1 py-1.5">
                                      <button type="button" onClick={() => setTable(table.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                        <Trash2 className="size-3" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                            <button type="button" onClick={() => setTable([...table, { maxLimit: 0, sep: 0, mep: 0, set: 0, met: 0 }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                              <Plus className="size-3" />Add Band
                            </button>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setTable(defaultTable)} className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors">Reset to defaults</button>
                              <span className="text-[10px] text-gray-300">|</span>
                              <button type="button" onClick={() => setTable([])} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Per-Seat Liability (Optional) */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Per-Seat Liability (Optional)</h4>
                  <p className="text-xs text-gray-500 mb-3">If set, this flat per-seat amount is added on top of the table-based liability premium.</p>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount per Seat</label>
                      <Input type="number" step="0.01" min="0" placeholder="e.g. 150" value={liabPerSeatRate} onChange={(e) => setLiabPerSeatRate(e.target.value)} className="border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm h-9" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                      <select value={liabPerSeatCurrency} onChange={(e) => setLiabPerSeatCurrency(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 h-9">
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                        <option value="SGD">SGD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>}
              </>)}

              {/* Hull Deductible Rate Tables (HD only — FW / RW tabs) */}
              {productCode === "HD" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-base font-semibold text-gray-900">Hull Deductible Rate Table</h3>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button type="button" onClick={() => setHdRateTab("fw")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${hdRateTab === "fw" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Fixed Wing</button>
                    <button type="button" onClick={() => setHdRateTab("rw")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${hdRateTab === "rw" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Rotary Wing</button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Rate on Line (%) by Sums Reinsured band &amp; engine category. Values between bands are linearly interpolated.</p>

                {(() => {
                  const isFW = hdRateTab === "fw";
                  const table = isFW ? hdRateTableFW : hdRateTableRW;
                  const setTable = isFW ? setHdRateTableFW : setHdRateTableRW;
                  const cols = isFW
                    ? [{ key: "mej", label: "ME Jet" }, { key: "metp", label: "ME Turboprop" }, { key: "setp", label: "SE Turboprop" }] as const
                    : [{ key: "tet", label: "Twin Turbine" }, { key: "set", label: "Single Turbine" }, { key: "tep", label: "Twin Piston" }] as const;
                  const defaultRows = [
                    { maxSumReinsured: 50000 },
                    { maxSumReinsured: 100000 },
                    { maxSumReinsured: 150000 },
                    { maxSumReinsured: 200000 },
                    { maxSumReinsured: 250000 },
                  ].map(r => ({ ...r, ...Object.fromEntries(cols.map(c => [c.key, 0])) }));
                  const emptyRow = { maxSumReinsured: 0, ...Object.fromEntries(cols.map(c => [c.key, 0])) };

                  return table.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-sm text-gray-500 mb-3">No rate bands configured for {isFW ? "Fixed Wing" : "Rotary Wing"}.</p>
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => setTable(defaultRows as any)} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                          <Zap className="size-3 inline mr-1" />Load Default Template
                        </button>
                        <button type="button" onClick={() => setTable([emptyRow] as any)} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                          <Plus className="size-3 inline mr-1" />Add Empty Row
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-40">{isFW ? "Fixed Wing" : "Rotary Wing"} — Sums Reinsured</th>
                              {cols.map(c => (
                                <th key={c.key} className="text-center px-2 py-2 text-xs font-semibold text-gray-600">{c.label}</th>
                              ))}
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {table.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="px-2 py-1.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                    <input type="number" min="0" step="1000" value={row.maxSumReinsured || ""} onChange={(e) => { const u = [...table]; u[idx] = { ...u[idx], maxSumReinsured: parseFloat(e.target.value) || 0 }; setTable(u as any); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                  </div>
                                </td>
                                {cols.map(c => (
                                  <td key={c.key} className="px-2 py-1.5">
                                    <input type="number" min="0" step="0.001" value={(row as any)[c.key] || ""} onChange={(e) => { const u = [...table]; u[idx] = { ...u[idx], [c.key]: parseFloat(e.target.value) || 0 }; setTable(u as any); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0.000%" />
                                  </td>
                                ))}
                                <td className="px-1 py-1.5">
                                  <button type="button" onClick={() => setTable(table.filter((_, i) => i !== idx) as any)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                    <Trash2 className="size-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                        <button type="button" onClick={() => setTable([...table, emptyRow] as any)} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                          <Plus className="size-3" /> Add Band
                        </button>
                        <button type="button" onClick={() => setTable([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear All</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              )}



              {/* UAS Hull & Liability Rate Tables */}
              {productCode === "UAS" && (<>
              {/* UAS Hull Rate Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-base font-semibold text-gray-900">UAS Hull Rate Table</h3>
                </div>
                <p className="text-xs text-gray-500">Rate as % of agreed hull value by drone type. Values between bands are linearly interpolated for precision.</p>

                {uasHullTable.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">No UAS hull rate bands configured.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => setUasHullTable(defaultUasHullTable)} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                        <Zap className="size-3 inline mr-1" />Load Default Template
                      </button>
                      <button type="button" onClick={() => setUasHullTable([{ maxValue: 0, mr: 0, fw: 0, hv: 0 }])} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                        <Plus className="size-3 inline mr-1" />Add Empty Row
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-36">Max Hull Value ({rateTableCurrency})</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">Multi-Rotor</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">Fixed Wing</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">Hybrid VTOL</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {uasHullTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                  <input type="number" min="0" step="1000" value={row.maxValue || ""} onChange={(e) => { const u = [...uasHullTable]; u[idx] = { ...u[idx], maxValue: parseFloat(e.target.value) || 0 }; setUasHullTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                </div>
                              </td>
                              {(["mr", "fw", "hv"] as const).map((col) => (
                                <td key={col} className="px-2 py-1.5">
                                  <input type="number" min="0" step="0.001" value={row[col] || ""} onChange={(e) => { const u = [...uasHullTable]; u[idx] = { ...u[idx], [col]: parseFloat(e.target.value) || 0 }; setUasHullTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0.000%" />
                                </td>
                              ))}
                              <td className="px-1 py-1.5">
                                <button type="button" onClick={() => setUasHullTable(uasHullTable.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                  <Trash2 className="size-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                      <button type="button" onClick={() => setUasHullTable([...uasHullTable, { maxValue: 0, mr: 0, fw: 0, hv: 0 }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                        <Plus className="size-3" />Add Band
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setUasHullTable(defaultUasHullTable)} className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors">Reset to defaults</button>
                        <span className="text-[10px] text-gray-300">|</span>
                        <button type="button" onClick={() => setUasHullTable([])} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* UAS Liability Rate Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-base font-semibold text-gray-900">UAS Liability Rate Table</h3>
                </div>
                <p className="text-xs text-gray-500">Flat premium amount by liability limit band &amp; drone type. If the exact limit isn't in the table, the price from the next higher band is used.</p>

                {uasLiabTable.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">No UAS liability rate bands configured.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => setUasLiabTable(defaultUasLiabTable)} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                        <Zap className="size-3 inline mr-1" />Load Default Template
                      </button>
                      <button type="button" onClick={() => setUasLiabTable([{ maxLimit: 0, mr: 0, fw: 0, hv: 0 }])} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                        <Plus className="size-3 inline mr-1" />Add Empty Row
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-36">Max Liability Limit ({rateTableCurrency})</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">Multi-Rotor</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">Fixed Wing</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">Hybrid VTOL</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {uasLiabTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                  <input type="number" min="0" step="1000" value={row.maxLimit || ""} onChange={(e) => { const u = [...uasLiabTable]; u[idx] = { ...u[idx], maxLimit: parseFloat(e.target.value) || 0 }; setUasLiabTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                </div>
                              </td>
                              {(["mr", "fw", "hv"] as const).map((col) => (
                                <td key={col} className="px-2 py-1.5">
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-[10px] text-gray-300">$</span>
                                    <input type="number" min="0" step="1" value={row[col] || ""} onChange={(e) => { const u = [...uasLiabTable]; u[idx] = { ...u[idx], [col]: parseFloat(e.target.value) || 0 }; setUasLiabTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0" />
                                  </div>
                                </td>
                              ))}
                              <td className="px-1 py-1.5">
                                <button type="button" onClick={() => setUasLiabTable(uasLiabTable.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                  <Trash2 className="size-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                      <button type="button" onClick={() => setUasLiabTable([...uasLiabTable, { maxLimit: 0, mr: 0, fw: 0, hv: 0 }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                        <Plus className="size-3" />Add Band
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setUasLiabTable(defaultUasLiabTable)} className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors">Reset to defaults</button>
                        <span className="text-[10px] text-gray-300">|</span>
                        <button type="button" onClick={() => setUasLiabTable([])} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </>)}

              {/* PPH Rate Table */}
              {productCode === "HL" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-base font-semibold text-gray-900">PPH Rate Table</h3>
                </div>
                <p className="text-xs text-gray-500">Flat premium amount by PPH limit band &amp; engine category. Limits between bands are linearly interpolated. Spares are included within the hull rate.</p>

                {(() => {
                  const table = rateTableTab === "fw" ? pphTableFW : pphTableRW;
                  const setTable = rateTableTab === "fw" ? setPphTableFW : setPphTableRW;
                  const defaultTable = rateTableTab === "fw" ? defaultPphTableFW : defaultPphTableRW;
                  return (
                    <>
                      {table.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <p className="text-sm text-gray-500 mb-3">No PPH rate bands configured for {rateTableTab === "fw" ? "Fixed Wing" : "Rotary Wing"}.</p>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => setTable(defaultTable)} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                              <Zap className="size-3 inline mr-1" />Load Default Template
                            </button>
                            <button type="button" onClick={() => setTable([{ maxLimit: 0, sep: 0, mep: 0, set: 0, met: 0 }])} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                              <Plus className="size-3 inline mr-1" />Add Empty Row
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-36">{rateTableTab === "fw" ? "Fixed Wing" : "Rotary Wing"} (PPH)</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">SE Piston</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">ME Piston</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">SE Turbine</th>
                                  <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">ME Turbine</th>
                                  <th className="w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {table.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                        <input type="number" min="0" step="1000" value={row.maxLimit || ""} onChange={(e) => { const u = [...table]; u[idx] = { ...u[idx], maxLimit: parseFloat(e.target.value) || 0 }; setTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                      </div>
                                    </td>
                                    {(["sep", "mep", "set", "met"] as const).map((col) => (
                                      <td key={col} className="px-2 py-1.5">
                                        <div className="flex items-center gap-0.5">
                                          <span className="text-[10px] text-gray-300">$</span>
                                          <input type="number" min="0" step="1" value={row[col] || ""} onChange={(e) => { const u = [...table]; u[idx] = { ...u[idx], [col]: parseFloat(e.target.value) || 0 }; setTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0" />
                                        </div>
                                      </td>
                                    ))}
                                    <td className="px-1 py-1.5">
                                      <button type="button" onClick={() => setTable(table.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                        <Trash2 className="size-3" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                            <button type="button" onClick={() => setTable([...table, { maxLimit: 0, sep: 0, mep: 0, set: 0, met: 0 }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                              <Plus className="size-3" />Add Band
                            </button>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setTable(defaultTable)} className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors">Reset to defaults</button>
                              <span className="text-[10px] text-gray-300">|</span>
                              <button type="button" onClick={() => setTable([])} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}


              </div>
              )}

              {/* PA Rate Tables */}
              {productCode === "PA" && (<>
              {/* ── Flight Risk / On-Duty Crew PA Rate Table (1D: limit only) ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Crew / Pax PA Rate Table — Flight Risk / On-Duty</h3>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Rate as % of sum insured per seat, by benefit limit band. Aircraft-based — applies to Flight Risk and On-Duty Crew PA plus Pax PA coverages.</p>

                {paRateTable.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">No Flight Risk / On-Duty PA rate bands configured.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => setPaRateTable(defaultPaRateTable)} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                        <Zap className="size-3 inline mr-1" />Load Default Template
                      </button>
                      <button type="button" onClick={() => setPaRateTable([{ maxLimit: 0, flightRiskOnly: 0, twentyFourHour: 0 }])} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                        <Plus className="size-3 inline mr-1" />Add Empty Row
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-44">Benefit Limit ({rateTableCurrency})</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">Rate %</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paRateTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                  <input type="number" min="0" step="1000" value={row.maxLimit || ""} onChange={(e) => { const u = [...paRateTable]; u[idx] = { ...u[idx], maxLimit: parseFloat(e.target.value) || 0 }; setPaRateTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" min="0" step="0.001" value={row.flightRiskOnly || ""} onChange={(e) => { const u = [...paRateTable]; u[idx] = { ...u[idx], flightRiskOnly: parseFloat(e.target.value) || 0 }; setPaRateTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0.000%" />
                              </td>
                              <td className="px-1 py-1.5">
                                <button type="button" onClick={() => setPaRateTable(paRateTable.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                  <Trash2 className="size-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                      <button type="button" onClick={() => setPaRateTable([...paRateTable, { maxLimit: 0, flightRiskOnly: 0, twentyFourHour: 0 }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                        <Plus className="size-3" />Add Band
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setPaRateTable(defaultPaRateTable)} className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors">Reset to defaults</button>
                        <span className="text-[10px] text-gray-300">|</span>
                        <button type="button" onClick={() => setPaRateTable([])} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 24-Hour Crew PA Rate Table (2D: Sum Insured × Age Band) ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Crew PA Rate Table — 24 Hour</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Person-based — rated by sum insured &amp; crew member age</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Rate as % of sum insured per crew member, by benefit limit band and crew member age band. Person-based — applies to 24-Hour Crew PA coverage (no aircraft schedule).</p>

                {pa24hAgeBands.length === 0 && pa24hRateTable.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">No 24-Hour PA rate table configured.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => { setPa24hAgeBands(defaultPa24hAgeBands); setPa24hRateTable(defaultPa24hRateTable); }} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                        <Zap className="size-3 inline mr-1" />Load Default Template
                      </button>
                      <button type="button" onClick={() => { setPa24hAgeBands([{ minAge: 0, maxAge: 0 }]); setPa24hRateTable([{ maxLimit: 0, rates: [0] }]); }} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                        <Plus className="size-3 inline mr-1" />Start from Scratch
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Age Bands Configuration */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">Age Bands (columns)</span>
                        <button type="button" onClick={() => {
                          const newBands = [...pa24hAgeBands, { minAge: 0, maxAge: 0 }];
                          setPa24hAgeBands(newBands);
                          setPa24hRateTable(pa24hRateTable.map(r => ({ ...r, rates: [...r.rates, 0] })));
                        }} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                          <Plus className="size-3" />Add Age Band
                        </button>
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        {pa24hAgeBands.map((band, i) => (
                          <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                            <input type="number" min="0" max="120" value={band.minAge || ""} onChange={(e) => { const u = [...pa24hAgeBands]; u[i] = { ...u[i], minAge: parseInt(e.target.value) || 0 }; setPa24hAgeBands(u); }} className="w-10 bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-0.5 py-0 text-xs text-gray-700 text-center" placeholder="0" />
                            <span className="text-[10px] text-gray-400">–</span>
                            <input type="number" min="0" max="120" value={band.maxAge || ""} onChange={(e) => { const u = [...pa24hAgeBands]; u[i] = { ...u[i], maxAge: parseInt(e.target.value) || 0 }; setPa24hAgeBands(u); }} className="w-10 bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-0.5 py-0 text-xs text-gray-700 text-center" placeholder="0" />
                            <span className="text-[10px] text-gray-400 mr-1">yrs</span>
                            <button type="button" onClick={() => {
                              setPa24hAgeBands(pa24hAgeBands.filter((_, j) => j !== i));
                              setPa24hRateTable(pa24hRateTable.map(r => ({ ...r, rates: r.rates.filter((_, j) => j !== i) })));
                            }} className="p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                              <Trash2 className="size-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2D Rate Matrix */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 min-w-[140px] sticky left-0 bg-gray-50">Sum Insured ({rateTableCurrency})</th>
                              {pa24hAgeBands.map((band, i) => (
                                <th key={i} className="text-center px-2 py-2 text-xs font-semibold text-gray-600 min-w-[80px]">
                                  {band.minAge}–{band.maxAge}
                                </th>
                              ))}
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pa24hRateTable.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="px-2 py-1.5 sticky left-0 bg-white">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                    <input type="number" min="0" step="1000" value={row.maxLimit || ""} onChange={(e) => { const u = [...pa24hRateTable]; u[idx] = { ...u[idx], maxLimit: parseFloat(e.target.value) || 0 }; setPa24hRateTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                  </div>
                                </td>
                                {pa24hAgeBands.map((_, colIdx) => (
                                  <td key={colIdx} className="px-2 py-1.5">
                                    <input type="number" min="0" step="0.001" value={row.rates[colIdx] || ""} onChange={(e) => {
                                      const u = [...pa24hRateTable];
                                      const newRates = [...(u[idx].rates || [])];
                                      newRates[colIdx] = parseFloat(e.target.value) || 0;
                                      u[idx] = { ...u[idx], rates: newRates };
                                      setPa24hRateTable(u);
                                    }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0.000" />
                                  </td>
                                ))}
                                <td className="px-1 py-1.5">
                                  <button type="button" onClick={() => setPa24hRateTable(pa24hRateTable.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                    <Trash2 className="size-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                        <button type="button" onClick={() => setPa24hRateTable([...pa24hRateTable, { maxLimit: 0, rates: pa24hAgeBands.map(() => 0) }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                          <Plus className="size-3" />Add Sum Insured Band
                        </button>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { setPa24hAgeBands(defaultPa24hAgeBands); setPa24hRateTable(defaultPa24hRateTable); }} className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors">Reset to defaults</button>
                          <span className="text-[10px] text-gray-300">|</span>
                          <button type="button" onClick={() => { setPa24hAgeBands([]); setPa24hRateTable([]); }} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </>)}

              {/* LOL Rate Table (2D: Sum Insured × Age) */}
              {productCode === "LOL" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-base font-semibold text-gray-900">Loss of Licence Rate Table</h3>
                </div>
                <p className="text-xs text-gray-500">Rate as % of sum insured per pilot, by benefit limit band and pilot age band. If the benefit limit or age falls between bands, the next highest band rate applies.</p>

                {lolAgeBands.length === 0 && lolRateTable.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">No LOL rate table configured.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => { setLolAgeBands(defaultLolAgeBands); setLolRateTable(defaultLolRateTable); }} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                        <Zap className="size-3 inline mr-1" />Load Default Template
                      </button>
                      <button type="button" onClick={() => { setLolAgeBands([{ minAge: 0, maxAge: 0 }]); setLolRateTable([{ maxLimit: 0, rates: [0] }]); }} className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                        <Plus className="size-3 inline mr-1" />Start from Scratch
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Age Bands Configuration */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">Age Bands (columns)</span>
                        <button type="button" onClick={() => {
                          const newBands = [...lolAgeBands, { minAge: 0, maxAge: 0 }];
                          setLolAgeBands(newBands);
                          setLolRateTable(lolRateTable.map(r => ({ ...r, rates: [...r.rates, 0] })));
                        }} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                          <Plus className="size-3" />Add Age Band
                        </button>
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        {lolAgeBands.map((band, i) => (
                          <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                            <input type="number" min="0" max="120" value={band.minAge || ""} onChange={(e) => { const u = [...lolAgeBands]; u[i] = { ...u[i], minAge: parseInt(e.target.value) || 0 }; setLolAgeBands(u); }} className="w-10 bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-0.5 py-0 text-xs text-gray-700 text-center" placeholder="0" />
                            <span className="text-[10px] text-gray-400">–</span>
                            <input type="number" min="0" max="120" value={band.maxAge || ""} onChange={(e) => { const u = [...lolAgeBands]; u[i] = { ...u[i], maxAge: parseInt(e.target.value) || 0 }; setLolAgeBands(u); }} className="w-10 bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-0.5 py-0 text-xs text-gray-700 text-center" placeholder="0" />
                            <span className="text-[10px] text-gray-400 mr-1">yrs</span>
                            <button type="button" onClick={() => {
                              setLolAgeBands(lolAgeBands.filter((_, j) => j !== i));
                              setLolRateTable(lolRateTable.map(r => ({ ...r, rates: r.rates.filter((_, j) => j !== i) })));
                            }} className="p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                              <Trash2 className="size-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2D Rate Matrix */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 min-w-[140px] sticky left-0 bg-gray-50">Sum Insured ({rateTableCurrency})</th>
                              {lolAgeBands.map((band, i) => (
                                <th key={i} className="text-center px-2 py-2 text-xs font-semibold text-gray-600 min-w-[80px]">
                                  {band.minAge}–{band.maxAge}
                                </th>
                              ))}
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {lolRateTable.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="px-2 py-1.5 sticky left-0 bg-white">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 font-medium">{rateTableCurrency}</span>
                                    <input type="number" min="0" step="1000" value={row.maxLimit || ""} onChange={(e) => { const u = [...lolRateTable]; u[idx] = { ...u[idx], maxLimit: parseFloat(e.target.value) || 0 }; setLolRateTable(u); }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-900 font-medium text-right" placeholder="0" />
                                  </div>
                                </td>
                                {lolAgeBands.map((_, colIdx) => (
                                  <td key={colIdx} className="px-2 py-1.5">
                                    <input type="number" min="0" step="0.001" value={row.rates[colIdx] || ""} onChange={(e) => {
                                      const u = [...lolRateTable];
                                      const newRates = [...(u[idx].rates || [])];
                                      newRates[colIdx] = parseFloat(e.target.value) || 0;
                                      u[idx] = { ...u[idx], rates: newRates };
                                      setLolRateTable(u);
                                    }} className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-amber-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-700 text-center" placeholder="0.000" />
                                  </td>
                                ))}
                                <td className="px-1 py-1.5">
                                  <button type="button" onClick={() => setLolRateTable(lolRateTable.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                    <Trash2 className="size-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                        <button type="button" onClick={() => setLolRateTable([...lolRateTable, { maxLimit: 0, rates: lolAgeBands.map(() => 0) }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                          <Plus className="size-3" />Add Sum Insured Band
                        </button>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { setLolAgeBands(defaultLolAgeBands); setLolRateTable(defaultLolRateTable); }} className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors">Reset to defaults</button>
                          <span className="text-[10px] text-gray-300">|</span>
                          <button type="button" onClick={() => { setLolAgeBands([]); setLolRateTable([]); }} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Age Loadings */}
              {productCode !== 'PA' && productCode !== 'LOL' && productCode !== 'HD' && productCode !== 'UAS' && <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-base font-semibold text-gray-900">Aircraft Age Loadings</h3>
                  <button type="button" onClick={() => setRatingAgeLoadings([...ratingAgeLoadings, { fromYears: 0, toYears: 10, loadingPercent: 0 }])} className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all">
                    <Plus className="size-3 inline mr-1" />Add Band
                  </button>
                </div>
                {ratingAgeLoadings.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No age loading bands configured. Premium will not be adjusted for aircraft age.</p>
                ) : (
                  <div className="space-y-2">
                    {ratingAgeLoadings.map((band, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">From</span>
                          <Input type="number" min="0" value={band.fromYears} onChange={(e) => { const u = [...ratingAgeLoadings]; u[idx] = { ...u[idx], fromYears: parseInt(e.target.value) || 0 }; setRatingAgeLoadings(u); }} className="w-20 border-gray-300 text-sm" />
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">to</span>
                          <Input type="number" min="0" value={band.toYears} onChange={(e) => { const u = [...ratingAgeLoadings]; u[idx] = { ...u[idx], toYears: parseInt(e.target.value) || 0 }; setRatingAgeLoadings(u); }} className="w-20 border-gray-300 text-sm" />
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">years &rarr;</span>
                          <Input type="number" step="0.01" min="0" value={band.loadingPercent} onChange={(e) => { const u = [...ratingAgeLoadings]; u[idx] = { ...u[idx], loadingPercent: parseFloat(e.target.value) || 0 }; setRatingAgeLoadings(u); }} className="w-24 border-gray-300 text-sm" />
                          <span className="text-xs text-gray-500 font-medium">% loading</span>
                        </div>
                        <button type="button" onClick={() => setRatingAgeLoadings(ratingAgeLoadings.filter((_, i) => i !== idx))} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>}


            </div>
            </>}

            {/* ═══════════════════ TAB: Commission ═══════════════════ */}
            {formTab === "commission" && <>
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Commission
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Insurance Composite Brokerage (%) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={insuranceCompositeBrokerage}
                    onChange={(e) => setInsuranceCompositeBrokerage(e.target.value)}
                    placeholder="e.g., 10"
                    className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Reinsurance Composite Brokerage (%) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={reinsuranceCompositeBrokerage}
                    onChange={(e) => setReinsuranceCompositeBrokerage(e.target.value)}
                    placeholder="e.g., 5"
                    className="border-gray-300 focus:border-[#004225] focus:ring-[#004225]"
                  />
                </div>
              </div>
            </div>
            </>}

            {/* ═══════════════════ TAB: Security ═══════════════════ */}
            {formTab === "security" && <>
            {/* Underwriters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Underwriters</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Total allocation: {totalPercentage.toFixed(2)}%
                    {totalPercentage !== 100 && (
                      <span className="text-yellow-600 ml-2">
                        (Must total 100%)
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleAddUnderwriter}
                  className="bg-[#004225] hover:bg-[#003319] text-white"
                >
                  <Plus className="size-4 mr-2" />
                  Add Underwriter
                </Button>
              </div>

              <div className="space-y-3">
                {underwriters.map((underwriter, index) => (
                  <div
                    key={underwriter.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Underwriter {index + 1}
                      </h4>
                      {underwriters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUnderwriter(underwriter.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Underwriter Name *
                        </label>
                        <Input
                          value={underwriter.name}
                          onChange={(e) =>
                            handleUnderwriterChange(underwriter.id, "name", e.target.value)
                          }
                          placeholder="e.g., Lloyd's Syndicate 123"
                          className="border-gray-300 focus:border-[#004225] focus:ring-[#004225] h-[38px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Percentage (%) *
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={underwriter.percentage}
                          onChange={(e) =>
                            handleUnderwriterChange(
                              underwriter.id,
                              "percentage",
                              e.target.value
                            )
                          }
                          placeholder="e.g., 25"
                          className="border-gray-300 focus:border-[#004225] focus:ring-[#004225] h-[38px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Role *
                        </label>
                        <select
                          value={underwriter.role}
                          onChange={(e) =>
                            handleUnderwriterChange(underwriter.id, "role", e.target.value as "Lead" | "Delegated Support")
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-[#004225] h-[38px]"
                        >
                          <option value="Lead">Lead</option>
                          <option value="Delegated Support">Delegated Support</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authorised Underwriter Contacts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Authorised Underwriter Contacts</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select underwriter contacts who can quote on risks and view reports for this lineslip
                  </p>
                </div>
                {underwriterContacts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllUnderwriters}
                      className="text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAllUnderwriters}
                      className="text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {underwriterContacts.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <UserCheck className="size-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No underwriter contacts available</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add underwriter contacts in the Contact Manager first, then assign them here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Dropdown search picker */}
                  <div className="relative" ref={uwDropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        value={uwSearchQuery}
                        onChange={(e) => {
                          setUwSearchQuery(e.target.value);
                          setUwDropdownOpen(true);
                        }}
                        onFocus={() => setUwDropdownOpen(true)}
                        placeholder="Search and add underwriters by name, company, or email..."
                        className="pl-10 pr-10 border-gray-300 focus:border-[#004225] focus:ring-[#004225] h-[38px]"
                      />
                      <button
                        type="button"
                        onClick={() => setUwDropdownOpen(!uwDropdownOpen)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronsUpDown className="size-4" />
                      </button>
                    </div>

                    {/* Dropdown list */}
                    {uwDropdownOpen && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[220px] overflow-y-auto">
                        {filteredUnderwriterContacts.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {uwSearchQuery ? `No underwriters match "${uwSearchQuery}"` : "No underwriters available"}
                          </div>
                        ) : (
                          filteredUnderwriterContacts.map((contact) => {
                            const isSelected = authorisedUnderwriterIds.includes(contact.id);
                            return (
                              <button
                                key={contact.id}
                                type="button"
                                onClick={() => toggleAuthorisedUnderwriter(contact.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                                  isSelected ? "bg-[#004225]/5" : "hover:bg-gray-50"
                                }`}
                              >
                                <div
                                  className={`rounded flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected ? "bg-[#004225] text-white" : "border-2 border-gray-300"
                                  }`}
                                  style={{ width: 18, height: 18 }}
                                >
                                  {isSelected && <Check className="size-3" />}
                                </div>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                  {contact.firstName?.[0]}{contact.lastName?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-900">
                                    {contact.firstName} {contact.lastName}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-2">{contact.company}</span>
                                </div>
                                <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{contact.email}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected underwriters table */}
                  {authorisedUnderwriterIds.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center">
                        <UserCheck className="size-4 text-[#004225] mr-2" />
                        <span className="text-xs font-semibold text-gray-700">
                          {authorisedUnderwriterIds.length} underwriter{authorisedUnderwriterIds.length !== 1 ? "s" : ""} authorised
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                        {authorisedUnderwriterIds.map((id) => {
                          const c = contacts.find((ct) => ct.id === id);
                          if (!c) return null;
                          return (
                            <div key={id} className="flex items-center gap-3 px-4 py-2 bg-white hover:bg-gray-50/50 transition-colors">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                {c.firstName?.[0]}{c.lastName?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                              </div>
                              <span className="text-xs text-gray-500">{c.company}</span>
                              <span className="text-xs text-gray-400 hidden lg:inline">{c.email}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                {c.role || "Underwriter"}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleAuthorisedUnderwriter(id)}
                                className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            </>}

            {/* ═══════════════════ TAB: Policy Wordings ═══════════════════ */}
            {formTab === "wordings" && <>
            {/* Policy Wordings — Slip Template */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Policy Wordings *</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {sortedSections.length} section{sortedSections.length !== 1 ? "s" : ""} &middot; 
                    {" "}{sortedSections.filter((s) => s.type === "variable").length} variable, {sortedSections.filter((s) => s.type === "fixed").length} fixed
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleAddSection}
                  className="bg-[#004225] hover:bg-[#003319] text-white"
                >
                  <Plus className="size-4 mr-2" />
                  Add Section
                </Button>
              </div>

              {/* Placement Type Toggle — Insurance vs Reinsurance */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Template Type</span>
                <div className="flex bg-white border border-gray-200 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setPlacementType("insurance"); setExpandedSection(null); }}
                    className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                      placementType === "insurance"
                        ? "bg-[#004225] text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Insurance
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPlacementType("reinsurance"); setExpandedSection(null); }}
                    className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                      placementType === "reinsurance"
                        ? "bg-[#004225] text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Reinsurance
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 ml-1">
                  {placementType === "insurance" ? "Direct insurance wordings — no Reinsured section" : "Reinsurance wordings — includes Reinsured & cedent clauses"}
                </span>
              </div>

              {/* PA Wording Variant Toggle — only shown for Personal Accident product */}
              {productCode === "PA" && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">PA Wording</span>
                  <div className="flex bg-white border border-amber-200 rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setPaWordingVariant("standard"); setExpandedSection(null); }}
                      className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                        paWordingVariant === "standard"
                          ? "bg-amber-600 text-white"
                          : "text-gray-600 hover:bg-amber-50"
                      }`}
                    >
                      Crew PA / Pax PA
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPaWordingVariant("24_hour"); setExpandedSection(null); }}
                      className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                        paWordingVariant === "24_hour"
                          ? "bg-amber-600 text-white"
                          : "text-gray-600 hover:bg-amber-50"
                      }`}
                    >
                      Crew PA 24-Hour
                    </button>
                  </div>
                  <span className="text-[10px] text-amber-600 ml-1">
                    {paWordingVariant === "standard"
                      ? "Aircraft-based — Flight Risk & On-Duty Crew PA + Pax PA"
                      : "Person-based — 24-Hour Crew PA (named crew, no aircraft schedule)"}
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Build the slip template below. <strong>Variable</strong> sections contain <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px] font-mono">{"{{placeholders}}"}</code> that auto-populate from each submission. <strong>Fixed</strong> sections remain unchanged across all placements.
              </p>

              {/* Section List */}
              <div className="space-y-2">
                {sortedSections.map((section, idx) => {
                  const isExpanded = expandedSection === section.id;
                  const placeholderCount = countPlaceholders(section.content);
                  return (
                    <div
                      key={section.id}
                      className={`border rounded-lg overflow-hidden transition-colors ${
                        isExpanded ? "border-[#004225]/30 bg-white" : "border-gray-200 bg-gray-50/50"
                      }`}
                    >
                      {/* Section header row */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveSection(section.id, "up")}
                            disabled={idx === 0}
                            className="text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSection(section.id, "down")}
                            disabled={idx === sortedSections.length - 1}
                            className="text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="size-3" />
                          </button>
                        </div>

                        {/* Section number */}
                        <span className="text-[10px] font-bold text-gray-400 w-5 text-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Expand/collapse toggle + title */}
                        <button
                          type="button"
                          onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                        >
                          <ChevronDown
                            className={`size-4 text-gray-400 shrink-0 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {section.title}
                          </span>
                        </button>

                        {/* Type badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleSectionType(section.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors ${
                            section.type === "variable"
                              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                              : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                          }`}
                          title={`Click to toggle — currently ${section.type}. ${
                            section.type === "variable"
                              ? "Contains placeholders that change per submission"
                              : "Same content for every placement"
                          }`}
                        >
                          {section.type === "variable" ? (
                            <Unlock className="size-3" />
                          ) : (
                            <Lock className="size-3" />
                          )}
                          {section.type}
                        </button>

                        {/* Placeholder count for variable sections */}
                        {section.type === "variable" && placeholderCount > 0 && (
                          <span className="text-[10px] text-blue-500 font-medium shrink-0">
                            {placeholderCount} field{placeholderCount !== 1 ? "s" : ""}
                          </span>
                        )}

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(section.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      {/* Expanded editor */}
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
                          {/* Editable title */}
                          <div className="pt-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                              Section Title
                            </label>
                            <Input
                              value={section.title}
                              onChange={(e) => handleSectionChange(section.id, "title", e.target.value)}
                              className="border-gray-300 focus:border-[#004225] focus:ring-[#004225] h-8 text-sm font-medium"
                            />
                          </div>

                          {/* Content editor */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Content
                              </label>
                              {section.type === "variable" && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowPlaceholderPicker(
                                        showPlaceholderPicker === section.id ? null : section.id
                                      )
                                    }
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                                  >
                                    <Plus className="size-3" />
                                    Insert Placeholder
                                  </button>

                                  {/* Placeholder picker dropdown */}
                                  {showPlaceholderPicker === section.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowPlaceholderPicker(null)}
                                      />
                                      <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                                        {availablePlaceholders.map((ph) => (
                                          <button
                                            key={ph.tag}
                                            type="button"
                                            onClick={() => insertPlaceholder(section.id, ph.tag)}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                                          >
                                            <code className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded shrink-0">
                                              {ph.tag}
                                            </code>
                                            <span className="text-xs text-gray-600 truncate">
                                              {ph.label}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <textarea
                              ref={(el) => {
                                textareaRefs.current[section.id] = el;
                              }}
                              value={section.content}
                              onChange={(e) => handleSectionChange(section.id, "content", e.target.value)}
                              rows={Math.max(3, section.content.split("\n").length + 1)}
                              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-[#004225] text-xs font-mono leading-relaxed resize-y"
                            />
                            {/* Highlight placeholders found in content */}
                            {section.type === "variable" && placeholderCount > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {(section.content.match(/\{\{[^}]+\}\}/g) || []).map((tag, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[10px] font-mono text-blue-700"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {sortedSections.length === 0 && (
                <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-400">No slip sections defined.</p>
                  <Button
                    type="button"
                    onClick={() => {
                      const subType = productCode === "PA" && paWordingVariant === "24_hour" ? "24_hour" : undefined;
                      setSlipSections(getDefaultSlipSections(placementType, productCode, subType));
                    }}
                    className="mt-2 bg-[#004225] hover:bg-[#003319] text-white text-xs"
                  >
                    Load Default {placementType === "insurance" ? "Insurance" : "Reinsurance"}{productCode === "PA" ? (paWordingVariant === "24_hour" ? " (24-Hour PA)" : " (PA)") : ""} Template
                  </Button>
                </div>
              )}

              {/* Hidden required validation */}
              <input
                type="text"
                value={slipSections.length > 0 ? "valid" : ""}
                onChange={() => {}}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            </>}

            {/* ═══════════════════ TAB: Generated Docs ═══════════════════ */}
            {formTab === "documents" && <>
          {/* ─── EOC Covering Letter Configuration ─── */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 rounded-lg bg-amber-100">
                <File className="size-4 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">EOC Covering Letter</h3>
                <p className="text-xs text-gray-500">Configure each section of the Evidence of Cover letter. Use <code className="bg-amber-50 text-amber-700 px-1 py-0.5 rounded text-[10px] font-mono">{"{{placeholders}}"}</code> for dynamic data.</p>
              </div>
            </div>

            {/* EOC Template Type Toggle — Insurance vs Reinsurance */}
            <div className="ml-10 mt-3 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Template Type</span>
              <div className="flex bg-white border border-gray-200 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEocTemplateType("insurance")}
                  className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                    eocTemplateType === "insurance"
                      ? "bg-amber-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Insurance
                </button>
                <button
                  type="button"
                  onClick={() => setEocTemplateType("reinsurance")}
                  className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                    eocTemplateType === "reinsurance"
                      ? "bg-amber-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Reinsurance
                </button>
              </div>
              <span className="text-[10px] text-gray-400 ml-1">
                {eocTemplateType === "insurance"
                  ? "Direct insurance EOC — addressed to insured"
                  : "Reinsurance EOC — addressed to producing broker, includes cedent clauses"}
              </span>
            </div>

            <div className="ml-10 space-y-3 mt-3">
              {/* 0. Sender Address (top-left of PDF, opposite logo) */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sender Address</span>
                  <span className="text-[10px] text-amber-600 font-mono">Top-left (opposite logo)</span>
                </div>
                <textarea
                  value={eocSenderAddress}
                  onChange={(e) => setEocSenderAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y font-mono text-gray-800"
                />
              </div>

              {/* 1. Client Details */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">1. Client Details</span>
                  <span className="text-[10px] text-amber-600 font-mono">{eocTemplateType === "reinsurance" ? "{{Producing Broker Details}}" : "{{Insured Name}}"}</span>
                </div>
                <textarea
                  value={eocClientDetails}
                  onChange={(e) => setEocClientDetails(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y font-mono text-gray-800"
                />
              </div>

              {/* 2. Date */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">2. Date</span>
                  <span className="text-[10px] text-amber-600 font-mono">{"{{Date Bound}}"}</span>
                </div>
                <input
                  type="text"
                  value={eocDateLine}
                  onChange={(e) => setEocDateLine(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-mono text-gray-800"
                />
              </div>

              {/* 3. Subject */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">3. Subject</span>
                  <span className="text-[10px] text-amber-600 font-mono truncate ml-2">{eocTemplateType === "reinsurance" ? "{{Reinsured}}, {{Insured}}, {{Product}}, ..." : "{{Product}}"}</span>
                </div>
                <textarea
                  value={eocSubjectLine}
                  onChange={(e) => setEocSubjectLine(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y font-mono text-gray-800"
                />
              </div>

              {/* 4. Welcome Text */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">4. Welcome Text</span>
                </div>
                <textarea
                  value={eocWelcomeText}
                  onChange={(e) => setEocWelcomeText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y text-gray-800"
                />
              </div>

              {/* 5. Premium Payment Terms */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">5. Premium Payment Terms</span>
                </div>
                <textarea
                  value={eocPremiumPaymentTerms}
                  onChange={(e) => setEocPremiumPaymentTerms(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y text-gray-800"
                />
              </div>

              {/* 6. Commission */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">6. Commission</span>
                  <span className="text-[10px] text-amber-600 font-mono truncate ml-2">{"{{Broker Split}}, {{Producing Broker}}"}</span>
                </div>
                <textarea
                  value={eocCommission}
                  onChange={(e) => setEocCommission(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y text-gray-800"
                />
              </div>

              {/* 7. Terms and Conditions */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">7. Terms and Conditions</span>
                </div>
                <textarea
                  value={eocTermsAndConditions}
                  onChange={(e) => setEocTermsAndConditions(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y text-gray-800"
                />
              </div>

              {/* 8. Duty of Disclosure */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">8. Duty of Disclosure</span>
                </div>
                <textarea
                  value={eocDutyOfDisclosure}
                  onChange={(e) => setEocDutyOfDisclosure(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y text-gray-800"
                />
              </div>

              <p className="text-[10px] text-gray-400 mt-1">
                Use <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">{"{{placeholder}}"}</code> syntax for values that auto-populate from placement data at PDF generation time.
              </p>
            </div>
          </div>

          {/* ─── Claims Document Configuration ─── */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 rounded-lg bg-purple-100">
                <File className="size-4 text-purple-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Claims Notification Procedures</h3>
                <p className="text-xs text-gray-500">Configure the claims contact and notification document generated for bound placements on this lineslip</p>
              </div>
            </div>
            <div className="space-y-4 ml-10">
              {/* Claims contact details */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Claims Contact Details</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={claimsContactName}
                      onChange={(e) => setClaimsContactName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Company</label>
                    <input
                      type="text"
                      value={claimsHandlerCompany}
                      onChange={(e) => setClaimsHandlerCompany(e.target.value)}
                      placeholder="e.g. AeroCover Claims"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={claimsContactEmail}
                      onChange={(e) => setClaimsContactEmail(e.target.value)}
                      placeholder="claims@example.com"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={claimsContactPhone}
                      onChange={(e) => setClaimsContactPhone(e.target.value)}
                      placeholder="+44 20 7000 0000"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">Leave fields blank to default to the placing broker's details on each bound placement</p>
              </div>

              {/* Notification period */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notification Period</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={claimsNotifDays}
                    onChange={(e) => setClaimsNotifDays(e.target.value)}
                    className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  />
                  <span className="text-xs text-gray-500">days from the insured becoming aware of an incident (default: 7)</span>
                </div>
              </div>

              {/* Additional procedures */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Additional Procedures</label>
                <textarea
                  value={claimsAdditionalProc}
                  onChange={(e) => setClaimsAdditionalProc(e.target.value)}
                  placeholder="Add any additional claims procedures, special requirements, or bespoke instructions specific to this lineslip..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white resize-y"
                />
                <p className="text-[10px] text-gray-400 mt-1">This will appear as a separate numbered section in the claims document. Leave blank to omit.</p>
              </div>
            </div>
          </div>
            </>}

            {/* ═══════════════════ TAB: Notifications ═══════════════════ */}
            {formTab === "notifications" && <>
              <EmailTemplatePreview />
            </>}

          </div>
          </div>

          {/* Footer — always visible */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <Button
              type="button"
              onClick={onCancel}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-5 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={totalPercentage !== 100}
              className="bg-[#004225] hover:bg-[#003319] text-white font-semibold px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#004225]"
            >
              {lineslip ? `Update ${entityLabel}` : `Create ${entityLabel}`}
            </Button>
          </div>
        </form>}
      </div>
    </div>
  );
}
