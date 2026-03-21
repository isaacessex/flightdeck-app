# FLIGHTDECK Local Development Setup Guide

Follow these steps to get FLIGHTDECK running on your local machine.

## Prerequisites

Before you begin, make sure you have:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- A **Supabase account** - [Sign up here](https://supabase.com)
- A **code editor** (VS Code recommended)

---

## Step 1: Install Dependencies

Open your terminal in the project folder and run:

```bash
npm install
```

This will install all the required packages. It may take a few minutes.

**Expected output:** You should see a progress bar and eventually a message that packages were installed.

---

## Step 2: Set Up Environment Variables

### 2.1 Create Your Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `flightdeck-dev` (or any name you like)
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Choose one closest to you
4. Click **"Create new project"**
5. Wait for the project to finish setting up (2-3 minutes)

### 2.2 Get Your Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. You'll see:
   - **Project URL** (like `https://abcdefgh.supabase.co`)
   - **API Keys:**
     - `anon public` key
     - `service_role` key (click "Reveal" to see it)

### 2.3 Create .env File

In your project folder, copy the example environment file:

```bash
cp .env.example .env
```

**On Windows:** If `cp` doesn't work, manually:
1. Make a copy of `.env.example`
2. Rename it to `.env`

### 2.4 Edit .env File

Open the `.env` file in your editor and update it with your Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres

# Optional API keys (leave empty for now)
JETAPI_KEY=
AERODATABOX_API_KEY=
SCORECHAIN_API_KEY=
RESEND_API_KEY=
```

**Replace:**
- `your-project-id` with your actual project ID (from the URL)
- `your-anon-public-key-here` with the `anon public` key
- `your-service-role-key-here` with the `service_role` key
- `[YOUR-PASSWORD]` with your database password

### 2.5 Update Supabase Info File

Open `/utils/supabase/info.tsx` and update:

```typescript
export const projectId = "your-project-id";  // Just the ID part, like "abcdefgh"
export const publicAnonKey = "your-anon-public-key";
```

---

## Step 3: Deploy the Supabase Edge Function

The backend runs as a Supabase Edge Function. You need to deploy it.

### 3.1 Install Supabase CLI

```bash
npm install -g supabase
```

**On Mac/Linux:** You might need `sudo`:
```bash
sudo npm install -g supabase
```

### 3.2 Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate. Follow the prompts.

### 3.3 Link Your Project

```bash
supabase link --project-ref your-project-id
```

Replace `your-project-id` with your actual project ID (the part before `.supabase.co` in your URL).

**Example:** If your URL is `https://abcdefgh.supabase.co`, use:
```bash
supabase link --project-ref abcdefgh
```

### 3.4 Set Environment Variables in Supabase

The Edge Function needs the same environment variables. Set them in Supabase:

1. Go to your Supabase dashboard
2. Click **Edge Functions** in the sidebar
3. Click the **Settings** tab
4. Add these environment variables:

| Variable Name | Value |
|---------------|-------|
| `SUPABASE_URL` | Your Supabase URL |
| `SUPABASE_ANON_KEY` | Your anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `SUPABASE_DB_URL` | Your database URL |

**Note:** The other API keys (RESEND, JETAPI, etc.) are optional for now. You can add them later when needed.

### 3.5 Deploy the Function

```bash
supabase functions deploy server
```

This will deploy the backend code to Supabase.

**Expected output:** You should see "Function deployed successfully" or similar.

**Verify deployment:**
```bash
supabase functions list
```

You should see `server` in the list.

---

## Step 4: Start Development Server

Now you're ready to run FLIGHTDECK locally!

```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

The application will automatically open in your browser at `http://localhost:3000`

---

## Step 5: Create Your First User

FLIGHTDECK requires authentication. You need to create a user account.

### Option A: Use the Built-in Signup (if available)

If your app has a signup page, use it to create an account.

### Option B: Create User via Supabase Dashboard

1. Go to your Supabase dashboard
2. Click **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Fill in:
   - **Email:** `broker@test.com`
   - **Password:** `TestPassword123!`
   - **Auto Confirm:** Check this box
5. Click **Create user**

Now you can log in with these credentials!

---

## Troubleshooting

### "npm: command not found"

You need to install Node.js first. Download from https://nodejs.org/

### "supabase: command not found"

The Supabase CLI didn't install globally. Try:
```bash
npx supabase login
npx supabase link --project-ref your-project-id
npx supabase functions deploy server
```

### Port 3000 is already in use

Another app is using port 3000. Either:
1. Stop the other app
2. Or change the port in `vite.config.ts`:
   ```typescript
   server: {
     port: 3001,  // Changed to 3001
   }
   ```

### "Failed to fetch" errors in browser

Check:
1. Is the Edge Function deployed? Run `supabase functions list`
2. Are the environment variables set correctly in Supabase dashboard?
3. Is your `.env` file set up correctly?
4. Did you update `/utils/supabase/info.tsx`?

### Still having issues?

See `TROUBLESHOOTING.md` for more detailed solutions.

---

## What's Next?

Once you have FLIGHTDECK running:

1. **Explore the interface:**
   - Dashboard - View all placements
   - New Placement - Create a new insurance placement
   - Contacts - Manage brokers, underwriters, insureds
   - Lineslips - Create binding authority agreements

2. **Read the documentation:**
   - `README.md` - Overview and features
   - `DEVELOPER_QUICK_REFERENCE.md` - Common code patterns
   - `CONTRIBUTING.md` - Development guidelines

3. **Start developing:**
   - Make changes to components in `/components`
   - Backend changes go in `/supabase/functions/server`
   - Styles are in `/styles/globals.css`

---

## Quick Reference Commands

| Command | What it does |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `supabase functions deploy server` | Deploy backend changes |
| `supabase functions logs server` | View backend logs |

---

**Need help?** Check the other documentation files or review the code comments for guidance.

Good luck! 🚀
