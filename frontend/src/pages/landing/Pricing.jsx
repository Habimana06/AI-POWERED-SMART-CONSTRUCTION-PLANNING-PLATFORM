import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { PRICING_PLANS } from '../../utils/constants';

export default function Pricing() {
  return (
    <div className="py-16">
      <div className="page-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="section-title">Simple, Transparent Pricing</h1>
          <p className="section-subtitle mx-auto mt-4">
            Choose the plan that fits your team. All plans include a 14-day free trial.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl bg-white border border-steel-100 p-8 shadow-card transition-all duration-200 hover:shadow-card-hover ${plan.highlighted ? 'ring-2 ring-primary shadow-card-hover' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="badge-info shadow-sm">Most Popular</span>
                </div>
              )}
              <h3 className="text-xl font-bold text-steel-800">{plan.name}</h3>
              <p className="mt-1 text-sm text-concrete-400">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-steel-800">${plan.price}</span>
                <span className="text-concrete-400">/{plan.period}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-steel-600">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className={`mt-8 block w-full text-center ${plan.highlighted ? 'btn-primary' : 'btn-outline'}`}
              >
                {plan.highlighted ? (
                  <><Sparkles className="h-4 w-4" /> Start Free Trial</>
                ) : (
                  'Get Started'
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
