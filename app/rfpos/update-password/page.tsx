'use client';

export const dynamic = 'force-dynamic'; // Evita errores de pre-renderizado estático en Vercel

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
    }
  }
);

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Revisar si hay errores en el hash de la URL
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      if (isMounted) setError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      return;
    }

    // 2. Escuchar cuando Supabase procese los tokens de la URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session) {
        setIsReady(true);
        setError(null);
      }
    });

    // 3. Comprobación inicial de la sesión
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (!isMounted) return;

      if (sessionError) {
        setError(sessionError.message);
      } else if (session) {
        setIsReady(true);
      } else {
        setTimeout(async () => {
          const { data: { session: delayedSession } } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (delayedSession) {
            setIsReady(true);
          } else {
            setError('Auth session missing! El enlace ha expirado o no es válido.');
          }
        }, 1200);
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
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        throw new Error('Auth session missing! La sesión no está activa. Vuelve a abrir el enlace de tu correo.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess(true);
      
      // Redirigir automáticamente al portal después de 1.5 segundos
      setTimeout(() => {
        router.push('/rfpos');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.');
    } finally {
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
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 text-center space-y-3">
            <p className="font-bold">¡Contraseña actualizada con éxito!</p>
            <p>Redirigiendo al portal...</p>
            <button
              onClick={() => router.push('/rfpos')}
              className="w-full rounded-lg bg-black py-2.5 text-white font-medium hover:bg-gray-800 transition"
            >
              Entrar al portal ahora
            </button>
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
                disabled={!isReady}
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
