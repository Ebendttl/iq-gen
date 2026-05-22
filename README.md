# IQ Gen — AI Interview Question Generator

AI-powered interview question generator that creates thoughtful, role-specific questions for any job title. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, instant deploy. 

---

## 🏗️ System Architecture & Workflow

IQ Gen is designed with a **highly secure, serverless proxy architecture** that separates client presentation from the AI ingestion backend. This ensures the application is both responsive and completely secure against credential theft.

### 1. Request Routing & Fallback System (Flowchart)

This flowchart illustrates how client requests are routed depending on the presence of a custom key, and how the **dynamic fallback system** recovers from transient API errors.

```mermaid
flowchart TD
    %% Class Definitions for Premium Theme (Mocha / Material Dark)
    classDef startEnd fill:#1e1e2e,stroke:#cba6f7,stroke-width:2px,color:#cdd6f4,font-weight:bold;
    classDef ui fill:#181825,stroke:#89b4fa,stroke-width:2px,color:#cdd6f4;
    classDef decision fill:#313244,stroke:#f9e2af,stroke-width:2px,color:#cdd6f4,font-weight:bold;
    classDef secure fill:#112a21,stroke:#a6e3a1,stroke-width:2px,color:#a6e3a1;
    classDef bypass fill:#2c1921,stroke:#f38ba8,stroke-width:2px,color:#f38ba8;
    classDef model fill:#1e1e2e,stroke:#cba6f7,stroke-width:2px,color:#cdd6f4;
    classDef output fill:#181825,stroke:#89dceb,stroke-width:2px,color:#89dceb,font-weight:bold;

    User([Recruiter User]) -->|Input job title| Frontend[Vanilla HTML/JS/CSS App]
    Frontend --> KeyDecision{Custom API Key?}
    
    %% Proxy Route
    KeyDecision -->|No - Default Proxy| ProxyRoute["POST /.netlify/functions/generate"]
    ProxyRoute --> ServerlessFn["Netlify Serverless Function"]
    ServerlessFn -->|Injects secret API key| EnvVars[("Netlify Environment Variables")]
    EnvVars --> PrimaryModel["Primary: gemini-2.5-flash"]
    
    %% Direct Route
    KeyDecision -->|Yes - Reviewer Bypass| DirectRoute["Direct Client-Side Fetch"]
    DirectRoute --> DirectPrimary["Primary: gemini-2.5-flash"]
    
    %% Fallbacks
    PrimaryModel -->|503 or 429 Error| Fallback1["Fallback A: gemini-3.1-flash-lite"]
    DirectPrimary -->|503 or 429 Error| DirectFallback["Fallback A: gemini-3.1-flash-lite"]
    
    Fallback1 -->|503 or 429 Error| Fallback2["Fallback B: gemini-2.5-flash-lite"]
    
    %% Success Outputs
    PrimaryModel -->|200 OK| Output["Render & Display Animated Cards"]
    DirectPrimary -->|200 OK| Output
    Fallback1 -->|200 OK| Output
    DirectFallback -->|200 OK| Output
    Fallback2 -->|200 OK| Output

    %% Assign Styles
    class User startEnd;
    class Frontend ui;
    class KeyDecision decision;
    class ProxyRoute,ServerlessFn,EnvVars secure;
    class DirectRoute bypass;
    class PrimaryModel,DirectPrimary,Fallback1,DirectFallback,Fallback2 model;
    class Output output;
```

---

### 2. Detailed Lifecycle & Data Flow (Sequence Diagram)

This sequence diagram details the timelines and lifecycles of both request models. By separating the workflows, legibility is dramatically enhanced.

```mermaid
sequenceDiagram
    autonumber
    actor User as Recruiter
    participant FE as Frontend (app.js)
    participant Proxy as Serverless Proxy
    participant Gemini as Gemini API

    Note over User,Gemini: Default Secure Flow (Zero-Friction)
    User->>FE: Click "Generate Questions"
    FE->>Proxy: POST /generate { jobTitle }
    Note over Proxy: Server injects hidden GEMINI_API_KEY
    Proxy->>Gemini: POST gemini-2.5-flash
    alt Success (200 OK)
        Gemini-->>Proxy: JSON Questions
    else 503 / 429 Triggered
        Note over Proxy: Dynamic Fallback
        Proxy->>Gemini: POST gemini-3.1-flash-lite
        Gemini-->>Proxy: JSON Questions
    end
    Proxy-->>FE: JSON Array Response
    FE->>User: Render Question Cards

    Note over User,Gemini: Optional Reviewer Flow (Custom API Key)
    User->>FE: Click "Generate Questions"
    FE->>Gemini: POST gemini-2.5-flash (Direct with Key)
    alt Success (200 OK)
        Gemini-->>FE: JSON Questions
    else 503 / 429 Triggered
        Note over FE: Dynamic Fallback
        FE->>Gemini: POST gemini-3.1-flash-lite
        Gemini-->>FE: JSON Questions
    end
    FE->>User: Render Question Cards
```

