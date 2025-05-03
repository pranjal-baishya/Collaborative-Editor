import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT ?? 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000, // Increase ping timeout to 60 seconds
  pingInterval: 25000, // Set ping interval to 25 seconds
  connectTimeout: 30000, // Increase connection timeout
  transports: ['websocket', 'polling'] // Explicitly define transports
});

// Track active document editing sessions
interface DocumentSession {
  users: {
    userId: string;
    username: string;
    socketId: string;
    cursorPosition?: {
      line: number;
      ch: number;
    };
    avatarColor?: string;
  }[];
}

const documentSessions: Record<string, DocumentSession> = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle errors to prevent crashes
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Join document editing session
  socket.on('join-document', (documentId: string, userData: { userId: string, username: string, avatarColor: string }) => {
    console.log(`User ${userData.username} (${userData.userId}) joining document ${documentId}`);
    
    // Remove user from previous rooms/documents first to prevent duplicates
    if (socket.data.currentDocument) {
      console.log(`User was previously in document ${socket.data.currentDocument}, cleaning up`);
      leaveDocument(socket, socket.data.currentDocument);
    }
    
    // Store current document info on socket data
    socket.data.currentDocument = documentId;
    socket.data.userData = userData;
    
    // Join the room
    socket.join(documentId);
    
    if (!documentSessions[documentId]) {
      documentSessions[documentId] = { users: [] };
    }
    
    // Check if user already exists in the document to prevent duplicates
    const existingUserIndex = documentSessions[documentId].users.findIndex(u => u.userId === userData.userId);
    if (existingUserIndex !== -1) {
      console.log(`User ${userData.username} already in document, updating socket ID`);
      // Update the socket ID if user already exists
      documentSessions[documentId].users[existingUserIndex].socketId = socket.id;
    } else {
      console.log(`Adding user ${userData.username} to document ${documentId}`);
      // Add user to document session with their info
      documentSessions[documentId].users.push({
        userId: userData.userId,
        username: userData.username,
        socketId: socket.id,
        avatarColor: userData.avatarColor
      });
      
      // Notify others that user joined
      socket.to(documentId).emit('user-joined', {
        userId: userData.userId,
        username: userData.username,
        avatarColor: userData.avatarColor
      });
    }
    
    // Send current users in the document to the newly joined user
    io.to(socket.id).emit('document-users', documentSessions[documentId].users);
    
    // Log current state for debugging
    console.log(`Document ${documentId} now has ${documentSessions[documentId].users.length} users`);
  });

  // Handle content changes
  socket.on('send-changes', (documentId: string, changes: any) => {
    socket.to(documentId).emit('receive-changes', changes);
  });
  
  // Handle cursor position updates
  socket.on('cursor-position', (documentId: string, position: { line: number; ch: number }, userId: string) => {
    // Find the user in document session and update cursor position
    if (documentSessions[documentId]) {
      const userIndex = documentSessions[documentId].users.findIndex(u => u.userId === userId);
      if (userIndex !== -1) {
        documentSessions[documentId].users[userIndex].cursorPosition = position;
        
        // Broadcast cursor position to other users in the document
        socket.to(documentId).emit('cursor-update', {
          userId,
          position
        });
      }
    }
  });

  // Helper function to handle a user leaving a document
  function leaveDocument(socket: any, documentId: string) {
    if (!documentSessions[documentId]) {
      console.log(`Document ${documentId} does not exist, nothing to clean up`);
      return;
    }
    
    const userIndex = documentSessions[documentId].users.findIndex(u => u.socketId === socket.id);
    
    if (userIndex !== -1) {
      // Get the user data before removing
      const userData = documentSessions[documentId].users[userIndex];
      
      // Remove user from session
      documentSessions[documentId].users.splice(userIndex, 1);
      
      // Notify others that user left
      io.to(documentId).emit('user-left', userData.userId);
      
      console.log(`User ${userData.username} (${userData.userId}) left document ${documentId}`);
      
      // Clean up empty document sessions
      if (documentSessions[documentId].users.length === 0) {
        console.log(`Document ${documentId} has no users, cleaning up session`);
        delete documentSessions[documentId];
      }
    } else {
      console.log(`User with socket ${socket.id} not found in document ${documentId}`);
    }
  }

  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Get current document from socket data
    const currentDocument = socket.data.currentDocument;
    
    // If user was in a document, handle leaving properly
    if (currentDocument) {
      console.log(`User was in document ${currentDocument}, handling departure`);
      leaveDocument(socket, currentDocument);
      return; // No need to scan all documents if we already know which one
    }
    
    // Fallback: scan all documents (should rarely be needed)
    let userFoundInAnyDocument = false;
    Object.keys(documentSessions).forEach(docId => {
      const userIndex = documentSessions[docId].users.findIndex(u => u.socketId === socket.id);
      
      if (userIndex !== -1) {
        userFoundInAnyDocument = true;
        // Get the user data before removing
        const userData = documentSessions[docId].users[userIndex];
        
        // Remove user from session
        documentSessions[docId].users.splice(userIndex, 1);
        
        // Notify others that user left
        io.to(docId).emit('user-left', userData.userId);
        
        console.log(`User ${userData.username} (${userData.userId}) left document ${docId}`);
        
        // Clean up empty document sessions
        if (documentSessions[docId].users.length === 0) {
          console.log(`Document ${docId} has no users, cleaning up session`);
          delete documentSessions[docId];
        }
      }
    });
    
    if (!userFoundInAnyDocument && !currentDocument) {
      console.log(`Socket ${socket.id} was not associated with any document`);
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 