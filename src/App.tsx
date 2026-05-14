/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map as MapIcon, 
  Calculator, 
  Calendar, 
  User, 
  Zap, 
  Search, 
  Clock,
  Battery,
  ShieldCheck,
  ToggleLeft as Toggle,
  ToggleRight as ToggleActive,
  MapPin,
  Plus
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { auth, db, signInWithGoogle } from './lib/firebase';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app we might show a toast here
}

// --- Types ---
interface ChargingPoint {
  id: string;
  name: string;
  type: '5A' | '15A';
  pricePerHour: number;
  isBusy: boolean;
  lat: number;
  lng: number;
  ownerId: string;
  distance?: string;
  rating?: number;
  address?: string;
}

const transitionSmooth = { duration: 0.5, ease: [0.16, 1, 0.3, 1] };

// --- Components ---

function MapView({ points, onPointSelect }: { points: ChargingPoint[], onPointSelect: (p: ChargingPoint) => void }) {
  const MapEvents = () => {
    const map = useMap();
    useEffect(() => {
      // Force a resize after a short delay to account for the entrance transition
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 550);
      return () => clearTimeout(timer);
    }, [map]);
    return null;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0f14]">
      <MapContainer 
        center={[12.9716, 77.5946]} 
        zoom={14} 
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#0a0f14' }}
        zoomControl={false}
      >
        <MapEvents />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        {points.map(p => (
          <Marker 
            key={p.id} 
            position={[p.lat, p.lng]}
            eventHandlers={{
              click: () => onPointSelect(p)
            }}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="marker-container ${p.isBusy ? 'busy' : 'available'}">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="zap-icon"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    </div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            })}
          />
        ))}
      </MapContainer>
      
      <div className="absolute top-6 left-6 right-6 z-[1100]">
        <div className="glass-card !p-3 !rounded-[24px] flex items-center gap-4 bg-dark-surface/40 backdrop-blur-md border-white/10 shadow-2xl">
          <Search className="w-4 h-4 text-electric-blue/70" />
          <input 
            type="text" 
            placeholder="Find a hub..." 
            className="bg-transparent border-none outline-none text-[10px] w-full font-bold tracking-tight placeholder:text-white/20"
          />
        </div>
      </div>
    </div>
  );
}

