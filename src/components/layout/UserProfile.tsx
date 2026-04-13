import React, { useState, useRef, useContext, useEffect, useCallback } from 'react';
import { X, Upload, AlertTriangle, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import styles from './UserProfile.module.css';
import { editUserUsername, editUserPassword, editUserEmail, editUserPortrait, deleteUserAccount } from '../../api/user';
import { EmailEdit } from '../../api/user';
import { UserContext } from '../../context/UserContext';
import getCroppedImg from '../../utils/cropImage';

interface UserProfileProps {
  onClose: () => void;
  currentUserId: string;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose, onLogout }) => {
  const userContext = useContext(UserContext);
  const userInfo = userContext?.userInfo;
  const fetchUserInfo = userContext?.fetchUserInfo;

  // Username State
  const [userName, setUserName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Email State
  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Portrait State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [portraitStatus, setPortraitStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Cropper State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Populate data from context when mounted or updated
  useEffect(() => {
    if (userInfo) {
      setUserName(userInfo.username || '');
      setPortraitPreview(userInfo.avatar_url || null);
    }
  }, [userInfo]);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameStatus({ type: null, message: '' });

    if (!userName) {
      setUsernameStatus({ type: 'error', message: 'Username is required.' });
      return;
    }

    try {
      await editUserUsername({ new_username: userName });
      if (fetchUserInfo) {
        await fetchUserInfo();
      }
      setUsernameStatus({ type: 'success', message: 'Username updated successfully!' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: Array<{ msg: string }> | string } }; message?: string };
      const detail = error.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Failed to update username.');
      setUsernameStatus({ type: 'error', message: errorMessage as string });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ type: null, message: '' });

    if (!oldPassword || !newPassword) {
      setPasswordStatus({ type: 'error', message: 'Both old and new passwords are required.' });
      return;
    }

    try {
      await editUserPassword({ old_password: oldPassword, new_password: newPassword });
      setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
      setOldPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: Array<{ msg: string }> | string } }; message?: string };
      const detail = error.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Failed to update password.');
      setPasswordStatus({ type: 'error', message: errorMessage as string });
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
      if (fetchUserInfo) {
        await fetchUserInfo();
      }
      setEmailStatus({ type: 'success', message: 'Email updated successfully!' });
      setEmailPassword('');
      setNewEmail('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: Array<{ msg: string }> | string } }; message?: string };
      const detail = error.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Failed to update email.');
      setEmailStatus({ type: 'error', message: errorMessage as string });
    }
  };

  const handlePortraitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
        setShowCropModal(true);
        // clear input so same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;

    try {
      const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (croppedFile) {
        setPortraitFile(croppedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPortraitPreview(reader.result as string);
        };
        reader.readAsDataURL(croppedFile);
      }
      setShowCropModal(false);
      setCropImageSrc(null);
    } catch (e) {
      console.error(e);
      setPortraitStatus({ type: 'error', message: 'Failed to crop image.' });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteStatus({ type: null, message: '' });
    try {
      const response = await deleteUserAccount();
      if (response.code === 200) {
        onLogout();
      } else {
        setDeleteStatus({ type: 'error', message: response.msg || 'Failed to delete account.' });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: Array<{ msg: string }> | string } }; message?: string };
      const detail = error.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Failed to delete account.');
      setDeleteStatus({ type: 'error', message: errorMessage as string });
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
      // Image is already resized and formatted by getCroppedImg
      const response = await editUserPortrait(portraitFile);

      // Convert resized file to base64 for immediate caching
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(portraitFile);
      });

      // Cache the new base64 data and the url locally
      if (response && response.data && response.data.avatar_url) {
        localStorage.setItem('cached_avatar_url', response.data.avatar_url);
        localStorage.setItem('cached_avatar_data', base64data);
      } else if (response && response.avatar_url) {
        localStorage.setItem('cached_avatar_url', response.avatar_url);
        localStorage.setItem('cached_avatar_data', base64data);
      }

      // Update global user info context so app-wide avatar changes
      if (fetchUserInfo) {
        await fetchUserInfo();
      }

      setPortraitStatus({ type: 'success', message: 'Portrait updated successfully!' });
      setPortraitFile(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: Array<{ msg: string }> | string } }; message?: string };
      const detail = error.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0]?.msg : (detail || error.message || 'Failed to update portrait.');
      setPortraitStatus({ type: 'error', message: errorMessage as string });
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
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-secondary">
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

        {/* Username Update Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Username</h3>
          <form onSubmit={handleUsernameSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>New Username</label>
              <input
                type="text"
                className={styles.input}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="New username"
                required
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Update Username
            </button>
            {usernameStatus.message && (
              <p className={usernameStatus.type === 'success' ? styles.successMsg : styles.errorMsg}>
                {usernameStatus.message}
              </p>
            )}
          </form>
        </section>

        {/* Password Update Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Password</h3>
          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <div className="grid grid-cols-2 gap-4">
              <div className={styles.inputGroup}>
                <label className={styles.label}>Old Password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Old password"
                  required
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
                  required
                />
              </div>
            </div>
            <button type="submit" className={styles.submitBtn}>
              Update Password
            </button>
            {passwordStatus.message && (
              <p className={passwordStatus.type === 'success' ? styles.successMsg : styles.errorMsg}>
                {passwordStatus.message}
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

        {/* Danger Zone Section */}
        <section className={`${styles.section} border-red-500/30`}>
          <h3 className={`${styles.sectionTitle} text-red-500 border-red-500/20`}>Danger Zone</h3>
          <div className="flex items-center justify-between mt-4">
            <div>
              <h4 className="text-sm font-medium text-secondary">Delete Account</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className={styles.deleteBtn}
            >
              Delete Account
            </button>
          </div>
        </section>

      </div>

      {/* Crop Modal */}
      {showCropModal && cropImageSrc && (
        <div className={styles.modalOverlay} style={{ zIndex: 100 }}>
          <div className={`${styles.modalContent} flex flex-col`} style={{ maxWidth: '500px', height: '600px', padding: '1.5rem' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Crop Portrait</h3>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setCropImageSrc(null);
                }}
                className="text-secondary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex-1 w-full bg-black/10 rounded-lg overflow-hidden mb-6">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm text-secondary font-medium whitespace-nowrap">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => {
                  setZoom(Number(e.target.value));
                }}
                className="w-full h-2 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setCropImageSrc(null);
                }}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                className={styles.submitBtn + ' flex items-center justify-center gap-2 m-0'}
                style={{ marginTop: 0 }}
              >
                <Check className="w-4 h-4" />
                Confirm Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Account</h3>
            </div>
            <p className="text-secondary mb-6">
              This action is irreversible. All your data will be permanently deleted. Are you sure you want to proceed?
            </p>
            {deleteStatus.message && (
              <p className={styles.errorMsg + ' mb-4'}>
                {deleteStatus.message}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteStatus({ type: null, message: '' });
                }}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className={styles.confirmDeleteBtn}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
