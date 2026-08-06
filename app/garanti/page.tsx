'use client'

import { useState } from 'react'
import { Search, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/validators'
import { motion, AnimatePresence } from 'framer-motion'

export default function GarantiSorgulamaPage() {
  const [searchType, setSearchType] = useState<'qr' | 'imei'>('qr')
  const [qrToken, setQrToken] = useState('')
  const [imei, setImei] = useState('')
  const [shopId, setShopId] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    
    if (searchType === 'qr' && !qrToken) {
      setError('Lütfen sorgulama kodunu giriniz.')
      return
    }
    if (searchType === 'imei' && (!imei || !shopId)) {
      setError('Lütfen IMEI ve Dükkan Kodunu giriniz.')
      return
    }

    setLoading(true)
    try {
      const url = searchType === 'qr' 
        ? `/api/public/warranty?qr=${encodeURIComponent(qrToken)}`
        : `/api/public/warranty?imei=${encodeURIComponent(imei)}&shop=${encodeURIComponent(shopId)}`
        
      const res = await fetch(url)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Sorgulama başarısız oldu')
      setResult(data.data)
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto bg-sky-100 text-sky-600 w-16 h-16 flex items-center justify-center rounded-full mb-4 shadow-sm border-4 border-white">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Garanti Sorgulama</h1>
          <p className="text-slate-500">Cihazınızın güncel garanti durumunu öğrenin.</p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${searchType === 'qr' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setSearchType('qr'); setError(''); setResult(null); }}
            >
              Kod ile Sorgula
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${searchType === 'imei' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setSearchType('imei'); setError(''); setResult(null); }}
            >
              IMEI ile Sorgula
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <AnimatePresence mode="wait">
              {searchType === 'qr' ? (
                <motion.div key="qr" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Sorgulama Kodu (QR Token)</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                    placeholder="Örn: 123e4567-e89b..."
                    value={qrToken}
                    onChange={e => setQrToken(e.target.value)}
                  />
                </motion.div>
              ) : (
                <motion.div key="imei" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">IMEI veya Seri No</label>
                    <input 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                      placeholder="Örn: 35xxxxxxxxxxxxx"
                      value={imei}
                      onChange={e => setImei(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Dükkan Kodu</label>
                    <input 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                      placeholder="Örn: 550e8400..."
                      value={shopId}
                      onChange={e => setShopId(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Search size={18} /> Sorgula</>
              )}
            </button>
          </form>
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">{result.device_brand} {result.device_model}</h3>
                <p className="text-slate-500 text-sm font-medium">Müşteri: {result.customer_name.substring(0,2)}*** {result.customer_name.split(' ').pop()?.substring(0,1)}***</p>
              </div>
              <div className="text-right">
                {result.status === 'aktif' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">
                    <CheckCircle size={16} /> Aktif
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-bold">
                    <AlertTriangle size={16} /> Garanti Dışı
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400 font-semibold mb-1 uppercase text-xs">Başlangıç</p>
                <p className="font-medium text-slate-800">{formatDate(result.start_date)}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-1 uppercase text-xs">Bitiş</p>
                <p className="font-medium text-slate-800">{formatDate(result.end_date)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 font-semibold mb-1 uppercase text-xs">Kapsamdaki Parçalar</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.covered_parts?.map((p: string) => (
                    <span key={p} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-semibold">{p}</span>
                  ))}
                </div>
              </div>
              {result.exclusion_reasons?.length > 0 && (
                <div className="col-span-2 mt-2">
                  <p className="text-red-400 font-semibold mb-1 uppercase text-xs">Kapsam Dışı</p>
                  <ul className="text-slate-600 text-xs list-disc list-inside space-y-0.5">
                    {result.exclusion_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
