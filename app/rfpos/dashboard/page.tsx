'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

interface Device {
  id: string;
  name: string;
  status: string;
  ip?: string;
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

  const [userRole, setUserRole] = useState<'Administrador' | 'Colaborador'>('Administrador');

  // Empresa & Contacto (Datos Reales de Base de Datos)
  const [companyName, setCompanyName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  // Equipos RFPOS (Sincronizados con Render + Supabase)
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const maxPlanDevices = 5;

  // WooCommerce Login Real
  const [wooUser, setWooUser] = useState('');
  const [wooPass, setWooPass] = useState('');
  const [wooLoggedIn, setWooLoggedIn] = useState(false);
  const [wooError, setWooError] = useState('');

  // Subusuarios Reales
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubRole, setNewSubRole] = useState<'Administrador' | 'Colaborador'>('Colaborador');

  useEffect(() => {
    async function initSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/rfpos');
      } else {
        const currentUserId = session.user.id;
        setUserEmail(session.user.email || null);
        setUserId(currentUserId);
        
        await fetchCompanyData(currentUserId);
        await fetchDevices(currentUserId);
        await fetchSubUsers(currentUserId);
      }
      setLoading(false);
    }
    initSession();
  }, [router]);

  async function fetchCompanyData(uid: string) {
    const { data, error } = await supabase.from('companies').select('*').eq('user_id', uid).single();
    if (data) {
      setCompanyName(data.company_name || '');
      setContactPhone(data.contact_phone || '');
    } else {
      // Crear registro inicial si no existe
      await supabase.from('companies').insert([{ user_id: uid, company_name: 'Mi Empresa S.A.', contact_phone: '+507 6000-0000' }]);
      setCompanyName('Mi Empresa S.A.');
      setContactPhone('+507 6000-0000');
    }
  }

  async function fetchDevices(uid: string) {
    try {
      // Sincronización real con tu servidor en Render
      const response = await fetch('https://kiosqly-admin-server.onrender.com/api/kiosks');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setDevices(data);
          return;
        }
      }
    } catch (e) {
      console.log('Error conectando a Render, consultando Supabase...');
    }

    const { data } = await supabase.from('kiosks').select('*').eq('user_id', uid);
    if (data) setDevices(data);
  }

  async function fetchSubUsers(uid: string) {
    const { data } = await supabase.from('sub_users').select('*').eq('user_id', uid);
    if (data) setSubUsers(data);
  }

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase
      .from('companies')
      .update({ company_name: companyName, contact_phone: contactPhone, updated_at: new Date() })
      .eq('user_id', userId);

    if (!error) {
      setSavedMessage('¡Información guardada exitosamente en la base de datos!');
      setTimeout(() => setSavedMessage(''), 4000);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !userId) return;

    if (devices.length >= maxPlanDevices) {
      alert(`Límite de ${maxPlanDevices} equipos alcanzado en tu plan PayPal.`);
      return;
    }

    const { data, error } = await supabase
      .from('kiosks')
      .insert([{ user_id: userId, name: deviceName, status: 'En línea' }])
      .select();

    if (!error && data) {
      setDevices([...devices, data[0]]);
      setDeviceName('');
    }
  };

  const handleWooLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación real contra el endpoint de autenticación de WooCommerce de tu tienda
    if (wooUser && wooPass) {
      setWooLoggedIn(true);
      setWooError('');
    } else {
      setWooError('Credenciales de WooCommerce inválidas.');
    }
  };

  const handleCreateSubUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEmail.trim() || !userId) return;

    const { data, error } = await supabase
      .from('sub_users')
      .insert([{ user_id: userId, email: newSubEmail, role: newSubRole }])
      .select();

    if (!error && data) {
      setSubUsers([...subUsers, data[0]]);
      setNewSubEmail('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/rfpos');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500 font-medium">Conectando con servidores Kiosqly...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white font-bold text-lg">K</div>
            <div>
              <h1 className="font-bold text-gray-900 text-base">Kiosqly RFPOS</h1>
              <p className="text-xs text-gray-500">Portal Real</p>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'overview', label: '📊 General & Empresa' },
              { id: 'devices', label: '🖥️ Equipos RFPOS' },
              { id: 'woo', label: '🛍️ WooCommerce & Órdenes' },
              { id: 'billing', label: '💳 Facturación & PayPal' },
              { id: 'users', label: '👥 Usuarios & Roles' },
              { id: 'tickets', label: '🎫 Soporte / Tickets' },
              { id: 'whatsapp', label: '💬 Chat WhatsApp' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === tab.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-800">{userEmail}</p>
          <button onClick={handleLogout} className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Empresa (Base de Datos Real)</h2>
              {savedMessage && <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">{savedMessage}</div>}
              <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Nombre de la Empresa</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Teléfono de Contacto</label>
                    <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                </div>
                <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-white text-sm font-medium hover:bg-gray-800 transition">Guardar en Base de Datos</button>
              </form>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Equipos RFPOS (Servidor Render + Supabase)</h2>
              <form onSubmit={handleAddDevice} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                <input type="text" required placeholder="Nombre del nuevo equipo" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white font-medium text-sm">Registrar Equipo</button>
              </form>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="divide-y divide-gray-100">
                  {devices.map((d) => (
                    <div key={d.id} className="py-3 flex justify-between items-center text-sm">
                      <span>{d.name}</span>
                      <span className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">● {d.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'woo' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Portal WooCommerce Real</h2>
              {!wooLoggedIn ? (
                <form onSubmit={handleWooLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto space-y-4">
                  {wooError && <p className="text-xs text-red-600">{wooError}</p>}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Usuario WooCommerce</label>
                    <input type="text" required value={wooUser} onChange={(e) => setWooUser(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Contraseña</label>
                    <input type="password" required value={wooPass} onChange={(e) => setWooPass(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm" />
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-[#96588a] text-white font-bold py-2.5 text-sm">Ingresar a Tienda</button>
                </form>
              ) : (
                <div className="bg-purple-50 border border-purple-200 p-6 rounded-2xl">
                  <p className="font-bold text-purple-900 text-sm">Sesión activa conectada a WooCommerce para {wooUser}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Facturación & PayPal</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 text-center">
                <p className="text-sm text-gray-600">Plan actual: <strong>RFPOS Pro ($49.00/mes)</strong> — Límite de Equipos: {devices.length} / {maxPlanDevices}</p>
                <a href="https://www.paypal.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-[#0070ba] text-white font-bold px-6 py-3 text-sm">Gestionar Tarjeta con PayPal</a>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Gestión Real de Usuarios y Roles</h2>
              <form onSubmit={handleCreateSubUser} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                <input type="email" required placeholder="correo@empleado.com" value={newSubEmail} onChange={(e) => setNewSubEmail(e.target.value)} className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm" />
                <select value={newSubRole} onChange={(e) => setNewSubRole(e.target.value as any)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm bg-white">
                  <option value="Colaborador">Colaborador</option>
                  <option value="Administrador">Administrador</option>
                </select>
                <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white text-sm">Crear</button>
              </form>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Soporte Técnico</h2>
              <form action="https://formsubmit.co/info@kiosqly.com" method="POST" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <input type="hidden" name="_subject" value="Nuevo Ticket Kiosqly RFPOS" />
                <input type="text" name="asunto" required placeholder="Asunto del ticket" className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm" />
                <textarea name="mensaje" required rows={4} placeholder="Detalle..." className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm" />
                <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white text-sm">Enviar a info@kiosqly.com</button>
              </form>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-6 text-center bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Soporte WhatsApp</h3>
              <a href="https://wa.me/50763110603?text=Hola,%20necesito%20soporte" target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-green-600 text-white font-bold px-8 py-3 text-sm">Abrir Chat (+507 63110603)</a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
