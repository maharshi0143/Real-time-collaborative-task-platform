import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/auth/me', { fullName });
      if (res.data.success) {
        setUser(res.data.data.user);
        toast.success('Profile updated.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input value={user?.email || ''} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <Input value={user?.username || ''} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}
