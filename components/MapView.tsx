"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ALBANIA_CENTER, circlePolygon } from "@/lib/geo";
import { useI18n } from "@/lib/i18n/context";
import type { FireGroup, FireReport, SavedLocation } from "@/lib/types";

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

function frpColor(frp: number) {
  if (frp > 100) return "#b91c1c";
  if (frp > 30) return "#ea580c";
  return "#d97706";
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface MapViewProps {
  groups: FireGroup[];
  locations: SavedLocation[];
  reports: FireReport[];
  reportMode?: boolean;
  onMapClick?: (lat: number, lon: number) => void;
}

export default function MapView({ groups, locations, reports, reportMode, onMapClick }: MapViewProps) {
  const { t, lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fireMarkersRef = useRef<Marker[]>([]);
  const locationMarkersRef = useRef<Marker[]>([]);
  const reportMarkersRef = useRef<Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [ALBANIA_CENTER.lon, ALBANIA_CENTER.lat],
      zoom: 7,
    });
    map.addControl(new NavigationControl(), "top-right");
    map.on("click", (e: MapMouseEvent) => onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = reportMode ? "crosshair" : "";
  }, [reportMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    fireMarkersRef.current.forEach((m) => m.remove());
    fireMarkersRef.current = groups.map((g) => {
      const el = document.createElement("div");
      const size = 14 + Math.min(20, g.count * 3);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = "50%";
      el.style.background = frpColor(g.maxFrp);
      el.style.border = "3px solid #ffffff";
      el.style.boxShadow = `0 0 0 2px rgba(0,0,0,0.55), 0 0 10px 3px ${frpColor(g.maxFrp)}99`;

      const popup = new Popup({ offset: 10 }).setHTML(
        `<strong>${t("map.popup.detections", { count: g.count })}</strong><br/>` +
          `${t("map.popup.lastSeen", { date: new Date(g.lastDetected).toLocaleString() })}<br/>` +
          `${t("map.popup.maxFrp", { frp: g.maxFrp.toFixed(1) })}<br/>` +
          `${t("map.popup.satellites", { list: g.satellites.join(", ") })}`
      );

      return new Marker({ element: el })
        .setLngLat([g.centerLon, g.centerLat])
        .setPopup(popup)
        .addTo(map);
    });
  }, [groups, lang, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    locationMarkersRef.current.forEach((m) => m.remove());
    locationMarkersRef.current = locations.map((loc) => {
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "3px";
      el.style.background = "#2563eb";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
      const popup = new Popup({ offset: 10 }).setText(loc.name);
      return new Marker({ element: el })
        .setLngLat([loc.lon, loc.lat])
        .setPopup(popup)
        .addTo(map);
    });

    const applyCircles = () => {
      const source = map.getSource("alert-radii") as GeoJSONSource | undefined;
      const data: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: locations.map((loc) => ({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [circlePolygon(loc.lat, loc.lon, loc.alertRadiusKm)],
          },
        })),
      };
      if (source) {
        source.setData(data);
      } else {
        map.addSource("alert-radii", { type: "geojson", data });
        map.addLayer({
          id: "alert-radii-fill",
          type: "fill",
          source: "alert-radii",
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "alert-radii-line",
          type: "line",
          source: "alert-radii",
          paint: { "line-color": "#2563eb", "line-width": 1.5 },
        });
      }
    };

    if (map.isStyleLoaded()) applyCircles();
    else map.once("load", applyCircles);
  }, [locations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    reportMarkersRef.current.forEach((m) => m.remove());
    reportMarkersRef.current = reports.map((r) => {
      const el = document.createElement("div");
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50%";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "11px";
      el.style.fontWeight = "700";
      el.style.color = "#ffffff";
      el.style.background = r.verified ? "#16a34a" : "#7c3aed";
      el.style.border = "2px solid #ffffff";
      el.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.5)";
      el.textContent = r.verified ? "✓" : "!";

      const statusLine = r.verified ? t("reports.popup.verified") : t("reports.popup.unverified");
      const popup = new Popup({ offset: 10 }).setHTML(
        `<strong>${t("reports.popup.title")}</strong><br/>` +
          `${statusLine}<br/>` +
          `${t("reports.reportedAt", { date: new Date(r.createdAt).toLocaleString() })}` +
          (r.note ? `<br/>“${escapeHtml(r.note)}”` : "")
      );

      return new Marker({ element: el })
        .setLngLat([r.lon, r.lat])
        .setPopup(popup)
        .addTo(map);
    });
  }, [reports, lang, t]);

  return <div ref={containerRef} className="h-full w-full" />;
}
