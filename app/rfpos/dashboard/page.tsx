'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL as string) || '';
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Device {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  installation_date: string;
  status: string;
  ip: string;
  battery_level?: number;
  wifi_signal?: string;
  charging_status?: string;
  last_seen?: string;
  branch_name?: string;
  created_at?: string;
}

interface SubUser {
  id: string;
  email: string;
  role: 'Administrador' | 'Colaborador';
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500 font-medium">Cargando portal Kiosqly RFPOS...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [userRole, setUserRole] = useState<'Administrador' | 'Colaborador'>('Administrador');

  // Empresa
  const [companyName, setCompanyName] = useState('');
  const [rucNit, setRucNit] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Equipos RFPOS Detallados y Telemetría
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [deviceModel, setDeviceModel] = useState('RFPOS ORG001');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [deviceIp, setDeviceIp] = useState('192.168.1.50');
  const [deviceInstallDate, setDeviceInstallDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchName, setBranchName] = useState('Principal');

  // WooCommerce Real OAuth / Keys State
  const [wcStoreUrl, setWcStoreUrl] = useState('');
  const [wcConsumerKey, setWcConsumerKey] = useState('');
  const [wcConsumerSecret, setWcConsumerSecret] = useState('');
  const [wcConnected, setWcConnected] = useState(false);
  const [wcSuccessMsg, setWcSuccessMsg] = useState('');

