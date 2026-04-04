'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { Trophy, User, Phone, Users, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Event } from '@/lib/types';

const registrationSchema = z.object({
  player_1_name: z.string().min(3, 'Nombre requerido'),
  player_1_phone: z.string().min(8, 'Teléfono requerido'),
  player_1_email: z.string().email('Email inválido'),
  player_1_category_text: z.string().min(2, 'Categoría requerida'),
  player_2_name: z.string().optional(),
  player_2_phone: z.string().optional(),
  player_2_category_text: z.string().optional(),
  team_name: z.string().optional(),
  notes: z.string().optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface RegistrationClientProps {
  initialEvent: Event;
  slug: string;
}

export function RegistrationClient({ initialEvent, slug }: RegistrationClientProps) {
  const [event] = useState<Event>(initialEvent);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema)
  });

  const onSubmit = async (formData: RegistrationForm) => {
    try {
      const registrationsRef = collection(db, 'registrations');
      await addDoc(registrationsRef, {
        ...formData,
        event_id: event.id,
        registration_type: event.event_type,
        source: 'public_form',
        status: 'pending',
        created_at: serverTimestamp()
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting registration client-side:', err);
      setError('Error de conexión. Verifique su internet e intente nuevamente.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl text-center max-w-lg w-full border border-gray-100"
        >
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-black uppercase italic mb-4">¡Inscripción Enviada!</h2>
          <p className="text-gray-500 mb-8">
            Tu solicitud ha sido recibida. El administrador revisará tus datos y te contactará pronto.
          </p>
          <Link 
            href="/" 
            className="inline-block bg-black text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            Volver al Inicio
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black mb-6 md:mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-[#141414] p-6 md:p-10 text-white">
            <span className="text-[#c1ff72] text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">Inscripción Abierta</span>
            <h1 className="text-2xl md:text-4xl font-black uppercase italic leading-tight">{event.name}</h1>
            <div className="flex items-center gap-4 mt-4 text-gray-400 text-[10px] md:text-sm font-medium">
              <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> {event.category_name || 'Libre'}</span>
              <span className="flex items-center gap-1 capitalize"><Users className="h-3 w-3" /> {event.event_type?.replace('_', ' ')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-10 space-y-8">
            {error && <div className="p-4 bg-red-100 text-red-700 rounded-2xl text-xs font-bold uppercase tracking-widest">{error}</div>}
            
            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                <div className="h-1 w-1 bg-[#c1ff72] rounded-full"></div> Jugador 1 (Responsable)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Nombre Completo</label>
                  <input 
                    {...register('player_1_name')}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all"
                    placeholder="Ej: Juan Pérez"
                  />
                  {errors.player_1_name && <p className="text-red-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.player_1_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Celular / WhatsApp</label>
                  <input 
                    {...register('player_1_phone')}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all"
                    placeholder="Ej: +54 9 11 ..."
                  />
                  {errors.player_1_phone && <p className="text-red-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.player_1_phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Correo Electrónico</label>
                  <input 
                    {...register('player_1_email')}
                    type="email"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all"
                    placeholder="juan@ejemplo.com"
                  />
                  {errors.player_1_email && <p className="text-red-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.player_1_email.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Tu Categoría / Nivel</label>
                  <input 
                    {...register('player_1_category_text')}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all"
                    placeholder="Ej: 4ta, 5ta, Principiante..."
                  />
                  {errors.player_1_category_text && <p className="text-red-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.player_1_category_text.message}</p>}
                </div>
              </div>
            </section>

            {event.event_type === 'torneo' && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                  <div className="h-1 w-1 bg-[#c1ff72] rounded-full"></div> Jugador 2 (Compañero)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Nombre Completo</label>
                    <input 
                      {...register('player_2_name')}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all"
                      placeholder="Opcional si no tienes pareja"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Celular</label>
                    <input 
                      {...register('player_2_phone')}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Categoría del Compañero</label>
                    <input 
                      {...register('player_2_category_text')}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all"
                      placeholder="Ej: 4ta, 5ta..."
                    />
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Nombre de la Pareja / Equipo (Opcional)</label>
                <input 
                  {...register('team_name')}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all"
                  placeholder="Ej: Los Galácticos"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Notas o Comentarios</label>
                <textarea 
                  {...register('notes')}
                  rows={3}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#c1ff72] transition-all resize-none"
                  placeholder="Alguna preferencia de horario o aclaración..."
                />
              </div>
            </section>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#c1ff72] text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-[#c1ff72]/20"
            >
              {isSubmitting ? 'Enviando...' : 'Confirmar Inscripción'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
