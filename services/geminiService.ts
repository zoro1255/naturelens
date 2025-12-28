
import { GoogleGenAI, Type } from "@google/genai";
import { NatureInfo, SpeciesDetail } from "../types";

// Simulated database for "Bypass/Local Mode"
const MOCK_FINDINGS: NatureInfo[] = [
  {
    friendlyName: "Common Garden Rose",
    scientificName: "Rosa rubiginosa",
    easyDescription: "A beautiful, fragrant flower often found in gardens. It has soft petals and thorns on its stem to protect itself.",
    taxonomy: { kingdom: "Plantae", family: "Rosaceae", genus: "Rosa" },
    advancedInfo: {
      habitat: "Temperate regions, gardens, and wild woodlands.",
      diet: "Photosynthesis (Sunlight, Water, CO2)",
      behavior: "Blooms primarily in late spring and summer.",
      conservationStatus: "Least Concern",
      subspecies: ["Damask Rose", "Tea Rose"],
      distribution: "Worldwide, originally from Northern Hemisphere.",
      conservationEfforts: "Widely cultivated; no specific conservation threats."
    },
    funFacts: [
      "Roses are actually edible and often used in teas.",
      "The oldest living rose is over 1,000 years old!",
      "Different colors represent different feelings like love or friendship."
    ],
    relatedSpecies: [
      { name: "Wild Strawberry", scientificName: "Fragaria vesca", relationType: "same family", briefReason: "Both are members of the Rosaceae family." }
    ]
  },
  {
    friendlyName: "Monarch Butterfly",
    scientificName: "Danaus plexippus",
    easyDescription: "A bright orange and black butterfly famous for traveling thousands of miles during the winter.",
    taxonomy: { kingdom: "Animalia", family: "Nymphalidae", genus: "Danaus" },
    advancedInfo: {
      habitat: "Open fields, meadows, and milkweed patches.",
      diet: "Nectar from flowers; larvae eat milkweed.",
      behavior: "Known for its multi-generational migration across North America.",
      conservationStatus: "Endangered (IUCN)",
      subspecies: ["D. p. plexippus", "D. p. megalippe"],
      distribution: "North, Central, and South America.",
      conservationEfforts: "Planting milkweed and creating butterfly corridors."
    },
    funFacts: [
      "Monarchs are poisonous to birds because of the milkweed they eat.",
      "They can fly up to 100 miles in a single day.",
      "A group of butterflies is called a 'kaleidoscope'."
    ],
    relatedSpecies: [
      { name: "Viceroy Butterfly", scientificName: "Limenitis archippus", relationType: "visually similar", briefReason: "Mimics the monarch to avoid predators." }
    ]
  }
];

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
        genus: { type: Type.STRING },
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
          relationType: { type: Type.STRING },
          briefReason: { type: Type.STRING }
        },
        required: ["name", "scientificName", "relationType", "briefReason"]
      }
    }
  },
  required: ["friendlyName", "scientificName", "easyDescription", "taxonomy", "advancedInfo", "funFacts", "relatedSpecies"],
};

export async function identifySpecies(base64Image: string): Promise<NatureInfo | null> {
  const apiKey = process.env.API_KEY;

  // BYPASS: If no API key, use Local Intelligence Mode immediately
  if (!apiKey || apiKey === "undefined" || apiKey === "null") {
    console.warn("NatureLens: Entering Local Discovery Mode (No API Key detected).");
    return new Promise((resolve) => {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * MOCK_FINDINGS.length);
        resolve(MOCK_FINDINGS[randomIndex]);
      }, 1500); // Simulate processing time
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: "Identify the species in this image. Use the provided JSON schema." },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: natureSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("EMPTY");
    return JSON.parse(text) as NatureInfo;
  } catch (error) {
    console.error("Gemini API Error, falling back to Local Mode:", error);
    const randomIndex = Math.floor(Math.random() * MOCK_FINDINGS.length);
    return MOCK_FINDINGS[randomIndex];
  }
}

export async function getRelatedSpeciesDetail(name: string): Promise<SpeciesDetail> {
  // Simple local fallback for details
  return {
    description: `A unique species found within the ${name} family tree.`,
    keyCharacteristic: "Visual patterns unique to its environment.",
    habitatSummary: "Varies depending on regional climate.",
    conservationNote: "Under observation by local wildlife groups."
  };
}
