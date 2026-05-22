// ============================================================================
// IQ Gen — Application Logic
// ============================================================================

// --- Constants ---
const GEMINI_CLIENT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const NETLIFY_PROXY_ENDPOINT = "/.netlify/functions/generate";
const DEFAULT_JOB_TITLE = "Customer Success Manager";
const QUESTION_COUNT = 3;
const SESSION_KEY = "iq-gen-api-key";

const SYSTEM_PROMPT_TEMPLATE = `You are an expert technical recruiter and hiring manager with 20 years of experience across SaaS, professional services, and enterprise industries. Generate exactly ${QUESTION_COUNT} interview questions for the role of {{JOB_TITLE}}. Each question must be distinct in type: one behavioural (past experience), one situational (hypothetical scenario), and one role-specific competency question. Each must be specific enough that a generic answer would clearly fall short, and should reveal how the candidate thinks, not just what they have done. Return ONLY a valid JSON array of exactly ${QUESTION_COUNT} strings. No preamble. No markdown. No numbering. No explanation. Raw JSON only.`;

// --- Global State & DOM References ---
let els = {};
let lastGeneratedQuestions = [];
let lastJobTitle = "";

// ============================================================================
// Initialisation
// ============================================================================

function init() {
  els = {
    settingsToggle: document.getElementById("settings-toggle"),
    settingsBody: document.getElementById("settings-body"),
    settingsPanel: document.getElementById("settings-panel"),
    apiKeyInput: document.getElementById("api-key-input"),
    saveKeyBtn: document.getElementById("save-key-btn"),
    keyStatus: document.getElementById("key-status"),
    form: document.getElementById("question-form"),
    jobTitleInput: document.getElementById("job-title-input"),
    validationMsg: document.getElementById("validation-message"),
    generateBtn: document.getElementById("generate-btn"),
    clearBtn: document.getElementById("clear-btn"),
    results: document.getElementById("results"),
  };

  // Restore API key UI state
  initApiKeyUI();

  // Set default job title
  els.jobTitleInput.value = DEFAULT_JOB_TITLE;

  // Bind events
  els.settingsToggle.addEventListener("click", toggleSettings);
  els.saveKeyBtn.addEventListener("click", handleSaveKey);
  els.form.addEventListener("submit", handleSubmit);
  els.clearBtn.addEventListener("click", handleClear);

  // Theme Toggle
  const themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }
  initTheme();

  // DEEP-LINKING: Handle 'role' URL parameter for instant generation

  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get("role");
  if (roleParam) {
    els.jobTitleInput.value = roleParam;
    // Short delay to ensure DOM is ready and UI feels natural
    setTimeout(() => els.form.requestSubmit(), 300);
  }
}

document.addEventListener("DOMContentLoaded", init);

// ============================================================================
// API Key Management
// ============================================================================

/** Reads the API key from sessionStorage. Returns null if absent. */
function getApiKey() {
  return sessionStorage.getItem(SESSION_KEY);
}

/** Pre-fills the settings UI if a key exists in session. */
function initApiKeyUI() {
  const saved = getApiKey();
  if (saved) {
    els.apiKeyInput.value = saved;
    els.keyStatus.textContent = "Custom key loaded from session.";
    els.keyStatus.classList.add("is-visible");
  } else {
    els.keyStatus.textContent = "Serverless Proxy Active (No setup required)";
    els.keyStatus.classList.add("is-visible");
  }
}

/** Persists the API key to sessionStorage only (never localStorage). */
function saveApiKey(key) {
  sessionStorage.setItem(SESSION_KEY, key);
}

/** Handles the "Save Key" button click. */
function handleSaveKey() {
  const key = els.apiKeyInput.value.trim();
  if (!key) {
    showKeyStatus("Please enter a valid API key", true);
    return;
  }
  saveApiKey(key);
  els.apiKeyInput.value = "";
  showKeyStatus("Key saved for this session", false);
}

/** Displays a status message below the API key input. */
function showKeyStatus(message, isError) {
  els.keyStatus.textContent = message;
  els.keyStatus.classList.toggle("is-error", isError);
  els.keyStatus.classList.add("is-visible");
}

// ============================================================================
// Theme Management
// ============================================================================

function initTheme() {
  const savedTheme = localStorage.getItem("iq-gen-theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (savedTheme === "dark" || (!savedTheme && systemDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("iq-gen-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("iq-gen-theme", "dark");
  }
}

// ============================================================================
// Settings Panel
// ============================================================================

