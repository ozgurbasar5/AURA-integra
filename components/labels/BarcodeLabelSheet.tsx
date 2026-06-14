'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { QRCodeSVG } from 'qrcode.react'
import type { LabelLine } from '@/lib/barcode-labels'

export default function BarcodeLabelSheet({
  labels,
  mode = 'print',
}: {
  labels: LabelLine[]
  mode?: 'print' | 'preview'
}) {
  const svgRefs = useRef<(SVGSVGElement | null)[]>([])

  useEffect(() => {
    labels.forEach((label, i) => {
      const el = svgRefs.current[i]
      if (!el || !label.barcode) return
      try {
        JsBarcode(el, label.barcode, {
          format: 'CODE128',
          width: 1.4,
          height: 44,
          displayValue: true,
          fontSize: 11,
          margin: 4,
        })
      } catch {
        /* geçersiz barkod */
      }
    })
  }, [labels])

  if (!labels.length) return null

  const wrapper =
    mode === 'preview'
      ? 'grid sm:grid-cols-2 gap-3'
      : 'barcode-label-sheet hidden print:block'

  return (
    <div className={wrapper}>
      {labels.map((label, i) => (
        <div
          key={`${label.barcode}-${i}`}
          className={
            mode === 'preview'
              ? 'rounded-xl border border-slate-200 bg-white p-4 text-center'
              : 'label-page break-after-page p-6 mx-auto max-w-[80mm] text-black bg-white'
          }
        >
          <p className="text-sm font-black leading-tight">{label.title}</p>
          {label.subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{label.subtitle}</p>}
          {label.lines?.map(line => (
            <p key={line} className="text-[10px] text-slate-600 mt-1">{line}</p>
          ))}
          {label.price && <p className="text-lg font-black mt-2">{label.price}</p>}
          <div className="flex items-center justify-center gap-4 mt-3">
            <svg ref={el => { svgRefs.current[i] = el }} className="max-w-full" />
            {label.qrValue && (
              <QRCodeSVG value={label.qrValue} size={56} level="M" includeMargin />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
