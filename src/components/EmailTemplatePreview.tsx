import { useState } from "react";
import { Mail, Send, FileText, Lock, CheckCircle2, ChevronRight, Eye } from "lucide-react";

// ── Sample data for preview ─────────────────────────────────────────────────

const SAMPLE = {
  reference: "FLY260042",
  insuredName: "Susi Air Pty Ltd",
  productCode: "HL",
  brokerName: "Pacific Aviation Brokers",
  brokerCompany: "AeroCover",
  submittedByName: "James Whitfield",
  facilityRef: "LS260001",
  inceptionDate: "2026-04-01",
  underwriterName: "Sarah Chen",
  underwriterCompany: "Tokio Marine Kiln",
  premium: 245000,
  currency: "USD",
  acceptedByName: "James Whitfield",
  acceptedByCompany: "AeroCover",
  boundByName: "Sarah Chen",
  boundByCompany: "Tokio Marine Kiln",
  boundDate: "2026-03-13",
};

// ── Template type definitions ───────────────────────────────────────────────

type TemplateType = "pending" | "quoted" | "firmorder" | "bound";

interface TemplateInfo {
  id: TemplateType;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  recipientLabel: string;
  trigger: string;
}

const TEMPLATES: TemplateInfo[] = [
  {
    id: "pending",
    label: "Pending Review",
    subtitle: "Risk submitted for underwriter review",
    icon: <Send className="size-4" />,
    accentColor: "#b45309",
    accentBg: "#fef3c7",
    recipientLabel: "Authorised Underwriters",
    trigger: "Broker submits a risk",
  },
  {
    id: "quoted",
    label: "Quotation Received",
    subtitle: "Underwriter provides quotation",
    icon: <FileText className="size-4" />,
    accentColor: "#1d4ed8",
    accentBg: "#dbeafe",
    recipientLabel: "Submitting Broker + Preferred Broker Contact",
    trigger: "Underwriter submits a quote",
  },
  {
    id: "firmorder",
    label: "Firm Order",
    subtitle: "Broker accepts quote for binding",
    icon: <Lock className="size-4" />,
    accentColor: "#065f46",
    accentBg: "#d1fae5",
    recipientLabel: "Authorised Underwriters",
    trigger: "Broker accepts the quotation",
  },
  {
    id: "bound",
    label: "Risk Bound",
    subtitle: "Underwriter binds the placement",
    icon: <CheckCircle2 className="size-4" />,
    accentColor: "#004225",
    accentBg: "#e8f5ee",
    recipientLabel: "Submitting Broker + Preferred Broker Contact",
    trigger: "Underwriter confirms binding",
  },
];

// ── Inline HTML email builders (mirrors server templates for preview) ────────

const BRAND = "#004225";
const BRAND_LIGHT = "#e8f5ee";

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
          const circleColor = isComplete ? BRAND : isCurrent ? BRAND : "#d1d5db";
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
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: ${circleBg}; border: 2px solid ${circleColor}; display: inline-block; text-align: center; line-height: 22px;">
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
  return `<span style="display: inline-block; padding: 5px 14px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; background: ${config.bg}; color: ${config.color};">${config.label}</span>`;
}

