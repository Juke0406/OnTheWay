import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState, updateNlpConversation } from '../state.js';
import { processNaturalLanguage } from '../gemini.js';
import { handleNewRequest } from '../commands/newRequest.js';
import { handleAvailable } from '../commands/available.js';
import { handleListings } from '../commands/listings.js';
import { handleWallet } from '../commands/wallet.js';
import { handleTopup } from '../commands/accept.js';
import { handleStatus } from '../commands/status.js';

export async function handleNaturalLanguage(
  bot: TelegramBot, 
  msg: TelegramBot.Message
): Promise<boolean> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text;

  if (!userId || !text) return false;

  const userState = await getUserState(userId);
  
  // If user is in command flow, don't process as natural language
  if (userState.state !== ConversationState.IDLE && 
      userState.state !== ConversationState.NLP_FLOW) {
    return false;
  }

  try {
    // Update conversation history with user message
    updateNlpConversation(userId, text, true);
    
    // Access in-memory state directly from the userStates map
    const userStateInMemory = userState;
    const nlpData = userStateInMemory.nlpData || { conversationHistory: [], collectedFields: {} };
    
    // Process with Gemini
    const nlpResult = await processNaturalLanguage(
      text, 
      nlpData.conversationHistory
    );
    
    // If we're continuing an NLP flow, use the existing intent
    const intent = userState.state === ConversationState.NLP_FLOW && 'intent' in nlpData
      ? nlpData.intent
      : nlpResult.intent;
    
    // Merge newly extracted fields with previously collected ones
    const collectedFields = {
      ...nlpData.collectedFields,
      ...nlpResult.fields
    };
    
    // Update user state with NLP data
    updateUserState(userId, {
      state: ConversationState.NLP_FLOW,
      nlpData: {
        intent,
        conversationHistory: nlpData.conversationHistory,
        collectedFields
      }
    });
    
    // Check if we have all required fields
    if (nlpResult.missingFields.length === 0) {
      // All fields collected, execute the command
      await executeIntent(bot, msg, intent, collectedFields);
      
      // Reset NLP flow
      updateUserState(userId, {
        state: ConversationState.IDLE,
        nlpData: undefined
      });
    } else {
      // Ask follow-up question for missing fields
      const response = nlpResult.followUpQuestion || 
        `Could you please provide the ${nlpResult.missingFields[0]}?`;
      
      await bot.sendMessage(chatId, response);
      
      // Add bot response to conversation history
      updateNlpConversation(userId, response, false);
    }
    
    return true;
  } catch (error) {
    console.error('Error in NLP handler:', error);
    return false;
  }
}

async function executeIntent(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  intent: string,
  fields: Record<string, any>
): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) return;
  
  switch (intent) {
    case 'newrequest':
      // Set up state for new request with collected fields
      updateUserState(userId, {
        state: ConversationState.CREATING_LISTING,
        currentStep: 'confirm',
        listingData: {
          itemDescription: fields.itemDescription,
          itemPrice: parseFloat(fields.itemPrice),
          maxFee: parseFloat(fields.maxFee),
          pickupLocation: fields.pickupLocation,
          destinationLocation: fields.destinationLocation
        },
        nlpFlow: true
      });
      
      // Call the existing handler
      await handleNewRequest(bot, msg);
      break;
      
    case 'available':
      updateUserState(userId, {
        state: ConversationState.SETTING_AVAILABILITY,
        availabilityData: {
          isAvailable: fields.isAvailable === true || fields.isAvailable === 'yes',
          location: fields.location,
          radius: fields.radius ? parseInt(fields.radius) : undefined
        },
        nlpFlow: true
      });
      
      await handleAvailable(bot, msg);
      break;
      
    case 'listings':
      updateUserState(userId, {
        state: ConversationState.VIEWING_LISTINGS,
        nlpFlow: true
      });
      
      await handleListings(bot, msg);
      break;
      
    case 'wallet':
      await handleWallet(bot, msg);
      break;
      
    case 'topup':
      if (fields.amount) {
        // If amount is provided, set it in state
        const amount = parseFloat(fields.amount);
        
        updateUserState(userId, {
          state: ConversationState.TOPUP,
          currentStep: 'topup_amount',
          nlpFlow: true
        });
        
        // Create a fake message with the amount
        const fakeMsg = {
          ...msg,
          text: amount.toString()
        };
        
        await handleTopup(bot, fakeMsg as TelegramBot.Message);
      } else {
        // Otherwise just start the topup flow
        await handleTopup(bot, msg);
      }
      break;
      
    case 'status':
      await handleStatus(bot, msg);
      break;
      
    default:
      await bot.sendMessage(
        chatId,
        "I'm not sure what you want to do. Try using commands like /newrequest, /available, or /wallet."
      );
  }
}
