export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { verifyPortalSessionToken } from '@/lib/portal-session'
import { formatCurrency } from '@/lib/validators'
import { PUBLIC_STATUS_LABELS, mapDbStatusToPublic } from '@/lib/erp-features'

type RouteParams = { params: { slug: string } }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const url = req.nextUrl
  const docType = url.searchParams.get('type') || 'service_form'
  const id = url.searchParams.get('id')
  const sessionToken = url.searchParams.get('token') || req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')

  if (!id) {
    return new NextResponse('Belge kimliği (id) gereklidir', { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return new NextResponse('Servis kullanılamıyor', { status: 503 })

  const tenant = await resolveTenantByPortalSlug(admin, params.slug)
  if (!tenant) return new NextResponse('Bayi bulunamadı', { status: 404 })

  // If token is provided, verify session
  let customerPhone: string | null = null
  if (sessionToken) {
    const verified = verifyPortalSessionToken(sessionToken, tenant.id)
    if (verified.ok && verified.payload) {
      customerPhone = verified.payload.customerPhone
    }
  }

  const shopName = tenant.company_name || 'AURA Teknik Servis'
  const shopPhone = tenant.phone || ''
  const shopAddress = ''

  if (docType === 'warranty') {
    const { data: w } = await admin
      .from('warranties')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (!w) return new NextResponse('Garanti belgesi bulunamadı', { status: 404 })

    const parts = Array.isArray(w.covered_parts) ? w.covered_parts.join(', ') : (w.covered_parts || 'Tüm Parçalar')
    const ex = Array.isArray(w.exclusion_reasons) ? w.exclusion_reasons.join(', ') : (w.exclusion_reasons || 'Standart kullanım dışı hasarlar')

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Garanti Belgesi — ${w.device_brand} ${w.device_model}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px; }
    .doc-card { max-width: 700px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 24px; margin-bottom: 30px; }
    .badge { background: #0284c7; color: white; padding: 6px 14px; border-radius: 12px; font-weight: 700; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .box { background: #f1f5f9; padding: 16px; border-radius: 12px; }
    .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .val { font-size: 15px; font-weight: 600; color: #1e293b; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    .print-btn { display: inline-block; background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; margin-bottom: 20px; }
    @media print { .no-print { display: none !important; } body { padding: 0; background: white; } .doc-card { box-shadow: none; border: none; } }
  </style>
</head>
<body>
  <div style="max-width: 700px; margin: 0 auto;" class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Belgeyi Yazdır / PDF İndir</button>
  </div>
  <div class="doc-card">
    <div class="header">
      <div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">${shopName}</h1>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">${shopAddress || 'Teknik Servis'} · ${shopPhone}</p>
      </div>
      <span class="badge">RESMİ GARANTİ SERTİFİKASI</span>
    </div>
    <div class="grid">
      <div class="box"><div class="label">Müşteri</div><div class="val">${w.customer_name}</div></div>
      <div class="box"><div class="label">Cihaz</div><div class="val">${w.device_brand} ${w.device_model}</div></div>
      <div class="box"><div class="label">Başlangıç Tarihi</div><div class="val">${new Date(w.start_date).toLocaleDateString('tr-TR')}</div></div>
      <div class="box"><div class="label">Bitiş Tarihi</div><div class="val">${new Date(w.end_date).toLocaleDateString('tr-TR')} (${w.warranty_months} Ay)</div></div>
      ${w.imei ? `<div class="box"><div class="label">IMEI / Seri No</div><div class="val" style="font-family: monospace;">${w.imei}</div></div>` : ''}
      <div class="box"><div class="label">Kapsamdaki Parçalar</div><div class="val">${parts}</div></div>
    </div>
    <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <div class="label" style="color: #b45309;">Garanti Dışı Durumlar</div>
      <div style="font-size: 13px; color: #92400e; margin-top: 4px;">${ex}</div>
    </div>
    <div class="footer">
      <div>Sorgulama Kodu: <strong>${w.qr_token || w.id.slice(0, 8)}</strong></div>
      <div>Bu belge elektronik olarak doğrulanabilir.</div>
    </div>
  </div>
</body>
</html>`
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Service Order or Quote Document
  const { data: o } = await admin
    .from('service_orders')
    .select(`
      id, order_no, status, device_brand, device_model, device_color, imei,
      estimated_cost, actual_cost, approval_amount, approval_desc,
      created_at, estimated_delivery, fault_description,
      customer_name, customer_phone
    `)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!o) return new NextResponse('Servis kaydı bulunamadı', { status: 404 })

  const isQuote = docType === 'quote'
  const title = isQuote ? 'Fiyat Teklifi Belgesi' : 'Servis Kabul & Teslim Belgesi'
  const pubStatus = mapDbStatusToPublic(String(o.status))
  const statusLabel = PUBLIC_STATUS_LABELS[pubStatus] || o.status
  const total = Number(o.actual_cost ?? o.approval_amount ?? o.estimated_cost ?? 0)

  const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${title} — ${o.order_no}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px; }
    .doc-card { max-width: 700px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 24px; margin-bottom: 30px; }
    .badge { background: #0284c7; color: white; padding: 6px 14px; border-radius: 12px; font-weight: 700; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .box { background: #f1f5f9; padding: 16px; border-radius: 12px; }
    .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .val { font-size: 15px; font-weight: 600; color: #1e293b; }
    .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    .print-btn { display: inline-block; background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; margin-bottom: 20px; }
    @media print { .no-print { display: none !important; } body { padding: 0; background: white; } .doc-card { box-shadow: none; border: none; } }
  </style>
</head>
<body>
  <div style="max-width: 700px; margin: 0 auto;" class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Belgeyi Yazdır / PDF İndir</button>
  </div>
  <div class="doc-card">
    <div class="header">
      <div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">${shopName}</h1>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">${shopAddress || 'Teknik Servis'} · ${shopPhone}</p>
      </div>
      <span class="badge">${isQuote ? 'FİYAT TEKLİFİ' : 'SERVİS FORMU'}</span>
    </div>
    <div class="grid">
      <div class="box"><div class="label">Servis No</div><div class="val" style="font-family: monospace; color: #0284c7;">${o.order_no}</div></div>
      <div class="box"><div class="label">Durum</div><div class="val">${statusLabel}</div></div>
      <div class="box"><div class="label">Müşteri Adı</div><div class="val">${o.customer_name || 'Müşteri'}</div></div>
      <div class="box"><div class="label">Kayıt Tarihi</div><div class="val">${new Date(o.created_at).toLocaleDateString('tr-TR')}</div></div>
      <div class="box"><div class="label">Cihaz Bilgisi</div><div class="val">${o.device_brand} ${o.device_model}</div></div>
      <div class="box"><div class="label">Tahmini Teslim</div><div class="val">${o.estimated_delivery ? new Date(o.estimated_delivery).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</div></div>
    </div>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <div class="label">Arıza / Şikayet Açıklaması</div>
      <div style="font-size: 14px; color: #334155; margin-top: 4px;">${o.fault_description || '—'}</div>
    </div>
    ${o.approval_desc ? `
    <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <div class="label" style="color: #0369a1;">Teklif & Onarım Kapsamı</div>
      <div style="font-size: 14px; color: #0c4a6e; margin-top: 4px;">${o.approval_desc}</div>
    </div>
    ` : ''}
    <div class="total-box">
      <div>
        <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase;">Toplam Tutar</div>
        <div style="font-size: 12px; color: #15803d;">KDV Dahil</div>
      </div>
      <div style="font-size: 26px; font-weight: 900; color: #166534;">${formatCurrency(total)}</div>
    </div>
    <div class="footer">
      <div>Takip Kodu: <strong>${o.order_no}</strong></div>
      <div>${shopName} — Müşteri İletişim: ${shopPhone}</div>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
