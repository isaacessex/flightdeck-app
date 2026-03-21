/**
 * JetAPI Integration Utilities
 * Handles aircraft lookup and data mapping for FLIGHTDECK platform
 */

import { toast } from "sonner";
import { projectId, publicAnonKey } from './supabase/info';
import { lookupICAOType, mapToAircraftType, mapToEngineType } from './icaoLookup';

export interface AircraftLookupResult {
  success: boolean;
  fieldsPopulated: number;
  data?: {
    make?: string;
    model?: string;
    aircraftType?: string;
    engineType?: string;
    crewSeats?: string;
    paxSeats?: string;
  };
  error?: string;
}

/**
 * Lookup aircraft by registration number using JetAPI
 */
export async function lookupAircraft(registration: string): Promise<AircraftLookupResult> {
  if (!registration.trim()) {
    return {
      success: false,
      fieldsPopulated: 0,
      error: "Registration number is required"
    };
  }

  try {
    console.log(`[JetAPI Client] Looking up aircraft: ${registration.trim()}`);
    console.log(`[JetAPI Client] Project ID: ${projectId}`);
    
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142/aircraft/lookup/${encodeURIComponent(registration.trim())}`;
    console.log(`[JetAPI Client] Request URL: ${url}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${publicAnonKey}`,
      },
    });

    console.log(`[JetAPI Client] Response status: ${response.status}`);
    
    const data = await response.json();
    console.log(`[JetAPI Client] Response data:`, data);

    if (!response.ok) {
      let errorMessage = "Failed to lookup aircraft";
      if (response.status === 404) {
        errorMessage = data.message || "Aircraft not found. This registration may not be in the JetAPI database - please enter details manually.";
      } else if (response.status === 401) {
        errorMessage = "JetAPI authentication failed. Please check your API key.";
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = data.error;
      }
      
      // Only log to console if it's NOT a simple "not found" case (those are expected)
      if (response.status !== 404) {
        console.warn(`[JetAPI Client] ${errorMessage}`);
        if (data.triedFormats) {
          console.log(`[JetAPI Client] Tried formats:`, data.triedFormats);
        }
      }
      
      return {
        success: false,
        fieldsPopulated: 0,
        error: errorMessage
      };
    }

    // Parse and map aircraft data
    console.log(`[JetAPI Client] Mapping aircraft data...`);
    const result = mapAircraftData(data.aircraft);
    console.log(`[JetAPI Client] Mapped result:`, result);
    
    return {
      success: true,
      fieldsPopulated: result.fieldsPopulated,
      data: result.data
    };
  } catch (error) {
    console.error("[JetAPI Client] Exception caught:", error);
    return {
      success: false,
      fieldsPopulated: 0,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Map JetAPI aircraft data to FLIGHTDECK form fields
 */
function mapAircraftData(aircraft: any): { fieldsPopulated: number; data: any } {
  let fieldsPopulated = 0;
  const data: any = {};

  console.log('[JetAPI Client] Raw aircraft data:', JSON.stringify(aircraft, null, 2));

  // Extract data from JetPhotos section
  const jetPhotos = aircraft?.JetPhotos;
  const flightRadar = aircraft?.FlightRadar;
  const icaoData = aircraft?.AircraftICAO?.[0]; // ICAO data is in an array
  
  console.log('[JetAPI Client] ICAO Data:', icaoData);
  
  // Get aircraft info from first JetPhotos image if available
  const firstImage = jetPhotos?.Images?.[0];
  const aircraftName = firstImage?.Aircraft || flightRadar?.Aircraft;
  
  console.log('[JetAPI Client] Aircraft name:', aircraftName);
  
  if (aircraftName) {
    // Parse aircraft name (e.g., "Piper PA-28-161 Warrior II" or "Piper Cherokee Warrior II")
    const parts = aircraftName.split(' ');
    
    // First word is usually manufacturer
    if (parts.length > 0) {
      data.make = parts[0];
      fieldsPopulated++;
      console.log('[JetAPI Client] Extracted make:', data.make);
    }
    
    // Rest is model (excluding make)
    if (parts.length > 1) {
      data.model = parts.slice(1).join(' ');
      fieldsPopulated++;
      console.log('[JetAPI Client] Extracted model:', data.model);
    }
  }

  // Map Aircraft Type from ICAO Class
  if (icaoData?.Class) {
    const icaoClass = icaoData.Class.toLowerCase();
    console.log('[JetAPI Client] ICAO Class:', icaoClass);
    
    if (icaoClass.includes('landplane')) {
      data.aircraftType = 'fixed-wing';
      fieldsPopulated++;
      console.log('[JetAPI Client] Mapped LandPlane to fixed-wing');
    } else if (icaoClass.includes('helicopter')) {
      data.aircraftType = 'rotary-wing';
      fieldsPopulated++;
      console.log('[JetAPI Client] Mapped Helicopter to rotary-wing');
    } else if (icaoClass.includes('seaplane')) {
      data.aircraftType = 'fixed-wing';
      fieldsPopulated++;
      console.log('[JetAPI Client] Mapped Seaplane to fixed-wing');
    } else if (icaoClass.includes('amphibian')) {
      data.aircraftType = 'fixed-wing';
      fieldsPopulated++;
      console.log('[JetAPI Client] Mapped Amphibian to fixed-wing');
    }
  }

  // Map Engine Type from ICAO EngineCount and EngineType
  if (icaoData?.EngineCount && icaoData?.EngineType) {
    const engineCount = parseInt(icaoData.EngineCount);
    const engineType = icaoData.EngineType.toLowerCase();
    
    console.log('[JetAPI Client] Engine Count:', engineCount, 'Engine Type:', engineType);
    
    // Map based on number of engines and type
    if (engineType.includes('piston')) {
      if (engineCount === 1) {
        data.engineType = 'single-engine-piston';
        fieldsPopulated++;
        console.log('[JetAPI Client] Mapped to single-engine-piston');
      } else if (engineCount >= 2) {
        data.engineType = 'multi-engine-piston';
        fieldsPopulated++;
        console.log('[JetAPI Client] Mapped to multi-engine-piston');
      }
    } else if (engineType.includes('turboprop')) {
      if (engineCount === 1) {
        data.engineType = 'single-engine-turboprop';
        fieldsPopulated++;
        console.log('[JetAPI Client] Mapped to single-engine-turboprop');
      } else if (engineCount >= 2) {
        data.engineType = 'multi-engine-turboprop';
        fieldsPopulated++;
        console.log('[JetAPI Client] Mapped to multi-engine-turboprop');
      }
    } else if (engineType.includes('jet') || engineType.includes('turbojet') || engineType.includes('turbofan')) {
      data.engineType = 'multi-engine-jet';
      fieldsPopulated++;
      console.log('[JetAPI Client] Mapped to multi-engine-jet');
    } else if (engineType.includes('turbine')) {
      if (engineCount === 1) {
        data.engineType = 'single-engine-turbine';
        fieldsPopulated++;
        console.log('[JetAPI Client] Mapped to single-engine-turbine');
      } else if (engineCount >= 2) {
        data.engineType = 'multi-engine-turboprop'; // Most multi-turbine are turboprops
        fieldsPopulated++;
        console.log('[JetAPI Client] Mapped to multi-engine-turboprop (from turbine)');
      }
    } else if (engineType.includes('electric')) {
      data.engineType = 'single-engine-piston'; // Map electric to piston for now
      fieldsPopulated++;
      console.log('[JetAPI Client] Mapped electric to single-engine-piston');
    }
  }
  
  // Fallback: Determine aircraft type from TypeCode or aircraft name if ICAO data not available
  if (!data.aircraftType) {
    const typeCode = flightRadar?.TypeCode || '';
    const lowerAircraftName = (aircraftName || '').toLowerCase();
    
    // Map common type codes and keywords to aircraft types
    if (typeCode.match(/^(B|A3|A2|MD|DC|CRJ|E1|E2)/i) || 
        lowerAircraftName.includes('airliner') || 
        lowerAircraftName.includes('jet')) {
      data.aircraftType = 'fixed-wing';
      fieldsPopulated++;
      console.log('[JetAPI Client] Detected fixed-wing from type code/name (fallback)');
    } else if (lowerAircraftName.includes('helicopter') || 
               lowerAircraftName.includes('bell') ||
               typeCode.match(/^(H|EC|AS)/i)) {
      data.aircraftType = 'rotary-wing';
      fieldsPopulated++;
      console.log('[JetAPI Client] Detected rotary-wing from name (fallback)');
    } else if (typeCode || lowerAircraftName.includes('piper') || 
               lowerAircraftName.includes('cessna') || 
               lowerAircraftName.includes('beech')) {
      // Default small aircraft to fixed-wing
      data.aircraftType = 'fixed-wing';
      fieldsPopulated++;
      console.log('[JetAPI Client] Defaulted to fixed-wing (fallback)');
    }
  }

  // Fallback: Determine engine type from aircraft name if ICAO data not available
  if (!data.engineType) {
    const typeCode = flightRadar?.TypeCode || '';
    
    // First, try ICAO lookup table
    if (typeCode) {
      console.log('[JetAPI Client] Trying ICAO lookup table for TypeCode:', typeCode);
      const icaoLookup = lookupICAOType(typeCode);
      
      if (icaoLookup) {
        console.log('[JetAPI Client] Found in ICAO lookup table:', icaoLookup);
        
        // Map aircraft type if not already set
        if (!data.aircraftType) {
          const mappedType = mapToAircraftType(icaoLookup.class);
          if (mappedType) {
            data.aircraftType = mappedType;
            fieldsPopulated++;
            console.log('[JetAPI Client] Mapped aircraft type from lookup table:', mappedType);
          }
        }
        
        // Map engine type
        const mappedEngineType = mapToEngineType(icaoLookup.engineCount, icaoLookup.engineType);
        if (mappedEngineType) {
          data.engineType = mappedEngineType;
          fieldsPopulated++;
          console.log('[JetAPI Client] Mapped engine type from lookup table:', mappedEngineType);
        }
      }
    }
    
    // If still no engine type, try aircraft name parsing
    if (!data.engineType) {
      const lowerAircraftName = (aircraftName || '').toLowerCase();
      
      if (lowerAircraftName) {
        // Check for jets first - including common jet aircraft types
        if (lowerAircraftName.match(/\bjet\b/i) && !lowerAircraftName.match(/turbojet/i)) {
          data.engineType = 'multi-engine-jet';
          fieldsPopulated++;
          console.log('[JetAPI Client] Detected multi-engine-jet (fallback)');
        } else if (lowerAircraftName.match(/\b(737|747|757|767|777|787|a3[0-9]{2}|a2[0-9]{2}|crj|erj|embraer|md-[0-9]|dc-[0-9]|bombardier|gulfstream|falcon|citation|learjet|challenger|global|legacy)\b/i)) {
          // Common commercial jets and business jets by model number or manufacturer
          data.engineType = 'multi-engine-jet';
          fieldsPopulated++;
          console.log('[JetAPI Client] Detected multi-engine-jet from aircraft model (fallback)');
        } else if (lowerAircraftName.match(/turboprop|turbo.?prop/i)) {
          if (lowerAircraftName.match(/twin|multi|dual/i)) {
            data.engineType = 'multi-engine-turboprop';
          } else {
            data.engineType = 'single-engine-turboprop';
          }
          fieldsPopulated++;
          console.log('[JetAPI Client] Detected turboprop (fallback):', data.engineType);
        } else if (lowerAircraftName.match(/turbine/i)) {
          data.engineType = 'single-engine-turbine';
          fieldsPopulated++;
          console.log('[JetAPI Client] Detected turbine (fallback)');
        } else if (lowerAircraftName.match(/piston/i) || 
                   lowerAircraftName.match(/warrior|archer|cherokee|skyhawk|skylane|bonanza/i)) {
          // Common piston aircraft
          if (lowerAircraftName.match(/twin|multi|baron|seneca/i)) {
            data.engineType = 'multi-engine-piston';
          } else {
            data.engineType = 'single-engine-piston';
          }
          fieldsPopulated++;
          console.log('[JetAPI Client] Detected piston (fallback):', data.engineType);
        }
      }
    }
  }

  console.log('[JetAPI Client] Final mapped data:', data);
  console.log('[JetAPI Client] Fields populated:', fieldsPopulated);

  return { fieldsPopulated, data };
}