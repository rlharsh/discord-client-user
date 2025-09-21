// Load environment variables from .env file
require("dotenv").config();

// Require the necessary discord.js classes for a serverless environment
const { Client, GatewayIntentBits } = require("discord.js");

// The main handler for the Netlify Function
exports.handler = async (event, context) => {
	// Get the bot token from the environment variables
	const token = process.env.DISCORD_BOT_TOKEN;

	// Create a new client instance
	const client = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
	});

	// Login to Discord for this specific invocation
	// This is the key change to make the function work on Netlify
	await client.login(token);

	// Check for the correct HTTP method and path
	if (
		event.httpMethod !== "GET" ||
		!event.path.startsWith("/.netlify/functions/avatar/")
	) {
		return {
			statusCode: 405,
			body: JSON.stringify({ error: "Method Not Allowed" }),
		};
	}

	// Extract the user ID from the path
	const userId = event.path.split("/").pop();

	// Validate the user ID format
	if (!userId || !/^\d+$/.test(userId)) {
		return {
			statusCode: 400,
			body: JSON.stringify({ error: "Invalid user ID provided." }),
		};
	}

	try {
		// Fetch the user from Discord's API using the provided ID
		const user = await client.users.fetch(userId);

		// Get the avatar URL. The `displayAvatarURL` method is a great choice
		// because it returns a default avatar if the user has no custom one.
		const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

		// Respond with JSON data
		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*", // Allows requests from any domain
			},
			body: JSON.stringify({
				id: user.id,
				username: user.username,
				avatarURL: avatarURL,
				discriminator: user.discriminator,
				body: user,
			}),
		};
	} catch (error) {
		// Log the error for debugging purposes
		console.error(`Failed to fetch user with ID ${userId}:`, error);

		// Send a user-friendly error response
		return {
			statusCode: 404,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ error: "Could not find a user with that ID." }),
		};
	} finally {
		// Destroy the client to ensure the function exits cleanly
		client.destroy();
	}
};
