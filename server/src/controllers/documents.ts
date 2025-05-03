import { Request, Response } from 'express';
import Document from '../models/Document';

// Create a new document
export const createDocument = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const newDocument = new Document({
      title: title || 'Untitled Document',
      content: '',
      owner: userId
    });

    const savedDocument = await newDocument.save();

    res.status(201).json({
      success: true,
      document: savedDocument
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific document by ID
export const getDocument = async (req: Request, res: Response) => {
  try {
    const documentId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is owner or collaborator
    const isOwner = document.owner.toString() === userId;
    const isCollaborator = document.collaborators.some(id => id.toString() === userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all documents for a user
export const getAllUserDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find documents where user is owner or collaborator
    const documents = await Document.find({
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    }).sort({ lastModified: -1 });

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update document properties (title, collaborators)
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const documentId = req.params.id;
    const { title, collaborators } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only owner can update document properties
    if (document.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields if provided
    if (title) document.title = title;
    if (collaborators) document.collaborators = collaborators;

    document.lastModified = new Date();
    
    const updatedDocument = await document.save();

    res.json({
      success: true,
      document: updatedDocument
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a document
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const documentId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only owner can delete document
    if (document.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await document.deleteOne();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Save document content
export const saveDocumentContent = async (req: Request, res: Response) => {
  try {
    const documentId = req.params.id;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is owner or collaborator
    const isOwner = document.owner.toString() === userId;
    const isCollaborator = document.collaborators.some(id => id.toString() === userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update document content and last modified date
    document.content = content;
    document.lastModified = new Date();
    
    await document.save();

    res.json({
      success: true,
      message: 'Document content saved successfully'
    });
  } catch (error) {
    console.error('Save document content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 