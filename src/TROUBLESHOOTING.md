# FLIGHTDECK Troubleshooting Guide

Common issues and their solutions when developing or deploying FLIGHTDECK.

## Table of Contents

1. [Development Environment Issues](#development-environment-issues)
2. [Supabase Connection Issues](#supabase-connection-issues)
3. [Authentication Problems](#authentication-problems)
4. [PDF Generation Issues](#pdf-generation-issues)
5. [Email Notification Issues](#email-notification-issues)
6. [Data Loading Issues](#data-loading-issues)
7. [Build and Deployment Issues](#build-and-deployment-issues)

---

## Development Environment Issues

### Cannot Start Development Server

**Error:** `npm run dev` fails or shows errors

**Solutions:**

1. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node version:**
   ```bash
   node --version  # Should be 18.x or higher
   ```

3. **Check for port conflicts:**
   ```bash
   # Port 3000 might be in use
   lsof -ti:3000  # On Mac/Linux
   # Kill the process or change port in vite.config.ts
   ```

### TypeScript Errors After Fresh Install

**Error:** Type errors in IDE or build

**Solutions:**

1. **Restart TypeScript server** (VS Code):
   - Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

2. **Check tsconfig.json is present:**
   ```bash
   ls -la tsconfig.json
   ```

3. **Reinstall TypeScript:**
   ```bash
   npm install typescript --save-dev
   ```

### Missing Environment Variables

**Error:** `Cannot read property 'SUPABASE_URL' of undefined`

**Solutions:**

1. **Check .env file exists:**
   ```bash
   cp .env.example .env
   ```

2. **Update utils/supabase/info.tsx** with correct values

3. **Restart dev server** after changing environment variables

---

## Supabase Connection Issues

### "Failed to fetch" or CORS Errors

**Error:** Network requests to Supabase fail with CORS errors

**Solutions:**

1. **Check Supabase URL is correct:**
   ```typescript
   // In utils/supabase/info.tsx
   export const projectId = "correct-project-id";
   ```

2. **Verify Edge Function CORS headers:**
   ```typescript
   // In supabase/functions/server/index.tsx
   app.use('*', cors({
     origin: '*',
     allowHeaders: ['Content-Type', 'Authorization'],
     allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
   }));
   ```

3. **Check network tab** in browser DevTools for actual error message

### Edge Function Not Responding

**Error:** Requests to `/make-server-afd91142/*` timeout or 404

**Solutions:**

1. **Verify function is deployed:**
   ```bash
   supabase functions list
   ```

2. **Check function logs:**
   ```bash
   supabase functions logs server --tail
   ```

3. **Redeploy function:**
   ```bash
   supabase functions deploy server
   ```

4. **Check environment variables are set** in Supabase dashboard

### Database Connection Errors

**Error:** "Failed to connect to database" or similar

**Solutions:**

1. **Check Supabase project is not paused** (free tier auto-pauses after inactivity)

2. **Verify SERVICE_ROLE_KEY** is set correctly in Edge Function environment

3. **Test connection** from Supabase SQL editor:
   ```sql
   SELECT * FROM kv_store_afd91142 LIMIT 1;
   ```

---

## Authentication Problems

### Cannot Sign In / "Invalid credentials"

**Error:** Sign in fails even with correct credentials

**Solutions:**

1. **Check user exists:**
   - Go to Supabase Dashboard → Authentication → Users
   - Verify user is listed

2. **Check email confirmation settings:**
   ```typescript
   // In server signup route, ensure email_confirm: true
   await supabase.auth.admin.createUser({
     email: email,
     password: password,
     email_confirm: true  // Auto-confirm
   });
   ```

3. **Test with getUser:**
   ```typescript
   const { data, error } = await supabase.auth.getUser(accessToken);
   console.log('User check:', data, error);
   ```

### Session Expires Immediately

**Error:** User gets logged out right after signing in

**Solutions:**

1. **Check JWT expiry** in Supabase Authentication settings:
   - Should be at least 3600 (1 hour)

2. **Verify token storage:**
   ```typescript
   // Check localStorage in browser DevTools
   localStorage.getItem('supabase.auth.token')
   ```

3. **Enable refresh token rotation** in Supabase settings

### "Unauthorized" Errors on Protected Routes

**Error:** 401 errors when accessing protected endpoints

**Solutions:**

1. **Check Authorization header:**
   ```typescript
   // Frontend should send:
   headers: {
     'Authorization': `Bearer ${accessToken}`
   }
   ```

2. **Verify token is valid:**
   ```typescript
   const { data: { user }, error } = await supabase.auth.getUser(accessToken);
   if (error) console.log('Invalid token:', error);
   ```

3. **Check token expiration:**
   ```typescript
   // Tokens expire - implement refresh logic
   const { data: { session } } = await supabase.auth.getSession();
   ```

---

## PDF Generation Issues

### PDFs Not Generating

**Error:** Generate PDF button doesn't work or shows errors

**Solutions:**

1. **Check browser console** for JavaScript errors

2. **Verify placement data is complete:**
   ```typescript
   console.log('Placement data:', placement);
   // Check all required fields are present
   ```

3. **Test with simple data:**
   ```typescript
   // In SlipDocumentViewer.tsx, temporarily hardcode values
   ```

4. **Check jsPDF is imported correctly:**
   ```typescript
   import jsPDF from 'jspdf';
   ```

### PDF Content Missing or Incorrect

**Error:** PDF generates but missing data or shows placeholders

**Solutions:**

1. **Check resolvePlaceholder function:**
   ```typescript
   // In SlipDocumentViewer.tsx
   const resolved = resolvePlaceholder(placeholder, placement);
   console.log('Resolved:', placeholder, '→', resolved);
   ```

2. **Verify field mappings** match your data structure

3. **Check for undefined values:**
   ```typescript
   // Add null checks
   const value = placement?.fieldName ?? 'N/A';
   ```

### PDF Styling Issues

**Error:** PDF colors, fonts, or layout incorrect

**Solutions:**

1. **Check document type determination:**
   ```typescript
   const documentType = 
     placement.status === 'bound' ? 'binding' : 
     isEOC ? 'eoc' : 
     'quote';
   ```

2. **Verify color codes:**
   ```typescript
   // Binding: #004225 (green)
   // EOC: Amber
   // Claims: Purple
   ```

3. **Test font availability:**
   ```typescript
   doc.setFont('helvetica');  // Use built-in fonts
   ```

---

## Email Notification Issues

### Emails Not Sending

**Error:** Status transitions don't trigger emails

**Solutions:**

1. **Check RESEND_API_KEY** is set in Edge Function environment

2. **Verify Resend domain** is configured:
   - Go to https://resend.com/domains
   - Check domain status is "Verified"

3. **Check notification function:**
   ```typescript
   // Add logging
   console.log('Sending notification:', { type, to, placement });
   ```

4. **Test Resend API directly:**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"test@yourdomain.com","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
   ```

### Emails Go to Spam

**Error:** Emails are received but in spam folder

**Solutions:**

1. **Set up SPF and DKIM** records in Resend (follow their guide)

2. **Use verified domain** as sender:
   ```typescript
   from: 'noreply@yourdomain.com'  // Not @gmail.com
   ```

3. **Improve email content:**
   - Add plain text version
   - Include unsubscribe link
   - Avoid spam trigger words

### Email Template Not Rendering

**Error:** Email shows HTML code instead of formatted content

**Solutions:**

1. **Check email client** supports HTML emails

2. **Validate HTML template:**
   ```bash
   # Use online HTML validator
   ```

3. **Test with minimal template:**
   ```typescript
   html: '<html><body><h1>Test</h1></body></html>'
   ```

---

## Data Loading Issues

### Placements Not Loading

**Error:** Dashboard shows "No placements found" or infinite loading

**Solutions:**

1. **Check KV store:**
   ```typescript
   // In browser console
   const response = await fetch(
     `https://${projectId}.supabase.co/functions/v1/make-server-afd91142/placements`,
     { headers: { 'Authorization': `Bearer ${publicAnonKey}` }}
   );
   console.log(await response.json());
   ```

2. **Verify server route:**
   ```typescript
   // In supabase/functions/server/index.tsx
   app.get('/make-server-afd91142/placements', async (c) => {
     // Check this route exists and returns data
   });
   ```

3. **Check for errors in network tab**

### Contacts Not Appearing

**Error:** Contact Manager shows empty or missing contacts

**Solutions:**

1. **Check contact filter logic:**
   ```typescript
   // Verify filtering doesn't exclude all contacts
   const filtered = contacts.filter(c => /* conditions */);
   console.log('Filtered contacts:', filtered);
   ```

2. **Verify KV store key:**
   ```typescript
   // Should be 'contacts' or similar
   const contacts = await kv.get('contacts');
   ```

3. **Check contact type mapping:**
   ```typescript
   // Ensure type field matches expected values
   type: "Broker" | "Producing Broker" | "Underwriter" | "Insured" | "Cedent"
   ```

---

## Build and Deployment Issues

### Build Fails

**Error:** `npm run build` shows errors

**Solutions:**

1. **Fix TypeScript errors:**
   ```bash
   npm run build 2>&1 | grep "error TS"
   ```

2. **Check for unused imports:**
   ```bash
   # Remove unused imports flagged by ESLint
   ```

3. **Verify all files are saved**

4. **Clear build cache:**
   ```bash
   rm -rf dist .vite
   npm run build
   ```

### Production Build Loads Blank Page

**Error:** Deployed site shows blank page

**Solutions:**

1. **Check browser console** for errors

2. **Verify base path** in vite.config.ts:
   ```typescript
   export default defineConfig({
     base: '/',  // Or '/subdirectory/' if deployed to subdirectory
   });
   ```

3. **Check index.html path** in deployed files

4. **Verify environment variables** are set in hosting platform

### Assets Not Loading in Production

**Error:** Images, fonts, or styles missing in production

**Solutions:**

1. **Check asset paths:**
   ```typescript
   // Use absolute paths from root
   import logo from '/assets/logo.png';
   ```

2. **Verify build output:**
   ```bash
   ls -la dist/assets/
   ```

3. **Check hosting platform** serves static assets correctly

---

## Getting Additional Help

If issues persist:

1. **Check Edge Function logs:**
   ```bash
   supabase functions logs server --tail
   ```

2. **Enable verbose logging:**
   ```typescript
   console.log('Debug:', { /* relevant data */ });
   ```

3. **Check Supabase status:** https://status.supabase.com

4. **Review recent changes** in git history

5. **Create minimal reproduction** of the issue

6. **Check dependencies are up to date:**
   ```bash
   npm outdated
   ```

---

## Common Error Messages Reference

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `fetch failed` | Network/CORS issue | Check Supabase URL and CORS headers |
| `Unauthorized` | Invalid/missing auth token | Verify Authorization header |
| `404 Not Found` | Route doesn't exist | Check Edge Function routes |
| `500 Internal Server Error` | Backend error | Check Edge Function logs |
| `Invalid token` | Expired/invalid JWT | Refresh session |
| `MODULE_NOT_FOUND` | Missing dependency | Run `npm install` |
| `Cannot read property of undefined` | Missing data | Add null checks |
| `CORS policy` | CORS not configured | Add CORS headers to backend |

---

**Last Updated:** March 2026
