# 🏆 The Ultimate One-Shot "Perfect Build" Prompt: IQ Gen

This file contains the refined, comprehensive master prompt.

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
4. **Reviewer Override (Settings Panel)**: Provide an optional "Settings" gear panel in the UI. If a technical reviewer inputs their own custom API key, save it temporarily in `sessionStorage` (never in cookies or localStorage) and routing client calls directly to Google's API to bypass the serverless pro### ⚡ SECTION 2: API RESILIENCY & DYNAMIC FALLBACKS
Google Gemini standard-tier API access frequently experiences transient 503 (high demand) and 429 (rate limit) spikes. The serverless backend MUST implement a **Prioritized Multi-Model Fallback Chain** to guarantee 100% availability:
1. **Fallback Chain**: If an API call fails, the serverless function must automatically catch the error and try using the next model in this exact sequence:
   * **Primary**: `gemini-2.5-flash` (Highest-performing flash model)
   * **Secondary Backup**: `gemini-3.1-flash-lite` (Ultra-fast, high-capacity backup)
   * **Tertiary Backup**: `gemini-2.5-flash-lite` (Highly resilient fallback)
2. **Fail-Fast Timeout & Fast Failover**: Serverless functions have execution time ceilings (e.g. 10 seconds on Netlify). Avoid multiple slow retries on a single model. Set a strict 6-second timeout per model request using an `AbortController` signal, and fall back instantly to the next model in the fallback chain.
3. **Structured Outputs (JSON Schema Forcing)**: Force 100% deterministic outputs from the LLM by defining a strict `responseSchema` in the `generationConfig` (both on serverless proxy and reviewer direct calls):
   ```javascript
   responseMimeType: "application/json",
   responseSchema: {
     type: "ARRAY",
     items: {
       type: "STRING"
     }
   }
   ```

---

### 🧠 SECTION 3: RESILIENT JSON PARSING (Crash-Proof Client)
LLMs under heavy load can occasionally wrap JSON outputs in Markdown code fences (e.g., ```json ... ```), conversational preambles, or return array objects instead of raw arrays. To prevent client-side parsing crashes:
1. **Bulletproof Extraction**: Do not rely on a simple `JSON.parse(rawText)`. Instead, write a robust custom parsing function in JS that:
   * Uses substring search to locate the first opening bracket `[` and the last closing bracket `]`.
   * Isolates the exact array substring and parses only that block.
   * If parsing fails, executes custom regex filters to strip control characters or unescape quotes.
   * **Object Array Discovery Fallback**: If the parsed result is an object containing an array (e.g., `{"questions": [...]}`), search and extract the array automatically.
2. **Strict Output Shape**: The system prompt sent to Gemini must strictly demand exactly 3 interview questions formatted as a flat JSON array of strings:
   ```json
   [
     "Question 1 (Behavioral): ...",
     "Question 2 (Situational): ...",
     "Question 3 (Competency-based): ..."
   ]
   ```

---

### 📶 SECTION 6: OFFLINE-FIRST CACHING & ROBUST UX RESILIENCY
To guarantee the application works flawlessly on extremely weak or completely offline connections, implement a comprehensive local storage client caching layer:
1. **Local storage Caching**: Automatically cache successfully generated questions in `localStorage` under `iq-gen-questions-cache` indexed by job title.
2. **Instant Loads**: If a user requests questions for a role that is already cached, load the questions instantly (<10ms) without hitting the network, and display a highly polished status badge alongside a button to `"Force Refresh"` new questions.
3. **Graceful Connection Degradation**: If a network request fails (due to a weak signal, offline status, or server downtime) and the role has been generated before, load the cached questions and display a clear warning banner: *"Offline or poor network. Loaded last successful generation."*
4. **Connection Speed Awareness**: Set a 3.5-second timer on network requests. If the API call exceeds this limit, display a beautiful loading banner with a small active loader spinner: *"Your connection seems a bit slow, but we are still trying to generate..."* so the user is kept informed.
5. **Interactive Status Banners**: Add elegant glassmorphic banners to the top of the results area to visually distinguish cached, fallback, and live states.

---

### 📂 FILE STRUCTURE TO GENERATE:
Generate exactly these four pristine, completed files:
1. `index.html` (Semantic markup, accessibility tags, relative imports, Settings layout)
2. `style.css` (Design tokens, skeleton loading classes, dark/light theme properties, transitions, caching status banners)
3. `app.js` (Resilient JSON parser, local caching engine, speed-awareness timers, query string listener, dynamic card rendering)
4. `netlify/functions/generate.js` (Server-side fast-failover model chain, 6s watchdog timeouts, secure credential injection)
5. `package.json` & `.gitignore` (Local development setup)
```
