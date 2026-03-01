import React from 'react';
import { Profile } from '../types';

interface UserAvatarProps {
  role: string;
  profiles: Profile[];
  className?: string;
}

export function UserAvatar({ role, profiles, className = "w-8 h-8 text-sm" }: UserAvatarProps) {
  const profile = profiles.find(p => p.role === role);
  const avatar = profile?.avatar_url;
  const isUrl = avatar && (avatar.startsWith('http') || avatar.startsWith('data:image'));

  return (
    <div className={`${className} bg-stone-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden flex-shrink-0`}>
      {isUrl ? (
        <img src={avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        avatar || (role === '爸爸' ? '👨🏻' : role === '妈妈' ? '👩🏻' : role === '姐姐' ? '👧🏻' : role === '妹妹' ? '👶🏻' : '🛡️')
      )}
    </div>
  );
}
