import { useState, useEffect, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import type { User } from '../types';
import { X, LogIn, UserPlus, Sparkles, AlertTriangle } from 'lucide-react';
import { motion, type Variants } from 'motion/react';

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 320, damping: 24 },
    },
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
    >
      <div 
        className="w-full max-w-4xl bg-studio-card border border-studio-border rounded-3xl shadow-2xl overflow-hidden relative text-studio-text flex flex-col lg:flex-row my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-studio-muted hover:text-studio-text rounded-full bg-studio-raised backdrop-blur-sm transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Form Column (Watermelon Auth-07 style) */}
        <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-md mx-auto"
          >
            {/* Header / Brand */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="text-xs font-bold tracking-widest uppercase text-studio-muted">
                CANON STUDIO &bull; AUTHENTICATION
              </span>
              <h2 id="auth-modal-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-studio-text mt-1">
                {isRegister ? 'Create your Account' : 'Welcome back'}
              </h2>
              <p className="text-sm text-studio-muted mt-1">
                {isRegister
                  ? 'Join narrative architects publishing serialized sagas.'
                  : 'Sign in to access your drafts, canon entities, and books.'}
              </p>
            </motion.div>

            {/* Quick 1-Click Demo Profiles */}
            <motion.div variants={itemVariants} className="mb-5 p-3 rounded-2xl bg-studio-raised border border-studio-border">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-studio-muted mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant 1-Click Demo Logins</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('anya@canonstory.studio', 'anya123')}
                  className="p-2.5 text-left bg-studio-card hover:bg-studio-raised border border-studio-border rounded-xl transition-all cursor-pointer"
                >
                  <div className="text-xs font-semibold text-studio-text">Anya Sharma</div>
                  <div className="text-[10px] text-studio-muted">Author &bull; anya123</div>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('dev@canonstory.studio', 'dev123')}
                  className="p-2.5 text-left bg-studio-card hover:bg-studio-raised border border-studio-border rounded-xl transition-all cursor-pointer"
                >
                  <div className="text-xs font-semibold text-studio-text">Devraj Sen</div>
                  <div className="text-[10px] text-studio-muted">Reviewer &bull; dev123</div>
                </button>
              </div>
            </motion.div>

            {error && (
              <motion.div variants={itemVariants} className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs sm:text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {isRegister && (
                <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-studio-text">
                    Author Pen Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full rounded-full border border-studio-border bg-studio-bg px-4 py-2.5 text-sm text-studio-text placeholder:text-studio-muted/70 focus:outline-none focus:ring-2 focus:ring-studio-accent"
                  />
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-studio-text">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full rounded-full border border-studio-border bg-studio-bg px-4 py-2.5 text-sm text-studio-text placeholder:text-studio-muted/70 focus:outline-none focus:ring-2 focus:ring-studio-accent"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-studio-text">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-full border border-studio-border bg-studio-bg px-4 py-2.5 text-sm text-studio-text placeholder:text-studio-muted/70 focus:outline-none focus:ring-2 focus:ring-studio-accent"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-studio-accent hover:bg-studio-accent/90 text-studio-bg py-3 text-sm font-semibold transition-all shadow cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
              </motion.div>
            </form>

            <motion.div variants={itemVariants} className="mt-4 text-center text-xs text-studio-muted">
              {isRegister ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setError(null); }}
                    className="font-semibold text-studio-accent hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </span>
              ) : (
                <span>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(true); setError(null); }}
                    className="font-semibold text-studio-accent hover:underline cursor-pointer"
                  >
                    Create account
                  </button>
                </span>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Right Cloudscape Hero (Watermelon Auth-07 style) */}
        <div className="hidden lg:block lg:w-1/2 p-3 bg-studio-raised">
          <div className="relative h-full w-full min-h-[460px] overflow-hidden rounded-2xl">
            <img
              src="https://assets.watermelon.sh/auth-7.avif"
              alt="Misty mountain cloudscape"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
              <span className="text-xs font-semibold tracking-wider uppercase text-amber-300">
                Story Studio Architecture
              </span>
              <h3 className="text-2xl font-serif font-bold mt-1">
                Narrative Continuity at Scale
              </h3>
              <p className="text-xs text-slate-200 mt-1 max-w-sm">
                Track entities, character bonds, and branches across every chapter without plot holes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
