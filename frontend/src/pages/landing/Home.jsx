import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Box, Users, PenTool, FileImage, CheckCircle2, Sparkles, Layers,
  Bot, TrendingUp, Calendar, Quote, HardHat, Shield,
} from 'lucide-react';
import ScrollReveal from '../../components/ScrollReveal';
import { HOME_DESIGN_FEATURES, PLATFORM_WORKFLOW_HIGHLIGHTS } from '../../utils/constants';
import { BRAND_ASSETS, HERO_SLIDE_CONTENT, RESOURCE_HERO } from '../../components/BrandLogo';
import { publicAPI } from '../../services/api';
import {
  formatCurrencyCompact, formatNumber, formatPercent,
} from '../../utils/helpers';
import FullHouseImageSlider from '../../components/FullHouseImageSlider';

const HERO_SLIDES = HERO_SLIDE_CONTENT;
const WORKFLOW_BG = BRAND_ASSETS.onePlatformBackground || RESOURCE_HERO.hero4;

const steps = [
  { step: '01', title: 'Create a project', desc: 'Set location, budget, building type, and timeline — your workspace is ready in minutes.', icon: Box },
  { step: '02', title: 'Design in 3D', desc: 'Draw floor plans, dimensions, floors, and materials in the Building Editor.', icon: PenTool },
  { step: '03', title: 'AI planning', desc: 'Generate cost estimates, schedules, risk insights, and full-house renders from your design.', icon: Bot },
  { step: '04', title: 'Blueprints & exports', desc: 'Download floor plans and exterior images for stakeholders and permits.', icon: FileImage },
  { step: '05', title: 'Assign & schedule', desc: 'Bring contractors on site tasks with Gantt scheduling and clear assignments.', icon: Calendar },
  { step: '06', title: 'Build & monitor', desc: 'Track daily logs, materials, issues, and progress until handover.', icon: TrendingUp },
];

const designFeatureIcons = { PenTool, FileImage, Bot };
const workflowIcons = { Layers, HardHat, Shield };

function buildStatsFromApi(raw) {
  if (!raw) {
    return [
      { value: '—', label: 'Active Projects' },
      { value: '—', label: 'Managed Budget' },
      { value: '—', label: 'Team Members' },
      { value: '—', label: 'Avg. Progress' },
    ];
  }
  const budgetLabel = raw.totalBudget > 0
    ? `${formatCurrencyCompact(raw.totalBudget)} FRw`
    : `${formatNumber(0)} FRw`;
  return [
    { value: formatNumber(raw.projectCount), label: 'Active Projects' },
    { value: budgetLabel, label: 'Managed Budget' },
    { value: formatNumber(raw.activeUsers), label: 'Team Members' },
    { value: formatPercent(raw.avgProgress, 1), label: 'Avg. Progress' },
  ];
}

