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
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);

  React.useEffect(() => {
    if (isUrl && !isLoaded) {
      const timer = setTimeout(() => {
        if (!isLoaded) setShowHint(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isUrl, isLoaded]);

  // Default emoji fallback
  const fallback = avatar || (role === '爸爸' ? '👨🏻' : role === '妈妈' ? '👩🏻' : role === '姐姐' ? '👧🏻' : role === '妹妹' ? '👶🏻' : '🛡️');

  return (
    <div className={`${className} bg-stone-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden flex-shrink-0 relative`}>
      {isUrl && !error ? (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50 z-10">
              <div className="w-1/2 h-1/2 border-2 border-stone-200 border-t-orange-500 rounded-full animate-spin" />
              {showHint && <span className="text-[8px] text-stone-400 mt-1 animate-pulse">加载中...</span>}
            </div>
          )}
          <img 
            src={avatar} 
            className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoaded(true)}
            onError={() => setError(true)}
          />
        </>
      ) : (
        <span className="select-none">{fallback}</span>
      )}
    </div>
  );
}
