useEffect(() => {
  // Verifica el hash inmediatamente al cargar
  const checkHash = () => {
    const hash = window.location.hash
    if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('type=invite')) {
      setIsRecovery(true)
    }
  }

  checkHash()
  window.addEventListener('hashchange', checkHash)

  const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
      setIsRecovery(true)
    }
  })

  return () => {
    window.removeEventListener('hashchange', checkHash)
    authListener.subscription.unsubscribe()
  }
}, [supabase])
