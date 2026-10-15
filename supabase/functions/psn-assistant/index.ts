const allowedOrigins = new Set([
  "https://robinmutinda53-droid.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin)
      ? origin
      : "https://robinmutinda53-droid.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function jsonResponse(body: Record<string, string>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Cache-Control": "no-store",
      "Content-Type": "application/json"
    }
  });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, origin);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 8192) {
    return jsonResponse({ error: "The question is too long." }, 413, origin);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "A valid JSON request is required." }, 400, origin);
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("question" in body) ||
    typeof body.question !== "string" ||
    body.question.trim().length === 0 ||
    body.question.length > 1000
  ) {
    return jsonResponse({ error: "Enter a question of up to 1,000 characters." }, 400, origin);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "The AI assistant has not been configured yet." }, 503, origin);
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": ["Bearer", apiKey].join(" "),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are the CarePath website navigation assistant for a Kenyan health-services directory prototype. Help only with using the site's search, service/type filters, map, location button, dark mode, account privacy, and community report form. You may explain the demo's listed services and fictional Nairobi records, but never claim the demo facility data is real or current. Do not diagnose, triage, recommend treatment, or give medical advice; for health questions, politely direct the user to a qualified health professional or local emergency services. Do not ask for or repeat personal health details, passwords, or email addresses. Be concise, clear, and supportive. If a question is outside website navigation, say what you can help with."
          },
          { role: "user", content: body.question.trim() }
        ]
      })
    });

    if (!upstream.ok) {
      console.error("OpenAI assistant request failed with status", upstream.status);
      return jsonResponse({ error: "The assistant is temporarily unavailable. Please try again." }, 502, origin);
    }

    const result = await upstream.json();
    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      console.error("OpenAI assistant returned an empty or invalid response.");
      return jsonResponse({ error: "The assistant returned an empty response. Please try again." }, 502, origin);
    }
    return jsonResponse({ answer: answer.trim() }, 200, origin);
  } catch (error) {
    console.error("OpenAI assistant request could not be completed:", error);
    return jsonResponse({ error: "The assistant is temporarily unavailable. Please try again." }, 502, origin);
  }
});
