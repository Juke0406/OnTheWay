import { GoogleGenerativeAI } from '@google/generative-ai';

// Global variable for the Gemini client
let genAI: GoogleGenerativeAI;
let model: any;

/**
 * Sets up the Gemini AI integration
 */
export function setupGemini() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('GEMINI_API_KEY not found in environment variables. Gemini integration will not work.');
        return;
    }

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash-preview-04-17' });

    console.log('Gemini API initialized successfully');
}

/**
 * Generate text using Gemini AI
 * @param prompt The prompt to send to Gemini
 * @param context Optional additional context
 * @returns The generated text response
 */
export async function generateText(prompt: string, context?: Record<string, any>): Promise<string> {
    if (!model) {
        return "Sorry, I'm unable to process your request right now. The AI service is not available.";
    }

    try {
        let fullPrompt = prompt;

        // Add context to the prompt if provided
        if (context) {
            fullPrompt += '\n\nContext:\n' + JSON.stringify(context, null, 2);
        }

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return text;
    } catch (error: any) {
        console.error('Error generating text with Gemini:', error);
        return `Sorry, I encountered an error: ${error.message || 'Unknown error'}`;
    }
}

/**
 * Parse form input with Gemini AI
 * @param formType The type of form being filled
 * @param userInput The user's input text
 * @param currentForm The current state of the form
 * @returns Parsed form field values
 */
export async function parseFormInput(
    formType: string,
    userInput: string,
    currentForm: Record<string, any>
): Promise<Record<string, any>> {
    if (!model) {
        throw new Error('Gemini AI not initialized');
    }

    const prompt = `
You are helping parse user input for a "${formType}" form. 
Current form state: ${JSON.stringify(currentForm, null, 2)}

Extract relevant information from the user input below and return ONLY a JSON object 
with the extracted field values. Do not include any explanations or text outside the JSON.

User input: "${userInput}"

JSON response:
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON object from model response
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            console.error('Unable to find JSON object in response:', text);
            throw new Error('Failed to parse form input: Invalid JSON response');
        }
        const jsonString = text.slice(start, end + 1);
        try {
            return JSON.parse(jsonString);
        } catch (parseError) {
            console.error('Error parsing JSON string:', jsonString, parseError);
            throw new Error('Failed to parse form input: Invalid JSON structure');
        }
    } catch (error: any) {
        console.error('Error parsing form input with Gemini:', error);
        throw new Error(`Failed to parse form input: ${error.message}`);
    }
}