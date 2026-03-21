# FLIGHTDECK Deployment Guide

This guide walks you through deploying FLIGHTDECK to production.

## Prerequisites

- A Supabase project (create one at https://supabase.com)
- A hosting platform for the frontend (Vercel, Netlify, or similar)
- API keys for external services:
  - Resend (for email notifications)
  - JetAPI (optional - for aircraft registration lookups)
  - AeroDataBox (optional - for aircraft data)
  - ScoreChain (optional - for sanctions screening)

## Step 1: Set Up Supabase Project

### 1.1 Create a New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - Name: `flightdeck-production`
   - Database Password: Use a strong password
   - Region: Choose closest to your users
4. Wait for project to be provisioned

### 1.2 Note Your Credentials

From the Supabase dashboard, go to Project Settings → API:

- Project URL (e.g., `https://xxxxx.supabase.co`)
- `anon` public key
- `service_role` secret key (keep this secure!)

### 1.3 Set Up the Key-Value Store Table

The `kv_store_afd91142` table is automatically created by the backend on first run.

## Step 2: Deploy Supabase Edge Functions

### 2.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Login and Link Project

```bash
# Login to Supabase
supabase login

# Link to your production project
supabase link --project-ref your-project-ref
```

Your project ref is in your Supabase project URL: `https://[PROJECT-REF].supabase.co`

### 2.3 Set Environment Variables

In your Supabase dashboard, go to Edge Functions → Settings and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=your-database-connection-string
RESEND_API_KEY=your-resend-key
JETAPI_KEY=your-jetapi-key (optional)
AERODATABOX_API_KEY=your-aerodatabox-key (optional)
SCORECHAIN_API_KEY=your-scorechain-key (optional)
```

### 2.4 Deploy the Edge Function

```bash
# Deploy the server function
supabase functions deploy server

# Verify deployment
supabase functions list
```

## Step 3: Configure Supabase Authentication

### 3.1 Email Settings

Go to Authentication → Email Templates in Supabase dashboard:

1. Disable "Confirm email" if you want to handle this manually (recommended for broker-controlled user creation)
2. Customize email templates if desired

### 3.2 OAuth Providers (Optional)

If implementing social login:

1. Go to Authentication → Providers
2. Enable desired providers (Google, GitHub, etc.)
3. Follow setup guides:
   - Google: https://supabase.com/docs/guides/auth/social-login/auth-google
   - GitHub: https://supabase.com/docs/guides/auth/social-login/auth-github

### 3.3 URL Configuration

Go to Authentication → URL Configuration:

- Site URL: `https://your-production-domain.com`
- Redirect URLs: Add `https://your-production-domain.com/*`

## Step 4: Deploy Frontend

### 4.1 Build the Application

Update `/utils/supabase/info.tsx` with your production credentials:

```typescript
export const projectId = "your-production-project-ref";
export const publicAnonKey = "your-production-anon-key";
```

Build the application:

```bash
npm run build
```

### 4.2 Deploy to Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow prompts to set up the project

4. For production deployment:
   ```bash
   vercel --prod
   ```

### 4.3 Alternative: Deploy to Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### 4.4 Set Environment Variables (if needed)

If you prefer to use environment variables instead of hardcoding in `info.tsx`:

**Vercel:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

**Netlify:**
Go to Site Settings → Environment Variables and add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then update `info.tsx`:
```typescript
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

## Step 5: Configure External Services

### 5.1 Resend Email Setup

1. Create account at https://resend.com
2. Verify your domain for sending emails
3. Create an API key
4. Add to Supabase Edge Function environment variables
5. Update email templates in `/supabase/functions/server/notifications.tsx` with your domain

### 5.2 Optional Services

**JetAPI** (Aircraft registration lookups):
- Sign up at https://jetapi.aero
- Add API key to environment variables

**AeroDataBox** (Aircraft data):
- Sign up at https://www.aerodatabox.com
- Add API key to environment variables

**ScoreChain** (Sanctions screening):
- Contact ScoreChain for API access
- Add API key to environment variables

## Step 6: Post-Deployment Checklist

- [ ] Test user signup/login flow
- [ ] Create test placement through all status transitions
- [ ] Verify PDF generation works correctly
- [ ] Test email notifications are sent (check spam folder)
- [ ] Verify contact management features
- [ ] Test lineslip creation and management
- [ ] Check reports and analytics
- [ ] Test on mobile and desktop browsers
- [ ] Set up monitoring and error tracking
- [ ] Configure domain and SSL certificate
- [ ] Set up database backups (automatic in Supabase)

## Step 7: Monitoring and Maintenance

### Enable Supabase Logging

Go to Logs in Supabase dashboard to monitor:
- Edge Function logs
- Database queries
- Authentication events

### Set Up Alerts

Configure alerts in Supabase for:
- High error rates
- Database performance issues
- Unusual authentication patterns

### Regular Maintenance

- Monitor Supabase usage and upgrade plan if needed
- Review and rotate API keys periodically
- Keep dependencies updated
- Review error logs weekly

## Troubleshooting

### Edge Function Not Working

Check:
1. Environment variables are set correctly
2. Function is deployed: `supabase functions list`
3. Check logs: `supabase functions logs server`
4. Verify CORS headers are set

### Email Notifications Not Sending

Check:
1. Resend API key is set correctly
2. Domain is verified in Resend
3. Check Resend dashboard for bounce/error logs
4. Verify email templates are correct

### PDF Generation Issues

Check:
1. Browser console for errors
2. Placement data is complete
3. Status transitions are correct

### Authentication Issues

Check:
1. Site URL is set correctly in Supabase
2. Redirect URLs are configured
3. Email confirmation settings match your flow

## Rollback Procedure

If you need to rollback:

**Edge Functions:**
```bash
# List previous versions
supabase functions list --version

# Deploy specific version
supabase functions deploy server --version <version-id>
```

**Frontend:**
Use your hosting platform's rollback feature:
- Vercel: Go to Deployments → select previous deployment → Promote to Production
- Netlify: Go to Deploys → select previous deploy → Publish deploy

## Support and Resources

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Vercel Documentation: https://vercel.com/docs
- Netlify Documentation: https://docs.netlify.com

## Security Best Practices

1. **Never commit secrets to git** - Use environment variables
2. **Rotate keys regularly** - Especially service_role key
3. **Enable RLS** - Row Level Security on sensitive tables (if needed)
4. **Monitor access logs** - Watch for unusual patterns
5. **Use HTTPS only** - Ensure all connections are encrypted
6. **Implement rate limiting** - Protect against abuse
7. **Regular backups** - Supabase handles this, but verify

---

**Note:** This deployment uses Supabase's serverless architecture, which automatically scales. Monitor your usage to ensure you stay within your plan limits.
