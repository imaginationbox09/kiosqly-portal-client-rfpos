'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('Correo o contraseña incorrectos.')
    } else {
      router.push('/rfpos/dashboard')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-sm w-full space-y-4">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-black text-white font-bold rounded-lg flex items-center justify-center mx-auto">
            K
          </div>
          <h1 className="text-xl font-bold">Kiosqly RFPOS</h1>
          <p className="text-sm text-gray-500">Portal de clientes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-lg p-2.5 text-sm"
            />
          </div>

          {message && (
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-medium p-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </main>
  )
}
