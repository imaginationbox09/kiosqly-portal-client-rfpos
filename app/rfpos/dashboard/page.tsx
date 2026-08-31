'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});

interface Device {
  id: string;
  name: string;
  status: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  date: string;
}

interface SubUser {
  id: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'woo' | 'billing' | 'tickets' | 'whatsapp' | 'users'>('overview');

  // Estados de los módulos
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState('');
  
  // Empresa & Contacto
  const [companyName, setCompanyName] = useState('Mi Restaurante S.A.');
  const [contactPhone, setContactPhone] = useState('+507 6000-0000');

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([
    { id: 'TICK-01', subject: 'Configuración inicial de impresora térmica', status: 'Abierto', date: '2026-08-30' }
  ]);
  const [newTicketSubject, setNewTicketSubject] = useState('');

  // Subusuarios
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          router.push('/rfpos');
        } else {
          setUserEmail(session.user.email || null);
          setUserId(session.user.id);
          fetchDevices(session.user.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, [router]);

  async function fetchDevices(currentUserId: string) {
    const { data, error } = await supabase
      .from('kiosks')
      .select('*')
      .eq('user_id', currentUserId);

    if (!error && data && data.length > 0) {
      setDevices(data);
    } else {
      setDevices([{ id: 'default-1', name: 'Kiosco Principal Kiosqly', status: 'En línea' }]);
    }
  }

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !userId) return;

    const { data, error } = await supabase
      .from('kiosks')
      .insert([{ user_id: userId, name: deviceName, status: 'Prueba / En línea' }])
      .select();

    if (!error && data) {
      setDevices([...devices, data[0]]);
      setDeviceName('');
    } else {
      // Respaldo local si la tabla no está creada aún
      setDevices([...devices, { id: Math.random().toString(), name: deviceName, status: 'En línea' }]);
      setDeviceName('');
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim()) return;
    setTickets([...tickets, { id: `TICK-0${tickets.length + 1}`, subject: newTicketSubject, status: 'Abierto', date: new Date().toISOString().split('T')[0] }]);
    setNewTicketSubject('');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    setSubUsers([...subUsers, { id: Math.random().toString(), email: newUserEmail, role: 'Operador' }]);
    setNewUserEmail('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/rfpos');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500 font-medium">Cargando portal Kiosqly RFPOS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar de Navegación */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white font-bold text-lg">
              K
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base">Kiosqly RFPOS</h1>
              <p className="text-xs text-gray-500">Portal de Clientes</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: '📊 General & Empresa' },
              { id: 'devices', label: '🖥️ Equipos RFPOS' },
              { id: 'woo', label: '🛍️ WooCommerce & Órdenes' },
              { id: 'billing', label: '💳 Facturación & PayPal' },
              { id: 'users', label: '👥 Usuarios' },
              { id: 'tickets', label: '🎫 Soporte / Tickets' },
              { id: 'whatsapp', label: '💬 Chat WhatsApp' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === tab.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate mb-3">{userEmail}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal por Módulos */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* MÓDULO 1: GENERAL & EMPRESA */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Información del Usuario y Empresa</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Nombre de la Empresa</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Correo de Contacto</label>
                  <input
                    type="email"
                    disabled
                    value={userEmail || ''}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">País / Operación</label>
                  <input
                    type="text"
                    disabled
                    value="Panamá"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 2: EQUIPOS RFPOS */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Dar de Alta Equipos RFPOS</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <form onSubmit={handleAddDevice} className="flex gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Nombre o Código del Kiosco (ej. Kiosco Sucursal El Dorado)"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                  />
                  <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white font-medium text-sm hover:bg-gray-800 transition">
                    Dar de Alta
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Equipos Conectados</h3>
                <div className="divide-y divide-gray-100">
                  {devices.map((device) => (
                    <div key={device.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{device.name}</p>
                        <p className="text-xs text-gray-500">ID Hardware: {device.id}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {device.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 3: WOOCOMMERCE & ÓRDENES */}
          {activeTab === 'woo' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Panel WooCommerce & Órdenes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <h3 className="font-bold text-gray-900">Estado de Sincronización</h3>
                  <p className="text-sm text-green-600 font-semibold">● Conectado a Tienda WooCommerce</p>
                  <p className="text-xs text-gray-500">Sincronización automática de menús y productos habilitada.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <h3 className="font-bold text-gray-900">Últimas Órdenes Recibidas</h3>
                  <div className="text-xs text-gray-600 space-y-2">
                    <div className="flex justify-between border-b pb-1"><span>#1042 - Hamburguesa Doble</span><span className="text-green-600 font-bold">$14.50</span></div>
                    <div className="flex justify-between border-b pb-1"><span>#1041 - Combo Kiosco 1</span><span className="text-green-600 font-bold">$9.00</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 4: FACTURACIÓN & PAYPAL */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Suscripción y Facturación (PayPal)</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">Plan Kiosqly RFPOS Pro</h3>
                    <p className="text-xs text-gray-500">Renovación automática mensual</p>
                  </div>
                  <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-xl">$49.00 / mes</span>
                </div>
                <p className="text-sm text-gray-600">
                  Actualiza o vincula tu tarjeta de crédito o cuenta de PayPal de forma segura para procesar tus cobros de suscripción automatizados.
                </p>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-3">
                  <p className="text-xs text-gray-500">Pasarela de Pago Segura integrada con PayPal</p>
                  <button className="rounded-xl bg-[#0070ba] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#005ea6] transition">
                    Pagar / Actualizar Tarjeta con PayPal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 5: CREACIÓN DE USUARIOS */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Panel de Creación de Usuarios</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <form onSubmit={handleCreateUser} className="flex gap-4">
                  <input
                    type="email"
                    required
                    placeholder="correo@operador.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                  />
                  <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white font-medium text-sm hover:bg-gray-800 transition">
                    Crear Operador
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Equipo de Trabajo Asignado</h3>
                <div className="divide-y divide-gray-100">
                  {subUsers.length === 0 ? (
                    <p className="text-xs text-gray-500">No hay subusuarios creados todavía.</p>
                  ) : (
                    subUsers.map((u) => (
                      <div key={u.id} className="py-2 flex justify-between items-center text-sm">
                        <span>{u.email}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">{u.role}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 6: TICKETS DE SOPORTE */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Módulo de Creación de Tickets</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <form onSubmit={handleCreateTicket} className="flex gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Describe tu solicitud o incidencia..."
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                  />
                  <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white font-medium text-sm hover:bg-gray-800 transition">
                    Abrir Ticket
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Historial de Tickets</h3>
                <div className="divide-y divide-gray-100">
                  {tickets.map((t) => (
                    <div key={t.id} className="py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{t.subject}</p>
                        <p className="text-xs text-gray-500">{t.id} - {t.date}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 7: CHAT WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Atención al Cliente vía WhatsApp</h2>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl mx-auto font-bold">
                  💬
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Canal Directo Kiosqly WhatsApp Support</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Atiende consultas de tus clientes o comunícate con nuestro equipo técnico de soporte operativo en tiempo real.
                </p>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-xl bg-green-600 text-white font-bold px-6 py-3 text-sm hover:bg-green-700 transition"
                >
                  Abrir Canal de WhatsApp
                </a>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
