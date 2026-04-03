'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { motion } from 'motion/react';
import { 
  Users, 
  Trophy, 
  Settings, 
  Check, 
  X, 
  Plus, 
  Play, 
  Save, 
  ArrowLeft,
  LayoutGrid,
  ListChecks,
  History,
  ChevronRight,
  Globe,
  Lock,
  Share2
} from 'lucide-react';

interface EventManagementClientProps {
  initialEvent: any;
  initialRegistrations: any[];
  initialTeams: any[];
  initialZones: any[];
  initialMatches: any[];
}

// Helper to convert Firestore Timestamps to plain ISO strings
const sanitizeData = (val: any): any => {
  if (val === null || val === undefined) return val;
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  if (Array.isArray(val)) return val.map(sanitizeData);
  if (typeof val === 'object' && (val.constructor.name === 'Object' || Object.getPrototypeOf(val) === Object.prototype)) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(val)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  return val;
};

export function EventManagementClient({
  initialEvent,
  initialRegistrations,
  initialTeams,
  initialZones,
  initialMatches
}: EventManagementClientProps) {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<any>(initialEvent);
  const [registrations, setRegistrations] = useState<any[]>(initialRegistrations);
  const [teams, setTeams] = useState<any[]>(initialTeams);
  const [zones, setZones] = useState<any[]>(initialZones);
  const [matches, setMatches] = useState<any[]>(initialMatches);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'registrations' | 'teams' | 'zones' | 'matches' | 'settings'>(
    (searchParams.get('tab') as any) || 'registrations'
  );
  const [categories, setCategories] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAuxData = async () => {
      const catSnap = await getDocs(collection(db, 'categories'));
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const clubSnap = await getDocs(collection(db, 'clubs'));
      setClubs(clubSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchAuxData();
  }, []);

  useEffect(() => {
    let unsubscribeEvent: () => void = () => {};
    let unsubscribeReg: () => void = () => {};
    let unsubscribeTeams: () => void = () => {};
    let unsubscribeZones: () => void = () => {};
    let unsubscribeMatches: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin/login');
      } else {
        setLoading(false);

        const eventId = id as string;
        
        // Real-time subscriptions
        const eventRef = doc(db, 'events', eventId);
        unsubscribeEvent = onSnapshot(eventRef, (snapshot) => {
          if (snapshot.exists()) {
            setEvent({ id: snapshot.id, ...sanitizeData(snapshot.data()) });
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, `events/${eventId}`));

        const registrationsRef = collection(db, 'registrations');
        const qReg = query(registrationsRef, where('event_id', '==', eventId));
        unsubscribeReg = onSnapshot(qReg, (snapshot) => {
          const sortedReg = snapshot.docs
            .map(d => ({ id: d.id, ...sanitizeData(d.data()) }))
            .sort((a: any, b: any) => {
              const dateA = a.created_at || 0;
              const dateB = b.created_at || 0;
              return dateB.localeCompare ? dateB.localeCompare(dateA) : (new Date(dateB).getTime() - new Date(dateA).getTime());
            });
          setRegistrations(sortedReg);
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'registrations'));

        const teamsRef = collection(db, 'teams');
        const qTeams = query(teamsRef, where('event_id', '==', eventId));
        unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
          setTeams(snapshot.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) })));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'teams'));

        const zonesRef = collection(db, 'zones');
        const qZones = query(zonesRef, where('event_id', '==', eventId));
        unsubscribeZones = onSnapshot(qZones, (snapshot) => {
          setZones(snapshot.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) })));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'zones'));

        const matchesRef = collection(db, 'matches');
        const qMatches = query(matchesRef, where('event_id', '==', eventId));
        unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
          const sortedMatches = snapshot.docs
            .map(d => ({ id: d.id, ...sanitizeData(d.data()) }))
            .sort((a: any, b: any) => (a.match_order || 0) - (b.match_order || 0));
          setMatches(sortedMatches);
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'matches'));
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeEvent();
      unsubscribeReg();
      unsubscribeTeams();
      unsubscribeZones();
      unsubscribeMatches();
    };
  }, [id, router]);

  const approveRegistration = async (reg: any) => {
    try {
      // 1. Create players
      const playersRef = collection(db, 'players');
      
      let p1Doc;
      try {
        p1Doc = await addDoc(playersRef, { 
          full_name: reg.player_1_name, 
          phone: reg.player_1_phone,
          created_at: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'players');
        return;
      }

      let p2Id = null;
      if (reg.player_2_name) {
        try {
          const p2Doc = await addDoc(playersRef, { 
            full_name: reg.player_2_name, 
            phone: reg.player_2_phone,
            created_at: serverTimestamp()
          });
          p2Id = p2Doc.id;
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'players');
          return;
        }
      }

      // 2. Create team
      const teamsRef = collection(db, 'teams');
      try {
        await addDoc(teamsRef, {
          event_id: id,
          name: reg.team_name || `${reg.player_1_name} / ${reg.player_2_name || 'Individual'}`,
          player1_id: p1Doc.id,
          player1_name: reg.player_1_name,
          player2_id: p2Id,
          player2_name: reg.player_2_name || null,
          registration_id: reg.id,
          status: 'active',
          created_at: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'teams');
        return;
      }

      // 3. Update registration
      const regRef = doc(db, 'registrations', reg.id);
      try {
        await updateDoc(regRef, { 
          status: 'approved', 
          reviewed_at: serverTimestamp(),
          reviewed_by: auth.currentUser?.uid
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `registrations/${reg.id}`);
        return;
      }
      
    } catch (err) {
      console.error('Error approving registration:', err);
      alert('Error al aprobar la inscripción. Verifique su conexión.');
    }
  };

  const generateZones = async () => {
    try {
      const numZones = Math.ceil(teams.length / 4);
      const zonesRef = collection(db, 'zones');
      
      for (let i = 0; i < numZones; i++) {
        const zoneData = {
          event_id: id,
          name: `Zona ${String.fromCharCode(65 + i)}`,
          stage_order: i + 1,
          status: 'pending',
          created_at: serverTimestamp()
        };
        
        let zoneDoc;
        try {
          zoneDoc = await addDoc(zonesRef, zoneData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'zones');
          continue;
        }

        // Assign teams to zone (simplified for now, just adding a field to team or a separate collection)
        // In this simplified version, we'll just update the teams with the zone_id
        const zoneTeams = teams.slice(i * 4, (i + 1) * 4);
        for (const team of zoneTeams) {
          const teamRef = doc(db, 'teams', team.id);
          try {
            await updateDoc(teamRef, { zone_id: zoneDoc.id });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `teams/${team.id}`);
          }
        }
      }
    } catch (err) {
      console.error('Error generating zones:', err);
      alert('Error al generar zonas. Verifique su conexión.');
    }
  };

  const updateEventStatus = async (newStatus: string) => {
    try {
      setIsSaving(true);
      const eventRef = doc(db, 'events', id as string);
      await updateDoc(eventRef, { status: newStatus });
      alert(`Estado del evento actualizado a: ${newStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `events/${id}`);
      alert('Error al actualizar el estado.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateEventSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const formData = new FormData(e.currentTarget);
      const data = {
        name: formData.get('name') as string,
        status: formData.get('status') as string,
        public_registration_enabled: formData.get('public_registration_enabled') === 'on',
        category_id: formData.get('category_id') as string,
        club_id: formData.get('club_id') as string,
        start_date: formData.get('start_date') as string,
      };

      const eventRef = doc(db, 'events', id as string);
      await updateDoc(eventRef, data);
      alert('Configuración actualizada correctamente.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `events/${id}`);
      alert('Error al actualizar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar este torneo? Esta acción no se puede deshacer.')) return;
    
    try {
      setIsSaving(true);
      const eventRef = doc(db, 'events', id as string);
      await deleteDoc(eventRef); 
      router.push('/admin/dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
      alert('Error al eliminar el torneo.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyRegistrationLink = () => {
    if (!event?.slug) return;
    const url = `${window.location.origin}/register/${event.slug}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando Gestión...</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Top Bar */}
      <header className="bg-[#141414] text-white p-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/admin/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase italic">{event.name}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{event.event_type?.replace('_', ' ')} • {event.status}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={copyRegistrationLink}
            className="bg-white/10 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"
          >
            {isCopied ? <Check className="h-4 w-4 text-[#c1ff72]" /> : <Share2 className="h-4 w-4" />}
            {isCopied ? 'Copiado' : 'Link'}
          </button>
          <button className="bg-[#c1ff72] text-black px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all">
            Publicar Cambios
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-100 px-6 flex gap-8">
        {[
          { id: 'registrations', label: 'Inscripciones', icon: ListChecks },
          { id: 'teams', label: 'Parejas', icon: Users },
          { id: 'zones', label: 'Zonas', icon: LayoutGrid },
          { id: 'matches', label: 'Partidos', icon: History },
          { id: 'settings', label: 'Ajustes', icon: Settings }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              router.push(`/admin/events/${id}/manage?tab=${tab.id}`);
            }}
            className={`py-6 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
              activeTab === tab.id ? 'border-[#c1ff72] text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic">Solicitudes Pendientes</h2>
            </div>
            {registrations.filter(r => r.status === 'pending').map(reg => (
              <div key={reg.id} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black uppercase italic">{reg.team_name || `${reg.player_1_name} / ${reg.player_2_name || '?'}`}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase mt-1">
                    {reg.player_1_name} ({reg.player_1_phone}) {reg.player_2_name ? `• ${reg.player_2_name}` : ''}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => approveRegistration(reg)} className="bg-green-50 text-green-600 p-3 rounded-xl hover:bg-green-100 transition-all">
                    <Check className="h-5 w-5" />
                  </button>
                  <button className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100 transition-all">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic">Parejas Confirmadas ({teams.length})</h2>
              <button className="bg-black text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4 w-4" /> Añadir Manual
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map(team => (
                <div key={team.id} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                  <div className="text-lg font-black uppercase italic mb-4">{team.name}</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                      <div className="w-2 h-2 bg-[#c1ff72] rounded-full"></div> {team.player1?.full_name}
                    </div>
                    {team.player2 && (
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                        <div className="w-2 h-2 bg-[#c1ff72] rounded-full"></div> {team.player2?.full_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase italic">Zonas y Grupos</h2>
              {zones.length === 0 && teams.length >= 3 && (
                <button onClick={generateZones} className="bg-[#c1ff72] text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">
                  Generar Zonas Automáticamente
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {zones.map(zone => (
                <div key={zone.id} className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                  <div className="bg-[#141414] p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase italic">{zone.name}</h3>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-all"><Settings className="h-4 w-4" /></button>
                  </div>
                  <div className="p-6">
                    {/* List teams in zone */}
                    <p className="text-xs text-gray-400 font-bold uppercase mb-4">Equipos en esta zona</p>
                    <div className="space-y-2">
                      {/* This would need another fetch for zone_teams, simplified here */}
                      <div className="text-sm font-bold text-gray-600">Cargando equipos...</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic">Fixture y Resultados</h2>
              <button className="bg-black text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Play className="h-4 w-4" /> Iniciar Torneo
              </button>
            </div>
            
            {matches.map(match => (
              <div key={match.id} className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100 flex items-center justify-between gap-8">
                <div className="flex-1 text-right font-black uppercase italic text-sm">{match.team_a?.name}</div>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    defaultValue={match.games_a} 
                    className="w-16 h-16 bg-gray-50 border-none rounded-2xl text-center text-2xl font-black focus:ring-2 focus:ring-[#c1ff72]"
                  />
                  <span className="text-gray-300 font-black italic">VS</span>
                  <input 
                    type="number" 
                    defaultValue={match.games_b} 
                    className="w-16 h-16 bg-gray-50 border-none rounded-2xl text-center text-2xl font-black focus:ring-2 focus:ring-[#c1ff72]"
                  />
                </div>
                <div className="flex-1 text-left font-black uppercase italic text-sm">{match.team_b?.name}</div>
                <button className="bg-gray-100 p-4 rounded-2xl hover:bg-[#c1ff72] transition-all group">
                  <Save className="h-5 w-5 text-gray-400 group-hover:text-black" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h2 className="text-3xl font-black uppercase italic mb-8">Configuración del Evento</h2>
              
              <form onSubmit={updateEventSettings} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Nombre del Evento</label>
                  <input 
                    name="name"
                    defaultValue={event.name}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#c1ff72]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Estado</label>
                    <select 
                      name="status"
                      defaultValue={event.status}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#c1ff72]"
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Abierto (Inscripciones)</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="finished">Finalizado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Fecha de Inicio</label>
                    <input 
                      name="start_date"
                      type="date"
                      defaultValue={event.start_date?.split('T')[0]}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#c1ff72]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Categoría</label>
                    <select 
                      name="category_id"
                      defaultValue={event.category_id}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#c1ff72]"
                    >
                      <option value="">Seleccionar Categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Club / Sede</label>
                    <select 
                      name="club_id"
                      defaultValue={event.club_id}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#c1ff72]"
                    >
                      <option value="">Seleccionar Club</option>
                      {clubs.map(club => (
                        <option key={club.id} value={club.id}>{club.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <Globe className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider">Inscripciones Públicas</div>
                      <div className="text-[10px] text-gray-400 font-bold">Permite que los jugadores se anoten solos</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      name="public_registration_enabled"
                      type="checkbox" 
                      defaultChecked={event.public_registration_enabled}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c1ff72]"></div>
                  </label>
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-5 w-5" /> {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </form>

              <div className="mt-12 pt-8 border-t border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Zona de Peligro
                </h3>
                <button className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all">
                  Eliminar Torneo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
