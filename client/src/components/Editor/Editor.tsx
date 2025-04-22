import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import './Editor.css';

interface User {
  id: string;
  username: string;
}

const Editor: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<string>('');
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Connect to Socket.io when component mounts
  useEffect(() => {
    if (!user || !documentId) return;
    
    // Create socket connection
    const socket = io('http://localhost:5000');
    socketRef.current = socket;
    
    // Handle connection
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      
      // Join the document editing session
      socket.emit('join-document', documentId, user.id);
    });
    
    // Handle receiving content changes
    socket.on('receive-changes', (changes: string) => {
      setContent(changes);
    });
    
    // Handle document users list
    socket.on('document-users', (users: string[]) => {
      setActiveUsers(users);
    });
    
    // Handle users joining
    socket.on('user-joined', (userId: string) => {
      setActiveUsers(prev => [...prev, userId]);
    });
    
    // Handle users leaving
    socket.on('user-left', (userId: string) => {
      setActiveUsers(prev => prev.filter(id => id !== userId));
    });
    
    // Disconnect when component unmounts
    return () => {
      socket.disconnect();
    };
  }, [user, documentId]);
  
  // Handle sending content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Only emit changes if we're connected
    if (socketRef.current && connected) {
      socketRef.current.emit('send-changes', documentId, newContent);
    }
  };
  
  return (
    <div className="editor-container">
      <div className="editor-header">
        <h2>Document: {documentId}</h2>
        <div className="connection-status">
          Status: {connected ? 'Connected' : 'Connecting...'}
        </div>
        <div className="active-users">
          Active Users: {activeUsers.length}
        </div>
      </div>
      
      <div className="editor-content">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Start typing..."
        />
      </div>
    </div>
  );
};

export default Editor; 