import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, MapPin, Send, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { publicAPI } from '../../services/api';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  company: z.string().optional(),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export default function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const { data: contactInfo } = useQuery({
    queryKey: ['public-contact-info'],
    queryFn: publicAPI.getContactInfo,
    staleTime: 120_000,
  });

  const email = contactInfo?.email || 'support@buildplan.ai';
  const phone = contactInfo?.phone || '+250 788 300 000';
  const location = contactInfo?.location || 'Kigali, Rwanda';
  const team = contactInfo?.team || [];

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await publicAPI.submitContact(data);
      toast.success(res?.message || 'Message sent! We will reply to your email soon.');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-16">
      <div className="page-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="section-title">Contact Us</h1>
          <p className="section-subtitle mx-auto mt-4">
            Reach our team in Kigali — we reply to every message by email.
          </p>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-3 max-w-5xl mx-auto">
          <div className="space-y-6">
            {[
              { icon: Mail, label: 'Email', value: email, href: `mailto:${email}` },
              { icon: Phone, label: 'Phone', value: phone, href: `tel:${phone.replace(/\s/g, '')}` },
              { icon: MapPin, label: 'Office', value: location },
            ].map((item) => (
              <div key={item.label} className="card flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-concrete">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="font-medium text-steel hover:text-primary transition-colors">
                      {item.value}
                    </a>
                  ) : (
                    <p className="font-medium text-steel">{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            {team.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-concrete px-1">Leadership</p>
                {team.map((person) => (
                  <div key={`${person.role}-${person.name}`} className="card">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-steel-100 shrink-0">
                        <User className="h-5 w-5 text-steel-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-steel truncate">{person.name}</p>
                        <p className="text-sm text-primary font-medium">{person.title}</p>
                        <p className="text-[11px] text-concrete uppercase tracking-wide mt-0.5">{person.roleLabel}</p>
                        {person.bio && (
                          <p className="text-xs text-concrete mt-1">{person.bio}</p>
                        )}
                        <a href={`mailto:${person.email}`} className="text-xs text-steel-600 hover:text-primary mt-2 inline-block truncate max-w-full">
                          {person.email}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 card space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input {...register('name')} className="input" placeholder="Your name" />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('email')} className="input" placeholder="you@example.com" />
                {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">Company</label>
              <input {...register('company')} className="input" placeholder="Organization (optional)" />
            </div>
            <div>
              <label className="label">Subject</label>
              <input {...register('subject')} className="input" placeholder="How can we help?" />
              {errors.subject && <p className="mt-1 text-xs text-danger">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="label">Message</label>
              <textarea {...register('message')} rows={5} className="input resize-none" placeholder="Your message..." />
              {errors.message && <p className="mt-1 text-xs text-danger">{errors.message.message}</p>}
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              <Send className="h-4 w-4" /> {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
