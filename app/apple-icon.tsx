import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c4a6e',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            background: 'linear-gradient(135deg, #22d3ee 0%, #2563eb 100%)',
            transform: 'rotate(45deg)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              background: '#ffffff',
              borderRadius: 999,
              transform: 'rotate(-45deg)',
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  )
}
