import 'dotenv/config';
import { Telegraf, session, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { setupGemini } from './gemini.js';
import type { BotContext, Bid as BotBidType, Request as BotRequestType } from './types.js'; // Renamed to avoid conflict
import { initializeDatabase } from './db/index.js';
import { UserService } from './db/users.js';
import { ListingService } from './db/listings.js';
import { BidService } from './db/bids.js';
import {
    startHandler,
    newRequestHandler,
    availableHandler,
    acceptHandler,
    statusHandler,
    locationHandler,
    handleTextMessage
} from './handlers.js';

// Check for required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not defined in the environment variables.');
    process.exit(1);
}

// Initialize the bot
const bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN);

// Setup middleware
bot.use(session({
    // In a production app, you'd use a persistent session store here (e.g., Redis, DB-backed)
    // For now, Telegraf's default in-memory session is fine for development with DB persistence for core data.
}));

bot.use(async (ctx, next) => {
    // Initialize session if it doesn't exist
    if (!ctx.session) {
        ctx.session = {
            conversationState: 'idle',
            formData: {},
            currentRequest: null, // This will be fetched from DB
            availableListings: [], // This will be fetched from DB
            acceptedRequests: [] // This will be fetched from DB
        };
    }

    // Ensure user exists in DB
    if (ctx.from) {
        try {
            let user = await UserService.getUserByTelegramId(ctx.from.id);
            if (!user) {
                user = await UserService.createOrUpdateUser({
                    telegramId: ctx.from.id,
                    username: ctx.from.username,
                    firstName: ctx.from.first_name,
                    lastName: ctx.from.last_name,
                    rating: 0, // Default rating
                    walletBalance: 0 // Default balance
                });
                console.log(`New user created: ${user?.username} (ID: ${user?.telegramId})`);
            } else {
                 // Optionally update user info if it changed
                if (user.username !== ctx.from.username || user.firstName !== ctx.from.first_name || user.lastName !== ctx.from.last_name) {
                    await UserService.createOrUpdateUser({
                        telegramId: ctx.from.id,
                        username: ctx.from.username,
                        firstName: ctx.from.first_name,
                        lastName: ctx.from.last_name,
                    });
                }
            }
            // Attach dbUser to context for easier access in handlers
            // @ts-ignore - extending context dynamically
            ctx.dbUser = user;
        } catch (error) {
            console.error(`Error ensuring user ${ctx.from.id} in DB:`, error);
            // Decide how to handle this - maybe reply to user or just log
        }
    }

    return next();
});

// Command handlers
bot.command('start', startHandler);
bot.command('newrequest', newRequestHandler);
bot.command('available', availableHandler);
bot.command('accept', acceptHandler);
bot.command('status', statusHandler);
bot.command('bids', async (ctx) => {
    // Check if the user has a current request
    const currentRequest = ctx.session.currentRequest;
    if (!currentRequest) {
        return await ctx.reply('You don\'t have any active requests. Use /newrequest to create one.');
    }

    // Get bids for this request
    if (!currentRequest.bids || currentRequest.bids.length === 0) {
        return await ctx.reply('No bids have been placed on your request yet.');
    }

    // Display all bids
    await ctx.reply(`📋 Bids for your request "${currentRequest.requestDetails.item}":`);

    currentRequest.bids.forEach((bid, index) => {
        ctx.reply(`🔹 Bid #${index + 1}:
👤 From: ${bid.userName}
💲 Amount: $${bid.amount}
⏰ Time: ${bid.timestamp.toLocaleString()}
📊 Status: ${bid.status === 'pending' ? '⏳ Pending' : bid.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}`,
            bid.status === 'pending' ? Markup.inlineKeyboard([
                Markup.button.callback(`✅ Accept Bid`, `acceptbid_${currentRequest.id}_${index}`)
            ]) : undefined
        );
    });
});
// Verify command is now only a fallback, as verification is primarily done through buttons
bot.command('verify', async (ctx) => {
  await ctx.reply('To verify a delivery, please use the "Verify Delivery" buttons in your status view instead. You can see your current requests with the /status command.');
});

// Location handler
bot.on(message('location'), locationHandler);

// Text message handler for form filling and conversations
bot.on(message('text'), handleTextMessage);

