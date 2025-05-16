import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConversationState } from './state.js';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

export interface NLPResult {
  intent: string;
  fields: Record<string, any>;
  missingFields: string[];
  followUpQuestion?: string;
}

// Base prompt for the model
const BASE_PROMPT = `You are a delivery request assistant for a Telegram bot called OnTheWay.
Your job is to understand user intents and extract relevant information.

The bot supports these commands:
- newrequest: Create a new delivery request
- available: Set availability as a traveler
- listings: View nearby delivery requests
- wallet: Check wallet balance
- topup: Add funds to wallet
- status: Check active listings and deliveries

For each user message, determine:
1. The user's intent (which command they want)
2. Extract all relevant fields for that intent
3. Identify which required fields are missing
4. Suggest a follow-up question to get missing information`;

export async function processNaturalLanguage(
  userMessage: string,
  conversationHistory: string[] = []
): Promise<NLPResult> {
  // Define required fields for each intent
  const requiredFields: Record<string, string[]> = {
    newrequest: ['itemDescription', 'itemPrice', 'pickupLocation', 'destinationLocation', 'maxFee'],
    available: ['isAvailable', 'location', 'radius'],
    listings: ['location'],
    wallet: [],
    topup: ['amount'],
    status: [],
    unknown: []
  };

  // Build conversation context
  let conversationContext = conversationHistory.join('\n');
  
  // Create the prompt
  const prompt = `${BASE_PROMPT}

${conversationContext ? `Conversation history:\n${conversationContext}\n\n` : ''}

User message: "${userMessage}"

Analyze this message and return a JSON object with:
{
  "intent": "newrequest|available|listings|wallet|topup|status|unknown",
  "fields": {
    // All fields you can extract from the message
    \"isAvailable\": true|false
  },
  "missingFields": [
    // List of required fields that are still missing
  ],
  "followUpQuestion": "A natural question to ask for the most important missing field"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                      text.match(/```\n([\s\S]*?)\n```/) || 
                      text.match(/{[\s\S]*?}/);
                      
    if (jsonMatch) {
      const jsonStr = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
      const parsed = JSON.parse(jsonStr);
      
      // Ensure the result has the expected structure
      return {
        intent: parsed.intent || 'unknown',
        fields: parsed.fields || {},
        missingFields: parsed.missingFields || 
          (parsed.intent ? requiredFields[parsed.intent].filter(
            field => !parsed.fields || !parsed.fields[field]
          ) : []),
        followUpQuestion: parsed.followUpQuestion || 'What would you like to do?'
      };
    }
    
    // Fallback if JSON parsing fails
    return {
      intent: 'unknown',
      fields: {},
      missingFields: [],
      followUpQuestion: 'I didn\'t understand that. What would you like to do?'
    };
  } catch (error) {
    console.error('Error processing with Gemini:', error);
    return {
      intent: 'unknown',
      fields: {},
      missingFields: [],
      followUpQuestion: 'Sorry, I had trouble understanding that. Could you try again?'
    };
  }
}