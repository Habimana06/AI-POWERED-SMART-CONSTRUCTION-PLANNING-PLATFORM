import { Link } from 'react-router-dom';
import { Building2, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-steel-50">
          <Building2 className="h-10 w-10 text-concrete" />
        </div>
        <h1 className="text-6xl font-bold text-steel">404</h1>
        <p className="mt-4 text-lg text-concrete">Page not found</p>
        <p className="mt-2 text-sm text-concrete">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary mt-8 inline-flex">
          <Home className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
