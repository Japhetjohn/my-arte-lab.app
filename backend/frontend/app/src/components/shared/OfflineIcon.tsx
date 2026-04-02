// Inline SVG for offline state - no external image needed
export function OfflineIcon({ className = "w-32 h-32 mb-6" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="100" cy="100" r="80" fill="#F3E8FF" />
      
      {/* WiFi signal waves */}
      <path
        d="M100 140 L100 100"
        stroke="#8A2BE2"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M70 110 Q100 80 130 110"
        stroke="#8A2BE2"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M55 95 Q100 55 145 95"
        stroke="#8A2BE2"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M40 80 Q100 30 160 80"
        stroke="#8A2BE2"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* X mark */}
      <circle cx="145" cy="145" r="25" fill="#DC2626" />
      <path
        d="M135 135 L155 155"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M155 135 L135 155"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
