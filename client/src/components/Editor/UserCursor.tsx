import React from 'react';
import './UserCursor.css';

interface UserCursorProps {
  username: string;
  position: {
    left: number;
    top: number;
  };
  color: string;
}

const UserCursor: React.FC<UserCursorProps> = ({ username, position, color }) => {
  return (
    <div 
      className="user-cursor"
      style={{ 
        transform: `translate(${position.left}px, ${position.top}px)`,
        // Using transform instead of left/top for better performance
      }}
    >
      <div className="cursor-pointer" style={{ backgroundColor: color }}></div>
      <div className="cursor-name" style={{ backgroundColor: color }}>
        {username}
      </div>
    </div>
  );
};

export default UserCursor; 