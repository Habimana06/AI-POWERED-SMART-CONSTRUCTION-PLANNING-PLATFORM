import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authAPI } from '../../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    authAPI.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-steel">Verifying Email...</h2>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-steel">Email Verified!</h2>
          <p className="mt-2 text-concrete">Your account is now active.</p>
          <Link to="/login" className="btn-primary mt-6 inline-flex">Sign In</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="h-16 w-16 text-danger mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-steel">Verification Failed</h2>
          <p className="mt-2 text-concrete">The link may be invalid or expired.</p>
          <Link to="/login" className="btn-outline mt-6 inline-flex">Back to Login</Link>
        </>
      )}
    </div>
  );
}
