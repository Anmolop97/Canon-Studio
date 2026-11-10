import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { User } from '../types';
import { X, LogIn, UserPlus, Sparkles, AlertTriangle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          throw new Error('Please enter your display name.');
        }
        const res = await api.register(email, password, displayName);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.login(email, password);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(demoEmail, demoPass);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-studio-card border border-studio-border rounded-lg shadow-2xl overflow-hidden p-6 text-studio-text relative animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-studio-muted hover:text-studio-text rounded-md focus:ring-2 focus:ring-studio-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 id="auth-modal-title" className="text-2xl font-serif font-bold text-studio-text">
            {isRegister ? 'Create Writer Account' : 'Sign In to Canon Studio'}
          </h2>
          <p className="text-sm text-studio-muted mt-1">
            {isRegister 
              ? 'Join writers publishing serialized sagas with canon continuity.' 
              : 'Access your private story drafts, canon records, and book ratings.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-status-contradiction/40 rounded flex items-center gap-2 text-sm text-red-200">
            <AlertTriangle className="w-4 h-4 text-status-contradiction flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Demo Accounts */}
        <div className="mb-6 p-3 bg-studio-raised border border-studio-border rounded-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-studio-muted mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-studio-accent" />
            <span>Fast 1-Click Demo Profiles</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin('anya@canonstory.studio', 'anya123')}
              className="py-2 px-3 text-xs text-left bg-studio-card hover:bg-studio-accent/15 border border-studio-border hover:border-studio-accent text-studio-text rounded transition-colors min-h-[44px]"
            >
              <div className="font-medium text-studio-accent">Anya Sharma</div>
              <div className="text-[11px] text-studio-muted">Published Author</div>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin('dev@canonstory.studio', 'dev123')}
              className="py-2 px-3 text-xs text-left bg-studio-card hover:bg-studio-accent/15 border border-studio-border hover:border-studio-accent text-studio-text rounded transition-colors min-h-[44px]"
            >
              <div className="font-medium text-studio-accent">Devraj Sen</div>
              <div className="text-[11px] text-studio-muted">Reader & Reviewer</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-studio-muted uppercase tracking-wider mb-1.5">
                Display Name / Author Pen Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Maya Lin"
                className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2.5 text-sm text-studio-text focus:border-studio-accent focus:ring-1 focus:ring-studio-accent min-h-[44px]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-studio-muted uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2.5 text-sm text-studio-text focus:border-studio-accent focus:ring-1 focus:ring-studio-accent min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-studio-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2.5 text-sm text-studio-text focus:border-studio-accent focus:ring-1 focus:ring-studio-accent min-h-[44px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-studio-accent hover:bg-studio-accent/90 text-studio-bg font-semibold text-sm py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-studio-muted">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
                className="text-studio-accent hover:underline font-semibold"
              >
                Sign in here
              </button>
            </p>
          ) : (
            <p>
              New to Canon Studio?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); }}
                className="text-studio-accent hover:underline font-semibold"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
