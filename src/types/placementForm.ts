/**
 * Type definitions for PlacementForm component
 */

// Aircraft interface for fleet management
export interface Aircraft {
  registration: string;
  aircraftType: string;
  engineType: string;
  make: string;
  model: string;
  baseCountry?: string;
  baseRegion?: string;
  crewSeats: string;
  paxSeats: string;
  isDualCrew: boolean;
  hullDeductible: string;
  hullDeductibleCurrency: string;
  aircraftAgreedValue: string;
  aircraftAgreedValueCurrency: string;
  liabilityLimit: string;
  liabilityLimitCurrency: string;
  sumsReinsured: string;
  sumsReinsuredCurrency: string;
  crewSumsReinsuredPerSeat: string;
  crewSumsReinsuredCurrency: string;
  crewTotalPerOccurrence: string;
  crewTotalPerOccurrenceCurrency: string;
  paxSumsReinsuredPerSeat: string;
  paxSumsReinsuredCurrency: string;
  paxTotalPerOccurrence: string;
  paxTotalPerOccurrenceCurrency: string;
  standardUses: string[];
  specialUses: string[];
  specialUsesOther: string;
  excludedCountries: string[];
  taxType: string; // "addition" or "deduction"
  taxPercentage: string;
  taxName: string;
}

export interface CrewMember {
  name: string;
  age: string;
  position: string;
  sumsInsured: string;
  sumsInsuredCurrency: string;
}

export interface LOLPilot {
  name: string;
  age: string;
  position: string;
  salary: string;
  salaryCurrency: string;
  sumsInsured: string;
  sumsInsuredCurrency: string;
  taxType: string;
  taxPercentage: string;
  taxName: string;
}

export interface AdditionalInsured {
  name: string;
  addressLine1: string;
  city: string;
  country: string;
  postcode: string;
}

export interface ClaimHistory {
  claimDate: string;
  claimType: string;
  claimTypeOther: string;
  amountClaimed: string;
  amountClaimedCurrency: string;
  amountPaid: string;
  amountPaidCurrency: string;
  claimStatus: string;
  description: string;
}