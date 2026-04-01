'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Settings, 
  Users, 
  Trophy, 
  LogOut, 
  LayoutDashboard, 
  Search,
  Trash2,
  Edit2,
  X,
  Check,
  Calendar,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

export function AdminCategoriesClient() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', gender: 'masculino', level_order: 1 });
  const router = useRouter();

  useEffect(() => {
    let unsubscribeCategories: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin/login');
      } else {
        setUser(user);
        
        const categoriesRef = collection(db, 'categories');
        const q = query(categoriesRef, orderBy('name', 'asc'));

        unsubscribeCategories = onSnapshot(q, (snapshot) => {
          const categoriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...sanitizeData(doc.data())
          }));
          setCategories(categoriesData);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching categories:', error);
          setLoading(false);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCategories();
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'categories'), {
        ...newCategory,
        is_active: true,
        created_at: new Date().toISOString()
      });
      setIsCreateModalOpen(false);
      setNewCategory({ name: '', gender: 'masculino', level_order: 1 });
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      const categoryRef = doc(db, 'categories', editingCategory.id);
      await updateDoc(categoryRef, {
        name: editingCategory.name || '',
        gender: editingCategory.gender || 'masculino',
        level_order: editingCategory.level_order ?? 1,
        updated_at: new Date().toISOString()
      });
      setEditingCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const filteredCategories = categories.filter(category => 
    category.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">Cargando Categorías...</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-[#141414] text-white p-8 flex flex-col hidden lg:flex">
        <div className="text-2xl font-black italic uppercase mb-12">
          Padel<span className="text-[#c1ff72]">Flow</span>
        </div>

        <nav className="flex-1 space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 p-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-bold text-sm uppercase tracking-wider transition-all">
            <LayoutDashboard className="h-5 w-5" /> Dashboard
          </Link>
          <Link href="/admin/players" className="flex items-center gap-3 p-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-bold text-sm uppercase tracking-wider transition-all">
            <Users className="h-5 w-5" /> Jugadores
          </Link>
          <Link href="/admin/categories" className="flex items-center gap-3 p-4 rounded-2xl bg-[#c1ff72] text-black font-bold text-sm uppercase tracking-wider">
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
            <h1 className="text-4xl font-black uppercase italic tracking-tight mb-2">Categorías</h1>
            <p className="text-gray-500 font-medium">Gestiona las categorías de tus torneos.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#c1ff72] focus:border-transparent outline-none transition-all font-medium"
              />
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-black text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all"
            >
              <Plus className="h-5 w-5" /> Nueva Categoría
            </button>
          </div>
        </header>

        {/* Categories List */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Categoría</th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Género</th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Orden de Nivel</th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-gray-500 font-medium italic">
                      No se encontraron categorías.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-gray-400 italic">
                            <Tag className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="font-black uppercase italic text-lg group-hover:text-[#c1ff72] transition-colors">
                              {category.name}
                            </div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              ID: {category.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                          category.gender === 'masculino' ? 'bg-blue-100 text-blue-700' : 
                          category.gender === 'femenino' ? 'bg-pink-100 text-pink-700' : 
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {category.gender}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-gray-600">
                          Nivel {category.level_order}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setEditingCategory(category)}
                            className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Category Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 md:p-12">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black uppercase italic tracking-tight">Nueva Categoría</h2>
                  <button 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-3 hover:bg-gray-100 rounded-2xl transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleCreateCategory} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Nombre de la Categoría</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej: 4ta Masculina"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold text-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Género</label>
                        <select 
                          value={newCategory.gender}
                          onChange={(e) => setNewCategory({...newCategory, gender: e.target.value})}
                          className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold"
                        >
                          <option value="masculino">Masculino</option>
                          <option value="femenino">Femenino</option>
                          <option value="mixto">Mixto</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Orden de Nivel</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          value={newCategory.level_order}
                          onChange={(e) => setNewCategory({...newCategory, level_order: parseInt(e.target.value)})}
                          className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-5 w-5" /> Crear Categoría
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Category Modal */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCategory(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 md:p-12">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black uppercase italic tracking-tight">Editar Categoría</h2>
                  <button 
                    onClick={() => setEditingCategory(null)}
                    className="p-3 hover:bg-gray-100 rounded-2xl transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateCategory} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Nombre de la Categoría</label>
                      <input 
                        type="text" 
                        required
                        value={editingCategory.name || ''}
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold text-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Género</label>
                        <select 
                          value={editingCategory.gender || 'masculino'}
                          onChange={(e) => setEditingCategory({...editingCategory, gender: e.target.value})}
                          className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold"
                        >
                          <option value="masculino">Masculino</option>
                          <option value="femenino">Femenino</option>
                          <option value="mixto">Mixto</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Orden de Nivel</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          value={editingCategory.level_order ?? 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setEditingCategory({...editingCategory, level_order: isNaN(val) ? 1 : val});
                          }}
                          className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="h-5 w-5" /> Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
