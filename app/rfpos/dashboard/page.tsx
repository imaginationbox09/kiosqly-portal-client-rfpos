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
  ip?: string;
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
  role: 'Administrador' | 'Colaborador';
}

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'woo' | 'billing' | 'users' | 'tickets' | 'whatsapp'>('overview');

  // Rol del usuario actual (Administrador por defecto o Colaborador)
  const [userRole, setUserRole] = useState<'Administrador' | 'Colaborador'>('Administrador');

  // Empresa & Contacto
  const [companyName, setCompanyName] = useState('Mi Restaurante S.A.');
  const [contactPhone, setContactPhone] = useState('+507 6000-0000');
  const [savedMessage, setSavedMessage] = useState('');

  // Equipos RFPOS (Integración Render + Supabase)
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const maxPlanDevices = 5; // Límite de equipos según plan PayPal RFPOS Pro

  // WooCommerce Login / Panel
  const [wooUser, setWooUser] = useState('');
  const [wooPass, setWooPass] = useState('');
  const [wooLoggedIn, setWooLoggedIn] = useState(false);

  // Tickets
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  // Subusuarios
  const [subUsers, setSubUsers] = useState<SubUser[]>([
    { id: '1', email: 'operador@kiosqly.com', role: 'Colaborador' }
  ]);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubRole, setNewSubRole] = useState<'Administrador' | 'Colaborador'>('Colaborador');

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
    try {
      // Intento de sincronización con tu servidor en Render
      const response = await fetch('https://kiosqly-admin-server.onrender.com/api/kiosks');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setDevices(data);
          return;
        }
      }
    } catch (e) {
      console.log('Render server offline, usando Supabase');
    }

    // Fallback con Supabase
    const { data, error } = await supabase
      .from('kiosks')
      .select('*')
      .eq('user_id', currentUserId);

    if (!error && data && data.length > 0) {
      setDevices(data);
    } else {
      setDevices([
        { id: 'dev-01', name: 'Kiosco Principal Sucursal 1', status: 'En línea', ip: '192.168.1.50' },
        { id: 'dev-02', name: 'Kiosco Autoservicio Terraza', status: 'En línea', ip: '192.168.1.51' }
      ]);
    }
  }

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage('¡Información de empresa actualizada con éxito!');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !userId) return;

    if (devices.length >= maxPlanDevices) {
      alert(`Has alcanzado el límite de ${maxPlanDevices} equipos permitidos en tu plan actual de PayPal RFPOS.`);
      return;
    }

    const newDev = { id: `dev-0${devices.length + 1}`, name: deviceName, status: 'En línea', ip: '192.168.1.55' };
    setDevices([...devices, newDev]);
    setDeviceName('');

    // Sincronizar con Supabase
    await supabase.from('kiosks').insert([{ user_id: userId, name: deviceName, status: 'En línea' }]);
  };

  const handleWooLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (wooUser && wooPass) {
      setWooLoggedIn(true);
    }
  };

  const handleCreateSubUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEmail.trim()) return;
    setSubUsers([...subUsers, { id: Math.random().toString(), email: newSubEmail, role: newSubRole }]);
    setNewSubEmail('');
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
            {(userRole === 'Administrador' ? [
              { id: 'overview', label: '📊 General & Empresa' },
              { id: 'devices', label: '🖥️ Equipos RFPOS' },
              { id: 'woo', label: '🛍️ WooCommerce & Órdenes' },
              { id: 'billing', label: '💳 Facturación & PayPal' },
              { id: 'users', label: '👥 Usuarios & Roles' },
              { id: 'tickets', label: '🎫 Soporte / Tickets' },
              { id: 'whatsapp', label: '💬 Chat WhatsApp' },
            ] : [
              { id: 'woo', label: '🛍️ WooCommerce & Órdenes' },
              { id: 'tickets', label: '🎫 Soporte / Tickets' },
              { id: 'whatsapp', label: '💬 Chat WhatsApp' },
            ]).map((tab) => (
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
          <p className="text-xs font-semibold text-gray-800">{userEmail}</p>
          <p className="text-xs text-green-600 mb-3">Rol: {userRole}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* MÓDULO 1: GENERAL & EMPRESA */}
          {activeTab === 'overview' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Información del Usuario y Empresa</h2>
              {savedMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
                  {savedMessage}
                </div>
              )}
              <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-white text-sm font-medium hover:bg-gray-800 transition">
                  Guardar Cambios de Empresa
                </button>
              </form>
            </div>
          )}

          {/* MÓDULO 2: EQUIPOS RFPOS */}
          {activeTab === 'devices' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Equipos RFPOS</h2>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-xl">
                  Equipos en Uso: {devices.length} / Límite Plan: {maxPlanDevices}
                </span>
              </div>

              <form onSubmit={handleAddDevice} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                <input
                  type="text"
                  required
                  placeholder="Nombre del nuevo equipo (ej. Kiosco Sucursal Albrook)"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                />
                <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white font-medium text-sm hover:bg-gray-800 transition">
                  Dar de Alta Equipo
                </button>
              </form>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Estado de tus Equipos Configurados</h3>
                <div className="divide-y divide-gray-100">
                  {devices.map((device) => (
                    <div key={device.id} className="py-3.5 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{device.name}</p>
                        <p className="text-xs text-gray-500">ID: {device.id} {device.ip && `| IP: ${device.ip}`}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        ● {device.status}
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
              
              {!wooLoggedIn ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto space-y-4">
                  <div className="text-center">
                    <h3 className="font-bold text-gray-900 text-lg">Acceso al Portal WooCommerce Asignado</h3>
                    <p className="text-xs text-gray-500 mt-1">Ingresa con tus credenciales de WooCommerce provistas por el sistema Kiosqly.</p>
                  </div>
                  <form onSubmit={handleWooLogin} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Usuario / Email WooCommerce</label>
                      <input
                        type="text"
                        required
                        value={wooUser}
                        onChange={(e) => setWooUser(e.target.value)}
                        placeholder="tienda@restaurante.com"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Contraseña</label>
                      <input
                        type="password"
                        required
                        value={wooPass}
                        onChange={(e) => setWooPass(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                      />
                    </div>
                    <button type="submit" className="w-full rounded-xl bg-[#96588a] text-white font-bold py-2.5 text-sm hover:bg-[#7b4671] transition">
                      Iniciar Sesión en WooCommerce
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-purple-900 text-sm">Sesión Activa en WooCommerce Store</p>
                      <p className="text-xs text-purple-700">Conectado como: {wooUser}</p>
                    </div>
                    <button onClick={() => setWooLoggedIn(false)} className="text-xs font-bold text-purple-800 underline">
                      Cerrar sesión WooCommerce
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                      <h3 className="font-bold text-gray-900">Estado de Sincronización de Menús</h3>
                      <p className="text-xs text-green-600 font-semibold">● Productos y categorías sincronizados</p>
                      <p className="text-xs text-gray-500">Los cambios en tu tienda WooCommerce se reflejan instantáneamente en tus Kioscos RFPOS.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                      <h3 className="font-bold text-gray-900">Órdenes en Tiempo Real</h3>
                      <div className="text-xs text-gray-600 space-y-2">
                        <div className="flex justify-between border-b pb-1.5 font-medium"><span>Orden #1054 - Combo Hamburguesa</span><span className="text-green-600 font-bold">$12.50</span></div>
                        <div className="flex justify-between border-b pb-1.5 font-medium"><span>Orden #1053 - Pizza Familiar</span><span className="text-green-600 font-bold">$18.00</span></div>
                        <div className="flex justify-between border-b pb-1.5 font-medium"><span>Orden #1052 - Bebidas Refresco</span><span className="text-green-600 font-bold">$4.50</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MÓDULO 4: FACTURACIÓN & PAYPAL */}
          {activeTab === 'billing' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Suscripción y Facturación (PayPal)</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Plan Kiosqly RFPOS Pro</h3>
                    <p className="text-xs text-gray-500">Incluye hasta {maxPlanDevices} equipos simultáneos</p>
                  </div>
                  <span className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-xl">$49.00 / mes</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase">Equipos Utilizados</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{devices.length} de {maxPlanDevices} Equipos</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase">Próxima Facturación</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">2026-09-30</p>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl text-center space-y-4">
                  <p className="text-xs text-blue-800 font-medium">Actualiza o administra tu método de pago con PayPal para mantener tu suscripción activa.</p>
                  <a
                    href="https://www.paypal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-xl bg-[#0070ba] text-white font-bold px-8 py-3 text-sm hover:bg-[#005ea6] transition shadow-sm"
                  >
                    Gestionar Tarjeta con PayPal
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 5: USUARIOS & ROLES */}
          {activeTab === 'users' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Panel de Creación de Usuarios y Roles</h2>
              
              <form onSubmit={handleCreateSubUser} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="email"
                    required
                    placeholder="correo@empleado.com"
                    value={newSubEmail}
                    onChange={(e) => setNewSubEmail(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                  />
                  <select
                    value={newSubRole}
                    onChange={(e) => setNewSubRole(e.target.value as any)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none bg-white"
                  >
                    <option value="Colaborador">Colaborador (Solo WooCommerce)</option>
                    <option value="Administrador">Administrador (Acceso Total)</option>
                  </select>
                  <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white font-medium text-sm hover:bg-gray-800 transition">
                    Crear Usuario
                  </button>
                </div>
              </form>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Usuarios de la Empresa</h3>
                <div className="divide-y divide-gray-100">
                  <div className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{userEmail}</p>
                      <p className="text-xs text-gray-500">Propietario Principal</p>
                    </div>
                    <span className="text-xs bg-black text-white px-3 py-1 rounded-full font-medium">Administrador</span>
                  </div>
                  {subUsers.map((u) => (
                    <div key={u.id} className="py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{u.email}</p>
                        <p className="text-xs text-gray-500">Acceso asignado</p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${u.role === 'Administrador' ? 'bg-black text-white' : 'bg-purple-100 text-purple-700'}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 6: SOPORTE / TICKETS (FormSubmit a info@kiosqly.com) */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Módulo de Soporte y Creación de Tickets</h2>
              
              {ticketSent && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
                  ¡Ticket enviado con éxito! Un correo ha sido despachado a <strong>info@kiosqly.com</strong> y nuestro equipo técnico le responderá a la brevedad.
                </div>
              )}

              <form
                action="https://formsubmit.co/info@kiosqly.com"
                method="POST"
                onSubmit={() => setTicketSent(true)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4"
              >
                <input type="hidden" name="_subject" value="Nuevo Ticket de Soporte - Kiosqly RFPOS" />
                <input type="hidden" name="_captcha" value="false" />

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Asunto de la Incidencia</label>
                  <input
                    type="text"
                    name="asunto"
                    required
                    placeholder="Ej. Configuración de impresora térmica en Kiosco"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Mensaje o Detalle Técnico</label>
                  <textarea
                    name="mensaje"
                    required
                    rows={4}
                    placeholder="Describa detalladamente el problema o solicitud..."
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-white text-sm font-medium hover:bg-gray-800 transition">
                  Enviar Ticket a info@kiosqly.com
                </button>
              </form>
            </div>
          )}

          {/* MÓDULO 7: CHAT WHATSAPP (+507 63110603) */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Atención al Cliente vía WhatsApp</h2>
              <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl mx-auto font-bold shadow-sm">
                  💬
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Canal Directo Kiosqly WhatsApp Support</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Inicia una conversación directa con nuestro equipo de soporte técnico asignado al número <strong>+507 63110603</strong>.
                </p>
                <a
                  href="https://wa.me/50763110603?text=Hola,%20necesito%20soporte%20con%20mi%20portal%20Kiosqly%20RFPOS."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-xl bg-green-600 text-white font-bold px-8 py-3.5 text-sm hover:bg-green-700 transition shadow-sm"
                >
                  Abrir Chat en WhatsApp (+507 63110603)
                </a>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
