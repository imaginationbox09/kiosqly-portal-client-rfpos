'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClientComponentClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('¡Contraseña guardada con éxito! Redirigiendo...')
      setTimeout(() => {
        window.location.href = '/rfpos/login'
      }, 1500)
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
          <p className="text-sm text-gray-500">Establece tu nueva contraseña</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="w-full border rounded-lg p-2.5 text-sm"
              placeholder="Ingresa mínimo 6 caracteres"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-medium p-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </main>
  )
}
