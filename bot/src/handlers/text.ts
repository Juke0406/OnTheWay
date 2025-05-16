import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import Listing, { ListingStatus } from '../models/Listing.js';
import Bid, { BidStatus } from '../models/Bid.js';
import User from '../models/User.js';
import { handleNaturalLanguage } from './nlp.js';

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

export async function handleText(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text) return;

    // First try to process as natural language
    const handledByNlp = await handleNaturalLanguage(bot, msg);
    if (handledByNlp) {
        return; // If NLP handled it, we're done
    }

    // If not handled by NLP, continue with existing command flow
    const userState = await getUserState(userId);

    switch (userState.state) {
        case ConversationState.CREATING_LISTING:
            await handleListingCreation(bot, msg, userState.currentStep);
            break;
        case ConversationState.BIDDING:
            await handleBidding(bot, msg);
            break;
        case ConversationState.CONFIRMING_DELIVERY:
            await handleDeliveryConfirmation(bot, msg);
            break;
        case ConversationState.TOPUP:
            await handleTopup(bot, msg);
            break;
        default:
            // Check if we're in a topup flow based on currentStep
            if (userState.currentStep === 'topup_amount') {
                await handleTopup(bot, msg);
            } else {
                await bot.sendMessage(chatId, "I'm not sure what you mean. Try using one of the commands like /newrequest or /available.");
            }
    }
}

