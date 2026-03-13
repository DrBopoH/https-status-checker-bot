export default {
	async scheduled(event, env, ctx) {
		await runDiagnostics(env, true);
	},

	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === '/api/status') {
			const results = await runDiagnostics(env, false);
			return new Response(JSON.stringify(results), {
				headers: { 
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}

		return new Response(htmlTemplate, {
			headers: { 'Content-Type': 'text/html;charset=UTF-8' }
		});
	}
};

async function runDiagnostics(env, isCronMode) {
	const maxPingMs = env.MAX_PING_MS ? parseInt(env.MAX_PING_MS, 10) : 1000;
	const aliveIntervalHours = env.ALIVE_INTERVAL_HOURS ? parseInt(env.ALIVE_INTERVAL_HOURS, 10) : 8;

	let serviceData = {};
	try {
		if (env.SERVICE_X_DATA) {
			serviceData = typeof env.SERVICE_X_DATA === 'string' 
				? JSON.parse(env.SERVICE_X_DATA) 
				: env.SERVICE_X_DATA;
		}
	} catch (e) {
		console.error("Error parsing SERVICE_X_DATA:", e);
	}

	const targetUrls = serviceData.TARGET_URLS 
		? serviceData.TARGET_URLS.split(',').map(url => url.trim()) 
		: [];

	const discordWebhook = serviceData.DISCORD_WEBHOOK || ""; 
	const tgBotToken = serviceData.TG_BOT_TOKEN || ""; 
	const tgChatUids = serviceData.TG_CHAT_UIDS 
		? serviceData.TG_CHAT_UIDS.split(',').map(id => id.trim()) 
		: [];

	const results = [];
	const checkPromises = targetUrls.map(async (url) => {
		const startTime = Date.now();
		let currentStatus = "DOWN";
		let latency = 0;
		let statusText = "BAD";

		try {
			const response = await fetch(url, { 
				method: 'GET',
				headers: { 'User-Agent': 'UptimeBot-CF-Worker/2.0' }
			});
			latency = Date.now() - startTime;
			
			if (!response.ok && response.status !== 404) {
				currentStatus = "DOWN";
				statusText = `HTTP error: ${response.status}`;
			} else if (latency > maxPingMs) {
				currentStatus = "DEGRADED";
				statusText = `High ping (>${maxPingMs}ms)`;
			} else {
				currentStatus = "UP";
				statusText = "OK";
			}
		} catch (error) {
			currentStatus = "DOWN";
			latency = Date.now() - startTime;
			statusText = "Connection Error";
		}

		results.push({ url, status: currentStatus, latency, text: statusText });

		if (isCronMode) {
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
				const hoursInMs = aliveIntervalHours * 60 * 60 * 1000;
				
				if (timePassed >= hoursInMs) {
					messageToSend = `🕗 Scheduled verifying: Service **STABLE**\n\n**URL:** ${url}\n**Ping:** ${latency}ms\n*(Next Scheduled verifying after ${aliveIntervalHours} hours)*`;
					await env.UPTIME_KV.put(statusKey, "UP");
					await env.UPTIME_KV.put(timeKey, Date.now().toString());
				}
			}

			if (messageToSend) {
				const notifyTasks = [];
				if (discordWebhook) notifyTasks.push(sendDiscord(discordWebhook, messageToSend));
				
				if (tgBotToken && tgChatUids.length > 0) {
					for (const chatStr of tgChatUids) {
						const [chatId, threadId] = chatStr.split(':');
						notifyTasks.push(sendTelegram(tgBotToken, chatId, messageToSend, threadId));
					}
				}
				await Promise.all(notifyTasks);
			}
		}
	});

	await Promise.all(checkPromises);
	return results;
}

async function sendDiscord(webhookUrl, text) {
	await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content: text })
	});
}

