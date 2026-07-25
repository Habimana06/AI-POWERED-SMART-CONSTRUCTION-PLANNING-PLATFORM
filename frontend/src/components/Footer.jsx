import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Phone, MapPin, Linkedin, Twitter, Github, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandLogo from './BrandLogo';
import { publicAPI } from '../services/api';

function TestimonialSubmitForm() {
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [quote, setQuote] = useState('');
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      publicAPI.submitTestimonial({ authorName, authorRole, quote, email: email || undefined }),
    onSuccess: (data) => {
      toast.success(data?.message || 'Submitted for review');
      setAuthorName('');
      setAuthorRole('');
      setQuote('');
      setEmail('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not submit — try again');
    },
  });

  return (
    <div className="rounded-xl border border-steel-600/40 bg-steel-900/50 p-4">
      <form
        className="space-y-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <input
          type="text"
          required
          placeholder="Your name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full rounded-lg border border-steel-600/50 bg-steel-900/60 px-3 py-2 text-sm text-white placeholder:text-steel-400 focus:border-primary focus:outline-none"
        />
        <input
          type="text"
          placeholder="Role / company (optional)"
          value={authorRole}
          onChange={(e) => setAuthorRole(e.target.value)}
          className="w-full rounded-lg border border-steel-600/50 bg-steel-900/60 px-3 py-2 text-sm text-white placeholder:text-steel-400 focus:border-primary focus:outline-none"
        />
        <textarea
          required
          rows={2}
          placeholder="Your experience (min. 20 characters)"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          className="w-full rounded-lg border border-steel-600/50 bg-steel-900/60 px-3 py-2 text-sm text-white placeholder:text-steel-400 focus:border-primary focus:outline-none resize-none"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-steel-600/50 bg-steel-900/60 px-3 py-2 text-sm text-white placeholder:text-steel-400 focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full justify-center !py-2 text-sm"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share your story'}
        </button>
        <p className="text-[10px] text-steel-400 leading-snug">
          Reviewed before appearing on the home page.
        </p>
      </form>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-steel-800 text-steel-200">
      <div className="page-container py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <BrandLogo to="/" variant="dark" subtitle="" className="mb-3" imageClassName="h-9 w-9" />
            <p className="text-sm text-steel-300 leading-relaxed max-w-sm">
              AI-powered construction planning for modern builders. Free to use.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-steel-300 hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/about" className="text-steel-300 hover:text-primary transition-colors">About</Link></li>
              <li><Link to="/contact" className="text-steel-300 hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-steel-300">
                <Mail className="h-4 w-4 text-primary shrink-0" /> divinekamanzi0@gmail.com
              </li>
              <li className="flex items-center gap-2 text-steel-300">
                <Phone className="h-4 w-4 text-primary shrink-0" /> +250 788 300 000
              </li>
              <li className="flex items-center gap-2 text-steel-300">
                <MapPin className="h-4 w-4 text-primary shrink-0" /> Kigali, Rwanda
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2 text-sm uppercase tracking-wider">Trusted by Builders</h4>
            <p className="text-[11px] text-steel-400 mb-2">Share how BuildPlan AI helps your projects.</p>
            <TestimonialSubmitForm />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-steel-600/50 pt-6 sm:flex-row">
          <p className="text-xs text-steel-400">&copy; {new Date().getFullYear()} BuildPlan AI. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-steel-400 hover:text-primary transition-colors" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a>
            <a href="#" className="text-steel-400 hover:text-primary transition-colors" aria-label="Twitter"><Twitter className="h-4 w-4" /></a>
            <a href="#" className="text-steel-400 hover:text-primary transition-colors" aria-label="GitHub"><Github className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
