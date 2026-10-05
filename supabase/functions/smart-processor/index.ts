import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface TextChunk {
  text: string;
  index: number;
}

function chunkText(text: string, maxChunkLength = 1500): TextChunk[] {
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let index = 0;

  const paragraphs = String(text || "").split(/\n\s*\n+/);

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if ((currentChunk + "\n\n" + trimmed).length <= maxChunkLength) {
      currentChunk = (currentChunk ? currentChunk + "\n\n" : "") + trimmed;
      continue;
    }

    if (currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), index: index++ });
      currentChunk = "";
    }

    const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [trimmed];

    for (const sentence of sentences) {
      const sentenceText = sentence.trim();
      if (!sentenceText) continue;

      if ((currentChunk + " " + sentenceText).length <= maxChunkLength) {
        currentChunk = (currentChunk ? currentChunk + " " : "") + sentenceText;
      } else {
        if (currentChunk.trim()) {
          chunks.push({ text: currentChunk.trim(), index: index++ });
          currentChunk = "";
        }

        if (sentenceText.length > maxChunkLength) {
          const subParts = sentenceText.match(/.{1,1200}/g) || [sentenceText];
          for (const sub of subParts) {
            const clean = sub.trim();
            if (!clean) continue;
            if (currentChunk && (currentChunk + " " + clean).length > maxChunkLength) {
              chunks.push({ text: currentChunk.trim(), index: index++ });
              currentChunk = clean;
            } else {
              currentChunk = currentChunk ? currentChunk + " " + clean : clean;
            }
          }
        } else {
          currentChunk = sentenceText;
        }
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ text: currentChunk.trim(), index: index });
  }

  return chunks.length ? chunks : [{ text: String(text || "").trim(), index: 0 }];
}

async function verifySupabaseToken(token: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase environment is not configured for edge authentication.");
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    return !error && !!data.user;
  } catch {
    return false;
  }
}

async function synthesizeGeminiSpeech(text: string, voice: string): Promise<{ audio: string; mimeType: string }> {
  const payload = {
    input: { text },
    voice: {
      languageCode: "en-US",
      name: `en-US-Neural2-${voice || "Kore"}`,
    },
    audioConfig: {
      audioEncoding: "LINEAR16",
      pitch: 0,
      speakingRate: 1.0,
    },
  };

  const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GEMINI_API_KEY || "",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const textError = await response.text();
    throw new Error(`Gemini TTS failed: ${response.status} ${textError}`);
  }

  const result = await response.json();
  const audioBase64 = result?.audioContent;

  if (!audioBase64) {
    throw new Error("Gemini returned no audio content.");
  }

  return {
    audio: audioBase64,
    mimeType: "audio/wav",
  };
}

function base64ToBinary(base64: string): Uint8Array {
  const normalized = base64.replace(/^data:audio\/[a-zA-Z0-9.+-]+;base64,/i, "");
  const binaryString = atob(normalized);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function combineWavBase64(chunks: string[]): string {
  if (!chunks.length) {
    throw new Error("No audio chunks to combine.");
  }

  if (chunks.length === 1) {
    return chunks[0];
  }

  const binaryChunks = chunks.map((chunk) => base64ToBinary(chunk));
  let totalDataSize = 0;

  for (const chunk of binaryChunks) {
    if (chunk.length >= 44) {
      totalDataSize += chunk.length - 44;
    }
  }

  const totalLength = 44 + totalDataSize;
  const output = new Uint8Array(totalLength);

  output.set([82, 73, 70, 70], 0);
  new DataView(output.buffer).setUint32(4, 36 + totalDataSize, true);
  output.set([87, 65, 86, 69], 8);
  output.set([102, 109, 116, 32], 12);
  new DataView(output.buffer).setUint32(16, 16, true);
  new DataView(output.buffer).setUint16(20, 1, true);
  new DataView(output.buffer).setUint16(22, 1, true);
  new DataView(output.buffer).setUint32(24, 24000, true);
  new DataView(output.buffer).setUint32(28, 24000 * 2, true);
  new DataView(output.buffer).setUint16(32, 2, true);
  new DataView(output.buffer).setUint16(34, 16, true);
  output.set([100, 97, 116, 97], 36);
  new DataView(output.buffer).setUint32(40, totalDataSize, true);

  let offset = 44;
  for (const chunk of binaryChunks) {
    if (chunk.length >= 44) {
      output.set(chunk.slice(44), offset);
      offset += chunk.length - 44;
    }
  }

  let binary = "";
  for (let i = 0; i < output.length; i++) {
    binary += String.fromCharCode(output[i]);
  }

  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Supabase token." }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const valid = await verifySupabaseToken(token);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid or expired authentication token." }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.text || body.notes || body.content || "").trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "No text was provided." }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured." }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const title = String(body.title || "Document").trim() || "Document";
    const voice = String(body.voice || "Kore").trim() || "Kore";
    const chunks = chunkText(text);

    const generatedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const result = await synthesizeGeminiSpeech(chunk.text, voice);
        generatedChunks.push(result.audio);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: `Failed to generate audio for section ${i + 1}: ${String(error)}`,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    const combined = combineWavBase64(generatedChunks);

    return new Response(
      JSON.stringify({
        audio_base64: combined,
        mime_type: "audio/wav",
        filename: `${String(title).replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "lesson"}.wav`,
        chunks_processed: chunks.length,
        total_characters: text.length,
        voice,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: `Unexpected server error: ${String(error)}`,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
