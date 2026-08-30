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

    // Guarda la nueva contraseña para el usuario autenticado vía invite
    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    setMessage('¡Contraseña guardada con éxito!')
    // Redirige al panel principal del portal Kiosqly
    setTimeout(() => router.push('/rfpos/dashboard'), 1500)
  }

  return (
    <form onSubmit={handleSetPassword} className="space-y-4">
      <h2>Establecer tu contraseña</h2>
      <p>Crea una clave para acceder a tu portal Kiosqly RFPOS.</p>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nueva contraseña"
        minLength={6}
        required
        className="border p-2 rounded w-full"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white p-2 rounded w-full"
      >
        {loading ? 'Guardando...' : 'Guardar contraseña'}
      </button>

      {message && <p className="text-sm mt-2">{message}</p>}
    </form>
  )
}
