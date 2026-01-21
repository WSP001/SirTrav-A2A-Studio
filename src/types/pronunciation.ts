export type PronunciationEntry = {
  term: string;
  spelling: string;
  notes?: string;
  tags?: string[];
};

export type PronunciationDictionary = {
  version?: string;
  updatedAt?: string;
  entries: PronunciationEntry[];
};
