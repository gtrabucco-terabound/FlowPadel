'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  Settings, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activePage: 'dashboard' | 'players' | 'categories' | 'settings';
}

export function AdminSidebar({ activePage }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'players', label: 'Jugadores', href: '/admin/players', icon: Users },
    { id: 'categories', label: 'Categorías', href: '/admin/categories', icon: Trophy },
    { id: 'settings', label: 'Ajustes', href: '/admin/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-[#141414] text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-xl">
        <div className="text-xl font-black italic uppercase">
          Padel<span className="text-[#c1ff72]">Flow</span>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-72 bg-[#141414] text-white p-8 flex flex-col hidden lg:flex sticky top-0 h-screen">
        <div className="text-2xl font-black italic uppercase mb-12">
          Padel<span className="text-[#c1ff72]">Flow</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 p-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all ${
                activePage === item.id 
                  ? 'bg-[#c1ff72] text-black shadow-lg shadow-[#c1ff72]/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="h-5 w-5" /> {item.label}
            </Link>
          ))}
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-4 rounded-2xl text-red-400 hover:bg-red-400/10 font-bold text-sm uppercase tracking-wider transition-all mt-auto"
        >
          <LogOut className="h-5 w-5" /> Cerrar Sesión
        </button>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-[#141414] text-white p-8 z-[60] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="text-2xl font-black italic uppercase text-[#c1ff72]">
                  Flow<span className="text-white">Nav</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-3">
                {navItems.map((item) => (
                  <Link 
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 p-5 rounded-2xl font-black text-base uppercase tracking-widest transition-all ${
                      activePage === item.id 
                        ? 'bg-[#c1ff72] text-black shadow-lg shadow-[#c1ff72]/20' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="h-6 w-6" /> {item.label}
                  </Link>
                ))}
              </nav>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-4 p-5 rounded-2xl text-red-400 hover:bg-red-400/10 font-black text-base uppercase tracking-widest transition-all mt-auto border border-red-400/20"
              >
                <LogOut className="h-6 w-6" /> Cerrar Sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
