import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { env } from "../../config/env";

export const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: env.HUGGINGFACE_API_KEY,
  model: "sentence-transformers/all-MiniLM-L6-v2",
});
