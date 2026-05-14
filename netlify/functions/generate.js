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
      body: JSON.stringify({ error: "Server misconfiguration: API key missing in environment variables." }) 
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { jobTitle } = body;
  if (!jobTitle) {
    return { statusCode: 400, body: JSON.stringify({ error: "jobTitle is required" }) };
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
    },
  };

  try {
    // Netlify (Node 18+) has native fetch support
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return { 
        statusCode: response.status, 
        body: JSON.stringify({ error: "Error from AI provider", details: data }) 
      };
    }

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        // Allow CORS if someone tries to call this function directly from another frontend (optional, good practice)
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("Fetch error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
