'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trophy, Calendar, MapPin, ChevronRight, Activity, Share2, Check } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Event } from '@/lib/types';

interface LandingClientProps {
  initialEvents: Event[];
}

/**
 * Helper to convert Firestore Timestamps to plain ISO strings.
 * Ensures data is serializable for Next.js hydration.
 */
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
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(val)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  
  return val;
};

export function LandingClient({ initialEvents }: LandingClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Set mounted state to true on client-side to avoid hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  const copyToClipboard = (slug: string, id: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/register/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string | any) => {
    if (!dateStr) return '';
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp object if it's not pre-sanitized
      if (typeof dateStr === 'object' && 'seconds' in dateStr) {
        date = new Date(dateStr.seconds * 1000);
      } else if (typeof dateStr === 'string') {
        // If it's a date string like YYYY-MM-DD
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          // Standardize to local noon
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

    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs
        .map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...sanitizeData(doc.data())
        } as Event))
        .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
      
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching events client-side:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Avoid rendering until mounted to prevent hydration errors
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans">
      {/* Hero Section */}
      <header className="bg-[#141414] text-white py-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#333,transparent)] opacity-50"></div>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <motion.h1 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter mb-4 italic uppercase"
          >
            Padel<span className="text-[#c1ff72]">Flow</span>
          </motion.h1>
          <p className="text-xl md:text-2xl font-light text-gray-400 mb-8 max-w-2xl mx-auto">
            La plataforma definitiva para gestionar tus torneos y turnos de pádel en tiempo real.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="#events" 
              className="bg-[#c1ff72] text-black px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:scale-105 transition-transform shadow-xl shadow-[#c1ff72]/20"
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
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-black uppercase tracking-tight flex items-center gap-3"
          >
            <Activity className="text-[#c1ff72]" />
            Eventos Activos
          </motion.h2>
        </div>

        {loading && events.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-[2.5rem]"></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-300 shadow-sm"
          >
            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-xl text-gray-500 font-medium">No hay eventos públicos en este momento.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col group transition-all duration-300"
              >
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      event.event_type === 'torneo' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                    }`}>
                      {event.event_type.replace('_', ' ')}
                    </span>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      event.status === 'open' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-100'
                    }`}>
                      {event.status === 'open' ? 'Inscripciones Abiertas' : event.status}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black mb-3 leading-tight uppercase italic group-hover:text-[#8bc34a] transition-colors">{event.name}</h3>
                  <p className="text-gray-500 text-sm mb-8 line-clamp-2 leading-relaxed">{event.description}</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-600">
                      <div className="w-8 h-8 rounded-xl bg-[#c1ff72]/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-gray-800" />
                      </div>
                      <span>{formatDate(event.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-600">
                      <div className="w-8 h-8 rounded-xl bg-[#c1ff72]/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-gray-800" />
                      </div>
                      <span>{event.club_name} • {event.club_city}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-600">
                      <div className="w-8 h-8 rounded-xl bg-[#c1ff72]/10 flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-gray-800" />
                      </div>
                      <span>Categoría: {event.category_name || 'Libre'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-3 mt-auto">
                  <Link 
                    href={`/event/${event.slug}`}
                    className="flex-1 bg-black text-white py-4 px-4 rounded-2xl font-black uppercase tracking-widest text-center hover:bg-gray-800 transition-all flex items-center justify-center gap-2 text-[10px]"
                  >
                    Ver Detalles <ChevronRight className="h-3 w-3" />
                  </Link>
                  <button 
                    onClick={() => copyToClipboard(event.slug, event.id)}
                    className="p-4 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:bg-white hover:border-[#c1ff72] hover:text-[#8bc34a] transition-all flex items-center justify-center shadow-sm"
                    title="Copiar link de inscripción"
                  >
                    {copiedId === event.id ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
                  </button>
                  {event.public_registration_enabled && event.status === 'open' && (
                    <Link 
                      href={`/register/${event.slug}`}
                      className="flex-1 bg-[#c1ff72] text-black py-4 px-4 rounded-2xl font-black uppercase tracking-widest text-center hover:shadow-lg hover:shadow-[#c1ff72]/30 transition-all text-[10px]"
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
      <footer className="bg-white border-t border-gray-100 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-3xl font-black italic uppercase">
            Padel<span className="text-[#c1ff72]">Flow</span>
          </div>
          <div className="flex flex-wrap justify-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            <Link href="#" className="hover:text-black transition-colors">Términos y Condiciones</Link>
            <Link href="#" className="hover:text-black transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-black transition-colors">Contacto</Link>
          </div>
          <div className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} PadelFlow. Made with Strength.
          </div>
        </div>
      </footer>
    </div>
  );
}