// Callback query handlers for inline buttons
bot.action(/^location_(.+)$/, async (ctx) => {
    const listingId = ctx.match[1];
    const listing = ctx.session.availableListings.find(listing => listing.id === listingId);

    if (!listing || !listing.location) {
        return await ctx.answerCbQuery('Location information not available');
    }

    // Send the location
    await ctx.replyWithLocation(listing.location.latitude, listing.location.longitude);
    await ctx.answerCbQuery('Location sent!');
});

// Handler for accepting a bid
bot.action(/^acceptbid_(.+)_(\d+)$/, async (ctx) => {
    const listingId = ctx.match[1]; // This is listingId (uuid)
    const bidDbId = parseInt(ctx.match[2]); // This is the bid's database ID

    // @ts-ignore
    const requesterUser = ctx.dbUser; // The user accepting the bid is the requester

    if (!requesterUser || !requesterUser.telegramId) {
        await ctx.answerCbQuery('Error: User not identified. Please /start again.');
        return ctx.reply("Sorry, I couldn't identify you. Please try /start again.");
    }

    try {
        const listing = await ListingService.getListingByListingId(listingId);
        if (!listing) {
            await ctx.answerCbQuery('Request not found.');
            return ctx.reply('This request no longer exists.');
        }

        if (listing.userId !== requesterUser.telegramId) {
            await ctx.answerCbQuery('You can only accept bids for your own requests.');
            return ctx.reply('This is not your request.');
        }

        if (listing.status !== 'pending') {
            await ctx.answerCbQuery(`This request is already ${listing.status}.`);
            return ctx.reply(`This request is no longer pending. Current status: ${listing.status}.`);
        }

        const selectedBid = await BidService.getBidById(bidDbId);
        if (!selectedBid || selectedBid.listingId !== listingId) {
            await ctx.answerCbQuery('Bid not found or does not match this request.');
            return ctx.reply('The selected bid is not valid for this request.');
        }

        if (selectedBid.status !== 'pending') {
            await ctx.answerCbQuery(`This bid is already ${selectedBid.status}.`);
            return ctx.reply(`This bid is no longer pending. Current status: ${selectedBid.status}.`);
        }

        // Generate OTPs
        const requesterOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const courierOtp = Math.floor(1000 + Math.random() * 9000).toString();

        // Update listing
        const updatedListing = await ListingService.updateListing(listingId, {
            status: 'accepted',
            acceptedBy: {
                userId: selectedBid.userId, // Courier's telegramId
                userName: selectedBid.userName, // Courier's username
            },
            requesterOtp: requesterOtp,
            courierOtp: courierOtp,
        });

        if (!updatedListing) {
            throw new Error('Failed to update listing status.');
        }

        // Update selected bid status to 'accepted'
        await BidService.updateBidStatus(selectedBid.id!, 'accepted');
        // Update other bids for this listing to 'rejected'
        await BidService.updateBidsStatusByListingId(listingId, 'rejected', selectedBid.id!);
        
        // Clear currentRequest from session as it's now outdated. Status command will fetch fresh data.
        ctx.session.currentRequest = null;

        await ctx.answerCbQuery('Bid accepted successfully!');

        const listingDetails = updatedListing.requestDetails as any;

        // Confirmation to the REQUESTER (current user)
        await ctx.reply(`✅ You've accepted the bid of $${selectedBid.amount} from ${selectedBid.userName} for "${listingDetails.item}"!
        
🔑 Your OTP for this delivery: ${updatedListing.requesterOtp}

Instructions:
1. The courier (${selectedBid.userName}) will contact you.
2. When you meet, share YOUR OTP (${updatedListing.requesterOtp}) with the courier.
3. Ask the courier for THEIR OTP.
4. The courier will use /verify with your OTP to complete.

Use /status to check your request status.`);

        // Send notification to the COURIER (selectedBid.userId)
        const courierUser = await UserService.getUserByTelegramId(selectedBid.userId);
        if (courierUser && courierUser.telegramId) {
            try {
                await ctx.telegram.sendMessage(courierUser.telegramId,
`🎉 Congratulations! Your bid of $${selectedBid.amount} for "${listingDetails.item}" (ID: ${listing.listingId.substring(0,6)}) has been ACCEPTED by ${requesterUser.username || requesterUser.firstName}!

🔑 Your OTP for this delivery: ${updatedListing.courierOtp}

Requester: ${requesterUser.username || requesterUser.firstName} (Rating: ${requesterUser.rating || 'New'})

Instructions:
1. Please contact the requester (${requesterUser.username || requesterUser.firstName}) to coordinate pickup.
2. When you meet, share YOUR OTP (${updatedListing.courierOtp}) with the requester.
3. Ask the requester for THEIR OTP.
4. Use /verify with the requester's OTP to complete the delivery.

Use /status to check your accepted deliveries.`
                );
            } catch (notifyError) {
                console.error(`Failed to send bid acceptance notification to courier ${selectedBid.userId}:`, notifyError);
                await ctx.reply("ℹ️ Note: I tried to notify the courier, but there might have been an issue. Please try contacting them if you don't hear back.");
            }
        } else {
             console.warn(`Could not find courier user (ID: ${selectedBid.userId}) to notify of bid acceptance.`);
        }

    } catch (error) {
        console.error(`Error in acceptbid_ action for listing ${listingId}, bid ${bidDbId}:`, error);
        await ctx.answerCbQuery('Error accepting bid.');
        await ctx.reply('Sorry, something went wrong while trying to accept the bid. Please try again.');
    }
});

