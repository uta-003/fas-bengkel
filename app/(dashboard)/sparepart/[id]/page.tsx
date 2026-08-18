/**
 * Server Component — Sparepart Detail Page
 * Required for static export (output: 'export') with dynamic routes.
 * Wraps the client component for interactive behavior.
 */

import SparepartDetailClient from '@/app/components/SparepartDetailClient'

/**
 * Generate empty static params — routes are prerendered on demand at build time
 * @see https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
 */
export async function generateStaticParams() {
  // Minimal satu route agar static export sukses
  return [{ id: '0' }]
}

export default async function SparepartDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-maroon-900">ID barang tidak valid</h2>
      </div>
    )
  }

  return <SparepartDetailClient id={id} />
}

