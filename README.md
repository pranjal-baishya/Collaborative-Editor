# Collaborative Editor

A real-time collaborative document editing application that allows multiple users to edit documents simultaneously with live cursor tracking and user presence indicators.

## Project Overview

This project consists of two main parts:

- **Client**: React-based frontend application
- **Server**: Node.js backend with Socket.IO for real-time communications

## Features

- Real-time collaborative text editing
- Multiple concurrent users can edit the same document
- Live cursor tracking and visibility
- User authentication and authorization
- Document creation, editing, and sharing
- User presence indicators

## Tech Stack

### Frontend
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client for API requests

### Backend
- **Node.js & TypeScript** - Backend runtime and language
- **Express** - Web server framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB & Mongoose** - Database and ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing

## Project Structure

### Client
```
client/src/
├── components/    # UI components
│   ├── Auth/      # Authentication components
│   ├── Editor/    # Document editor components
│   └── User/      # User-related components
├── context/       # React context providers
├── App.tsx        # Main application component
└── index.tsx      # Application entry point
```

### Server
```
server/src/
├── components/    # Reusable application components
├── config/        # Configuration files (database, etc.)
├── controllers/   # Request handlers
├── middleware/    # Express middleware
├── models/        # MongoDB schemas
├── routes/        # API routes
└── index.ts       # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB

### Setup and Installation

1. Clone the repository

2. Set up the server:
   ```
   cd server
   npm install
   ```

3. Set up the client:
   ```
   cd client
   npm install
   ```

4. Configure environment variables:
   Create a `.env` file in the server directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLIENT_URL=http://localhost:3000
   ```

### Running the Application

1. Start the server:
   ```
   cd server
   npm run dev
   ```

2. In a new terminal, start the client:
   ```
   cd client
   npm start
   ```

3. Access the application at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT

### Documents
- `GET /api/documents` - Get all documents for current user
- `POST /api/documents` - Create a new document
- `GET /api/documents/:id` - Get a specific document
- `PUT /api/documents/:id` - Update a document
- `DELETE /api/documents/:id` - Delete a document

## Socket.IO Events

- `join-document` - Join a document editing session
- `send-changes` - Send document changes to other users
- `receive-changes` - Receive document changes from other users
- `cursor-position` - Broadcast cursor position updates
- `cursor-update` - Receive cursor position updates
- `user-joined` - Notify when a user joins the document
- `user-left` - Notify when a user leaves the document

## How It Works

1. Users register/login through the authentication system
2. Once authenticated, users can create new documents or access shared ones
3. Multiple users can edit the same document in real-time
4. Changes are synchronized through Socket.IO
5. User cursors and presence are visible to all collaborators

## Client Features

### Authentication
Users can create accounts and log in to access their documents.

### Document Editor
A real-time collaborative editor that allows multiple users to:
- Edit documents simultaneously
- See each other's cursor positions
- View who is currently editing the document

### Real-time Collaboration
Using Socket.IO, the editor provides:
- Instant updates between all connected users
- User presence indicators
- Cursor position tracking

## Available Scripts

### Client
- `npm start` - Run the development server
- `npm run build` - Create a production build
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Server
- `npm run dev` - Run the development server
- `npm run build` - Create a production build
- `npm start` - Run the production build

## License

[MIT](LICENSE) 