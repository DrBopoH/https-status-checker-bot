const TARGET_URLS = []; 
const MAX_PING_MS = 1000;
const ALIVE_INTERVAL_HOURS = 8;

const DISCORD_WEBHOOK = ""; 
const TG_BOT_TOKEN = ""; 
const TG_CHATS_UIDS = [];

export default {
	async scheduled(event, env, ctx) {
		const startTime = Date.now();
		let isDown = false;
		let latency = 0;
		let statusText = "ОК";

		try {
			const responses = await fetch(TARGET_URL, { 
				method: 'GET',
				headers: { 'User-Agent': 'UptimeBot-CF-Worker/2.0' }
			});
			latency = Date.now() - startTime;
			
			if (!response.ok) {
				isDown = true;
				statusText = `Ошибка HTTP: ${response.status}`;
			} else if (latency > MAX_PING_MS) {
				isDown = true;
				statusText = `Высокий пинг (>${MAX_PING_MS}мс)`;
			}
		} catch (error) {
			isDown = true;
			latency = Date.now() - startTime;
			statusText = "Сайт недоступен (Connection Error)";
		}

		const currentStatus = isDown ? "DOWN" : "UP";
		
		const lastStatus = await env.UPTIME_KV.get("LAST_STATUS");
		const lastAliveTimeStr = await env.UPTIME_KV.get("LAST_ALIVE_MSG_TIME");
		const lastAliveTime = lastAliveTimeStr ? parseInt(lastAliveTimeStr, 10) : 0;
		
		let messageToSend = null;

		
		if (currentStatus === "DOWN" && lastStatus !== "DOWN") {
			messageToSend = `🚨 **АЛЕРТ! Сайт УПАЛ** 🚨\n\n🌐 **Сайт:** ${TARGET_URL}\n⚠️ **Причина:** ${statusText}\n⏱ **Пинг:** ${latency}ms`;
			await env.UPTIME_KV.put("LAST_STATUS", "DOWN");
			
		} 
		else if (currentStatus === "UP" && lastStatus === "DOWN") {
			messageToSend = `✅ **САЙТ СНОВА В СЕТИ** ✅\n\n🌐 **Сайт:** ${TARGET_URL}\n⏱ **Пинг:** ${latency}ms`;
			await env.UPTIME_KV.put("LAST_STATUS", "UP");
			await env.UPTIME_KV.put("LAST_ALIVE_MSG_TIME", Date.now().toString());
			
		} 
		else if (currentStatus === "UP" && lastStatus !== "DOWN") {
			const timePassed = Date.now() - lastAliveTime;
			const twoHoursInMs = ALIVE_INTERVAL_HOURS * 60 * 60 * 1000;
			
			if (timePassed >= twoHoursInMs) {
				messageToSend = `ℹ️ **Дежурный отчет: Сайт стабилен**\n\n🌐 **Сайт:** ${TARGET_URL}\n⏱ **Текущий пинг:** ${latency}ms\n*(Следующий отчет через ${ALIVE_INTERVAL_HOURS} ч.)*`;
				await env.UPTIME_KV.put("LAST_STATUS", "UP");
				await env.UPTIME_KV.put("LAST_ALIVE_MSG_TIME", Date.now().toString());
			}
		}

		if (messageToSend) {
			const tasks = [];
			if (DISCORD_WEBHOOK) {
				tasks.push(sendDiscord(DISCORD_WEBHOOK, messageToSend));
			}
			if (TG_BOT_TOKEN && TG_CHATS_UIDS.length > 0) {
				for (const chatId of TG_CHATS_UIDS) {
					tasks.push(sendTelegram(TG_BOT_TOKEN, chatId, messageToSend));
				}
			}
			await Promise.all(tasks);
		}
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