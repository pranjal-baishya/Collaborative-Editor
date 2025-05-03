import express, { RequestHandler } from 'express';
import { 
  createDocument, 
  getDocument, 
  getAllUserDocuments, 
  updateDocument, 
  deleteDocument,
  saveDocumentContent
} from '../controllers/documents';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// All document routes should be protected
router.use(authMiddleware as RequestHandler);

// Document routes
router.post('/', createDocument as RequestHandler);
router.get('/:id', getDocument as RequestHandler);
router.get('/', getAllUserDocuments as RequestHandler);
router.put('/:id', updateDocument as RequestHandler);
router.delete('/:id', deleteDocument as RequestHandler);
router.post('/:id/content', saveDocumentContent as RequestHandler);

export default router; 