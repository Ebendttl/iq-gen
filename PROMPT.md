# 🏆 The Ultimate One-Shot "Perfect Build" Prompt: IQ Gen

This file contains the refined, comprehensive master prompt. If this prompt had been used on Day One, any advanced coding AI would have generated the entire application perfectly—with zero security leaks, zero model errors, zero JSON parser crashes, and zero environment setup issues.

---

## 📋 The Master Prompt (Copy & Paste for a One-Shot Build)

```markdown
You are a Staff Software Engineer and Principal UI/UX Architect. 
Your task is to build a production-grade, highly secure, and exceptionally polished single-page web application called **"IQ Gen"** that generates 3 AI-powered interview questions based on a job title.

The application must be designed for instant serverless deployment on Netlify, requiring zero-build client assets (Vanilla HTML/CSS/JS) and a secure backend edge proxy.

---

### 🛡️ SECTION 1: SYSTEM ARCHITECTURE & SECURITY (Day One Security)
To ensure elite security boundaries, the application must use a **Serverless Proxy Pattern** to prevent the exposure of private API credentials:
1. **Frontend Isolation**: The client-side code must NEVER contain or request the Google Gemini API Key directly, nor should it make direct client-to-Google API calls by default.
2. **Serverless Proxy**: Create a Netlify Serverless Function (`netlify/functions/generate.js`) to handle all API operations. The client will query this endpoint (`/.netlify/functions/generate`) via a POST request.
3. **Environment Injection**: The serverless function must securely read the `GEMINI_API_KEY` from the hosting environment vault (`process.env.GEMINI_API_KEY`).
4. **Reviewer Override (Settings Panel)**: Provide an optional "Settings" gear panel in the UI. If a technical reviewer inputs their own custom API key, save it temporarily in `sessionStorage` (never in cookies or localStorage) and routing client calls directly to Google's API to bypass the serverless proxy.

---

### ⚡ SECTION 2: API RESILIENCY & DYNAMIC FALLBACKS
Google Gemini standard-tier API access frequently experiences transient 503 (high demand) and 429 (rate limit) spikes. The serverless backend MUST implement a **Prioritized Multi-Model Fallback Chain** to guarantee 100% availability:
1. **Fallback Chain**: If an API call fails, the serverless function must automatically catch the error and retry using the next model in this exact sequence:
   * **Primary**: `gemini-2.5-flash` (Highest-performing flash model)
   * **Secondary Backup**: `gemini-3.1-flash-lite` (Ultra-fast, high-capacity backup)
   * **Tertiary Backup**: `gemini-2.5-flash-lite` (Highly resilient fallback)
2. **Exponential Backoff**: Implement a retry loop with exponential backoff (e.g., initial 1000ms delay, doubling on retry) for up to 3 attempts before escalating to the next model in the fallback chain.
3. **JSON Schema Forcing**: Explicitly pass `responseMimeType: "application/json"` in the API request configuration to force the LLM to output clean data.

---

### 🧠 SECTION 3: RESILIENT JSON PARSING (Crash-Proof Client)
LLMs under heavy load can occasionally wrap JSON outputs in Markdown code fences (e.g., ```json ... ```) or prefix them with conversational preambles. To prevent client-side parsing crashes:
1. **Bulletproof Extraction**: Do not rely on a simple `JSON.parse(rawText)`. Instead, write a robust custom parsing function in JS that:
   * Uses a regular expression or substring search to locate the first opening bracket `[` and the last closing bracket `]`.
   * Isolates the exact array substring and parses *only* that block.
2. **Strict Output Shape**: The system prompt sent to Gemini must strictly demand exactly 3 interview questions formatted as a flat JSON array of strings:
   ```json
   [
     "Question 1 (Behavioral): ...",
     "Question 2 (Situational): ...",
     "Question 3 (Competency-based): ..."
   ]
   ```

---

### 🎨 SECTION 4: PREMIUM DESIGN SYSTEM & INTERACTIVE UI
The user interface must look and feel like an elite, premium SaaS utility. Avoid standard default inputs, raw colors, or standard framework styling (Tailwind/Bootstrap).
1. **Vanilla Styling**: Use highly structured Vanilla CSS inside `style.css` with a comprehensive CSS Custom Properties (Design Tokens) layout.
2. **Color Palette**: Dark Mode by default. Rich navy background (`#131422`), clean secondary slates, vibrant glowing orange accent markers (`#e05638`), and smooth transition glows.
3. **OS-Aware Theme Toggle**:
   * Implement a Light/Dark toggle.
   * On initial load, read preference from `localStorage`. If empty, fall back to the user's OS preference (`window.matchMedia("(prefers-color-scheme: dark)")`).
   * Save manual toggling choices instantly to `localStorage`.
4. **Custom Branded Icon**: Create a modern, high-fidelity vector SVG logo (a glowing squircle background with an abstract talking synapse bubble and bold serif "IQ." typography) to serve as both the site header icon and the browser favicon. Add a cache-buster query parameter (`?v=2`) to the HTML icon tags.
5. **Interactive Animations**:
   * **Skeleton Screen**: When generating, hide old results and display 3 pulsing loading card skeletons.
   * **Deep-Linking**: Parse incoming URL query parameters (`?role=Job+Title`). If a title is provided in the URL, automatically populate the input and trigger a zero-click question generation.
   * **Clipboard Copy**: Add interactive buttons to each card to copy questions to the clipboard with animated, temporary "Copied!" checkmark check indicators.
   * **Export Utility**: Provide a prominent "Export to Text" button to download the questions as a neatly formatted local `.txt` file.

---

### 🛠️ SECTION 5: LOCAL DEVELOPMENT & DEPLOYMENT READY
Initialize the repository so it is ready to run locally and deploy immediately to Git without risk:
1. **`package.json`**: Include a dev script mapping to the Netlify dev server:
   ```json
   {
     "name": "iq-gen",
     "version": "1.0.0",
     "scripts": {
       "dev": "netlify dev"
     }
   }
   ```
2. **`.gitignore`**: Prevent accidental credential leaks and directory bloat by pre-excluding these files from git tracking:
   ```text
   node_modules/
   .env
   .netlify/
   dist/
   ```
3. **`.env`**: Provide a template `.env` showing `GEMINI_API_KEY=` for local runtime environment configurations.

---

### 📂 FILE STRUCTURE TO GENERATE:
Generate exactly these four pristine, completed files:
1. `index.html` (Semantic markup, accessibility tags, relative imports, Settings layout)
2. `style.css` (Design tokens, skeleton loading classes, dark/light theme properties, transitions)
3. `app.js` (Resilient JSON parser, query string listener, dynamic card rendering, export features)
4. `netlify/functions/generate.js` (Multi-model fallback chain, secure env reading, exponential retry logic)
5. `package.json` & `.gitignore` (Local development setup)
```
