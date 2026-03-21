import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { checkSanctions } from "./sanctions.tsx";
import { sendEmail, buildPendingEmail, buildQuotedEmail, buildFirmOrderEmail, buildBoundEmail } from "./notifications.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-afd91142/health", (c) => {
  return c.json({ status: "ok", ts: Date.now() });
});

// Get contacts from database
app.get("/make-server-afd91142/contacts", async (c) => {
  try {
    // Try new individual-key format first
    const individualContacts = await kv.getByPrefix("contact:");
    if (individualContacts && individualContacts.length > 0) {
      console.log(`Retrieved ${individualContacts.length} contacts from individual keys`);
      return c.json({ contacts: individualContacts });
    }
    
    // Fallback: try legacy single-key format
    const contacts = await kv.get("contacts");
    if (contacts && Array.isArray(contacts) && contacts.length > 0) {
      console.log(`Migrating ${contacts.length} contacts from legacy single-key format`);
      // Migrate to individual keys
      const keys = contacts.map((ct: any) => `contact:${ct.id}`);
      await kv.mset(keys, contacts);
      // Clean up legacy key
      await kv.del("contacts");
      return c.json({ contacts });
    }
    
    return c.json({ contacts: [] });
  } catch (error) {
    console.log("Error retrieving contacts from database:", error);
    return c.json({ error: "Failed to retrieve contacts", details: String(error), contacts: [] }, 500);
  }
});

// Save contacts to database (stores each contact individually)
app.post("/make-server-afd91142/contacts", async (c) => {
  try {
    const body = await c.req.json();
    const { contacts } = body;
    
    if (!contacts || !Array.isArray(contacts)) {
      return c.json({ error: "Invalid contacts data" }, 400);
    }

    console.log(`Saving ${contacts.length} contacts using individual keys`);
    
    // Get existing contact keys to find deletions
    const existingContacts = await kv.getByPrefix("contact:");
    const existingIds = new Set((existingContacts || []).map((ct: any) => ct.id));
    const newIds = new Set(contacts.map((ct: any) => ct.id));
    
    // Delete contacts that no longer exist
    const deletedIds = [...existingIds].filter(id => !newIds.has(id));
    if (deletedIds.length > 0) {
      const deleteKeys = deletedIds.map(id => `contact:${id}`);
      console.log(`Deleting ${deleteKeys.length} removed contacts`);
      await kv.mdel(deleteKeys);
    }
    
    // Save contacts in batches of 20 to avoid payload limits
    const BATCH_SIZE = 20;
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const keys = batch.map((ct: any) => `contact:${ct.id}`);
      await kv.mset(keys, batch);
    }
    
    // Clean up legacy single-key format if it exists
    try { await kv.del("contacts"); } catch (_) { /* ignore */ }
    
    console.log(`Successfully saved ${contacts.length} contacts`);
    return c.json({ success: true, message: `${contacts.length} contacts saved successfully` });
  } catch (error) {
    console.log("Error saving contacts to database:", error);
    return c.json({ error: "Failed to save contacts", details: String(error) }, 500);
  }
});

// Get lineslips from database
app.get("/make-server-afd91142/lineslips", async (c) => {
  try {
    const lineslips = await kv.get("lineslips");
    return c.json({ lineslips: lineslips || [] });
  } catch (error) {
    console.log("Error retrieving lineslips from database:", error);
    return c.json({ error: "Failed to retrieve lineslips", lineslips: [] }, 500);
  }
});

// Save lineslips to database
app.post("/make-server-afd91142/lineslips", async (c) => {
  try {
    const body = await c.req.json();
    const { lineslips } = body;
    
    if (!lineslips || !Array.isArray(lineslips)) {
      return c.json({ error: "Invalid lineslips data" }, 400);
    }
    
    await kv.set("lineslips", lineslips);
    return c.json({ success: true, message: "Lineslips saved successfully" });
  } catch (error) {
    console.log("Error saving lineslips to database:", error);
    return c.json({ error: "Failed to save lineslips" }, 500);
  }
});

