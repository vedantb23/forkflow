"use client";

// LiveDeliveryMap — a real OpenStreetMap map (react-leaflet) that shows the delivery
// partner's bike moving live, the customer's own location, and a line connecting the
// two (Zomato-style). NO API KEY / NO BILLING: free OSM raster tiles.
//
// IMPORTANT: this component touches `window` (Leaflet), so it must NEVER be
// server-rendered. It's always loaded via `dynamic(() => import(...), { ssr: false })`
// from the tracking page (see orders/[id]/page.tsx). Do not import it statically.

import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

// Default view when we have no GPS fix yet: centered on India, zoomed to show the
// whole country. Once a real position arrives we snap in close.
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const INDIA_ZOOM = 5;
const TRACK_ZOOM = 15;

export interface LatLng {
  lat: number;
  lng: number;
}

// Both markers are pure HTML (divIcons), so we don't depend on Leaflet's default PNG
// marker assets — those break under bundlers unless you copy the images manually.
// Material Symbols is already loaded globally, so the glyphs render here.
function pinIcon(glyph: string, bg: string, ring: string) {
  return divIcon({
    className: "",
    html: `
      <div style="
        display:flex;align-items:center;justify-content:center;
        width:40px;height:40px;border-radius:9999px;
        background:${bg};color:#fff;
        box-shadow:0 4px 12px rgba(0,0,0,0.35);
        border:3px solid ${ring};
      ">
        <span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:'FILL' 1;">${glyph}</span>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20], // center the circle on the coordinate
  });
}

const bikeIcon = pinIcon("two_wheeler", "#92001c", "#fff"); // rider — brand red
const homeIcon = pinIcon("home", "#1f6d3a", "#fff"); // customer — green

// Keeps the relevant points in view. With both rider + customer, it fits bounds so
// the whole route is visible (like Zomato). With one, it centers on it. With none,
// it leaves the India overview.
function Fitter({ driver, customer }: { driver: LatLng | null; customer: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [];
    if (driver) pts.push([driver.lat, driver.lng]);
    if (customer) pts.push([customer.lat, customer.lng]);
    if (pts.length === 2) {
      map.fitBounds(pts, { padding: [70, 70], animate: true });
    } else if (pts.length === 1) {
      map.setView(pts[0], TRACK_ZOOM, { animate: true });
    }
  }, [driver?.lat, driver?.lng, customer?.lat, customer?.lng, map]);
  return null;
}

export interface LiveDeliveryMapProps {
  /** Live/last-known rider position. null → no fix yet. */
  driver: LatLng | null;
  /** The customer's own device location. null → not shared / unavailable. */
  customer: LatLng | null;
}

export default function LiveDeliveryMap({ driver, customer }: LiveDeliveryMapProps) {
  const driverPos: [number, number] | null = driver ? [driver.lat, driver.lng] : null;
  const customerPos: [number, number] | null = customer ? [customer.lat, customer.lng] : null;

  return (
    <MapContainer
      center={driverPos ?? customerPos ?? INDIA_CENTER}
      zoom={driverPos || customerPos ? TRACK_ZOOM : INDIA_ZOOM}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* The route line between rider and customer (dashed, brand red). */}
      {driverPos && customerPos && (
        <Polyline
          positions={[driverPos, customerPos]}
          pathOptions={{ color: "#92001c", weight: 4, opacity: 0.8, dashArray: "8 10" }}
        />
      )}

      {driverPos && <Marker position={driverPos} icon={bikeIcon} />}
      {customerPos && <Marker position={customerPos} icon={homeIcon} />}

      <Fitter driver={driver} customer={customer} />
    </MapContainer>
  );
}
