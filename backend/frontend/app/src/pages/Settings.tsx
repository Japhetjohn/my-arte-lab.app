import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { User, Bell, Shield, Moon, Globe, Smartphone, Camera, Loader2, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function Settings() {
  const { user: currentUser, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    phoneNumber: '',
    localArea: '',
    state: '',
    country: '',
    skills: [] as string[],
    avatar: '',
    coverImage: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  });

  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showActivity: true,
    allowMessages: true,
  });

  // Password change state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load user data
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        bio: currentUser.bio || '',
        phoneNumber: currentUser.phoneNumber || '',
        localArea: currentUser.location?.localArea || '',
        state: currentUser.location?.state || '',
        country: currentUser.location?.country || '',
        skills: currentUser.skills || [],
        avatar: currentUser.avatar || '',
        coverImage: currentUser.coverImage || '',
      });
    }
  }, [currentUser]);

  // Handle profile update
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        bio: profileForm.bio,
        phoneNumber: profileForm.phoneNumber,
        location: {
          localArea: profileForm.localArea,
          state: profileForm.state,
          country: profileForm.country,
        },
        skills: profileForm.skills,
      };

      const response = await api.put('/auth/update-profile', updateData);
      
      // Update local user context
      if (updateUser) {
        updateUser(response.data.data.user);
      }
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = response.data.data.url;

      // Update profile with new image
      await api.put('/auth/update-profile', {
        [type === 'avatar' ? 'avatar' : 'coverImage']: imageUrl,
      });

      // Update local state
      setProfileForm(prev => ({
        ...prev,
        [type === 'avatar' ? 'avatar' : 'coverImage']: imageUrl,
      }));

      // Update user context
      if (updateUser && currentUser) {
        updateUser({
          ...currentUser,
          [type === 'avatar' ? 'avatar' : 'coverImage']: imageUrl,
        });
      }

      toast.success(`${type === 'avatar' ? 'Profile' : 'Cover'} photo updated`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await api.put('/auth/update-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Password changed successfully');
      setIsPasswordDialogOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skills input
  const handleSkillsChange = (value: string) => {
    const skills = value.split(',').map(s => s.trim()).filter(Boolean);
    setProfileForm(prev => ({ ...prev, skills }));
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar and Cover Images */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={profileForm.avatar || '/images/avatar-1.png'}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="absolute bottom-0 right-0 bg-[#8A2BE2] text-white p-1.5 rounded-full hover:bg-[#7B1FD1] disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'avatar');
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-medium">Profile Photo</p>
                    <p className="text-xs text-gray-500">JPG, PNG or GIF. Max 2MB</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={profileForm.coverImage || '/images/hero-bg.jpg'}
                      alt="Cover"
                      className="w-32 h-20 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isLoading}
                      className="absolute bottom-1 right-1 bg-[#8A2BE2] text-white p-1 rounded-full hover:bg-[#7B1FD1] disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    </button>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'cover');
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-medium">Cover Image</p>
                    <p className="text-xs text-gray-500">Recommended: 1200x400px</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileForm.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="+1 (555) 000-0000" 
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Local Area"
                    value={profileForm.localArea}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, localArea: e.target.value }))}
                  />
                  <Input
                    placeholder="State/Province"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, state: e.target.value }))}
                  />
                  <Input
                    placeholder="Country"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 text-right">{profileForm.bio.length}/500</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma separated)</Label>
                <Input 
                  id="skills" 
                  value={profileForm.skills.join(', ')}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                  placeholder="e.g., Photoshop, Writing, Video Editing" 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(true)}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive updates via email</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, email: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">Receive push notifications</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, push: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-gray-500">Receive updates via SMS</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, sms: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Marketing Emails</p>
                    <p className="text-sm text-gray-500">Receive promotional content</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, marketing: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>Manage your privacy preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Public Profile</p>
                  <p className="text-sm text-gray-500">Make your profile visible to everyone</p>
                </div>
                <Switch
                  checked={privacy.publicProfile}
                  onCheckedChange={(checked) =>
                    setPrivacy(prev => ({ ...prev, publicProfile: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Activity Status</p>
                  <p className="text-sm text-gray-500">Let others see when you are online</p>
                </div>
                <Switch
                  checked={privacy.showActivity}
                  onCheckedChange={(checked) =>
                    setPrivacy(prev => ({ ...prev, showActivity: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Messages</p>
                  <p className="text-sm text-gray-500">Allow anyone to message you</p>
                </div>
                <Switch
                  checked={privacy.allowMessages}
                  onCheckedChange={(checked) =>
                    setPrivacy(prev => ({ ...prev, allowMessages: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize your app experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-gray-500">Switch between light and dark themes</p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reduced Motion</p>
                  <p className="text-sm text-gray-500">Minimize animations throughout the app</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1]"
                onClick={handleChangePassword}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
