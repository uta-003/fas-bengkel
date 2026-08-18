'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeProps {
  value: string
  width?: number
  height?: number
  fontSize?: number
  displayValue?: boolean
  className?: string
}

export default function Barcode({
  value,
  width = 2,
  height = 50,
  fontSize = 12,
  displayValue = true,
  className = '',
}: BarcodeProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: 'CODE128',
          width,
          height,
          fontSize,
          displayValue,
          margin: 5,
          background: '#ffffff',
          lineColor: '#000000',
        })
      } catch (error) {
        console.error('Error generating barcode:', error)
      }
    }
  }, [value, width, height, fontSize, displayValue])

  return <svg ref={barcodeRef} className={className} />
}