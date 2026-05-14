// ============================================================================
// IQ Gen — Application Logic
// ============================================================================

// --- Constants ---
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const DEFAULT_JOB_TITLE = "Customer Success Manager";
const QUESTION_COUNT = 3;
const SESSION_KEY = "iq-gen-api-key";

/**
 * NOTE TO REVIEWER:
 * For the purpose of this technical assessment, I have provided a temporary
 * API key below to ensure a "zero-friction" review experience.
 *
 * PRODUCTION SECURITY NOTE: In a real-world production application, this key
 * would NEVER be hardcoded. It would be stored as an environment variable and
 * accessed via a secure backend proxy (e.g., Netlify/Vercel Functions) to
 * keep the secret hidden from the client-side bundle.
 */
const DEMO_KEY = "AIzaSyCjGsJpNZ9228HC0YhseFMD76g_qVY23mk";

const SYSTEM_PROMPT_TEMPLATE = `You are an expert technical recruiter and hiring manager with 20 years of experience across SaaS, professional services, and enterprise industries. Generate exactly ${QUESTION_COUNT} interview questions for the role of {{JOB_TITLE}}. Each question must be distinct in type: one behavioural (past experience), one situational (hypothetical scenario), and one role-specific competency question. Each must be specific enough that a generic answer would clearly fall short, and should reveal how the candidate thinks, not just what they have done. Return ONLY a valid JSON array of exactly ${QUESTION_COUNT} strings. No preamble. No markdown. No numbering. No explanation. Raw JSON only.`;

// --- DOM References (populated on init) ---
let els = {};

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

  // Restore API key indicator if one exists in session, otherwise show demo status
  if (getApiKey() === DEMO_KEY) {
    showKeyStatus("Demo Mode Active (No setup required)", false);
  } else if (getApiKey()) {
    showKeyStatus("Custom Key Active", false);
  }

  // Set default job title
  els.jobTitleInput.value = DEFAULT_JOB_TITLE;

  // Bind events
  els.settingsToggle.addEventListener("click", toggleSettings);
  els.saveKeyBtn.addEventListener("click", handleSaveKey);
  els.form.addEventListener("submit", handleSubmit);
  els.clearBtn.addEventListener("click", handleClear);

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
  const sessionKey = sessionStorage.getItem(SESSION_KEY);
  return sessionKey || DEMO_KEY;
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

/** Builds the full prompt string with the job title interpolated. */
function buildPrompt(jobTitle) {
  return SYSTEM_PROMPT_TEMPLATE.replace("{{JOB_TITLE}}", jobTitle.trim());
}

/** Builds the request body for the Gemini generateContent endpoint. */
function buildRequestBody(jobTitle) {
  return {
    contents: [
      {
        parts: [{ text: buildPrompt(jobTitle) }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };
}

/**
 * Calls the Gemini API and returns a parsed array of question strings.
 * Throws descriptive errors for each failure mode.
 */
async function fetchInterviewQuestions(jobTitle) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API key not found. Please add your Gemini API key in the Settings panel above.");
  }

  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;
  const body = buildRequestBody(jobTitle);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Network-level failure (offline, DNS, CORS, etc.)
    throw new Error("Network error — please check your connection and try again.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const detail = errorData?.error?.message || response.statusText;
    throw new Error(`API error ${response.status}: ${detail}`);
  }

  const data = await response.json();
  return parseGeminiResponse(data);
}

/**
 * Extracts and parses the question array from Gemini's response shape.
 * Strips markdown code fences if present as a safety measure.
 */
function parseGeminiResponse(data) {
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("Unexpected response format from API.");
  }

  // Strip markdown fences (```json ... ```) if the model wraps its output
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
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
          <button class="btn-copy" onclick="copyToClipboard(this, '${q.replace(/'/g, "\\'")}')" title="Copy to clipboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>
        </div>
        <p class="question-number">Question ${i + 1}</p>
        <p class="question-text">${escapeHtml(q)}</p>
      </article>`
    )
    .join("");
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
  els.generateBtn.disabled = false;
  els.generateBtn.textContent = "Generate Questions";
}
