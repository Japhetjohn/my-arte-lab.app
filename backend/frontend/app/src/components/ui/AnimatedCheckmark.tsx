import React, { useEffect, useState } from 'react';

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  color?: string;
}

export const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  size = 28,
  className = '',
  strokeWidth = 2.5,
  color = '#8A2BE2',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = (s - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: s, height: s }}
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="absolute inset-0">
        {/* Background ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={0.12}
        />
        {/* Animated ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={mounted ? 0 : circ}
          style={{
            transition: 'stroke-dashoffset 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
      </svg>

      {/* Checkmark */}
      <svg
        width={s * 0.55}
        height={s * 0.55}
        viewBox="0 0 24 24"
        className="relative z-10"
        style={{
          transform: mounted ? 'scale(1)' : 'scale(0.3)',
          opacity: mounted ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s, opacity 0.2s ease 0.35s',
        }}
      >
        <path
          d="M6 12l4 4 8-8"
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={22}
          strokeDashoffset={mounted ? 0 : 22}
          style={{
            transition: 'stroke-dashoffset 0.3s ease-out 0.5s',
          }}
        />
      </svg>
    </div>
  );
};

export default AnimatedCheckmark;
