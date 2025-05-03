import React from 'react';
import Avatar from '../User/Avatar';
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
        left: `${position.left}px`, 
        top: `${position.top}px`
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