import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import Listing, { ListingStatus } from '../models/Listing.js';
import Bid, { BidStatus } from '../models/Bid.js';
import Review from '../models/Review.js';
import axios from 'axios';
import type { IUser } from '../models/User.js';

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

export async function handleCallbackQuery(bot: TelegramBot, query: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!chatId || !data) return;

    await bot.answerCallbackQuery(query.id);

    if (data.startsWith('available_')) {
        await handleAvailabilityResponse(bot, chatId, userId, data);
    } else if (data.startsWith('radius_')) {
        await handleRadiusSelection(bot, chatId, userId, data);
    } else if (data.startsWith('bid_')) {
        await handleBidResponse(bot, chatId, userId, data, query);
    } else if (data.startsWith('rate_')) {
        await handleRatingSubmission(bot, chatId, userId, data);
    }
}
export async function handleAvailabilityResponse(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    data: string
): Promise<void> {
    const isAvailable = data === 'available_yes';

    const currentState = getUserState(userId);

    updateUserState(userId, {
        availabilityData: {
            isAvailable,
            radius: (await currentState).availabilityData?.radius,
            location: (await currentState).availabilityData?.location
        },
        state: isAvailable ? ConversationState.SETTING_AVAILABILITY : ConversationState.IDLE,
        currentStep: isAvailable ? 'location' : undefined
    } as Partial<IUser>);

    if (!isAvailable) {
        await bot.sendMessage(
            chatId,
            "You've been marked as unavailable for deliveries. Use /available anytime to change your status."
        );
        return;
    }

    await bot.sendMessage(
        chatId,
        "Great! To be available for deliveries, please share your *live location* so we can match you with nearby requests in real-time.\n\n" +
        "📍 *How to share live location:*\n" +
        "1. Tap the 📎 attachment button (bottom left)\n" +
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
}

async function handleRadiusSelection(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    data: string
): Promise<void> {
    const radius = parseInt(data.split('_')[1]);

    const currentState = getUserState(userId);

    updateUserState(userId, {
        availabilityData: {
            isAvailable: true,
            radius,
            location: (await currentState).availabilityData?.location
        },
        state: ConversationState.IDLE,
        currentStep: undefined
    });

    const confirmationMessage = `
You're now available as a traveler! 🎉

We'll notify you of delivery requests within ${radius} km of your location.
Use /status anytime to see available requests or /available to update your status.
  `;

    await bot.sendMessage(chatId, confirmationMessage, {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
    });

    await showNearbyListings(bot, chatId, userId, radius);
}

async function showNearbyListings(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    radius: number
): Promise<void> {
    try {
        const userState = await getUserState(userId);
        const userLocation = userState.availabilityData?.location;

        if (!userLocation) {
            await bot.sendMessage(chatId, "We couldn't determine your location. Please try setting your availability again.");
            return;
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
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);

        if (listingsWithDistance.length === 0) {
            await bot.sendMessage(
                chatId,
                "There are no delivery requests in your area right now. We'll notify you when new requests come in."
            );
            return;
        }

        await bot.sendMessage(
            chatId,
            "Here are delivery requests near your location:"
        );

        for (const { listing, distance } of listingsWithDistance) {
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

            const notificationMessage = `
🔔 *Delivery Opportunity!*

Someone needs an item ${distance.toFixed(1)} km from your location:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Offered Fee: $${listing.maxFee}

*Pickup Location:* ${pickupAddress}
*Delivery Location:* ${destinationAddress}

Are you interested in picking up this item?
      `;

            const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = [
                [
                    { text: "✅ Accept", callback_data: `bid_accept_${listing._id}` },
                    { text: "❌ Decline", callback_data: `bid_decline_${listing._id}` }
                ],
                [
                    { text: "💰 Offer Bid", callback_data: `bid_counter_${listing._id}` }
                ],
                [
                    { text: "🗺️ View Pickup Map", url: pickupMapUrl }
                ]
            ];

            if (destinationMapUrl) {
                inlineKeyboard.push([
                    { text: "🗺️ View Delivery Map", url: destinationMapUrl }
                ]);
            }

            await bot.sendMessage(chatId, notificationMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            });
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        await bot.sendMessage(
            chatId,
            "There was an error finding delivery requests in your area. Please try again later."
        );
    }
}

async function handleBidResponse(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    data: string,
    query: TelegramBot.CallbackQuery
): Promise<void> {
    try {
        if (data.startsWith('bid_accept_')) {
            const listingId = data.substring('bid_accept_'.length);

            const listing = await Listing.findById(listingId);

            if (!listing) {
                await bot.sendMessage(chatId, "This listing is no longer available.");
                return;
            }

            let pickupAddress = 'Unknown location';
            let destinationAddress = 'Unknown location';

            if (listing.pickupLocation) {
                pickupAddress = await getAddressFromCoordinates(
                    listing.pickupLocation.latitude,
                    listing.pickupLocation.longitude
                );
            }

            if (listing.destinationLocation) {
                destinationAddress = await getAddressFromCoordinates(
                    listing.destinationLocation.latitude,
                    listing.destinationLocation.longitude
                );
            }

            const acceptBid = new Bid({
                travelerId: userId,
                listingId: listingId,
                proposedFee: listing.maxFee,
                status: BidStatus.ACCEPTED
            });

            await acceptBid.save();

            listing.status = ListingStatus.MATCHED;
            listing.acceptedBidId = acceptBid._id;
            listing.travelerId = userId;

            const buyerOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const travelerOtp = Math.floor(100000 + Math.random() * 900000).toString();

            listing.otpBuyer = buyerOtp;
            listing.otpTraveler = travelerOtp;

            await listing.save();

            updateUserState(userId, {
                currentListingId: listingId,
                otpCode: travelerOtp,
                state: ConversationState.CONFIRMING_DELIVERY
            });

            updateUserState(listing.buyerId, {
                currentListingId: listingId,
                otpCode: buyerOtp,
                state: ConversationState.CONFIRMING_DELIVERY
            });

            const buyerNotification = `
🎉 *Great News!*

A traveler has accepted your delivery request for:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Fee: $${listing.maxFee}

The traveler will purchase and deliver your item. When they arrive:

1. Share your OTP with them: ${buyerOtp}
2. Enter their OTP in this chat to confirm delivery

*Your OTP code is: ${buyerOtp}*
      `;

            await bot.sendMessage(
                listing.buyerId,
                buyerNotification,
                { parse_mode: 'Markdown' }
            );

            await bot.sendMessage(
                chatId,
                `
You've accepted this delivery request! 🎉

*Delivery Details:*
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Your Fee: $${listing.maxFee}

*Pickup Location:* ${pickupAddress}
*Delivery Location:* ${destinationAddress}

Please purchase the item and meet the buyer at the delivery location. When you meet:

1. Show the buyer your OTP: ${travelerOtp}
2. Enter their OTP in this chat to confirm delivery

*Your OTP code is: ${travelerOtp}*
        `,
                { parse_mode: 'Markdown' }
            );

            const otherPendingBids = await Bid.find({
                listingId: listing._id,
                _id: { $ne: acceptBid._id },
                status: BidStatus.PENDING
            });

            if (otherPendingBids.length > 0) {
                await Bid.updateMany(
                    {
                        listingId: listing._id,
                        _id: { $ne: acceptBid._id },
                        status: BidStatus.PENDING
                    },
                    { status: BidStatus.DECLINED }
                );

                for (const otherBid of otherPendingBids) {
                    await bot.sendMessage(
                        otherBid.travelerId,
                        `Your bid for the delivery request "${listing.itemDescription}" has been declined because another traveler accepted the request.`
                    );
                }
            }

        } else if (data.startsWith('bid_decline_')) {
            const listingId = data.substring('bid_decline_'.length);

            if (query.message) {
                try {
                    await bot.deleteMessage(chatId, query.message.message_id);
                } catch (error) {
                    await bot.sendMessage(
                        chatId,
                        "You've declined this delivery request. We'll notify you of other opportunities."
                    );
                }
            } else {
                await bot.sendMessage(
                    chatId,
                    "You've declined this delivery request. We'll notify you of other opportunities."
                );
            }

        } else if (data.startsWith('bid_counter_')) {
            const listingId = data.substring('bid_counter_'.length);

            updateUserState(userId, {
                state: ConversationState.BIDDING,
                currentStep: 'propose_fee',
                currentListingId: listingId
            });

            const listing = await Listing.findById(listingId);

            if (!listing) {
                await bot.sendMessage(chatId, "This listing is no longer available.");
                return;
            }

            await bot.sendMessage(
                chatId,
                `What fee would you like to propose for this delivery? (minimum $${listing.maxFee})`,
                { reply_markup: { force_reply: true } }
            );

        } else if (data.startsWith('bid_buyer_accept_')) {
            const bidId = data.substring('bid_buyer_accept_'.length);

            const bid = await Bid.findById(bidId);

            if (!bid) {
                await bot.sendMessage(chatId, "This bid is no longer available.");
                return;
            }

            bid.status = BidStatus.ACCEPTED;
            await bid.save();

            const listingToUpdate = await Listing.findById(bid.listingId);
            if (listingToUpdate) {
                listingToUpdate.status = ListingStatus.MATCHED;
                listingToUpdate.acceptedBidId = bid._id;
                listingToUpdate.travelerId = bid.travelerId;

                const buyerOtp = Math.floor(100000 + Math.random() * 900000).toString();
                const travelerOtp = Math.floor(100000 + Math.random() * 900000).toString();

                listingToUpdate.otpBuyer = buyerOtp;
                listingToUpdate.otpTraveler = travelerOtp;

                await listingToUpdate.save();

                const otherPendingBids = await Bid.find({
                    listingId: bid.listingId,
                    _id: { $ne: bid._id },
                    status: BidStatus.PENDING
                });

                if (otherPendingBids.length > 0) {
                    await Bid.updateMany(
                        {
                            listingId: bid.listingId,
                            _id: { $ne: bid._id },
                            status: BidStatus.PENDING
                        },
                        { status: BidStatus.DECLINED }
                    );

                    for (const otherBid of otherPendingBids) {
                        await bot.sendMessage(
                            otherBid.travelerId,
                            `Your bid for the delivery request "${listingToUpdate.itemDescription}" has been declined because the buyer accepted another traveler's bid.`
                        );
                    }
                }

                await bot.sendMessage(
                    chatId,
                    `
You've accepted the traveler's bid! 🎉

*Delivery Details:*
Item: ${listingToUpdate.itemDescription}
Price: $${listingToUpdate.itemPrice}
Fee: $${bid.proposedFee}

The traveler will purchase and deliver your item. When they arrive:

1. Share your OTP with them: ${buyerOtp}
2. Enter their OTP in this chat to confirm delivery

*Your OTP code is: ${buyerOtp}*
          `,
                    { parse_mode: 'Markdown' }
                );

                await bot.sendMessage(
                    bid.travelerId,
                    `
Great news! The buyer has accepted your bid! 🎉

*Delivery Details:*
Item: ${listingToUpdate.itemDescription}
Price: $${listingToUpdate.itemPrice}
Your Fee: $${bid.proposedFee}

Please purchase the item and meet the buyer at the delivery location. When you meet:

1. Show the buyer your OTP: ${travelerOtp}
2. Enter their OTP in this chat to confirm delivery

*Your OTP code is: ${travelerOtp}*
          `,
                    { parse_mode: 'Markdown' }
                );

                updateUserState(bid.travelerId, {
                    currentListingId: bid.listingId.toString(),
                    otpCode: travelerOtp,
                    state: ConversationState.CONFIRMING_DELIVERY
                });

                updateUserState(listingToUpdate.buyerId, {
                    currentListingId: bid.listingId.toString(),
                    otpCode: buyerOtp,
                    state: ConversationState.CONFIRMING_DELIVERY
                });
            }

        } else if (data.startsWith('bid_buyer_decline_')) {
            const bidId = data.substring('bid_buyer_decline_'.length);

            const declinedBid = await Bid.findById(bidId);

            if (!declinedBid) {
                await bot.sendMessage(chatId, "This bid is no longer available.");
                return;
            }

            declinedBid.status = BidStatus.DECLINED;
            await declinedBid.save();

            await bot.sendMessage(
                chatId,
                "You've declined this bid. The traveler has been notified."
            );

            await bot.sendMessage(
                declinedBid.travelerId,
                "The buyer has declined your bid. Feel free to look for other delivery requests."
            );
        }
    } catch (error) {
        await bot.sendMessage(
            chatId,
            "There was an error processing your request. Please try again later."
        );
    }
}

async function handleRatingSubmission(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    data: string
): Promise<void> {
    try {
        const rating = parseInt(data.split('_')[1]);

        const userState = await getUserState(userId);
        const listingId = userState.currentListingId;

        if (!listingId) {
            await bot.sendMessage(chatId, "We couldn't find the delivery you're trying to rate.");
            return;
        }

        const listing = await Listing.findById(listingId);

        if (!listing) {
            await bot.sendMessage(chatId, "We couldn't find the delivery you're trying to rate.");
            return;
        }

        const isBuyer = listing.buyerId === userId;
        const toUserId = isBuyer ? listing.travelerId : listing.buyerId;

        if (!toUserId) {
            await bot.sendMessage(chatId, "We couldn't determine who you're trying to rate.");
            return;
        }

        const newReview = new Review({
            fromUserId: userId,
            toUserId: toUserId,
            listingId: listing._id,
            rating: rating,
            createdAt: new Date()
        });

        await newReview.save();

        updateUserState(userId, {
            state: ConversationState.IDLE,
            currentStep: undefined,
            currentListingId: undefined,
            otpCode: undefined
        });

        await bot.sendMessage(
            chatId,
            `
Thank you for your rating of ${rating}/5! 

Your feedback helps improve our community. The transaction is now complete.

Use /status to check your active listings and deliveries, or /available to update your availability status.
      `,
            { parse_mode: 'Markdown' }
        );

        await updateUserRating(toUserId);

    } catch (error) {
        await bot.sendMessage(
            chatId,
            "There was an error saving your rating. Please try again later."
        );
    }
}

async function updateUserRating(userId: number): Promise<void> {
    try {
        const reviews = await Review.find({ toUserId: userId });

        if (reviews.length === 0) {
            return;
        }

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        await updateUserState(userId, {
            rating: averageRating
        });
    } catch (error) {
    }
}
