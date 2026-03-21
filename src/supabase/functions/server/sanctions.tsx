/**
 * Scorechain Sanctions Screening Module
 * Checks entities against global sanctions lists using Scorechain API
 */

interface SanctionCheckResult {
  name: string;
  isSanctioned: boolean;
  sanctionDetails?: {
    programs: string[];
    listingDate?: string;
    source?: string;
  };
  error?: string;
}

/**
 * Check a single entity name against Scorechain sanctions database
 */
async function checkEntity(name: string, apiKey: string): Promise<SanctionCheckResult> {
  if (!name || name.trim() === "") {
    return {
      name: "",
      isSanctioned: false,
      error: "Empty name provided"
    };
  }

  try {
    console.log(`Scorechain: Checking sanctions for entity: ${name}`);
    
    // Scorechain API endpoint for name search
    const endpoint = `https://api.scorechain.com/v1/compliance/sanctions/search`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: name.trim(),
        type: "name"
      })
    });

    console.log(`Scorechain: Response status for "${name}": ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Scorechain: API error for "${name}": ${errorText}`);
      
      if (response.status === 401 || response.status === 403) {
        return {
          name,
          isSanctioned: false,
          error: "Invalid API key or unauthorized"
        };
      }
      
      return {
        name,
        isSanctioned: false,
        error: `API returned status ${response.status}`
      };
    }

    const data = await response.json();
    console.log(`Scorechain: Response data for "${name}":`, JSON.stringify(data, null, 2));

    // Check if any matches were found
    const hasMatches = data?.matches && Array.isArray(data.matches) && data.matches.length > 0;
    
    if (hasMatches) {
      const match = data.matches[0]; // Take first match
      
      return {
        name,
        isSanctioned: true,
        sanctionDetails: {
          programs: match.programs || [],
          listingDate: match.listing_date,
          source: match.source
        }
      };
    }

    return {
      name,
      isSanctioned: false
    };

  } catch (error) {
    console.log(`Scorechain: Error checking "${name}":`, error);
    return {
      name,
      isSanctioned: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Check multiple entities against sanctions lists
 */
export async function checkSanctions(
  entities: Array<{ name: string; type: "insured" | "reinsured" | "additional_insured" }>,
  apiKey: string
): Promise<{
  passed: boolean;
  results: Array<SanctionCheckResult & { type: string }>;
  failedEntities: string[];
}> {
  console.log(`Scorechain: Starting sanctions check for ${entities.length} entities`);
  
  if (!apiKey) {
    console.log("Scorechain: API key not configured");
    throw new Error("Scorechain API key not configured");
  }

  const results: Array<SanctionCheckResult & { type: string }> = [];
  const failedEntities: string[] = [];

  // Check each entity
  for (const entity of entities) {
    const result = await checkEntity(entity.name, apiKey);
    
    results.push({
      ...result,
      type: entity.type
    });

    if (result.isSanctioned) {
      failedEntities.push(`${entity.name} (${entity.type})`);
    }
  }

  const passed = failedEntities.length === 0;
  
  console.log(`Scorechain: Sanctions check complete. Passed: ${passed}, Failed: ${failedEntities.length}`);
  
  return {
    passed,
    results,
    failedEntities
  };
}
