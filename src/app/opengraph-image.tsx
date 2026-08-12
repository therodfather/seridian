import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#070b14",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(34, 211, 238, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 211, 238, 0.04) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Glow orb behind text */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 40%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Title */}
        <div
          style={{
            position: "relative",
            fontSize: 72,
            fontWeight: 700,
            background: "linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #67e8f9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -1,
          }}
        >
          Seridian
        </div>

        {/* Subtitle */}
        <div
          style={{
            position: "relative",
            fontSize: 24,
            fontWeight: 400,
            color: "#94a3b8",
            marginTop: 16,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Cloud Infrastructure &amp; Application Development
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            width: 120,
            height: 3,
            borderRadius: 2,
            background: "linear-gradient(90deg, transparent, #06b6d4, transparent)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
