import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import { showNearbyListings } from '../commands/listings.js';
import axios from 'axios';
import { setTimeout } from 'timers';
import Listing, { ListingStatus } from '../models/Listing.js';
import User from '../models/User.js';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface LiveLocationData {
    lastLocation: {
        latitude: number;
        longitude: number;
    };
    lastUpdateTime: number;
    chatId: number;
    messageId: number;
    address?: string;
    sentMessageIds?: number[];
}

const activeLiveLocations: Record<string, LiveLocationData> = {};

async function getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
        );

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            return response.data.results[0].formatted_address;
        }
        return 'Unknown location';
    } catch (error) {
        return 'Unknown location';
    }
}

export async function handleLocation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const location = msg.location;

    if (!userId || !location) return;

    if (location.live_period) {
        await handleLiveLocation(bot, msg);
        return;
    }

    const userState = await getUserState(userId);

    switch (userState.state) {
        case ConversationState.CREATING_LISTING:
            await handleListingLocation(bot, msg, userState.currentStep);
            break;
        case ConversationState.SETTING_AVAILABILITY:
            await requestLiveLocation(bot, chatId);
            const updateuserState = await getUserState(userId);
            console.log('🐙 User state after live:', JSON.stringify(updateuserState, null, 2));
            break;
        case ConversationState.VIEWING_LISTINGS:
            await handleViewListingsLocation(bot, msg);
            break;
        default:
            await bot.sendMessage(
                chatId,
                "Thanks for sharing your location, but I'm not sure what to do with it right now. Try using a command like /newrequest, /available, or /listings first."
            );
    }
}

async function handleListingLocation(bot: TelegramBot, msg: TelegramBot.Message, currentStep?: string): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const location = msg.location;

    if (!userId || !location) return;

    switch (currentStep) {
        case 'pickup_location':
            const pickupAddress = await getAddressFromCoordinates(location.latitude, location.longitude);

            const currentUserState = await getUserState(userId);
            const currentListingData = currentUserState.listingData || {
                itemDescription: '',
                itemPrice: 0,
                maxFee: 0
            };

            updateUserState(userId, {
                listingData: {
                    ...currentListingData,
                    pickupLocation: {
                        latitude: location.latitude,
                        longitude: location.longitude
                    }
                },
                pickupAddress: pickupAddress,
                currentStep: 'destination_location'
            });

            await bot.sendMessage(
                chatId,
                `Great! Pickup location set to: ${pickupAddress}\n\nNow, where should the item be delivered to? Please share a location or type an address.`,
                {
                    reply_markup: {
                        keyboard: [[{ text: "📍 Share Location", request_location: true }]],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
            break;

        case 'destination_location':
            const destinationAddress = await getAddressFromCoordinates(location.latitude, location.longitude);

            const currentUserStateForDest = await getUserState(userId);
            const currentListingDataForDest = currentUserStateForDest.listingData || {
                itemDescription: '',
                itemPrice: 0,
                maxFee: 0
            };

            updateUserState(userId, {
                listingData: {
                    ...currentListingDataForDest,
                    destinationLocation: {
                        latitude: location.latitude,
                        longitude: location.longitude
                    }
                },
                destinationAddress: destinationAddress,
                currentStep: 'max_fee'
            });

            await bot.sendMessage(
                chatId,
                `Delivery location set to: ${destinationAddress}\n\nWhat's the maximum fee you're willing to pay for delivery? (in dollars)`,
                {
                    reply_markup: {
                        remove_keyboard: true,
                        force_reply: true
                    }
                }
            );
            break;

        default:
            await bot.sendMessage(
                chatId,
                "Something went wrong. Please try again with /newrequest."
            );
    }
}

async function handleAvailabilityLocation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const location = msg.location;

    if (!userId || !location) return;

    updateUserState(userId, {
        availabilityData: {
            isAvailable: true,
            location: {
                latitude: location.latitude,
                longitude: location.longitude
            }
        },
        currentStep: 'radius',
        state: ConversationState.SETTING_AVAILABILITY
    });

    await bot.sendMessage(
        chatId,
        "What radius around your location are you willing to travel? (in kilometers)",
        {
            reply_markup: {
                remove_keyboard: true,
                force_reply: true,
                inline_keyboard: [
                    [
                        { text: "1 km", callback_data: "radius_1" },
                        { text: "3 km", callback_data: "radius_3" },
                        { text: "5 km", callback_data: "radius_5" },
                        { text: "10 km", callback_data: "radius_10" }
                    ]
                ]
            }
        }
    );
}

async function handleViewListingsLocation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const location = msg.location;

    if (!userId || !location) return;

    await updateUserState(userId, {
        state: ConversationState.IDLE,
        currentStep: undefined
    });

    const FIXED_RADIUS = 5;

    await showNearbyListings(
        bot,
        chatId,
        userId,
        FIXED_RADIUS,
        { latitude: location.latitude, longitude: location.longitude },
        false
    );
}