function toggleSettings() {
  const isOpen = els.settingsPanel.classList.toggle("is-open");
  els.settingsToggle.setAttribute("aria-expanded", String(isOpen));
}

// ============================================================================
// Input Validation
// ============================================================================

/** Returns an error string if input is invalid, or null if valid. */
function validateInput(jobTitle) {
  if (!jobTitle || !jobTitle.trim()) {
    return "Please enter a job title to generate questions.";
  }
  return null;
}

/** Shows or clears the inline validation message. */
function setValidationMessage(message) {
  els.validationMsg.textContent = message || "";
  els.jobTitleInput.classList.toggle("has-error", !!message);
}

// ============================================================================
// Loading State
// ============================================================================

/** Toggles the loading UI: disables button, shows/hides skeleton cards. */
function setLoadingState(isLoading) {
  els.generateBtn.disabled = isLoading;
  els.generateBtn.textContent = isLoading ? "Generating…" : "Generate Questions";
  
  // A11y: Announce to screen readers that content is loading
  els.results.setAttribute("aria-busy", String(isLoading));

  if (isLoading) {
    els.results.innerHTML = buildSkeletonCards();
  }
}

/** Builds the HTML for skeleton placeholder cards. */
function buildSkeletonCards() {
  return Array.from({ length: QUESTION_COUNT })
    .map(
      (_, i) => `
      <div class="skeleton-card" style="animation-delay: ${i * 0.12}s" aria-hidden="true">
        <div class="skeleton-line skeleton-line--long"></div>
        <div class="skeleton-line skeleton-line--medium"></div>
        <div class="skeleton-line skeleton-line--short"></div>
      </div>`
    )
    .join("");
}

// ============================================================================
// Gemini API Communication
// ============================================================================

/**
 * Calls the API (either Netlify Proxy or direct Google API) to generate questions.
 * Implements a robust model fallback strategy for custom API keys, and handles proxy retries.
 */
async function fetchInterviewQuestions(jobTitle) {
  const apiKey = getApiKey();

  // Route 2: Secure Serverless Proxy (default zero-friction path)
  if (!apiKey) {
    return fetchInterviewQuestionsViaProxy(jobTitle);
  }

  // Route 1: Client-Side Fetch (user provided a custom key)
  const prompt = SYSTEM_PROMPT_TEMPLATE.replace("{{JOB_TITLE}}", jobTitle);
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const MODELS = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];

  for (const model of MODELS) {
    const MAX_RETRIES = 2;
    const BASE_DELAY_MS = 1500;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          const data = await response.json();
          return parseGeminiResponse(data);
        }

        const errorData = await response.json().catch(() => ({}));

        // --- Non-retryable/non-fallback errors: fail immediately ---
        if (response.status === 403) {
          throw new Error("Your API key is invalid or has been restricted. Please check Settings and try a different key.");
        }
        if (response.status === 400) {
          throw new Error(`API configuration error: ${errorData.error?.message || "Invalid request parameter."}`);
        }

        // --- 429 Rate Limit: retry with backoff if attempts remain ---
        if (response.status === 429 && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Rate limited (429) for ${model}. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }

        // For 503 or exhausted rate limits, break and fall back to the next model
        break;

      } catch (err) {
        if (err.message.includes("Your API key") || err.message.includes("API configuration error")) {
          throw err;
        }
        console.error(`Fetch error with model ${model}:`, err);
        if (attempt < MAX_RETRIES) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        break;
      }
    }
  }

  throw new Error("All available Gemini models are currently experiencing high demand. Please try again later.");
}

/** Calls the local Netlify proxy function to run generation server-side. */
async function fetchInterviewQuestionsViaProxy(jobTitle) {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(NETLIFY_PROXY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle }),
      });

      if (response.ok) {
        const data = await response.json();
        return parseGeminiResponse(data);
      }

      const errorData = await response.json().catch(() => ({}));

      // Non-retryable errors
      if (response.status !== 429 && response.status !== 503) {
        throw new Error(`API error ${response.status}: ${errorData.error?.message || "An unexpected error occurred."}`);
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Proxy request failed (${response.status}). Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
      } else {
        throw new Error(
          errorData.error?.message || "The AI service is temporarily busy due to high demand. Please wait a moment and try again."
        );
      }
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        throw err;
      }
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
}

/** Returns a promise that resolves after the given milliseconds. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts and parses the question array from Gemini's response shape.
 * Employs a robust extraction pattern to isolate the JSON array block even in the presence
 * of markdown fences, conversational preambles, or trailing formatting noise.
 */
