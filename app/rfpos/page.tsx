'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  }
);

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // 1. Revisar si hay errores en el hash de la URL
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const errorDescription = params.get('error_description');
        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
        }

        // 2. Extraer tokens del hash y establecer la sesión explícitamente
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data, error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) throw setErr;
          if (data.session && isMounted) {
            setSessionReady(true);
            setInitializing(false);
            return;
          }
        }

        // 3. Comprobación estándar de sesión activa
        const { data: { session }, error: getErr } = await supabase.auth.getSession();
        if (getErr) throw getErr;

        if (session && isMounted) {
          setSessionReady(true);
        } else {
          throw new Error('Auth session missing! No se encontró una sesión activa o el enlace expiró.');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'No se pudo validar la sesión.');
      } finally {
        if (isMounted) setInitializing(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isMounted) {
        setSessionReady(true);
        setError(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Intento principal de actualización
      let { error: updateError } = await supabase.auth.updateUser({ password });

      // Si falla por sesión faltante, forzamos la recarga de la sesión desde el hash de la URL y reintentamos de inmediato
      if (updateError) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionRetryErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!sessionRetryErr) {
            const retryUpdate = await supabase.auth.updateUser({ password });
            updateError = retryUpdate.error;
          }
        }
      }

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white font-bold">
            K
          </div>
          <p className="text-sm text-gray-600 font-medium">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white font-bold text-xl">
            K
          </div>
          <h1 className="text-xl font-bold text-gray-900">Kiosqly RFPOS</h1>
          <p className="text-sm text-gray-500">Establece tu nueva contraseña</p>
        </div>

        {success ? (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 text-center">
            ¡Contraseña actualizada con éxito! Ya puedes cerrar esta ventana e iniciar sesión.
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                placeholder="••••••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !sessionReady}
              className="w-full rounded-lg bg-black py-2.5 text-white font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
