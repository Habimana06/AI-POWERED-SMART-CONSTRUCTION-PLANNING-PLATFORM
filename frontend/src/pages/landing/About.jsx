import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Target, Eye, Heart, Award, Loader2 } from 'lucide-react';
import { publicAPI } from '../../services/api';

const values = [
  { icon: Target, title: 'Precision', desc: 'AI-driven accuracy in every estimate and schedule' },
  { icon: Eye, title: 'Transparency', desc: 'Real-time visibility across all project stakeholders' },
  { icon: Heart, title: 'Collaboration', desc: 'Seamless coordination between PMs and contractors' },
  { icon: Award, title: 'Excellence', desc: 'Enterprise-grade tools for industry leaders' },
];

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export default function About() {
  const { data: contactInfo, isLoading: teamLoading } = useQuery({
    queryKey: ['public-contact-info'],
    queryFn: publicAPI.getContactInfo,
    staleTime: 120_000,
  });

  const leadership = contactInfo?.team || [];

  return (
    <div className="py-16">
      <div className="page-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center mb-20">
          <h1 className="section-title">About BuildPlan AI</h1>
          <p className="section-subtitle mx-auto mt-4">
            We're revolutionizing construction planning by combining decades of industry expertise with cutting-edge artificial intelligence.
          </p>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-2 mb-20">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="card">
            <h2 className="text-2xl font-bold text-steel mb-4">Our Mission</h2>
            <p className="text-concrete leading-relaxed">
              To empower construction professionals with intelligent tools that reduce planning time, minimize risks, and maximize project success. We believe every building project deserves the precision of AI-assisted planning.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="card">
            <h2 className="text-2xl font-bold text-steel mb-4">Our Vision</h2>
            <p className="text-concrete leading-relaxed">
              A world where every construction project is planned with AI precision, executed with real-time intelligence, and delivered on time and within budget — transforming how humanity builds.
            </p>
          </motion.div>
        </div>

        <div className="mb-20">
          <h2 className="text-2xl font-bold text-steel text-center mb-12">Our Values</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="card text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <v.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-steel">{v.title}</h3>
                <p className="mt-2 text-sm text-concrete">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-steel text-center mb-12">Leadership Team</h2>
          {teamLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leadership.length === 0 ? (
            <p className="text-center text-concrete text-sm max-w-md mx-auto">
              Leadership profiles appear here once admin and project manager accounts are active in the platform.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {leadership.map((member, i) => (
                <motion.div
                  key={`${member.role}-${member.name}-${member.email}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="card"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-steel text-xl font-bold text-white mb-4">
                    {initialsFromName(member.name)}
                  </div>
                  <h3 className="font-semibold text-steel">{member.name}</h3>
                  <p className="text-sm text-primary font-medium">{member.title}</p>
                  {(member.bio || member.department) && (
                    <p className="mt-2 text-sm text-concrete">{member.bio || member.department}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
