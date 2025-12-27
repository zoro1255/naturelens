
import { GoogleGenAI, Type } from "@google/genai";
import { NatureInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const natureSchema = {
  type: Type.OBJECT,
  properties: {
    friendlyName: { type: Type.STRING, description: "Common name of the species" },
    scientificName: { type: Type.STRING, description: "Latin/Scientific name" },
    easyDescription: { type: Type.STRING, description: "Simple, friendly explanation for kids" },
    taxonomy: {
      type: Type.OBJECT,
      properties: {
        kingdom: { type: Type.STRING },
        family: { type: Type.STRING },
        genus: { type: Type.STRING },
      },
      required: ["kingdom", "family", "genus"],
    },
    advancedInfo: {
      type: Type.OBJECT,
      properties: {
        habitat: { type: Type.STRING, description: "Natural environment where it lives" },
        diet: { type: Type.STRING, description: "What it eats" },
        behavior: { type: Type.STRING, description: "Typical social or individual behavior" },
        conservationStatus: { type: Type.STRING, description: "IUCN status" },
        subspecies: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Notable common subspecies" },
        distribution: { type: Type.STRING, description: "Geographical range" },
        conservationEfforts: { type: Type.STRING, description: "Current programs to protect the species" },
      },
      required: ["habitat", "diet", "behavior", "conservationStatus", "subspecies", "distribution", "conservationEfforts"],
    },
    aquaticInfo: {
      type: Type.OBJECT,
      properties: {
        compatibleTankMates: { type: Type.ARRAY, items: { type: Type.STRING }, description: "If a fish, list compatible species" },
        cohabitationNotes: { type: Type.STRING, description: "Notes on aggression or specific needs for sharing space" },
      },
      description: "Only provide this field if the species is a fish or aquatic organism suitable for aquariums."
    },
    funFacts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 interesting facts about the species"
    },
    relatedSpecies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          relationType: { type: Type.STRING, enum: ['visually similar', 'ecologically related', 'same family'] },
          briefReason: { type: Type.STRING }
        },
        required: ["name", "scientificName", "relationType", "briefReason"]
      },
      description: "3 visually or ecologically related species"
    }
  },
  required: ["friendlyName", "scientificName", "easyDescription", "taxonomy", "advancedInfo", "funFacts", "relatedSpecies"],
};

export async function identifySpecies(base64Image: string): Promise<NatureInfo | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "Identify the animal or plant in this image. Provide a comprehensive scientific analysis. If it is a fish, strictly include the 'aquaticInfo' field with tank mate compatibility and cohabitation details. Include geographical distribution, subspecies, and conservation efforts in the advancedInfo section." },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: natureSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as NatureInfo;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}

export async function lookupSpeciesByName(name: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tell me about the ${name} species. Include its common name, scientific name, and a 2-sentence summary.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text || "Information currently unavailable.";
}
