import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  imageBase64: string;
  text: string;
  audioUrl?: string | null;
}

interface GeminiResponse {
  caption_instagram: string;
  titulo_marketplace: string;
  precio_sugerido: string;
  categoria: string;
  descripcion_detallada: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Enforce authenticated requests (user JWT).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const { imageBase64, text, audioUrl }: RequestBody = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Validate the token with Supabase Auth
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase env not configured (SUPABASE_URL / SUPABASE_ANON_KEY)");
    }

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    let combinedText = text;

    // If we receive an audio URL, try to transcribe it with Gemini and
    // append the transcription to the user text to enrich the analysis.
    if (audioUrl) {
      try {
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          console.error("Failed to fetch audio for transcription:", await audioResponse.text());
        } else {
          const audioArrayBuffer = await audioResponse.arrayBuffer();
          const audioBytes = new Uint8Array(audioArrayBuffer);
          let binary = "";
          for (let i = 0; i < audioBytes.byteLength; i++) {
            binary += String.fromCharCode(audioBytes[i]);
          }
          const audioBase64 = btoa(binary);

          const transcriptionPrompt =
            "Transcribe este audio del usuario. Devuelve solo el texto transcrito en español, sin comentarios adicionales.";

          const transcriptionRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: transcriptionPrompt },
                      {
                        inline_data: {
                          mime_type: "audio/webm",
                          data: audioBase64,
                        },
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (transcriptionRes.ok) {
            const transcriptionData = await transcriptionRes.json();
            const transcriptionText =
              transcriptionData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (transcriptionText) {
              combinedText = `${text}\n\nDescripción por voz del usuario: ${transcriptionText}`;
            }
          } else {
            console.error("Gemini transcription error:", await transcriptionRes.text());
          }
        }
      } catch (transcriptionError) {
        console.error("Error during audio transcription:", transcriptionError);
      }
    }

    const prompt = `Analiza esta imagen y el siguiente texto del usuario (incluyendo, si está presente, una descripción por voz transcrita): "${combinedText}".

Genera un JSON con los siguientes campos:
- caption_instagram: Un caption atractivo para Instagram (máximo 150 caracteres, con emojis relevantes)
- titulo_marketplace: Un título conciso para marketplace (máximo 60 caracteres)
- precio_sugerido: Un precio sugerido en dólares (solo el número, ej: "29.99")
- categoria: La categoría del producto (ej: "Electrónica", "Ropa", "Hogar", etc.)
- descripcion_detallada: Una descripción detallada del producto para marketplace (150-200 palabras)

Responde SOLO con el JSON, sin texto adicional.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates[0]?.content?.parts[0]?.text;

    if (!responseText) {
      throw new Error("No response from Gemini");
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Gemini response");
    }

    const parsedResponse: GeminiResponse = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsedResponse), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
