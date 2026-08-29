import { LoginForm } from "@/components/login-form"

export const metadata = {
  title: "Iniciar sesión | Kiosqly RFPOS",
  description: "Portal de clientes Kiosqly RFPOS",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-mono text-lg font-bold">K</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Kiosqly RFPOS</h1>
          <p className="text-sm text-muted-foreground text-pretty">Portal de clientes</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
