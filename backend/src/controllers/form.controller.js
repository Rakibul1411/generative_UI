import { generateFormSchema, isConfigured } from '../services/ai.service.js';

export const generateForm = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required and must be a string'
            });
        }

        if (prompt.trim().length < 5) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is too short. Please provide a more detailed description.'
            });
        }

        if (!isConfigured()) {
            return res.status(500).json({
                success: false,
                error: 'API key not configured. Please set API_KEY in .env file'
            });
        }

        const formSchema = await generateFormSchema(prompt);

        res.json({
            success: true,
            data: formSchema,
            meta: {
                fieldsCount: formSchema.fields.length,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error in generateForm controller:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate form',
            details: error.message
        });
    }
};
