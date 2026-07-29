import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { env } from "../../config/env";

/**
 * Creates and exports the HuggingFace embeddings instance.
 * We are using 'sentence-transformers/all-MiniLM-L6-v2' which is a highly capable
 * and fast model producing 384-dimensional vectors.
 */
export const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: env.HUGGINGFACE_API_KEY,
  model: "sentence-transformers/all-MiniLM-L6-v2",
});
