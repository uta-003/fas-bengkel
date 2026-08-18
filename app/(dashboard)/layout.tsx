import AppShell from '@/app/components/AppShell'
import RequireAuth from '@/app/components/RequireAuth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  )
}