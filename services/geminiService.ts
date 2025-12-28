
import { GoogleGenAI, Type } from "@google/genai";
import { NatureInfo, SpeciesDetail } from "../types";

// Fix: Declare AIStudio as a global interface to match the environment's expected type naming.
// This resolves the error where subsequent property declarations must have the same type.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

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
          relationType: { type: Type.STRING, description: "Relationship type: 'visually similar', 'ecologically related', or 'same family'" },
          briefReason: { type: Type.STRING }
        },
        required: ["name", "scientificName", "relationType", "briefReason"]
      },
      description: "3 visually or ecologically related species"
    }
  },
  required: ["friendlyName", "scientificName", "easyDescription", "taxonomy", "advancedInfo", "funFacts", "relatedSpecies"],
};

const speciesDetailSchema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "A concise 2-sentence description of the species." },
    keyCharacteristic: { type: Type.STRING, description: "One main physical or behavioral feature." },
    habitatSummary: { type: Type.STRING, description: "Brief summary of where it typically lives." },
    conservationNote: { type: Type.STRING, description: "Current conservation trend or status note." }
  },
  required: ["description", "keyCharacteristic", "habitatSummary", "conservationNote"]
};

/**
 * Creates a fresh AI client instance. 
 * Automatically prompts for a key if missing in the preview environment.
 */
async function createClient() {
  let apiKey = process.env.API_KEY;
  
  // If key is missing and we're in the AI Studio environment, try to trigger the key selector
  if ((!apiKey || apiKey === "undefined") && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // Trigger key selection dialog
      await window.aistudio.openSelectKey();
      // Assume selection was successful per guidelines to avoid race conditions
      apiKey = process.env.API_KEY; 
    }
  }

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  // Create instance right before API call as per requirements
  return new GoogleGenAI({ apiKey });
}

export async function identifySpecies(base64Image: string): Promise<NatureInfo | null> {
  try {
    const ai = await createClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: "Identify the species in this image. Provide a detailed scientific analysis using the provided JSON schema." },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: natureSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    return JSON.parse(text) as NatureInfo;
  } catch (error: any) {
    // Handle the specific "Entity not found" error by re-triggering key selection
    if (error.message?.includes("Requested entity was not found") && window.aistudio) {
      await window.aistudio.openSelectKey();
    }
    throw error;
  }
}

export async function getRelatedSpeciesDetail(name: string): Promise<SpeciesDetail> {
  const ai = await createClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Provide detailed biological information about the species: ${name}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: speciesDetailSchema,
    }
  });
  
  const text = response.text;
  if (!text) throw new Error("EMPTY_RESPONSE");
  return JSON.parse(text) as SpeciesDetail;
}
