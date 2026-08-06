type Row = Record<string, any>

// ─── Field Orders (Saha Servis) ───────────────────────────────────────────────

export function fieldOrderToStore(row: Row): import('./store').FieldOrder {
  return {
    id: String(row.id),
    parent_order_id: row.parent_order_id ? String(row.parent_order_id) : undefined,
    customer_id: row.customer_id ? String(row.customer_id) : undefined,
    technician_id: row.technician_id ? String(row.technician_id) : undefined,
    address: String(row.address),
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : undefined,
    arrived_at: row.arrived_at ? String(row.arrived_at) : undefined,
    completed_at: row.completed_at ? String(row.completed_at) : undefined,
    status: String(row.status || 'scheduled') as any,
    customer_signature: row.customer_signature ? String(row.customer_signature) : undefined,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function fieldOrderToDb(fo: import('./store').FieldOrder, tenantId: string): Row {
  return {
    id: fo.id.match(/^[0-9a-f-]{36}$/i) ? fo.id : undefined,
    tenant_id: tenantId,
    parent_order_id: fo.parent_order_id ?? null,
    customer_id: fo.customer_id ?? null,
    technician_id: fo.technician_id ?? null,
    address: fo.address,
    latitude: fo.latitude ?? null,
    longitude: fo.longitude ?? null,
    scheduled_at: fo.scheduled_at ?? null,
    arrived_at: fo.arrived_at ?? null,
    completed_at: fo.completed_at ?? null,
    status: fo.status,
    customer_signature: fo.customer_signature ?? null,
    photos: fo.photos ?? null,
    notes: fo.notes ?? null,
  }
}

// ─── Dealers (Bayiler B2B) ───────────────────────────────────────────────────

export function dealerToStore(row: Row): import('./store').Dealer {
  return {
    id: String(row.id),
    company_name: String(row.company_name),
    contact_name: row.contact_name ? String(row.contact_name) : undefined,
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    address: row.address ? String(row.address) : undefined,
    tax_no: row.tax_no ? String(row.tax_no) : undefined,
    status: String(row.status || 'pending') as any,
    discount_rate: Number(row.discount_rate) || 0,
    credit_limit: Number(row.credit_limit) || 0,
    payment_terms: Number(row.payment_terms) || 30,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function dealerToDb(d: import('./store').Dealer, tenantId: string): Row {
  return {
    id: d.id.match(/^[0-9a-f-]{36}$/i) ? d.id : undefined,
    tenant_id: tenantId,
    company_name: d.company_name,
    contact_name: d.contact_name ?? null,
    email: d.email ?? null,
    phone: d.phone ?? null,
    address: d.address ?? null,
    tax_no: d.tax_no ?? null,
    status: d.status,
    discount_rate: d.discount_rate,
    credit_limit: d.credit_limit,
    payment_terms: d.payment_terms,
    notes: d.notes ?? null,
  }
}

// ─── Dealer Orders ───────────────────────────────────────────────────────────

export function dealerOrderToStore(row: Row): import('./store').DealerOrder {
  return {
    id: String(row.id),
    dealer_id: String(row.dealer_id),
    order_no: String(row.order_no),
    items: Array.isArray(row.items) ? (row.items as any[]) : [],
    subtotal: Number(row.subtotal) || 0,
    discount_amount: Number(row.discount_amount) || 0,
    vat_amount: Number(row.vat_amount) || 0,
    total: Number(row.total) || 0,
    status: String(row.status || 'draft') as any,
    shipping_address: row.shipping_address ? String(row.shipping_address) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function dealerOrderToDb(o: import('./store').DealerOrder, tenantId: string): Row {
  return {
    id: o.id.match(/^[0-9a-f-]{36}$/i) ? o.id : undefined,
    tenant_id: tenantId,
    dealer_id: o.dealer_id,
    order_no: o.order_no,
    items: o.items,
    subtotal: o.subtotal,
    discount_amount: o.discount_amount,
    vat_amount: o.vat_amount,
    total: o.total,
    status: o.status,
    shipping_address: o.shipping_address ?? null,
    notes: o.notes ?? null,
  }
}

// ─── Dealer Invoices ─────────────────────────────────────────────────────────

export function dealerInvoiceToStore(row: Row): import('./store').DealerInvoice {
  return {
    id: String(row.id),
    dealer_id: String(row.dealer_id),
    order_id: row.order_id ? String(row.order_id) : undefined,
    invoice_no: String(row.invoice_no),
    amount: Number(row.amount) || 0,
    type: String(row.type || 'invoice') as any,
    due_date: row.due_date ? String(row.due_date) : undefined,
    paid_at: row.paid_at ? String(row.paid_at) : undefined,
    status: String(row.status || 'pending') as any,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function dealerInvoiceToDb(inv: import('./store').DealerInvoice, tenantId: string): Row {
  return {
    id: inv.id.match(/^[0-9a-f-]{36}$/i) ? inv.id : undefined,
    tenant_id: tenantId,
    dealer_id: inv.dealer_id,
    order_id: inv.order_id ?? null,
    invoice_no: inv.invoice_no,
    amount: inv.amount,
    type: inv.type,
    due_date: inv.due_date ?? null,
    paid_at: inv.paid_at ?? null,
    status: inv.status,
  }
}
