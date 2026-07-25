import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '../../utils/constants';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="py-16">
      <div className="page-container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="section-title">Frequently Asked Questions</h1>
          <p className="section-subtitle mx-auto mt-4">
            Everything you need to know about BuildPlan AI.
          </p>
        </motion.div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card !p-0 overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-semibold text-steel pr-4">{item.question}</span>
                <ChevronDown className={`h-5 w-5 text-concrete shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-concrete leading-relaxed">{item.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
