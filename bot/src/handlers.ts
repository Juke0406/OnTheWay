import { Markup } from 'telegraf';
import type { Message } from 'telegraf/types';
import { v4 as uuidv4 } from 'uuid';
import type { BotContext, Request, Listing as BotListingType, Bid as BotBidType } from './types.js'; // Renamed to avoid conflict
import { generateText, parseFormInput } from './gemini.js';
import { ListingService } from './db/listings.js';
import type { Listing as DbListing } from './db/listings.js';
import { BidService } from './db/bids.js';
import { UserService } from './db/users.js';

// Start command handler
export async function startHandler(ctx: BotContext) {
    // @ts-ignore - dbUser is attached in index.ts middleware
    const user = ctx.dbUser;
    const userName = user?.firstName || user?.username || 'there';

    const welcomeMessage = `
👋 Welcome to On The Way, ${userName}!

I'm here to connect you with nearby helpers for your delivery needs. Here's what you can do:

📦 /newrequest - Create a new delivery request
🔍 /available - Browse available delivery requests nearby
✅ /accept - Accept a delivery request (soon to be via buttons on /available)
📊 /status - Check the status of your requests
🔐 /verify - Verify OTP during delivery handoff

Need help? Just ask me any questions!
`;

    await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
            ['/newrequest', '/available'],
            ['/status'] // Removed /accept as it's being integrated into /available flow
        ]).resize()
    });
}

// New request command handler
export async function newRequestHandler(ctx: BotContext) {
    // @ts-ignore
    if (!ctx.dbUser || !ctx.dbUser.telegramId) {
        await ctx.reply("Sorry, I couldn't identify you. Please try /start again.");
        return;
    }
    ctx.session.conversationState = 'filling_form';
    ctx.session.formData = {
        type: 'delivery_request', // This could be dynamic if you support more types
        step: 'init',
        // @ts-ignore
        userId: ctx.dbUser.telegramId,
        // @ts-ignore
        userName: ctx.dbUser.username || ctx.dbUser.firstName || 'Anonymous'
    };

    await ctx.reply('Let\'s create a new delivery request! What would you like to have delivered? (Please describe the item, size, and any special requirements)');
    ctx.session.formData.step = 'item_details';
}

// Handler for showing available listings
export async function availableHandler(ctx: BotContext) {
    try {
        const availableDbListings = await ListingService.getAvailableListings();

        // Store in session for button handlers to potentially use (though ideally they'd re-fetch or use IDs)
        // This mapping is to the old BotListingType, adjust if your session/button logic changes
        ctx.session.availableListings = availableDbListings.map(l => ({
            id: l.listingId, // Use the uuid string ID
            userId: l.userId,
            userName: l.userName,
            listingType: l.requestType,
            details: l.requestDetails,
            location: l.pickupLocation as BotListingType['location'], // Assuming pickupLocation is the relevant one for "available"
            status: 'available', // Map DB status to old session status if needed, or use DB status directly
            createdAt: l.created_at || new Date(), // Ensure createdAt is a Date
            bids: [], // Bids would be fetched separately if needed here, or when viewing a specific listing
        }));


        if (availableDbListings.length === 0) {
            await ctx.reply('No available requests at the moment. Check back later!');
            return;
        }

        await ctx.reply('📋 Available delivery requests:');

        for (const listing of availableDbListings) {
            const details = listing.requestDetails as any; // Cast to any if structure is flexible
            const estimatedPrice = listing.estimatedPrice || details.estimatedPrice || 'N/A';
            const minPrice = listing.minPrice || details.minPrice || 0;

            const listingText = `
🔹 Request from ${listing.userName} (ID: ${listing.listingId.substring(0, 6)})
📦 Item: ${details.item}
📝 Notes: ${details.notes || 'N/A'}
💲 Est. Price: ${estimatedPrice}
💰 Min. Bid: $${minPrice}
`;
            // @ts-ignore
            const locationButton = listing.pickupLocation && (listing.pickupLocation.latitude && listing.pickupLocation.longitude || listing.pickupLocation.address) ?
                [Markup.button.callback(`📍 View Pickup Location`, `location_${listing.listingId}`)] : [];

            await ctx.reply(listingText, Markup.inlineKeyboard([
                locationButton,
                [
                    Markup.button.callback(`💲 Place Bid`, `bid_${listing.listingId}`),
                    Markup.button.callback(`✅ Accept Request`, `accept_${listing.listingId}`)
                ]
            ].filter(row => row.length > 0)));
        }
        // The old /accept [request_id] command is less user-friendly than buttons.
        // await ctx.reply('Click "Accept Request" or "Place Bid" on a listing.');
    } catch (error) {
        console.error('Error fetching available listings:', error);
        await ctx.reply('Sorry, I couldn\'t fetch available requests right now. Please try again later.');
    }
}

