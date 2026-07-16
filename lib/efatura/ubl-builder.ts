/** UBL-TR 1.2 e-Fatura XML builder (offline — GIB'e göndermeden saklanabilir) */

import type { EfaturaInvoicePayload } from './provider'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(n: number): string {
  return (Number(n) || 0).toFixed(2)
}

/** Minimal UBL-TR Invoice XML — entegratör gönderimi için temel iskelet */
export function buildUblTrInvoice(
  invoice: EfaturaInvoicePayload,
  opts?: { supplierName?: string; supplierVkn?: string },
): string {
  const uuid = `AURA-${invoice.invoice_no}-${Date.now()}`
  const issueDate = (invoice.invoice_date || new Date().toISOString()).slice(0, 10)
  const supplierName = opts?.supplierName || 'AURA Integra Bayi'
  const supplierVkn = opts?.supplierVkn || '0000000000'
  const customerVkn = invoice.customer_vkn || '1111111111'
  const lineExt = money(invoice.subtotal)
  const tax = money(invoice.tax_amount)
  const total = money(invoice.total)
  const desc = esc(invoice.description || invoice.customer_name || 'Hizmet/Satış')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>TEMELFATURA</cbc:ProfileID>
  <cbc:ID>${esc(invoice.invoice_no)}</cbc:ID>
  <cbc:UUID>${esc(uuid)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${esc(supplierVkn)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${esc(supplierName)}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${esc(customerVkn)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${esc(invoice.customer_name)}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${tax}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${lineExt}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${lineExt}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${total}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="TRY">${total}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="TRY">${lineExt}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${desc}</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="TRY">${lineExt}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`
}
