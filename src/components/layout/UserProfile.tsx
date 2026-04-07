import React, { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import styles from './UserProfile.module.css';
import { editUserProfile, editUserEmail, editUserPortrait } from '../../api/user';
import { UserEdit, EmailEdit } from '../../api/user';

interface UserProfileProps {
  onClose: () => void;
  currentUserId: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  // Basic Info State
  const [userName, setUserName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [basicInfoEmail, setBasicInfoEmail] = useState('');
  const [basicInfoStatus, setBasicInfoStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Email State
  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Portrait State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(() => localStorage.getItem('userAvatar'));
  const [portraitStatus, setPortraitStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBasicInfoStatus({ type: null, message: '' });

    const updateData: UserEdit = {};
    if (userName) updateData.user_name = userName;
    if (oldPassword && newPassword) {
      updateData.old_password = oldPassword;
      updateData.new_password = newPassword;
    }
    if (basicInfoEmail) updateData.email = basicInfoEmail;

    if (Object.keys(updateData).length === 0) {
      setBasicInfoStatus({ type: 'error', message: 'No changes provided.' });
      return;
    }

    try {
      await editUserProfile(updateData);
      setBasicInfoStatus({ type: 'success', message: 'Profile updated successfully!' });
      // Clear password fields on success
      setOldPassword('');
      setNewPassword('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || 'Failed to update profile.';
      setBasicInfoStatus({ type: 'error', message: errorMessage });
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus({ type: null, message: '' });

    if (!emailPassword || !newEmail) {
      setEmailStatus({ type: 'error', message: 'Both password and new email are required.' });
      return;
    }

    const updateData: EmailEdit = {
      password: emailPassword,
      'new-email': newEmail,
    };

    try {
      await editUserEmail(updateData);
      setEmailStatus({ type: 'success', message: 'Email updated successfully!' });
      setEmailPassword('');
      setNewEmail('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || 'Failed to update email.';
      setEmailStatus({ type: 'error', message: errorMessage });
    }
  };

  const handlePortraitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPortraitFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPortraitPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePortraitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortraitStatus({ type: null, message: '' });

    if (!portraitFile) {
      setPortraitStatus({ type: 'error', message: 'Please select an image first.' });
      return;
    }

    try {
      // Client-side image resizing
      const resizedFile = await new Promise<File>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          // Draw and resize image
          ctx.drawImage(img, 0, 0, 256, 256);
          // Convert back to File
          canvas.toBlob((blob) => {
            if (blob) {
              // Swap extension to .webp
              const oldName = portraitFile.name;
              const newName = oldName.substring(0, oldName.lastIndexOf('.')) + '.webp';
              const newFile = new File([blob], newName || 'portrait.webp', {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/webp', 0.9);
        };
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new Error('Failed to load image'));
        };
        const objUrl = URL.createObjectURL(portraitFile);
        img.src = objUrl;

        // Ensure cleanup after onload/onerror logic completes
        img.addEventListener('load', () => URL.revokeObjectURL(objUrl));
      });

      await editUserPortrait(resizedFile);

      // Update global avatar cache natively via base64 for immediate presentation without fetching
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        localStorage.setItem('userAvatar', base64data);
        setPortraitPreview(base64data);
        window.dispatchEvent(new Event('avatarUpdated'));
      };
      reader.readAsDataURL(resizedFile);

      setPortraitStatus({ type: 'success', message: 'Portrait updated successfully!' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || error.message || 'Failed to update portrait.';
      setPortraitStatus({ type: 'error', message: errorMessage });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Edit Profile</h2>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className={styles.content}>

        {/* Portrait Update Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Portrait</h3>
          <form onSubmit={handlePortraitSubmit} className={styles.form}>
            <div className={styles.portraitContainer}>
              <div className={styles.avatarPreview}>
                {portraitPreview ? (
                  <img src={portraitPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePortraitChange}
                />
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Image
                </button>
                <button type="submit" className={styles.submitBtn} disabled={!portraitFile}>
                  Update Portrait
                </button>
              </div>
            </div>
            {portraitStatus.message && (
              <p className={portraitStatus.type === 'success' ? styles.successMsg : styles.errorMsg}>
                {portraitStatus.message}
              </p>
            )}
          </form>
        </section>

        {/* Basic Info Update Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Basic Info & Password</h3>
          <form onSubmit={handleBasicInfoSubmit} className={styles.form}>
            <div className="grid grid-cols-2 gap-4">
              <div className={styles.inputGroup}>
                <label className={styles.label}>Username</label>
                <input
                  type="text"
                  className={styles.input}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="New username"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  className={styles.input}
                  value={basicInfoEmail}
                  onChange={(e) => setBasicInfoEmail(e.target.value)}
                  placeholder="Basic info email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className={styles.inputGroup}>
                <label className={styles.label}>Old Password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>New Password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                />
              </div>
            </div>
            <button type="submit" className={styles.submitBtn}>
              Update Basic Info
            </button>
            {basicInfoStatus.message && (
              <p className={basicInfoStatus.type === 'success' ? styles.successMsg : styles.errorMsg}>
                {basicInfoStatus.message}
              </p>
            )}
          </form>
        </section>

        {/* Email Update Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Email Address</h3>
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Current Password</label>
              <input
                type="password"
                className={styles.input}
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Required to change email"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>New Email</label>
              <input
                type="email"
                className={styles.input}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new-email@example.com"
                required
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Update Email
            </button>
            {emailStatus.message && (
              <p className={emailStatus.type === 'success' ? styles.successMsg : styles.errorMsg}>
                {emailStatus.message}
              </p>
            )}
          </form>
        </section>

      </div>
    </div>
  );
};
