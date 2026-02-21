import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { api, getSocket } from '../utils/api';
import { TruthEvent } from '../types';
import 'leaflet/dist/leaflet.css';

const SEV_COLOR: Record<string, string> = {
  LOW: '#4d9fff', MEDIUM: '#f5c842', HIGH: '#f0a500', CRITICAL: '#e03030',
};
const STATUS_COLOR: Record<string, string> = {
  VERIFIED: '#00c97a', DISPUTED: '#e03030', MONITORING: '#f0a500', RESOLVED: '#666', DEBUNKED: '#888',
};

export default function MapPage() {
  const [events, setEvents] = useState<TruthEvent[]>([]);
  const [selected, setSelected] = useState<TruthEvent | null>(null);

  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data)).catch(console.error);

    const socket = getSocket();
    socket.emit('join_public');
    socket.on('event_update', (updated: TruthEvent) => {
      setEvents(prev => {
        const idx = prev.findIndex(e => e._id === updated._id);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy; }
        return [updated, ...prev];
      });
    });
    return () => { socket.off('event_update'); };
  }, []);

  return (
    <div className="h-[calc(100vh-56px)] flex">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-full w-full">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO'
          />
          {events.map(ev => (
            <CircleMarker
              key={ev._id}
              center={[ev.location.coordinates[1], ev.location.coordinates[0]]}
              radius={10 + ev.confidenceScore / 10}
              pathOptions={{ color: SEV_COLOR[ev.severity], fillColor: SEV_COLOR[ev.severity], fillOpacity: 0.5 }}
              eventHandlers={{ click: () => setSelected(ev) }}
            >
              <Popup>
                <div className="font-mono text-xs">
                  <div className="font-bold">{ev.eventName}</div>
                  <div>Confidence: {ev.confidenceScore.toFixed(1)}%</div>
                  <div>Severity: {ev.severity}</div>
                  <div>Status: {ev.status}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 z-[1000]">
          <p className="text-xs font-mono text-slate-400 uppercase mb-2">Severity</p>
          {Object.entries(SEV_COLOR).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ background: v }} />
              <span className="text-xs font-mono text-slate-300">{k}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event panel */}
      <div className="w-80 bg-slate-950 border-l border-slate-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-amber-500 rounded-full" />
            <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">Active Events ({events.length})</span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-600">
            <span className="text-3xl mb-2">⬡</span>
            <p className="text-xs font-mono">No active events</p>
          </div>
        ) : (
          events.map(ev => (
            <div
              key={ev._id}
              onClick={() => setSelected(ev)}
              className={`border-b border-slate-800 p-4 cursor-pointer transition-colors ${selected?._id === ev._id ? 'bg-slate-800' : 'hover:bg-slate-900'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-white leading-tight">{ev.eventName}</p>
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 font-bold`}
                  style={{ background: SEV_COLOR[ev.severity] + '22', color: SEV_COLOR[ev.severity], border: `1px solid ${SEV_COLOR[ev.severity]}44` }}>
                  {ev.severity}
                </span>
              </div>

              {/* Confidence bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-500">Confidence</span>
                  <span className="text-white">{ev.confidenceScore.toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ev.confidenceScore}%`, background: SEV_COLOR[ev.severity] }} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: STATUS_COLOR[ev.status] }}>● {ev.status}</span>
                <span className="text-xs font-mono text-slate-500">{ev.reportCount} report{ev.reportCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
