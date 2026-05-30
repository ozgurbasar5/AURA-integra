export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="auraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" /> {/* blue-600 */}
          <stop offset="100%" stopColor="#10B981" /> {/* emerald-500 */}
        </linearGradient>
      </defs>
      
      {/* Outer Hexagon */}
      <path
        d="M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z"
        fill="url(#auraGradient)"
      />
      
      {/* Inner Elements representing "Integra" connectivity */}
      <path
        d="M50 25 L75 40 L75 60 L50 75 L25 60 L25 40 Z"
        fill="white"
        fillOpacity="0.2"
      />
      
      {/* The "A" and "I" abstraction */}
      <path
        d="M50 35 L65 65 H55 L50 55 L45 65 H35 Z"
        fill="white"
      />
      
      {/* Connected dot for Integra */}
      <circle cx="50" cy="55" r="4" fill="#10B981" />
    </svg>
  );
}