// Handler for the view bids button
bot.action(/^view_bids_(.+)$/, async (ctx) => {
    const listingId = ctx.match[1]; // This is listingId (uuid)
    // @ts-ignore
    const requesterUser = ctx.dbUser;

    if (!requesterUser || !requesterUser.telegramId) {
        await ctx.answerCbQuery('Error: User not identified. Please /start again.');
        return ctx.reply("Sorry, I couldn't identify you. Please try /start again.");
    }

    try {
        const listing = await ListingService.getListingByListingId(listingId);
        if (!listing) {
            await ctx.answerCbQuery('Request not found.');
            return ctx.reply('This request no longer exists.');
        }

        if (listing.userId !== requesterUser.telegramId) {
            await ctx.answerCbQuery('You can only view bids for your own requests.');
            return ctx.reply('This is not your request.');
        }

        const bids = await BidService.getBidsByListingId(listingId);

        if (bids.length === 0) {
            await ctx.answerCbQuery('No bids have been placed on your request yet.');
            return await ctx.reply('No bids have been placed on your request yet.');
        }

        await ctx.answerCbQuery('Showing bids...');
        const listingDetails = listing.requestDetails as any;
        await ctx.reply(`📋 Bids for your request "${listingDetails.item}" (ID: ${listing.listingId.substring(0,6)}):`);

        for (const bid of bids) {
            // Fetch bidder's rating
            const bidderUser = await UserService.getUserByTelegramId(bid.userId);
            const bidderRating = bidderUser ? (bidderUser.rating || 0).toFixed(1) : 'N/A';

            let bidText = `🔹 Bid ID: ${bid.id}
👤 From: ${bid.userName} (Rating: ${bidderRating}⭐)
💲 Amount: $${bid.amount.toFixed(2)}
⏰ Time: ${new Date(bid.timestamp!).toLocaleString()}
📊 Status: ${bid.status}`;

            if (bid.status === 'pending' && listing.status === 'pending') { // Only show accept button if listing is also pending
                await ctx.reply(bidText, Markup.inlineKeyboard([
                    Markup.button.callback(`✅ Accept This Bid (ID: ${bid.id})`, `acceptbid_${listing.listingId}_${bid.id}`)
                ]));
            } else {
                await ctx.reply(bidText);
            }
        }
    } catch (error) {
        console.error(`Error in view_bids_ action for listing ${listingId}:`, error);
        await ctx.answerCbQuery('Error fetching bids.');
        await ctx.reply('Sorry, something went wrong while trying to fetch bids. Please try again.');
    }
});

