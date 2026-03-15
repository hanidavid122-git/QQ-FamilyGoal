import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserAvatar } from './UserAvatar';
import { Profile } from '../types';

describe('UserAvatar', () => {
  const mockProfiles: Profile[] = [
    { role: '爸爸', pin: '1111', layout_config: { order: [], hidden: [] } },
    { role: '妈妈', pin: '2222', layout_config: { order: [], hidden: [] } }
  ];

  it('renders fallback emoji for 爸爸', () => {
    render(<UserAvatar role="爸爸" profiles={mockProfiles} />);
    expect(screen.getByText('👨🏻')).toBeInTheDocument();
  });

  it('renders fallback emoji for 妈妈', () => {
    render(<UserAvatar role="妈妈" profiles={mockProfiles} />);
    expect(screen.getByText('👩🏻')).toBeInTheDocument();
  });

  it('renders custom avatar if URL is provided', () => {
    const profilesWithAvatar = [
      { ...mockProfiles[0], avatar_url: 'https://example.com/avatar.png' }
    ];
    render(<UserAvatar role="爸爸" profiles={profilesWithAvatar} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
  });
});