function parseGeminiResponse(data) {
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("Unexpected response format from API.");
  }

  // Robust array extraction: isolate the substring between the first '[' and the last ']'
  const startIdx = raw.indexOf("[");
  const endIdx = raw.lastIndexOf("]");

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error("Could not parse questions. Please try again.");
  }

  const cleaned = raw.substring(startIdx, endIdx + 1).trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse JSON string:", cleaned, err);
    throw new Error("Could not parse questions. Please try again.");
  }

  if (!Array.isArray(parsed) || parsed.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} questions but received ${Array.isArray(parsed) ? parsed.length : "invalid data"}.`);
  }

  return parsed;
}

// ============================================================================
// Rendering
// ============================================================================

/** Renders question cards into the results area with staggered animation. */
function renderQuestions(questions) {
  const labels = ["Behavioural", "Situational", "Competency"];

  els.results.innerHTML = questions
    .map(
      (q, i) => `
      <article class="question-card" style="animation-delay: ${i * 0.1}s">
        <div class="question-header">
          <span class="question-badge">${labels[i]}</span>
          <button class="btn-copy" onclick="copyToClipboard(this, '${q.replace(/'/g, "\\'")}')" aria-label="Copy question ${i + 1} to clipboard" title="Copy to clipboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>
        </div>
        <p class="question-number">Question ${i + 1}</p>
        <p class="question-text">${escapeHtml(q)}</p>
      </article>`
    )
    .join("");

  // Append Export Button
  const exportDelay = questions.length * 0.1;
  els.results.innerHTML += `
    <div class="export-container" style="animation-delay: ${exportDelay}s">
      <button type="button" class="btn-secondary btn-export" onclick="exportAsText()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export as Text
      </button>
    </div>
  `;
}

/**
 * Copies text to the clipboard and provides visual feedback on the button.
 */
async function copyToClipboard(button, text) {
  try {
    await navigator.clipboard.writeText(text);
    
    // Success State
    const originalContent = button.innerHTML;
    button.classList.add('is-success');
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>Copied!</span>
    `;
    
    setTimeout(() => {
      button.classList.remove('is-success');
      button.innerHTML = originalContent;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

// Expose to global scope for inline onclick handlers
window.copyToClipboard = copyToClipboard;
window.exportAsText = exportAsText;

/**
 * Creates a text file from the generated questions and triggers a download.
 */
function exportAsText() {
  if (!lastGeneratedQuestions.length) return;

  const timestamp = new Date().toLocaleDateString();
  const textContent = 
    `Role: ${lastJobTitle}\n` +
    `Generated: ${timestamp}\n` +
    `=========================================\n\n` +
    lastGeneratedQuestions.map((q, i) => `Question ${i + 1}:\n${q}\n`).join("\n");

  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `Interview_Questions_${lastJobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


/** Minimal HTML escaping to prevent injection from API output. */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ============================================================================
// Error Display
// ============================================================================

/** Shows an error banner with a retry affordance. */
function showError(message) {
  els.results.innerHTML = `
    <div class="error-banner" role="alert">
      <div class="error-banner__content">
        <svg class="error-banner__icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="error-banner__message">${escapeHtml(message)}</p>
      </div>
      <button type="button" class="btn-retry" id="retry-btn">Try Again</button>
    </div>`;

  document.getElementById("retry-btn").addEventListener("click", () => {
    // Re-trigger submit using the current form values
    els.form.requestSubmit();
  });
}

// ============================================================================
// Form Handlers
// ============================================================================

/** Primary submit handler — orchestrates the full generate flow. */
async function handleSubmit(event) {
  event.preventDefault();
  setValidationMessage(null);

  const jobTitle = els.jobTitleInput.value;

  const validationError = validateInput(jobTitle);
  if (validationError) {
    setValidationMessage(validationError);
    return;
  }

  setLoadingState(true);

  try {
    const questions = await fetchInterviewQuestions(jobTitle);
    lastGeneratedQuestions = questions;
    lastJobTitle = jobTitle;
    renderQuestions(questions);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoadingState(false);
  }
}

/** Resets the form and results to their default state. */
function handleClear() {
  els.jobTitleInput.value = DEFAULT_JOB_TITLE;
  setValidationMessage(null);
  els.results.innerHTML = "";
  els.results.removeAttribute("aria-busy");
  els.generateBtn.disabled = false;
  els.generateBtn.textContent = "Generate Questions";
  lastGeneratedQuestions = [];
  lastJobTitle = "";
}
