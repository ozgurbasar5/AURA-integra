/**
 * Finans entegration denetimi — servis teslim, POS satış, kasa özeti.
 * Simüle edilmiş akışlar + kod yolu analizi (localStorage mutasyona uğramaz).
 */

export type AuditFinding = {
  hypothesisId: string
  severity: 'error' | 'warn' | 'info'
  message: string
  evidence: Record<string, unknown>
}

export type AuditReport = {
  ok: boolean
  findings: AuditFinding[];
  simulations: Record<string, unknown>
  timestamp: string
}

function logDebug(payload: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7468/ingest/0c57ec44-6fe2-45e2-9efe-a00a4cd05205', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '33922f' },
    body: JSON.stringify({
      sessionId: '33922f',
      location: 'finance-integration-audit.ts',
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {})
  // #endregion
}

/** completeSale mantığı — kasa = gelir, kâr = satış - maliyet */
function simulateCompleteSale(subtotal: number, cost: number, vatRate = 20) {
  const vat = subtotal * (vatRate / 100)
  const totalWithVat = subtotal + vat
  const netProfit = subtotal - cost
  let kasa = 0
  kasa += totalWithVat
  return { totalWithVat, netProfit, kasaAfter: kasa, grossProfit: subtotal - cost }
}

/** deliverService mantığı — kasa += ücret - gider */
function simulateDeliverService(fee: number, expense: number) {
  let kasa = 0
  kasa += fee
  if (expense > 0) kasa -= expense
  const netProfit = fee - expense
  return { kasaAfter: kasa, netProfit, margin: fee > 0 ? (netProfit / fee) * 100 : 0 }
}

/** getCashSummary çift sayım riski */
function simulateGetCashSummaryDoubleCount(saleTotal: number) {
  const transactionsGelir = saleTotal
  const salesArrayAgain = saleTotal
  const reportedToplam = transactionsGelir + salesArrayAgain
  return { reportedToplam, actualKasa: saleTotal, doubleCount: reportedToplam - saleTotal }
}

export function runFinanceIntegrationAudit(runId = 'audit'): AuditReport {
  const findings: AuditFinding[] = []
  const simulations: Record<string, unknown> = {}

  logDebug({ runId, hypothesisId: 'START', message: 'Finance audit started', data: {} })

  // H2: POS sale simulation
  const sale = simulateCompleteSale(1000, 400, 20)
  simulations.posSale = sale
  if (sale.kasaAfter !== sale.totalWithVat) {
    findings.push({
      hypothesisId: 'H2',
      severity: 'error',
      message: 'POS satış kasa tutarsız',
      evidence: sale,
    })
  }
  logDebug({ runId, hypothesisId: 'H2', message: 'POS sale simulation', data: sale })

  const double = simulateGetCashSummaryDoubleCount(sale.totalWithVat)
  simulations.cashSummaryDoubleCount = double
  if (double.doubleCount > 0) {
    findings.push({
      hypothesisId: 'H2',
      severity: 'error',
      message: 'getCashSummary POS gelirini transactions + sales üzerinden iki kez sayıyor',
      evidence: double,
    })
  }

  // H3: Service delivery simulation
  const delivery = simulateDeliverService(1500, 600)
  simulations.serviceDelivery = delivery
  if (delivery.kasaAfter !== delivery.netProfit) {
    findings.push({
      hypothesisId: 'H3',
      severity: 'warn',
      message: 'Servis teslim kasa net ≠ kâr (beklenen: gider ayrı transaction)',
      evidence: delivery,
    })
  }
  logDebug({ runId, hypothesisId: 'H3', message: 'Service delivery simulation', data: delivery })

  // H1/H5: Status-only path (code analysis — no deliverService call)
  findings.push({
    hypothesisId: 'H1',
    severity: 'warn',
    message:
      'Atölye durum dropdown "delivered" yalnızca updateServiceStatus çağırır; deliverService yalnızca "Teslim Et" butonunda',
    evidence: { file: 'app/dashboard/atolye/[id]/page.tsx', handleStatusChange: 'no deliverService' },
  })
  logDebug({ runId, hypothesisId: 'H1', message: 'Status-only path documented', data: { confirmedByCode: true } })

  // H4: Dashboard profitToday
  findings.push({
    hypothesisId: 'H4',
    severity: 'warn',
    message: 'getTodayActivity profitToday yalnızca POS net_profit toplar; servis teslim kârı dahil değil',
    evidence: { fn: 'getTodayActivity', file: 'lib/store.ts' },
  })

  const ok = !findings.some((f) => f.severity === 'error')
  logDebug({ runId, hypothesisId: 'END', message: 'Finance audit complete', data: { ok, findingCount: findings.length } })

  return { ok, findings, simulations, timestamp: new Date().toISOString() }
}
