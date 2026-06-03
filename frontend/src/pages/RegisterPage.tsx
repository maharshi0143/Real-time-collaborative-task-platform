import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import api from '../services/api';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.email) newErrors.email = 'Email is required.';
    if (!form.username) newErrors.username = 'Username is required.';
    if (!form.password) newErrors.password = 'Password is required.';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        email: form.email,
        username: form.username,
        password: form.password,
      });
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const errs: Record<string, string> = {};
      if (code === 'EMAIL_ALREADY_EXISTS') {
        errs.email = 'This email is already registered.';
      } else if (code === 'USERNAME_ALREADY_EXISTS') {
        errs.username = 'This username is already taken.';
      } else if (code === 'VALIDATION_ERROR') {
        err.response.data.error.details.forEach((d: any) => { errs[d.field] = d.message; });
      } else {
        errs.form = err?.response?.data?.error?.message || 'Registration failed.';
      }
      setErrors(errs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl text-white text-xl font-bold mb-4">TF</div>
          <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
          <p className="text-muted-foreground mt-1">Get started with TaskFlow</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {errors.form && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errors.form}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" disabled={loading} error={errors.email} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input value={form.username} onChange={set('username')} placeholder="your_username" disabled={loading} error={errors.username} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input type="password" value={form.password} onChange={set('password')} placeholder="Min 8 chars, 1 upper, 1 digit, 1 special" disabled={loading} error={errors.password} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <Input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat your password" disabled={loading} error={errors.confirmPassword} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create account
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