  // Subusuarios y Enlace de Invitación
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubRole, setNewSubRole] = useState<'Administrador' | 'Colaborador'>('Colaborador');
  const [inviteLinkCopied, setInviteLinkCopied] = useState('');

  // Tickets con envío a info@kiosqly.com
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

        const tabParam = searchParams.get('tab');
        const successParam = searchParams.get('success');
        if (tabParam) setActiveTab(tabParam);
        if (successParam === 'true') {
          setWcConnected(true);
          setWcSuccessMsg('¡Tienda WooCommerce conectada y sincronizada exitosamente!');
        }

        const { data: subData } = await supabase
          .from('sub_users')
          .select('role')
          .eq('email', currentEmail)
          .single();

        if (subData && subData.role === 'Colaborador') {
          setUserRole('Colaborador');
          if (!tabParam) setActiveTab('woo');
        } else {
          setUserRole('Administrador');
          if (!tabParam) setActiveTab('overview');
        }

        await fetchCompanyData(currentUserId);
        await fetchDevices(currentUserId);
        await fetchSubUsers(currentUserId);
        await fetchTickets(currentUserId);
      }
      setLoading(false);
    }
    initSession();
  }, [router, searchParams]);

  // PayPal SDK Loader
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
  }, [activeTab, devices.length, userRole]);

  function renderPayPalButtons() {
    const container = document.getElementById('paypal-button-container-P-5XX972822Y4491137NKJSEEY');
    const paypal = (window as any).paypal;
    if (container && paypal) {
      container.innerHTML = '';
      paypal.Buttons({
        style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({
            plan_id: 'P-5XX972822Y4491137NKJSEEY',
            quantity: devices.length > 0 ? devices.length : 1
          });
        },
        onApprove: async function(data: any, actions: any) {
          alert('¡Suscripción procesada con éxito! ID: ' + data.subscriptionID);
        }
      }).render('#paypal-button-container-P-5XX972822Y4491137NKJSEEY');
    }
  }

  async function fetchCompanyData(uid: string) {
    const { data } = await supabase.from('companies').select('*').eq('user_id', uid).single();
    if (data) {
      setCompanyName(data.company_name || '');
      setRucNit(data.ruc_nit || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setContactPhone(data.contact_phone || '');
      setWebsite(data.website || '');
      if (data.wc_store_url) setWcStoreUrl(data.wc_store_url);
      if (data.wc_connected) setWcConnected(data.wc_connected);
    } else {
      await supabase.from('companies').insert([{ 
        user_id: uid, 
        company_name: 'Mi Restaurante S.A.', 
        ruc_nit: '1234567-1-123456', 
        address: 'Calle Principal', 
        city: 'Panamá', 
        contact_phone: '+507 6000-0000',
        website: 'https://mitienda.com',
        wc_connected: false
      }]);
      setCompanyName('Mi Restaurante S.A.');
    }
  }

  async function fetchDevices(uid: string) {
    const { data } = await supabase.from('kiosks').select('*').eq('user_id', uid);
    if (data) setDevices(data);
  }

  async function fetchSubUsers(uid: string) {
    const { data } = await supabase.from('sub_users').select('*').eq('user_id', uid);
    if (data) setSubUsers(data);
  }

  async function fetchTickets(uid: string) {
    const { data } = await supabase.from('tickets').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (data) setTickets(data);
  }

  const handleSaveCompany = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setErrorMessage('');
    const { error } = await supabase
      .from('companies')
      .update({ company_name: companyName, ruc_nit: rucNit, address, city, contact_phone: contactPhone, website, updated_at: new Date() })
      .eq('user_id', userId);

    if (error) setErrorMessage('Error al guardar: ' + error.message);
    else {
      setSavedMessage('¡Información actualizada con éxito!');
      setTimeout(() => setSavedMessage(''), 4000);
    }
  };

  const handleWcOAuthConnect = (e: FormEvent) => {
    e.preventDefault();
    if (!wcStoreUrl.trim()) {
      setErrorMessage('Por favor ingresa la URL de tu tienda WooCommerce.');
      return;
    }
    if (!userId) {
      setErrorMessage('No se encontró el ID del usuario actual. Por favor recarga la página.');
      return;
    }

    let cleanUrl = wcStoreUrl.trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const appName = encodeURIComponent('Kiosqly RFPOS');
    const scope = 'read_write';
    const returnUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}?tab=woo&success=true`);
    
    // ¡Solución! Pasamos el userId en la ruta para que WooCommerce no lo borre en el POST
    const callbackUrl = encodeURIComponent(`${window.location.origin}/api/woocommerce/callback/${userId}`);

    const authUrl = `${cleanUrl}/wc-auth/v1/authorize?app_name=${appName}&scope=${scope}&return_url=${returnUrl}&callback_url=${callbackUrl}`;
    window.location.href = authUrl;
  };

  const handleSaveWcManualKeys = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !wcConsumerKey || !wcConsumerSecret) {
      setErrorMessage('Ingresa Consumer Key y Consumer Secret válidos.');
      return;
    }
    setErrorMessage('');
    const { error } = await supabase
      .from('companies')
      .update({ 
        wc_store_url: wcStoreUrl, 
        consumer_key: wcConsumerKey, 
        consumer_secret: wcConsumerSecret, 
        wc_connected: true,
        updated_at: new Date() 
      })
      .eq('user_id', userId);

    if (error) {
      setErrorMessage('Error al guardar claves WooCommerce: ' + error.message);
    } else {
      setWcConnected(true);
      setWcSuccessMsg('¡Credenciales API REST de WooCommerce guardadas y conectadas con éxito!');
      setTimeout(() => setWcSuccessMsg(''), 5000);
    }
  };

  const handleAddDevice = async (e: FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !userId) return;
    setErrorMessage('');

    const { data, error } = await supabase
      .from('kiosks')
      .insert([{ 
        user_id: userId, 
        name: deviceName, 
        model: deviceModel, 
        serial_number: deviceSerial || `SN-ORG-${Math.floor(Math.random() * 89999 + 10000)}`,
        installation_date: deviceInstallDate,
        status: 'En línea', 
        ip: deviceIp || '192.168.1.50',
        branch_name: branchName || 'Principal',
        battery_level: 100,
        wifi_signal: 'Excelente',
        charging_status: 'Conectado',
        last_seen: new Date().toISOString()
      }])
      .select();

    if (error) setErrorMessage('Error al agregar equipo: ' + error.message);
    else if (data) {
      setDevices([...devices, data[0]]);
      setDeviceName('');
      setDeviceSerial('');
    }
  };

  const handleCreateSubUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSubEmail.trim() || !userId) return;
    setErrorMessage('');

    const { data, error } = await supabase
      .from('sub_users')
      .insert([{ user_id: userId, email: newSubEmail, role: newSubRole }])
      .select();

    if (error) setErrorMessage('Error al crear subusuario: ' + error.message);
    else if (data) {
      setSubUsers([...subUsers, data[0]]);
      const inviteUrl = `${window.location.origin}/rfpos`;
      setInviteLinkCopied(`Invitación creada para ${newSubEmail}. Enlace de acceso: ${inviteUrl}`);
      setNewSubEmail('');
    }
  };

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !ticketSubject.trim() || !ticketMessage.trim()) return;
    setErrorMessage('');

    const { data, error } = await supabase
      .from('tickets')
      .insert([{ user_id: userId, subject: ticketSubject, message: ticketMessage, status: 'Abierto' }])
      .select();

    if (error) {
      setErrorMessage('Error al crear ticket: ' + error.message);
      return;
    }

    try {
      await fetch('https://formsubmit.co/ajax/info@kiosqly.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `Nuevo Ticket RFPOS: ${ticketSubject}`,
          Usuario: userEmail,
          Empresa: companyName,
          Mensaje: ticketMessage,
          Fecha: new Date().toLocaleString()
        })
      });
    } catch (err) {
      console.error('Error enviando notificación al correo de soporte', err);
    }

    if (data) {
      setTickets([data[0], ...tickets]);
      setTicketSubject('');
      setTicketMessage('');
      setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 4000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/rfpos');
  };

  const calculateDaysRemaining = (installDate: string) => {
    const install = new Date(installDate);
    const nextBilling = new Date(install);
    nextBilling.setDate(nextBilling.getDate() + 30);
    const today = new Date();
    const diffTime = nextBilling.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const isKioskoOnline = (lastSeenString?: string) => {
    if (!lastSeenString) return false;
    const lastSeenDate = new Date(lastSeenString);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffMinutes <= 10;
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
              { id: 'overview', label: '📊 Perfil & Empresa' },
              { id: 'devices', label: '🖥️ RFPOS Terminal Fleet & Telemetry' },
              { id: 'woo', label: '🛍️ WooCommerce' },
              { id: 'billing', label: '💳 Facturación PayPal' },
              { id: 'users', label: '👥 Subusuarios & Roles' },
              { id: 'tickets', label: '🎫 Soporte & Tickets' },
              { id: 'whatsapp', label: '💬 Asistencia WhatsApp' },
            ] : [
              { id: 'woo', label: '🛍️ WooCommerce' },
              { id: 'tickets', label: '🎫 Soporte & Tickets' },
              { id: 'whatsapp', label: '💬 Asistencia WhatsApp' },
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
          <p className="text-xs font-semibold text-gray-800 truncate">{userEmail}</p>
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

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {errorMessage}
            </div>
          )}

          {activeTab === 'overview' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Perfil de Empresa y Datos Fiscales</h2>
              {savedMessage && <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">{savedMessage}</div>}
              
              <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Nombre Comercial / Empresa</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">RUC / NIT</label>
                    <input type="text" value={rucNit} onChange={(e) => setRucNit(e.target.value)} placeholder="Ej. 1555555-1-2023" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Dirección Física</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej. Vía Argentina" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Ciudad / Provincia</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej. Panamá" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Teléfono de Contacto</label>
                    <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Sitio Web / Tienda Online</label>
                    <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                </div>
                <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-white text-sm font-medium hover:bg-gray-800 transition">Actualizar Perfil de Empresa</button>
              </form>
            </div>
          )}

          {activeTab === 'devices' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">RFPOS Terminal Fleet & Telemetry</h2>
                <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-xl">
                  Total Terminals: {devices.length}
                </span>
              </div>

              <form onSubmit={handleAddDevice} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-md">Dar de Alta Nueva Estación / Terminal RFPOS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Nombre / Ubicación</label>
                    <input type="text" required placeholder="Ej. Kiosco Caja Principal" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Modelo de Estación</label>
                    <select value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm bg-white focus:border-black focus:outline-none">
                      <option value="RFPOS ORG001">RFPOS ORG001</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Sucursal</label>
                    <input type="text" placeholder="Ej. Vía España" value={branchName} onChange={(e) => setBranchName(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Serial / ID del Dispositivo</label>
                    <input type="text" placeholder="Ej. SN-ORG-001" value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Fecha de Alta</label>
                    <input type="date" required value={deviceInstallDate} onChange={(e) => setDeviceInstallDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full rounded-xl bg-black px-6 py-2.5 text-white font-medium text-sm hover:bg-gray-800 transition">Registrar Estación</button>
                  </div>
                </div>
              </form>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Estado de Salud y Ciclo de Facturación</h3>
                <div className="divide-y divide-gray-100">
                  {devices.map((device) => {
                    const daysLeft = calculateDaysRemaining(device.installation_date || device.created_at || new Date().toISOString());
                    const online = isKioskoOnline(device.last_seen);
                    const battery = device.battery_level !== undefined ? device.battery_level : 100;
                    const charging = device.charging_status || 'Conectado';
                    const wifi = device.wifi_signal || 'Excelente';
                    const lowBattery = battery < 20 && charging !== 'Conectado';

                    return (
                      <div key={device.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="font-bold text-gray-900 text-base">
                            {device.name} <span className="text-xs font-normal text-gray-500">({device.model || 'RFPOS ORG001'})</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Sucursal: <span className="font-semibold text-gray-700">{device.branch_name || 'Principal'}</span> | Serial: <span className="font-mono text-gray-700">{device.serial_number || 'N/A'}</span>
                          </p>
                          <div className="flex items-center space-x-4 text-xs pt-1 text-gray-600">
                            <span>🔋 Batería: <strong>{battery}%</strong> ({charging})</span>
                            <span>📶 WiFi: <strong>{wifi}</strong></span>
                            <span>⏱️ Pago en: <strong className="text-amber-700">{daysLeft} días</strong></span>
                          </div>
                        </div>
                        <div>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                            lowBattery ? 'bg-red-100 text-red-700 animate-pulse' : online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {lowBattery ? '⚠️ Batería Baja / Descargando' : online ? '🟢 En Línea' : '🔴 Desconectado'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {devices.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No hay estaciones RFPOS registradas todavía.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'woo' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Sincronización WooCommerce Real (OAuth & API)</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${wcConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                  {wcConnected ? '🟢 Tienda Conectada' : '🟡 Pendiente de Conexión'}
                </span>
              </div>

              {wcSuccessMsg && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
                  {wcSuccessMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opción 1: Conexión Automática WooCommerce OAuth */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 text-xl font-bold">W</div>
                    <h3 className="font-bold text-gray-900 text-lg">1. Conexión Rápida WooCommerce OAuth</h3>
                    <p className="text-xs text-gray-500">Ingresa la URL pública de tu tienda WordPress con WooCommerce para autorizar la conexión automática de catálogos y órdenes.</p>
                  </div>

                  <form onSubmit={handleWcOAuthConnect} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">URL de tu Tienda</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="https://mirestaurante.com" 
                        value={wcStoreUrl} 
                        onChange={(e) => setWcStoreUrl(e.target.value)} 
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full rounded-2xl bg-[#96588a] text-white font-bold py-3 text-sm hover:bg-[#7b4671] shadow-md transition"
                    >
                      Conectar vía WooCommerce Auth ↗
                    </button>
                  </form>
                </div>

                {/* Opción 2: Conexión Manual con Claves API REST */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-800 text-xl font-bold">🔑</div>
                    <h3 className="font-bold text-gray-900 text-lg">2. Conexión Manual (Consumer Keys)</h3>
                    <p className="text-xs text-gray-500">Genera tus claves en <em>WooCommerce &gt; Ajustes &gt; Avanzado &gt; API REST</em> (Permisos: Lectura/Escritura) e ingrésalas aquí.</p>
                  </div>

                  <form onSubmit={handleSaveWcManualKeys} className="space-y-3">
                    <div>
                      <input 
                        type="text" 
                        required 
                        placeholder="Consumer Key (ck_...)" 
                        value={wcConsumerKey} 
                        onChange={(e) => setWcConsumerKey(e.target.value)} 
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xs font-mono focus:border-black focus:outline-none" 
                      />
                    </div>
                    <div>
                      <input 
                        type="password" 
                        required 
                        placeholder="Consumer Secret (cs_...)" 
                        value={wcConsumerSecret} 
                        onChange={(e) => setWcConsumerSecret(e.target.value)} 
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xs font-mono focus:border-black focus:outline-none" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full rounded-2xl bg-black text-white font-bold py-3 text-sm hover:bg-gray-800 transition"
                    >
                      Guardar y Validar Credenciales
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Facturación & Suscripción PayPal</h2>
              <div className="bg-gradient-to-br from-white to-amber-50/30 p-8 rounded-3xl shadow-sm border border-amber-100 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-6 gap-4">
                  <div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">Suscripción Automatizada</span>
                    <h3 className="font-extrabold text-gray-900 text-xl mt-2">Plan Kiosqly RFPOS por Equipo</h3>
                    <p className="text-xs text-gray-500 mt-1">El cobro se ajusta automáticamente según la cantidad de terminales RFPOS activas en tu flota.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-gray-900">$29.00</span>
                    <span className="text-xs text-gray-500 block">USD / mes por equipo</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Selecciona tu método de pago seguro:</p>
                  <div id="paypal-button-container-P-5XX972822Y4491137NKJSEEY" className="max-w-md"></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && userRole === 'Administrador' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Subusuarios y Roles</h2>
              <form onSubmit={handleCreateSubUser} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-md">Invitar Colaborador o Administrador</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Correo Electrónico</label>
                    <input type="email" required placeholder="colaborador@restaurante.com" value={newSubEmail} onChange={(e) => setNewSubEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Rol Asignado</label>
                    <select value={newSubRole} onChange={(e) => setNewSubRole(e.target.value as 'Administrador' | 'Colaborador')} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm bg-white focus:border-black focus:outline-none">
                      <option value="Colaborador">Colaborador</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full rounded-xl bg-black px-6 py-2.5 text-white font-medium text-sm hover:bg-gray-800 transition">Generar Invitación</button>
                  </div>
                </div>
                {inviteLinkCopied && <p className="text-xs text-green-600 font-medium pt-2">{inviteLinkCopied}</p>}
              </form>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Subusuarios Activos</h3>
                <div className="divide-y divide-gray-100">
                  {subUsers.map((sub) => (
                    <div key={sub.id} className="py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-bold text-gray-900">{sub.email}</p>
                        <p className="text-xs text-gray-500">Rol: <span className="font-semibold">{sub.role}</span></p>
                      </div>
                    </div>
                  ))}
                  {subUsers.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No hay subusuarios registrados.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Soporte Técnico y Tickets</h2>
              {ticketSuccess && <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">¡Ticket creado y enviado a soporte exitosamente!</div>}
              
              <form onSubmit={handleCreateTicket} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-md">Abrir Nuevo Ticket de Soporte</h3>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Asunto</label>
                  <input type="text" required placeholder="Ej. Problema con sincronización de inventario" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Mensaje / Detalle</label>
                  <textarea required rows={4} placeholder="Describe el inconveniente en detalle..." value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 p-4 text-sm focus:border-black focus:outline-none" />
                </div>
                <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-white font-medium text-sm hover:bg-gray-800 transition">Enviar Ticket</button>
              </form>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Historial de Tickets</h3>
                <div className="divide-y divide-gray-100">
                  {tickets.map((t) => (
                    <div key={t.id} className="py-4 space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-gray-900 text-sm">{t.subject}</p>
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full">{t.status}</span>
                      </div>
                      <p className="text-xs text-gray-600">{t.message}</p>
                      <p className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {tickets.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No hay tickets abiertos.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Asistencia por WhatsApp</h2>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-700 text-3xl font-bold">💬</div>
                <h3 className="font-bold text-gray-900 text-xl">¿Necesitas asistencia técnica inmediata?</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">Nuestro equipo de soporte técnico en Kiosqly RFPOS está disponible para atenderte directamente vía WhatsApp.</p>
                <div>
                  <a
                    href="https://wa.me/50760000000?text=Hola,%20necesito%20soporte%20con%20mi%20plataforma%20Kiosqly%20RFPOS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-2xl bg-[#25D366] text-white font-bold px-8 py-3 text-sm hover:bg-[#20ba5a] shadow-md transition"
                  >
                    Abrir Chat de WhatsApp ↗
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
