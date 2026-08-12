import { Badge, Button, Card, CardContent } from "@bytecats/ui-kit";
import HeroWebGL from "./HeroWebGL";
import { ROUTES } from "@/lib/routes";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 pt-16">
      {/* WebGL background layer — absolute, behind content, no CLS */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <HeroWebGL />
        {/* subtle grid + orb kept as low-opacity overlay for fallback/texture */}
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="glow-orb pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[800px] -translate-x-1/2 opacity-60" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-6 inline-flex items-center gap-2 rounded-full border-seridian-500/20 bg-seridian-500/5 px-4 py-1.5 text-seridian-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-seridian-400" />
            <span className="font-mono text-sm text-seridian-300">
              Cloud Infrastructure & Application Development
            </span>
          </Badge>

          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl md:leading-[1.1]">
            Build and scale with{" "}
            <span className="gradient-text">clarity and confidence</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            Seridian partners with organizations to architect resilient cloud
            infrastructure, ship modern applications, and navigate complex
            technical decisions — so your team can focus on what matters.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full rounded-lg bg-seridian-500 px-8 py-3.5 text-center text-sm font-semibold text-slate-950 hover:bg-seridian-400 sm:w-auto h-auto"
            >
              <a href={ROUTES.packagesHealthCheck}>Buy the $999 Health Check</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full rounded-lg border-white/10 bg-white/5 px-8 py-3.5 text-center text-sm font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto h-auto"
            >
              <a href={ROUTES.packages}>See packages</a>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { value: "Cloud-native", label: "Architecture & migration" },
            { value: "Full-stack", label: "Application development" },
            { value: "DevOps", label: "CI/CD & automation" },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="card-glow rounded-xl border-white/5 bg-slate-850/50 p-6 text-center backdrop-blur-sm transition-all"
            >
              <CardContent className="p-0">
                <div className="font-display text-lg font-semibold text-seridian-400">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
