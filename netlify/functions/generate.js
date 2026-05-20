exports.handler = async function (event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Get API key from Netlify Environment Variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: { message: "Server misconfiguration: API key not found." } }) 
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: "Invalid JSON body" } }) };
  }

  const { jobTitle } = body;
  if (!jobTitle) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: "jobTitle is required" } }) };
  }

  const QUESTION_COUNT = 3;
  const SYSTEM_PROMPT = `You are an expert technical recruiter and hiring manager with 20 years of experience across SaaS, professional services, and enterprise industries. Generate exactly ${QUESTION_COUNT} interview questions for the role of ${jobTitle}. Each question must be distinct in type: one behavioural (past experience), one situational (hypothetical scenario), and one role-specific competency question. Each must be specific enough that a generic answer would clearly fall short, and should reveal how the candidate thinks, not just what they have done. Return ONLY a valid JSON array of exactly ${QUESTION_COUNT} strings. No preamble. No markdown. No numbering. No explanation. Raw JSON only.`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  // -----------------------------------------------------------------------
  // Robust Model Fallback and Retry Strategy (Server-Side)
  // -----------------------------------------------------------------------
  const MODELS = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];

  for (const model of MODELS) {
    console.log(`Attempting question generation with model: ${model}`);
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

        const data = await response.json();

        if (response.ok) {
          console.log(`Successfully generated questions using model: ${model}`);
          return {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify(data),
          };
        }

        console.warn(`Model ${model} returned status ${response.status}:`, data?.error?.message);

        // If it's a client error (e.g., 400 or 403), fail immediately with no fallback
        if (response.status === 400 || response.status === 403) {
          return {
            statusCode: response.status,
            body: JSON.stringify({ error: { message: data?.error?.message || "Client error" } }),
          };
        }

        // If it's a 429 rate limit and attempts remain, retry with exponential backoff
        if (response.status === 429 && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Rate limited (429) for ${model}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For 503 or exhausted 429 rate-limits, break and fall back to the next model
        break;

      } catch (error) {
        console.error(`Fetch error with model ${model}:`, error);
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
    }
  }

  // All models failed
  return {
    statusCode: 503,
    body: JSON.stringify({
      error: {
        message: "All available Gemini models are currently experiencing high demand. Please try again later.",
      },
    }),
  };
};
