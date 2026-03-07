import { getProfileAvatarUrl } from '../../cloudinary/transformations';
import { User } from 'lucide-react';

export default function ProfileAvatar({ publicId, size = 80, className = '' }) {
  if (!publicId) {
    return (
      <div className={'rounded-full bg-brand-surface border border-brand-border flex items-center justify-center ' + className}
           style={{ width: size, height: size }}>
        <User size={size * 0.45} className="text-brand-muted" />
      </div>
    );
  }

  return (
    <img
      src={getProfileAvatarUrl(publicId, size)}
      alt="Profile"
      className={'rounded-full object-cover border-2 border-brand-accent/30 ' + className}
      style={{ width: size, height: size }}
    />
  );
}
