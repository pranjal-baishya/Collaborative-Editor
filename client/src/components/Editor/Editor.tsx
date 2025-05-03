import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../User/Avatar';
import UserCursor from './UserCursor';
import './Editor.css';

// Interface for user in the document
interface DocumentUser {
  userId: string;
  username: string;
  socketId: string;
  avatarColor: string;
  cursorPosition?: {
    line: number;
    ch: number;
  };
}

// Interface for cursor position in the UI
interface CursorPosition {
  left: number;
  top: number;
}

// Map cursor position from document to pixel position
interface UserCursorPosition {
  userId: string;
  username: string;
  position: CursorPosition;
  color: string;
}

const Editor: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<string>('');
  const [activeUsers, setActiveUsers] = useState<DocumentUser[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [userCursors, setUserCursors] = useState<UserCursorPosition[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Function to calculate cursor position from line and character
  const calculateCursorPosition = useCallback((line: number, ch: number): CursorPosition | null => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    
    // This is a simplified approach. In a real implementation,
    // you would need more complex calculations based on the specific editor used.
    const text = textarea.value;
    const lines = text.split('\n');
    
    // Get line height (approximate)
    const lineHeight = 20; // pixels
    
    // Get character width (approximate)
    const charWidth = 8; // pixels
    
    // Calculate position
    const top = line * lineHeight;
    const left = ch * charWidth;
    
    return { top, left };
  }, []);
  
  // Connect to Socket.io when component mounts
  useEffect(() => {
    if (!user || !documentId) return;
    
    console.log('Creating new socket connection');
    
    // Create socket connection with reconnection settings
    const socket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    
    // Handle connection
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      
      // Join the document editing session with user data
      socket.emit('join-document', documentId, {
        userId: user.id,
        username: user.username,
        avatarColor: user.avatarColor || '#4285f4'
      });
    });
    
    // Handle disconnection events
    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });
    
    // Handle receiving content changes
    socket.on('receive-changes', (changes: string) => {
      setContent(changes);
    });
    
    // Handle document users list
    socket.on('document-users', (users: DocumentUser[]) => {
      setActiveUsers(users);
    });
    
    // Handle users joining
    socket.on('user-joined', (userData: DocumentUser) => {
      setActiveUsers(prev => [...prev, userData]);
    });
    
    // Handle users leaving
    socket.on('user-left', (userId: string) => {
      setActiveUsers(prev => prev.filter(user => user.userId !== userId));
      setUserCursors(prev => prev.filter(cursor => cursor.userId !== userId));
    });
    
    // Handle cursor updates from other users
    socket.on('cursor-update', ({ userId, position }: { userId: string, position: { line: number, ch: number } }) => {
      const userToUpdate = activeUsers.find(u => u.userId === userId);
      if (!userToUpdate) return;
      
      const cursorPosition = calculateCursorPosition(position.line, position.ch);
      if (!cursorPosition) return;
      
      // Update or add cursor
      setUserCursors(prev => {
        const existingIndex = prev.findIndex(c => c.userId === userId);
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            position: cursorPosition
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              userId,
              username: userToUpdate.username,
              position: cursorPosition,
              color: userToUpdate.avatarColor
            }
          ];
        }
      });
    });
    
    // Disconnect when component unmounts
    return () => {
      console.log('Disconnecting socket');
      socket.disconnect();
    };
  }, [user, documentId, calculateCursorPosition]);
  
  // Track cursor position in the textarea
  const handleCursorPositionChange = useCallback(() => {
    if (!socketRef.current || !textareaRef.current || !documentId || !user) return;
    
    const textarea = textareaRef.current;
    const { selectionStart } = textarea;
    
    // Convert selection index to line and character
    const text = textarea.value.substring(0, selectionStart);
    const lines = text.split('\n');
    const line = lines.length - 1;
    const ch = lines[lines.length - 1].length;
    
    // Send cursor position to server
    socketRef.current.emit('cursor-position', documentId, { line, ch }, user.id);
  }, [documentId, user]);
  
  // Handle text selection or cursor movement
  const handleSelect = () => {
    handleCursorPositionChange();
  };
  
  // Handle sending content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Only emit changes if we're connected
    if (socketRef.current && connected) {
      socketRef.current.emit('send-changes', documentId, newContent);
    }
    
    // Also update cursor position
    handleCursorPositionChange();
  };
  
  return (
    <div className="editor-container">
      <div className="editor-header">
        <h2>Document: {documentId}</h2>
        <div className="connection-status">
          Status: {connected ? 'Connected' : 'Connecting...'}
        </div>
        <div className="active-users">
          {activeUsers.map(activeUser => (
            <div key={activeUser.userId} className="active-user">
              <Avatar 
                username={activeUser.username}
                color={activeUser.avatarColor}
                size="small"
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="editor-content" ref={editorContainerRef}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onSelect={handleSelect}
          onClick={handleSelect}
          onKeyUp={handleSelect}
          placeholder="Start typing..."
        />
        
        {/* Render cursors for other users */}
        {userCursors.map(cursor => (
          <UserCursor
            key={cursor.userId}
            username={cursor.username}
            position={cursor.position}
            color={cursor.color}
          />
        ))}
      </div>
    </div>
  );
};

export default Editor; 