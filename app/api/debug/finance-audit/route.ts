import { NextRequest, NextResponse } from 'next/server'
import { runFinanceIntegrationAudit } from '@/lib/finance-integration-audit'
import { isDiagnosticAuthorized, diagnosticUnauthorizedResponse } from '@/lib/diagnostic-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isDiagnosticAuthorized(request)) {
    return diagnosticUnauthorizedResponse()
  }

  const report = runFinanceIntegrationAudit('api-audit')
  return NextResponse.json(report)
}
