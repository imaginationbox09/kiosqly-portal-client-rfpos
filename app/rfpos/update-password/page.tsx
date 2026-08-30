'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function SetPasswordForm() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    setMessage('¡Contraseña guardada con éxito!')
    setTimeout(() => router.push('/rfpos'), 1500)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSetPassword} className="bg-white p-6 rounded-lg shadow-md max-w-sm w-full space-y-4">
        <h2 className="text-xl font-bold text-center">Crear Contraseña</h2>
        <p className="text-sm text-gray-600 text-center">Define tu nueva clave para el portal Kiosqly RFPOS.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          minLength={6}
          required
          className="border p-2 rounded w-full border-gray-300"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white p-2 rounded w-full font-medium"
        >
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>

        {message && <p className="text-sm text-center mt-2">{message}</p>}
      </form>
    </main>
  )
}
