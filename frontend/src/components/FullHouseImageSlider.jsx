import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { HERO_SLIDE_CONTENT } from './BrandLogo';
import { resolveUploadUrl } from '../utils/helpers';
import { StatusBadge, ProgressBar } from './PageHeader';

/**
 * Auto-rotating gallery of full-house exterior renders from platform projects.
 */
export default function FullHouseImageSlider({ projects = [] }) {
  const slides = useMemo(() => {
    const fromDb = (projects || [])
      .filter((p) => p.imageUrl || p.name)
      .map((p) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        status: p.status,
        progressPercentage: p.progressPercentage,
        imageUrl: resolveUploadUrl(p.imageUrl) || null,
      }));

    if (fromDb.length > 0) return fromDb;

    return HERO_SLIDE_CONTENT.slice(0, 4).map((s, i) => ({
      id: `fallback-${i}`,
      name: s.badge,
      location: null,
      status: 'in_progress',
      progressPercentage: 0,
      imageUrl: s.image,
    }));
  }, [projects]);

  const [index, setIndex] = useState(0);
  const active = slides[index] || slides[0];

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!active) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
      <div className="relative overflow-hidden rounded-2xl border border-steel-100 bg-steel-100 shadow-lg aspect-[16/10] sm:aspect-[16/9]">
        <AnimatePresence mode="wait">
          <motion.img
            key={active.id + index}
            src={active.imageUrl || HERO_SLIDE_CONTENT[0].image}
            alt={active.name}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-steel-900/70 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <StatusBadge status={active.status} />
            <p className="text-white font-bold text-lg mt-2 truncate">{active.name}</p>
            {active.location && (
              <p className="text-steel-200 text-sm flex items-center gap-1 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {active.location}
              </p>
            )}
          </div>
        </div>
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-7 bg-primary' : 'w-2 bg-white/60 hover:bg-white/90'}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">Full-house renders</p>
        <h3 className="text-2xl font-bold text-steel leading-snug">
          Photorealistic exteriors from saved 3D designs
        </h3>
        <p className="text-concrete text-sm leading-relaxed">
          Each slide is generated from a real project on the platform — same geometry as your Building Editor and blueprint exports.
        </p>
        {active.progressPercentage != null && (
          <div className="card !p-4">
            <p className="text-xs text-concrete mb-2">Project progress</p>
            <ProgressBar value={active.progressPercentage || 0} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                i === index ? 'bg-primary text-white' : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
