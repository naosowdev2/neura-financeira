import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, categories, transactionType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!description || !categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: "Description and categories are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categoryList = categories.map((c: any) => `- ${c.name} (ID: ${c.id})`).join('\n');

    const systemPrompt = `Você é um assistente financeiro especializado em categorização de transações.
Sua tarefa é analisar a descrição de uma transação e sugerir a categoria mais apropriada.

Regras:
1. Responda APENAS com o ID da categoria mais apropriada
2. Se nenhuma categoria for apropriada, responda "none"
3. Considere o tipo de transação (${transactionType === 'income' ? 'receita' : 'despesa'})
4. Seja preciso e consistente`;

    const userPrompt = `Descrição da transação: "${description}"

Categorias disponíveis (${transactionType === 'income' ? 'receitas' : 'despesas'}):
${categoryList}

Qual é o ID da categoria mais apropriada?`;

    console.log("Requesting AI categorization for:", description);

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
          { role: "user", content: userPrompt }
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestedCategoryId = data.choices?.[0]?.message?.content?.trim();

    console.log("AI suggested category:", suggestedCategoryId);

    // Validate the response is a valid category ID
    const isValidCategory = categories.some((c: any) => c.id === suggestedCategoryId);

    return new Response(
      JSON.stringify({ 
        categoryId: isValidCategory ? suggestedCategoryId : null,
        raw: suggestedCategoryId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in ai-categorize function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
