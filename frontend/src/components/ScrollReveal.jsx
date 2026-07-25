import { motion } from 'framer-motion';

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  once = true,
}) {
  const fromY = direction === 'down' ? -32 : direction === 'up' ? 32 : 0;
  const fromX = direction === 'left' ? 32 : direction === 'right' ? -32 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: fromY, x: fromX }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
