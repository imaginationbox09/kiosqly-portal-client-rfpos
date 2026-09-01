'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function RFPOSDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [userId, setUserId] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('Kiosqly RFPOS');
  const [wcStoreUrl, setWcStoreUrl] = useState<string>('');
  const [wcConnected, setWcConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    const successParam = searchParams.get('success');
    if (successParam === 'true') {
      setSuccessMessage('¡WooCommerce conectado y credenciales guardadas exitosamente!');
    }

    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const currentUserId = session.user.id;
          setUserId(currentUserId);

          const { data: company, error } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', currentUserId)
            .single();

          if (company) {
            setCompanyName(company.name || 'Kiosqly RFPOS');
            setWcStoreUrl(company.wc_store_url || company.domain || '');
            setWcConnected(!!company.wc_connected);
          }
        }
      } catch (err: any) {
        console.error('Error cargando datos del usuario:', err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [searchParams]);

  const handleWcOAuthConnect = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

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

    // URL a la que WooCommerce redirige al usuario tras aprobar la autorización
    const returnUrl = encodeURIComponent(`${window.location.origin}/rfpos/dashboard?tab=woo&success=true`);
    
    // URL del servidor (API endpoint) que recibe las credenciales de la API de WooCommerce por POST
    const callbackUrl = encodeURIComponent(`${window.location.origin}/api/woocommerce/callback/${userId}`);

    const authUrl = `${cleanUrl}/wc-auth/v1/authorize?app_name=Kiosqly%20RFPOS&scope=read_write&user_id=${userId}&return_url=${returnUrl}&callback_url=${callbackUrl}`;
    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar de Kiosqly */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-extrabold tracking-wider text-indigo-400">KIOSQLY</h1>
          <p className="text-xs text-gray-400 mt-1">RFPOS & Self-Service</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => { setActiveTab('overview'); router.push('/rfpos/dashboard?tab=overview'); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            📊 Resumen General
          </button>
          <button
            onClick={() => { setActiveTab('woo'); router.push('/rfpos/dashboard?tab=woo'); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'woo' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            🔌 Integración WooCommerce
          </button>
          <button
            onClick={() => { setActiveTab('kiosks'); router.push('/rfpos/dashboard?tab=kiosks'); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'kiosks' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            🖥️ Kioscos y Menús
          </button>
        </nav>
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 truncate">
          UID: {userId || 'No autenticado'}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-gray-800 bg-gray-900/40 backdrop-blur flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold capitalize">
            {activeTab === 'overview' && 'Panel de Control Principal'}
            {activeTab === 'woo' && 'Conexión y Sincronización WooCommerce'}
            {activeTab === 'kiosks' && 'Administración de Kioscos'}
          </h2>
          <div className="text-sm font-medium text-indigo-300">{companyName}</div>
        </header>

        <div className="p-8 max-w-5xl w-full mx-auto">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-950/80 border border-red-700 text-red-200 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-sm font-medium text-gray-400">Estado de Sincronización</h3>
                  <p className="text-xl font-bold mt-2 text-indigo-400">
                    {wcConnected ? 'WooCommerce Conectado' : 'Pendiente de Conexión'}
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-sm font-medium text-gray-400">Kioscos Activos</h3>
                  <p className="text-xl font-bold mt-2 text-emerald-400">0 Operativos</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-sm font-medium text-gray-400">Ventas Totales Hoy</h3>
                  <p className="text-xl font-bold mt-2 text-blue-400">$0.00</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'woo' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white">Autorización REST API de WooCommerce</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Ingresa la dirección web de tu tienda para autorizar el acceso seguro de lectura y escritura para el punto de venta Kiosqly RFPOS.
                </p>
              </div>

              <form onSubmit={handleWcOAuthConnect} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    URL de la Tienda WooCommerce
                  </label>
                  <input
                    type="text"
                    value={wcStoreUrl}
                    onChange={(e) => setWcStoreUrl(e.target.value)}
                    placeholder="https://tudominio.com"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Asegúrate de incluir `https://` y que tu tienda permita solicitudes de API externas.
                  </p>
                </div>

                <div className="flex items-center space-x-4 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors shadow"
                  >
                    {wcConnected ? 'Reconectar WooCommerce' : 'Conectar con WooCommerce'}
                  </button>
                  {wcConnected && (
                    <span className="inline-flex items-center text-emerald-400 text-sm font-medium">
                      ● Tienda Vinculada
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {activeTab === 'kiosks' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-medium text-white">Configuración de Kioscos Self-Service</h3>
              <p className="text-sm text-gray-400 mt-1">
                Administra tus terminales táctiles, impresoras de recibos y pasarelas de pago locales en Panamá.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}