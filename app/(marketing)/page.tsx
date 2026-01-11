import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MiningRatesTable } from "@/components/marketing/mining-rates-table";
import { fetchMiningRates } from "@/lib/data/mining-rates";

const featureHighlights = [
  {
    title: "AI-Powered Optimization",
    description:
      "Our advanced bots continuously analyze profitability across multiple cryptocurrencies and automatically reallocate hash power to maximize your returns.",
  },
  {
    title: "Autonomous Operations",
    description:
      "Set it and forget it. Our intelligent bots handle all mining decisions, optimizations, and adjustments while you monitor real-time performance.",
  },
  {
    title: "Smart Risk Management",
    description:
      "Built-in algorithms protect your investments by dynamically adjusting strategies based on market volatility and network conditions.",
  },
];

const metrics = [
  { label: "Active bots", value: "58,000+", hint: "AI-powered mining bots optimizing operations" },
  { label: "Mining efficiency", value: "24%", hint: "Average improvement in hash rate optimization" },
  { label: "Uptime reliability", value: "99.8%", hint: "Autonomous bot operation with minimal downtime" },
];

const workflow = [
  {
    title: "Deploy your mining bot",
    description:
      "Create your account and configure your AI mining bot. Choose optimization strategies and set your risk preferences.",
  },
  {
    title: "Bots optimize automatically",
    description:
      "Our intelligent bots analyze market conditions, adjust hash power allocation, and optimize mining across multiple cryptocurrencies 24/7.",
  },
  {
    title: "Monitor & collect rewards",
    description:
      "Watch your bots work in real-time through our dashboard. Automated payouts deliver your optimized earnings directly to your wallet.",
  },
];

const testimonials = [
  {
    name: "Liam Chen",
    role: "Retail miner, Singapore",
    quote:
      "The AI bots handle everything automatically. They optimize hash allocation based on real-time profitability and I just watch the rewards roll in.",
  },
  {
    name: "Sophia Grant",
    role: "Community miner, Colorado",
    quote:
      "NovaxBlockPool's advanced algorithms removed all the guesswork. The bots continuously adapt to market conditions and maximize my mining efficiency.",
  },
];

const trustBadges = ["F2Pool", "CoinGecko", "Chainalysis", "Fireblocks", "Ledger Enterprise"];

export default async function HomePage() {
  const miningRates = await fetchMiningRates();

  return (
    <div className="relative overflow-hidden">
      <HeroSection />
      <div className="bg-[radial-gradient(circle_at_top,_rgba(139,69,19,0.12),_transparent_60%)]">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <MetricsStrip />
          <section className="grid gap-6 lg:grid-cols-[1fr,1fr]">
            <div className="space-y-5 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-sm backdrop-blur">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                AI-driven mining optimization
              </h2>
              <p className="text-sm text-muted-foreground">
                Our intelligent bots continuously analyze market conditions, compare profitability across 
                multiple cryptocurrencies, and automatically reallocate hash power to maximize your returns.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Autonomous bot decision-making based on real-time market analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Machine learning algorithms identify optimal mining opportunities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>24/7 monitoring and automatic adjustments for maximum profitability</span>
                </li>
              </ul>
              <LatencyBadge />
            </div>
            <MiningRatesTable initialData={miningRates} />
          </section>
        </section>
      </div>
      <FeatureSection />
      <WorkflowSection />
      <TrustSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-amber-950 via-amber-900 to-amber-800 text-amber-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.25),_transparent_65%)]" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/40 bg-amber-600/20 px-4 py-1 text-xs font-medium uppercase tracking-[0.35em] text-amber-200">
              AI-Powered Mining Operations
            </div>
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Advanced bots working 24/7 to optimize your mining operations
            </h1>
            <p className="max-w-xl text-pretty text-lg text-amber-100/80">
              NovaxBlockPool uses cutting-edge AI algorithms to autonomously manage and optimize your mining operations. 
              Our intelligent bots continuously analyze market conditions, adjust hash power allocation, 
              and maximize profitability while you focus on growing your crypto portfolio.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/auth/signup">Deploy Your Mining Bot</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/pricing">View Bot Plans</Link>
              </Button>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
              Powered by advanced machine learning and professional mining infrastructure
            </p>
          </div>
          <div className="relative z-10 space-y-6 rounded-3xl border border-amber-400/30 bg-amber-900/60 p-8 shadow-2xl backdrop-blur">
            <h3 className="text-lg font-semibold text-amber-100">
              Bot Performance Snapshot
            </h3>
            <div className="space-y-4 text-sm text-amber-100/80">
              <PortfolioRow label="Active bots" value="12" badge="All optimized" />
              <PortfolioRow label="Hash power managed" value="12.4 TH/s" badge="+6% this week" />
              <PortfolioRow label="24h rewards" value="$312.40" badge="+3.9% vs. average" />
              <PortfolioRow label="Next optimization" value="Today, 20:00 UTC" badge="Auto-adjust" />
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs text-amber-100/80">
              <p className="font-semibold text-amber-100">AI Performance Summary</p>
              <p>
                Bots automatically rebalanced hash power overnight to capture higher Kaspa profitability. 
                Two BTC and one Kaspa withdrawal processed today via automated systems.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PortfolioRow({ label, value, badge }: { label: string; value: string; badge: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-amber-200/70">{label}</p>
        <p className="text-lg font-semibold text-amber-100">{value}</p>
      </div>
      <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-semibold text-amber-100">
        {badge}
      </span>
    </div>
  );
}


