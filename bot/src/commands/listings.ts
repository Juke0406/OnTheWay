import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import Listing, { ListingStatus } from '../models/Listing.js';
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

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

export async function handleListings(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    try {
        const userState = await getUserState(userId);
        const isAvailable = userState.availabilityData?.isAvailable || false;
        const userLocation = userState.availabilityData?.location;
        const userRadius = userState.availabilityData?.radius || 5;

        if (isAvailable && userLocation) {
            await showNearbyListings(bot, chatId, userId, userRadius, userLocation, false);
        } else {
            updateUserState(userId, {
                state: ConversationState.VIEWING_LISTINGS,
                currentStep: 'share_location'
            });

            const FIXED_RADIUS = 5;

            await bot.sendMessage(
                chatId,
                `To see delivery requests near you, please share your location. We'll show requests within ${FIXED_RADIUS}km of your location.`,
                {
                    reply_markup: {
                        keyboard: [[{ text: "📍 Share Location", request_location: true }]],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
        }
    } catch (error) {
        await bot.sendMessage(
            chatId,
            "Sorry, there was an error processing your request. Please try again later."
        );
    }
}

export async function showNearbyListings(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    radius: number,
    userLocation: { latitude: number, longitude: number },
    quietMode: boolean = false
): Promise<number[]> {
    try {
        const sentMessageIds: number[] = [];

        const userStateBefore = await getUserState(userId);

        const isUserAvailable = userStateBefore.availabilityData?.isAvailable || false;

        if (!userLocation) {
            if (!quietMode) {
                await bot.sendMessage(chatId, "We couldn't determine your location. Please try again.");
            }
            return [];
        }

        const nearbyListings = await Listing.find({
            status: ListingStatus.OPEN
        }).limit(50);

        const listingsWithDistance = nearbyListings
            .filter(listing => listing.pickupLocation)
            .map(listing => {
                const pickupDistance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    listing.pickupLocation!.latitude,
                    listing.pickupLocation!.longitude
                );

                return { listing, distance: pickupDistance };
            })
            .filter(item => item.distance <= radius)
            .sort((a, b) => a.distance - b.distance);

        if (listingsWithDistance.length === 0) {
            if (!quietMode) {
                await bot.sendMessage(
                    chatId,
                    "There are no delivery requests in your area right now. Try again later or increase your radius with /available."
                );
            }
            return [];
        }

        const userState = await getUserState(userId);
        const notifiedListings = userState.notifiedListingIds || [];

        const newListings = listingsWithDistance.filter(
            item => !notifiedListings.includes(item.listing._id.toString())
        );

        const listingsToShow = quietMode ? newListings : listingsWithDistance;

        if (listingsToShow.length === 0 && quietMode) {
            return [];
        }

        const limitedListings = quietMode ?
            listingsToShow.slice(0, 3) :
            listingsToShow.slice(0, 10);

        if (!quietMode) {
            const introMsg = await bot.sendMessage(
                chatId,
                `Found ${listingsWithDistance.length} delivery requests near your location:`
            );
            sentMessageIds.push(introMsg.message_id);
        } else if (limitedListings.length > 0) {
            const updateMsg = await bot.sendMessage(
                chatId,
                `📍 Based on your updated location, we found ${limitedListings.length} new delivery ${limitedListings.length === 1 ? 'request' : 'requests'} nearby:`
            );
            sentMessageIds.push(updateMsg.message_id);
        }

        const newNotifiedListings = [
            ...notifiedListings,
            ...limitedListings
                .filter(item => !notifiedListings.includes(item.listing._id.toString()))
                .map(item => item.listing._id.toString())
        ];

        updateUserState(userId, {
            notifiedListingIds: newNotifiedListings
        });

        for (const { listing, distance } of limitedListings) {
            const pickupAddress = await getAddressFromCoordinates(
                listing.pickupLocation!.latitude,
                listing.pickupLocation!.longitude
            );

            let destinationAddress = 'Unknown destination';
            if (listing.destinationLocation) {
                destinationAddress = await getAddressFromCoordinates(
                    listing.destinationLocation.latitude,
                    listing.destinationLocation.longitude
                );
            }

            const pickupMapUrl = `https://www.google.com/maps?q=${listing.pickupLocation!.latitude},${listing.pickupLocation!.longitude}`;

            let destinationMapUrl = '';
            if (listing.destinationLocation) {
                destinationMapUrl = `https://www.google.com/maps?q=${listing.destinationLocation.latitude},${listing.destinationLocation.longitude}`;
            }

            const listingMessage = `
📦 *Delivery Request #${listing._id}*
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Fee: $${listing.maxFee}
Distance: ${distance.toFixed(1)} km away

📍 *Pickup:* ${pickupAddress}
🏁 *Destination:* ${destinationAddress}
      `;

            const inlineKeyboard = [];

            if (isUserAvailable) {
                inlineKeyboard.push([
                    { text: "✅ Accept", callback_data: `bid_accept_${listing._id}` },
                    { text: "❌ Decline", callback_data: `bid_decline_${listing._id}` }
                ]);

                inlineKeyboard.push([
                    { text: "💰 Offer Bid", callback_data: `bid_counter_${listing._id}` }
                ]);
            }

            inlineKeyboard.push([
                { text: "🗺️ View Pickup Map", url: pickupMapUrl }
            ]);

            if (destinationMapUrl) {
                inlineKeyboard.push([
                    { text: "🗺️ View Delivery Map", url: destinationMapUrl }
                ]);
            }

            const sentMsg = await bot.sendMessage(chatId, listingMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            });

            sentMessageIds.push(sentMsg.message_id);
        }

        if (!quietMode && listingsWithDistance.length > 10) {
            const footerMsg = await bot.sendMessage(
                chatId,
                `Showing 10 of ${listingsWithDistance.length} available requests. Use /available to update your preferences.`
            );
            sentMessageIds.push(footerMsg.message_id);
        }

        return sentMessageIds;
    } catch (error) {
        if (!quietMode) {
            await bot.sendMessage(
                chatId,
                "There was an error finding delivery requests in your area. Please try again later."
            );
        }
        return [];
    }
}