// Handler for accepting a request (now primarily done through buttons)
export async function acceptHandler(ctx: BotContext) {
    await ctx.reply('To accept a delivery request, please use the "Accept" buttons when viewing available requests with /available command.\n\nThis provides a more convenient way to accept requests without needing to type request IDs.');

    // This function is no longer used as handlers were replaced with inline buttons
    return await ctx.reply('To accept a delivery request, please use the "Accept" buttons when viewing available requests.');
}

// Handler for checking status of requests
export async function statusHandler(ctx: BotContext) {
    // @ts-ignore
    const dbUser = ctx.dbUser;
    if (!dbUser || !dbUser.telegramId) {
        await ctx.reply("Sorry, I couldn't identify you. Please try /start again.");
        return;
    }

    try {
        // Fetch listings created by the user (their outgoing requests)
        const userListings = await ListingService.getListingsByUserId(dbUser.telegramId);

        // Fetch listings accepted by the user (their incoming/active deliveries)
        // This requires a way to query listings where acceptedBy.userId matches dbUser.telegramId
        // For now, we'll filter all listings. This is inefficient and should be optimized with a proper DB query.
        const allListings = await ListingService.getAvailableListings(); // Or a new method like getAllActiveListings()
        const acceptedByMeListings = allListings.filter(
            listing => listing.acceptedBy && listing.acceptedBy.userId === dbUser.telegramId && listing.status !== 'completed' && listing.status !== 'canceled'
        );

        if (userListings.length === 0 && acceptedByMeListings.length === 0) {
            await ctx.reply('You don\'t have any active requests or deliveries at the moment. Use /newrequest to create one or /available to find deliveries.');
            return;
        }

        // Show user's own pending/active requests
        if (userListings.length > 0) {
            await ctx.reply(`📤 Your outgoing requests (${userListings.filter(l => l.status !== 'completed' && l.status !== 'canceled').length} active):`);
            for (const listing of userListings) {
                if (listing.status === 'completed' || listing.status === 'canceled') continue; // Skip completed/canceled for brevity

                const details = listing.requestDetails as any;
                let requestCard = `📦 Item: ${details.item || 'Not specified'} (ID: ${listing.listingId.substring(0, 6)})
📊 Status: ${formatStatus(listing.status)}`;

                const buttons = [];
                if (listing.status === 'pending') {
                    // Potentially add a "Cancel Request" button here
                    // buttons.push(Markup.button.callback('❌ Cancel Request', `cancel_request_${listing.listingId}`));
                    const bids = await BidService.getBidsByListingId(listing.listingId);
                    if (bids.length > 0) {
                        requestCard += `\n💰 ${bids.length} bid(s) received.`;
                        buttons.push(Markup.button.callback('💲 View Bids', `view_bids_${listing.listingId}`));
                    } else {
                        requestCard += `\n⏳ Waiting for bids.`;
                    }
                } else if (listing.status === 'accepted') {
                    requestCard += `\n🚚 Accepted by: ${listing.acceptedBy?.userName || 'Courier'}`;
                    requestCard += `\n🔑 Your OTP: ${listing.requesterOtp || 'N/A'}`;
                    buttons.push(Markup.button.callback('✅ Verify Delivery', `verify_${listing.listingId}`));
                }

                await ctx.reply(requestCard, Markup.inlineKeyboard([buttons].filter(b => b.length > 0)));
            }
        } else {
            await ctx.reply("You haven't created any requests yet. Use /newrequest to create one.");
        }

        await ctx.reply("---"); // Separator

        // Show requests the user has accepted to deliver
        if (acceptedByMeListings.length > 0) {
            await ctx.reply(`📥 Your accepted deliveries (${acceptedByMeListings.length}):`);
            for (const listing of acceptedByMeListings) {
                const details = listing.requestDetails as any;
                const requestCard = `🔹 Delivery for ${listing.userName} (ID: ${listing.listingId.substring(0, 6)})
📦 Item: ${details.item || 'Unknown item'}
📊 Status: ${formatStatus(listing.status)}
🔑 Your OTP: ${listing.courierOtp || 'N/A'}`;

                const buttons = [];
                if (listing.status !== 'completed' && listing.status !== 'canceled') {
                    buttons.push(Markup.button.callback('✅ Verify Delivery', `verify_${listing.listingId}`));
                }
                // @ts-ignore
                if (listing.pickupLocation && (listing.pickupLocation.latitude || listing.pickupLocation.address)) {
                    buttons.push(Markup.button.callback('📍 View Pickup', `courier_location_${listing.listingId}`));
                }
                // @ts-ignore
                if (listing.dropoffLocation && (listing.dropoffLocation.latitude || listing.dropoffLocation.address)) {
                    // buttons.push(Markup.button.callback('📍 View Dropoff', `courier_dropoff_loc_${listing.listingId}`));
                }


                await ctx.reply(requestCard, Markup.inlineKeyboard([buttons].filter(b => b.length > 0)));
            }
        } else {
            await ctx.reply("You haven't accepted any deliveries yet. Use /available to find some.");
        }

    } catch (error) {
        console.error('Error fetching status:', error);
        await ctx.reply('Sorry, I couldn\'t fetch your status right now. Please try again later.');
    }
}

