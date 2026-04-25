import { create } from "zustand";
import type { ParsedData } from "@/lib/importUtils";

export interface ChatMessage {
  role: "user" | "elly";
  text: string;
  timestamp: number;
}

export interface StoredDocument {
  id: string;
  name: string;
  ext: string;
  file: File;
  parsedData?: ParsedData;   // xlsx / csv
  docxHtml?: string;         // docx → HTML via mammoth
  uploadedAt: number;
}

interface DocumentState {
  documents: StoredDocument[];
  selectedId: string | null;
  insights: Record<string, string[]>;
  chatHistory: Record<string, ChatMessage[]>;

  addDocument: (doc: StoredDocument) => void;
  removeDocument: (id: string) => void;
  selectDocument: (id: string | null) => void;
  setInsights: (id: string, bullets: string[]) => void;
  addChatMessage: (id: string, msg: ChatMessage) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  selectedId: null,
  insights: {},
  chatHistory: {},

  addDocument: (doc) =>
    set((s) => ({
      documents: [...s.documents, doc],
      selectedId: doc.id,
    })),

  removeDocument: (id) =>
    set((s) => ({
      documents: s.documents.filter((d) => d.id !== id),
      selectedId: s.selectedId === id ? (s.documents.find((d) => d.id !== id)?.id ?? null) : s.selectedId,
    })),

  selectDocument: (id) => set({ selectedId: id }),

  setInsights: (id, bullets) =>
    set((s) => ({ insights: { ...s.insights, [id]: bullets } })),

  addChatMessage: (id, msg) =>
    set((s) => ({
      chatHistory: {
        ...s.chatHistory,
        [id]: [...(s.chatHistory[id] ?? []), msg],
      },
    })),
}));