---

---

## 🛠️ Tech Stack & Key Technologies

* **Frontend**: Pure HTML5, CSS3 (Vanilla design token system, responsive grids, glassmorphic UI), and ES Modules. No build tool, bundler, or heavy framework required.
* **Serverless Backend**: Hosted on **Netlify Functions** (`netlify/functions/generate.js`) to completely hide the API key from the browser.
* **LLM Engine**: **Google Gemini API** (`gemini-2.5-flash` with dynamic fallbacks to `gemini-3.1-flash-lite` and `gemini-2.5-flash-lite`).
* **Persistence & State**: `sessionStorage` for temporary, tab-isolated key overrides, and `localStorage` for theme preference caching.

---

## 🛡️ Enterprise-Grade Security & Resiliency

### 1. Zero-Friction Credential Security
* **Serverless Proxy**: By default, client-side requests are securely proxied through Netlify's CDN edge to a Serverless Function. The `GEMINI_API_KEY` is securely injected from Netlify's encrypted vault on the server side, meaning it **never traverses the network to the user's browser**.
* **Protected Repositories**: The `.gitignore` file is strictly configured to ensure local `.env` configuration files and large packages (`node_modules/`) are never pushed or leaked to public version control repositories.

### 2. Multi-Model Fallback Shield
To guarantee high availability and eliminate **503 (Service Unavailable)** or **429 (Resource Exhausted)** errors during times of intense Google backend demand, the application implements an automatic model fallback chain:
1. **`gemini-2.5-flash`** (Primary high-performance model)
2. **`gemini-3.1-flash-lite`** (Ultra-fast, high-availability frontier fallback)
3. **`gemini-2.5-flash-lite`** (Fast, highly stable backup fallback)

If a model degrades or rate-limits, the request automatically slides to the next available model in the sequence inside the same network call.

---

## ✨ Premium Features

* **Deep-Linking**: Pass a job role via the URL parameters (e.g., `?role=Customer+Success+Manager`) to instantly trigger zero-click, beautifully animated question generations on load.
* **One-Click Copy**: Custom cards equipped with visual haptic feedback (copy buttons dynamically morph to checkmarks upon successful Clipboard API interaction).
* **Export to Plaintext**: Automatically packages the role, timestamp, and generated questions into a cleanly structured `.txt` file for download.
* **Dynamic Theme Engine**: Seamless Light/Dark mode transitions respecting system preferences automatically, while keeping overrides saved locally.
* **Strict Accessibility (a11y)**: Built with native semantic tags, custom focus outlines, keyboard navigational compliance, and dynamic `aria-live` regions to announce skeleton loads to screen readers.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **NPM** (packaged automatically with Node)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/iq-gen.git
   cd iq-gen
   ```

2. **Install local development dependencies**
   ```bash
   npm install
   ```

3. **Configure your API Key**
   Create a file named `.env` in the root of the project:
   ```env
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```
   *(Get your free key at [Google AI Studio](https://aistudio.google.com/)).*

4. **Launch the local development environment**
   ```bash
   npm run dev
   ```
   This command starts the local **Netlify Dev** environment. It will read your local `.env` file, spin up your serverless function proxy, and serve the static files.
   * 🖥️ Access the local application at: **[http://localhost:8888](http://localhost:8888)**

---

## 📦 Netlify Deployment (Production)

To securely host this app live in production:

1. Create a free account on [Netlify](https://www.netlify.com/).
2. Connect your GitHub repository to a new site.
3. In your Netlify dashboard, navigate to **Site Settings ➔ Environment Variables** and add:
   * **Key**: `GEMINI_API_KEY`
   * **Value**: Your actual Gemini API key.
4. Deploy the site! Netlify will automatically build the static assets and set up the edge routes to securely map your backend proxy.

---

## 📜 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.