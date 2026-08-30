'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  }
);

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/rfpos'); // Si no hay sesión, regresa al login
      } else {
        setUserEmail(session.user.email || null);
        setLoading(false);
      }
    }
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/rfpos');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Cargando portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white font-bold text-xl">
              K
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Kiosqly RFPOS</h1>
              <p className="text-sm text-gray-500">Panel de Control del Cliente</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Usuario Conectado</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1 truncate">{userEmail}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Estado del Kiosco</h3>
            <p className="text-lg font-semibold text-green-600 mt-1">Activo y en línea</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Suscripción RFPOS</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1">Plan Activo</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Bienvenido a tu portal Kiosqly</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Desde aquí podrás gestionar la configuración de tus menús interactivos, costos y dispositivos self-service.
          </p>
        </div>
      </div>
    </div>
  );
}