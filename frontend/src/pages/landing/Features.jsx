import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { FEATURES } from '../../utils/constants';

export default function Features() {
  return (
    <div className="py-16">
      <div className="page-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="section-title">Platform Features</h1>
          <p className="section-subtitle mx-auto mt-4">
            Comprehensive AI-powered tools designed for modern construction management.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const Icon = Icons[feature.icon] || Icons.Box;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card group hover:border-primary/20"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-steel">{feature.title}</h3>
                <p className="mt-3 text-concrete leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
