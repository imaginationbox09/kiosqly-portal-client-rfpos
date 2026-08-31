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

interface Subscription {
  plan_name: string;
  max_devices: number;
  status: string;
  next_billing: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

declare global {
  interface Window {
    paypal: any;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const [userRole, setUserRole] = useState<'Administrador' | 'Colaborador'>('Administrador');

  // Empresa
  const [companyName, setCompanyName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  // Equipos y Planes PayPal
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [subscription, setSubscription] = useState<Subscription>({
    plan_name: 'RFPOS Pro',
    max_devices: 5,
    status: 'Activo',
    next_billing: '2026-09-30'
  });

  // Subusuarios
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubRole, setNewSubRole] = useState<'Administrador' | 'Colaborador'>('Colaborador');

  // Soporte y Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);

  useEffect(() => {
    async function initSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/rfpos');
      } else {
        const currentUserId = session.user.id;
        const currentEmail = session.user.email || '';
        setUserEmail(currentEmail);
        setUserId(currentUserId);

        const { data: subData } = await supabase
          .from('sub_users')
          .select('role')
          .eq('email', currentEmail)
          .single();

        if (subData && subData.role === 'Colaborador') {
          setUserRole('Colaborador');
          setActiveTab('woo');
        } else {
          setUserRole('Administrador');
          setActiveTab('overview');
        }

        await fetchCompanyData(currentUserId);
        await fetchDevices(currentUserId);
        await fetchSubscription(currentUserId);
        await fetchSubUsers(currentUserId);
        await fetchTickets(currentUserId);
      }
      setLoading(false);
    }
    initSession();
  }, [router]);

