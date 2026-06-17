#!/usr/bin/env node
/** MCP / PAT bağlantı testi — token .cursor/mcp.json'dan okunur */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mcpPath = join(root, '.cursor', 'mcp.json')

if (!existsSync(mcpPath)) {
  console.error('❌ .cursor/mcp.json yok')
  process.exit(1)
}

const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'))
const args = mcp.mcpServers?.['supabase-integra']?.args ?? []
const tokenIdx = args.indexOf('--access-token')
const refIdx = args.indexOf('--project-ref')
const token = tokenIdx >= 0 ? args[tokenIdx + 1] : ''
const projectRef = refIdx >= 0 ? args[refIdx + 1] : 'dipyrdidkvljojkyaqmd'

if (!token || token.startsWith('BURAYA')) {
  console.error('❌ MCP access token eksik (.cursor/mcp.json)')
  process.exit(1)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
  headers: { Authorization: `Bearer ${token}` },
})

if (!res.ok) {
  const body = await res.text()
  console.error(`❌ Supabase API ${res.status}: ${body.slice(0, 200)}`)
  process.exit(1)
}

const project = await res.json()
console.log('✓ MCP token geçerli')
console.log(`✓ Proje: ${project.name ?? projectRef} (${projectRef})`)
console.log(`  Region: ${project.region ?? 'n/a'}, Status: ${project.status ?? 'n/a'}`)
