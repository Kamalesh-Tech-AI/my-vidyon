import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n/TranslationContext';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';




import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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

  // Force Password Change State
  const [isForceChangeOpen, setIsForceChangeOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Contact Admin State
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { force_password_change: false }
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setIsForceChangeOpen(false);

      // Redirect to dashboard
      const ROLE_ROUTES: Record<string, string> = {
        student: '/student',
        faculty: '/faculty',
        institution: '/institution',
        admin: '/admin',
        parent: '/parent',
      };
      navigate(ROLE_ROUTES[user?.role || 'student'] || '/');
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleContactSubmit = async () => {
    if (!contactSubject || !contactMessage || !institutionEmail || !senderEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSending(true);
    console.log('Support Query: Starting submission for institution:', institutionEmail);
    try {
      // 1. Find the institution by its admin email, registered email, or institution ID
      // Quoting the values in .or() helps handle special characters like @ and .
      const searchVal = institutionEmail.trim();
      const { data: instData, error: instError } = await supabase
        .from('institutions')
        .select('institution_id, id, name')
        .or(`admin_email.ilike."${searchVal}",email.ilike."${searchVal}",institution_id.ilike."${searchVal}"`)
        .maybeSingle();

      if (instError) {
        console.error('Support Query: Database error during lookup:', instError);
        toast.error("An error occurred while looking up the institution.");
        setIsSending(false);
        return;
      }

      if (!instData) {
        console.warn('Support Query: No institution found for:', searchVal);
        toast.error("Institution not found. Please check the institutional email or code.");
        setIsSending(false);
        return;
      }
      console.log('Support Query: Institution found:', instData.name, '(', instData.institution_id, ')');

      let screenshotUrl = null;
      // 2. Upload screenshot if exists
      if (screenshotFile) {
        const fileExt = screenshotFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        console.log('Support Query: Uploading screenshot...');
        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(fileName, screenshotFile);

        if (uploadError) {
          console.error('Support Query: Screenshot upload error:', uploadError);
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('support-attachments')
          .getPublicUrl(fileName);

        screenshotUrl = publicUrlData.publicUrl;
      }

      // 3. Create Support Query Record
      console.log('Support Query: Creating database record...');
      const { error: queryError } = await supabase
        .from('support_queries')
        .insert({
          institution_id: instData.institution_id,
          sender_email: senderEmail.trim(),
          sender_name: senderName.trim(),
          subject: contactSubject.trim(),
          message: contactMessage.trim(),
          screenshot_url: screenshotUrl,
          status: 'pending'
        });

      if (queryError) {
        console.error('Support Query: Database insertion error:', queryError);
        throw queryError;
      }
      console.log('Support Query: Record created successfully');

      // 4. Create Notification for the Institution Admin and Super Admins
      console.log('Support Query: Fetching admin and super admin profiles for notifications...');

      // Fetch both specific institution admins AND global super admins
      const { data: targetProfiles } = await supabase
        .from('profiles')
        .select('id, role')
        .or(`institution_id.eq.${instData.institution_id},role.eq.admin`)
        .in('role', ['admin', 'institution']);

      if (targetProfiles && targetProfiles.length > 0) {
        console.log(`Support Query: Sending notifications to ${targetProfiles.length} recipients...`);
        const notifications = targetProfiles.map(profile => ({
          user_id: profile.id,
          title: `New Support Query: ${contactSubject}`,
          message: `[${instData.name}] From: ${senderName || senderEmail}. Issue: ${contactMessage.substring(0, 50)}...`,
          type: 'support',
          action_url: profile.role === 'admin' ? '/admin/support' : '/institution/notifications', // Route appropriately
          metadata: {
            sender_email: senderEmail.trim(),
            sender_name: senderName.trim(),
            screenshot_url: screenshotUrl,
            subject: contactSubject.trim(),
            message: contactMessage.trim(),
            institution_name: instData.name,
            institution_id: instData.institution_id
          }
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast.success("Support query sent successfully. The administrator has been notified.");
      setIsContactOpen(false);
      setContactSubject('');
      setContactMessage('');
      setInstitutionEmail('');
      setSenderName('');
      setSenderEmail('');
      setScreenshotFile(null);
    } catch (error: any) {
      console.error('Support submission error:', error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.forcePasswordChange) {
        setIsForceChangeOpen(true);
      } else {
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
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-16 relative">
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
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-input bg-card/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
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
              <button
                type="button"
                onClick={() => setIsContactOpen(true)}
                className="text-primary font-bold hover:underline"
              >
                {t.login.contactAdmin}
              </button>
            </p>
          </div>

          <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Contact Administrator</DialogTitle>
                <DialogDescription>
                  Need help? Send a message to the system administrator.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instEmail">Institution's Email *</Label>
                    <Input
                      id="instEmail"
                      placeholder="Admin/School Email"
                      value={institutionEmail}
                      onChange={(e) => setInstitutionEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderEmail">Your Email *</Label>
                    <Input
                      id="senderEmail"
                      placeholder="Your registered email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderName">Your Name</Label>
                  <Input
                    id="senderName"
                    placeholder="Enter your full name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="e.g. Account Access Issue"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue in detail..."
                    className="min-h-[100px]"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Screenshot (Optional)</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full relative overflow-hidden h-10 gap-2"
                      onClick={() => document.getElementById('screenshot-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      {screenshotFile ? screenshotFile.name : "Upload Screenshot"}
                      <input
                        id="screenshot-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                      />
                    </Button>
                    {screenshotFile && (
                      <Button variant="ghost" size="sm" onClick={() => setScreenshotFile(null)} className="h-10 text-destructive">
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsContactOpen(false)}>Cancel</Button>
                <Button onClick={handleContactSubmit} disabled={isSending}>
                  {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isForceChangeOpen} onOpenChange={(open) => !isUpdatingPassword && setIsForceChangeOpen(open)}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Your administrator requires you to change your password before proceeding.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handlePasswordChange}
                  disabled={isUpdatingPassword}
                  className="w-full"
                >
                  {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