async function handleListingCreation(bot: TelegramBot, msg: TelegramBot.Message, currentStep?: string): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text) return;

    switch (currentStep) {
        case 'item_description':
            const userStateForDesc = await getUserState(userId);
            updateUserState(userId, {
                listingData: {
                    ...(userStateForDesc.listingData || { itemPrice: 0, maxFee: 0 }),
                    itemDescription: text
                },
                currentStep: 'item_price'
            });

            await bot.sendMessage(
                chatId,
                "Great! How much does this item cost? (in dollars)",
                { reply_markup: { force_reply: true } }
            );
            break;

        case 'item_price':
            const price = parseFloat(text);

            if (isNaN(price) || price <= 0) {
                await bot.sendMessage(
                    chatId,
                    "Please enter a valid price in dollars (e.g., 25.99).",
                    { reply_markup: { force_reply: true } }
                );
                return;
            }

            const userStateForPrice = await getUserState(userId);
            updateUserState(userId, {
                listingData: {
                    ...(userStateForPrice.listingData || { itemDescription: '', maxFee: 0 }),
                    itemPrice: price
                },
                currentStep: 'pickup_location'
            });

            await bot.sendMessage(
                chatId,
                "Where should the traveler pick up this item? Please share a location or type an address.",
                {
                    reply_markup: {
                        keyboard: [[{ text: "📍 Share Location", request_location: true }]],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
            break;

        case 'pickup_location':
            updateUserState(userId, {
                currentStep: 'pickup_location_text',
                pickupAddress: text
            });

            await bot.sendMessage(
                chatId,
                `Pickup address set to: ${text}\n\nWhere should the item be delivered to? Please share a location or type an address.`,
                {
                    reply_markup: {
                        keyboard: [[{ text: "📍 Share Location", request_location: true }]],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
            break;

        case 'pickup_location_text':
            const userStateForPickup = await getUserState(userId);
            const pickupLocationWithAddress = {
                latitude: 0,
                longitude: 0,
            };

            updateUserState(userId, {
                listingData: {
                    ...(userStateForPickup.listingData || { itemDescription: '', itemPrice: 0, maxFee: 0 }),
                    pickupLocation: pickupLocationWithAddress
                },
                pickupAddress: text,
                currentStep: 'destination_location'
            });

            await bot.sendMessage(
                chatId,
                "Where should the item be delivered to? Please share a location or type an address.",
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
            updateUserState(userId, {
                currentStep: 'destination_location_text',
                destinationAddress: text
            });

            await bot.sendMessage(
                chatId,
                `Delivery address set to: ${text}\n\nWhat's the maximum fee you're willing to pay for delivery? (in dollars)`,
                {
                    reply_markup: {
                        remove_keyboard: true,
                        force_reply: true
                    }
                }
            );
            break;

        case 'destination_location_text':
            const userStateForDest = await getUserState(userId);
            const destinationLocationWithAddress = {
                latitude: 0,
                longitude: 0,
            };

            updateUserState(userId, {
                listingData: {
                    ...(userStateForDest.listingData || { itemDescription: '', itemPrice: 0, maxFee: 0 }),
                    destinationLocation: destinationLocationWithAddress
                },
                destinationAddress: text,
                currentStep: 'max_fee'
            });

            await bot.sendMessage(
                chatId,
                "What's the maximum fee you're willing to pay for delivery? (in dollars)",
                {
                    reply_markup: {
                        remove_keyboard: true,
                        force_reply: true
                    }
                }
            );
            break;

        case 'max_fee':
            const fee = parseFloat(text);

            if (isNaN(fee) || fee <= 0) {
                await bot.sendMessage(
                    chatId,
                    "Please enter a valid fee in dollars (e.g., 5.00).",
                    { reply_markup: { force_reply: true } }
                );
                return;
            }

            const userStateForFee = await getUserState(userId);

            const listingData = {
                itemDescription: userStateForFee.listingData?.itemDescription || '',
                itemPrice: userStateForFee.listingData?.itemPrice || 0,
                maxFee: fee,
                pickupLocation: userStateForFee.listingData?.pickupLocation,
                destinationLocation: userStateForFee.listingData?.destinationLocation
            };

            const user = await User.findOne({ telegramId: userId });
            const totalCost = listingData.itemPrice + fee;
            const initialPayment = totalCost * 0.5;

            if (user!.walletBalance < initialPayment) {
                await bot.sendMessage(
                    chatId,
                    `You don't have enough balance to create this listing. You need $${initialPayment} (50% of total cost). Your current balance is $${user!.walletBalance}. Please use /topup to add funds.`,
                    { reply_markup: { force_reply: true } }
                );
                return;
            }

            // Deduct initial payment
            user!.walletBalance -= initialPayment;
            await user!.save();

            // Create the listing
            const newListing = new Listing({
                buyerId: userId,
                itemDescription: listingData.itemDescription,
                itemPrice: listingData.itemPrice,
                maxFee: fee,
                pickupLocation: listingData.pickupLocation,
                destinationLocation: listingData.destinationLocation,
                status: ListingStatus.OPEN
            });

            await newListing.save();

            // Update user state and notify
            updateUserState(userId, {
                listingData,
                state: ConversationState.IDLE,
                currentStep: undefined
            });

            await bot.sendMessage(
                chatId,
                `Your delivery request has been created! (ID: ${newListing._id})\n\n💰 $${initialPayment} (50% of total cost) has been reserved from your wallet. Your current balance: $${user!.walletBalance}`
            );

            await notifyNearbyTravelers(bot, newListing);

            const summary = `
Your listing has been created! 🎉

*Listing #${newListing._id}*
Item: ${listingData.itemDescription}
Price: $${listingData.itemPrice}
Pickup: ${userStateForFee.pickupAddress || 'Location shared'}
Delivery: ${userStateForFee.destinationAddress || 'Location shared'}
Max Fee: $${listingData.maxFee}

We'll notify you when travelers place bids on your listing.
Check /status anytime to see updates.
      `;

            await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
            break;

        default:
            await bot.sendMessage(chatId, "Something went wrong. Please try again with /newrequest.");
    }
}

async function handleBidding(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text) return;

    const userState = await getUserState(userId);
    const fee = parseFloat(text);

    if (isNaN(fee) || fee <= 0) {
        await bot.sendMessage(
            chatId,
            "Please enter a valid fee in dollars (e.g., 5.00).",
            { reply_markup: { force_reply: true } }
        );
        return;
    }

    try {
        const listing = await Listing.findById(userState.currentListingId);

        if (!listing) {
            await bot.sendMessage(chatId, "This listing is no longer available.");
            updateUserState(userId, {
                state: ConversationState.IDLE,
                currentStep: undefined,
                currentListingId: undefined
            });
            return;
        }

        if (fee < listing.maxFee) {
            await bot.sendMessage(
                chatId,
                `Your proposed fee must be at least $${listing.maxFee}. Please enter a higher amount.`,
                { reply_markup: { force_reply: true } }
            );
            return;
        }

        const newBid = new Bid({
            travelerId: userId,
            listingId: listing._id,
            proposedFee: fee,
            status: BidStatus.PENDING
        });

        await newBid.save();

        updateUserState(userId, {
            state: ConversationState.IDLE,
            currentStep: undefined,
            currentListingId: undefined
        });

        const buyerNotification = `
🔔 *New Bid Received!*

A traveler has proposed a fee for your delivery request:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Proposed Fee: $${fee} (your max: $${listing.maxFee})

This bid will expire in 20 seconds. Accept now?
    `;

        const buyerKeyboard = {
            inline_keyboard: [
                [
                    { text: "✅ Accept Bid", callback_data: `bid_buyer_accept_${newBid._id}` },
                    { text: "❌ Decline", callback_data: `bid_buyer_decline_${newBid._id}` }
                ]
            ]
        };

        const buyerMessage = await bot.sendMessage(
            listing.buyerId,
            buyerNotification,
            {
                parse_mode: 'Markdown',
                reply_markup: buyerKeyboard
            }
        );

        await bot.sendMessage(
            chatId,
            `
Your bid of $${fee} has been submitted for listing #${listing._id}! 🎉

The buyer has been notified of your offer. Waiting for their response...
      `,
            { parse_mode: 'Markdown' }
        );

        setTimeout(async () => {
            try {
                const currentBid = await Bid.findById(newBid._id);

                if (currentBid && currentBid.status === BidStatus.PENDING) {
                    currentBid.status = BidStatus.DECLINED;
                    await currentBid.save();

                    await bot.deleteMessage(listing.buyerId, buyerMessage.message_id);

                    await bot.sendMessage(
                        userId,
                        "Your bid has expired. The buyer didn't respond in time. Feel free to try again or look for other delivery requests."
                    );

                    await bot.sendMessage(
                        listing.buyerId,
                        `You missed a bid for your listing "${listing.itemDescription}". The traveler's offer has expired.`
                    );
                }
            } catch (error) {
            }
        }, 20000);
    } catch (error) {
        await bot.sendMessage(
            chatId,
            "There was an error processing your bid. Please try again later."
        );
    }
}

async function handleDeliveryConfirmation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text) return;

    const userState = await getUserState(userId);

    if (!userState.currentListingId) {
        await bot.sendMessage(chatId, "No active delivery to confirm. Use /status to check your deliveries.");
        return;
    }

    try {
        const listing = await Listing.findById(userState.currentListingId);

        if (!listing) {
            await bot.sendMessage(chatId, "This delivery request no longer exists.");
            updateUserState(userId, {
                state: ConversationState.IDLE,
                currentStep: undefined,
                currentListingId: undefined
            });
            return;
        }

        const isBuyer = listing.buyerId === userId;
        const isTraveler = listing.travelerId === userId;

        if (!isBuyer && !isTraveler) {
            await bot.sendMessage(chatId, "You are not associated with this delivery.");
            return;
        }

        let isOtpValid = false;
        let otherUserId: number | undefined;

        if (isBuyer) {
            isOtpValid = text === listing.otpTraveler;
            otherUserId = listing.travelerId;
        } else {
            isOtpValid = text === listing.otpBuyer;
            otherUserId = listing.buyerId;
        }

        if (!isOtpValid) {
            await bot.sendMessage(
                chatId,
                "❌ The OTP code is incorrect. Please verify and try again."
            );
            return;
        }

        if (isBuyer) {
            listing.buyerConfirmed = true;
        } else {
            listing.travelerConfirmed = true;
        }

        const bothConfirmed = listing.buyerConfirmed && listing.travelerConfirmed;

        if (bothConfirmed) {
            listing.status = ListingStatus.COMPLETED;
            listing.deliveryConfirmed = true;
            
            // Process final payment
            const buyer = await User.findOne({ telegramId: listing.buyerId });
            const traveler = await User.findOne({ telegramId: listing.travelerId });
            const acceptedBid = await Bid.findById(listing.acceptedBidId);
            
            // Make sure all required entities exist
            if (!buyer || !traveler || !acceptedBid || !listing.travelerId) {
                await bot.sendMessage(
                    chatId,
                    "There was an error processing the payment. Please contact support."
                );
                return;
            }
            
            const totalCost = listing.itemPrice + acceptedBid.proposedFee;
            const finalPayment = totalCost * 0.5; // Remaining 50%
            const travelerPayment = totalCost * 0.95; // 95% of total goes to traveler
            
            // Deduct final payment from buyer
            buyer.walletBalance -= finalPayment;
            
            // Add payment to traveler
            traveler.walletBalance += travelerPayment;
            
            await buyer.save();
            await traveler.save();
            await listing.save();

            updateUserState(userId, {
                state: ConversationState.IDLE,
                currentStep: undefined,
                currentListingId: undefined,
                otpCode: undefined
            });

            if (otherUserId) {
                updateUserState(otherUserId, {
                    state: ConversationState.IDLE,
                    currentStep: undefined,
                    currentListingId: undefined,
                    otpCode: undefined
                });
            }

            const completionMessage = "🎉 Delivery completed successfully! Both parties have confirmed the exchange.";

            // Send transaction details to buyer
            await bot.sendMessage(
                listing.buyerId, 
                `${completionMessage}\n\n💰 *Transaction Details*\nFinal payment: $${finalPayment} deducted\nYour new wallet balance: $${buyer.walletBalance}`,
                { parse_mode: 'Markdown' }
            );

            // Send transaction details to traveler - with null check
            await bot.sendMessage(
                listing.travelerId, 
                `${completionMessage}\n\n💰 *Transaction Details*\nPayment received: $${travelerPayment}\nYour new wallet balance: $${traveler.walletBalance}`,
                { parse_mode: 'Markdown' }
            );

            await promptForRating(bot, chatId, userId, listing);

            if (otherUserId) {
                await promptForRating(bot, otherUserId, otherUserId, listing);
            }
        } else {
            await listing.save();

            await bot.sendMessage(
                chatId,
                "✅ Your OTP verification is successful! Waiting for the other party to confirm..."
            );

            if (otherUserId) {
                const notifyMessage = `The ${isBuyer ? 'buyer' : 'traveler'} has verified your OTP! Please enter their OTP to complete the delivery.`;
                await bot.sendMessage(otherUserId, notifyMessage);
            }
        }
    } catch (error) {
        await bot.sendMessage(
            chatId,
            "There was an error processing your request. Please try again later."
        );
    }
}

async function promptForRating(bot: TelegramBot, chatId: number, _userId: number, _listing: any): Promise<void> {
    await bot.sendMessage(
        chatId,
        "Please rate your experience with this delivery (0-5):",
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "0", callback_data: "rate_0" },
                        { text: "1", callback_data: "rate_1" },
                        { text: "2", callback_data: "rate_2" },
                        { text: "3", callback_data: "rate_3" },
                        { text: "4", callback_data: "rate_4" },
                        { text: "5", callback_data: "rate_5" }
                    ]
                ]
            }
        }
    );
}

