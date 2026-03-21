/**
 * ICAO Aircraft Type Code Lookup
 * Maps ICAO type codes to aircraft class, engine count, and engine type
 */

export interface ICAOAircraftData {
  class: 'LandPlane' | 'Helicopter' | 'Amphibian' | 'Seaplane' | 'Gyrocopter' | 'Tiltwing';
  engineCount: number;
  engineType: 'Piston' | 'Turboprop' | 'Jet' | 'Electric' | 'Rocket';
}

/**
 * ICAO Type Code Lookup Table
 * Based on ICAO aircraft type designators
 */
export const ICAO_LOOKUP: Record<string, ICAOAircraftData> = {
  // Piper Aircraft - Single Engine Piston
  'P28A': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-28 Cherokee
  'P28B': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-28 Cherokee
  'P28R': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-28R Arrow
  'P28S': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-28 Dakota
  'P28T': { class: 'LandPlane', engineCount: 1, engineType: 'Turboprop' }, // PA-28 Turbo
  'PA22': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-22 Tri-Pacer
  'PA24': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-24 Comanche
  'PA32': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-32 Cherokee Six
  'PA34': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' }, // PA-34 Seneca
  'PA38': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-38 Tomahawk
  'PA44': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' }, // PA-44 Seminole
  'PA46': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // PA-46 Malibu
  'PA30': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' }, // PA-30 Twin Comanche
  'PA31': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // PA-31 Navajo

  // Cessna Aircraft - Single Engine Piston
  'C150': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C152': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C162': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C170': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C172': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Skyhawk
  'C175': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C177': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C180': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C182': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Skylane
  'C185': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C206': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C207': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'C208': { class: 'LandPlane', engineCount: 1, engineType: 'Turboprop' }, // Caravan
  'C210': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  
  // Cessna Multi-Engine
  'C303': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },
  'C310': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },
  'C337': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' }, // Skymaster
  'C340': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },
  'C402': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },
  'C404': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },
  'C414': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },
  'C421': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },
  'C441': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' },
  
  // Cessna Citations (Jets)
  'C500': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Citation I
  'C501': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' },
  'C510': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Citation Mustang
  'C525': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // CitationJet
  'C550': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Citation II
  'C560': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Citation V
  'C650': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Citation III
  'C680': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Citation Sovereign
  'C750': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Citation X

  // Beechcraft - Single Engine
  'BE19': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Musketeer
  'BE23': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Sundowner
  'BE24': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Sierra
  'BE33': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Bonanza
  'BE35': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Bonanza V-tail
  'BE36': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Bonanza
  
  // Beechcraft - Multi Engine
  'BE40': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Beechjet
  'BE50': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' }, // Twin Bonanza
  'BE55': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' }, // Baron
  'BE58': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' }, // Baron
  'BE60': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // Duke
  'BE76': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' }, // Duchess
  'BE90': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air
  'BE20': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air
  'BE30': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air
  'BE9L': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air
  'BE9T': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air
  'B190': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air
  'B200': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air
  'B300': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air
  'B350': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // King Air

  // Cirrus
  'SR20': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'SR22': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'SF50': { class: 'LandPlane', engineCount: 1, engineType: 'Jet' }, // Vision Jet

  // Diamond
  'DA20': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'DA40': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'DA42': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },
  'DA62': { class: 'LandPlane', engineCount: 2, engineType: 'Piston' },

  // Mooney
  'M20C': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'M20J': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'M20K': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'M20P': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },
  'M20T': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' },

  // Boeing Commercial
  'B703': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 707
  'B721': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 727
  'B732': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737-200
  'B733': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737-300
  'B734': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737-400
  'B735': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737-500
  'B736': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737-600
  'B737': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737-700
  'B738': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737-800
  'B739': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737-900
  'B37M': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737 MAX
  'B38M': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737 MAX 8
  'B39M': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 737 MAX 9
  'B742': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // 747-200
  'B743': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // 747-300
  'B744': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // 747-400
  'B748': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // 747-8
  'B752': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 757-200
  'B753': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 757-300
  'B762': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 767-200
  'B763': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 767-300
  'B764': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 767-400
  'B772': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 777-200
  'B773': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 777-300
  'B77L': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 777-200LR
  'B77W': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 777-300ER
  'B788': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 787-8
  'B789': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 787-9
  'B78X': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // 787-10

  // Airbus
  'A300': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' },
  'A306': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // A300-600
  'A310': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' },
  'A318': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' },
  'A319': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' },
  'A320': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' },
  'A321': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' },
  'A20N': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // A320neo
  'A21N': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // A321neo
  'A332': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // A330-200
  'A333': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // A330-300
  'A339': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // A330-900neo
  'A342': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // A340-200
  'A343': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // A340-300
  'A345': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // A340-500
  'A346': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // A340-600
  'A359': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // A350-900
  'A35K': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // A350-1000
  'A388': { class: 'LandPlane', engineCount: 4, engineType: 'Jet' }, // A380

  // Embraer Regional Jets
  'E120': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // Brasilia
  'E135': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // ERJ-135
  'E145': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // ERJ-145
  'E170': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // E-170
  'E175': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // E-175
  'E190': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // E-190
  'E195': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // E-195
  'E290': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // E-190-E2
  'E295': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // E-195-E2

  // Bombardier/De Havilland Canada
  'DH82': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Tiger Moth
  'DH8A': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // Dash 8-100
  'DH8B': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // Dash 8-200
  'DH8C': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // Dash 8-300
  'DH8D': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // Dash 8-400
  'DHC2': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Beaver
  'DHC3': { class: 'LandPlane', engineCount: 1, engineType: 'Piston' }, // Otter
  'DHC6': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // Twin Otter
  'CRJ1': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // CRJ-100
  'CRJ2': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // CRJ-200
  'CRJ7': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // CRJ-700
  'CRJ9': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // CRJ-900
  'CRJX': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // CRJ-1000

  // ATR Turboprops
  'AT43': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // ATR 42-300
  'AT45': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // ATR 42-500
  'AT72': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // ATR 72
  'AT73': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // ATR 72-500
  'AT75': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // ATR 72-600
  'AT76': { class: 'LandPlane', engineCount: 2, engineType: 'Turboprop' }, // ATR 72-600

  // Business Jets
  'GLF4': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Gulfstream IV
  'GLF5': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Gulfstream V
  'GLF6': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Gulfstream G650
  'GLEX': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Global Express
  'GL5T': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Global 5000
  'GL7T': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Global 7500
  'FA10': { class: 'LandPlane', engineCount: 3, engineType: 'Jet' }, // Falcon 900
  'FA20': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Falcon 2000
  'FA50': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Falcon 50
  'FA7X': { class: 'LandPlane', engineCount: 3, engineType: 'Jet' }, // Falcon 7X
  'LJ35': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Learjet 35
  'LJ45': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Learjet 45
  'LJ60': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' }, // Learjet 60

  // Pilatus
  'PC6T': { class: 'LandPlane', engineCount: 1, engineType: 'Turboprop' }, // Porter
  'PC12': { class: 'LandPlane', engineCount: 1, engineType: 'Turboprop' },
  'PC21': { class: 'LandPlane', engineCount: 1, engineType: 'Turboprop' },
  'PC24': { class: 'LandPlane', engineCount: 2, engineType: 'Jet' },

  // Socata/Daher
  'TBM7': { class: 'LandPlane', engineCount: 1, engineType: 'Turboprop' }, // TBM 700
  'TBM8': { class: 'LandPlane', engineCount: 1, engineType: 'Turboprop' }, // TBM 850
  'TBM9': { class: 'LandPlane', engineCount: 1, engineType: 'Turboprop' }, // TBM 900

  // Helicopters - Robinson
  'R22': { class: 'Helicopter', engineCount: 1, engineType: 'Piston' },
  'R44': { class: 'Helicopter', engineCount: 1, engineType: 'Piston' },
  'R66': { class: 'Helicopter', engineCount: 1, engineType: 'Turboprop' },

  // Helicopters - Bell
  'B06': { class: 'Helicopter', engineCount: 1, engineType: 'Piston' }, // Bell 47
  'B47': { class: 'Helicopter', engineCount: 1, engineType: 'Piston' }, // Bell 47
  'B47G': { class: 'Helicopter', engineCount: 1, engineType: 'Piston' }, // Bell 47G
  'B206': { class: 'Helicopter', engineCount: 1, engineType: 'Turboprop' }, // JetRanger
  'B407': { class: 'Helicopter', engineCount: 1, engineType: 'Turboprop' },
  'B412': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },
  'B429': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },

  // Helicopters - Airbus (Eurocopter)
  'AS50': { class: 'Helicopter', engineCount: 1, engineType: 'Turboprop' }, // Ecureuil
  'AS55': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' }, // Twin Squirrel
  'EC20': { class: 'Helicopter', engineCount: 1, engineType: 'Turboprop' }, // Colibri
  'EC30': { class: 'Helicopter', engineCount: 1, engineType: 'Turboprop' }, // Ecureuil
  'EC35': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },
  'EC45': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },
  'EC55': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },
  'H125': { class: 'Helicopter', engineCount: 1, engineType: 'Turboprop' },
  'H130': { class: 'Helicopter', engineCount: 1, engineType: 'Turboprop' },
  'H135': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },
  'H145': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },

  // Helicopters - Sikorsky
  'S55': { class: 'Helicopter', engineCount: 1, engineType: 'Piston' },
  'S58': { class: 'Helicopter', engineCount: 1, engineType: 'Piston' },
  'S61': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },
  'S76': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },
  'S92': { class: 'Helicopter', engineCount: 2, engineType: 'Turboprop' },

  // Add more as needed...
};