// Handler for the verify delivery button
bot.action(/^verify_(.+)$/, async (ctx) => {
    const listingId = ctx.match[1]; // This is listingId (uuid)
    // @ts-ignore
    const currentUser = ctx.dbUser;

    if (!currentUser || !currentUser.telegramId) {
        await ctx.answerCbQuery('Error: User not identified. Please /start again.');
        return ctx.reply("Sorry, I couldn't identify you. Please try /start again.");
    }

    try {
        const listing = await ListingService.getListingByListingId(listingId);
        if (!listing || listing.status !== 'accepted') {
            await ctx.answerCbQuery('Request not found or not in accepted state.');
            return ctx.reply('This delivery is not active or cannot be verified at this moment.');
        }

        let isRequester = false;
        if (listing.userId === currentUser.telegramId) {
            isRequester = true;
        } else if (listing.acceptedBy && listing.acceptedBy.userId === currentUser.telegramId) {
            isRequester = false;
        } else {
            await ctx.answerCbQuery('You are not part of this delivery.');
            return ctx.reply('You are not authorized to verify this delivery.');
        }

        // Set the conversation state to verification mode
        ctx.session.conversationState = 'verifying';
        ctx.session.verificationContext = {
            listingId: listing.listingId,
            isRequester: isRequester // True if current user is the one who created the listing
        };

        await ctx.answerCbQuery('Starting verification process...');
        if (isRequester) {
            await ctx.reply(`📱 Requester Verification for "${(listing.requestDetails as any).item}"
            
Please enter the OTP code you received from the COURIER (${listing.acceptedBy?.userName}) to complete the delivery.`);
        } else {
            await ctx.reply(`📱 Courier Verification for "${(listing.requestDetails as any).item}"
            
Please enter the OTP code you received from the REQUESTER (${listing.userName}) to complete the delivery.`);
        }
    } catch (error) {
        console.error(`Error in verify_ action for listing ${listingId}:`, error);
        await ctx.answerCbQuery('Error initiating verification.');
        await ctx.reply('Sorry, something went wrong. Please try again.');
    }
});

// Handler for courier location button
bot.action(/^courier_location_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];

    const acceptedRequest = ctx.session.acceptedRequests.find(r => r.id === requestId);
    if (!acceptedRequest || !acceptedRequest.pickupLocation) {
        return await ctx.answerCbQuery('Location information not available');
    }

    await ctx.answerCbQuery('Showing pickup location');

    // Send the pickup location
    if (acceptedRequest.pickupLocation.latitude && acceptedRequest.pickupLocation.longitude) {
        await ctx.replyWithLocation(
            acceptedRequest.pickupLocation.latitude,
            acceptedRequest.pickupLocation.longitude
        );
    } else if (acceptedRequest.pickupLocation.address) {
        await ctx.reply(`📍 Pickup address: ${acceptedRequest.pickupLocation.address}`);
    } else {
        await ctx.reply('Detailed location information is not available');
    }
});

// Handle the bid button click
bot.action(/^bid_(.+)$/, async (ctx) => {
    const listingId = ctx.match[1]; // This is the string UUID
    // @ts-ignore
    const dbUser = ctx.dbUser;

    if (!dbUser || !dbUser.telegramId) {
        await ctx.answerCbQuery('Error: User not identified. Please /start again.');
        return ctx.reply("Sorry, I couldn't identify you. Please try /start again.");
    }

    try {
        const listing = await ListingService.getListingByListingId(listingId);

        if (!listing || !['pending', 'available'].includes(listing.status)) { // 'available' from old types
            return await ctx.answerCbQuery('Listing not found or no longer available for bidding.');
        }

        if (listing.userId === dbUser.telegramId) {
            return await ctx.answerCbQuery('You cannot bid on your own request.');
        }

        const details = listing.requestDetails as any;
        const minPrice = listing.minPrice || details.minPrice || 0;

        // Ask for bid amount using a custom keyboard
        await ctx.reply(`Enter your bid amount for: "${details.item}" (ID: ${listing.listingId.substring(0,6)})\n\nMinimum bid: $${minPrice}`, {
            reply_markup: { force_reply: true } // This prompts the user to reply to this message
        });

        // Save the current bidding context in the session
        // It's important that handleTextMessage knows which listing this bid is for.
        ctx.session.conversationState = 'bidding'; // Ensure state is set for handleTextMessage
        ctx.session.currentBidding = {
            listingId: listing.listingId, // Use the DB listingId (uuid)
            minPrice
        };

        await ctx.answerCbQuery('Please enter your bid amount in the chat.');
    } catch (error) {
        console.error(`Error in bid_ action for listing ${listingId}:`, error);
        await ctx.answerCbQuery('Error processing bid request.');
        await ctx.reply('Sorry, something went wrong. Please try again.');
    }
});

