
import { GoogleGenAI, Type } from "@google/genai";

const natureSchema = {
  type: Type.OBJECT,
  properties: {
    friendlyName: { type: Type.STRING },
    scientificName: { type: Type.STRING },
    easyDescription: { type: Type.STRING },
    taxonomy: {
      type: Type.OBJECT,
      properties: { kingdom: { type: Type.STRING }, family: { type: Type.STRING }, genus: { type: Type.STRING } },
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
        properties: { name: { type: Type.STRING }, scientificName: { type: Type.STRING }, relationType: { type: Type.STRING }, briefReason: { type: Type.STRING } },
        required: ["name", "scientificName", "relationType", "briefReason"]
      }
    }
  },
  required: ["friendlyName", "scientificName", "easyDescription", "taxonomy", "advancedInfo", "funFacts", "relatedSpecies"],
};

export default async function handler(req: any) {
  const { image } = await req.json();
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY not configured on server.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { 
          text: `You are an expert biologist. Identify the specimen in this photo.
                 CRITICAL RULES:
                 - If a human is visible, you MUST identify it as 'Human Explorer' (Homo sapiens).
                 - If a fish is visible, focus on marine biology.
                 - If a tree/plant is visible, focus on botanical taxonomy.
                 - Never misidentify a human as a plant or non-human animal.
                 Return ONLY a valid JSON object following the provided schema.` 
        },
        { inlineData: { mimeType: 'image/jpeg', data: image } }
      ]
    },
    config: { 
      responseMimeType: "application/json", 
      responseSchema: natureSchema,
      temperature: 0.1 
    }
  });

  return response.text;
}