async function notifyNearbyTravelers(bot: TelegramBot, listing: any): Promise<void> {
    try {
        if (!listing.pickupLocation) {
            return;
        }

        const availableTravelers = await User.find({
            'availabilityData.isAvailable': true,
            'availabilityData.location': { $exists: true },
            'availabilityData.radius': { $exists: true }
        });

        for (const traveler of availableTravelers) {
            // Make sure telegramId exists
            if (!traveler.telegramId || traveler.telegramId === listing.buyerId) {
                continue;
            }

            if (!traveler.availabilityData?.location || !traveler.availabilityData?.radius) {
                continue;
            }

            const distance = calculateDistance(
                traveler.availabilityData.location.latitude,
                traveler.availabilityData.location.longitude,
                listing.pickupLocation.latitude,
                listing.pickupLocation.longitude
            );

            if (distance <= traveler.availabilityData.radius) {
                const notificationMessage = `
📦 *New Delivery Request Nearby!*

Someone needs an item ${distance.toFixed(1)} km from your location:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Offered Fee: $${listing.maxFee}

Are you interested in picking up this item?
        `;

                await bot.sendMessage(traveler.telegramId, notificationMessage, {
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
    } catch (error) {
        console.error("Error notifying travelers:", error);
    }
}

export async function handleTopup(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text) return;

    const userState = await getUserState(userId);

    // Process topup regardless of state if currentStep is topup_amount
    if (userState.state === ConversationState.TOPUP || userState.currentStep === 'topup_amount') {
        const topupAmount = parseFloat(text);
        
        if (isNaN(topupAmount) || topupAmount <= 0) {
            await bot.sendMessage(
                chatId,
                "Please enter a valid amount in dollars (e.g., 50.00).",
                { reply_markup: { force_reply: true } }
            );
            return;
        }
        
        try {
            const user = await User.findOneAndUpdate(
                { telegramId: userId },
                { $inc: { walletBalance: topupAmount } },
                { new: true }
            );
            
            if (!user) {
                // Create user if not exists
                const newUser = new User({
                    telegramId: userId,
                    firstName: msg.from?.first_name || "User",
                    lastName: msg.from?.last_name,
                    username: msg.from?.username,
                    walletBalance: topupAmount
                });
                await newUser.save();
                
                updateUserState(userId, {
                    state: ConversationState.IDLE,
                    currentStep: undefined
                });
                
                await bot.sendMessage(
                    chatId,
                    `✅ Successfully added $${topupAmount} to your wallet. Your new balance is $${topupAmount}.`
                );
            } else {
                updateUserState(userId, {
                    state: ConversationState.IDLE,
                    currentStep: undefined
                });
                
                await bot.sendMessage(
                    chatId,
                    `✅ Successfully added $${topupAmount} to your wallet. Your new balance is $${user.walletBalance}.`
                );
            }
        } catch (error) {
            console.error("Error processing topup:", error);
            await bot.sendMessage(
                chatId,
                "There was an error processing your payment. Please try again later."
            );
        }
    } else {
        await bot.sendMessage(chatId, "I'm not sure what you mean. Try using one of the commands like /newrequest or /available.");
    }
}
