import React from 'react';
import './Avatar.css';

interface AvatarProps {
  username: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

const Avatar: React.FC<AvatarProps> = ({ 
  username, 
  color = '#4285f4',
  size = 'medium' 
}) => {
  // Get first letter of username for avatar
  const initial = username ? username.charAt(0).toUpperCase() : '?';
  
  // Get size class
  const sizeClass = `avatar-${size}`;
  
  return (
    <div 
      className={`avatar ${sizeClass}`} 
      style={{ backgroundColor: color }}
      title={username}
    >
      {initial}
    </div>
  );
};

export default Avatar; 