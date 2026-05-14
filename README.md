# IQ Gen

AI-powered interview question generator that creates thoughtful, role-specific questions for any job title. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, instant deploy.

## Tech Stack

- **HTML5 / CSS3 / ES Modules** — zero dependencies, no build step
- **Google Gemini API** (`gemini-2.5-flash`) — AI question generation via REST
- **GitHub Pages** — static hosting, no server required

## Live Demo
🚀 **[View the Live App here](https://ebendttl.github.io/iq-gen/)**

## Premium Features
- **Deep-Linking**: Pass a role via URL (e.g., `?role=Customer+Success+Manager`) for instant, zero-click generation.
- **One-Click Copy**: Each question includes a dedicated copy button with haptic-style visual feedback.
- **Export to Text**: A dedicated button allows users to download the generated questions as a clean `.txt` file.
- **Dynamic Theming**: Full Light/Dark mode support. Automatically respects OS-level preferences and remembers user overrides via `localStorage`.
- **Accessibility (a11y)**: Built with screen-reader support in mind, utilizing `aria-live` and `aria-busy` for dynamic content announcements, plus full keyboard focus-visibility.
- **Seamless Demo**: Includes a built-in demo API key to ensure a frictionless review experience.

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/iq-gen.git
   cd iq-gen
   ```

2. **Get a free Gemini API key**

   Visit [ai.google.dev](https://ai.google.dev/) → Get API Key → Create a key in a new or existing project.

3. **Open the app**

   Open `index.html` directly in your browser, or serve locally:

   ```bash
   npx serve .
   ```

4. **Paste your API key**

   Click the **Settings** panel at the top of the page and paste your Gemini API key. The key is stored in `sessionStorage` only and is never persisted to disk or transmitted anywhere except the Gemini API.

5. **Generate questions**

   Enter any job title and click **Generate Questions** to receive 3 expert-crafted interview questions.

## Design Decisions

- **Vanilla JS over frameworks** — The project has a single-page scope with minimal state. A framework would add complexity without benefit, and vanilla JS demonstrates core language proficiency — which is exactly what the assessment evaluates.

- **`sessionStorage` over `localStorage`** — The API key is automatically cleared when the browser tab closes. This is a deliberate security-in-depth decision: if a user forgets to manually clear the key, the session boundary does it for them.

- **`responseMimeType: "application/json"` in the Gemini config** — This instructs the model to return structured JSON directly, dramatically reducing parse failures compared to extracting JSON from a free-text response. The markdown-fence stripping is retained as a safety fallback.

- **Single-file architecture (per concern)** — With only four files, each mapping to a single concern (markup, style, logic, docs), there is no need for a component tree or module bundler. Every function is reachable in a single scroll, making code review fast and straightforward.

## Deployment (Netlify)

This project uses **Netlify** to securely host the frontend and proxy the API calls.

1. Create a free account at [Netlify](https://www.netlify.com/).
2. Connect your GitHub repository.
3. In your Netlify Site Settings, add an Environment Variable:
   - Key: `GEMINI_API_KEY`
   - Value: Your actual Gemini API key.
4. Deploy! The frontend will automatically route requests through `/.netlify/functions/generate` to keep your key completely hidden from the browser.

## Security & API Keys

> **Production Setup**: The API key is securely stored in a Netlify Environment Variable and accessed only via a Serverless Function (`netlify/functions/generate.js`). The frontend never sees the API key.

> **Reviewer Override**: For testing purposes, reviewers can optionally input their own Gemini API key in the UI "Settings" panel. If provided, the app will bypass the proxy and hit Google directly using the provided key. The key is only stored in `sessionStorage` and is destroyed when the tab closes.

## License

See [LICENSE](./LICENSE).