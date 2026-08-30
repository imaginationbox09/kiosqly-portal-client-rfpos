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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleAuthTokens = async () => {
      // Supabase envía parámetros y errores después del símbolo # (hash)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      
      const errorDescription = hashParams.get('error_description');
      const errorCode = hashParams.get('error_code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // Si Supabase devuelve un error en la URL (ej. enlace expirado)
      if (errorCode || errorDescription) {
        const cleanError = decodeURIComponent(errorDescription || 'El enlace ha expirado o no es válido.').replace(/\+/g, ' ');
        setError(cleanError);
        return;
      }

      // Si viene con tokens de sesión en el hash
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setError(error.message);
        } else {
          setIsReady(true);
        }
        return;
      }

      // Compatibilidad con parámetros de consulta estándar (?code=...)
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
        } else {
          setIsReady(true);
        }
        return;
      }

      // Verificar si ya existe una sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsReady(true);
      } else {
        setError('No se encontró un enlace válido. Por favor, solicita un nuevo correo de recuperación.');
      }
    };

    handleAuthTokens();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

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
            ¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.
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
              disabled={loading || !isReady}
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
