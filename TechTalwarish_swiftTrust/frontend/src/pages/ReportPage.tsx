import { useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Upload, MapPin, AlertTriangle, CheckCircle, X, Image } from 'lucide-react';
import { api } from '../utils/api';
import { ReportFormData } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SEV_COLORS: Record<string, string> = {
  LOW:      'border-blue-500 text-blue-400 bg-blue-500/10',
  MEDIUM:   'border-sky-400 text-sky-400 bg-sky-400/10',
  HIGH:     'border-amber-500 text-amber-500 bg-amber-500/10',
  CRITICAL: 'border-red-500 text-red-500 bg-red-500/10',
};

function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function ReportPage() {
  const [form, setForm] = useState<ReportFormData>({
    title: '', description: '', lat: '', lng: '',
    eventDate: new Date().toISOString().split('T')[0],
    severity: 'LOW', image: null,
  });
  const [pinPos, setPinPos]     = useState<[number, number] | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<{ ok: boolean; message: string } | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const set = (k: keyof ReportFormData, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleMapPick = useCallback((lat: number, lng: number) => {
    setPinPos([lat, lng]);
    set('lat', lat.toFixed(6));
    set('lng', lng.toFixed(6));
  }, []);

  const handleImage = (file: File | null) => {
    set('image', file);
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.lat || !form.lng) {
      setResult({ ok: false, message: 'Title and location are required.' });
      return;
    }
    setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('description', form.description);
      fd.append('lat',         form.lat);
      fd.append('lng',         form.lng);
      fd.append('eventDate',   form.eventDate);
      fd.append('severity',    form.severity);
      if (form.image) fd.append('image', form.image);

      await api.post('/reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult({ ok: true, message: 'Report submitted successfully! The Truth Engine is processing it.' });
      setForm({ title: '', description: '', lat: '', lng: '', eventDate: new Date().toISOString().split('T')[0], severity: 'LOW', image: null });
      setPinPos(null); setPreview(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
        || (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Submission failed.';
      setResult({ ok: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-amber-500 rounded-full" />
            <h1 className="text-xl font-bold text-white tracking-tight font-mono uppercase">Submit Incident Report</h1>
          </div>
          <p className="text-slate-400 text-sm ml-3">Your report will be processed by the Universal Truth Engine</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Form */}
          <div className="space-y-4">

            {/* Result banner */}
            {result && (
              <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${result.ok ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                {result.ok
                  ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                <p className={`text-sm ${result.ok ? 'text-green-300' : 'text-red-300'}`}>{result.message}</p>
              </div>
            )}

            {/* Title */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <label className="block text-xs font-mono text-amber-500/70 uppercase tracking-wider mb-2">Incident Title *</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="e.g. Fire at Metro Station"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
              <p className="text-slate-500 text-xs mt-1.5 font-mono">This title will be LOCKED as the Event Name if a new event is created.</p>
            </div>

            {/* Description */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <label className="block text-xs font-mono text-amber-500/70 uppercase tracking-wider mb-2">Description</label>
              <textarea
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="Describe what you observed..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* Severity */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <label className="block text-xs font-mono text-amber-500/70 uppercase tracking-wider mb-3">Severity Assessment</label>
              <div className="grid grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => set('severity', s)}
                    className={`py-2 rounded-lg border text-xs font-bold font-mono transition-all ${form.severity === s ? SEV_COLORS[s] : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-2 font-mono">System severity is calculated independently via weighted average of all reporters.</p>
            </div>

            {/* Date */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <label className="block text-xs font-mono text-amber-500/70 uppercase tracking-wider mb-2">Incident Date</label>
              <input
                type="date"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors"
                value={form.eventDate}
                onChange={e => set('eventDate', e.target.value)}
              />
            </div>

            {/* Image Upload */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <label className="block text-xs font-mono text-amber-500/70 uppercase tracking-wider mb-3">Evidence Image</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files?.[0] ?? null)} />

              {preview ? (
                <div className="relative">
                  <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-lg border border-slate-700" />
                  <button
                    onClick={() => { handleImage(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="absolute top-2 right-2 bg-black/70 rounded-full p-1 text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Image className="w-3.5 h-3.5" />
                    <span>EXIF metadata will be verified · AI vision check will run</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-lg p-8 flex flex-col items-center gap-2 transition-colors group"
                >
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-amber-500 transition-colors" />
                  <span className="text-slate-400 text-sm">Click to upload image</span>
                  <span className="text-slate-600 text-xs font-mono">EXIF GPS · Timestamp · AI Vision verified</span>
                </button>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-bold py-3.5 rounded-xl transition-all text-sm tracking-wider uppercase"
            >
              {loading ? 'Transmitting to Truth Engine...' : '⬡ Transmit Report'}
            </button>
          </div>

          {/* RIGHT: Map */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">Pin Incident Location</span>
            </div>
            <div className="h-80 lg:h-[calc(100%-48px)]">
              <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-full w-full" style={{ background: '#0f172a' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <MapPicker onPick={handleMapPick} />
                {pinPos && <Marker position={pinPos} />}
              </MapContainer>
            </div>
            {pinPos && (
              <div className="px-5 py-2 border-t border-slate-800 bg-slate-900/80">
                <p className="text-xs font-mono text-amber-500">
                  📍 {pinPos[0].toFixed(6)}, {pinPos[1].toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