async function sendTelegram(token, chatId, text, threadId = null) {
	const url = `https://api.telegram.org/bot${token}/sendMessage`;
	
	const payload = { 
		chat_id: chatId, 
		text: text, 
		parse_mode: "Markdown" 
	};

	if (threadId) {
		payload.message_thread_id = parseInt(threadId, 10);
	}

	await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload)
	});
}

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>System Status</title>
	<style>
		:root {
			--bg-color: #09090b;
			--card-bg: #121214;
			--border-color: #27272a;
			--text-main: #fafafa;
			--text-muted: #a1a1aa;
			--accent-green: #84cc16; /* Leaves Logo Color */
			--up-color: #0ea5e9;
			--down-color: #ef4444;
			--degraded-color: #eab308;
		}
		body {
			background-color: var(--bg-color);
			color: var(--text-main);
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
			margin: 0;
			padding: 20px;
		}
		.header {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 30px;
		}
		.logo {
			color: var(--accent-green);
			font-size: 32px;
		}
		h1 {
			font-size: 28px;
			font-weight: 600;
			margin: 0;
			letter-spacing: -0.5px;
		}
		.subtitle {
			color: var(--text-muted);
			margin-bottom: 40px;
			font-size: 15px;
		}
		.card {
			background-color: var(--card-bg);
			border: 1px solid var(--border-color);
			border-radius: 16px;
			width: 100%;
			max-width: 500px;
			padding: 30px;
			box-shadow: 0 4px 24px rgba(0,0,0,0.4);
		}
		.title-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20px;
			padding-bottom: 20px;
			border-bottom: 1px solid var(--border-color);
		}
		.title-row h2 {
			font-size: 18px;
			margin: 0;
			font-weight: 500;
		}
		.refresh-btn {
			background: none;
			border: none;
			color: var(--text-muted);
			cursor: pointer;
			font-size: 14px;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: color 0.2s;
		}
		.refresh-btn:hover { color: var(--text-main); }
		.server-list {
			display: flex;
			flex-direction: column;
			gap: 16px;
		}
		.server-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 16px;
			background-color: rgba(255,255,255,0.02);
			border: 1px solid var(--border-color);
			border-radius: 10px;
		}
		.server-info {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.server-url {
			font-weight: 500;
			font-size: 15px;
			word-break: break-all;
		}
		.server-ping {
			font-size: 13px;
			color: var(--text-muted);
			font-family: monospace;
		}
		.status-badge {
			padding: 6px 12px;
			border-radius: 20px;
			font-size: 12px;
			font-weight: 600;
			letter-spacing: 0.5px;
		}

		.status-up { 
			background-color: rgba(14, 165, 233, 0.1);
			color: var(--up-color); 
			border: 1px solid rgba(14, 165, 233, 0.2);
		}
		.status-degraded { 
			background-color: rgba(234, 179, 8, 0.1); 
			color: var(--degraded-color); 
			border: 1px solid rgba(234, 179, 8, 0.2); 
		}
		.status-down { 
			background-color: rgba(239, 68, 68, 0.1); 
			color: var(--down-color); 
			border: 1px solid rgba(239, 68, 68, 0.2); 
		}
		
		.loading {
			text-align: center;
			color: var(--text-muted);
			padding: 20px 0;
			font-size: 14px;
			animation: pulse 1.5s infinite;
		}
		@keyframes pulse {
			0% { opacity: 0.5; }
			50% { opacity: 1; }
			100% { opacity: 0.5; }
		}
	</style>
</head>
<body>

	<div class="header">
		<div class="logo">💎</div>
		<h1>TONG Industries Servers status</h1>
	</div>
	<div class="subtitle">Real-time server network diagnostics.</div>

	<div class="card">
		<div class="title-row">
			<h2>Live Targets</h2>
			<button class="refresh-btn" onclick="fetchStatus()" id="refreshBtn">
				<span>↻</span> Refresh
			</button>
		</div>
		<div class="server-list" id="serverList">
			<div class="loading">Pinging servers...</div>
		</div>
	</div>

	<script>
		async function fetchStatus() {
			const list = document.getElementById('serverList');
			const btn = document.getElementById('refreshBtn');
			
			list.innerHTML = '<div class="loading">Pinging servers...</div>';
			btn.style.opacity = '0.5';
			btn.disabled = true;

			try {
				const response = await fetch('/api/status');
				const data = await response.json();
				
				list.innerHTML = '';
				
				data.forEach(server => {
					let badgeClass = 'status-up';
					let badgeText = 'ONLINE';
					
					if (server.status === 'DOWN') {
						badgeClass = 'status-down';
						badgeText = 'DOWN';
					} else if (server.status === 'DEGRADED') {
						badgeClass = 'status-degraded';
						badgeText = 'DEGRADED';
					}

					const item = document.createElement('div');
					item.className = 'server-item';
					item.innerHTML = \`
						<div class="server-info">
							<span class="server-url">\${server.url.replace('https://', '')}</span>
							<span class="server-ping">⏱ \${server.latency}ms</span>
						</div>
						<div class="status-badge \${badgeClass}">\${badgeText}</div>
					\`;
					list.appendChild(item);
				});
			} catch (error) {
				list.innerHTML = '<div class="loading" style="color: #ef4444;">Connection failed.</div>';
			} finally {
				btn.style.opacity = '1';
				btn.disabled = false;
			}
		}

		fetchStatus();
	</script>
</body>
</html>
`;