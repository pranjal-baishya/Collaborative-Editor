import express, { RequestHandler } from 'express';
import { register, login } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);

// Protected route to get user info
router.get('/user', authMiddleware as RequestHandler, ((req, res) => {
  res.json({ user: req.user });
}) as RequestHandler);

export default router; 