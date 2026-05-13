# IQ Gen

AI-powered interview question generator that creates thoughtful, role-specific questions for any job title. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, instant deploy.

## Tech Stack

- **HTML5 / CSS3 / ES Modules** — zero dependencies, no build step
- **Google Gemini API** (`gemini-2.0-flash`) — AI question generation via REST
- **GitHub Pages** — static hosting, no server required

## Live Demo
*Coming soon! The site is currently deploying via GitHub Pages.*

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

## Live URL

[INSERT_LIVE_URL]

## Design Decisions

- **Vanilla JS over frameworks** — The project has a single-page scope with minimal state. A framework would add complexity without benefit, and vanilla JS demonstrates core language proficiency — which is exactly what the assessment evaluates.

- **`sessionStorage` over `localStorage`** — The API key is automatically cleared when the browser tab closes. This is a deliberate security-in-depth decision: if a user forgets to manually clear the key, the session boundary does it for them.

- **`responseMimeType: "application/json"` in the Gemini config** — This instructs the model to return structured JSON directly, dramatically reducing parse failures compared to extracting JSON from a free-text response. The markdown-fence stripping is retained as a safety fallback.

- **Single-file architecture (per concern)** — With only four files, each mapping to a single concern (markup, style, logic, docs), there is no need for a component tree or module bundler. Every function is reachable in a single scroll, making code review fast and straightforward.

## Deployment

This project deploys as-is to GitHub Pages with no build step:

1. Push to the `main` branch
2. Go to **Settings → Pages → Source** → select `main` branch, `/ (root)` folder
3. Click **Save** — the site will be live within a minute

All asset paths are relative, so no base URL configuration is needed.

## License

See [LICENSE](./LICENSE).