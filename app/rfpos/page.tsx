'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const setupSession = async () => {
      try {
        // 1. Leer tokens del hash de la URL (#access_token=...)
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorDescription = hashParams.get('error_description');

        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          // 2. Si no hay hash, revisar si hay código PKCE en los parámetros de consulta (?code=...)
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get('code');
          if (code) {
            const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
            if (codeError) throw codeError;
          }
        }

        // 3. Verificación final obligatoria de que la sesión existe en el cliente
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError || !session) {
          throw new Error('Auth session missing! El enlace es inválido o ha expirado.');
        }
      } catch (err: any) {
        setError(err.message || 'No se pudo validar la sesión.');
      } finally {
        setInitializing(false);
      }
    };

    setupSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Doble comprobación de seguridad antes de actualizar
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Auth session missing! La sesión expiró.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
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
          <p className="text-sm text-gray-600 font-medium">Validando acceso y sesión...</p>
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
              disabled={loading || !!error}
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
