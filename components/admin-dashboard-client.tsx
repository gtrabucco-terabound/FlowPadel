'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  Plus, 
  Settings, 
  Users, 
  Trophy, 
  LogOut, 
  LayoutDashboard, 
  Calendar,
  ChevronRight,
  Activity,
  Share2,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { CreateEventModal } from './create-event-modal';

interface AdminDashboardClientProps {
  initialEvents: any[];
}

export function AdminDashboardClient({ initialEvents }: AdminDashboardClientProps) {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  const copyToClipboard = (slug: string, id: string) => {
    const url = `${window.location.origin}/register/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    let unsubscribeEvents: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin/login');
      } else {
        setUser(user);
        setLoading(false);

        // Only start the events listener if we have a user
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('created_at', 'desc'));

        unsubscribeEvents = onSnapshot(q, (snapshot) => {
          const eventsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEvents(eventsData);
        }, (error) => {
          console.error('Error fetching events client-side:', error);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeEvents();
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  if (loading) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">Cargando Dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-[#141414] text-white p-8 flex flex-col hidden lg:flex">
        <div className="text-2xl font-black italic uppercase mb-12">
          Padel<span className="text-[#c1ff72]">Flow</span>
        </div>

        <nav className="flex-1 space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 p-4 rounded-2xl bg-[#c1ff72] text-black font-bold text-sm uppercase tracking-wider">
            <LayoutDashboard className="h-5 w-5" /> Dashboard
          </Link>
          <Link href="/admin/players" className="flex items-center gap-3 p-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-bold text-sm uppercase tracking-wider transition-all">
            <Users className="h-5 w-5" /> Jugadores
          </Link>
          <Link href="/admin/categories" className="flex items-center gap-3 p-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-bold text-sm uppercase tracking-wider transition-all">
            <Trophy className="h-5 w-5" /> Categorías
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 p-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-bold text-sm uppercase tracking-wider transition-all">
            <Settings className="h-5 w-5" /> Ajustes
          </Link>
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-4 rounded-2xl text-red-400 hover:bg-red-400/10 font-bold text-sm uppercase tracking-wider transition-all mt-auto"
        >
          <LogOut className="h-5 w-5" /> Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tight mb-2">Panel de Control</h1>
            <p className="text-gray-500 font-medium">Gestiona tus eventos y torneos de pádel.</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-black text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all"
          >
            <Plus className="h-5 w-5" /> Nuevo Evento
          </button>
        </header>

        <CreateEventModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-4xl font-black mb-1">{events.length}</div>
            <div className="text-xs font-black uppercase tracking-widest text-gray-400">Eventos Totales</div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
            <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-4xl font-black mb-1">{events.filter(e => e.status === 'in_progress').length}</div>
            <div className="text-xs font-black uppercase tracking-widest text-gray-400">En Progreso</div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
            <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-4xl font-black mb-1">--</div>
            <div className="text-xs font-black uppercase tracking-widest text-gray-400">Inscripciones Pendientes</div>
          </div>
        </div>

        {/* Events List */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-8 flex items-center gap-3">
            <div className="h-1 w-1 bg-[#c1ff72] rounded-full"></div> Listado de Eventos
          </h2>

          <div className="space-y-4">
            {events.map((event) => (
              <motion.div 
                key={event.id}
                whileHover={{ x: 5 }}
                className="bg-white p-6 rounded-3xl shadow-lg shadow-gray-200/30 border border-gray-100 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl italic ${
                    event.event_type === 'torneo' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {event.event_type === 'torneo' ? 'T' : 'C'}
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic group-hover:text-[#c1ff72] transition-colors">{event.name}</h3>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                      <span>{event.categories?.name || 'Libre'}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>{event.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => copyToClipboard(event.slug, event.id)}
                    className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
                    title="Copiar link de inscripción"
                  >
                    {copiedId === event.id ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
                  </button>
                  <Link 
                    href={`/admin/events/${event.id}/manage?tab=settings`}
                    className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                  <Link 
                    href={`/admin/events/${event.id}/manage`}
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all"
                  >
                    Gestionar <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
