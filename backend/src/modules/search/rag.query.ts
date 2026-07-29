import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { pool } from "../../config/db";
import { embeddings } from "./rag.embeddings";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

// We use llama-3.3-70b-versatile for fast and smart generation
const llm = new ChatGroq({
  apiKey: env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.2, // Low temperature for more grounded answers
});

/**
 * Executes a RAG query:
 * 1. Embeds the user query
 * 2. Does a cosine similarity search in pgvector
 * 3. Passes the results + the question to Groq
 */
export async function performSearch(query: string, history?: { role: string, content: string }[]) {
  try {
    // 1. Embed the user's search query
    const [queryVector] = await embeddings.embedDocuments([query]);
    const vectorString = `[${queryVector.join(",")}]`;

    // 2. Search Postgres using vector cosine distance (<=>)
    // We get the top 5 closest items
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

    // 3. Construct context for the LLM
    const contextText = items.map(item => {
      const vegText = item.is_veg ? "Vegetarian" : "Non-Vegetarian";
      const spiceLevels = ["Not Spicy", "Mild", "Medium", "Hot"];
      const spiceText = spiceLevels[item.spice_level] || "Not Spicy";
      return `Dish: ${item.name} | Restaurant: ${item.restaurant_name} | Price: ₹${item.price} | Diet: ${vegText} | Spice: ${spiceText} | Description: ${item.description}`;
    }).join("\n");

    // 4. Ask the LLM to formulate an answer
    const messages = [
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

    const response = await llm.invoke(messages);

    return {
      answer: response.content,
      dishes: items.map(item => ({
        id: item.id,
        name: item.name,
        restaurant: item.restaurant_name,
        restaurant_id: item.restaurant_id,
        price: Number(item.price),
        is_veg: item.is_veg,
        description: item.description,
        distance: item.distance // lower is better
      }))
    };
  } catch (error) {
    logger.error({ err: error }, "Error in performSearch");
    throw new Error("Failed to perform search.");
  }
}
