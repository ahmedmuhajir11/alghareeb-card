import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onDone: () => void;
}

export default function LoadingScreen({ onDone }: LoadingScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!fadeOut) return;
    const timer = setTimeout(() => onDone(), 600);
    return () => clearTimeout(timer);
  }, [fadeOut, onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080810]"
      style={{
        transition: "opacity 0.6s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? "none" : "auto",
      }}
    >
      <div className="relative flex flex-col items-center gap-8 select-none">

        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(ellipse at center, rgba(139,92,246,0.18) 0%, transparent 70%)",
            transform: "scale(2.5)",
          }}
        />

        <div style={{ animation: "logoFloat 3s ease-in-out infinite" }}>
          <div
            style={{
              filter: "drop-shadow(0 0 28px rgba(139,92,246,0.7)) drop-shadow(0 0 8px rgba(212,175,55,0.4))",
              animation: "logoPulse 2s ease-in-out infinite",
            }}
          >
            <img
              src="/loading-logo.png"
              alt="AlGhareeb Card"
              style={{
                width: "clamp(140px, 35vw, 220px)",
                height: "auto",
                display: "block",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="relative w-48 h-1 rounded-full overflow-hidden bg-white/5">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: "linear-gradient(90deg, #7c3aed, #a855f7, #d4af37)",
                animation: "loadingBar 1.8s ease-in-out forwards",
                boxShadow: "0 0 10px rgba(168,85,247,0.8)",
              }}
            />
          </div>

          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-purple-400"
                style={{
                  animation: `dotBounce 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes logoPulse {
          0%, 100% { filter: drop-shadow(0 0 28px rgba(139,92,246,0.7)) drop-shadow(0 0 8px rgba(212,175,55,0.4)); }
          50% { filter: drop-shadow(0 0 42px rgba(139,92,246,0.95)) drop-shadow(0 0 16px rgba(212,175,55,0.6)); }
        }
        @keyframes loadingBar {
          0% { width: 0%; }
          30% { width: 45%; }
          70% { width: 78%; }
          100% { width: 100%; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
