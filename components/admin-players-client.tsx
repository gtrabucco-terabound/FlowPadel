'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
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
  Phone,
  Mail,
  Calendar
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

export function AdminPlayersClient() {
  const [user, setUser] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    let unsubscribePlayers: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin/login');
      } else {
        setUser(user);
        
        const playersRef = collection(db, 'players');
        const q = query(playersRef, orderBy('full_name', 'asc'));

        unsubscribePlayers = onSnapshot(q, (snapshot) => {
          const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...sanitizeData(doc.data())
          }));
          setPlayers(playersData);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching players:', error);
          setLoading(false);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribePlayers();
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleDeletePlayer = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este jugador?')) {
      try {
        await deleteDoc(doc(db, 'players', id));
      } catch (error) {
        console.error('Error deleting player:', error);
      }
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      const playerRef = doc(db, 'players', editingPlayer.id);
      await updateDoc(playerRef, {
        full_name: editingPlayer.full_name || '',
        phone: editingPlayer.phone || '',
        email: editingPlayer.email || '',
        updated_at: new Date().toISOString()
      });
      setEditingPlayer(null);
    } catch (error) {
      console.error('Error updating player:', error);
    }
  };

  const filteredPlayers = players.filter(player => 
    player.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone?.includes(searchTerm) ||
    player.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">Cargando Jugadores...</div>;

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
          <Link href="/admin/players" className="flex items-center gap-3 p-4 rounded-2xl bg-[#c1ff72] text-black font-bold text-sm uppercase tracking-wider">
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
            <h1 className="text-4xl font-black uppercase italic tracking-tight mb-2">Jugadores</h1>
            <p className="text-gray-500 font-medium">Gestiona la base de datos de jugadores registrados.</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#c1ff72] focus:border-transparent outline-none transition-all font-medium"
            />
          </div>
        </header>

        {/* Players List */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Jugador</th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Contacto</th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Fecha Registro</th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-gray-500 font-medium italic">
                      No se encontraron jugadores.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-gray-400 italic">
                            {player.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black uppercase italic text-lg group-hover:text-[#c1ff72] transition-colors">
                              {player.full_name}
                            </div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              ID: {player.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-[#c1ff72]" />
                            {player.phone || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                            <Mail className="h-3.5 w-3.5" />
                            {player.email || 'Sin email'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                          <Calendar className="h-4 w-4 text-[#c1ff72]" />
                          {player.created_at ? format(new Date(player.created_at), "d MMM, yyyy", { locale: es }) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setEditingPlayer(player)}
                            className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleDeletePlayer(player.id)}
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

      {/* Edit Player Modal */}
      <AnimatePresence>
        {editingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPlayer(null)}
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
                  <h2 className="text-3xl font-black uppercase italic tracking-tight">Editar Jugador</h2>
                  <button 
                    onClick={() => setEditingPlayer(null)}
                    className="p-3 hover:bg-gray-100 rounded-2xl transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdatePlayer} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        required
                        value={editingPlayer.full_name || ''}
                        onChange={(e) => setEditingPlayer({...editingPlayer, full_name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold text-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Teléfono</label>
                        <input 
                          type="text" 
                          value={editingPlayer.phone || ''}
                          onChange={(e) => setEditingPlayer({...editingPlayer, phone: e.target.value})}
                          className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Email</label>
                        <input 
                          type="email" 
                          value={editingPlayer.email || ''}
                          onChange={(e) => setEditingPlayer({...editingPlayer, email: e.target.value})}
                          className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#c1ff72] outline-none transition-all font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setEditingPlayer(null)}
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
