'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Calendar, MapPin, Users, Activity, List, Grid, Layout, ArrowLeft, Settings, Share2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface EventDetailClientProps {
  initialEvent: any;
  initialMatches: any[];
  initialStandings: any[];
  initialZones: any[];
  slug: string;
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

export function EventDetailClient({ 
  initialEvent, 
  initialMatches, 
  initialStandings, 
  initialZones,
  slug 
}: EventDetailClientProps) {
  const [event, setEvent] = useState<any>(initialEvent);
  const [matches, setMatches] = useState<any[]>(initialMatches);
  const [standings, setStandings] = useState<any[]>(initialStandings);
  const [zones, setZones] = useState<any[]>(initialZones);
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'brackets'>('matches');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    const url = `${window.location.origin}/register/${event.slug}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const eventsRef = collection(db, 'events');
    const eventQuery = query(eventsRef, where('slug', '==', slug));

    const unsubscribeEvent = onSnapshot(eventQuery, (snapshot) => {
      if (!snapshot.empty) {
        const eventData = { id: snapshot.docs[0].id, ...sanitizeData(snapshot.docs[0].data()) };
        setEvent(eventData);

        // Fetch related data
        const zonesRef = collection(db, 'zones');
        const zonesQuery = query(zonesRef, where('event_id', '==', eventData.id));
        onSnapshot(zonesQuery, (zSnapshot) => {
          const sortedZones = zSnapshot.docs
            .map(d => ({ id: d.id, ...sanitizeData(d.data()) }))
            .sort((a: any, b: any) => (a.stage_order || 0) - (b.stage_order || 0));
          setZones(sortedZones);
        });

        const matchesRef = collection(db, 'matches');
        const matchesQuery = query(matchesRef, where('event_id', '==', eventData.id));
        onSnapshot(matchesQuery, (mSnapshot) => {
          const sortedMatches = mSnapshot.docs
            .map(d => ({ id: d.id, ...sanitizeData(d.data()) }))
            .sort((a: any, b: any) => {
              const dateA = a.scheduled_at || '';
              const dateB = b.scheduled_at || '';
              return dateA.localeCompare(dateB);
            });
          setMatches(sortedMatches);
        });

        const standingsRef = collection(db, 'standings');
        const standingsQuery = query(standingsRef, where('event_id', '==', eventData.id));
        onSnapshot(standingsQuery, (sSnapshot) => {
          const sortedStandings = sSnapshot.docs
            .map(d => ({ id: d.id, ...sanitizeData(d.data()) }))
            .sort((a: any, b: any) => {
              if ((b.points || 0) !== (a.points || 0)) {
                return (b.points || 0) - (a.points || 0);
              }
              return (b.games_diff || 0) - (a.games_diff || 0);
            });
          setStandings(sortedStandings);
        });
      }
    });

    return () => {
      unsubscribeEvent();
    };
  }, [slug]);

  if (!event) return <div className="min-h-screen flex items-center justify-center">Evento no encontrado</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a]">
      {/* Header */}
      <header className="bg-[#141414] text-white pt-12 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#c1ff72] text-xs font-bold uppercase tracking-widest mb-6 transition-all group">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al Inicio
              </Link>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-[#c1ff72] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  {event.event_type.replace('_', ' ')}
                </span>
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                  {event.status}
                </span>
              </div>
              <h1 className="text-3xl md:text-6xl font-black uppercase italic tracking-tighter mb-4 leading-none">
                {event.name}
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs md:text-sm font-medium text-gray-400 mb-8">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#c1ff72]" /> {format(new Date(event.start_date), "d 'de' MMMM", { locale: es })}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#c1ff72]" /> {event.clubs?.name}</div>
                <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-[#c1ff72]" /> {event.categories?.name || 'Libre'}</div>
              </div>

              {event.public_registration_enabled && event.status === 'open' && (
                <Link 
                  href={`/register/${event.slug}`}
                  className="inline-flex bg-[#c1ff72] text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-[#c1ff72]/20"
                >
                  Inscribirme Ahora
                </Link>
              )}

              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <Link 
                    href={`/admin/events/${event.id}/manage`}
                    className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 text-xs"
                  >
                    <Settings className="h-4 w-4" /> Gestionar
                  </Link>
                  <button 
                    onClick={copyToClipboard}
                    className="inline-flex items-center justify-center gap-2 bg-[#c1ff72]/10 text-[#c1ff72] px-6 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#c1ff72]/20 transition-all border border-[#c1ff72]/20 text-xs"
                  >
                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                    {isCopied ? '¡Copiado!' : 'Compartir'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl md:rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => setActiveTab('matches')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'matches' ? 'bg-[#c1ff72] text-black' : 'text-white hover:bg-white/5'}`}
              >
                <Activity className="h-4 w-4" /> Partidos
              </button>
              <button 
                onClick={() => setActiveTab('standings')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'standings' ? 'bg-[#c1ff72] text-black' : 'text-white hover:bg-white/5'}`}
              >
                <List className="h-4 w-4" /> Posiciones
              </button>
              <button 
                onClick={() => setActiveTab('brackets')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'brackets' ? 'bg-[#c1ff72] text-black' : 'text-white hover:bg-white/5'}`}
              >
                <Grid className="h-4 w-4" /> Cuadro
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 -mt-12 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'matches' && (
            <motion.div 
              key="matches"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {matches.map((match) => (
                  <div key={match.id} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
                          {match.phase.replace('_', ' ')} {match.round_label ? `• ${match.round_label}` : ''}
                        </span>
                        <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-[#c1ff72]" /> {match.court?.name || 'Cancha TBD'}
                        </span>
                      </div>
                      <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        match.status === 'completed' ? 'bg-gray-100 text-gray-500' : 
                        match.status === 'in_progress' ? 'bg-red-100 text-red-600 animate-pulse' : 
                        'bg-[#c1ff72]/10 text-black'
                      }`}>
                        {match.status}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
                      {/* Team A */}
                      <div className="flex-1 text-center w-full sm:w-auto">
                        <div className="text-base md:text-lg font-black uppercase italic leading-tight mb-2">
                          {match.team_a?.name || `${match.team_a?.player1?.full_name.split(' ')[0]} / ${match.team_a?.player2?.full_name.split(' ')[0]}`}
                        </div>
                        <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {match.team_a?.player1?.full_name} <br className="hidden sm:block" /> {match.team_a?.player2?.full_name}
                        </div>
                      </div>
 
                      {/* Score */}
                      <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 bg-gray-50 rounded-2xl md:rounded-3xl border border-gray-100 min-w-[140px] md:min-w-[180px] justify-center">
                        <span className={`text-3xl md:text-4xl font-black italic ${match.winner_team_id === match.team_a_id ? 'text-[#c1ff72]' : 'text-black'}`}>
                          {match.games_a ?? '-'}
                        </span>
                        <span className="text-gray-300 font-black italic text-xl md:text-2xl">VS</span>
                        <span className={`text-3xl md:text-4xl font-black italic ${match.winner_team_id === match.team_b_id ? 'text-[#c1ff72]' : 'text-black'}`}>
                          {match.games_b ?? '-'}
                        </span>
                      </div>
 
                      {/* Team B */}
                      <div className="flex-1 text-center w-full sm:w-auto">
                        <div className="text-base md:text-lg font-black uppercase italic leading-tight mb-2">
                          {match.team_b?.name || `${match.team_b?.player1?.full_name.split(' ')[0]} / ${match.team_b?.player2?.full_name.split(' ')[0]}`}
                        </div>
                        <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {match.team_b?.player1?.full_name} <br className="hidden sm:block" /> {match.team_b?.player2?.full_name}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'standings' && (
            <motion.div 
              key="standings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {zones.map((zone) => (
                <div key={zone.id} className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
                  <div className="bg-[#141414] p-8 text-white flex justify-between items-center">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{zone.name}</h3>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c1ff72]">Fase de Grupos</span>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Pos</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Pareja</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">PJ</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">PG</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">PP</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">DF</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.filter(s => s.zone_id === zone.id).map((row, idx) => (
                          <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx < 2 ? 'bg-[#c1ff72] text-black' : 'bg-gray-100 text-gray-400'}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="font-black uppercase italic text-sm">{row.team?.name}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {row.team?.player1?.full_name} / {row.team?.player2?.full_name}
                              </div>
                            </td>
                            <td className="px-4 py-6 text-center font-bold text-sm">{row.played}</td>
                            <td className="px-4 py-6 text-center font-bold text-sm text-green-600">{row.won}</td>
                            <td className="px-4 py-6 text-center font-bold text-sm text-red-600">{row.lost}</td>
                            <td className="px-4 py-6 text-center font-bold text-sm">{row.games_diff > 0 ? `+${row.games_diff}` : row.games_diff}</td>
                            <td className="px-8 py-6 text-right font-black text-lg italic">{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'brackets' && (
            <motion.div 
              key="brackets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center py-12"
            >
              <div className="text-center mb-12">
                <Trophy className="h-12 w-12 text-[#c1ff72] mx-auto mb-4" />
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Cuadro Eliminatorio</h2>
                <p className="text-gray-500 font-medium mt-2">Los mejores de cada zona avanzan a la gloria.</p>
              </div>

              <div className="w-full overflow-x-auto pb-12">
                <div className="min-w-[800px] flex justify-center gap-12">
                  {/* Quarter Finals */}
                  <div className="flex flex-col justify-around gap-8">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center mb-4">Cuartos</div>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-48 h-24 bg-white rounded-2xl border border-gray-100 shadow-lg flex flex-col justify-center px-4 relative">
                        <div className="text-[10px] font-bold text-gray-300 absolute -top-4 left-0">QF {i}</div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-1 mb-1">
                          <span className="text-[10px] font-black uppercase italic truncate">TBD</span>
                          <span className="text-xs font-black">-</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase italic truncate">TBD</span>
                          <span className="text-xs font-black">-</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Semi Finals */}
                  <div className="flex flex-col justify-around gap-8">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center mb-4">Semis</div>
                    {[1, 2].map(i => (
                      <div key={i} className="w-48 h-24 bg-white rounded-2xl border border-gray-100 shadow-lg flex flex-col justify-center px-4 relative">
                        <div className="text-[10px] font-bold text-gray-300 absolute -top-4 left-0">SF {i}</div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-1 mb-1">
                          <span className="text-[10px] font-black uppercase italic truncate">TBD</span>
                          <span className="text-xs font-black">-</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase italic truncate">TBD</span>
                          <span className="text-xs font-black">-</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Final */}
                  <div className="flex flex-col justify-around gap-8">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center mb-4">Final</div>
                    <div className="w-56 h-32 bg-[#141414] text-white rounded-[2rem] shadow-2xl flex flex-col justify-center px-6 relative border-4 border-[#c1ff72]">
                      <div className="text-[10px] font-black text-[#c1ff72] uppercase tracking-widest absolute -top-6 left-0 right-0 text-center">Gran Final</div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
                        <span className="text-xs font-black uppercase italic truncate">TBD</span>
                        <span className="text-sm font-black">-</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase italic truncate">TBD</span>
                        <span className="text-sm font-black">-</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
