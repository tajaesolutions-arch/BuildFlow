# BuildFlow

BuildFlow is a multi-tenant construction project management SaaS foundation built with React, Vite, and Supabase.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the required Supabase frontend variables:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Apply the Supabase migration in `supabase/migrations/202605100001_phase_1_foundation.sql`.

4. Start the app:

   ```bash
   npm run dev
   ```

If the Supabase variables are missing, the app renders a configuration error instead of crashing.