// Get binders from database
app.get("/make-server-afd91142/binders", async (c) => {
  try {
    const binders = await kv.get("binders");
    return c.json({ binders: binders || [] });
  } catch (error) {
    console.log("Error retrieving binders from database:", error);
    return c.json({ error: "Failed to retrieve binders", binders: [] }, 500);
  }
});

// Save binders to database
app.post("/make-server-afd91142/binders", async (c) => {
  try {
    const body = await c.req.json();
    const { binders } = body;
    
    if (!binders || !Array.isArray(binders)) {
      return c.json({ error: "Invalid binders data" }, 400);
    }
    
    await kv.set("binders", binders);
    return c.json({ success: true, message: "Binders saved successfully" });
  } catch (error) {
    console.log("Error saving binders to database:", error);
    return c.json({ error: "Failed to save binders" }, 500);
  }
});

// Debug: Get a specific lineslip's slip sections by name
app.get("/make-server-afd91142/lineslips/debug-sections", async (c) => {
  try {
    const name = c.req.query("name") || "";
    const lineslips = await kv.get("lineslips") as any[] || [];
    const match = lineslips.find((ls: any) =>
      ls.name?.toLowerCase().includes(name.toLowerCase())
    );
    if (!match) {
      return c.json({ error: `No lineslip found matching "${name}"`, availableNames: lineslips.map((ls: any) => ls.name) }, 404);
    }
    return c.json({
      name: match.name,
      id: match.id,
      productCode: match.productCode,
      placementType: match.placementType,
      // Check all possible wording storage fields
      wordingsType: typeof match.wordings,
      wordingsIsArray: Array.isArray(match.wordings),
      wordingsLength: Array.isArray(match.wordings) ? match.wordings.length : (typeof match.wordings === 'string' ? match.wordings.length : 0),
      hasInsuranceWordings: !!match.insuranceWordings,
      insuranceWordingsCount: Array.isArray(match.insuranceWordings) ? match.insuranceWordings.length : 0,
      hasReinsuranceWordings: !!match.reinsuranceWordings,
      reinsuranceWordingsCount: Array.isArray(match.reinsuranceWordings) ? match.reinsuranceWordings.length : 0,
      hasSlipSections: !!match.slipSections,
      slipSectionsCount: Array.isArray(match.slipSections) ? match.slipSections.length : 0,
      // Return all wording fields
      wordings: match.wordings,
      insuranceWordings: match.insuranceWordings,
      reinsuranceWordings: match.reinsuranceWordings,
      slipSections: match.slipSections,
    });
  } catch (error) {
    console.log("Error in debug-sections:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get placements from database
app.get("/make-server-afd91142/placements", async (c) => {
  try {
    const placements = await kv.get("placements");
    return c.json({ placements: placements || [] });
  } catch (error) {
    console.log("Error retrieving placements from database:", error);
    return c.json({ error: "Failed to retrieve placements", placements: [] }, 500);
  }
});

// Save placements to database
app.post("/make-server-afd91142/placements", async (c) => {
  try {
    const body = await c.req.json();
    const { placements } = body;
    
    if (!placements || !Array.isArray(placements)) {
      return c.json({ error: "Invalid placements data" }, 400);
    }
    
    await kv.set("placements", placements);
    return c.json({ success: true, message: "Placements saved successfully" });
  } catch (error) {
    console.log("Error saving placements to database:", error);
    return c.json({ error: "Failed to save placements" }, 500);
  }
});

// Update a single placement by ID
app.patch("/make-server-afd91142/placements/:id", async (c) => {
  try {
    const placementId = c.req.param("id");
    const body = await c.req.json();
    
    if (!placementId) {
      return c.json({ error: "Placement ID is required" }, 400);
    }
    
    console.log(`Updating placement ${placementId} with data:`, JSON.stringify(body, null, 2));
    
    // Get existing placements
    const placements = await kv.get("placements") || [];
    
    // Find the placement to update
    const placementIndex = placements.findIndex((p: any) => p.id === placementId);
    
    if (placementIndex === -1) {
      console.log(`Placement ${placementId} not found`);
      return c.json({ error: "Placement not found" }, 404);
    }
    
    // Update the placement with the new data (merge)
    placements[placementIndex] = {
      ...placements[placementIndex],
      ...body,
    };
    
    // Save back to database
    await kv.set("placements", placements);
    
    console.log(`Placement ${placementId} updated successfully`);
    return c.json({ 
      success: true, 
      message: "Placement updated successfully",
      placement: placements[placementIndex]
    });
  } catch (error) {
    console.log("Error updating placement:", error);
    return c.json({ error: "Failed to update placement" }, 500);
  }
});

// Delete placements from database
app.delete("/make-server-afd91142/placements", async (c) => {
  try {
    const url = new URL(c.req.url);
    const placementId = url.searchParams.get("id");
    
    if (placementId) {
      // Delete a specific placement by ID
      const placements = await kv.get("placements") || [];
      const filteredPlacements = placements.filter((p: any) => p.id !== placementId);
      await kv.set("placements", filteredPlacements);
      return c.json({ success: true, message: `Placement ${placementId} deleted successfully` });
    } else {
      // Delete all placements
      await kv.set("placements", []);
      return c.json({ success: true, message: "All placements deleted successfully" });
    }
  } catch (error) {
    console.log("Error deleting placements from database:", error);
    return c.json({ error: "Failed to delete placements" }, 500);
  }
});

// JetAPI - Lookup aircraft by registration
app.get("/make-server-afd91142/aircraft/lookup/:registration", async (c) => {
  try {
    const registration = c.req.param("registration");
    const apiKey = Deno.env.get("JETAPI_KEY");
    
    if (!apiKey) {
      console.log("JetAPI: API key not configured");
      return c.json({ 
        error: "JetAPI key not configured. Please add your JETAPI_KEY in the Supabase dashboard." 
      }, 500);
    }

    if (!registration) {
      return c.json({ error: "Registration parameter is required" }, 400);
    }

    console.log(`JetAPI: Looking up aircraft registration: ${registration}`);

    // Try multiple registration formats
    const regTrimmed = registration.trim();
    const regNoHyphen = regTrimmed.replace(/-/g, '');
    const regNoSpace = regTrimmed.replace(/\s/g, '');
    
    const formats = [
      regTrimmed.toLowerCase(),           // g-huxxy
      regTrimmed.toUpperCase(),           // G-HUXXY
      regNoHyphen.toLowerCase(),          // ghuxxy
      regNoHyphen.toUpperCase(),          // GHUXXY
      regNoSpace.toLowerCase(),           // original without spaces
      regNoSpace.toUpperCase(),           // original without spaces uppercase
    ];
    
    // Remove duplicates
    const uniqueFormats = [...new Set(formats)];
    
    console.log(`JetAPI: Will try ${uniqueFormats.length} registration formats:`, uniqueFormats);
    
    let lastError = null;
    let lastStatus = 0;

    for (const normalizedReg of uniqueFormats) {
      console.log(`JetAPI: Trying registration format: ${normalizedReg}`);

      const endpoint = `https://www.jetapi.dev/api?reg=${encodeURIComponent(normalizedReg)}`;
      
      try {
        console.log(`JetAPI: Calling endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
        });

        console.log(`JetAPI: Response status: ${response.status}`);
        
        const responseText = await response.text();
        console.log(`JetAPI: Response body (first 1000 chars): ${responseText.substring(0, 1000)}`);

        if (response.status === 404) {
          lastError = "Aircraft not found";
          lastStatus = 404;
          console.log(`JetAPI: Format ${normalizedReg} returned 404, trying next format...`);
          continue; // Try next format
        }

        if (response.status === 401 || response.status === 403) {
          console.log(`JetAPI: Auth failed with Bearer token, trying API key as query param...`);
          
          const authEndpoint = `${endpoint}&apiKey=${encodeURIComponent(apiKey!)}`;
          const authResponse = await fetch(authEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          
          if (!authResponse.ok) {
            lastError = "Invalid API key or authentication method";
            lastStatus = 401;
            continue;
          }
          
          const authData = await authResponse.json();
          console.log("JetAPI: Aircraft data retrieved successfully with auth");
          
          return c.json({ 
            success: true, 
            aircraft: authData,
            endpoint: endpoint,
            registrationUsed: normalizedReg
          });
        }

        if (response.ok) {
          const data = JSON.parse(responseText);
          console.log("JetAPI: Aircraft data retrieved successfully");
          console.log("JetAPI: Full response data:", JSON.stringify(data, null, 2));
          
          return c.json({ 
            success: true, 
            aircraft: data,
            endpoint: endpoint,
            registrationUsed: normalizedReg
          });
        }

        lastError = `API returned status ${response.status}`;
        lastStatus = response.status;
        
      } catch (fetchError) {
        console.log(`JetAPI: Failed to connect with format ${normalizedReg}:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : "Unknown error occurred";
        lastStatus = 500;
      }
    }
    
    // All formats failed
    console.log(`JetAPI: All registration formats failed. Last error: ${lastError}`);
    return c.json({ 
      error: lastError || "Failed to lookup aircraft", 
      message: `Aircraft registration '${registration}' not found in JetAPI database. This registration may not be indexed, or the format may be incorrect.`,
      triedFormats: uniqueFormats
    }, lastStatus || 404);

  } catch (error) {
    console.log("JetAPI: Error looking up aircraft:", error);
    return c.json({ 
      error: "Failed to lookup aircraft", 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    }, 500);
  }
});

// JetAPI - Search aircraft by various criteria
app.post("/make-server-afd91142/aircraft/search", async (c) => {
  try {
    const apiKey = Deno.env.get("JETAPI_KEY");
    
    if (!apiKey) {
      console.log("JetAPI: API key not configured");
      return c.json({ 
        error: "JetAPI key not configured. Please add your JETAPI_KEY in the Supabase dashboard." 
      }, 500);
    }

    const body = await c.req.json();
    const { make, model, type } = body;

    console.log(`JetAPI: Searching aircraft with criteria:`, { make, model, type });

    // Build query parameters
    const params = new URLSearchParams();
    if (make) params.append("make", make);
    if (model) params.append("model", model);
    if (type) params.append("type", type);

    const response = await fetch(`https://api.jetapi.dev/v1/aircraft/search?${params.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`JetAPI: Search request failed with status ${response.status}: ${errorText}`);
      
      if (response.status === 401) {
        return c.json({ 
          error: "Invalid API key", 
          message: "JetAPI authentication failed. Please check your API key." 
        }, 401);
      } else {
        return c.json({ 
          error: "JetAPI search failed", 
          message: `API returned status ${response.status}` 
        }, response.status);
      }
    }

    const data = await response.json();
    console.log(`JetAPI: Search completed successfully, found ${data?.results?.length || 0} results`);
    
    return c.json({ 
      success: true, 
      results: data 
    });
  } catch (error) {
    console.log("JetAPI: Error searching aircraft:", error);
    return c.json({ 
      error: "Failed to search aircraft", 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    }, 500);
  }
});

// DEPRECATED: AeroDataBox flight lookup endpoint — replaced by FlightRadar data via JetAPI.
// Flight history is now sourced from JetAPI's FlightRadar.Flights object in the /aircraft/lookup/:registration response.
// This endpoint is retained as a stub for reference; it returns 410 Gone.
app.get("/make-server-afd91142/flights/:registration", (c) => {
  return c.json({ 
    error: "Deprecated", 
    message: "This endpoint has been deprecated. Flight data is now sourced from JetAPI FlightRadar via /aircraft/lookup/:registration.",
    flights: []
  }, 410);
});

// Upload document to Supabase Storage
app.post("/make-server-afd91142/documents/upload", async (c) => {
  try {
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Ensure bucket exists
    const bucketName = "make-afd91142-documents";
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${bucketName}`);
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Get the file from the request
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const placementId = formData.get("placementId") as string;
    const documentType = formData.get("documentType") as string || "general";
    
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Generate a unique file path
    const timestamp = Date.now();
    const fileName = `${placementId}/${documentType}/${timestamp}-${file.name}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.log("Error uploading file to storage:", uploadError);
      return c.json({ error: "Failed to upload file", details: uploadError }, 500);
    }

    console.log(`File uploaded successfully: ${fileName}`);

    return c.json({
      success: true,
      filePath: uploadData.path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      documentType
    });
  } catch (error) {
    console.log("Error in document upload:", error);
    return c.json({ error: "Failed to upload document", details: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Get signed URL for a document
app.get("/make-server-afd91142/documents/url/:filePath(*)", async (c) => {
  try {
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const filePath = c.req.param("filePath");
    const bucketName = "make-afd91142-documents";

    if (!filePath) {
      return c.json({ error: "File path is required" }, 400);
    }

    console.log(`Getting signed URL for: ${filePath}`);

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.log("Error creating signed URL:", error);
      return c.json({ error: "Failed to get file URL", details: error }, 500);
    }

    return c.json({
      success: true,
      signedUrl: data.signedUrl
    });
  } catch (error) {
    console.log("Error getting signed URL:", error);
    return c.json({ error: "Failed to get document URL", details: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Scorechain - Check sanctions for placement submission
app.post("/make-server-afd91142/sanctions/check", async (c) => {
  try {
    const apiKey = Deno.env.get("SCORECHAIN_API_KEY");
    
    const body = await c.req.json();
    const { entities } = body;

    if (!entities || !Array.isArray(entities)) {
      return c.json({ error: "Invalid entities data. Expected array of {name, type}" }, 400);
    }

    console.log(`Sanctions: Checking ${entities.length} entities`);

    if (!apiKey || apiKey === "" || apiKey === "placeholder") {
      // No real API key — return all-clear with a note
      console.log("Sanctions: No API key configured — auto-clearing all entities");
      const results = entities.map((e: any) => ({
        name: e.name,
        type: e.type,
        isSanctioned: false,
        error: undefined,
      }));
      return c.json({
        success: true,
        passed: true,
        results,
        failedEntities: [],
        note: "Sanctions API key not configured — all entities auto-cleared for demo",
      });
    }

    // Perform real sanctions check via Scorechain
    const result = await checkSanctions(entities, apiKey);

    console.log(`Scorechain: Check complete. Passed: ${result.passed}`);

    return c.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.log("Scorechain: Error checking sanctions:", error);
    return c.json({ 
      error: "Failed to check sanctions", 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    }, 500);
  }
});

// ── Email Notification endpoint ──────────────────────────────────────────────
app.post("/make-server-afd91142/notify", async (c) => {
  try {
    const body = await c.req.json();
    const { type, recipients, placementData, attachments } = body;

    if (!type || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return c.json({ error: "Missing required fields: type, recipients (array)" }, 400);
    }

    if (!placementData) {
      return c.json({ error: "Missing placementData" }, 400);
    }

    console.log(`[Notification] Sending ${type} notification to ${recipients.length} recipients:`, recipients);
    console.log(`[Notification] Placement: ${placementData.reference} — ${placementData.insuredName}`);

    let email;
    switch (type) {
      case "pending":
        email = buildPendingEmail(placementData);
        break;
      case "quoted":
        email = buildQuotedEmail(placementData);
        break;
      case "firmorder":
        email = buildFirmOrderEmail(placementData);
        break;
      case "bound":
        email = buildBoundEmail(placementData);
        break;
      default:
        return c.json({ error: `Unknown notification type: ${type}` }, 400);
    }

    email.to = recipients;

    // Attach any PDF attachments (e.g. quote slip on QUOTED notifications)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      email.attachments = attachments;
      console.log(`[Notification] Attaching ${attachments.length} file(s): ${attachments.map((a: any) => a.filename).join(", ")}`);
    }

    const result = await sendEmail(email);

    if (!result.success) {
      console.log(`[Notification] Failed to send ${type} email:`, result.error);
      return c.json({ 
        success: false, 
        error: `Failed to send notification email: ${result.error}`,
        type,
        recipientCount: recipients.length
      }, 500);
    }

    console.log(`[Notification] ${type} email sent successfully (ID: ${result.id})`);
    return c.json({ 
      success: true, 
      message: `${type} notification sent to ${recipients.length} recipient(s)`,
      emailId: result.id,
      recipients
    });
  } catch (error) {
    console.log("[Notification] Error processing notification request:", error);
    return c.json({ 
      error: "Failed to process notification", 
      details: String(error) 
    }, 500);
  }
});

Deno.serve(app.fetch);