import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';

export const BengaluruMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const telemetry = useEnergyStore((s) => s.telemetry);
  const transformers = telemetry.transformers;

  useEffect(() => {
    if (!mapContainer.current) return;

    // Standard dark tile style for MapLibre
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO'
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [77.62, 13.01],
      zoom: 10.8,
      pitch: 35,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers when telemetry changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    transformers.forEach((tx) => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer group';

      const isCritical = tx.health_status === 'critical' || tx.health_status === 'tripped';
      const isWarning = tx.health_status === 'warning';
      const colorHex = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#00F0FF';

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center ${
            isCritical ? 'bg-red-500/20 ring-4 ring-red-500/50 animate-pulse' : 'bg-slate-900/80 ring-2 ring-cyan-500/50'
          }">
            <div class="w-3.5 h-3.5 rounded-full" style="background-color: ${colorHex}"></div>
          </div>
          <div class="absolute -top-7 whitespace-nowrap bg-slate-900/90 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 text-slate-200">
            ${tx.locality} (${tx.load_pct.toFixed(0)}%)
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(tx.coordinates)
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div style="color: #0F172A; font-family: sans-serif; font-size: 12px; padding: 4px;">
              <strong style="color: #0369A1;">${tx.name}</strong><br/>
              <b>Locality:</b> ${tx.locality}<br/>
              <b>Load:</b> ${tx.load_pct.toFixed(1)}%<br/>
              <b>Oil Temp:</b> ${tx.oil_temp_c.toFixed(1)}°C<br/>
              <b>Voltage:</b> ${tx.voltage_v.toFixed(1)}V<br/>
              <b>Status:</b> ${tx.health_status.toUpperCase()}
            </div>
          `)
        )
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [transformers]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating GIS Legend Card */}
      <div className="absolute top-4 left-4 backdrop-blur-md bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 shadow-xl z-10 text-xs">
        <h4 className="font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          BESCOM GIS Grid Assets — Bengaluru
        </h4>
        <div className="space-y-1 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Normal Operating Substation (11kV / 66kV)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Elevated Load / Thermal Advisory</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Critical Overload / Tripped Feeder</span>
          </div>
        </div>
      </div>
    </div>
  );
};
