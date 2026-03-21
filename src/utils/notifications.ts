// Frontend notification utility — resolves recipients and sends notification emails
// via the /notify server endpoint when placement status transitions occur.

import { projectId, publicAnonKey } from "./supabase/info";
import type { Placement, Contact, Lineslip } from "../App";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142`;

interface NotifyPayload {
  type: "pending" | "quoted" | "firmorder" | "bound";
  recipients: string[];
  placementData: Record<string, any>;
  attachments?: Array<{ filename: string; content: string }>;
}

async function callNotifyEndpoint(payload: NotifyPayload): Promise<void> {
  if (!payload.recipients || payload.recipients.length === 0) {
    console.log(`[Notifications] No recipients for ${payload.type} notification — skipping`);
    return;
  }

  console.log(`[Notifications] Sending ${payload.type} notification to:`, payload.recipients);

  try {
    const response = await fetch(`${API_BASE}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`[Notifications] Server error for ${payload.type}:`, result);
    } else {
      console.log(`[Notifications] ${payload.type} notification sent successfully:`, result);
    }
  } catch (error) {
    console.error(`[Notifications] Failed to send ${payload.type} notification:`, error);
  }
}

// ── Helper: resolve authorised underwriter emails ────────────────────────────
// If the lineslip has authorisedUnderwriterContactIds, use those.
// Otherwise fall back to all underwriter contacts on the lineslip.
function resolveUnderwriterEmails(
  placement: Placement,
  contacts: Contact[],
  lineslips: Lineslip[]
): string[] {
  // Find the lineslip for this placement
  const selectedLineslipId = placement.draftData?.selectedLineslips?.[placement.productCode];
  const lineslip = lineslips.find((l) => l.id === selectedLineslipId);

  if (!lineslip) {
    console.log("[Notifications] No lineslip found for placement — cannot resolve underwriter emails");
    return [];
  }

  // If authorised underwriter contact IDs are set, use those
  if (lineslip.authorisedUnderwriterContactIds && lineslip.authorisedUnderwriterContactIds.length > 0) {
    const emails = lineslip.authorisedUnderwriterContactIds
      .map((id) => contacts.find((c) => c.id === id))
      .filter((c): c is Contact => !!c && !!c.email)
      .map((c) => c.email);

    console.log(`[Notifications] Resolved ${emails.length} authorised underwriter emails from lineslip`);
    return emails;
  }

  // Fallback: use all underwriter contacts whose name/company matches a lineslip underwriter
  const underwriterNames = lineslip.underwriters.map((u) => u.name.toLowerCase());
  const underwriterSecurities = lineslip.underwriters.map((u) => u.security.toLowerCase());

  const emails = contacts
    .filter((c) => {
      if (c.type !== "Underwriter") return false;
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const company = (c.company || "").toLowerCase();
      return (
        underwriterNames.some((n) => n.includes(fullName) || fullName.includes(n)) ||
        underwriterSecurities.some((s) => s.includes(company) || company.includes(s))
      );
    })
    .map((c) => c.email)
    .filter(Boolean);

  console.log(`[Notifications] Resolved ${emails.length} underwriter emails from contact matching`);
  return emails;
}

// ── Helper: resolve broker + preferred broker contact emails ─────────────────
function resolveBrokerEmails(
  placement: Placement,
  contacts: Contact[]
): string[] {
  const emails: string[] = [];

  // 1. The broker who submitted/accepted the risk
  if (placement.submittedBy) {
    emails.push(placement.submittedBy);
  }

  // 2. The producing broker's preferred broker contact
  const producingBrokerId = placement.draftData?.selectedProducingBrokerId;
  if (producingBrokerId) {
    const producingBroker = contacts.find((c) => c.id === producingBrokerId);
    if (producingBroker?.brokerContactId) {
      const preferredBroker = contacts.find((c) => c.id === producingBroker.brokerContactId);
      if (preferredBroker?.email) {
        emails.push(preferredBroker.email);
      }
    }
  }

  // De-duplicate
  return [...new Set(emails.filter(Boolean))];
}

