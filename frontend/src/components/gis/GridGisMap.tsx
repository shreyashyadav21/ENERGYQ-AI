import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  MapPin,
  Box,
  Activity,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';
import { TransformerHealth } from '../../types/energy';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';
const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY || '';

export const GridGisMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const telemetry = useEnergyStore((s) => s.telemetry);
  const transformers = telemetry.transformers;
  const setBescomViewMode = useEnergyStore((s) => s.setBescomViewMode);
  const selectedTxId = useEnergyStore((s) => s.selectedTransformerId);
  const setSelectedTxId = useEnergyStore((s) => s.setSelectedTransformerId);
  const flyToAsset = useEnergyStore((s) => s.flyToAsset);

  const [activeTxData, setActiveTxData] = useState<TransformerHealth | null>(null);
  const [geoJsonAssets, setGeoJsonAssets] = useState<any>(null);

  // 3D coordinates map for camera fly-through
  const tx3DCoords: Record<string, [number, number, number]> = {
    tx_indiranagar: [-9, 0, 6],
    tx_koramangala: [9, 0, 6],
    tx_yelahanka: [0, 0, -10],
    tx_whitefield: [11, 0, -7],
    tx_jayanagar: [-8, 0, -5],
    tx_hebbal: [-4, 0, -12],
  };

  // Fetch Live GeoJSON API on mount
  useEffect(() => {
    const fetchGis = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/gis/assets');
        if (res.ok) {
          const data = await res.json();
          setGeoJsonAssets(data);
        }
      } catch (err) {
        console.warn('GIS API load error, using local coordinates:', err);
      }
    };
    fetchGis();
  }, []);

  // Initialize MapLibre GL JS with Vector / Carto Dark Matter Fallback
  useEffect(() => {
    if (!mapContainer.current) return;

    const styleUrl =
      MAPTILER_KEY && MAPTILER_KEY.length > 5
        ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
        : {
            version: 8 as const,
            sources: {
              'osm-tiles': {
                type: 'raster' as const,
                tiles: [
                  CARTO_KEY
                    ? `https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?api_key=${CARTO_KEY}`
                    : 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
                ],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors, © CARTO',
              },
            },
            layers: [
              {
                id: 'osm-tiles-layer',
                type: 'raster' as const,
                source: 'osm-tiles',
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          };

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl as any,
      center: [77.625, 13.01],
      zoom: 11.2,
      pitch: 38,
      bearing: -10,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      // Add live GeoJSON feeder lines source
      if (!map.getSource('feeder-lines-source')) {
        map.addSource('feeder-lines-source', {
          type: 'geojson',
          data: geoJsonAssets || { type: 'FeatureCollection', features: [] },
        });

        // Feeder line outer glow layer
        map.addLayer({
          id: 'feeder-lines-glow',
          type: 'line',
          source: 'feeder-lines-source',
          filter: ['==', ['geometry-type'], 'LineString'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['get', 'status_color'],
            'line-width': 8,
            'line-opacity': 0.35,
            'line-blur': 3,
          },
        });

        // Feeder line core conductor
        map.addLayer({
          id: 'feeder-lines-core',
          type: 'line',
          source: 'feeder-lines-source',
          filter: ['==', ['geometry-type'], 'LineString'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['get', 'status_color'],
            'line-width': 3.5,
            'line-opacity': 0.9,
          },
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync GeoJSON lines data when GIS API responds
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && geoJsonAssets) {
      const src = map.getSource('feeder-lines-source') as maplibregl.GeoJSONSource;
      if (src) {
        src.setData(geoJsonAssets);
      }
    }
  }, [geoJsonAssets]);

  // Update Map Markers synchronized to live multi-sensor transformer stream
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    transformers.forEach((tx) => {
      const isCritical = tx.health_status === 'critical' || tx.health_status === 'tripped';
      const isWarning = tx.health_status === 'warning';
      const isMaintenance = tx.health_status === 'maintenance';
      const colorHex = isCritical
        ? '#EF4444'
        : isWarning
        ? '#F59E0B'
        : isMaintenance
        ? '#38BDF8'
        : '#10B981';

      const el = document.createElement('div');
      el.className = 'cursor-pointer group select-none';

      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          ${
            isCritical
              ? `<div class="absolute -inset-2 rounded-full bg-red-500/30 animate-ping"></div>`
              : isWarning
              ? `<div class="absolute -inset-1.5 rounded-full bg-amber-500/20 animate-pulse"></div>`
              : ''
          }
          <div class="relative w-8 h-8 rounded-full flex items-center justify-center bg-slate-950/90 border-2 transition-transform transform group-hover:scale-125" style="border-color: ${colorHex}">
            <div class="w-3.5 h-3.5 rounded-full" style="background-color: ${colorHex}; box-shadow: 0 0 10px ${colorHex}"></div>
          </div>
          <div class="mt-1 whitespace-nowrap bg-slate-950/90 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-700/80 text-white shadow-lg flex items-center gap-1">
            <span>${tx.locality}</span>
            <span style="color: ${colorHex}">(${tx.load_pct.toFixed(0)}%)</span>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedTxId(tx.id);
        setActiveTxData(tx);
        map.easeTo({ center: tx.coordinates, zoom: 12.8, duration: 1000 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(tx.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Update active telemetry card if selected
    if (selectedTxId) {
      const cur = transformers.find((t) => t.id === selectedTxId);
      if (cur) setActiveTxData(cur);
    }
  }, [transformers, selectedTxId]);

  // Inspect in 3D Digital Twin action
  const handleInspectIn3D = (tx: TransformerHealth) => {
    setSelectedTxId(tx.id);
    const coords = tx3DCoords[tx.id] || [0, 0, 0];
    flyToAsset(coords);
    setBescomViewMode('3d');
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Left GIS SCADA Legend Card */}
      <div className="absolute top-4 left-4 z-10 backdrop-blur-md bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 shadow-2xl text-xs max-w-xs">
        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span>BESCOM GIS Geographic Grid Layer</span>
        </h4>
        <p className="text-[11px] text-slate-400 mb-3">
          Live Bengaluru feeder lines & distribution transformers synchronized to 1s telemetry stream.
        </p>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span className="text-slate-300">Healthy Operation (&gt;80% Health)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            <span className="text-slate-300">Thermal / Peak Warning (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50 animate-pulse"></span>
            <span className="text-slate-300">Critical Fault / Thermal Runaway</span>
          </div>
        </div>
      </div>

      {/* Bottom Floating Telemetry Inspector & "Inspect in 3D Digital Twin" Card */}
      {activeTxData && (
        <div className="absolute bottom-6 right-6 z-20 w-84 backdrop-blur-xl bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between pb-2 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      activeTxData.health_status === 'critical'
                        ? '#EF4444'
                        : activeTxData.health_status === 'warning'
                        ? '#F59E0B'
                        : '#10B981',
                  }}
                />
                <h3 className="font-bold text-sm text-white">{activeTxData.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {activeTxData.locality} • Feeder: {activeTxData.feeder_id}
              </p>
            </div>
            <button
              onClick={() => setActiveTxData(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>

          {/* 4 Primary Sensor Gauges */}
          <div className="grid grid-cols-2 gap-2 my-3 text-xs">
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Voltage</span>
              <span className="font-mono font-bold text-cyan-300">
                {activeTxData.voltage_v.toFixed(1)} V
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Active Load</span>
              <span
                className={`font-mono font-bold ${
                  activeTxData.load_pct > 85 ? 'text-red-400' : 'text-slate-200'
                }`}
              >
                {activeTxData.load_pct.toFixed(1)}% ({activeTxData.active_power_kva.toFixed(0)} kVA)
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Oil Temperature</span>
              <span
                className={`font-mono font-bold ${
                  activeTxData.oil_temp_c > 75 ? 'text-red-400' : 'text-amber-300'
                }`}
              >
                {activeTxData.oil_temp_c.toFixed(1)}°C
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Health Index</span>
              <span
                className={`font-mono font-extrabold ${
                  (activeTxData.health_score || 95) < 50
                    ? 'text-red-400'
                    : (activeTxData.health_score || 95) < 80
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {(activeTxData.health_score || 95).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="space-y-2 mt-2">
            {/* Real-time Map-to-3D Cinematic Fly-Through Button */}
            <button
              onClick={() => handleInspectIn3D(activeTxData)}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
            >
              <Box className="w-4 h-4" />
              <span>Inspect in 3D Digital Twin</span>
              <ArrowUpRight className="w-4 h-4 ml-auto" />
            </button>

            {/* Crew dispatch or resolution */}
            {!activeTxData.maintenance_dispatched ? (
              <button
                onClick={() => energyWs.assignCrew(activeTxData.id)}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center justify-center gap-1.5"
              >
                Dispatch Emergency Maintenance Crew
              </button>
            ) : (
              <button
                onClick={() => energyWs.markResolved(activeTxData.id)}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5"
              >
                Mark Outage Resolved
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
