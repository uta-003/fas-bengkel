export default function PageHeader({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: string
  title: string
  subtitle: string
  children?: React.ReactNode
}) {
  return (
    <div className="anim-fade-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-700 p-6 shadow-lg shadow-maroon-900/20 sm:p-7">
      {/* Garis aksen atas */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-ocean-400" />
      {/* Blob dekorasi */}
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 right-28 h-36 w-36 rounded-full bg-ocean-500/20 blur-2xl" />
      {/* Efek kilau berjalan */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="anim-shine absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl shadow-inner ring-1 ring-white/10">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-maroon-100/80">{subtitle}</p>
          </div>
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
    </div>
  )
}