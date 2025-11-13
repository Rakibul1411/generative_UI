import express from 'express';
import { generateForm } from '../controllers/form.controller.js';

const router = express.Router();

router.post('/generate-form', generateForm);

export default router;
