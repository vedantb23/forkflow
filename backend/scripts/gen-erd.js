// gen-erd.js — generates an ER-diagram SVG blueprint of the ForkFlow schema.
// Pure geometry generator: define tables + FK edges, emit an SVG with each
// table as a box, columns as rows, and curved connectors between FK -> PK.
// Run: node scripts/gen-erd.js  ->  writes ../docs/db-blueprint.svg

const fs = require("fs");
const path = require("path");

// ---- table definitions (name, x, y, columns) ----
// tag: 'PK' primary key, 'FK' foreign key, 'UQ' unique. col = column name.
const ROW_H = 22;      // height of one column row
const HEAD_H = 30;     // height of the table title bar
const W = 250;         // table box width
const PAD = 10;

const tables = {
  users: {
    x: 40, y: 360,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "email", t: "TEXT", tag: "UQ" },
      { c: "password_hash", t: "TEXT" },
      { c: "name", t: "TEXT" },
      { c: "phone", t: "TEXT" },
      { c: "role", t: "role" },
      { c: "google_id", t: "TEXT", tag: "UQ" },
      { c: "created_at", t: "TIMESTAMPTZ" },
      { c: "updated_at", t: "TIMESTAMPTZ" },
    ],
  },
  restaurants: {
    x: 400, y: 60,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "name", t: "TEXT" },
      { c: "description", t: "TEXT" },
      { c: "image_url", t: "TEXT" },
      { c: "cuisine", t: "TEXT" },
      { c: "address", t: "TEXT" },
      { c: "is_open", t: "BOOLEAN" },
      { c: "max_orders_per_slot", t: "INT" },
      { c: "owner_id", t: "UUID", tag: "FK" },
      { c: "created_at", t: "TIMESTAMPTZ" },
      { c: "updated_at", t: "TIMESTAMPTZ" },
    ],
  },
  carts: {
    x: 400, y: 560,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "user_id", t: "UUID", tag: "FK/UQ" },
      { c: "restaurant_id", t: "UUID" },
      { c: "created_at", t: "TIMESTAMPTZ" },
      { c: "updated_at", t: "TIMESTAMPTZ" },
    ],
  },
  menu_items: {
    x: 780, y: 40,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "restaurant_id", t: "UUID", tag: "FK" },
      { c: "name", t: "TEXT" },
      { c: "description", t: "TEXT" },
      { c: "price", t: "NUMERIC" },
      { c: "image_url", t: "TEXT" },
      { c: "is_veg", t: "BOOLEAN" },
      { c: "spice_level", t: "INT" },
      { c: "stock", t: "INT" },
      { c: "prep_time_minutes", t: "INT" },
      { c: "is_available", t: "BOOLEAN" },
      { c: "created_at", t: "TIMESTAMPTZ" },
      { c: "updated_at", t: "TIMESTAMPTZ" },
    ],
  },
  orders: {
    x: 780, y: 540,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "user_id", t: "UUID", tag: "FK" },
      { c: "restaurant_id", t: "UUID", tag: "FK" },
      { c: "status", t: "order_status" },
      { c: "total_amount", t: "NUMERIC" },
      { c: "slot_window", t: "TIMESTAMPTZ" },
      { c: "idempotency_key", t: "TEXT", tag: "UQ" },
      { c: "created_at", t: "TIMESTAMPTZ" },
      { c: "updated_at", t: "TIMESTAMPTZ" },
    ],
  },
  cart_items: {
    x: 1160, y: 60,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "cart_id", t: "UUID", tag: "FK" },
      { c: "menu_item_id", t: "UUID", tag: "FK" },
      { c: "quantity", t: "INT" },
    ],
  },
  order_items: {
    x: 1160, y: 320,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "order_id", t: "UUID", tag: "FK" },
      { c: "menu_item_id", t: "UUID", tag: "FK" },
      { c: "name_snapshot", t: "TEXT" },
      { c: "price_snapshot", t: "NUMERIC" },
      { c: "quantity", t: "INT" },
    ],
  },
  payments: {
    x: 1160, y: 590,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "order_id", t: "UUID", tag: "FK/UQ" },
      { c: "status", t: "payment_status" },
      { c: "amount", t: "NUMERIC" },
      { c: "provider", t: "TEXT" },
      { c: "transaction_id", t: "TEXT" },
      { c: "created_at", t: "TIMESTAMPTZ" },
      { c: "updated_at", t: "TIMESTAMPTZ" },
    ],
  },
  delivery_assignments: {
    x: 1160, y: 830,
    cols: [
      { c: "id", t: "UUID", tag: "PK" },
      { c: "order_id", t: "UUID", tag: "FK/UQ" },
      { c: "partner_id", t: "UUID", tag: "FK" },
      { c: "status", t: "delivery_status" },
      { c: "current_lat", t: "DOUBLE" },
      { c: "current_lng", t: "DOUBLE" },
      { c: "created_at", t: "TIMESTAMPTZ" },
      { c: "updated_at", t: "TIMESTAMPTZ" },
    ],
  },
};

// ---- foreign-key edges: from (table.col) -> to (table.col) ----
const edges = [
  { from: ["restaurants", "owner_id"], to: ["users", "id"], label: "owner" },
  { from: ["menu_items", "restaurant_id"], to: ["restaurants", "id"] },
  { from: ["carts", "user_id"], to: ["users", "id"] },
  { from: ["cart_items", "cart_id"], to: ["carts", "id"] },
  { from: ["cart_items", "menu_item_id"], to: ["menu_items", "id"] },
  { from: ["orders", "user_id"], to: ["users", "id"] },
  { from: ["orders", "restaurant_id"], to: ["restaurants", "id"] },
  { from: ["order_items", "order_id"], to: ["orders", "id"] },
  { from: ["order_items", "menu_item_id"], to: ["menu_items", "id"] },
  { from: ["payments", "order_id"], to: ["orders", "id"] },
  { from: ["delivery_assignments", "order_id"], to: ["orders", "id"] },
  { from: ["delivery_assignments", "partner_id"], to: ["users", "id"], label: "partner" },
];