async function handleLiveLocation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const location = msg.location;
    const messageId = msg.message_id;

    if (!userId || !location) return;

    const currentTime = Date.now();

    const address = await getAddressFromCoordinates(location.latitude, location.longitude);

    const userState = await getUserState(userId);

    const previousData = activeLiveLocations[userId.toString()];
    let isSignificantMove = true;

    if (previousData) {
        const prevLat = previousData.lastLocation.latitude;
        const prevLng = previousData.lastLocation.longitude;

        const distance = calculateDistance(
            prevLat, prevLng,
            location.latitude, location.longitude
        );

        isSignificantMove = distance > 0.1;
    }

    activeLiveLocations[userId.toString()] = {
        lastLocation: {
            latitude: location.latitude,
            longitude: location.longitude
        },
        lastUpdateTime: currentTime,
        chatId: chatId,
        messageId: messageId,
        address: address
    };

    const existingRadius = userState.availabilityData?.radius;

    updateUserState(userId, {
        availabilityData: {
            isAvailable: true,
            location: {
                latitude: location.latitude,
                longitude: location.longitude
            },
            isLiveLocation: true,
            radius: existingRadius
        }
    });

    if (userState.state === ConversationState.SETTING_AVAILABILITY && userState.currentStep === 'location') {
        updateUserState(userId, {
            currentStep: 'radius',
            state: ConversationState.SETTING_AVAILABILITY
        });

        await bot.sendMessage(
            chatId,
            `Great! I'm now tracking your live location at:\n${address}\n\nWhat radius around your current location are you willing to travel? (in kilometers)`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "1 km", callback_data: "radius_1" },
                            { text: "3 km", callback_data: "radius_3" },
                            { text: "5 km", callback_data: "radius_5" },
                            { text: "10 km", callback_data: "radius_10" }
                        ]
                    ]
                }
            }
        );
    }
    else if (userState.availabilityData?.isAvailable &&
        existingRadius) {

        const radius = existingRadius;

        const newLocation = {
            latitude: location.latitude,
            longitude: location.longitude
        };

        const fiveMinutesInMs = 5 * 60 * 1000;
        const shouldCheckListings = isSignificantMove ||
            !previousData ||
            (currentTime - (previousData.lastUpdateTime || 0) > fiveMinutesInMs);

        if (shouldCheckListings) {
            if (activeLiveLocations[userId.toString()]) {
                activeLiveLocations[userId.toString()].lastUpdateTime = currentTime;
            }

            const sentMessageIds = await showNearbyListings(bot, chatId, userId, radius, newLocation, true);

            if (sentMessageIds && sentMessageIds.length > 0) {
                if (!activeLiveLocations[userId.toString()]) {
                    activeLiveLocations[userId.toString()] = {
                        lastLocation: newLocation,
                        lastUpdateTime: currentTime,
                        chatId: chatId,
                        messageId: messageId
                    };
                }

                if (!activeLiveLocations[userId.toString()].sentMessageIds) {
                    activeLiveLocations[userId.toString()].sentMessageIds = [];
                }

                setTimeout(async () => {
                    try {
                        for (const msgId of sentMessageIds) {
                            await bot.deleteMessage(chatId, msgId);
                        }
                    } catch (error) {
                    }

                    const userLiveLocation = activeLiveLocations[userId.toString()];
                    if (userLiveLocation?.sentMessageIds) {
                        userLiveLocation.sentMessageIds =
                            userLiveLocation.sentMessageIds.filter(
                                id => !sentMessageIds.includes(id)
                            );
                    }
                }, fiveMinutesInMs);

                activeLiveLocations[userId.toString()].sentMessageIds?.push(...sentMessageIds);
            }
        }
    }
}