// Handler for location messages
export async function locationHandler(ctx: BotContext) {
    const location = (ctx.message as Message.LocationMessage).location;

    if (!location) {
        await ctx.reply('I couldn\'t get your location. Please try again.');
        return;
    }

    const { latitude, longitude } = location;

    if (ctx.session.conversationState === 'filling_form') {
        const step = ctx.session.formData.step;

        if (step === 'pickup_location') {
            ctx.session.formData.pickupLocation = { latitude, longitude };
            await ctx.reply('Got your pickup location! Now, please share the dropoff location.');
            ctx.session.formData.step = 'dropoff_location';
        } else if (step === 'dropoff_location') {
            ctx.session.formData.dropoffLocation = { latitude, longitude };

            // Calculate estimated price based on distance (simplified)
            const pickup = ctx.session.formData.pickupLocation;
            const dropoff = { latitude, longitude };
            const distance = calculateDistance(pickup, dropoff);
            const estimatedPrice = calculatePrice(distance);

            ctx.session.formData.distance = distance;
            ctx.session.formData.estimatedPrice = estimatedPrice;

            await ctx.reply(`Great! I've got both locations.

📍 Distance: ${distance.toFixed(1)} km
💲 Estimated price: $${estimatedPrice.toFixed(2)}

Is there anything else you'd like to add about this delivery request?`);

            ctx.session.formData.step = 'confirmation';
        }
    } else {
        // If not in form filling mode, show nearby available listings
        await ctx.reply('Thanks for sharing your location! Here are nearby requests:');
        // In a real app, you would filter listings by proximity to this location
        await availableHandler(ctx);
    }
}

