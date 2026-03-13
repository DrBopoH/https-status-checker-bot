<div align="right">
	<samp>
		<b style="font-size: 14px; color: #c8c2b8;">EN</b> | 
		<a href="README_UA.md" style="text-decoration: none;"><b style="font-size: 13px; color: #6b7a73;">UA</b></a> | 
		<a href="README_RU.md" style="text-decoration: none;"><b style="font-size: 13px; color: #6b7a73;">RU</b></a>
	</samp>
</div>

<div align="center">
	<h1><samp>[ <span style="color: #00987a;">UNIT_IDENTIFICATION: UPTIME-WORKER</span> ]</samp></h1>
	<p><samp><b style="color: #c8c2b8;">SYS_MONITOR</b> // Smart, zero-cost server monitoring and alert system.</samp></p>
</div>

<table width="100%" border="0" cellpadding="0" cellspacing="0">
	<tr>
		<td width="50%" valign="top">
			<h3><samp style="color: #c8c2b8;">[ CORE_ENGINE ]</samp></h3>
			<div style="border-left: 2px solid #00987a; padding-left: 15px; background: #0f1714; padding-top: 10px; padding-bottom: 10px; border-radius: 0 4px 4px 0;">
				<img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
				<img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=white" alt="JavaScript" />
			</div>
		</td>
		<td width="50%" valign="top">
			<h3><samp style="color: #c8c2b8;">[ COM_CHANNELS ]</samp></h3>
			<div style="border-left: 1px solid #2e3650; padding-left: 15px; padding-top: 10px; padding-bottom: 10px; border-radius: 0 4px 4px 0;">
				<samp style="font-size: 13px; color: #c8c2b8;">
					<img src="https://img.shields.io/badge/Telegram-Bot-2CA5E0?style=flat-square&logo=telegram&logoColor=white" alt="Telegram" />
					<img src="https://img.shields.io/badge/Discord-Webhook-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord" />
				</samp>
			</div>
		</td>
	</tr>
</table>

<br>

<div align="left">
    <h2><samp style="color: #00987a;">> system_features...</samp></h2>
</div>
<ul style="color: #c8c2b8;">
    <li><samp><b style="color: #00987a;">[ZERO_COST]:</b> Runs entirely on Cloudflare's free tier (handles up to 100,000 background checks per day).</samp></li>
    <li><samp><b style="color: #00987a;">[MULTI_TARGET]:</b> Simultaneously monitors an array of target URLs in parallel, ensuring high-speed concurrent checks.</samp></li>
    <li><samp><b style="color: #00987a;">[SMART_MEMORY]:</b> Utilizes Cloudflare KV to track 3 states (UP, DOWN, DEGRADED). Prevents alert spam by notifying only on state transitions (e.g., total crash, latency spikes, or recovery).</samp></li>
    <li><samp><b style="color: #00987a;">[CRON_REPORTS]:</b> Configurable daemon interval (e.g., 8 hours) to silently broadcast an "All Systems Go" routine check.</samp></li>
    <li><samp><b style="color: #00987a;">[MULTI_THREAD]:</b> Simultaneously dispatches payloads to Discord webhooks and multiple Telegram chat IDs.</samp></li>
</ul>
<br>

<div align="left">
	<h2><samp style="color: #f66e16;">> pre_flight_checks...</samp></h2>
</div>
<ul style="color: #c8c2b8;">
	<li><samp><b>Telegram_API:</b> Fetch a Bot Token via `@BotFather` and extract your target Chat ID (e.g., via `@getmyid_bot`).</samp></li>
	<li><samp><b>Discord_API:</b> Generate a Webhook URL directly from your target server's channel integration settings.</samp></li>
	<li><samp><b>Cloudflare:</b> Verify access to your root dashboard at `dash.cloudflare.com`.</samp></li>
</ul>

<br>

<div align="left">
	<h2><samp style="color: #98d609;">> init_deployment...</samp></h2>
</div>

<table width="100%" style="text-align: left; border-collapse: collapse; background-color: #0f1714; color: #c8c2b8;">
	<tr style="border-bottom: 2px solid #2e3650;">
		<th style="padding: 10px; width: 20%;"><samp>Phase</samp></th>
		<th style="padding: 10px;"><samp>Execution Action</samp></th>
	</tr>
	<tr style="border-bottom: 1px solid #2e3650;">
		<td style="padding: 10px; vertical-align: top;"><samp><b style="color: #98d609;">01. WORKER</b></samp></td>
		<td style="padding: 10px;"><samp>In CF Dashboard: <b>Workers & Pages</b> ➜ <b>Create application</b> ➜ <b>Create Worker</b>. Initialize via `Hello World` preset, define unit name (<i>uptime-bot</i>), and Execute Deploy.</samp></td>
	</tr>
	<tr style="border-bottom: 1px solid #2e3650;">
		<td style="padding: 10px; vertical-align: top;"><samp><b style="color: #98d609;">02. MEMORY_KV</b></samp></td>
		<td style="padding: 10px;"><samp>Navigate to <b>Storage & databases</b> ➜ <b>KV</b>. Create a new namespace and assign it the exact identifier: <b style="color: #f66e16;">UPTIME_KV</b>.</samp></td>
	</tr>
	<tr style="border-bottom: 1px solid #2e3650;">
		<td style="padding: 10px; vertical-align: top;"><samp><b style="color: #98d609;">03. BINDINGS</b></samp></td>
		<td style="padding: 10px;"><samp>Access Worker <b>Settings</b> ➜ <b>Bindings</b> ➜ <b>Add</b> ➜ <b>KV Namespace</b>. Set variable string to <b style="color: #f66e16;">UPTIME_KV</b> and link the previously generated database instance.</samp></td>
	</tr>
	<tr style="border-bottom: 1px solid #2e3650;">
		<td style="padding: 10px; vertical-align: top;"><samp><b style="color: #98d609;">04. INJECT_CODE</b></samp></td>
		<td style="padding: 10px;"><samp>Trigger <b>Edit code</b> protocol (top right). Purge default template. Inject <code>src/worker.js</code>. Populate top-level variables (Tokens, IDs). Execute Deploy.</samp></td>
	</tr>
	<tr>
		<td style="padding: 10px; vertical-align: top;"><samp><b style="color: #98d609;">05. CRON_DAEMON</b></samp></td>
		<td style="padding: 10px;"><samp>Access Worker <b>Settings</b> ➜ <b>Triggers</b> ➜ <b>Cron Triggers</b>. Define loop interval (e.g., <code>*/5 * * * *</code> for a 5-minute scan cycle) and commit changes.</samp></td>
	</tr>
</table>

<br>

<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0f1714; border: 1px solid #2e3650; border-radius: 6px;">
	<tr>
		<td style="padding: 20px;">
			<samp>
				<span style="color: #6b7a73;">> Running initial background diagnostics...</span><br>
				<span style="color: #00987a;">[SYSTEM] Deployment complete. Cron daemon active.</span><br>
				<span style="color: #00987a;">[SYSTEM] Standby for initial startup report payload</span>
				<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=800&size=14&pause=500&color=00987a&width=20&height=15&vCenter=true&lines=_;%20" alt="cursor" style="vertical-align: middle;">
			</samp>
		</td>
	</tr>
</table>