function ctaButton(): string {
  return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 28px 28px 28px;" align="center"><a href="#" style="display: inline-block; padding: 14px 36px; background: ${BRAND}; color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-decoration: none; border-radius: 8px; text-transform: uppercase;">Log in to FLIGHTDECK</a></td></tr>
        </table>`;
}

function baseEmailTemplate(status: string, content: string): string {
  return `
  <div style="background-color: #f3f4f6; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; margin: 0 auto;">
      <tr>
        <td style="background: ${BRAND}; padding: 0; border-radius: 12px 12px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 24px 28px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td><span style="font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 4px; text-transform: uppercase;">FLIGHTDECK</span></td>
                    <td align="right"><span style="font-size: 9px; font-weight: 500; color: rgba(255,255,255,0.6); letter-spacing: 1px; text-transform: uppercase;">Aviation Placement</span></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          ${content}
        </td>
      </tr>
      <tr>
        <td style="background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding: 0 28px;"><div style="height: 1px; background: #f3f4f6;"></div></td></tr>
            <tr>
              <td style="padding: 20px 28px;">
                <p style="font-size: 10px; color: #9ca3af; line-height: 1.5; margin: 0;">This is an automated notification from <strong style="color: #6b7280;">FLIGHTDECK</strong>. Do not reply to this email.</p>
                <p style="font-size: 9px; color: #d1d5db; line-height: 1.4; margin: 8px 0 0 0;">CONFIDENTIALITY NOTICE: This email and any attachments are for the exclusive and confidential use of the intended recipient.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 28px 0 28px;" align="center">
          <span style="font-size: 9px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">FLIGHTDECK</span>
          <span style="font-size: 9px; color: #d1d5db; padding: 0 6px;">&middot;</span>
          <span style="font-size: 9px; color: #9ca3af;">Aviation Insurance Placement Platform</span>
        </td>
      </tr>
    </table>
  </div>`;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Build preview HTML for each template type
function buildPreviewHtml(type: TemplateType): string {
  const d = SAMPLE;
  const premium = formatCurrency(d.premium, d.currency);

  switch (type) {
    case "pending":
      return baseEmailTemplate("pending", `
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 24px 28px 0 28px;">${statusBadge("pending")}</td></tr>
          <tr><td style="padding: 16px 28px 0 28px;"><h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 6px 0;">New Risk Submitted for Review</h2><p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">A new placement has been submitted by <strong style="color: #374151;">${d.submittedByName}</strong> at <strong style="color: #374151;">${d.brokerCompany}</strong> and requires your quotation.</p></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 20px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;"><tr><td style="padding: 16px 20px 6px 20px;"><span style="font-size: 9px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase;">Placement Details</span></td></tr><tr><td style="padding: 6px 20px 16px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${detailRow("Reference", d.reference, { bold: true })}${detailRow("Insured", d.insuredName, { bold: true })}${detailRow("Product Code", d.productCode)}</table></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 28px 28px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND_LIGHT}; border-radius: 10px; border: 1px solid #c6e7d2;"><tr><td style="padding: 16px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="32" valign="top"><div style="width: 22px; height: 22px; background: ${BRAND}; border-radius: 50%; text-align: center; line-height: 22px;"><span style="color: #ffffff; font-size: 11px;">&#9998;</span></div></td><td style="padding-left: 10px;"><p style="font-size: 12px; font-weight: 600; color: ${BRAND}; margin: 0 0 2px 0;">Action Required</p><p style="font-size: 11px; color: #065f46; margin: 0; line-height: 1.5;">Please log in to FLIGHTDECK to review this submission and provide your quotation.</p></td></tr></table></td></tr></table></td></tr>
        </table>${ctaButton()}`);
    
    case "quoted":
      return baseEmailTemplate("quoted", `
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 24px 28px 0 28px;">${statusBadge("quoted")}</td></tr>
          <tr><td style="padding: 16px 28px 0 28px;"><h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 6px 0;">Quotation Received</h2><p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;"><strong style="color: #374151;">${d.underwriterName}</strong> (${d.underwriterCompany}) has provided a quotation for the following risk.</p></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 20px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;"><tr><td style="padding: 16px 20px 6px 20px;"><span style="font-size: 9px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase;">Placement Details</span></td></tr><tr><td style="padding: 6px 20px 16px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${detailRow("Reference", d.reference, { bold: true })}${detailRow("Insured", d.insuredName, { bold: true })}${detailRow("Product Code", d.productCode)}${detailRow("Quoted By", `${d.underwriterName} (${d.underwriterCompany})`)}</table></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 28px 28px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe;"><tr><td style="padding: 16px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="32" valign="top"><div style="width: 22px; height: 22px; background: #2563eb; border-radius: 50%; text-align: center; line-height: 22px;"><span style="color: #ffffff; font-size: 11px;">&#10003;</span></div></td><td style="padding-left: 10px;"><p style="font-size: 12px; font-weight: 600; color: #1d4ed8; margin: 0 0 2px 0;">Review Required</p><p style="font-size: 11px; color: #1e40af; margin: 0; line-height: 1.5;">Log in to FLIGHTDECK to review the full quotation terms and respond with your instructions.</p></td></tr></table></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 28px 16px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;"><tr><td style="padding: 14px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" valign="top"><span style="font-size: 16px;">&#128206;</span></td><td style="padding-left: 8px;"><p style="font-size: 11px; font-weight: 600; color: #374151; margin: 0 0 2px 0;">Attached: Quote-${d.reference}-${d.insuredName.replace(/\s+/g, "-")}.pdf</p><p style="font-size: 10px; color: #9ca3af; margin: 0;">Quotation Declaration slip generated from FLIGHTDECK</p></td></tr></table></td></tr></table></td></tr>
        </table>${ctaButton()}`);
    
    case "firmorder":
      return baseEmailTemplate("firmorder", `
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 24px 28px 0 28px;">${statusBadge("firmorder")}</td></tr>
          <tr><td style="padding: 16px 28px 0 28px;"><h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 6px 0;">Firm Order Received</h2><p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;"><strong style="color: #374151;">${d.acceptedByName}</strong> at <strong style="color: #374151;">${d.acceptedByCompany}</strong> has accepted the quotation and placed a firm order for binding.</p></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 20px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;"><tr><td style="padding: 16px 20px 6px 20px;"><span style="font-size: 9px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase;">Placement Details</span></td></tr><tr><td style="padding: 6px 20px 16px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${detailRow("Reference", d.reference, { bold: true })}${detailRow("Insured", d.insuredName, { bold: true })}${detailRow("Product Code", d.productCode)}${detailRow("Accepted By", `${d.acceptedByName} (${d.acceptedByCompany})`)}</table></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 28px 28px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND_LIGHT}; border-radius: 10px; border: 1px solid #c6e7d2;"><tr><td style="padding: 16px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="32" valign="top"><div style="width: 22px; height: 22px; background: ${BRAND}; border-radius: 50%; text-align: center; line-height: 22px;"><span style="color: #ffffff; font-size: 11px;">&#128274;</span></div></td><td style="padding-left: 10px;"><p style="font-size: 12px; font-weight: 600; color: ${BRAND}; margin: 0 0 2px 0;">Ready to Bind</p><p style="font-size: 11px; color: #065f46; margin: 0; line-height: 1.5;">Please log in to FLIGHTDECK to review the firm order and bind the risk.</p></td></tr></table></td></tr></table></td></tr>
        </table>${ctaButton()}`);
    
    case "bound":
      return baseEmailTemplate("bound", `
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND};"><tr><td style="padding: 24px 28px;" align="center"><div style="width: 40px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 50%; text-align: center; line-height: 40px; margin-bottom: 10px;"><span style="color: #ffffff; font-size: 20px;">&#10003;</span></div><h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 4px 0;">Risk Successfully Bound</h2><p style="font-size: 12px; color: rgba(255,255,255,0.7); margin: 0;">Bound by ${d.boundByName} (${d.boundByCompany}) on ${d.boundDate}</p></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 20px 28px 0 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" style="padding-right: 6px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;"><tr><td style="padding: 14px 16px;" align="center"><span style="font-size: 9px; font-weight: 600; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 3px;">Reference</span><span style="font-size: 14px; font-weight: 700; color: #111827;">${d.reference}</span></td></tr></table></td><td width="50%" style="padding-left: 6px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;"><tr><td style="padding: 14px 16px;" align="center"><span style="font-size: 9px; font-weight: 600; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 3px;">Total Premium</span><span style="font-size: 14px; font-weight: 700; color: ${BRAND};">${premium}</span></td></tr></table></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 12px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6;"><tr><td style="padding: 16px 20px 6px 20px;"><span style="font-size: 9px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase;">Binding Summary</span></td></tr><tr><td style="padding: 6px 20px 16px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${detailRow("Facility Ref", d.facilityRef)}${detailRow("Insured", d.insuredName, { bold: true })}${detailRow("Product Code", d.productCode)}${detailRow("Bound By", `${d.boundByName} (${d.boundByCompany})`)}${detailRow("Bound Date", d.boundDate, { bold: true })}</table></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 6px 28px 20px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0;"><tr><td style="padding: 16px 20px;"><p style="font-size: 11px; font-weight: 600; color: ${BRAND}; margin: 0 0 6px 0;">Documents Now Available</p><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 2px 0;"><span style="font-size: 11px; color: #065f46;">&#9679;&ensp;Binding Slip</span></td></tr><tr><td style="padding: 2px 0;"><span style="font-size: 11px; color: #065f46;">&#9679;&ensp;EOC Covering Letter</span></td></tr><tr><td style="padding: 2px 0;"><span style="font-size: 11px; color: #065f46;">&#9679;&ensp;Claims Notification Procedures</span></td></tr></table><p style="font-size: 10px; color: #6b7280; margin: 8px 0 0 0;">All three documents are attached to this email and also available in FLIGHTDECK.</p></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 28px 6px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;"><tr><td style="padding: 12px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" valign="top"><span style="font-size: 16px;">&#128206;</span></td><td style="padding-left: 8px;"><p style="font-size: 11px; font-weight: 600; color: #374151; margin: 0;">BindingSlip-${d.reference}-${d.insuredName.replace(/\s+/g, "-")}.pdf</p></td></tr></table></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 28px 6px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;"><tr><td style="padding: 12px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" valign="top"><span style="font-size: 16px;">&#128206;</span></td><td style="padding-left: 8px;"><p style="font-size: 11px; font-weight: 600; color: #374151; margin: 0;">EOC-CoveringLetter-${d.reference}-${d.insuredName.replace(/\s+/g, "-")}.pdf</p></td></tr></table></td></tr></table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 28px 16px 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;"><tr><td style="padding: 12px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" valign="top"><span style="font-size: 16px;">&#128206;</span></td><td style="padding-left: 8px;"><p style="font-size: 11px; font-weight: 600; color: #374151; margin: 0;">ClaimsNotification-${d.reference}-${d.insuredName.replace(/\s+/g, "-")}.pdf</p></td></tr></table></td></tr></table></td></tr>
        </table>${ctaButton()}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════