/**
 * Look up aircraft data by ICAO type code
 */
export function lookupICAOType(typeCode: string): ICAOAircraftData | null {
  const upperTypeCode = typeCode.toUpperCase();
  return ICAO_LOOKUP[upperTypeCode] || null;
}

/**
 * Map ICAO data to FLIGHTDECK aircraft type
 */
export function mapToAircraftType(icaoClass: string): string | null {
  const lowerClass = icaoClass.toLowerCase();
  
  if (lowerClass.includes('landplane')) return 'fixed-wing';
  if (lowerClass.includes('helicopter')) return 'rotary-wing';
  if (lowerClass.includes('seaplane')) return 'fixed-wing';
  if (lowerClass.includes('amphibian')) return 'fixed-wing';
  if (lowerClass.includes('gyrocopter')) return 'rotary-wing';
  if (lowerClass.includes('tiltwing')) return 'fixed-wing';
  
  return null;
}

/**
 * Map ICAO engine data to FLIGHTDECK engine type
 */
export function mapToEngineType(engineCount: number, engineType: string): string | null {
  const lowerType = engineType.toLowerCase();
  
  if (lowerType.includes('piston')) {
    return engineCount === 1 ? 'single-engine-piston' : 'multi-engine-piston';
  }
  
  if (lowerType.includes('turboprop')) {
    return engineCount === 1 ? 'single-engine-turboprop' : 'multi-engine-turboprop';
  }
  
  if (lowerType.includes('jet') || lowerType.includes('turbojet') || lowerType.includes('turbofan')) {
    return 'multi-engine-jet';
  }
  
  if (lowerType.includes('turbine')) {
    return engineCount === 1 ? 'single-engine-turbine' : 'multi-engine-turboprop';
  }
  
  if (lowerType.includes('electric')) {
    return 'single-engine-piston'; // Map electric to piston for now
  }
  
  return null;
}
