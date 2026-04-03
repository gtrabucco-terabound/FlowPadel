'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trophy, Calendar, Users, MapPin, ChevronRight, Activity, Share2, Check } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LandingClientProps {
  initialEvents: any[];
}

// Helper to convert Firestore Timestamps to plain ISO strings
const sanitizeData = (val: any): any => {
  if (val === null || val === undefined) return val;
  
  // Handle Firestore Timestamps (both class instances and plain objects)
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  
  if (Array.isArray(val)) {
    return val.map(sanitizeData);
  }
  
  if (typeof val === 'object' && (val.constructor.name === 'Object' || Object.getPrototypeOf(val) === Object.prototype)) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(val)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  
  return val;
};

export function LandingClient({ initialEvents }: LandingClientProps) {
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (slug: string, id: string) => {
    const url = `${window.location.origin}/register/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp
      if (typeof dateStr === 'object' && 'seconds' in dateStr) {
        date = new Date(dateStr.seconds * 1000);
      } else if (typeof dateStr === 'string') {
        // If it's YYYY-MM-DD, parse as local date to avoid timezone shifts
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          // Use local date at noon to be safe
          date = new Date(year, month, day, 12, 0, 0);
        } else {
          date = new Date(dateStr);
        }
      } else {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) return String(dateStr);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
      return String(dateStr);
    }
  };

  useEffect(() => {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('public_visible', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...sanitizeData(doc.data())
        }))
        .sort((a: any, b: any) => {
          const dateA = a.start_date || '';
          const dateB = b.start_date || '';
          return dateA.localeCompare(dateB);
        });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching events client-side:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // To prevent hydration mismatch, we can render a placeholder or just wait
  // But usually it's better to just suppress the warning on the specific element
  // or use the mounted state for the whole main content if it's very dynamic.
  // For now, let's just ensure the logic is as consistent as possible.

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans">
      {/* Hero Section */}
      <header className="bg-[#141414] text-white py-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#333,transparent)]"></div>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 italic uppercase">
            Padel<span className="text-[#c1ff72]">Flow</span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-gray-400 mb-8 max-w-2xl mx-auto">
            La plataforma definitiva para gestionar tus torneos y turnos de pádel en tiempo real.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="#events" 
              className="bg-[#c1ff72] text-black px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:scale-105 transition-transform"
            >
              Ver Eventos
            </Link>
            <Link 
              href="/admin/login" 
              className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:bg-white/20 transition-all"
            >
              Panel Admin
            </Link>
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main id="events" className="max-w-7xl mx-auto py-16 px-6">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Activity className="text-[#c1ff72]" />
            Eventos Activos
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-3xl"></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-xl text-gray-500 font-medium">No hay eventos públicos en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <motion.div
                key={event.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col"
              >
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      event.event_type === 'torneo' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {event.event_type.replace('_', ' ')}
                    </span>
                    <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      event.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black mb-2 leading-tight uppercase italic">{event.name}</h3>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2">{event.description}</p>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <Calendar className="h-4 w-4 text-[#c1ff72]" />
                      <span suppressHydrationWarning>
                        {formatDate(event.start_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <MapPin className="h-4 w-4 text-[#c1ff72]" />
                      {event.club_name} - {event.club_city}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <Trophy className="h-4 w-4 text-[#c1ff72]" />
                      Categoría: {event.category_name || 'Libre'}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3">
                  <Link 
                    href={`/event/${event.slug}`}
                    className="flex-1 bg-black text-white py-3 px-4 rounded-2xl font-bold text-center hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    Ver Detalles <ChevronRight className="h-4 w-4" />
                  </Link>
                  <button 
                    onClick={() => copyToClipboard(event.slug, event.id)}
                    className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:bg-gray-100 transition-all flex items-center justify-center"
                    title="Copiar link de inscripción"
                  >
                    {copiedId === event.id ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
                  </button>
                  {event.public_registration_enabled && event.status === 'open' && (
                    <Link 
                      href={`/register/${event.slug}`}
                      className="flex-1 bg-[#c1ff72] text-black py-3 px-4 rounded-2xl font-bold text-center hover:opacity-90 transition-opacity text-sm"
                    >
                      Inscribirme
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-2xl font-black italic uppercase">
            Padel<span className="text-[#c1ff72]">Flow</span>
          </div>
          <div className="flex gap-8 text-sm font-bold uppercase tracking-widest text-gray-500">
            <Link href="#" className="hover:text-black transition-colors">Términos</Link>
            <Link href="#" className="hover:text-black transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-black transition-colors">Contacto</Link>
          </div>
          <div className="text-gray-400 text-xs">
            © 2026 PadelFlow. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