export default function Home() {
  const [heroIndex, setHeroIndex] = useState(0);

  const { data: landingStats } = useQuery({
    queryKey: ['public-landing-stats'],
    queryFn: publicAPI.getLandingStats,
    staleTime: 60_000,
  });

  const { data: showcaseData } = useQuery({
    queryKey: ['public-showcase-projects'],
    queryFn: publicAPI.getShowcaseProjects,
    staleTime: 60_000,
  });

  const { data: testimonialData } = useQuery({
    queryKey: ['public-testimonials'],
    queryFn: publicAPI.getTestimonials,
    staleTime: 60_000,
  });

  const stats = useMemo(() => buildStatsFromApi(landingStats), [landingStats]);
  const showcaseProjects = showcaseData?.projects || [];
  const testimonials = testimonialData?.testimonials || [];
  const activeSlide = HERO_SLIDES[heroIndex] || HERO_SLIDES[0];

  useEffect(() => {
    if (HERO_SLIDES.length <= 1) return undefined;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={heroIndex}
            src={activeSlide.image}
            alt=""
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-steel-900/95 via-steel-900/75 to-steel-900/40" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

        <div className="page-container relative z-10 py-20 lg:py-28 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={heroIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45 }}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 mb-6">
                    <Sparkles className="h-4 w-4 text-primary" /> {activeSlide.badge}
                  </span>
                  <h1 className="text-4xl font-bold text-white leading-[1.1] md:text-5xl lg:text-6xl">
                    {activeSlide.title}
                    <span className="block text-primary mt-1">{activeSlide.highlight}</span>
                  </h1>
                  <p className="mt-6 text-lg text-steel-200 max-w-xl leading-relaxed">
                    {activeSlide.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/login" className="btn-primary !px-8 !py-3.5 text-base shadow-glow-primary">
                  {activeSlide.ctaPrimary} <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to={activeSlide.ctaSecondary === 'Contact us' ? '/contact' : '/about'}
                  className="btn-outline !border-steel-300 !text-white hover:!bg-white/10 !px-8 !py-3.5 text-base"
                >
                  {activeSlide.ctaSecondary}
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-steel-300">
                {['3D Building Editor', 'AI Cost Engine', 'Gantt Scheduling', 'Multi-role Access'].map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative hidden lg:block"
            >
              <Link to="/about" className="block relative rounded-2xl border border-white/15 overflow-hidden shadow-2xl ring-1 ring-white/10 group">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={heroIndex}
                    src={activeSlide.image}
                    alt={activeSlide.badge}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="h-[420px] w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                </AnimatePresence>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setHeroIndex(i);
                      }}
                      className={`h-1.5 rounded-full transition-all ${i === heroIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-steel-900/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between gap-3 pointer-events-none">
                  <div>
                    <p className="text-white font-bold text-lg">{activeSlide.badge}</p>
                    <p className="text-steel-200 text-sm line-clamp-2">{activeSlide.subtitle}</p>
                  </div>
                  <Layers className="h-10 w-10 text-primary shrink-0" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats — live from database */}
      <section className="py-14 border-b border-steel-100 bg-white">
        <div className="page-container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.08}>
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium text-concrete">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Design features (replaces Everything You Need) */}
      <section className="py-24 bg-concrete-50">
        <div className="page-container">
          <ScrollReveal className="text-center mb-16 max-w-2xl mx-auto">
            <span className="badge-info mb-4">Design-first platform</span>
            <h2 className="section-title">Design That Drives Every Decision</h2>
            <p className="section-subtitle mx-auto mt-4">
              Three pillars connect your 3D model to estimates, documents, and delivery — no duplicate spreadsheets.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-3">
            {HOME_DESIGN_FEATURES.map((item, i) => {
              const Icon = designFeatureIcons[item.icon] || PenTool;
              return (
                <ScrollReveal key={item.title} delay={i * 0.08}>
                  <div className="card h-full hover:shadow-lg hover:border-primary/20 transition-all duration-300 group p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-steel">{item.title}</h3>
                        <p className="mt-2 text-sm text-concrete leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full-house auto slider */}
      <section className="py-20 bg-white">
        <div className="page-container">
          <ScrollReveal className="text-center mb-12 max-w-2xl mx-auto">
            <span className="badge-info mb-4">Project gallery</span>
            <h2 className="section-title">Full-House Designs on the Platform</h2>
            <p className="section-subtitle mx-auto mt-4">
              Auto-sliding previews from real project exterior renders.
            </p>
          </ScrollReveal>
          <ScrollReveal>
            <FullHouseImageSlider projects={showcaseProjects} />
          </ScrollReveal>
        </div>
      </section>

      {/* How it works — card only (no header images) */}
      <section className="py-24 bg-concrete-50">
        <div className="page-container">
          <ScrollReveal className="text-center mb-16">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle mx-auto mt-4">Six steps from concept to construction site</p>
          </ScrollReveal>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.06}>
                <div className="card h-full p-6 hover:shadow-md hover:border-primary/15 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white text-sm font-bold">
                      {s.step}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-steel">{s.title}</h3>
                  <p className="mt-2 text-sm text-concrete leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow highlight — background image (replaces Built for Every Role) */}
      <section className="relative py-28 overflow-hidden">
        <img src={WORKFLOW_BG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-steel-900/85" />
        <div className="page-container relative z-10">
          <ScrollReveal className="text-center mb-14 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white">One Platform, End to End</h2>
            <p className="mt-4 text-steel-200">
              Replace the old role silos with a connected workflow — design, govern, and deliver on one stack.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-3">
            {PLATFORM_WORKFLOW_HIGHLIGHTS.map((r, i) => {
              const Icon = workflowIcons[r.icon] || Layers;
              return (
                <ScrollReveal key={r.title} delay={i * 0.1}>
                  <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-6 hover:bg-white/15 transition-colors h-full">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary mb-4">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{r.title}</h3>
                    <p className="mt-2 text-sm text-steel-200 leading-relaxed">{r.description}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials — approved only */}
      <section className="py-24 bg-concrete-50">
        <div className="page-container">
          <ScrollReveal className="text-center mb-14">
            <h2 className="section-title">Trusted by Builders</h2>
            <p className="section-subtitle mx-auto mt-4 max-w-lg">
              Stories from teams using BuildPlan AI — share yours in the footer.
            </p>
          </ScrollReveal>
          {testimonials.length === 0 ? (
            <ScrollReveal className="text-center text-concrete text-sm max-w-md mx-auto">
              No approved testimonials yet. Be the first — use the form in the footer beside Contact.
            </ScrollReveal>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.slice(0, 6).map((t, i) => (
                <ScrollReveal key={t.id || t.author} delay={i * 0.1}>
                  <div className="card h-full">
                    <Quote className="h-8 w-8 text-primary/30 mb-4" />
                    <p className="text-steel-700 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-6 pt-4 border-t border-steel-100">
                      <p className="font-semibold text-steel">{t.author}</p>
                      {t.role && <p className="text-xs text-concrete">{t.role}</p>}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-primary to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <ScrollReveal className="page-container text-center relative z-10">
          <Users className="h-12 w-12 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Transform Your Projects?</h2>
          <p className="text-white/90 mb-10 max-w-lg mx-auto text-lg">
            The platform is free — create an account and start designing with AI-backed planning tools.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-primary hover:bg-white/95 shadow-lg transition-colors">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors">
              Contact us
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