function CalculatorView() {
  const [batterySize, setBatterySize] = useState(2.5); // kWh
  const [chargeTime, setChargeTime] = useState(45); // minutes
  const [result, setResult] = useState(0);
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    // 3kW charging speed (approx for 15A)
    const powerKW = 3;
    const energyAdded = powerKW * (chargeTime / 60); // Energy in kWh
    
    // Efficiency: ~35km per 1kWh (common for city 2W)
    const possibleRangeGain = Math.round(energyAdded * 35);
    setResult(possibleRangeGain);

    // Calculate fill percentage based on battery size
    // How much of the total battery did we fill?
    const fillPercent = (energyAdded / batterySize) * 100;
    setPercentage(Math.min(100, Math.round(fillPercent)));
  }, [batterySize, chargeTime]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitionSmooth}
      className="space-y-8 py-4"
    >
      <div className="space-y-2">
        <h2 className="text-4xl font-black tracking-tight leading-[0.85]">Energy <br /><span className="text-charge-green italic">Simulator.</span></h2>
        <p className="text-white/40 text-xs font-medium">Real-time range estimation for rural hubs.</p>
      </div>

      <div className="glass-card !p-6 space-y-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-charge-green/5 rounded-full blur-2xl" />
        
        <div className="space-y-5">
          <div className="flex justify-between items-end">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-electric-blue">Battery Capacity</label>
            <span className="text-lg font-mono font-bold">{batterySize} <span className="text-[10px] text-white/30 uppercase">kWh</span></span>
          </div>
          <input 
            type="range" min="1" max="5" step="0.5" 
            value={batterySize} onChange={(e) => setBatterySize(Number(e.target.value))}
            className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-electric-blue"
          />
        </div>

        <div className="space-y-5">
          <div className="flex justify-between items-end">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-charge-green">Session Time</label>
            <span className="text-lg font-mono font-bold">{chargeTime} <span className="text-[10px] text-white/30 uppercase">Min</span></span>
          </div>
          <input 
            type="range" min="15" max="150" step="15" 
            value={chargeTime} onChange={(e) => setChargeTime(Number(e.target.value))}
            className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-charge-green"
          />
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-8">
           <div className="relative w-20 h-40 border-[6px] border-white/5 rounded-[20px] p-2 overflow-hidden flex items-end">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-4 bg-white/5 rounded-t-lg" />
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${percentage}%` }}
                className="w-full bg-gradient-to-t from-charge-green/80 to-emerald-400 rounded-lg shadow-[0_0_20px_rgba(0,255,133,0.3)]"
                transition={{ type: 'spring', damping: 15, stiffness: 60 }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
                <Zap className={`w-6 h-6 ${percentage > 50 ? 'text-black/40' : 'text-white/20'}`} />
                <span className={`text-[9px] font-black font-mono ${percentage > 50 ? 'text-black/40' : 'text-white/20'}`}>{percentage}%</span>
              </div>
           </div>
           
           <div className="text-center space-y-1">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Total Est. Gain</span>
              <div className="text-6xl font-black text-charge-green font-mono leading-none tracking-tighter">
                +{result}<span className="text-xl font-bold ml-1 text-white/50 uppercase italic tracking-normal">km</span>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function HostDashboard({ userPoints }: { userPoints: ChargingPoint[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPoint, setNewPoint] = useState({ name: '', type: '15A' as '15A' | '5A', price: 20 });

  const toggleAvailability = async (pointId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'charging_points', pointId), {
        isBusy: !currentStatus,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `charging_points/${pointId}`);
    }
  };

  const handleAddPoint = async () => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'charging_points'), {
        name: newPoint.name,
        type: newPoint.type,
        pricePerHour: newPoint.price,
        isBusy: false,
        lat: 12.9716 + (Math.random() - 0.5) * 0.05,
        lng: 77.5946 + (Math.random() - 0.5) * 0.05,
        ownerId: auth.currentUser.uid,
        distance: (Math.random() * 2 + 0.1).toFixed(1) + 'km',
        updatedAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewPoint({ name: '', type: '15A', price: 20 });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'charging_points');
    }
  };

  const seedDemoData = async () => {
    if (!auth.currentUser) return;
    const demoPoints = [
      { name: 'Kripa Flour Mill', type: '15A', price: 25, lat: 12.9716 + 0.01, lng: 77.5946 + 0.01 },
      { name: 'Reddy Agro Store', type: '5A', price: 15, lat: 12.9716 - 0.01, lng: 77.5946 + 0.015 },
      { name: 'Gram Panchayat Hub', type: '15A', price: 10, lat: 12.9716 + 0.02, lng: 77.5946 - 0.005 },
    ];

    for (const p of demoPoints) {
      await addDoc(collection(db, 'charging_points'), {
        ...p,
        isBusy: false,
        ownerId: 'system-demo',
        distance: (Math.random() * 2 + 0.1).toFixed(1) + 'km',
        updatedAt: serverTimestamp()
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitionSmooth}
      className="space-y-10 py-4"
    >
      <div className="space-y-3">
        <h2 className="text-5xl font-black tracking-tight leading-[0.85]">Merchant <br /><span className="text-electric-blue italic">Terminal.</span></h2>
        <p className="text-white/40 text-sm font-medium">Earn by sharing your local power grid.</p>
      </div>

      {isAdding ? (
        <div className="glass-card space-y-8 animate-in zoom-in-95 duration-500">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Business Entry</label>
            <input 
              type="text" 
              value={newPoint.name}
              onChange={(e) => setNewPoint({...newPoint, name: e.target.value})}
              placeholder="e.g. Kripa Rural Mart"
              className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-electric-blue transition-colors font-bold tracking-tight"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Tech Spec</label>
              <select 
                value={newPoint.type}
                onChange={(e) => setNewPoint({...newPoint, type: e.target.value as '15A' | '5A'})}
                className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none font-bold tracking-tight appearance-none"
              >
                <option value="15A">15A AC</option>
                <option value="5A">5A AC</option>
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Price (₹/hr)</label>
              <input 
                type="number" 
                value={newPoint.price}
                onChange={(e) => setNewPoint({...newPoint, price: Number(e.target.value)})}
                className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none font-mono font-bold"
              />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button onClick={() => setIsAdding(false)} className="flex-1 btn-secondary">Discard</button>
            <button onClick={handleAddPoint} className="flex-1 btn-primary">Go Live</button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {userPoints.length === 0 ? (
            <div className="glass-card text-center p-16 space-y-8 flex flex-col items-center">
              <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center border border-white/10 opacity-40">
                <Plus className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <p className="text-white font-bold text-lg tracking-tight">Empty Grid</p>
                <p className="text-white/30 text-xs max-w-[200px] leading-relaxed">Start earning today by listing your heavy-duty power sockets.</p>
              </div>
              <button 
                onClick={() => {
                  if (!auth.currentUser) signInWithGoogle();
                  else setIsAdding(true);
                }}
                className="btn-primary w-full"
              >
                Launch Shop
              </button>
              
              <button 
                onClick={seedDemoData}
                className="text-[9px] font-black uppercase tracking-widest text-white/20 underline underline-offset-4"
              >
                Seed Demo Points
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {userPoints.map(p => (
                <div key={p.id} className="glass-card !p-6 space-y-6">
                   <div className="flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/5">
                    <div className="flex items-center gap-5">
                      <div className={`w-3.5 h-3.5 rounded-full shadow-2xl transition-colors duration-500 ${!p.isBusy ? 'bg-charge-green shadow-charge-green/40' : 'bg-rose-500 shadow-rose-500/40'}`} />
                      <span className="font-black uppercase tracking-widest text-[11px]">{!p.isBusy ? 'Ready to Charge' : 'Busy Charging'}</span>
                    </div>
                    <button 
                      onClick={() => toggleAvailability(p.id, p.isBusy)}
                      className="text-electric-blue active:scale-90 transition-transform"
                    >
                      {!p.isBusy ? <ToggleActive className="w-11 h-11" /> : <Toggle className="w-11 h-11 opacity-30" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] px-2 text-white/40">
                    <span>{p.name} • {p.type} Socket</span>
                    <span className="font-mono text-charge-green text-xs">₹{p.pricePerHour.toFixed(2)}/hr</span>
                  </div>
                </div>
              ))}
              <button onClick={() => setIsAdding(true)} className="w-full btn-secondary flex items-center justify-center gap-3">
                <Plus className="w-5 h-5" /> Expand Network
              </button>
            </div>
          )}

          <div className="glass-card !p-8 flex flex-col gap-6">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Monthly Earnings</span>
              <span className="text-3xl font-black text-charge-green tracking-tighter">₹0.00</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
               <div className="w-1/3 h-full bg-electric-blue/40" />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'calc' | 'host' | 'user'>('map');
  const [selectedPoint, setSelectedPoint] = useState<ChargingPoint | null>(null);
  const [points, setPoints] = useState<ChargingPoint[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const unsubPoints = onSnapshot(collection(db, 'charging_points'), (snapshot) => {
      const pData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Simulate distance if not present
        const distance = data.distance || (Math.random() * 2 + 0.1).toFixed(1) + 'km';
        return { id: doc.id, ...data, distance } as ChargingPoint;
      });
      setPoints(pData);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'charging_points'));

    return () => {
      unsubAuth();
      unsubPoints();
    };
  }, []);

  const handleBooking = async () => {
    if (!user || !selectedPoint || selectedPoint.isBusy) return;
    
    setIsBooking(true);
    try {
      const bookingData = {
        pointId: selectedPoint.id,
        userId: user.uid,
        pointName: selectedPoint.name,
        startTime: serverTimestamp(),
        durationMinutes: 60,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      
      await updateDoc(doc(db, 'charging_points', selectedPoint.id), {
        isBusy: true,
        updatedAt: serverTimestamp()
      });

      setSelectedPoint(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'bookings');
    } finally {
      setIsBooking(false);
    }
  };

  const userPoints = points.filter(p => p.ownerId === user?.uid);

  return (
    <div className="max-w-md mx-auto h-screen h-[100dvh] bg-dark-surface shadow-2xl relative flex flex-col overflow-hidden text-white selection:bg-electric-blue selection:text-black">
      
      <header className="px-8 pt-10 pb-6 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-blue-600 rounded-[20px] flex items-center justify-center shadow-[0_4px_20px_rgba(0,209,255,0.4)]">
            <Zap className="w-6 h-6 text-black" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight uppercase leading-none">EV-Grama</h1>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30 italic">Rural Energy Hub</span>
          </div>
        </div>
        {!user ? (
           <button 
            onClick={signInWithGoogle}
            className="px-5 py-2.5 bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-colors"
          >
            Connect
          </button>
        ) : (
          <button className="w-12 h-12 bg-white/5 rounded-[20px] flex items-center justify-center border border-white/10 overflow-hidden ring-2 ring-electric-blue/20">
            <img src={user.photoURL || ''} alt="User" className="w-full h-full object-cover" />
          </button>
        )}
      </header>

      <main className={`flex-1 relative overflow-hidden ${activeTab !== 'map' ? 'overflow-y-auto scrollbar-hide overscroll-contain pb-40 px-8' : ''}`}>
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitionSmooth}
              className="absolute inset-0 z-0 p-4"
            >
              <div className="w-full h-full rounded-[40px] overflow-hidden border border-white/5 active:cursor-grabbing">
                <MapView points={points} onPointSelect={setSelectedPoint} />
              </div>
            </motion.div>
          )}

          {activeTab === 'calc' && (
            <motion.div 
              key="calc"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={transitionSmooth}
              className="pt-4"
            >
              <CalculatorView />
            </motion.div>
          )}

          {activeTab === 'host' && (
            <motion.div 
              key="host"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={transitionSmooth}
              className="pt-4"
            >
              <HostDashboard userPoints={userPoints} />
            </motion.div>
          )}

          {activeTab === 'user' && (
            <motion.div 
              key="user"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={transitionSmooth}
              className="pt-4"
            >
              <div className="space-y-12">
                <div className="space-y-3">
                  <h2 className="text-5xl font-black tracking-tight leading-[0.85]">User <br /><span className="text-white italic">Profile.</span></h2>
                  <p className="text-white/40 text-sm font-medium">Tracking your sustainable journey.</p>
                </div>

                <div className="glass-card flex items-center justify-between p-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center border border-white/5">
                      <Battery className="w-8 h-8 text-charge-green" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Wallet Balance</div>
                      <div className="text-4xl font-black tracking-tighter">₹450.00</div>
                    </div>
                  </div>
                  <button className="w-12 h-12 bg-electric-blue text-black rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 px-2">History</h3>
                   <div className="space-y-4">
                      {[1, 2].map((i) => (
                         <div key={i} className="p-5 bg-white/5 rounded-[24px] border border-white/5 flex items-center justify-between opacity-50 text-white">
                          <div className="flex items-center gap-4">
                            <Clock className="w-4 h-4 text-white/30" />
                            <span className="text-xs font-bold uppercase tracking-widest tracking-tighter">Recent Session {i}</span>
                          </div>
                          <span className="text-xs font-mono font-bold tracking-tighter text-rose-500/70">-₹20.00</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedPoint && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPoint(null)}
              className="absolute inset-0 bg-dark-surface/80 backdrop-blur-sm z-[50]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 right-0 bottom-0 bg-[#0A0F14] rounded-t-[50px] border-t border-white/10 z-[60] p-10 pt-6 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
            >
              <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />
              <div className="space-y-10">
                <div className="flex items-start justify-between">
                  <div className="space-y-5">
                    <div className={`status-badge w-fit ${selectedPoint.isBusy ? 'status-busy' : 'status-available'}`}>
                      {selectedPoint.isBusy ? 'In Service' : 'Spot Ready'}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-4xl font-black tracking-tight leading-none uppercase">{selectedPoint.name}</h3>
                      <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">{selectedPoint.address || 'Village Sector A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-charge-green font-mono leading-none tracking-tighter">₹{selectedPoint.pricePerHour}</div>
                    <div className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-2 italic">Per Session Unit</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] space-y-4">
                    <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Grid Rating</div>
                    <div className="flex items-end gap-2">
                       <span className="text-2xl font-black font-mono">4.9</span>
                       <Zap className="w-5 h-5 text-charge-green mb-1.5" />
                    </div>
                  </div>
                  <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] space-y-4">
                    <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Connector</div>
                    <div className="flex items-end gap-2">
                       <span className="text-2xl font-black font-mono tracking-tighter">{selectedPoint.type}</span>
                       <span className="text-white/20 text-[10px] font-bold uppercase mb-1.5">AC</span>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={selectedPoint.isBusy || !user || isBooking}
                  onClick={handleBooking}
                  className="w-full btn-primary h-20 flex items-center justify-center gap-4 py-4 disabled:opacity-20 disabled:hover:scale-100 ring-4 ring-electric-blue/5"
                >
                  {isBooking ? (
                    <Clock className="w-6 h-6 animate-spin" />
                  ) : (
                    <Calendar className="w-6 h-6" />
                  )}
                  <span className="text-sm font-black uppercase tracking-[0.2em]">
                    {!user ? 'Auth Required' : (selectedPoint.isBusy ? 'Occupied' : 'Initiate Session')}
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 pointer-events-none"
          >
            <div className="bg-dark-surface border border-charge-green/50 p-10 rounded-[48px] shadow-[0_0_100px_rgba(0,255,133,0.3)] flex flex-col items-center gap-6 text-center">
              <div className="w-20 h-20 bg-charge-green rounded-[32px] flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-black" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight uppercase">Booking Locked</h3>
                <p className="text-white/40 text-xs font-medium uppercase tracking-widest leading-relaxed">Head to the hub now • Spot is reserved.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-4rem)] max-w-[calc(28rem-4rem)] h-24 nav-blur flex items-center justify-around px-4 z-[100]">
        {[
          { id: 'map', icon: MapIcon, color: '#00D1FF', label: 'Map' },
          { id: 'calc', icon: Calculator, color: '#00FF85', label: 'Simo' },
          { id: 'host', icon: Zap, color: '#FFFFFF', label: 'Grid' },
          { id: 'user', icon: User, color: '#FFFFFF', label: 'Me' }
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className="relative group p-4 flex flex-col items-center justify-center gap-1 transition-all active:scale-90"
          >
            <item.icon className={`w-6 h-6 transition-all duration-500 relative z-10 ${activeTab === item.id ? 'scale-110' : 'text-white/30 hover:text-white/60'}`} 
              style={{ color: activeTab === item.id ? item.color : undefined }} 
            />
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] relative z-10 transition-colors duration-500 ${activeTab === item.id ? 'text-white opacity-100' : 'text-white/20 opacity-0 group-hover:opacity-100'}`}>
              {item.label}
            </span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="nav-pill"
                className="absolute inset-x-2 inset-y-2 bg-white/5 rounded-2xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
          </button>
        ))}
      </nav>

    </div>
  );
}

