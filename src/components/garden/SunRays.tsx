export default function SunRays() {
  return (
    <>
      <style>{`
        @keyframes sun-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes ray-drift {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div
        className="absolute rounded-full"
        style={{
          top: 26,
          right: 30,
          width: 28,
          height: 28,
          background: 'radial-gradient(circle, #fbbf24, #f59e0b)',
          animation: 'sun-pulse 3s ease-in-out infinite',
          boxShadow: '0 0 12px 4px rgba(251,191,36,0.4)',
        }}
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute"
          style={{
            top: 39,
            right: 26,
            width: 18,
            height: 2,
            background: '#fbbf24',
            borderRadius: 1,
            transformOrigin: 'left center',
            transform: `rotate(${deg}deg) translateX(16px)`,
            animation: `ray-drift ${2 + (deg % 90 === 0 ? 0 : deg % 45 === 0 ? 0.4 : 0.8)}s ease-in-out infinite`,
            animationDelay: `${(deg / 45) * 100}ms`,
            opacity: 0.5,
          }}
        />
      ))}
    </>
  );
}
