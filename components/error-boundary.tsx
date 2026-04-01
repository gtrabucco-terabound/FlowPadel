'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 text-[#1a1a1a] font-sans">
          <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl text-center border border-gray-100">
            <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-black uppercase italic mb-4">Algo salió mal</h2>
            
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Se produjo un error inesperado. Esto puede deberse a un problema de conexión o un error en los datos.
            </p>

            <div className="bg-gray-50 p-4 rounded-xl mb-8 text-left overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Detalles del error:</p>
              <p className="text-xs font-mono text-red-500 break-words">
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" /> Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