// ── Helper: get latest quote from placement ──────────────────────────────────
function getLatestQuote(placement: Placement) {
  if (!placement.quotes || placement.quotes.length === 0) return null;
  return placement.quotes[placement.quotes.length - 1];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API — call these from status transition handlers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PENDING: Broker submits a risk → notify underwriters
 */
export function notifyPending(
  placement: Placement,
  contacts: Contact[],
  lineslips: Lineslip[]
): void {
  const recipients = resolveUnderwriterEmails(placement, contacts, lineslips);

  callNotifyEndpoint({
    type: "pending",
    recipients,
    placementData: {
      reference: placement.reference,
      insuredName: placement.insuredName,
      productCode: placement.productCode,
      brokerName: placement.brokerName,
      brokerCompany: placement.brokerCompany,
      submittedByName: placement.submittedByName || "Unknown",
      facilityRef: placement.facilityRef,
      inceptionDate: placement.draftData?.inceptionDate || placement.inceptionDate,
    },
  });
}

/**
 * QUOTED: Underwriter quotes → notify submitting broker + preferred broker contact
 */
export function notifyQuoted(
  placement: Placement,
  contacts: Contact[],
  quote: { underwriterName: string; underwriterCompany?: string; premium: number; currency: string },
  quoteSlipBase64?: string | null
): void {
  const recipients = resolveBrokerEmails(placement, contacts);

  // Build filename from placement reference + insured
  const sanitisedInsured = (placement.insuredName || "Insured").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-");
  const filename = `Quote-${placement.reference || "DRAFT"}-${sanitisedInsured}.pdf`;

  const attachments = quoteSlipBase64
    ? [{ filename, content: quoteSlipBase64 }]
    : undefined;

  callNotifyEndpoint({
    type: "quoted",
    recipients,
    placementData: {
      reference: placement.reference,
      insuredName: placement.insuredName,
      productCode: placement.productCode,
      underwriterName: quote.underwriterName,
      underwriterCompany: quote.underwriterCompany,
      facilityRef: placement.facilityRef,
      premium: quote.premium,
      currency: quote.currency,
    },
    attachments,
  });
}

/**
 * FIRM ORDER: Broker accepts quote → notify underwriters
 */
export function notifyFirmOrder(
  placement: Placement,
  contacts: Contact[],
  lineslips: Lineslip[],
  acceptedByName: string,
  acceptedByCompany: string
): void {
  const recipients = resolveUnderwriterEmails(placement, contacts, lineslips);
  const quote = getLatestQuote(placement);

  callNotifyEndpoint({
    type: "firmorder",
    recipients,
    placementData: {
      reference: placement.reference,
      insuredName: placement.insuredName,
      productCode: placement.productCode,
      acceptedByName,
      acceptedByCompany,
      facilityRef: placement.facilityRef,
      premium: quote?.premium || 0,
      currency: quote?.currency || "USD",
    },
  });
}

/**
 * BOUND: Underwriter binds → notify broker who accepted + preferred broker contact
 */
export function notifyBound(
  placement: Placement,
  contacts: Contact[],
  boundByName: string,
  boundByCompany: string,
  boundDocuments?: { bindingSlip?: string | null; eocLetter?: string | null; claimsDoc?: string | null }
): void {
  const recipients = resolveBrokerEmails(placement, contacts);
  const quote = getLatestQuote(placement);

  // Build filenames from placement reference + insured
  const sanitisedInsured = (placement.insuredName || "Insured").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-");
  const ref = placement.reference || "DRAFT";
  const attachments: Array<{ filename: string; content: string }> = [];
  if (boundDocuments?.bindingSlip) {
    attachments.push({ filename: `BindingSlip-${ref}-${sanitisedInsured}.pdf`, content: boundDocuments.bindingSlip });
  }
  if (boundDocuments?.eocLetter) {
    attachments.push({ filename: `EOC-CoveringLetter-${ref}-${sanitisedInsured}.pdf`, content: boundDocuments.eocLetter });
  }
  if (boundDocuments?.claimsDoc) {
    attachments.push({ filename: `ClaimsNotification-${ref}-${sanitisedInsured}.pdf`, content: boundDocuments.claimsDoc });
  }

  callNotifyEndpoint({
    type: "bound",
    recipients,
    placementData: {
      reference: placement.reference,
      insuredName: placement.insuredName,
      productCode: placement.productCode,
      boundByName,
      boundByCompany,
      facilityRef: placement.facilityRef,
      boundDate: new Date().toISOString().split("T")[0],
      premium: quote?.premium || 0,
      currency: quote?.currency || "USD",
    },
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}