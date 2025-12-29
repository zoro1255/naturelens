
import { GoogleGenAI, Type } from "@google/genai";

const natureSchema = {
  type: Type.OBJECT,
  properties: {
    friendlyName: { type: Type.STRING },
    scientificName: { type: Type.STRING },
    easyDescription: { type: Type.STRING },
    taxonomy: {
      type: Type.OBJECT,
      properties: { 
        kingdom: { type: Type.STRING }, 
        family: { type: Type.STRING }, 
        genus: { type: Type.STRING } 
      },
      required: ["kingdom", "family", "genus"],
    },
    advancedInfo: {
      type: Type.OBJECT,
      properties: {
        habitat: { type: Type.STRING },
        diet: { type: Type.STRING },
        behavior: { type: Type.STRING },
        conservationStatus: { type: Type.STRING },
        subspecies: { type: Type.ARRAY, items: { type: Type.STRING } },
        distribution: { type: Type.STRING },
        conservationEfforts: { type: Type.STRING },
      },
      required: ["habitat", "diet", "behavior", "conservationStatus", "subspecies", "distribution", "conservationEfforts"],
    },
    funFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
    relatedSpecies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { 
          name: { type: Type.STRING }, 
          scientificName: { type: Type.STRING }, 
          relationType: { 
            type: Type.STRING,
            description: "Must be one of: 'visually similar', 'ecologically related', 'same family'"
          }, 
          briefReason: { type: Type.STRING } 
        },
        required: ["name", "scientificName", "relationType", "briefReason"]
      },
      description: "Provide 2-3 suggestions of biological relatives or similar-looking species."
    }
  },
  required: ["friendlyName", "scientificName", "easyDescription", "taxonomy", "advancedInfo", "funFacts", "relatedSpecies"],
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { image } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: API_KEY is missing.' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { 
            text: `Identify the biological specimen in this photo with high precision.
                   RULES:
                   - If a person is visible, identify as 'Human Explorer' (Homo sapiens).
                   - Provide exhaustive botanical, marine, or zoological details.
                   - For 'relatedSpecies', suggest 2-3 actual biological relatives or species that are often confused with this specimen.
                   - Return strictly valid JSON matching the schema provided.` 
          },
          { inlineData: { mimeType: 'image/jpeg', data: image } }
        ]
      },
      config: { 
        responseMimeType: "application/json", 
        responseSchema: natureSchema,
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI model.");
    }

    return new Response(resultText, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Server API Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