bot.action(/^accept_(.+)$/, async (ctx) => {
    const listingId = ctx.match[1]; // This is the string UUID for the listing
    // @ts-ignore
    const courierUser = ctx.dbUser; // The user clicking "accept" is the courier

    if (!courierUser || !courierUser.telegramId) {
        await ctx.answerCbQuery('Error: User not identified. Please /start again.');
        return ctx.reply("Sorry, I couldn't identify you. Please try /start again.");
    }

    try {
        const listing = await ListingService.getListingByListingId(listingId);

        if (!listing || !['pending', 'available'].includes(listing.status)) {
             await ctx.answerCbQuery('Request not found or no longer available.');
            return ctx.reply('This request is no longer available or has already been accepted.');
        }

        if (listing.userId === courierUser.telegramId) {
            await ctx.answerCbQuery('You cannot accept your own request.');
            return ctx.reply('You cannot accept your own request.');
        }

        // Generate two different OTPs for requester and courier
        const requesterOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const courierOtp = Math.floor(1000 + Math.random() * 9000).toString();

        const updatedListing = await ListingService.updateListing(listingId, {
            status: 'accepted',
            acceptedBy: {
                userId: courierUser.telegramId,
                userName: courierUser.username || courierUser.firstName || 'Courier',
            },
            requesterOtp: requesterOtp,
            courierOtp: courierOtp,
        });

        if (!updatedListing) {
            await ctx.answerCbQuery('Failed to accept the request. Please try again.');
            return ctx.reply('Sorry, there was an error accepting this request.');
        }
        
        // Clear from session's availableListings if it was there
        if (ctx.session.availableListings) {
            ctx.session.availableListings = ctx.session.availableListings.filter(l => l.id !== listingId);
        }

        await ctx.answerCbQuery('Request accepted successfully!');

        // Confirmation message to the COURIER (current user)
        const listingDetails = updatedListing.requestDetails as any;
        await ctx.reply(`✅ You've accepted the delivery request for "${listingDetails.item}" from ${updatedListing.userName}!
        
👤 Requester: ${updatedListing.userName}
🔑 Your OTP for this delivery: ${updatedListing.courierOtp}

Instructions:
1. Contact the requester to coordinate pickup.
2. When you meet, share YOUR OTP (${updatedListing.courierOtp}) with the requester.
3. Ask the requester for THEIR OTP.
4. Use /verify with the requester's OTP to complete the delivery.

Use /status to check your ongoing deliveries.`);

        // Send notification to the REQUESTER (listing.userId)
        const requesterUser = await UserService.getUserByTelegramId(listing.userId);
        if (requesterUser && requesterUser.telegramId) {
            try {
                await ctx.telegram.sendMessage(requesterUser.telegramId,
`🎉 Good news! Your delivery request for "${listingDetails.item}" (ID: ${listing.listingId.substring(0,6)}) has been accepted by ${courierUser.username || courierUser.firstName || 'a courier'}.

🔑 Your OTP for this delivery: ${updatedListing.requesterOtp}

Courier: ${courierUser.username || courierUser.firstName || 'N/A'} (Rating: ${courierUser.rating || 'New'})

Instructions:
1. The courier will contact you to coordinate.
2. When you meet, share YOUR OTP (${updatedListing.requesterOtp}) with the courier.
3. Ask the courier for THEIR OTP.
4. The courier will use /verify with your OTP to complete.

You can check status with /status command.`
                );
            } catch (notifyError) {
                console.error(`Failed to send notification to requester ${listing.userId}:`, notifyError);
                await ctx.reply("ℹ️ Note: I tried to notify the requester, but there might have been an issue. Please try contacting them if you don't hear back.");
            }
        } else {
            console.warn(`Could not find requester user (ID: ${listing.userId}) to notify.`);
        }

    } catch (error) {
        console.error(`Error in accept_ action for listing ${listingId}:`, error);
        await ctx.answerCbQuery('Error processing accept request.');
        await ctx.reply('Sorry, something went wrong while trying to accept the request. Please try again.');
    }
});

// Initialize Gemini
setupGemini();

// Main function to start the bot
async function startBot() {
    try {
        // Initialize Database
        const dbInitialized = await initializeDatabase();
        if (!dbInitialized) {
            console.error('Halting bot startup due to database initialization failure.');
            process.exit(1);
        }
        console.log('Database connected and initialized.');

        // Start the bot
        await bot.launch();
        console.log('Bot is running!');
    } catch (err) {
        console.error('Failed to start the bot:', err);
        process.exit(1);
    }
}

startBot();

// Enable graceful stop
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    console.log('Bot stopped due to SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    console.log('Bot stopped due to SIGTERM');
    process.exit(0);
});
