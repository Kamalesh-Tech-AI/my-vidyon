import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n/TranslationContext';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ADS_DATA = [
  {
    title: "All-in-One Management",
    description: "From classrooms to control panels, everything connected in one powerful platform.",
  },
  {
    title: "Real-time Tracking",
    description: "Monitor attendance, grades, and academic progress with instant updates.",
  },
  {
    title: "AI-Powered Learning",
    description: "Empower students with our advanced AI Tutor for个性化 (personalized) learning journeys.",
  },
  {
    title: "Secure & Reliable",
    description: "Enterprise-grade security ensuring your institution's data is always protected.",
  }
];

export function LoginPage() {
  const { login, isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAd, setCurrentAd] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      // If already logged in, redirect to appropriate dashboard
      const ROLE_ROUTES: Record<string, string> = {
        student: '/student',
        faculty: '/faculty',
        institution: '/institution',
        admin: '/admin',
        parent: '/parent',
      };
      navigate(ROLE_ROUTES[user.role] || '/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % ADS_DATA.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 relative">
        {/* Language Selector */}
        <div className="absolute top-8 left-8 lg:left-auto lg:right-8">
          <LanguageSelector />
        </div>

        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo Only */}
          <div className="lg:hidden text-center mb-10">
            <img
              src="/my-vidyon-logo.png"
              alt="Vidyon Logo"
              className="w-[360px] max-w-full mx-auto object-contain"
              style={{ aspectRatio: '2.5/1' }}
            />
          </div>

          <div className="mb-10 text-left lg:text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              {t.login.welcomeBack}
            </h1>
            <p className="text-muted-foreground">
              {t.login.signInMessage}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-2 text-left">
              <label className="text-sm font-semibold ml-1 text-foreground/80">
                {t.login.emailAddress}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.login.emailPlaceholder}
                className="w-full px-4 py-3.5 rounded-xl border border-input bg-card/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>

            <div className="space-y-2 text-left">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-foreground/80">
                  {t.login.password}
                </label>
                <a href="#" className="text-xs font-medium text-primary hover:underline">
                  {t.login.forgotPassword}
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  className="w-full px-4 py-3.5 rounded-xl border border-input bg-card/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-1">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary/20"
              />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                {t.login.rememberMe}
              </label>
            </div>

            <Button
              type="submit"
              className="w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  {t.login.signingIn}
                </>
              ) : (
                t.login.signIn
              )}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              {t.login.noAccount}{' '}
              <a href="#" className="text-primary font-bold hover:underline">
                {t.login.contactAdmin}
              </a>
            </p>
          </div>

          <p className="mt-12 text-center text-xs text-muted-foreground/60">
            {t.login.copyright}
          </p>
        </div>
      </div>

      {/* Right Side: Brand & Ads */}
      <div className="hidden lg:flex w-1/2 bg-[#FAB75A] relative overflow-hidden flex-col items-center justify-center p-16">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-black/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-black/10 rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-lg text-center text-black">
          <div className="mb-12 animate-slide-up">
            <img
              src="/my-vidyon-logo.png"
              alt="Vidyon Logo"
              className="w-[520px] min-w-[520px] mx-auto drop-shadow-2xl object-contain"
              style={{ aspectRatio: '2.5/1' }}
            />
          </div>

          <div className="min-h-[200px] flex flex-col justify-center">
            <div key={currentAd}>
              <div className="animate-fade-in space-y-4">
                <h3 className="text-4xl font-extrabold text-black leading-tight">
                  {ADS_DATA[currentAd].title}
                </h3>
                <p className="text-xl text-black/80 font-medium max-w-md mx-auto">
                  {ADS_DATA[currentAd].description}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center gap-3">
            {ADS_DATA.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentAd ? 'w-10 bg-black' : 'w-2 bg-black/20'
                  }`}
              />
            ))}
          </div>


        </div>
      </div>

      <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out infinite;
                    animation-iteration-count: 2;
                }
            `}</style>
    </div>
  );
}

