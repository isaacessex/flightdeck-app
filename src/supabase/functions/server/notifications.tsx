// Email notification service for FLIGHTDECK placement status transitions
// Uses Resend API to send transactional emails

const RESEND_API_URL = "https://api.resend.com/emails";

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}

export async function sendEmail(notification: EmailNotification): Promise<{ success: boolean; error?: string; id?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!apiKey) {
    console.log("RESEND_API_KEY not configured — skipping email send");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (!notification.to || notification.to.length === 0) {
    console.log("No recipients specified — skipping email send");
    return { success: false, error: "No recipients specified" };
  }

  // Filter out empty/invalid emails
  const validRecipients = notification.to.filter(email => email && email.includes("@"));
  if (validRecipients.length === 0) {
    console.log("No valid email addresses found — skipping email send");
    return { success: false, error: "No valid email addresses" };
  }

  try {
    console.log(`Sending email to ${validRecipients.length} recipients: ${validRecipients.join(", ")}`);
    console.log(`Subject: ${notification.subject}`);

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FLIGHTDECK <onboarding@resend.dev>",
        to: validRecipients,
        subject: notification.subject,
        html: notification.html,
        ...(notification.attachments && notification.attachments.length > 0
          ? { attachments: notification.attachments }
          : {}),
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.log(`Resend API error (${response.status}):`, JSON.stringify(result));
      return { success: false, error: result?.message || `HTTP ${response.status}` };
    }

    console.log("Email sent successfully:", result.id);
    return { success: true, id: result.id };
  } catch (error) {
    console.log("Error sending email via Resend:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Email Templates ──────────────────────────────────────────────────────────

const BRAND = "#004225";
const BRAND_LIGHT = "#e8f5ee";

// Status configurations
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; stepIndex: number }> = {
  pending:   { label: "PENDING REVIEW",  color: "#b45309", bg: "#fef3c7", stepIndex: 1 },
  quoted:    { label: "QUOTED",          color: "#1d4ed8", bg: "#dbeafe", stepIndex: 2 },
  firmorder: { label: "FIRM ORDER",      color: "#065f46", bg: "#d1fae5", stepIndex: 3 },
  bound:     { label: "BOUND",           color: "#ffffff", bg: BRAND,     stepIndex: 4 },
};

const WORKFLOW_STEPS = ["Submitted", "Quoted", "Firm Order", "Bound"];

function buildProgressBar(currentStep: number): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
      <tr>
        ${WORKFLOW_STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isInactive = stepNum > currentStep;
          
          const circleColor = isComplete ? BRAND : isCurrent ? BRAND : "#d1d5db";
          const circleBorder = isComplete || isCurrent ? BRAND : "#d1d5db";
          const textColor = isComplete || isCurrent ? BRAND : "#9ca3af";
          const fontWeight = isCurrent ? "700" : "500";
          const innerContent = isComplete 
            ? `<span style="color: #ffffff; font-size: 11px; line-height: 1;">&#10003;</span>` 
            : isCurrent 
              ? `<span style="color: #ffffff; font-size: 10px; font-weight: 700; line-height: 1;">${stepNum}</span>` 
              : `<span style="color: #9ca3af; font-size: 10px; font-weight: 600; line-height: 1;">${stepNum}</span>`;
          const circleBg = isComplete || isCurrent ? BRAND : "#ffffff";
          
          return `
            <td width="25%" align="center" style="padding: 0 4px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: ${circleBg}; border: 2px solid ${circleBorder}; display: inline-block; text-align: center; line-height: 22px;">
                      ${innerContent}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-size: 10px; font-weight: ${fontWeight}; color: ${textColor}; letter-spacing: 0.5px; text-transform: uppercase;">${step}</span>
                  </td>
                </tr>
              </table>
            </td>`;
        }).join("")}
      </tr>
      <tr>
        <td colspan="4" style="padding: 10px 32px 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${WORKFLOW_STEPS.map((_, i) => {
                const stepNum = i + 1;
                const isComplete = stepNum <= currentStep;
                const barColor = isComplete ? BRAND : "#e5e7eb";
                return `<td width="25%" style="padding: 0 2px;"><div style="height: 3px; background: ${barColor}; border-radius: 2px;"></div></td>`;
              }).join("")}
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function baseTemplate(status: string, content: string): string {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>FLIGHTDECK Notification</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Email container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: ${BRAND}; padding: 0; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 28px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 4px; text-transform: uppercase;">FLIGHTDECK</span>
                        </td>
                        <td align="right">
                          <span style="font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.6); letter-spacing: 1px; text-transform: uppercase;">Aviation Placement</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; border-radius: 0 0 12px 12px; padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 0 32px;">
                    <div style="height: 1px; background: #f3f4f6;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 32px;">
                    <p style="font-size: 11px; color: #9ca3af; line-height: 1.6; margin: 0;">
                      This is an automated notification from <strong style="color: #6b7280;">FLIGHTDECK</strong>. Do not reply to this email.
                    </p>
                    <p style="font-size: 10px; color: #d1d5db; line-height: 1.5; margin: 12px 0 0 0;">
                      CONFIDENTIALITY NOTICE: This email and any attachments are for the exclusive and confidential use of the intended recipient. If you are not the intended recipient, please do not read, distribute, or take action based on this message.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Sub-footer -->
          <tr>
            <td style="padding: 20px 32px 0 32px;" align="center">
              <span style="font-size: 10px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">FLIGHTDECK</span>
              <span style="font-size: 10px; color: #d1d5db; padding: 0 8px;">&middot;</span>
              <span style="font-size: 10px; color: #9ca3af;">Aviation Insurance Placement Platform</span>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`;
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function detailRow(label: string, value: string, options?: { bold?: boolean; color?: string }): string {
  const valStyle = [
    "font-size: 13px",
    `color: ${options?.color || "#111827"}`,
    `font-weight: ${options?.bold ? "700" : "500"}`,
    "margin: 0",
  ].join("; ");
  
  return `
    <tr>
      <td style="padding: 11px 0; border-bottom: 1px solid #f9fafb; vertical-align: top;">
        <span style="font-size: 10px; font-weight: 600; color: #9ca3af; letter-spacing: 0.8px; text-transform: uppercase;">${label}</span>
      </td>
      <td style="padding: 11px 0; border-bottom: 1px solid #f9fafb; text-align: right; vertical-align: top;">
        <span style="${valStyle}">${value}</span>
      </td>
    </tr>`;
}

function statusBadge(status: string): string {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isInverted = status === "bound";
  return `<span style="display: inline-block; padding: 5px 14px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; background: ${config.bg}; color: ${config.color};">${config.label}</span>`;
}

function ctaButton(): string {
  return `
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 0 32px 32px 32px;" align="center">
          <a href="#" style="display: inline-block; padding: 14px 40px; background: ${BRAND}; color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-decoration: none; border-radius: 8px; text-transform: uppercase;">Log in to FLIGHTDECK</a>
        </td>
      </tr>
    </table>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENDING — Broker submits risk → notify underwriters
// ═══════════════════════════════════════════════════════════════════════════════

export function buildPendingEmail(data: {
  reference: string;
  insuredName: string;
  productCode: string;
  brokerName: string;
  brokerCompany: string;
  submittedByName: string;
  facilityRef: string;
  inceptionDate?: string;
}): EmailNotification {
  const content = `
    <!-- Status banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 28px 32px 0 32px;">
          ${statusBadge("pending")}
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 32px 0 32px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 6px 0; line-height: 1.3;">New Risk Submitted for Review</h2>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">
            A new placement has been submitted by <strong style="color: #374151;">${data.submittedByName}</strong> at <strong style="color: #374151;">${data.brokerCompany}</strong> and requires your quotation.
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Details card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;">
            <tr>
              <td style="padding: 20px 24px 8px 24px;">
                <span style="font-size: 10px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase;">Placement Details</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 24px 20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${detailRow("Reference", data.reference, { bold: true })}
                  ${detailRow("Insured", data.insuredName, { bold: true })}
                  ${detailRow("Product Code", data.productCode)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Action prompt -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 0 32px 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND_LIGHT}; border-radius: 10px; border: 1px solid #c6e7d2;">
            <tr>
              <td style="padding: 18px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="32" valign="top">
                      <div style="width: 24px; height: 24px; background: ${BRAND}; border-radius: 50%; text-align: center; line-height: 24px;">
                        <span style="color: #ffffff; font-size: 12px;">&#9998;</span>
                      </div>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="font-size: 13px; font-weight: 600; color: ${BRAND}; margin: 0 0 2px 0;">Action Required</p>
                      <p style="font-size: 12px; color: #065f46; margin: 0; line-height: 1.5;">Please log in to FLIGHTDECK to review this submission and provide your quotation.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton()}`;

  return {
    to: [],
    subject: `[FLIGHTDECK] New Risk Submission \u2014 ${data.reference} \u2014 ${data.insuredName}`,
    html: baseTemplate("pending", content),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTED — Underwriter quotes → notify broker
// ═══════════════════════════════════════════════════════════════════════════════

export function buildQuotedEmail(data: {
  reference: string;
  insuredName: string;
  productCode: string;
  underwriterName: string;
  underwriterCompany?: string;
  facilityRef: string;
  premium: number;
  currency: string;
}): EmailNotification {
  const formattedPremium = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: data.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(data.premium);

  const content = `
    <!-- Status banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 28px 32px 0 32px;">
          ${statusBadge("quoted")}
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 32px 0 32px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 6px 0; line-height: 1.3;">Quotation Received</h2>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">
            <strong style="color: #374151;">${data.underwriterName}</strong>${data.underwriterCompany ? ` (${data.underwriterCompany})` : ""} has provided a quotation for the following risk.
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Details card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;">
            <tr>
              <td style="padding: 20px 24px 8px 24px;">
                <span style="font-size: 10px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase;">Placement Details</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 24px 20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${detailRow("Reference", data.reference, { bold: true })}
                  ${detailRow("Insured", data.insuredName, { bold: true })}
                  ${detailRow("Product Code", data.productCode)}
                  ${detailRow("Quoted By", `${data.underwriterName}${data.underwriterCompany ? ` (${data.underwriterCompany})` : ""}`)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Action prompt -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 0 32px 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe;">
            <tr>
              <td style="padding: 18px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="32" valign="top">
                      <div style="width: 24px; height: 24px; background: #2563eb; border-radius: 50%; text-align: center; line-height: 24px;">
                        <span style="color: #ffffff; font-size: 12px;">&#10003;</span>
                      </div>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="font-size: 13px; font-weight: 600; color: #1d4ed8; margin: 0 0 2px 0;">Review Required</p>
                      <p style="font-size: 12px; color: #1e40af; margin: 0; line-height: 1.5;">Log in to FLIGHTDECK to review the full quotation terms and respond with your instructions.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton()}`;

  return {
    to: [],
    subject: `[FLIGHTDECK] Quotation Received \u2014 ${data.reference} \u2014 ${data.insuredName}`,
    html: baseTemplate("quoted", content),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIRM ORDER — Broker accepts quote → notify underwriters
// ═══════════════════════════════════════════════════════════════════════════════

export function buildFirmOrderEmail(data: {
  reference: string;
  insuredName: string;
  productCode: string;
  acceptedByName: string;
  acceptedByCompany: string;
  facilityRef: string;
  premium: number;
  currency: string;
}): EmailNotification {
  const formattedPremium = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: data.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(data.premium);

  const content = `
    <!-- Status banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 28px 32px 0 32px;">
          ${statusBadge("firmorder")}
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 32px 0 32px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 6px 0; line-height: 1.3;">Firm Order Received</h2>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">
            <strong style="color: #374151;">${data.acceptedByName}</strong> at <strong style="color: #374151;">${data.acceptedByCompany}</strong> has accepted the quotation and placed a firm order for binding.
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Details card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;">
            <tr>
              <td style="padding: 20px 24px 8px 24px;">
                <span style="font-size: 10px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase;">Placement Details</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 24px 20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${detailRow("Reference", data.reference, { bold: true })}
                  ${detailRow("Insured", data.insuredName, { bold: true })}
                  ${detailRow("Product Code", data.productCode)}
                  ${detailRow("Accepted By", `${data.acceptedByName} (${data.acceptedByCompany})`)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Action prompt -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 0 32px 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND_LIGHT}; border-radius: 10px; border: 1px solid #c6e7d2;">
            <tr>
              <td style="padding: 18px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="32" valign="top">
                      <div style="width: 24px; height: 24px; background: ${BRAND}; border-radius: 50%; text-align: center; line-height: 24px;">
                        <span style="color: #ffffff; font-size: 12px;">&#128274;</span>
                      </div>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="font-size: 13px; font-weight: 600; color: ${BRAND}; margin: 0 0 2px 0;">Ready to Bind</p>
                      <p style="font-size: 12px; color: #065f46; margin: 0; line-height: 1.5;">Please log in to FLIGHTDECK to review the firm order and bind the risk.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton()}`;

  return {
    to: [],
    subject: `[FLIGHTDECK] Firm Order \u2014 ${data.reference} \u2014 ${data.insuredName}`,
    html: baseTemplate("firmorder", content),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUND — Underwriter binds → notify broker
// ═══════════════════════════════════════════════════════════════════════════════

export function buildBoundEmail(data: {
  reference: string;
  insuredName: string;
  productCode: string;
  boundByName: string;
  boundByCompany: string;
  facilityRef: string;
  boundDate: string;
  premium: number;
  currency: string;
}): EmailNotification {
  const formattedPremium = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: data.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(data.premium);

  const content = `
    <!-- Success banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND};">
            <tr>
              <td style="padding: 28px 32px;" align="center">
                <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 50%; text-align: center; line-height: 48px; margin-bottom: 12px;">
                  <span style="color: #ffffff; font-size: 24px;">&#10003;</span>
                </div>
                <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; line-height: 1.3;">Risk Successfully Bound</h2>
                <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin: 0;">
                  Bound by ${data.boundByName} (${data.boundByCompany}) on ${data.boundDate}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Premium & Reference -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 24px 32px 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="padding-right: 8px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;">
                  <tr>
                    <td style="padding: 18px 20px;" align="center">
                      <span style="font-size: 10px; font-weight: 600; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 4px;">Reference</span>
                      <span style="font-size: 16px; font-weight: 700; color: #111827;">${data.reference}</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td width="50%" style="padding-left: 8px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;">
                  <tr>
                    <td style="padding: 18px 20px;" align="center">
                      <span style="font-size: 10px; font-weight: 600; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 4px;">Total Premium</span>
                      <span style="font-size: 16px; font-weight: 700; color: ${BRAND};">${formattedPremium}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Details card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 16px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;">
            <tr>
              <td style="padding: 20px 24px 8px 24px;">
                <span style="font-size: 10px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase;">Binding Summary</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 24px 20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${detailRow("Facility Ref", data.facilityRef)}
                  ${detailRow("Insured", data.insuredName, { bold: true })}
                  ${detailRow("Product Code", data.productCode)}
                  ${detailRow("Bound By", `${data.boundByName} (${data.boundByCompany})`)}
                  ${detailRow("Bound Date", data.boundDate, { bold: true })}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Documents available notice -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 8px 32px 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0;">
            <tr>
              <td style="padding: 20px 24px;">
                <p style="font-size: 12px; font-weight: 600; color: ${BRAND}; margin: 0 0 8px 0;">Documents Now Available</p>
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 3px 0;">
                      <span style="font-size: 12px; color: #065f46;">&#9679;&ensp;Binding Slip</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">
                      <span style="font-size: 12px; color: #065f46;">&#9679;&ensp;EOC Covering Letter</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">
                      <span style="font-size: 12px; color: #065f46;">&#9679;&ensp;Claims Notification Procedures</span>
                    </td>
                  </tr>
                </table>
                <p style="font-size: 11px; color: #6b7280; margin: 10px 0 0 0;">Log in to FLIGHTDECK to download binding documentation.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton()}`;

  return {
    to: [],
    subject: `[FLIGHTDECK] Risk Bound \u2014 ${data.reference} \u2014 ${data.insuredName}`,
    html: baseTemplate("bound", content),
  };
}