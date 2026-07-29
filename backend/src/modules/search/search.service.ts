import { performSearch } from "./rag.query";

export class SearchService {
  /**
   * Searches for menu items using RAG (semantic search + LLM summary)
   */
  async search(query: string, history?: { role: string, content: string }[]) {
    if (!query || query.trim().length === 0) {
      throw new Error("Search query cannot be empty");
    }
    return await performSearch(query, history);
  }
}

export const searchService = new SearchService();
