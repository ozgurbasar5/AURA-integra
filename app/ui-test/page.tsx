import { notFound } from 'next/navigation'
import BrandUiTestClient from './BrandUiTestClient'

export default function BrandUiTestPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <BrandUiTestClient />
}
