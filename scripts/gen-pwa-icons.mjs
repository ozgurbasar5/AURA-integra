import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(
  process.env.USERPROFILE || '',
  '.cursor/projects/c-Users-bsr-Yeni-klas-r-AURA-integra/assets/icon-source.png',
)
const out = path.join(__dirname, '../public')

await sharp(src).resize(192, 192).png().toFile(path.join(out, 'icon-192.png'))
await sharp(src).resize(512, 512).png().toFile(path.join(out, 'icon-512.png'))
await sharp(src).resize(180, 180).png().toFile(path.join(out, 'apple-touch-icon.png'))
console.log('PWA icons written to public/')
