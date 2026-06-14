'use client'

import { X, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  message: string
  phone?: string
  waUrl?: string
}

function waPlain(text: string) {
  return text
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
}

export default function WhatsappPreviewModal({ open, onClose, message, phone, waUrl }: Props) {
  if (!open) return null

  function copyMsg() {
    navigator.clipboard?.writeText(waPlain(message))
    toast.success('Mesaj kopyalandı')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="modal-header py-4 px-5 bg-[#075e54] text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">💬</div>
            <div>
              <h3 className="font-bold text-sm">WhatsApp Önizleme</h3>
              {phone && <p className="text-[11px] text-white/70">{phone}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
        </div>
        <div className="modal-body py-5 px-5 bg-[#e5ddd5]">
          <div className="bg-white rounded-xl rounded-tl-sm shadow p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {waPlain(message)}
          </div>
        </div>
        <div className="modal-footer py-4 px-5 gap-2">
          <button type="button" onClick={copyMsg} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Copy size={14} /> Kopyala
          </button>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer" className="btn-primary flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fb855] border-0">
              <ExternalLink size={14} /> Gönder
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
