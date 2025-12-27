
export interface RelatedSpecies {
  name: string;
  scientificName: string;
  relationType: 'visually similar' | 'ecologically related' | 'same family';
  briefReason: string;
}

export interface NatureInfo {
  friendlyName: string;
  scientificName: string;
  easyDescription: string;
  taxonomy: {
    kingdom: string;
    family: string;
    genus: string;
  };
  advancedInfo: {
    habitat: string;
    diet: string;
    behavior: string;
    conservationStatus: string;
    subspecies: string[];
    distribution: string;
    conservationEfforts: string;
  };
  aquaticInfo?: {
    compatibleTankMates: string[];
    cohabitationNotes: string;
  };
  funFacts: string[];
  relatedSpecies: RelatedSpecies[];
}

export enum AppMode {
  EASY = 'EASY',
  ADVANCED = 'ADVANCED'
}

export type IdentificationResult = NatureInfo | null;
