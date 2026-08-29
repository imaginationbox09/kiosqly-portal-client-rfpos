import { LogoutButton } from "@/components/logout-button"

export function DashboardHeader({
  companyName,
  email,
  status,
}: {
  companyName: string | null
  email: string
  status: string
}) {
  const active = status === "ACTIVE"

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-mono text-sm font-bold">K</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-card-foreground">
              {companyName ?? "Kiosqly RFPOS"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              active
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-muted-foreground"}`} />
            {active ? "Activo" : "Inactivo"}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