// Handler for text messages (form filling and conversations)
export async function handleTextMessage(ctx: BotContext) {
    const message = ctx.message as Message.TextMessage;

    // If the message is a command, don't process it here
    if (message.text.startsWith('/')) return;

    // Check if user is in verification mode
    if (ctx.session.conversationState === 'verifying' && ctx.session.verificationContext) {
        const { listingId, isRequester } = ctx.session.verificationContext; // Changed requestId to listingId
        const inputOtp = message.text.trim();
        // @ts-ignore
        const currentUser = ctx.dbUser;

        if (!currentUser || !currentUser.telegramId) {
            await ctx.reply("Sorry, I couldn't identify you. Please try /start again to resolve this.");
            ctx.session.conversationState = 'idle';
            ctx.session.verificationContext = undefined;
            return;
        }

        try {
            const listing = await ListingService.getListingByListingId(listingId);
            if (!listing || listing.status !== 'accepted') {
                await ctx.reply('This delivery is not active or cannot be verified at this moment.');
                ctx.session.conversationState = 'idle';
                ctx.session.verificationContext = undefined;
                return;
            }

            let otpToMatch: string | null | undefined = null;
            let otherPartyUserId: number | undefined = undefined;
            let successMessageToCurrentUser = '';
            let successMessageToOtherParty = '';
            let otherPartyRole = '';

            if (isRequester) { // Current user is the requester, verifying courier's OTP
                if (listing.userId !== currentUser.telegramId) {
                    await ctx.reply('Verification mismatch. You are not the requester for this delivery.');
                    ctx.session.conversationState = 'idle';
                    ctx.session.verificationContext = undefined;
                    return;
                }
                otpToMatch = listing.courierOtp;
                otherPartyUserId = listing.acceptedBy?.userId;
                otherPartyRole = 'courier';
                successMessageToCurrentUser = '✅ OTP verified successfully! Delivery marked as complete from your side.';
                successMessageToOtherParty = `✅ The requester (${currentUser.username || currentUser.firstName}) has verified your OTP for "${(listing.requestDetails as any).item}". Delivery complete!`;
            } else { // Current user is the courier, verifying requester's OTP
                if (listing.acceptedBy?.userId !== currentUser.telegramId) {
                    await ctx.reply('Verification mismatch. You are not the assigned courier for this delivery.');
                    ctx.session.conversationState = 'idle';
                    ctx.session.verificationContext = undefined;
                    return;
                }
                otpToMatch = listing.requesterOtp;
                otherPartyUserId = listing.userId;
                otherPartyRole = 'requester';
                successMessageToCurrentUser = '✅ OTP verified successfully! Delivery marked as complete from your side.';
                successMessageToOtherParty = `✅ The courier (${currentUser.username || currentUser.firstName}) has verified your OTP for "${(listing.requestDetails as any).item}". Delivery complete!`;
            }

            if (otpToMatch === inputOtp) {
                // Update listing status to 'completed'
                // Important: Only mark as 'completed' if both parties have verified, or based on your specific logic.
                // For now, one-sided verification completes it.
                await ListingService.updateListing(listingId, { status: 'completed' });
                await ctx.reply(successMessageToCurrentUser);

                // Notify the other party
                if (otherPartyUserId) {
                    try {
                        await ctx.telegram.sendMessage(otherPartyUserId, successMessageToOtherParty);
                    } catch (notifyError) {
                        console.error(`Failed to send verification completion to ${otherPartyRole} ${otherPartyUserId}:`, notifyError);
                        // Non-critical, but good to log
                    }
                }
                // TODO: Implement review prompt here
                // await ctx.reply(`Would you like to leave a review for this ${otherPartyRole}? (Yes/No)`);
                // ctx.session.conversationState = 'reviewing';
                // ctx.session.reviewContext = { listingId, reviewedUserId: otherPartyUserId, reviewerUserId: currentUser.telegramId };

            } else {
                await ctx.reply('❌ Invalid OTP. Please check and try again, or use /status to see details.');
            }

        } catch (dbError) {
            console.error('Error during OTP verification database operation:', dbError);
            await ctx.reply('Sorry, a database error occurred during verification. Please try again.');
        }

        // Reset the verification context
        ctx.session.conversationState = 'idle';
        ctx.session.verificationContext = undefined;
        return;
    }

    // Check if user is submitting a bid amount
    if (ctx.session.currentBidding) {
        const { listingId, minPrice } = ctx.session.currentBidding;
        const listing = ctx.session.availableListings.find(listing => listing.id === listingId);

        if (!listing) {
            await ctx.reply('Sorry, this listing is no longer available.');
            ctx.session.currentBidding = undefined;
            return;
        }

        // Parse the bid amount
        let bidAmount = 0;
        try {
            // Remove any $ sign and convert to number
            const cleanText = message.text.replace('$', '').trim();
            bidAmount = parseFloat(cleanText);

            if (isNaN(bidAmount)) {
                await ctx.reply(`Please enter a valid number for your bid amount. Minimum bid: $${minPrice}`);
                return;
            }
        } catch (error) {
            await ctx.reply(`Please enter a valid number for your bid amount. Minimum bid: $${minPrice}`);
            return;
        }

        // Check if bid meets minimum price
        if (bidAmount < minPrice) {
            await ctx.reply(`Your bid of $${bidAmount} is below the minimum bid of $${minPrice}. Please enter a higher bid.`);
            return;
        }

        // Create a bid object
        const bid: BotBidType = {
            userId: ctx.from?.id || 0,
            userName: ctx.from?.username || 'unknown',
            amount: bidAmount,
            timestamp: new Date(),
            status: 'pending'
        };

        // Initialize bids array if it doesn't exist
        if (!listing.bids) {
            listing.bids = [];
        }

        // Add bid to the listing
        listing.bids.push(bid);

        // Clear bidding context
        ctx.session.currentBidding = undefined;

        await ctx.reply(`✅ Your bid of $${bidAmount} has been submitted for "${listing.details.item}"!

The requester will be notified and can accept your bid.
Use /status to check your bid status.`);

        // Send notification to the requester (in a real app)
        await ctx.reply(`[DEMO] Message sent to requester: "A new bid of $${bidAmount} has been placed on your request for "${listing.details.item}" by ${ctx.from?.username || 'a courier'}. Check your status to view bids."`);

        return;
    }

    if (ctx.session.conversationState === 'filling_form') {
        await handleFormFillingConversation(ctx, message.text);
    } else {
        // Use Gemini to respond to general questions
        try {
            const response = await generateText(message.text);
            await ctx.reply(response || "I'm not sure how to respond to that.");
        } catch (error) {
            console.error('Error generating response:', error);
            await ctx.reply("I'm having trouble processing your message right now. Please try again later.");
        }
    }
}

