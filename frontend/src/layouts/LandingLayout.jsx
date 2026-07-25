import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { LANDING_NAV } from '../utils/constants';
import Footer from '../components/Footer';
import ScrollToTop from '../components/ScrollToTop';
import LandingChatbot from '../components/LandingChatbot';
import BrandLogo from '../components/BrandLogo';
import { classNames } from '../utils/helpers';

export default function LandingLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-concrete-50">
      <header
        className={classNames(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-steel-100/80 bg-white/95 shadow-md shadow-steel-900/5 backdrop-blur-xl'
            : 'border-b border-transparent bg-white/70 backdrop-blur-xl',
        )}
      >
        <div className="page-container flex h-[4.25rem] items-center justify-between gap-4">
          <BrandLogo to="/" />

          <nav className="hidden lg:flex items-center gap-1">
            {LANDING_NAV.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={classNames(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                  location.pathname === item.path
                    ? 'text-primary bg-primary/8'
                    : 'text-steel-600 hover:text-primary hover:bg-steel-50',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link to="/login" className="btn-ghost !font-semibold">Sign In</Link>
            <Link to="/login" className="btn-primary !font-semibold shadow-glow-primary">Get Started Free</Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="btn-ghost !p-2 lg:hidden" aria-label="Menu">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-steel-100 bg-white/98 backdrop-blur-xl overflow-hidden"
            >
              <div className="page-container py-4 space-y-1 max-h-[70vh] overflow-y-auto">
                {LANDING_NAV.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="block rounded-xl px-3 py-3 text-base font-semibold text-steel-700 hover:bg-steel-50 hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 pt-4 border-t border-steel-100 mt-2">
                  <Link to="/login" className="btn-outline w-full justify-center">Sign In</Link>
                  <Link to="/login" className="btn-primary w-full justify-center">Get Started Free</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <ScrollToTop />
      <LandingChatbot />
    </div>
  );
}
