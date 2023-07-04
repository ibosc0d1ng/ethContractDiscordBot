require('dotenv').config();
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder, Embed } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

client.on('ready', () => {
    console.log('Bot is ready');
});

client.on('messageCreate', async (message) => {
    const tokenAddress = message.content;

    if (!tokenAddress || tokenAddress.length !== 42 || !tokenAddress.startsWith('0x')) {
        return;
    }

        try {
            const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
            
            if (!response.data || !response.data.pairs || !response.data.pairs[0]) {
                message.reply({
                    content: 'No data received from the API.',
                });
                return;
            }

            function formatNumber(num) {
                if (num >= 1e6) {
                    let formattedNum = (num / 1e6).toFixed(2);
                    return formattedNum.endsWith('0') ? formattedNum.slice(0, -1) + 'M' : formattedNum + 'M';
                } else {
                    return Math.round(num).toLocaleString('en-US'); // Use Math.round to round to the nearest whole number
                }
            }
        

            const pair = response.data.pairs[0];
            const pairAddress = pair.pairAddress;
            const baseToken = pair.baseToken || {};
            const txns = pair.txns.h1 || {};
            const honeypotResponse = await axios.get(`https://api.honeypot.is/v2/IsHoneypot?address=${tokenAddress}&pair=${pairAddress}`);
            const honeypotData = honeypotResponse.data;

            const embedMessage = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Token: ${baseToken.symbol || 'Not available'}`)
            .setURL(pair.url || 'Not available')
            .setDescription(`Token details for ${baseToken.symbol || 'Not available'}`)
            .addFields(
                { name: '🌐 Network', value: `${pair.chainId} @ ${pair.dexId} ${pair.labels}` },
                { name: '🎫 Ticker', value: baseToken.symbol || 'Not available' },
                { name: '💎 MarketCap', value: `$${pair.fdv ? Math.trunc(pair.fdv).toLocaleString('en-US') : 'Undefined'}` },
                { name: '🪙 Liquidity (USD)', value: pair.liquidity.usd ? `$${Math.trunc(pair.liquidity.usd).toLocaleString('en-US')}` : 'Not available' },
                { name: '💰 Price', value: `$${pair.priceUsd || 'Not available'}` },
                { name: ' Buys /  Sells (last hour)', value: `🟢 Buys: ${txns.buys || '0'}\n🔴 Sells: ${txns.sells || '0'}` },
                { 
                    name: '🎫 Taxes', 
                    value: `${honeypotData.simulationResult.buyTax != null ? Math.round(honeypotData.simulationResult.buyTax) + '%' : 'Not available'} | ${honeypotData.simulationResult.sellTax != null ? Math.round(honeypotData.simulationResult.sellTax) + '%' : 'Not available'}`
                },
                
                
                { name: '📊 Volume (last 24 hours)', value: `$${pair.volume.h24 ? formatNumber(pair.volume.h24) : 'Not available'}` },
                { name: `${pair.priceChange.h24 > 0 ? "🚀" : "📉"} Price Change (last 24 hours)`, value: `${pair.priceChange.h24 || 'Not available'}%` },
                { name: '🧪 Simulation Success', value: honeypotData.simulationSuccess ? "Yes" : "No" },
                { name: '🍯 Is Honeypot?', value: honeypotData.honeypotResult.isHoneypot ? "Yes" : "No" },
                { name: 'Honeypot Reason', value: honeypotData.honeypotResult.honeypotReason || "Yay! It's not a honeypot!" },
                { 
                    name: 'Useful Links', 
                    value: `[DEX](${pair.url}) | [APE](https://t.me/MaestroSniperBot?start=${pair.baseToken.address}) | [PRO](https://t.me/MaestroProBot?start=${pair.baseToken.address}) | [CA](https://etherscan.io/address/${pair.baseToken.address}) | [TWT](https://twitter.com/search?q=${pair.baseToken.address}) | [UNI](https://app.uniswap.org/#/swap?outputCurrency=${pair.baseToken.address}&inputCurrency=ETH) ` 
                }

            )
            .setTimestamp();

        message.reply({ embeds: [embedMessage] });

        } catch (error) {
            console.error(`Failed to fetch token data: ${error}`);
            if (error.response) {
                console.error(`Response data:`, error.response.data);
                console.error(`Response status:`, error.response.status);
            }
            message.reply({
                content: 'Failed to fetch token data. Please ensure the token address is correct.',
            });
        }
    });

client.login(process.env.CLIENT_TOKEN); // Login bot using token
