/** ERP connector arayüzü — CSV stub → Mikro/Logo */

export type ErpExportResult = {
  ok: boolean
  format: 'csv'
  filename: string
  content?: string
  downloadUrl?: string
  message?: string
  error?: string
}

export type ErpConnector = {
  id: 'csv' | 'mikro' | 'logo'
  label: string
  test(): Promise<{ ok: boolean; message?: string; error?: string }>
  exportJournal(opts?: { days?: number }): Promise<ErpExportResult>
}