async function requestLiveLocation(bot: TelegramBot, chatId: number): Promise<void> {
    await bot.sendMessage(
        chatId,
        "To be available for deliveries, please share your *live location* so we can match you with nearby requests in real-time.\n\n" +
        "1. Tap the 📎 attachment button\n" +
        "2. Select 'Location'\n" +
        "3. Choose 'Share Live Location'\n" +
        "4. Select a duration (at least 1 hour recommended)",
        {
            parse_mode: 'Markdown',
            reply_markup: {
                remove_keyboard: true
            }
        }
    );

    await bot.sendMessage(
        chatId,
        "Please use Telegram's built-in live location sharing feature as shown in the steps above. The 'Share Location' button can only share static location."
    );
}

export function setupLiveLocationTracking(bot: TelegramBot): void {
    setInterval(async () => {
        const currentTime = Date.now();

        for (const userIdStr in activeLiveLocations) {
            const userData = activeLiveLocations[userIdStr];
            const { lastLocation, lastUpdateTime, chatId, sentMessageIds } = userData;
            const userId = parseInt(userIdStr);

            const twoMinutesInMs = 2 * 60 * 1000;
            if (currentTime - lastUpdateTime > twoMinutesInMs) {
                const userState = await getUserState(userId);
                const existingRadius = userState.availabilityData?.radius;

                updateUserState(userId, {
                    availabilityData: {
                        isAvailable: false,
                        location: lastLocation,
                        isLiveLocation: false,
                        radius: existingRadius
                    }
                });

                await bot.sendMessage(
                    chatId,
                    "You've stopped sharing your live location, so you've been marked as unavailable for deliveries. Use /available anytime to become available again."
                );

                if (sentMessageIds && sentMessageIds.length > 0) {
                    for (const msgId of sentMessageIds) {
                        try {
                            await bot.deleteMessage(chatId, msgId);
                        } catch (error) {
                        }
                    }
                }

                delete activeLiveLocations[userIdStr];
            } else {
                const fiveMinutesInMs = 5 * 60 * 1000;
                const timeSinceLastUpdate = currentTime - lastUpdateTime;

                if (timeSinceLastUpdate >= fiveMinutesInMs) {
                    const userState = await getUserState(userId);
                    const radius = userState.availabilityData?.radius || 5;

                    activeLiveLocations[userIdStr].lastUpdateTime = currentTime;

                    const newLocation = {
                        latitude: lastLocation.latitude,
                        longitude: lastLocation.longitude
                    };

                    const sentMessageIds = await showNearbyListings(
                        bot,
                        chatId,
                        userId,
                        radius,
                        newLocation,
                        true
                    );

                    if (sentMessageIds && sentMessageIds.length > 0) {
                        if (!activeLiveLocations[userIdStr]) {
                            continue;
                        }

                        if (!activeLiveLocations[userIdStr].sentMessageIds) {
                            activeLiveLocations[userIdStr].sentMessageIds = [];
                        }

                        setTimeout(async () => {
                            try {
                                for (const msgId of sentMessageIds) {
                                    await bot.deleteMessage(chatId, msgId);
                                }
                            } catch (error) {
                            }

                            const userLiveLocation = activeLiveLocations[userIdStr];
                            if (userLiveLocation?.sentMessageIds) {
                                userLiveLocation.sentMessageIds =
                                    userLiveLocation.sentMessageIds.filter(
                                        id => !sentMessageIds.includes(id)
                                    );
                            }
                        }, fiveMinutesInMs);

                        activeLiveLocations[userIdStr].sentMessageIds.push(...sentMessageIds);
                    }
                }
            }
        }
    }, 60000);
}

