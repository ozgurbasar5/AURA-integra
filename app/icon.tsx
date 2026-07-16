import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/** Sekme favicon — AURA cyan/mavi baklava */
export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            background: 'linear-gradient(135deg, #22d3ee 0%, #2563eb 100%)',
            transform: 'rotate(45deg)',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
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
