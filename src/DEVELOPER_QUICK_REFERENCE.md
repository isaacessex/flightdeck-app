# FLIGHTDECK Developer Quick Reference

Quick reference guide for common development tasks and code patterns.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Data Operations](#data-operations)
- [Authentication](#authentication)
- [Status Transitions](#status-transitions)
- [PDF Generation](#pdf-generation)
- [Email Notifications](#email-notifications)
- [Common Patterns](#common-patterns)

---

## Environment Setup

### Quick Start
```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Supabase Function Deployment
```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy server
```

---

## Data Operations

### Fetching Data from Backend

```typescript
import { projectId, publicAnonKey } from './utils/supabase/info';

// GET request
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-afd91142/placements`,
  {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  }
);
const data = await response.json();
```

### Saving Data to Backend

```typescript
// POST request
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-afd91142/placements`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify(placementData)
  }
);
```

### Using KV Store in Backend

```typescript
import * as kv from './kv_store';

// Single operations
await kv.set('key', value);
const value = await kv.get('key');
await kv.del('key');

// Multiple operations
await kv.mset({ key1: value1, key2: value2 });
const values = await kv.mget(['key1', 'key2']);
await kv.mdel(['key1', 'key2']);

// Prefix search
const results = await kv.getByPrefix('placement:');
```

---

## Authentication

### Creating a New User (Server-side)

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
);

const { data, error } = await supabase.auth.admin.createUser({
  email: 'broker@example.com',
  password: 'securepassword',
  user_metadata: { name: 'John Broker' },
  email_confirm: true  // Auto-confirm since no email server configured
});
```

### Signing In (Frontend)

```typescript
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './utils/supabase/info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

const { data: { session }, error } = await supabase.auth.signInWithPassword({
  email: 'broker@example.com',
  password: 'securepassword',
});

const accessToken = session?.access_token;
```

### Checking Authentication (Server-side)

```typescript
app.post('/make-server-afd91142/protected-route', async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (!user?.id) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // User is authenticated, proceed with logic
  const userId = user.id;
});
```

### Getting Current Session (Frontend)

```typescript
const { data: { session }, error } = await supabase.auth.getSession();
if (session) {
  const accessToken = session.access_token;
  // User is logged in
}
```

---

## Status Transitions

### Status Workflow Order

```typescript
type PlacementStatus = 
  | "draft"      // Initial creation
  | "pending"    // Submitted to underwriter → triggers email
  | "quoted"     // Underwriter provides quote → triggers email
  | "firmorder"  // Broker confirms order → triggers email
  | "bound"      // Policy is bound → triggers email + PDFs
  | "declined"   // Underwriter declines
  | "ntu";       // Not taken up
```

### Updating Status

```typescript
const updatePlacementStatus = async (
  placementId: string, 
  newStatus: PlacementStatus
) => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-afd91142/placements/${placementId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ status: newStatus })
    }
  );
  
  return response.json();
};
```

### Status-Based Logic

```typescript
// Check if placement can be edited
const canEdit = placement.status === 'draft';

// Check if can transition to bound
const canBind = placement.status === 'firmorder';

// Check if should show quote slip
const showQuoteSlip = ['quoted', 'firmorder'].includes(placement.status);

// Check if should show binding slip
const showBindingSlip = placement.status === 'bound';
```

---

## PDF Generation

### Generating Binding Slip

```typescript
import { generateBindingSlipBase64 } from './components/SlipDocumentViewer';

// Generate PDF as base64 string
const pdfBase64 = await generateBindingSlipBase64(placement);

// Convert to blob for download
const blob = base64ToBlob(pdfBase64, 'application/pdf');
const url = URL.createObjectURL(blob);

// Trigger download
const link = document.createElement('a');
link.href = url;
link.download = `binding-slip-${placement.id}.pdf`;
link.click();
```

### Document Type Detection

```typescript
const getDocumentType = (placement: Placement, isEOC: boolean = false) => {
  if (placement.status === 'bound') return 'binding';
  if (isEOC) return 'eoc';
  return 'quote';
};

// Color scheme based on document type
const colors = {
  quote: '#004225',     // British Racing Green
  binding: '#004225',   // British Racing Green
  eoc: '#D97706',       // Amber
  claims: '#7C3AED'     // Purple
};
```

### Custom Placeholder Resolution

```typescript
const resolvePlaceholder = (placeholder: string, placement: Placement): string => {
  // Handle nested properties
  if (placeholder === 'INSURED_NAME') {
    return placement.insuredName || 'N/A';
  }
  
  // Handle dates
  if (placeholder === 'INCEPTION_DATE') {
    return placement.inceptionDate 
      ? new Date(placement.inceptionDate).toLocaleDateString('en-GB')
      : 'N/A';
  }
  
  // Handle currency
  if (placeholder === 'PREMIUM') {
    return placement.premium 
      ? `$${placement.premium.toLocaleString()}`
      : 'N/A';
  }
  
  return 'N/A';
};
```

---

## Email Notifications

### Triggering Notifications

```typescript
import { notifyPending, notifyQuoted, notifyFirmOrder, notifyBound } from './utils/notifications';

// When status changes
const handleStatusChange = async (placement: Placement, newStatus: PlacementStatus) => {
  // Update status first
  const updated = await updatePlacement({ ...placement, status: newStatus });
  
  // Then trigger notification
  switch (newStatus) {
    case 'pending':
      await notifyPending(updated);
      break;
    case 'quoted':
      await notifyQuoted(updated);
      break;
    case 'firmorder':
      await notifyFirmOrder(updated);
      break;
    case 'bound':
      await notifyBound(updated);
      break;
  }
};
```

### Email Template Structure

```typescript
// In supabase/functions/server/notifications.tsx

export const sendEmail = async (params: {
  to: string;
  subject: string;
  placementId: string;
  status: string;
  additionalData?: Record<string, any>;
}) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Inter', sans-serif; }
          .header { background-color: #004225; color: white; padding: 20px; }
          .content { padding: 20px; }
          .footer { background-color: #f3f4f6; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FLIGHTDECK</h1>
        </div>
        <div class="content">
          <!-- Email content -->
        </div>
        <div class="footer">
          <!-- Footer content -->
        </div>
      </body>
    </html>
  `;
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@yourdomain.com',
      to: params.to,
      subject: params.subject,
      html: html,
    }),
  });
  
  return response.json();
};
```

---

## Common Patterns

### Contact Type Handling

```typescript
// Display name for different contact types
const getContactDisplayName = (contact: Contact): string => {
  if (contact.type === 'Insured') {
    return contact.insuredName || 'N/A';
  }
  if (contact.type === 'Cedent') {
    return contact.cedentName || 'N/A';
  }
  return `${contact.firstName} ${contact.lastName}`;
};

