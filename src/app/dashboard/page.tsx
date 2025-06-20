'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/app/components/SupabaseProvider';

export default function DashboardPage() {
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const [estaCargando, setEstaCargando] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/iniciar-sesion');
      return;
    }
  }, [user, router]);

  const manejarCerrarSesion = async () => {
    setEstaCargando(true);
    await supabase.auth.signOut();
    router.push('/auth/iniciar-sesion');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200">
      {/* Header simple */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Banco de Alimentos
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Bienvenido, {user.user_metadata?.nombre ?? user.email}
              </span>
              
              <button
                onClick={manejarCerrarSesion}
                disabled={estaCargando}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {estaCargando ? 'Cerrando...' : 'Cerrar Sesión'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido en blanco */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard
            </h2>
            <p className="text-gray-600">
              El contenido del dashboard estará disponible próximamente.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 