function MetricsStrip() {
  return (
    <div className="grid gap-4 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {metric.label}
          </p>
          <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
          <p className="text-xs text-muted-foreground">{metric.hint}</p>
        </div>
      ))}
    </div>
  );
}

function FeatureSection() {
  return (
    <section className="bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-primary">Why NovaxBlockPool</p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Advanced AI bots that work around the clock to maximize your mining profits
          </h2>
          <p className="text-pretty text-sm text-muted-foreground sm:text-base">
            No more manual monitoring or complex decision-making. NovaxBlockPool's intelligent algorithms 
            handle everything—from hash power allocation to profit optimization—so you can focus 
            on what matters: growing your crypto portfolio.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {featureHighlights.map((feature) => (
            <Card
              key={feature.title}
              className="border-border/60 bg-card/80 shadow-sm transition hover:shadow-lg"
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 lg:px-8">
      <div className="space-y-4 text-center md:text-left">
        <p className="text-xs uppercase tracking-[0.4em] text-primary">How it works</p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Deploy your AI mining bot in minutes. Watch it optimize 24/7.
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Our intelligent bots handle all the complex decisions—from selecting optimal coins to 
          adjusting hash power allocation. You just configure, deploy, and collect optimized rewards.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {workflow.map((item, index) => (
          <div
            key={item.title}
            className="group relative space-y-4 rounded-2xl border border-border/60 bg-card/80 p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {String(index + 1).padStart(2, "0")}
            </div>
            <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-center text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Trusted by
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-muted-foreground sm:gap-10">
          {trustBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border/50 px-4 py-2 uppercase tracking-[0.35em]"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 lg:px-8">
      <div className="space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-primary">Customer stories</p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Everyday miners, long-term crypto believers
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name} className="border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">“{testimonial.quote}”</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-xs text-muted-foreground">{testimonial.role}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="mx-auto w-full max-w-6xl rounded-3xl border border-primary/30 bg-primary/10 px-4 py-14 text-center sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h2 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
          Let AI-powered bots optimize your mining operations today.
        </h2>
        <p className="text-sm text-primary/80 sm:text-base">
          NovaxBlockPool eliminates the need for manual monitoring and complex decision-making. Deploy your 
          intelligent mining bot, let it work autonomously, and watch your optimized rewards grow.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/auth/signup">Deploy Your Mining Bot</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">View Bot Plans</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}


function LatencyBadge() {
  return (
    <div className="pt-4 text-xs text-muted-foreground">
      F2Pool API latency:{" "}
      <span className="font-semibold text-foreground">~320 ms</span> median
    </div>
  );
}

