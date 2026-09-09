import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateAvatarRequest, removeAvatarRequest } from '../api/users';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CameraIcon } from '../components/Icons';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE) {
      setError('Image exceeds the 5MB limit.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const updated = await updateAvatarRequest(file);
      updateUser(updated);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile picture.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError('');
    setUploading(true);
    try {
      const updated = await removeAvatarRequest();
      updateUser(updated);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove profile picture.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold text-ink">My profile</h1>

        <Card className="p-6">
          <div className="flex items-center gap-5">
            <button
              onClick={handlePickFile}
              disabled={uploading}
              title="Change profile picture"
              className="group relative flex-shrink-0 rounded-full disabled:opacity-50"
            >
              <Avatar name={user?.name} profileImage={user?.profile_image} size={80} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-anchor-900/0 text-transparent transition group-hover:bg-anchor-900/40 group-hover:text-white">
                <CameraIcon className="h-6 w-6" />
              </span>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-ink">{user?.name}</h2>
              <p className="text-sm text-[var(--color-ink-muted)]">{user?.email}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handlePickFile} disabled={uploading}>
                  {uploading ? 'Uploading…' : user?.profile_image ? 'Change photo' : 'Upload photo'}
                </Button>
                {user?.profile_image && (
                  <Button size="sm" variant="secondary" onClick={handleRemove} disabled={uploading}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} hidden />

          {error && (
            <p className="mt-4 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
          )}

          <p className="mt-4 text-xs text-[var(--color-ink-muted)]">JPG, PNG, WEBP or GIF, up to 5MB.</p>
        </Card>
      </div>
    </div>
  );
}
