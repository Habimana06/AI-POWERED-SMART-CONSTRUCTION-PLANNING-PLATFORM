import { useState } from 'react';
import { FileDown, Presentation, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PresentationDownloadBar({
  onExportPdf,
  onExportPpt,
  pdfLabel = 'Download PDF',
  pptLabel = 'Download PPT',
  className = '',
}) {
  const [busy, setBusy] = useState(null);

  const run = async (type, fn) => {
    if (!fn || busy) return;
    setBusy(type);
    try {
      await fn();
      toast.success(type === 'pdf' ? 'PDF downloaded' : 'Presentation downloaded');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => run('pdf', onExportPdf)}
        className="inline-flex items-center gap-2 rounded-lg border border-steel-200 bg-white px-4 py-2 text-sm font-semibold text-steel hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
      >
        {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {pdfLabel}
      </button>
      {onExportPpt ? (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run('ppt', onExportPpt)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {busy === 'ppt' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
          {pptLabel}
        </button>
      ) : null}
    </div>
  );
}
