import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Track active document editing sessions
const documentSessions: Record<string, string[]> = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join document editing session
  socket.on('join-document', (documentId: string, userId: string) => {
    socket.join(documentId);
    
    if (!documentSessions[documentId]) {
      documentSessions[documentId] = [];
    }
    
    documentSessions[documentId].push(userId);
    
    // Notify others that user joined
    socket.to(documentId).emit('user-joined', userId);
    
    // Send current users in the document
    io.to(socket.id).emit('document-users', documentSessions[documentId]);
    
    console.log(`User ${userId} joined document ${documentId}`);
  });

  // Handle content changes
  socket.on('send-changes', (documentId: string, changes: any) => {
    socket.to(documentId).emit('receive-changes', changes);
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from any document sessions they were part of
    Object.keys(documentSessions).forEach(docId => {
      const userIndex = documentSessions[docId].indexOf(socket.id);
      if (userIndex !== -1) {
        documentSessions[docId].splice(userIndex, 1);
        io.to(docId).emit('user-left', socket.id);
      }
    });
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 