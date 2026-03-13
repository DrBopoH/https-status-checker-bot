const TARGET_URLS = [
	"https://archlinux.org",
	"https://example.com"
]; 
const MAX_PING_MS = 1000;
const ALIVE_INTERVAL_HOURS = 8;

const DISCORD_WEBHOOK = ""; 
const TG_BOT_TOKEN = ""; 
const TG_CHAT_UIDS = [];

export default {
	async scheduled(event, env, ctx) {
		const checkPromises = TARGET_URLS.map(async (url) => {
			const startTime = Date.now();
			let currentStatus = "UP";
			let latency = 0;
			let statusText = "OK";

			try {
				const response = await fetch(url, { 
					method: 'GET',
					headers: { 'User-Agent': 'UptimeBot-CF-Worker/2.0' }
				});
				latency = Date.now() - startTime;
				
				if (!response.ok) {
					currentStatus = "DOWN";
					statusText = `HTTP error: ${response.status}`;
				} else if (latency > MAX_PING_MS) {
					currentStatus = "DEGRADED";
					statusText = `High ping (>${MAX_PING_MS}ms)`;
				}
			} catch (error) {
				currentStatus = "DOWN";
				latency = Date.now() - startTime;
				statusText = "Connection Error";
			}

			const statusKey = `STATUS_${url}`;
			const timeKey = `TIME_${url}`;
			
			const lastStatus = await env.UPTIME_KV.get(statusKey) || "UP";
			const lastAliveTimeStr = await env.UPTIME_KV.get(timeKey);
			const lastAliveTime = lastAliveTimeStr ? parseInt(lastAliveTimeStr, 10) : 0;
			
			let messageToSend = null;

			if (currentStatus === "DOWN" && lastStatus !== "DOWN") {
				messageToSend = `⚠️ **WARNING!** Service is **DOWN**\n\n**URL:** ${url}\n**Reason:** ${statusText}\n**Ping:** ${latency}ms`;
				await env.UPTIME_KV.put(statusKey, "DOWN");
			} 
			
			else if (currentStatus === "DEGRADED" && lastStatus !== "DEGRADED") {
				messageToSend = `📈 **NOTICE!** Network instability detected\n\n**URL:** ${url}\n**Status:** Service is accessible but responding slowly.\n**Ping:** ${latency}ms`;
				await env.UPTIME_KV.put(statusKey, "DEGRADED");
				await env.UPTIME_KV.put(timeKey, Date.now().toString()); 
			}
			
			else if (currentStatus === "UP" && lastStatus === "DOWN") {
				messageToSend = `♻️ **RESTORED!** Service is **ONLINE**\n\n**URL:** ${url}\n**Ping:** ${latency}ms`;
				await env.UPTIME_KV.put(statusKey, "UP");
				await env.UPTIME_KV.put(timeKey, Date.now().toString());
			} 
			
			else if (currentStatus === "UP" && lastStatus === "DEGRADED") {
				messageToSend = `📉 **RECOVERED!** Network latency stabilized\n\n**URL:** ${url}\n**Ping:** ${latency}ms`;
				await env.UPTIME_KV.put(statusKey, "UP");
				await env.UPTIME_KV.put(timeKey, Date.now().toString());
			}

			else if (currentStatus === "UP" && lastStatus === "UP") {
				const timePassed = Date.now() - lastAliveTime;
				const hoursInMs = ALIVE_INTERVAL_HOURS * 60 * 60 * 1000;
				
				if (timePassed >= hoursInMs) {
					messageToSend = `🕗 Scheduled verifying: Service **STABLE**\n\n**URL:** ${url}\n**Ping:** ${latency}ms\n*(Next Scheduled verifying after ${ALIVE_INTERVAL_HOURS} hours)*`;
					await env.UPTIME_KV.put(statusKey, "UP");
					await env.UPTIME_KV.put(timeKey, Date.now().toString());
				}
			}

			if (messageToSend) {
				const notifyTasks = [];
				if (DISCORD_WEBHOOK) {
					notifyTasks.push(sendDiscord(DISCORD_WEBHOOK, messageToSend));
				}
				if (TG_BOT_TOKEN && TG_CHAT_UIDS.length > 0) {
					for (const chatId of TG_CHAT_UIDS) {
						notifyTasks.push(sendTelegram(TG_BOT_TOKEN, chatId, messageToSend));
					}
				}
				await Promise.all(notifyTasks);
			}
		});

		await Promise.all(checkPromises);
	}
};

async function sendDiscord(webhookUrl, text) {
	await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content: text })
	});
}

async function sendTelegram(token, chatId, text) {
	const url = `https://api.telegram.org/bot${token}/sendMessage`;
	await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: chatId,
			text: text,
			parse_mode: "Markdown"
		})
	});
}