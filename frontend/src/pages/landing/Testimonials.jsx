import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { TESTIMONIALS } from '../../utils/constants';

export default function Testimonials() {
  return (
    <div className="py-16">
      <div className="page-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="section-title">What Our Clients Say</h1>
          <p className="section-subtitle mx-auto mt-4">
            Trusted by construction leaders worldwide.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card relative"
            >
              <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/10" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-safety text-safety" />
                ))}
              </div>
              <p className="text-steel leading-relaxed mb-6">&ldquo;{t.content}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-steel">{t.name}</p>
                  <p className="text-xs text-concrete">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