  // Renderizar SDK de PayPal dinámicamente cuando esté en la pestaña de facturación
  useEffect(() => {
    if (activeTab === 'billing' && userRole === 'Administrador') {
      const scriptId = 'paypal-sdk-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://www.paypal.com/sdk/js?client-id=BAA0zPEyaslOX6mT5nondXBuZ61iWGULglR0ACvU8m8gcs99dAEzpIou4bDCIEZ2KpI8lgXVPJI2X1W5fs&vault=true&intent=subscription';
        script.async = true;
        script.onload = () => renderPayPalButtons();
        document.body.appendChild(script);
      } else {
        renderPayPalButtons();
      }
    }
  }, [activeTab, devices.length]);

  function renderPayPalButtons() {
    const container = document.getElementById('paypal-button-container-P-5XX972822Y4491137NKJSEEY');
    if (container && window.paypal) {
      container.innerHTML = '';
      window.paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe'
        },
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({
            plan_id: 'P-5XX972822Y4491137NKJSEEY',
            quantity: devices.length > 0 ? devices.length : 1 // Cantidad basada en equipos activos asignados
          });
        },
        onApprove: function(data: any, actions: any) {
          alert('¡Suscripción de PayPal procesada con éxito! ID de Suscripción: ' + data.subscriptionID);
        }
      }).render('#paypal-button-container-P-5XX972822Y4491137NKJSEEY');
    }
  }

  async function fetchCompanyData(uid: string) {
    const { data } = await supabase.from('companies').select('*').eq('user_id', uid).single();
    if (data) {
      setCompanyName(data.company_name || '');
      setContactPhone(data.contact_phone || '');
    } else {
      await supabase.from('companies').insert([{ user_id: uid, company_name: 'Mi Restaurante S.A.', contact_phone: '+507 6000-0000' }]);
      setCompanyName('Mi Restaurante S.A.');
      setContactPhone('+507 6000-0000');
    }
  }

  async function fetchDevices(uid: string) {
    const { data } = await supabase.from('kiosks').select('*').eq('user_id', uid);
    if (data) setDevices(data);
  }

  async function fetchSubscription(uid: string) {
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', uid).single();
    if (data) setSubscription(data);
  }

  async function fetchSubUsers(uid: string) {
    const { data } = await supabase.from('sub_users').select('*').eq('user_id', uid);
    if (data) setSubUsers(data);
  }

  async function fetchTickets(uid: string) {
    const { data } = await supabase.from('tickets').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (data) setTickets(data);
  }

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase
      .from('companies')
      .update({ company_name: companyName, contact_phone: contactPhone, updated_at: new Date() })
      .eq('user_id', userId);

    if (!error) {
      setSavedMessage('¡Información de empresa actualizada con éxito!');
      setTimeout(() => setSavedMessage(''), 4000);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !userId) return;

    const { data, error } = await supabase
      .from('kiosks')
      .insert([{ user_id: userId, name: deviceName, status: 'En línea', ip: '192.168.1.60' }])
      .select();

    if (!error && data) {
      setDevices([...devices, data[0]]);
      setDeviceName('');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !ticketSubject.trim() || !ticketMessage.trim()) return;

    const { data, error } = await supabase
      .from('tickets')
      .insert([{ user_id: userId, subject: ticketSubject, message: ticketMessage, status: 'Abierto' }])
      .select();

    if (!error && data) {
      setTickets([data[0], ...tickets]);
      setTicketSubject('');
      setTicketMessage('');
      setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 4000);
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
        <p className="text-sm text-gray-500 font-medium">Cargando portal Kiosqly RFPOS...</p>
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
              <p className="text-xs text-gray-500">Portal de Clientes</p>
            </div>
          </div>

          <nav className="space-y-1">
            {(userRole === 'Administrador' ? [
              { id: 'overview', label: '📊 General & Empresa' },
              { id: 'devices', label: '🖥️ Equipos RFPOS' },
              { id: 'woo', label: '🛍️ WooCommerce & Tienda' },
              { id: 'billing', label: '💳 Facturación & PayPal' },
              { id: 'users', label: '👥 Usuarios & Roles' },
              { id: 'tickets', label: '🎫 Soporte & Tickets' },
              { id: 'whatsapp', label: '💬 Chat WhatsApp' },
            ] : [
              { id: 'woo', label: '🛍️ WooCommerce & Tienda' },
              { id: 'tickets', label: '🎫 Soporte & Tickets' },
              { id: 'whatsapp', label: '💬 Chat WhatsApp' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          {activeTab === 'overview' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Información del Usuario y Empresa</h2>
              {savedMessage && <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">{savedMessage}</div>}
              <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Nombre de la Empresa</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Correo de Contacto</label>
                    <input type="email" disabled value={userEmail || ''} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Teléfono de Contacto</label>
                    <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">País / Operación</label>
                    <input type="text" disabled value="Panamá" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500" />
                  </div>
                </div>
                <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-white text-sm font-medium hover:bg-gray-800 transition">Guardar Cambios</button>
              </form>
            </div>
          )}

          {activeTab === 'devices' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Equipos RFPOS</h2>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-xl">
                  Equipos Activos: {devices.length}
                </span>
              </div>

              <form onSubmit={handleAddDevice} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                <input type="text" required placeholder="Nombre del nuevo equipo (ej. Kiosco Caja 2)" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white font-medium text-sm">Dar de Alta</button>
              </form>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Equipos Registrados en el Sistema</h3>
                <div className="divide-y divide-gray-100">
                  {devices.map((device) => (
                    <div key={device.id} className="py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{device.name}</p>
                        <p className="text-xs text-gray-500">IP Asignada: {device.ip || '192.168.1.60'}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">● {device.status}</span>
                    </div>
                  ))}
                  {devices.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No hay equipos dados de alta todavía.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'woo' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Sincronización WooCommerce</h2>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-xl mx-auto text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 text-2xl mx-auto font-bold">W</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Conectar con WooCommerce / WordPress.com</h3>
                  <p className="text-xs text-gray-500 mt-1">Autoriza el acceso a tu tienda para sincronizar productos, menús y órdenes en tiempo real con tus equipos RFPOS.</p>
                </div>
                <a
                  href="https://wordpress.com/log-in/es?client_id=50916&redirect_to=https%3A%2F%2Fpublic-api.wordpress.com%2Foauth2%2Fauthorize%2F%3Fresponse_type%3Dcode%26client_id%3D50916%26state%3D0f66f6b1e0db902c7d2ff833056b9f2acefff282fb94ee04bdf884e9f68277ee%26redirect_uri%3Dhttps%253A%252F%252Fwoocommerce.com%252Fwc-api%252Fwpcom-signin%253Fnext%253D%25252Fes%25252F%2526original_referrer%253Dhttps%25253A%252F%25252Fwww.google.com%25252F%26blog_id%3D0%26wpcom_connect%3D1%26wccom-from%26calypso_env%3Dproduction%26locale%3Des%26from-calypso%3D1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full rounded-xl bg-[#96588a] text-white font-bold py-3 text-sm hover:bg-[#7b4671] transition"
                >
                  Conectar con WooCommerce.com
                </a>
              </div>
            </div>
          )}

          {activeTab === 'billing' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Facturación & Suscripción PayPal</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Plan Kiosqly RFPOS (Cobro por Equipo)</h3>
                    <p className="text-xs text-gray-500">Cantidad actual vinculada a la suscripción: <strong>{devices.length || 1} equipo(s)</strong></p>
                  </div>
                  <span className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-xl">Activo</span>
                </div>
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-4">
                  <p className="text-xs text-gray-600 font-medium">Realiza o actualiza tu pago de suscripción mensual vía PayPal de forma automática:</p>
                  <div id="paypal-button-container-P-5XX972822Y4491137NKJSEEY" className="flex justify-center"></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Subusuarios y Roles</h2>
              <form onSubmit={handleCreateSubUser} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="email" required placeholder="empleado@restaurante.com" value={newSubEmail} onChange={(e) => setNewSubEmail(e.target.value)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm" />
                  <select value={newSubRole} onChange={(e) => setNewSubRole(e.target.value as any)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm bg-white">
                    <option value="Colaborador">Colaborador (Solo Tienda)</option>
                    <option value="Administrador">Administrador (Acceso Total)</option>
                  </select>
                  <button type="submit" className="rounded-xl bg-black px-6 py-2 text-white font-medium text-sm">Crear Subusuario</button>
                </div>
              </form>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Usuarios Autorizados</h3>
                <div className="divide-y divide-gray-100">
                  {subUsers.map((u) => (
                    <div key={u.id} className="py-3 flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-900">{u.email}</span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${u.role === 'Administrador' ? 'bg-black text-white' : 'bg-purple-100 text-purple-700'}`}>{u.role}</span>
                    </div>
                  ))}
                  {subUsers.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No hay subusuarios creados todavía.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Soporte Técnico & Récord de Tickets</h2>
              {ticketSuccess && <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">¡Ticket creado y registrado exitosamente!</div>}
              
              <form onSubmit={handleCreateTicket} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-md">Crear Nuevo Ticket</h3>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Asunto</label>
                  <input type="text" required value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} placeholder="Ej. Problema con sincronización de impresora" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Detalle del Requerimiento</label>
                  <textarea required rows={3} value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} placeholder="Describe detalladamente el inconveniente..." className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                </div>
                <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-white text-sm font-medium hover:bg-gray-800 transition">Enviar y Registrar Ticket</button>
              </form>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Historial de Récord de Tickets</h3>
                <div className="divide-y divide-gray-100">
                  {tickets.map((t) => (
                    <div key={t.id} className="py-4 space-y-1 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">{t.subject}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{t.status}</span>
                      </div>
                      <p className="text-gray-600 text-xs">{t.message}</p>
                      <p className="text-gray-400 text-[10px]">Registrado el: {new Date(t.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {tickets.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Aún no hay tickets registrados en tu historial.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-6 text-center bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl mx-auto font-bold">💬</div>
              <h3 className="font-bold text-gray-900 text-lg">Canal de Asistencia WhatsApp</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">Comunícate en tiempo real con nuestros ingenieros de soporte técnico llamando o escribiendo al <strong>+507 63110603</strong>.</p>
              <a href="https://wa.me/50763110603?text=Hola,%20necesito%20asistencia%20con%20mi%20portal%20RFPOS." target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-green-600 text-white font-bold px-8 py-3.5 text-sm hover:bg-green-700 transition">Abrir WhatsApp (+507 63110603)</a>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
