export interface User {
  id: string;
  username: string;
  email: string;
  role: 'citizen' | 'verified_source' | 'admin';
  trustScore: number;
  banned?: boolean;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface TruthEvent {
  _id: string;
  eventName: string;
  location: { type: string; coordinates: [number, number] }; // [lng, lat]
  active: boolean;
  confidenceScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'VERIFIED' | 'DISPUTED' | 'DEBUNKED' | 'RESOLVED' | 'MONITORING';
  reportCount: number;
  conclusion: string;
  lastUpdated: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

export interface ReportFormData {
  title: string;
  description: string;
  lat: string;
  lng: string;
  eventDate: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  image: File | null;
}