// ---- geometry helpers ----
function boxH(tbl) { return HEAD_H + tbl.cols.length * ROW_H; }
function rowY(tbl, colName) {
  const i = tbl.cols.findIndex((c) => c.c === colName);
  return tbl.y + HEAD_H + i * ROW_H + ROW_H / 2;
}
// pick left/right anchor on the box edge closest to the other box
function anchor(tbl, colName, side) {
  const y = rowY(tbl, colName);
  const x = side === "left" ? tbl.x : tbl.x + W;
  return { x, y };
}

function tagColor(tag) {
  if (!tag) return "#64748b";
  if (tag.includes("PK")) return "#b45309"; // amber
  if (tag.includes("FK")) return "#2563eb"; // blue
  if (tag.includes("UQ")) return "#7c3aed"; // violet
  return "#64748b";
}

// ---- render tables ----
let boxes = "";
for (const [name, tbl] of Object.entries(tables)) {
  const h = boxH(tbl);
  boxes += `<g>`;
  // shadow + body
  boxes += `<rect x="${tbl.x}" y="${tbl.y}" width="${W}" height="${h}" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" filter="url(#shadow)"/>`;
  // header
  boxes += `<rect x="${tbl.x}" y="${tbl.y}" width="${W}" height="${HEAD_H}" rx="8" fill="#1e293b"/>`;
  boxes += `<rect x="${tbl.x}" y="${tbl.y + HEAD_H - 8}" width="${W}" height="8" fill="#1e293b"/>`;
  boxes += `<text x="${tbl.x + PAD}" y="${tbl.y + 20}" font-family="monospace" font-size="15" font-weight="700" fill="#f8fafc">${name}</text>`;
  // rows
  tbl.cols.forEach((col, i) => {
    const ry = tbl.y + HEAD_H + i * ROW_H;
    if (i % 2 === 1) {
      boxes += `<rect x="${tbl.x}" y="${ry}" width="${W}" height="${ROW_H}" fill="#f1f5f9"/>`;
    }
    const tag = col.tag ? ` ${col.tag}` : "";
    boxes += `<text x="${tbl.x + PAD}" y="${ry + 15}" font-family="monospace" font-size="12.5" fill="#0f172a">${col.c}</text>`;
    boxes += `<text x="${tbl.x + W - PAD}" y="${ry + 15}" text-anchor="end" font-family="monospace" font-size="10.5" fill="${tagColor(col.tag)}">${col.t}${tag}</text>`;
  });
  boxes += `</g>`;
}

// ---- render edges (curved connectors) ----
let lines = "";
for (const e of edges) {
  const [ft, fc] = e.from;
  const [tt, tc] = e.to;
  const fromTbl = tables[ft];
  const toTbl = tables[tt];
  // choose sides so each line leaves the edge that FACES the other box:
  // if the FK table is left of its target, it exits its RIGHT edge and enters
  // the target's LEFT edge (and vice-versa). Getting this backwards is what
  // sent control points off to negative-x and made the lines loop.
  const fromCenter = fromTbl.x + W / 2;
  const toCenter = toTbl.x + W / 2;
  const fromSide = fromCenter <= toCenter ? "right" : "left";
  const toSide = fromCenter <= toCenter ? "left" : "right";
  const a = anchor(fromTbl, fc, fromSide);
  const b = anchor(toTbl, tc, toSide);
  const dx = Math.max(60, Math.abs(b.x - a.x) / 2);
  // push each control point OUTWARD from its own edge
  const c1x = fromSide === "right" ? a.x + dx : a.x - dx;
  const c2x = toSide === "right" ? b.x + dx : b.x - dx;
  lines += `<path d="M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${b.x} ${b.y}" fill="none" stroke="#3b82f6" stroke-width="1.6" opacity="0.75" marker-end="url(#arrow)"/>`;
  // small dot at FK side
  lines += `<circle cx="${a.x}" cy="${a.y}" r="3" fill="#2563eb"/>`;
}

const WIDTH = 1450;
const HEIGHT = 1130;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="Segoe UI, sans-serif">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#94a3b8" flood-opacity="0.35"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6"/>
    </marker>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f8fafc"/>
  <text x="40" y="36" font-size="24" font-weight="800" fill="#0f172a">ForkFlow — Database Blueprint</text>
  <text x="40" y="56" font-size="13" fill="#475569">PostgreSQL (Supabase) · 9 tables · 12 foreign keys · arrows point FK → referenced PK</text>
  <!-- legend -->
  <g font-family="monospace" font-size="12">
    <text x="1000" y="40" fill="#b45309" font-weight="700">PK</text><text x="1030" y="40" fill="#475569">primary key</text>
    <text x="1000" y="56" fill="#2563eb" font-weight="700">FK</text><text x="1030" y="56" fill="#475569">foreign key</text>
    <text x="1150" y="40" fill="#7c3aed" font-weight="700">UQ</text><text x="1180" y="40" fill="#475569">unique</text>
  </g>
  ${lines}
  ${boxes}
</svg>`;

const outDir = path.join(__dirname, "..", "docs");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "db-blueprint.svg");
fs.writeFileSync(outPath, svg, "utf8");
console.log("wrote " + outPath);
