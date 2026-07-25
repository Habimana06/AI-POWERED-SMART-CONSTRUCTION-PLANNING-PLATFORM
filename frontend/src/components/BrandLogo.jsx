import { Link } from 'react-router-dom';
import { classNames } from '../utils/helpers';

/** Served from `resources/hero/` → `public/resources/hero/` (see scripts/sync-hero-images.cjs) */
export const RESOURCE_HERO = {
  hero1: '/resources/hero/hero1.jpg',
  hero2: '/resources/hero/hero2.jpg',
  hero3: '/resources/hero/hero3.jpg',
  hero4: '/resources/hero/hero4.jpg',
  onePlatformBackground: '/resources/hero/one-platform-background.jpg',
  login1: '/resources/hero/login1.jpg',
};

/** Brand mark from `/resources/logo.svg` (served as `/brand/logo.svg`) */
export const HERO_SLIDE_CONTENT = [
  {
    image: RESOURCE_HERO.hero1,
    badge: '3D Building Design',
    title: 'Plan, Design & Build',
    highlight: 'In True 3D',
    subtitle: 'Draw floor plans and dimensions — your model stays the source of truth for renders, costs, and schedules.',
    ctaPrimary: 'Get Started Free',
    ctaSecondary: 'Learn more',
  },
  {
    image: RESOURCE_HERO.hero2,
    badge: 'AI Planning Engine',
    title: 'Smarter Estimates',
    highlight: 'From Your Design',
    subtitle: 'AI cost, schedule, and risk insights use the same geometry you edited — not generic spreadsheets.',
    ctaPrimary: 'Get Started Free',
    ctaSecondary: 'Contact us',
  },
  {
    image: RESOURCE_HERO.hero3,
    badge: 'Blueprints & Renders',
    title: 'Documents That Match',
    highlight: 'The 3D Model',
    subtitle: 'Export floor plans and full-house exterior images generated from your saved building design.',
    ctaPrimary: 'Get Started Free',
    ctaSecondary: 'About BuildPlan',
  },
  {
    image: RESOURCE_HERO.hero4,
    badge: 'Field Execution',
    title: 'One Platform',
    highlight: 'Blueprint to Site',
    subtitle: 'Assign contractors, track daily logs, materials, and issues until handover — free for your team.',
    ctaPrimary: 'Get Started Free',
    ctaSecondary: 'Learn more',
  },
];

export const BRAND_ASSETS = {
  logo: '/brand/logo.svg',
  hero: RESOURCE_HERO.hero1,
  login: RESOURCE_HERO.login1 || RESOURCE_HERO.hero4,
  heroSlides: HERO_SLIDE_CONTENT.map((s) => s.image),
  onePlatformBackground: RESOURCE_HERO.onePlatformBackground,
};

export default function BrandLogo({
  to = '/',
  className = '',
  imageClassName = 'h-11 w-11',
  showText = true,
  textClassName = '',
  subtitle = 'Smart Construction',
  variant = 'light',
  asLink = true,
}) {
  const isDark = variant === 'dark';

  const content = (
    <>
      <img
        src={BRAND_ASSETS.logo}
        alt="BuildPlan AI"
        className={classNames('shrink-0 rounded-xl shadow-glow-primary object-contain', imageClassName)}
      />
      {showText && (
        <div className={classNames('flex flex-col min-w-0', textClassName)}>
          <span className={classNames(
            'font-bold tracking-tight leading-tight truncate',
            isDark ? 'text-white text-lg' : 'text-steel-800 text-lg',
          )}
          >
            BuildPlan AI
          </span>
          {subtitle ? (
            <span className={classNames(
              'text-xs uppercase tracking-widest font-semibold truncate',
              isDark ? 'text-white/55' : 'text-concrete-400',
            )}
            >
              {subtitle}
            </span>
          ) : null}
        </div>
      )}
    </>
  );

  const wrapClass = classNames('flex items-center gap-3 group shrink-0', className);

  if (asLink && to) {
    return (
      <Link to={to} className={wrapClass} aria-label="BuildPlan AI home">
        {content}
      </Link>
    );
  }

  return <div className={wrapClass}>{content}</div>;
}