export function EmailTemplatePreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("pending");
  const selected = TEMPLATES.find(t => t.id === selectedTemplate)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="size-5 text-[#004225]" />
          <h3 className="text-base font-semibold text-gray-900">Email Notification Templates</h3>
        </div>
        <p className="text-xs text-gray-500">
          Preview the automated email notifications sent at each stage of the placement lifecycle. These emails are triggered by status transitions and sent to the relevant parties.
        </p>
      </div>

      {/* Workflow overview cards */}
      <div className="grid grid-cols-4 gap-3">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTemplate(t.id)}
            className={`relative text-left p-3.5 rounded-xl border-2 transition-all duration-200 ${
              selectedTemplate === t.id
                ? "border-[#004225] bg-[#004225]/[0.03] ring-1 ring-[#004225]/10"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            {/* Step number */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                selectedTemplate === t.id ? "bg-[#004225] text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {i + 1}
              </div>
              {i < TEMPLATES.length - 1 && (
                <ChevronRight className="size-3 text-gray-300 absolute right-2 top-4" />
              )}
            </div>
            
            {/* Icon + label */}
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: t.accentBg, color: t.accentColor }}
              >
                {t.icon}
              </div>
              <span className={`text-xs font-semibold ${
                selectedTemplate === t.id ? "text-[#004225]" : "text-gray-700"
              }`}>
                {t.label}
              </span>
            </div>
            
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{t.subtitle}</p>
          </button>
        ))}
      </div>

      {/* Template details bar */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trigger</span>
          <span className="text-xs text-gray-700 font-medium">{selected.trigger}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Recipients</span>
          <span className="text-xs text-gray-700 font-medium">{selected.recipientLabel}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Eye className="size-3.5 text-gray-400" />
          <span className="text-[10px] font-medium text-gray-500">Preview with sample data</span>
        </div>
      </div>

      {/* Email preview */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Email subject bar */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <Mail className="size-4 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 font-medium">Subject</p>
            <p className="text-xs text-gray-700 font-semibold truncate">
              {selectedTemplate === "pending" && `[FLIGHTDECK] New Risk Submission \u2014 ${SAMPLE.reference} \u2014 ${SAMPLE.insuredName}`}
              {selectedTemplate === "quoted" && `[FLIGHTDECK] Quotation Received \u2014 ${SAMPLE.reference} \u2014 ${SAMPLE.insuredName}`}
              {selectedTemplate === "firmorder" && `[FLIGHTDECK] Firm Order \u2014 ${SAMPLE.reference} \u2014 ${SAMPLE.insuredName}`}
              {selectedTemplate === "bound" && `[FLIGHTDECK] Risk Bound \u2014 ${SAMPLE.reference} \u2014 ${SAMPLE.insuredName}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">To:</span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: selected.accentBg, color: selected.accentColor }}
            >
              {selected.recipientLabel}
            </span>
          </div>
        </div>
        
        {/* Rendered email */}
        <div className="overflow-auto" style={{ maxHeight: "620px" }}>
          <div dangerouslySetInnerHTML={{ __html: buildPreviewHtml(selectedTemplate) }} />
        </div>
      </div>
    </div>
  );
}