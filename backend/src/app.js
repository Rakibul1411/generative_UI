import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import express from 'express';
import cors from 'cors';
import formRoutes from './routes/form.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', formRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;