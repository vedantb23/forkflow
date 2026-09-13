import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { pool } from "../../config/db";
import { embeddings } from "./rag.embeddings";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

const modelName = env.GROQ_MODEL || "qwen/qwen3.8-27b";

const llm = new ChatGroq({
  apiKey: env.GROQ_API_KEY,
  model: modelName,
  temperature: 0.2,
});

export async function performSearch(query: string, history?: { role: string, content: string }[]) {
  try {

    const [queryVector] = await embeddings.embedDocuments([query]);
    const vectorString = `[${queryVector.join(",")}]`;

    const sql = `
      SELECT m.id, m.name, m.description, m.price, m.is_veg, m.spice_level,
             r.name as restaurant_name, r.id as restaurant_id,
             (m.embedding <=> $1) as distance
      FROM menu_items m
      JOIN restaurants r ON m.restaurant_id = r.id
      WHERE m.embedding IS NOT NULL
      ORDER BY m.embedding <=> $1
      LIMIT 5
    `;

    const dbResult = await pool.query(sql, [vectorString]);
    const items = dbResult.rows;

    if (items.length === 0) {
      return {
        answer: "I couldn't find any menu items to match your request right now.",
        dishes: [],
      };
    }

    const contextText = items.map(item => {
      const vegText = item.is_veg ? "Vegetarian" : "Non-Vegetarian";
      const spiceLevels = ["Not Spicy", "Mild", "Medium", "Hot"];
      const spiceText = spiceLevels[item.spice_level] || "Not Spicy";
      return `Dish: ${item.name} | Restaurant: ${item.restaurant_name} | Price: ₹${item.price} | Diet: ${vegText} | Spice: ${spiceText} | Description: ${item.description}`;
    }).join("\n");

    const messages: BaseMessage[] = [
      new SystemMessage(`You are the ForkFlow AI Assistant, helping a user find food to order.
Use the following menu items retrieved from our database to answer the user's query.
If the user asks for something not in the context, politely say you couldn't find an exact match but suggest the closest options from the context.
Be friendly, concise, and helpful.

Context (Retrieved Menu Items):
${contextText}`)
    ];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user') messages.push(new HumanMessage(msg.content));
        if (msg.role === 'assistant') messages.push(new AIMessage(msg.content));
      }
    }

    messages.push(new HumanMessage(query));

    let answer = "";
    try {
      const response = await llm.invoke(messages);
      const rawContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      // Strip any reasoning / think tags if present
      answer = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    } catch (llmError) {
      logger.warn({ err: llmError }, "Groq LLM call failed in performSearch; returning matched dishes with fallback answer");
      answer = `Here are the top matches I found for "${query}":`;
    }

    return {
      answer,
      dishes: items.map(item => ({
        id: item.id,
        name: item.name,
        restaurant: item.restaurant_name,
        restaurant_id: item.restaurant_id,
        price: Number(item.price),
        is_veg: item.is_veg,
        description: item.description,
        distance: item.distance
      }))
    };
  } catch (error) {
    logger.error({ err: error }, "Error in performSearch");
    throw new Error("Failed to perform search.");
  }
}
