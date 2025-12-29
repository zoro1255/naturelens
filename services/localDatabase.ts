
import { NatureInfo } from "../types";

export const LOCAL_DATABASE: NatureInfo[] = [
  {
    friendlyName: "Human Explorer",
    scientificName: "Homo sapiens",
    easyDescription: "The dominant intelligent species on Earth, known for curiosity and advanced tool use.",
    taxonomy: { kingdom: "Animalia", family: "Hominidae", genus: "Homo" },
    advancedInfo: {
      habitat: "Global; every continent and climate.",
      diet: "Omnivorous; highly varied.",
      behavior: "Social, creative, and technological.",
      conservationStatus: "Vibrant",
      subspecies: ["H. s. sapiens"],
      distribution: "Global",
      conservationEfforts: "Societal and medical protection."
    },
    funFacts: ["Humans have unique fingerprints.", "The brain uses 20% of the body's energy.", "Humans are the only species that cook food."],
    relatedSpecies: [{ name: "Chimpanzee", scientificName: "Pan troglodytes", relationType: "same family", briefReason: "Closely related primate." }]
  },
  {
    friendlyName: "Great White Shark",
    scientificName: "Carcharodon carcharias",
    easyDescription: "A legendary ocean predator with an amazing sense of smell and rows of sharp teeth.",
    taxonomy: { kingdom: "Animalia", family: "Lamnidae", genus: "Carcharodon" },
    advancedInfo: {
      habitat: "Cool, coastal waters worldwide.",
      diet: "Carnivorous; seals, sea lions, and fish.",
      behavior: "Apex predator; migratory and solitary.",
      conservationStatus: "Vulnerable",
      subspecies: ["None"],
      distribution: "Temperate oceans",
      conservationEfforts: "International trade bans and marine sanctuaries."
    },
    funFacts: ["They can detect a drop of blood in 25 gallons of water.", "They never stop swimming.", "They can jump 10 feet out of the water."],
    relatedSpecies: [{ name: "Mako Shark", scientificName: "Isurus oxyrinchus", relationType: "same family", briefReason: "Fastest shark in the ocean." }]
  },
  {
    friendlyName: "Giant Sequoia",
    scientificName: "Sequoiadendron giganteum",
    easyDescription: "The most massive trees on Earth, growing taller than 20-story buildings.",
    taxonomy: { kingdom: "Plantae", family: "Cupressaceae", genus: "Sequoiadendron" },
    advancedInfo: {
      habitat: "Sierra Nevada mountains, California.",
      diet: "Photosynthesis; massive water requirements.",
      behavior: "Extremely long-lived (thousands of years).",
      conservationStatus: "Endangered",
      subspecies: ["None"],
      distribution: "Western USA",
      conservationEfforts: "Protected in Sequoia National Park."
    },
    funFacts: ["They can live 3,000 years.", "Their bark can be 3 feet thick.", "Fire actually helps them release seeds."],
    relatedSpecies: [{ name: "Coast Redwood", scientificName: "Sequoia sempervirens", relationType: "same family", briefReason: "Tallest tree relative." }]
  },
  {
    friendlyName: "Emperor Penguin",
    scientificName: "Aptenodytes forsteri",
    easyDescription: "The largest of all penguin species, famous for surviving the coldest winters on Earth.",
    taxonomy: { kingdom: "Animalia", family: "Spheniscidae", genus: "Aptenodytes" },
    advancedInfo: {
      habitat: "Antarctic ice and surrounding seas.",
      diet: "Piscivorous; fish, krill, and squid.",
      behavior: "Highly social; huddles for warmth.",
      conservationStatus: "Near Threatened",
      subspecies: ["None"],
      distribution: "Antarctica",
      conservationEfforts: "Climate change monitoring and habitat protection."
    },
    funFacts: ["They can dive deeper than any other bird.", "Males incubate the egg for 2 months without eating.", "They use their wings like flippers."],
    relatedSpecies: [{ name: "King Penguin", scientificName: "Aptenodytes patagonicus", relationType: "same family", briefReason: "Second largest penguin." }]
  }
];
