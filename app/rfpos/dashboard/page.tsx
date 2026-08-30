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

interface Device {
  id: string;
  name: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/rfpos');
      } else {
        setUserEmail(session.user.email || null);
        setUserId(session.user.id);
        fetchDevices(session.user.id);
      }
    }
    checkUser();
  }, [router]);

  async function fetchDevices(currentUserId: string) {
    const { data, error } = await supabase
      .from('kiosks')
      .select('*')
      .eq('user_id', currentUserId);

    if (!error && data) {
      setDevices(data);
    }
    setLoading(false);
  }

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !userId) return;
    setAdding(true);

    const { data, error } = await supabase
      .from('kiosks')
      .insert([
        { user_id: userId, name: deviceName, status: 'Prueba / En línea' }
      ])
      .select();

    if (error) {
      alert('Error al registrar equipo: ' + error.message);
    } else if (data) {
      setDevices([...devices, data[0]]);
      setDeviceName('');
    }
    setAdding(false);
  };

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

        {/* Tarjetas informativas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Usuario Conectado</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1 truncate">{userEmail}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Equipos Registrados</h3>
            <p className="text-lg font-semibold text-green-600 mt-1">{devices.length} Activos</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Suscripción RFPOS</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1">Plan Activo</p>
          </div>
        </div>

        {/* Formulario para agregar equipo de prueba */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Agregar Equipo de Prueba / Kiosco</h2>
          <form onSubmit={handleAddDevice} className="flex gap-4">
            <input
              type="text"
              required
              placeholder="Nombre del equipo (ej. Kiosco Sucursal Central)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-black px-6 py-2 text-white font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              {adding ? 'Registrando...' : 'Registrar Equipo'}
            </button>
          </form>
        </div>

        {/* Lista de equipos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Tus Kioscos y Equipos</h2>
          {devices.length === 0 ? (
            <p className="text-sm text-gray-500">No tienes equipos de prueba registrados todavía.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {devices.map((device) => (
                <div key={device.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{device.name}</p>
                    <p className="text-xs text-gray-500">ID: {device.id}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    {device.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
