'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Lock, Mail, Key, ArrowRight, Chrome } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales inválidas. Por favor, intente de nuevo.');
      } else if (err.code === 'auth/configuration-not-found') {
        setError('El inicio de sesión con email no está habilitado en Firebase Console.');
      } else {
        setError('Error de conexión. Verifique su internet o configuración de Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Error al iniciar sesión con Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-12">
          <Link href="/" className="text-4xl font-black italic uppercase text-white tracking-tighter mb-4 inline-block">
            Padel<span className="text-[#c1ff72]">Flow</span>
          </Link>
          <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px]">Admin Access Only</p>
        </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
              <div className="mb-8 text-center">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  Se recomienda usar <span className="text-[#c1ff72]">Google Login</span> para el primer acceso.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                <Mail className="h-3 w-3" /> Email Address
              </label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-[#c1ff72] focus:border-transparent transition-all outline-none"
                placeholder="admin@padelflow.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                <Key className="h-3 w-3" /> Password
              </label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-[#c1ff72] focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-[10px] font-bold uppercase tracking-wider text-center"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-[#c1ff72] text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-[#1a1a1a] px-4 text-gray-500 font-bold">Or continue with</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <Chrome className="h-5 w-5 text-[#c1ff72]" />
              {googleLoading ? 'Connecting...' : 'Sign In with Google'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-gray-600 text-[10px] font-bold uppercase tracking-widest">
          Secure Environment • SSL Encrypted
        </p>
      </motion.div>
    </div>
  );
}
