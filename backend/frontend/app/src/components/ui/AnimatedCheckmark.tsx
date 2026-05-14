import React, { useEffect, useState } from 'react';

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  color?: string;
}

export const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2.5,
  color = '#8A2BE2',
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={0.15}
        />
        {/* Animated circle draw */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? 0 : circumference}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
      </svg>

      {/* Animated checkmark */}
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        className="relative z-10"
        style={{
          transform: animate ? 'scale(1)' : 'scale(0)',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s',
        }}
      >
        <path
          d="M5 13l4 4L19 7"
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={30}
          strokeDashoffset={animate ? 0 : 30}
          style={{
            transition: 'stroke-dashoffset 0.4s ease-out 0.5s',
          }}
        />
      </svg>
    </div>
  );
};

export default AnimatedCheckmark;
