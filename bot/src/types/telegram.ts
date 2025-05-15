// If this file doesn't exist, create it
import TelegramBot from 'node-telegram-bot-api';

// Extend the Location type to include live_period
declare module 'node-telegram-bot-api' {
  interface Location {
    live_period?: number;
  }
}