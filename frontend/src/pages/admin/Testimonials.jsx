import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Trash2, Quote, Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { formatDateTime } from '../../utils/helpers';
import PageHeader from '../../components/PageHeader';
import AdminPage from '../../components/AdminPage';

const MAIN_TABS = [
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'contact', label: 'Contact messages' },
];

const TESTIMONIAL_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const CONTACT_TABS = [
  { id: 'new', label: 'New' },
  { id: 'replied', label: 'Replied' },
  { id: 'all', label: 'All' },
];

function TestimonialsPanel() {
  const [tab, setTab] = useState('pending');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-testimonials', tab],
    queryFn: () => adminAPI.getTestimonials({ status: tab }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });

  const approveMutation = useMutation({
    mutationFn: adminAPI.approveTestimonial,
    onSuccess: () => {
      toast.success('Approved — visible on landing');
      invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: adminAPI.rejectTestimonial,
    onSuccess: () => {
      toast.success('Rejected');
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminAPI.deleteTestimonial,
    onSuccess: () => {
      toast.success('Deleted');
      invalidate();
    },
  });

  const rows = Array.isArray(data?.testimonials) ? data.testimonials : [];

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {TESTIMONIAL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-primary text-white' : 'bg-white border border-steel-100 text-steel-600 hover:bg-steel-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-concrete text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card text-center py-12 text-concrete">
          <Quote className="h-10 w-10 mx-auto mb-3 text-steel-300" />
          No testimonials in this view.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="card flex flex-col md:flex-row md:items-start gap-4 justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-steel-800 italic leading-relaxed">&ldquo;{row.quote}&rdquo;</p>
                <p className="mt-3 font-semibold text-steel">{row.author_name}</p>
                {row.author_role && <p className="text-xs text-concrete">{row.author_role}</p>}
                {row.email && (
                  <a href={`mailto:${row.email}`} className="text-xs text-primary mt-1 inline-block hover:underline">
                    {row.email}
                  </a>
                )}
                <p className="text-[11px] text-steel-400 mt-2">Submitted {formatDateTime(row.created_at)}</p>
                <span
                  className={`inline-block mt-2 badge text-xs ${
                    row.status === 'approved' ? 'badge-success' : row.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                  }`}
                >
                  {row.status}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                {row.status !== 'approved' && (
                  <button type="button" title="Approve" onClick={() => approveMutation.mutate(row.id)} className="btn-primary !py-2 !px-3">
                    <Check className="h-4 w-4" />
                  </button>
                )}
                {row.status !== 'rejected' && (
                  <button type="button" title="Reject" onClick={() => rejectMutation.mutate(row.id)} className="btn-outline !py-2 !px-3">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  title="Delete"
                  onClick={() => {
                    if (window.confirm('Delete this testimonial permanently?')) deleteMutation.mutate(row.id);
                  }}
                  className="btn-ghost !py-2 !px-3 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ContactMessagesPanel() {
  const [tab, setTab] = useState('new');
  const [replyDrafts, setReplyDrafts] = useState({});
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-contact-messages', tab],
    queryFn: () => adminAPI.getContactMessages({ status: tab }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });

  const replyMutation = useMutation({
    mutationFn: ({ id, replyMessage }) => adminAPI.replyContactMessage(id, replyMessage),
    onSuccess: (res) => {
      toast.success(res?.message || 'Reply sent');
      invalidate();
      setReplyDrafts({});
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Reply failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminAPI.deleteContactMessage,
    onSuccess: () => {
      toast.success('Deleted');
      invalidate();
    },
  });

  const rows = Array.isArray(data?.messages) ? data.messages : [];

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {CONTACT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-primary text-white' : 'bg-white border border-steel-100 text-steel-600 hover:bg-steel-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-concrete text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card text-center py-12 text-concrete">
          <Mail className="h-10 w-10 mx-auto mb-3 text-steel-300" />
          No contact messages in this view.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="card space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-steel">{row.subject}</p>
                  <p className="text-sm text-steel-700 mt-2 whitespace-pre-wrap">{row.message}</p>
                  <div className="mt-3 text-sm">
                    <span className="font-medium text-steel">{row.name}</span>
                    {row.company && <span className="text-concrete"> · {row.company}</span>}
                  </div>
                  <a href={`mailto:${row.email}`} className="text-sm text-primary hover:underline">
                    {row.email}
                  </a>
                  <p className="text-[11px] text-steel-400 mt-2">Received {formatDateTime(row.created_at)}</p>
                  <span className={`inline-block mt-2 badge text-xs ${row.status === 'replied' ? 'badge-success' : 'badge-warning'}`}>
                    {row.status}
                  </span>
                </div>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => {
                    if (window.confirm('Delete this message?')) deleteMutation.mutate(row.id);
                  }}
                  className="btn-ghost !py-2 !px-3 text-red-600 self-start"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {row.admin_reply && (
                <div className="rounded-xl bg-steel-50 border border-steel-100 p-4 text-sm">
                  <p className="text-xs font-semibold text-concrete uppercase tracking-wide mb-2">Your reply</p>
                  <p className="text-steel-700 whitespace-pre-wrap">{row.admin_reply}</p>
                  {row.replied_at && (
                    <p className="text-[11px] text-steel-400 mt-2">
                      Sent {formatDateTime(row.replied_at)}
                      {row.replied_by_name && ` · ${row.replied_by_name}`}
                    </p>
                  )}
                </div>
              )}

              {row.status !== 'replied' && (
                <div className="border-t border-steel-100 pt-4 space-y-2">
                  <label className="label">Reply by email</label>
                  <textarea
                    rows={4}
                    className="input resize-none"
                    placeholder={`Write a reply to ${row.email}…`}
                    value={replyDrafts[row.id] || ''}
                    onChange={(e) => setReplyDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={replyMutation.isPending}
                    onClick={() =>
                      replyMutation.mutate({ id: row.id, replyMessage: replyDrafts[row.id] || '' })
                    }
                    className="btn-primary"
                  >
                    <Send className="h-4 w-4" />
                    Send reply to email
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminTestimonials() {
  const [section, setSection] = useState('testimonials');

  return (
    <AdminPage>
      <PageHeader
        title="Landing Inbox"
        subtitle="Approve footer testimonials and reply to Contact page messages at the email they provided."
      />

      <div className="flex flex-wrap gap-2 mb-8 border-b border-steel-100 pb-4">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
              section === t.id
                ? 'bg-steel text-white shadow-md'
                : 'bg-white border border-steel-100 text-steel-600 hover:bg-steel-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === 'testimonials' ? <TestimonialsPanel /> : <ContactMessagesPanel />}
    </AdminPage>
  );
}
