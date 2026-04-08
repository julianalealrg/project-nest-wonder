import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file uploaded");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Convert PDF to base64 in chunks to avoid stack overflow
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    const base64 = btoa(binary);

    const systemPrompt = `You are a data extraction assistant for a marble/stone fabrication company (NUE Projetos, Recife, Brazil).
You receive PDF images of work orders (Ordem de Serviço / OS) with a standardized layout.

CABEÇALHO (fixed position fields at the top of the page):
- "Cód:" → codigo: the OS code (e.g. "0229/26-8/R00")
- "Cliente:" → cliente: client name
- "Material:" → material: material type and thickness
- "Ambiente:" → ambiente: room/environment
- "Supervisor:" → supervisor: supervisor name
- "Projetista:" → projetista: designer name
- "Data de Emissão:" → data_emissao: issue date in DD/MM/AAAA format, convert to YYYY-MM-DD
- "Data de Entrega:" → data_entrega: delivery date in DD/MM/AAAA format, convert to YYYY-MM-DD. If "IMEDIATO", set to null
- "Área (m²):" → area_m2: total area in m² (number)

LISTA DE PEÇAS (usually in the lower part of the page):
Standard format: "NÚMERO — [QUANTIDADE X] DESCRIÇÃO COMPRIMENTO X LARGURA"

Examples:
- "1.1 — BALCÃO 1,446 X 0,608" → item "1.1", quantidade 1, descricao "Balcão", comprimento 1.446, largura 0.608
- "1.2 — 2X ENCABEÇAMENTO 1,47 X 0,03" → item "1.2", quantidade 2, descricao "Encabeçamento", comprimento 1.47, largura 0.03

Rules:
- Convert commas to dots for decimal numbers (1,446 → 1.446)
- If quantity is not specified, assume 1
- If you can't read a field, set it to null
- Capitalize descriptions properly (BALCÃO → Balcão)
- Return ONLY valid JSON, no markdown`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all data from this OS PDF. Return JSON with keys: codigo, cliente, material, ambiente, supervisor, projetista, data_emissao, data_entrega, area_m2, pecas (array of {item, descricao, quantidade, comprimento, largura})."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_os_data",
              description: "Extract structured OS data from a PDF",
              parameters: {
                type: "object",
                properties: {
                  codigo: { type: "string", description: "OS code" },
                  cliente: { type: "string", description: "Client name" },
                  material: { type: "string", description: "Material type" },
                  ambiente: { type: "string", description: "Room/environment" },
                  supervisor: { type: "string", description: "Supervisor name" },
                  projetista: { type: "string", description: "Designer name" },
                  data_emissao: { type: "string", description: "Issue date YYYY-MM-DD" },
                  data_entrega: { type: "string", description: "Delivery date YYYY-MM-DD" },
                  area_m2: { type: "number", description: "Total area m²" },
                  pecas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        descricao: { type: "string" },
                        quantidade: { type: "number" },
                        comprimento: { type: "number" },
                        largura: { type: "number" },
                      },
                      required: ["item", "descricao", "quantidade", "comprimento", "largura"],
                    },
                  },
                },
                required: ["pecas"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_os_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione fundos nas configurações." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar PDF com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    console.log("AI result:", JSON.stringify(aiResult));

    // Extract tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: any = {};

    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        // Try extracting from content
        const content = aiResult.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[0]);
        }
      }
    } else {
      // Fallback: try parsing from content
      const content = aiResult.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    }

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-os-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
