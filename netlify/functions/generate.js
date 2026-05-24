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

  // Structured Outputs (responseSchema) ensures the model returns a valid JSON array of strings
  const payload = {
    contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "STRING"
        }
      }
    },
  };

  // -----------------------------------------------------------------------
  // Robust Model Fallback and Fast Failover Strategy (Server-Side)
  // -----------------------------------------------------------------------
  const MODELS = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];

  for (const model of MODELS) {
    console.log(`Attempting question generation with model: ${model}`);
    
    // In serverless environment, fail-fast to the next model is superior to retry-delay
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s model timeout

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
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

      // If it's a client error (e.g., 400 or 403), fail immediately without fallback
      if (response.status === 400 || response.status === 403) {
        return {
          statusCode: response.status,
          body: JSON.stringify({ error: { message: data?.error?.message || "Client error" } }),
        };
      }

      // For rate limits (429) or busy server (503), fall back instantly to the next model
      continue;

    } catch (error) {
      console.error(`Fetch error or timeout with model ${model}:`, error);
      // Fall back instantly to next model
      continue;
    }
  }

  // All models failed or timed out
  return {
    statusCode: 503,
    body: JSON.stringify({
      error: {
        message: "All available Gemini models are currently experiencing high demand. Please try again later.",
      },
    }),
  };
};
