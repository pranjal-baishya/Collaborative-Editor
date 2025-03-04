import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  id: String,
  title: String,
  content: Object,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  ownerId: String,
  collaborators: [String],
  history: [
    {
      content: Object,
      timestamp: { type: Date, default: Date.now },
      userId: String
    }
  ]
});

export default mongoose.model('Document', DocumentSchema); 