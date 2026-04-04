'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  setDoc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Settings, 
  Trophy, 
  MapPin, 
  Globe, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Save,
  Instagram,
  Phone,
  Mail,
  Camera,
  CreditCard,
  Search,
  Tag
} from 'lucide-react';
import { AdminSidebar } from './admin-sidebar';

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

export function AdminSettingsClient() {
  const [activeTab, setActiveTab] = useState<'clubs' | 'categories' | 'global'>('clubs');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // Data States
  const [clubs, setClubs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState({
    instagram: '',
    whatsapp: '',
    mercadopago_link: '',
    support_email: '',
    logo_url: '',
    club_name: 'Flow Padel'
  });

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/admin/login');
    });

    // Subscriptions
    const unsubClubs = onSnapshot(query(collection(db, 'clubs'), orderBy('name', 'asc')), (snap) => {
      setClubs(snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) })));
    });

    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('name', 'asc')), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) })));
    });

    const fetchGlobal = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data() as any);
      }
      setLoading(false);
    };

    fetchGlobal();
    return () => {
      unsubscribeAuth();
      unsubClubs();
      unsubCats();
    };
  }, [router]);

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...globalSettings,
        updated_at: serverTimestamp()
      });
      alert('Configuración global actualizada.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClub = async (id: string) => {
    if (!confirm('¿Eliminar esta sede?')) return;
    await deleteDoc(doc(db, 'clubs', id));
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await deleteDoc(doc(db, 'categories', id));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando Ajustes...</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col lg:flex-row">
      <AdminSidebar activePage="settings" />

      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black uppercase italic tracking-tight mb-2">Ajustes</h1>
          <p className="text-gray-500 font-medium text-sm md:text-base">Gestiona las sedes, categorías y el perfil global de tu club.</p>
        </header>

        {/* Tabs Navigation */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-8 w-fit">
          {[
            { id: 'clubs', label: 'Sedes', icon: MapPin },
            { id: 'categories', label: 'Categorías', icon: Trophy },
            { id: 'global', label: 'Configuración Global', icon: Globe }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === 'clubs' && (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black uppercase italic">Listado de Sedes</h2>
                 <button 
                  onClick={() => {
                    setEditingItem(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#c1ff72] hover:text-black transition-all"
                >
                   <Plus className="h-4 w-4" /> Agregar Sede
                 </button>
               </div>
               <div className="space-y-3">
                 {clubs.map(club => (
                   <div key={club.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black italic shadow-sm text-gray-400">PF</div>
                        <div className="font-bold text-sm md:text-base uppercase italic">{club.name}</div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditingItem(club); setIsCreateModalOpen(true); }} className="p-2 hover:bg-black hover:text-white rounded-lg transition-all"><Edit2 className="h-4 w-4" /></button>
                         <button onClick={() => handleDeleteClub(club.id)} className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black uppercase italic">Listado de Categorías</h2>
                 <button 
                  onClick={() => {
                    setEditingItem(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#c1ff72] hover:text-black transition-all"
                >
                   <Plus className="h-4 w-4" /> Nueva Categoría
                 </button>
               </div>
               <div className="space-y-3">
                 {categories.map(cat => (
                   <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><Trophy className={`h-5 w-5 ${cat.gender === 'femenino' ? 'text-pink-500' : 'text-blue-500'}`} /></div>
                        <div>
                          <div className="font-bold text-sm md:text-base uppercase italic">{cat.name}</div>
                          <div className="text-[9px] font-black uppercase text-gray-400">{cat.gender} • Nivel {cat.level_order}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditingItem(cat); setIsCreateModalOpen(true); }} className="p-2 hover:bg-black hover:text-white rounded-lg transition-all"><Edit2 className="h-4 w-4" /></button>
                         <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'global' && (
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-gray-100 max-w-4xl">
               <h2 className="text-2xl font-black uppercase italic mb-10 pb-4 border-b border-gray-50">Configuración Global</h2>
               <form onSubmit={handleSaveGlobal} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre del Club / App</label>
                       <div className="relative">
                         <Settings className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                         <input 
                            value={globalSettings.club_name}
                            onChange={e => setGlobalSettings({...globalSettings, club_name: e.target.value})}
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 font-bold focus:ring-2 focus:ring-[#c1ff72] transition-all"
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">WhatsApp de Contacto</label>
                       <div className="relative">
                         <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                         <input 
                            value={globalSettings.whatsapp}
                            onChange={e => setGlobalSettings({...globalSettings, whatsapp: e.target.value})}
                            placeholder="+54 9 11 ..."
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 font-bold focus:ring-2 focus:ring-[#c1ff72] transition-all"
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Link de Instagram</label>
                       <div className="relative">
                         <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                         <input 
                            value={globalSettings.instagram}
                            onChange={e => setGlobalSettings({...globalSettings, instagram: e.target.value})}
                            placeholder="https://instagram.com/..."
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 font-bold focus:ring-2 focus:ring-[#c1ff72] transition-all"
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Correo Electrónico</label>
                       <div className="relative">
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                         <input 
                            value={globalSettings.support_email}
                            onChange={e => setGlobalSettings({...globalSettings, support_email: e.target.value})}
                            placeholder="contacto@club.com"
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 font-bold focus:ring-2 focus:ring-[#c1ff72] transition-all"
                         />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-gray-50">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Logo URL (Icono)</label>
                       <div className="relative">
                         <Camera className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                         <input 
                            value={globalSettings.logo_url}
                            onChange={e => setGlobalSettings({...globalSettings, logo_url: e.target.value})}
                            placeholder="https://..."
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 font-bold focus:ring-2 focus:ring-[#c1ff72] transition-all"
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Link Mercado Pago (General)</label>
                       <div className="relative">
                         <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                         <input 
                            value={globalSettings.mercadopago_link}
                            onChange={e => setGlobalSettings({...globalSettings, mercadopago_link: e.target.value})}
                            placeholder="https://mpago.la/..."
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 font-bold focus:ring-2 focus:ring-[#c1ff72] transition-all"
                         />
                       </div>
                    </div>
                  </div>

                  <button 
                    disabled={isSaving}
                    className="w-full bg-[#c1ff72] text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#c1ff72]/20 disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Configuración Global'}
                  </button>
               </form>
            </div>
          )}
        </div>
      </main>

      {/* Shared Modal for Creation/Edit */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
               <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-black uppercase italic">{editingItem ? 'Editar' : 'Nuevo'} {activeTab === 'clubs' ? 'Sede' : 'Categoría'}</h2>
                 <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X className="h-5 w-5" /></button>
               </div>
               
               <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  const name = formData.get('name') as string;
                  
                  try {
                    if (activeTab === 'clubs') {
                      if (editingItem) {
                        await updateDoc(doc(db, 'clubs', editingItem.id), { name });
                      } else {
                        await addDoc(collection(db, 'clubs'), { name, created_at: serverTimestamp(), is_active: true });
                      }
                    } else {
                      const data = {
                        name,
                        gender: formData.get('gender'),
                        level_order: parseInt(formData.get('level_order') as string)
                      };
                      if (editingItem) {
                        await updateDoc(doc(db, 'categories', editingItem.id), data);
                      } else {
                        await addDoc(collection(db, 'categories'), { ...data, created_at: serverTimestamp(), is_active: true });
                      }
                    }
                    setIsCreateModalOpen(false);
                  } catch (err) { console.error(err); }
                }}
                className="space-y-6"
              >
                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Nombre</label>
                   <input 
                    name="name"
                    required
                    defaultValue={editingItem?.name || ''}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-[#c1ff72] transition-all"
                   />
                 </div>

                 {activeTab === 'categories' && (
                   <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Género</label>
                        <select 
                          name="gender"
                          defaultValue={editingItem?.gender || 'masculino'}
                          className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                        >
                          <option value="masculino">Masculino</option>
                          <option value="femenino">Femenino</option>
                          <option value="mixto">Mixto</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Orden de Nivel</label>
                        <input 
                          name="level_order"
                          type="number"
                          defaultValue={editingItem?.level_order || 1}
                          className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                        />
                      </div>
                    </div>
                   </>
                 )}

                 <button className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#c1ff72] hover:text-black transition-all">
                   {editingItem ? 'Guardar Cambios' : 'Crear Registro'}
                 </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
