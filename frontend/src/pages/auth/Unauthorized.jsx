import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="text-center max-w-md">
        <ShieldX className="h-20 w-20 text-danger mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-steel">Access Denied</h1>
        <p className="mt-4 text-concrete">
          You don't have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link to="/" className="btn-outline">Go Home</Link>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
