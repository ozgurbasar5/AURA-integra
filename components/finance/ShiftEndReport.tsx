'use client'

import type { ShiftReport } from '@/lib/eod-report'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n)
}

function fmtDt(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ShiftEndReport({ report }: { report: ShiftReport }) {
  const diff = report.cash.difference
  return (
    <div className="shift-eod-report bg-white text-slate-900 p-8 max-w-2xl mx-auto print:p-4">
      <div className="text-center border-b border-slate-200 pb-4 mb-6">
        <h1 className="text-xl font-black">{report.meta.shop_name}</h1>
        <p className="text-sm text-slate-500 mt-1">Gün Sonu / Vardiya Raporu</p>
        <p className="text-xs text-slate-400 mt-2">
          {fmtDt(report.meta.opened_at)} — {fmtDt(report.meta.closed_at)}
        </p>
        <p className="text-xs text-slate-500">Kasiyer: {report.meta.opened_by}{report.meta.closed_by ? ` → ${report.meta.closed_by}` : ''}</p>
      </div>

      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase text-slate-500 mb-3">Kasa Mutabakatı</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="py-1 text-slate-600">Açılış bakiyesi</td><td className="py-1 text-right font-semibold">{fmt(report.cash.opening_balance)}</td></tr>
            <tr><td className="py-1 text-slate-600">Nakit giriş</td><td className="py-1 text-right">{fmt(report.cash.nakit_giris)}</td></tr>
            <tr><td className="py-1 text-slate-600">Nakit gider</td><td className="py-1 text-right">−{fmt(report.cash.nakit_cikis)}</td></tr>
            <tr className="border-t"><td className="py-2 font-bold">Beklenen nakit</td><td className="py-2 text-right font-bold">{fmt(report.cash.expected_cash)}</td></tr>
            <tr><td className="py-1 text-slate-600">Sayım (kapanış)</td><td className="py-1 text-right">{fmt(report.cash.closing_balance)}</td></tr>
            <tr><td className="py-1 font-bold">Fark</td><td className={`py-1 text-right font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(diff)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="mb-6 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Nakit</p><p className="font-bold">{fmt(report.payments.nakit)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Kart/POS</p><p className="font-bold">{fmt(report.payments.kart)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Diğer</p><p className="font-bold">{fmt(report.payments.diger)}</p></div>
      </section>

      <section className="mb-6 grid grid-cols-3 gap-3 text-center text-sm">
        <div><p className="text-2xl font-black">{report.operations.new_orders}</p><p className="text-xs text-slate-500">Yeni kabul</p></div>
        <div><p className="text-2xl font-black">{report.operations.repaired}</p><p className="text-xs text-slate-500">Tamir</p></div>
        <div><p className="text-2xl font-black">{report.operations.delivered}</p><p className="text-xs text-slate-500">Teslim</p></div>
      </section>

      <section className="mb-6 text-sm">
        <p><strong>POS:</strong> {report.pos.count} fiş · Ciro {fmt(report.pos.revenue)} · Net kâr {fmt(report.pos.profit)}</p>
      </section>

      {report.expenses.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase text-slate-500 mb-2">Giderler</h2>
          {report.expenses.map(e => (
            <div key={e.category} className="flex justify-between text-sm py-0.5">
              <span>{e.category}</span><span>{fmt(e.amount)}</span>
            </div>
          ))}
        </section>
      )}

      <p className="text-[10px] text-slate-400 text-center mt-8">AURA İntegra · {fmtDt(report.meta.generated_at)}</p>
    </div>
  )
}