export async function handleStopLiveLocation(bot: TelegramBot, userId: number): Promise<void> {
    if (activeLiveLocations[userId.toString()]) {
        const userData = activeLiveLocations[userId.toString()];
        const { chatId, sentMessageIds } = userData;

        const userState = await getUserState(userId);
        const existingRadius = userState.availabilityData?.radius;

        updateUserState(userId, {
            availabilityData: {
                isAvailable: false,
                location: userData.lastLocation,
                isLiveLocation: false,
                radius: existingRadius
            }
        });

        await bot.sendMessage(
            chatId,
            "You've stopped sharing your live location, so you've been marked as unavailable for deliveries. Use /available anytime to become available again."
        );

        if (sentMessageIds && sentMessageIds.length > 0) {
            for (const msgId of sentMessageIds) {
                try {
                    await bot.deleteMessage(chatId, msgId);
                } catch (error) {
                }
            }
        }

        delete activeLiveLocations[userId.toString()];
    }
}

export async function handleStopSharing(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    await handleStopLiveLocation(bot, userId);

    if (!activeLiveLocations[userId.toString()]) {
        await bot.sendMessage(
            chatId,
            "You're not currently sharing your live location."
        );
    }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

export function setupListingPolling(bot: TelegramBot): void {
  setInterval(async () => {
    // Get all users who are available
    const availableUsers = await User.find({
      'availabilityData.isAvailable': true,
      'availabilityData.location': { $exists: true },
      'availabilityData.radius': { $exists: true }
    });

    for (const user of availableUsers) {
      if (!user.telegramId || !user.availabilityData?.location || !user.availabilityData?.radius) {
        continue;
      }

      const userId = user.telegramId;
      const location = user.availabilityData.location;
      const radius = user.availabilityData.radius;

      // Find new listings within radius
      const listings = await Listing.find({
        status: ListingStatus.OPEN,
        _id: { $nin: user.notifiedListingIds || [] }
      });

      const nearbyListings = listings.filter(listing => {
        if (!listing.pickupLocation) return false;

        // If pickup location is "anywhere" (0,0 coordinates), always include it
        if (listing.pickupLocation.latitude === 0 && listing.pickupLocation.longitude === 0) {
          return true;
        }

        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          listing.pickupLocation.latitude,
          listing.pickupLocation.longitude
        );

        return distance <= radius;
      });

      if (nearbyListings.length > 0) {
        // Update user's notified listings
        const newNotifiedIds = [
          ...(user.notifiedListingIds || []),
          ...nearbyListings.map(l => l._id.toString())
        ];

        await User.updateOne(
          { telegramId: userId },
          { $set: { notifiedListingIds: newNotifiedIds } }
        );

        // Send notification for each new listing
        for (const listing of nearbyListings) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            listing.pickupLocation!.latitude,
            listing.pickupLocation!.longitude
          );

          const message = `
📦 *New Delivery Request Nearby!*

Someone needs an item ${distance.toFixed(1)} km from your location:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Offered Fee: $${listing.maxFee}

Are you interested in picking up this item?
          `;

          await bot.sendMessage(userId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Accept", callback_data: `bid_accept_${listing._id}` },
                  { text: "❌ Decline", callback_data: `bid_decline_${listing._id}` }
                ],
                [
                  { text: "💰 Offer Bid", callback_data: `bid_counter_${listing._id}` }
                ]
              ]
            }
          });
        }
      }
    }
  }, 1000); // Poll every second
}
