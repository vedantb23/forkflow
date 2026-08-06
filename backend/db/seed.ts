import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/config/db";
import { logger } from "../src/config/logger";

const OWNER_EMAIL = "owner@forkflow.dev";

const RESTAURANTS = [
  {
    name: "Spice Route",
    cuisine: "North Indian",
    description: "Rich curries and fresh tandoori.",
    imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80",
    maxOrdersPerSlot: 5,
    menu: [
      { name: "Paneer Butter Masala", price: 220, isVeg: true, spice: 2, stock: 20, prep: 20, description: "Cottage cheese cubes cooked in a rich, creamy tomato gravy.", imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?auto=format&fit=crop&w=800&q=80" },
      { name: "Butter Chicken", price: 280, isVeg: false, spice: 2, stock: 15, prep: 25, description: "Tender chicken cooked in a mildly spiced tomato and butter sauce.", imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80" },
      { name: "Garlic Naan", price: 45, isVeg: true, spice: 0, stock: 50, prep: 10, description: "Traditional Indian flatbread topped with garlic and butter, baked in a tandoor.", imageUrl: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=800&q=80" },
      { name: "Dal Makhani", price: 180, isVeg: true, spice: 1, stock: 25, prep: 20, description: "Slow-cooked black lentils simmered with butter and cream.", imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80" },
    ],
  },
  {
    name: "Wok & Roll",
    cuisine: "Chinese",
    description: "Indo-Chinese street favourites.",
    imageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80",
    maxOrdersPerSlot: 4,
    menu: [
      { name: "Veg Hakka Noodles", price: 150, isVeg: true, spice: 2, stock: 30, prep: 15, description: "Wok-tossed noodles with mixed crunchy vegetables and soy sauce.", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80" },
      { name: "Chilli Chicken", price: 210, isVeg: false, spice: 3, stock: 18, prep: 20, description: "Crispy chicken tossed in a spicy, tangy sauce with bell peppers.", imageUrl: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80" },
      { name: "Veg Manchurian", price: 160, isVeg: true, spice: 2, stock: 22, prep: 18, description: "Fried vegetable balls in a spicy, sweet, and tangy Chinese gravy.", imageUrl: "https://images.unsplash.com/photo-1541604193435-2ca2fa823d79?auto=format&fit=crop&w=800&q=80" },
      { name: "Spring Rolls", price: 90, isVeg: true, spice: 1, stock: 40, prep: 12, description: "Crispy fried rolls stuffed with shredded vegetables.", imageUrl: "https://images.unsplash.com/photo-1605333555230-00eeb04889ed?auto=format&fit=crop&w=800&q=80" },
    ],
  },
  {
    name: "Pizza Piazza",
    cuisine: "Italian",
    description: "Wood-fired pizzas and pastas.",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    maxOrdersPerSlot: 6,
    menu: [
      { name: "Margherita Pizza", price: 250, isVeg: true, spice: 0, stock: 20, prep: 20, description: "Classic pizza with San Marzano tomato sauce, fresh mozzarella, and basil.", imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80" },
      { name: "Pepperoni Pizza", price: 340, isVeg: false, spice: 1, stock: 12, prep: 22, description: "New York style pizza topped with premium cured pepperoni.", imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80" },
      { name: "Penne Alfredo", price: 230, isVeg: true, spice: 0, stock: 16, prep: 18, description: "Penne pasta tossed in a rich, creamy parmesan cheese sauce.", imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80" },
      { name: "Garlic Bread", price: 120, isVeg: true, spice: 0, stock: 35, prep: 10, description: "Toasted baguette slices brushed with garlic butter and herbs.", imageUrl: "https://images.unsplash.com/photo-1573140401552-3fab0b24306f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z2FybGljJTIwYnJlYWR8ZW58MHx8MHx8fDA%3D" },
    ],
  },
  {
    name: "Healthy Greens",
    cuisine: "Salads & Bowls",
    description: "Nutritious and delicious plant-based meals.",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
    maxOrdersPerSlot: 8,
    menu: [
      { name: "Quinoa Avocado Bowl", price: 320, isVeg: true, spice: 1, stock: 20, prep: 10, description: "Fresh quinoa topped with avocado, cherry tomatoes, and a lemon vinaigrette.", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80" },
      { name: "Grilled Tofu Salad", price: 280, isVeg: true, spice: 1, stock: 15, prep: 15, description: "High protein grilled tofu with mixed greens and sesame dressing.", imageUrl: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80" },
      { name: "Berry Smoothie Bowl", price: 250, isVeg: true, spice: 0, stock: 25, prep: 5, description: "Mixed berries blended with almond milk, topped with granola.", imageUrl: "https://images.unsplash.com/photo-1494597564530-871f2b93ac55?auto=format&fit=crop&w=800&q=80" },
    ],
  },
  {
    name: "Mexican Fiesta",
    cuisine: "Mexican",
    description: "Authentic tacos, burritos, and more.",
    imageUrl: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=800&q=80",
    maxOrdersPerSlot: 5,
    menu: [
      { name: "Spicy Chicken Burrito", price: 290, isVeg: false, spice: 3, stock: 15, prep: 20, description: "Grilled chicken, rice, beans, and our fiery salsa wrapped in a warm tortilla.", imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80" },
      { name: "Veggie Tacos", price: 220, isVeg: true, spice: 2, stock: 30, prep: 15, description: "3 soft corn tortillas filled with grilled peppers, onions, and guacamole.", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80" },
      { name: "Loaded Nachos", price: 260, isVeg: true, spice: 2, stock: 20, prep: 10, description: "Crispy tortilla chips smothered in melted cheese, jalapeños, and sour cream.", imageUrl: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=800&q=80" },
    ],
  },
  {
    name: "Burger Brothers",
    cuisine: "American",
    description: "Juicy, messy, and delicious smash burgers.",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    maxOrdersPerSlot: 10,
    menu: [
      { name: "Classic Smash Burger", price: 200, isVeg: false, spice: 1, stock: 30, prep: 10, description: "Double beef patty smashed to perfection with American cheese and house sauce.", imageUrl: "https://images.unsplash.com/photo-1594212691516-435f0881c1cb?auto=format&fit=crop&w=800&q=80" },
      { name: "Crispy Chicken Sandwich", price: 220, isVeg: false, spice: 2, stock: 25, prep: 12, description: "Southern fried chicken breast with pickles and spicy mayo on a brioche bun.", imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=800&q=80" },
      { name: "Loaded Fries", price: 140, isVeg: true, spice: 1, stock: 40, prep: 8, description: "Crinkle cut fries topped with liquid cheese and jalapeños.", imageUrl: "https://images.unsplash.com/photo-1518013431119-2d4d804bc804?auto=format&fit=crop&w=800&q=80" },
    ]
  },
  {
    name: "Mumbai Chowk",
    cuisine: "Indian Street Food",
    description: "Spicy, tangy, and authentic street food straight from Mumbai.",
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    maxOrdersPerSlot: 15,
    menu: [
      { name: "Spicy Misal Pav", price: 120, isVeg: true, spice: 3, stock: 50, prep: 5, description: "A fiery Maharashtrian curry made from sprouted lentils, topped with crispy farsan, served with soft pav.", imageUrl: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=800&q=80" },
      { name: "Vada Pav", price: 50, isVeg: true, spice: 2, stock: 100, prep: 2, description: "The iconic Mumbai burger! Deep fried potato dumpling placed inside a soft bread bun with spicy garlic chutney.", imageUrl: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=800&q=80" },
      { name: "Pav Bhaji", price: 160, isVeg: true, spice: 2, stock: 40, prep: 10, description: "A thick, spicy vegetable mash cooked on a flat tawa, served with heavily buttered bread rolls.", imageUrl: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    name: "The Sugar Scoop",
    cuisine: "Desserts & Sweets",
    description: "Premium ice creams, sundaes, and fresh baked desserts.",
    imageUrl: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=800&q=80",
    maxOrdersPerSlot: 10,
    menu: [
      { name: "Death By Chocolate Sundae", price: 250, isVeg: true, spice: 0, stock: 30, prep: 5, description: "Three scoops of dark chocolate ice cream layered with hot fudge, brownies, and whipped cream.", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?auto=format&fit=crop&w=800&q=80" },
      { name: "Gulab Jamun with Vanilla Ice Cream", price: 140, isVeg: true, spice: 0, stock: 40, prep: 2, description: "Warm, syrup-soaked Indian milk dumplings served alongside cold, creamy vanilla ice cream.", imageUrl: "https://images.unsplash.com/photo-1596803774026-7d1a3c745778?auto=format&fit=crop&w=800&q=80" },
      { name: "Mango Cheesecake", price: 280, isVeg: true, spice: 0, stock: 15, prep: 0, description: "A rich and creamy baked cheesecake topped with fresh Alphonso mango glaze.", imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80" }
    ]
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ownerRes = await client.query("SELECT id FROM users WHERE email = $1", [OWNER_EMAIL]);
    if (ownerRes.rows.length > 0) {
      const existingOwnerId = ownerRes.rows[0].id;
      const restRes = await client.query("SELECT id FROM restaurants WHERE owner_id = $1", [existingOwnerId]);
      const restIds = restRes.rows.map(r => r.id);

      if (restIds.length > 0) {

        await client.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = ANY($1))", [restIds]);
        await client.query("DELETE FROM orders WHERE restaurant_id = ANY($1)", [restIds]);

        await client.query("DELETE FROM cart_items WHERE menu_item_id IN (SELECT id FROM menu_items WHERE restaurant_id = ANY($1))", [restIds]);
        await client.query("DELETE FROM menu_items WHERE restaurant_id = ANY($1)", [restIds]);

        await client.query("DELETE FROM restaurants WHERE owner_id = $1", [existingOwnerId]);
      }

      await client.query("DELETE FROM users WHERE id = $1", [existingOwnerId]);
    }

    const passwordHash = await bcrypt.hash("password123", 10);
    const ownerRows = await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'RESTAURANT_OWNER')
       RETURNING id`,
      [OWNER_EMAIL, passwordHash, "Demo Owner"]
    );
    const ownerId = ownerRows.rows[0].id;

    for (const r of RESTAURANTS) {
      const restRows = await client.query(
        `INSERT INTO restaurants (name, description, cuisine, image_url, max_orders_per_slot, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [r.name, r.description, r.cuisine, r.imageUrl, r.maxOrdersPerSlot, ownerId]
      );
      const restaurantId = restRows.rows[0].id;

      for (const m of r.menu) {
        await client.query(
          `INSERT INTO menu_items
             (restaurant_id, name, description, image_url, price, is_veg, spice_level, stock, prep_time_minutes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [restaurantId, m.name, m.description, m.imageUrl, m.price, m.isVeg, m.spice, m.stock, m.prep]
        );
      }
      logger.info(`Seeded "${r.name}" with ${r.menu.length} items`);
    }

    await client.query("COMMIT");
    logger.info("✅ Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "❌ Seed failed");
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