// Display email
const getContactEmail = (contact: Contact): string => {
  if (contact.type === 'Insured' || contact.type === 'Cedent') {
    return 'N/A';
  }
  return contact.email;
};
```

### Product Code Display

```typescript
const PRODUCT_NAMES: Record<ProductCode, string> = {
  HL: 'Hull & Spares',
  HW: 'Hull War',
  PA: 'Personal Accident',
  LOL: 'Loss of License',
  HD: 'Hull Deductible',
  UAS: 'Unmanned Aircraft Systems'
};

const getProductName = (code: ProductCode) => PRODUCT_NAMES[code];
```

### Date Formatting

```typescript
// British date format (DD/MM/YYYY)
const formatDate = (date: string | Date): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB');
};

// ISO date for inputs
const toISODate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
```

### Currency Formatting

```typescript
const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
```

### Error Handling Pattern

```typescript
const handleApiCall = async () => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('API call failed:', error);
    return { data: null, error: error.message };
  }
};
```

### Loading State Pattern

```typescript
const [loading, setLoading] = useState(false);
const [data, setData] = useState<Placement[]>([]);
const [error, setError] = useState<string | null>(null);

const loadData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    setData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Form Submission Pattern

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) throw new Error('Submission failed');
    
    toast.success('Saved successfully');
    onClose();
  } catch (error) {
    toast.error(error.message);
  } finally {
    setSubmitting(false);
  }
};
```

---

## Design System Classes

### Colors

```typescript
// Primary (British Racing Green)
'bg-[#004225]'
'text-[#004225]'
'border-[#004225]'

// Backgrounds
'bg-white'
'bg-gray-50'

// Borders
'border-gray-200'

// Text hierarchy
'text-gray-900'  // Primary text
'text-gray-700'  // Secondary text
'text-gray-500'  // Tertiary text
```

### Common Component Patterns

```typescript
// Button
<button className="px-4 py-2 bg-[#004225] text-white rounded-md hover:bg-[#003119] transition-colors">
  Action
</button>

// Card
<div className="bg-white border border-gray-200 rounded-lg p-6">
  Content
</div>

// Input
<input className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#004225] focus:border-transparent" />

// Badge
<span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
  Label
</span>
```

---

## Useful VS Code Snippets

Add to `.vscode/snippets.code-snippets`:

```json
{
  "FLIGHTDECK Fetch": {
    "prefix": "fdFetch",
    "body": [
      "const response = await fetch(",
      "  `https://\\${projectId}.supabase.co/functions/v1/make-server-afd91142/${1:route}`,",
      "  {",
      "    headers: {",
      "      'Authorization': `Bearer \\${publicAnonKey}`",
      "    }",
      "  }",
      ");",
      "const data = await response.json();"
    ]
  }
}
```

---

## Testing Checklist

- [ ] Test all status transitions
- [ ] Verify PDF generation for each document type
- [ ] Test email notifications (check spam folder)
- [ ] Test contact CRUD operations
- [ ] Test lineslip creation and management
- [ ] Test on mobile and desktop
- [ ] Test with broker and underwriter roles
- [ ] Check browser console for errors
- [ ] Verify data persistence across page refreshes

---

**Last Updated:** March 2026
