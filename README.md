# CarePath — Kenya Health Navigator

A static prototype for exploring demonstration health facilities in Nairobi, Kenya. The public directory can be browsed without an account. An account is required to submit a community update or use the AI assistant.

## Preview

https://robinmutinda53-droid.github.io/public-services-navigator/

## Important: prototype data and privacy

All facilities, contact details, service availability, and sample reports in this project are fictional demonstration data. Do not use them to plan real healthcare or travel. Confirm facility information with an official source.

Email and password are used by Supabase only to authenticate an account. The site does not display email addresses or attach them to displayed reports. The prototype does not collect profile names. Community reports are saved only in the visitor's browser; they are not shared with other visitors or a central service.

The assistant helps users navigate this website only. It is not a medical service and must not be used for diagnosis, triage, or treatment advice. Do not enter personal health information.

## Connect authentication and AI

The public preview intentionally does not contain Supabase project credentials or an AI API key. Until the project owner configures them, visitors can browse the public directory and use the built-in navigation guide; sign-in and AI responses remain unavailable.

1. Create a Supabase project and enable the Email provider under **Authentication → Providers**.
2. Under **Authentication → URL Configuration**, set the site URL and add this redirect URL: `https://robinmutinda53-droid.github.io/public-services-navigator/`. For local testing with VS Code Live Server, also allow `http://127.0.0.1:5500/`.
3. Copy the project's URL and public **anon** key into `config.js` as `supabaseUrl` and `supabaseAnonKey`. These are browser-facing values; never put a service-role key or OpenAI key in this file.
4. Add `OPENAI_API_KEY` as a server-side secret in the Supabase project. Never commit it or expose it in browser code.
5. Install the Supabase CLI, authenticate, and link this folder to the Supabase project:

   ```sh
   supabase login
   supabase link --project-ref <PROJECT_REF>
   ```

6. Add `OPENAI_API_KEY` under **Project Settings → Edge Functions → Secrets** (or the equivalent secrets panel in the Supabase dashboard). Then deploy the Edge Function without disabling JWT verification:

   ```sh
   supabase functions deploy psn-assistant
   ```

7. Publish the updated website. Sign-in, email confirmation, password reset, and the authenticated AI assistant will then use the configured Supabase project. Assistant questions are sent to OpenAI; set an appropriate provider usage limit. The assistant endpoint checks input and keeps the OpenAI key server-side.

## Run locally

Serve this folder with a static web server (for example, the VS Code Live Server extension) and open the local URL it provides. The map loads Leaflet and OpenStreetMap tiles from the internet. Browser location access requires a secure context such as HTTPS or localhost.

## Current prototype features

- Search facilities by name, area, or service; filter by service and type.
- Sort by approximate distance or find facilities near the visitor.
- Browse facility details, community-report examples, and an interactive map.
- Optional Supabase email/password sign-in; public browsing remains available without an account.
- Privacy-conscious account display: email is not shown as a profile or with reports.
- Built-in directory guide, with a secure, authenticated OpenAI assistant available after setup.
- Light and dark appearance, plus offline caching of the static app shell after first visit.
