'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { X, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateEventModal({ isOpen, onClose }: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showQuickAddClub, setShowQuickAddClub] = useState(false);
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    event_type: 'torneo',
    club_id: '',
    category_id: '',
    start_date: '',
    end_date: '',
    description: '',
    public_registration_enabled: true,
    public_visible: true,
  });

  const fetchData = async () => {
    try {
      const clubsSnap = await getDocs(collection(db, 'clubs'));
      setClubs(clubsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));

      const categoriesSnap = await getDocs(collection(db, 'categories'));
      setCategories(categoriesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching clubs/categories:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleQuickAddClub = async () => {
    if (!newClubName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'clubs'), {
        name: newClubName,
        slug: generateSlug(newClubName),
        created_at: serverTimestamp(),
        is_active: true
      });
      await fetchData();
      setFormData((prev: typeof formData) => ({ ...prev, club_id: docRef.id }));
      setNewClubName('');
      setShowQuickAddClub(false);
    } catch (error) {
      console.error('Error adding club:', error);
    }
  };

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        name: newCategoryName,
        created_at: serverTimestamp(),
        is_active: true
      });
      await fetchData();
      setFormData((prev: typeof formData) => ({ ...prev, category_id: docRef.id }));
      setNewCategoryName('');
      setShowQuickAddCategory(false);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const selectedClub = clubs.find((c: any) => c.id === formData.club_id);
      const selectedCategory = categories.find((c: any) => c.id === formData.category_id);

      const eventData = {
        ...formData,
        slug: `${generateSlug(formData.name)}-${Date.now().toString().slice(-4)}`,
        status: 'draft',
        created_by: auth.currentUser.uid,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        club_name: selectedClub?.name || '',
        club_city: selectedClub?.city || '',
        category_name: selectedCategory?.name || '',
      };

      await addDoc(collection(db, 'events'), eventData);
      onClose();
      setFormData({
        name: '',
        event_type: 'torneo',
        club_id: '',
        category_id: '',
        start_date: '',
        end_date: '',
        description: '',
        public_registration_enabled: true,
        public_visible: true,
      });
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error al crear el evento. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-10 py-8 md:px-16 md:py-12 border-b border-gray-50 flex justify-between items-center bg-white z-10">
              <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Nuevo Evento</h2>
              <button 
                onClick={onClose} 
                className="p-4 hover:bg-gray-100 rounded-full transition-all hover:rotate-90 duration-300"
              >
                <X className="h-8 w-8 text-black" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-10 py-10 md:px-16 md:py-12 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  {/* Event Name */}
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Nombre del Evento</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-8 py-6 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] transition-all text-xl placeholder:text-gray-300"
                      placeholder="Ej: Torneo Apertura 2024"
                    />
                  </div>

                  {/* Event Type */}
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Tipo de Evento</label>
                    <div className="relative">
                      <select
                        value={formData.event_type}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, event_type: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-8 py-6 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] transition-all appearance-none text-xl cursor-pointer"
                      >
                        <option value="torneo">Torneo</option>
                        <option value="cancha_abierta">Cancha Abierta</option>
                      </select>
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="h-6 w-6 rotate-90 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Club Selection / Quick Add */}
                  <div className={`space-y-4 transition-all duration-500 ${showQuickAddClub ? 'md:col-span-2 bg-[#c1ff72]/5 p-8 rounded-[2.5rem] border-2 border-dashed border-[#c1ff72]/20' : ''}`}>
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Club / Sede</label>
                      <button 
                        type="button"
                        onClick={() => setShowQuickAddClub(!showQuickAddClub)}
                        className={`text-[10px] font-black uppercase px-4 py-2 rounded-full transition-all ${
                          showQuickAddClub 
                          ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                          : 'bg-[#c1ff72]/20 text-[#8bc34a] hover:bg-[#c1ff72]/30'
                        }`}
                      >
                        {showQuickAddClub ? 'Cancelar' : '+ Nuevo Club'}
                      </button>
                    </div>
                    {showQuickAddClub ? (
                      <div className="flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <input
                          type="text"
                          value={newClubName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClubName(e.target.value)}
                          placeholder="Nombre del nuevo club..."
                          className="flex-1 bg-white border border-gray-200 rounded-2xl px-8 py-5 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] text-xl"
                        />
                        <button
                          type="button"
                          onClick={handleQuickAddClub}
                          className="bg-black text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10 active:scale-95"
                        >
                          Añadir
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          required
                          value={formData.club_id}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, club_id: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-8 py-6 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] transition-all appearance-none text-xl cursor-pointer"
                        >
                          <option value="">Seleccionar Club</option>
                          {clubs.map(club => (
                            <option key={club.id} value={club.id}>{club.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronRight className="h-6 w-6 rotate-90 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Category Selection / Quick Add */}
                  <div className={`space-y-4 transition-all duration-500 ${showQuickAddCategory ? 'md:col-span-2 bg-[#c1ff72]/5 p-8 rounded-[2.5rem] border-2 border-dashed border-[#c1ff72]/20' : ''}`}>
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Categoría</label>
                      <button 
                        type="button"
                        onClick={() => setShowQuickAddCategory(!showQuickAddCategory)}
                        className={`text-[10px] font-black uppercase px-4 py-2 rounded-full transition-all ${
                          showQuickAddCategory 
                          ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                          : 'bg-[#c1ff72]/20 text-[#8bc34a] hover:bg-[#c1ff72]/30'
                        }`}
                      >
                        {showQuickAddCategory ? 'Cancelar' : '+ Nueva Cat'}
                      </button>
                    </div>
                    {showQuickAddCategory ? (
                      <div className="flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nombre de la nueva categoría..."
                          className="flex-1 bg-white border border-gray-200 rounded-2xl px-8 py-5 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] text-xl"
                        />
                        <button
                          type="button"
                          onClick={handleQuickAddCategory}
                          className="bg-black text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10 active:scale-95"
                        >
                          Añadir
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={formData.category_id}
                          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-8 py-6 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] transition-all appearance-none text-xl cursor-pointer"
                        >
                          <option value="">Seleccionar Categoría (Opcional)</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronRight className="h-6 w-6 rotate-90 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Fecha de Inicio</label>
                    <input
                      required
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-8 py-6 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] transition-all text-xl"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Fecha de Fin</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-8 py-6 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] transition-all text-xl"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-[2.5rem] px-10 py-8 font-bold focus:outline-none focus:ring-4 focus:ring-[#c1ff72]/30 focus:border-[#c1ff72] transition-all h-48 resize-none text-xl placeholder:text-gray-300"
                    placeholder="Detalles del evento, reglas, premios..."
                  />
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap items-center gap-16 py-6 px-4 bg-gray-50/50 rounded-[2.5rem] border border-gray-100">
                  <label className="flex items-center gap-5 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.public_registration_enabled}
                        onChange={(e) => setFormData({ ...formData, public_registration_enabled: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-14 h-8 bg-gray-200 rounded-full peer-checked:bg-[#c1ff72] transition-all duration-300"></div>
                      <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-sm"></div>
                    </div>
                    <span className="text-base font-black text-gray-600 uppercase tracking-widest group-hover:text-black transition-colors">Inscripciones Abiertas</span>
                  </label>
                  <label className="flex items-center gap-5 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.public_visible}
                        onChange={(e) => setFormData({ ...formData, public_visible: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-14 h-8 bg-gray-200 rounded-full peer-checked:bg-[#c1ff72] transition-all duration-300"></div>
                      <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-sm"></div>
                    </div>
                    <span className="text-base font-black text-gray-600 uppercase tracking-widest group-hover:text-black transition-colors">Visible al Público</span>
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-10 py-10 md:px-16 md:py-12 bg-white border-t border-gray-50 flex flex-col md:flex-row gap-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-12 py-7 rounded-3xl font-black uppercase tracking-[0.3em] text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all border-2 border-transparent active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any)}
                disabled={loading}
                className="flex-[2] bg-black text-white px-12 py-7 rounded-3xl font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-gray-800 transition-all disabled:opacity-50 shadow-2xl shadow-black/20 active:scale-95"
              >
                {loading ? <Loader2 className="h-7 w-7 animate-spin text-[#c1ff72]" /> : 'Crear Evento'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