// Helper function to handle the form filling conversation
async function handleFormFillingConversation(ctx: BotContext, text: string) {
    const formData = ctx.session.formData;
    const step = formData.step;

    switch (step) {
        case 'item_details':
            // Use Gemini to parse item details
            try {
                const parsedData = await parseFormInput('delivery_request', text, formData);
                Object.assign(formData, parsedData);

                // Move to next step
                await ctx.reply('Great! Now please share your pickup location by sending your location or typing an address.');
                formData.step = 'pickup_location';
            } catch (error) {
                await ctx.reply('I couldn\'t understand the details. Please try describing the item again, including size and any special requirements.');
            }
            break;

        case 'pickup_location':
            if (text.toLowerCase() === 'use current location') {
                await ctx.reply('Please use the location button to share your current location.');
            } else {
                // In a real app, you would geocode this address
                formData.pickupLocation = { address: text, latitude: 0, longitude: 0 };
                await ctx.reply('Got your pickup address! Now, please share the dropoff location or address.');
                formData.step = 'dropoff_location';
            }
            break;

        case 'dropoff_location':
            formData.dropoffLocation = { address: text, latitude: 0, longitude: 0 };
            await ctx.reply(`Great! I've got both locations. Is there anything else you'd like to add about this delivery request?`);
            formData.step = 'confirmation';
            break;

        case 'confirmation':
            formData.additionalNotes = text;
            // @ts-ignore
            if (!ctx.dbUser || !ctx.dbUser.telegramId) {
                await ctx.reply("Critical error: User information is missing. Cannot create request. Please /start again.");
                ctx.session.conversationState = 'idle';
                ctx.session.formData = {};
                return;
            }

            const listingId = uuidv4();
            const newListingData: Omit<DbListing, 'id' | 'created_at' | 'updated_at'> = {
                listingId: listingId,
                // @ts-ignore
                userId: ctx.dbUser.telegramId,
                // @ts-ignore
                userName: ctx.dbUser.username || ctx.dbUser.firstName || 'Anonymous User',
                requestType: formData.type || 'delivery', // from formData
                pickupLocation: formData.pickupLocation || null,
                dropoffLocation: formData.dropoffLocation || null,
                requestDetails: {
                    item: formData.item || 'Unspecified item',
                    size: formData.size || 'Not specified', // Assuming size might be parsed
                    notes: formData.additionalNotes || 'No additional notes',
                    // estimatedPrice and minPrice might come from earlier steps or be set later
                },
                status: 'pending',
                acceptedBy: null,
                requesterOtp: null,
                courierOtp: null,
                minPrice: formData.minPrice || null, // Example: if you ask for minPrice
                estimatedPrice: formData.estimatedPrice || null,
            };

            try {
                const createdListing = await ListingService.createListing(newListingData);
                // Store the DB ID or listingId in session if needed for immediate follow-up actions,
                // but generally, we should rely on fetching from DB.
                // For now, we'll clear session.currentRequest as it's no longer the single source of truth.
                ctx.session.currentRequest = null; // Or map createdListing to BotRequest type if needed for session
                ctx.session.conversationState = 'idle';
                ctx.session.formData = {}; // Clear form data

                await ctx.reply(`✅ Your delivery request has been created! (ID: ${createdListing.listingId})

📦 Item: ${createdListing.requestDetails.item}
📍 Pickup: ${createdListing.pickupLocation?.address || (createdListing.pickupLocation ? 'Shared location' : 'Not specified')}
🏁 Dropoff: ${createdListing.dropoffLocation?.address || (createdListing.dropoffLocation ? 'Shared location' : 'Not specified')}
💲 Est. Price: ${createdListing.estimatedPrice || (createdListing.requestDetails as any).estimatedPrice || 'N/A'}

Use /status to check your request status. We'll notify you when someone accepts it!`, Markup.keyboard([
                    ['/status', '/newrequest'],
                    ['/available']
                ]).resize());
            } catch (error) {
                console.error('Failed to save new listing to DB:', error);
                await ctx.reply('Sorry, there was an error creating your request. Please try again.');
                // Optionally, keep form data in session for retry:
                // ctx.session.conversationState = 'filling_form'; // Or a specific error state
            }
            break;

        default:
            await ctx.reply("I'm not sure what information you're providing. Please use one of the commands like /newrequest to get started.");
    }
}

// Helper functions
function formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
        'pending': '⏳ Pending',
        'accepted': '✅ Accepted',
        'in_progress': '🚚 In Progress',
        'completed': '🎉 Completed',
        'canceled': '❌ Canceled'
    };

    return statusMap[status] || status;
}

function calculateDistance(point1: { latitude: number, longitude: number }, point2: { latitude: number, longitude: number }): number {
    // Simple distance calculation (not accurate for real world use)
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function calculatePrice(distance: number): number {
    // Simple price calculation
    const baseFee = 3.00;
    const perKmRate = 1.20;
    return baseFee + (distance * perKmRate);
}