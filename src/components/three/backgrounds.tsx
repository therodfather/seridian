"use client";

export function NeuralBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#070b14]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-cyan-500/5 blur-[120px]" />
    </div>
  );
}

export function FloatingPagesBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#070b14]" />
      <div className="absolute top-1/4 right-1/4 h-[500px] w-[700px] rounded-full bg-violet-500/5 blur-[120px]" />
    </div>
  );
}
