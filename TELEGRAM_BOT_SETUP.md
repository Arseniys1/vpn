# 🤖 Telegram Bot Setup Guide

This guide explains how to properly configure the Telegram bot for the VPN Mini App.

## 📋 Prerequisites

1. A Telegram account
2. A domain with HTTPS access (required for webhooks)
3. The application deployed and running

## 🛠️ Step-by-Step Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Start a chat with BotFather
3. Send `/newbot` command
4. Follow the prompts to:
   - Enter a name for your bot (e.g., "VPN Connect")
   - Enter a username for your bot (must end in "bot", e.g., "vpnconnect_bot")
5. BotFather will provide you with a **Bot Token** - save this securely

### 2. Configure the Bot

1. Send `/mybots` to BotFather
2. Select your bot
3. Click "Edit Bot" → "Edit Commands"
4. Set the following commands:
   ```
   start - Start the VPN application
   help - Show help information
   info - Show information about the service
   ```

### 3. Set up the Mini App

1. In BotFather, select your bot
2. Click "Edit Bot" → "Bot Settings" → "Menu Button"
3. Set the URL to your frontend application:
   ```
   https://yourdomain.com
   ```

### 4. Configure Webhook

For the bot to receive messages, you need to set up a webhook pointing to your application.

The webhook URL should be:
```
https://yourdomain.com/webhook/telegram
```

This is automatically configured when your application starts, but you can also set it manually:

```bash
curl -F "url=https://yourdomain.com/webhook/telegram" https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

## ⚙️ Configuration

### Environment Variables

Set these environment variables in your application:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username  # Without @
FRONTEND_URL=https://yourdomain.com

# Webhook URL (publicly accessible endpoint)
WEBHOOK_URL=https://yourdomain.com/webhook/telegram
```

### config.yaml Configuration

Alternatively, you can configure in `configs/config.yaml`:

```yaml
telegram:
  bot_token: "YOUR_BOT_TOKEN_HERE"
  webhook_url: "https://yourdomain.com/webhook/telegram"
  bot_username: "your_bot_username"  # Without @
  frontend_url: "https://yourdomain.com"
```

## 🧪 Testing

1. Start a chat with your bot
2. Send `/start` command
3. You should receive a message with a button to open the Mini App
4. Click the button to open the application

## 🎯 Features

The Telegram bot now supports:

1. **Menu Button** - Opens the Mini App directly
2. **Command Responses** - Proper responses to `/start`, `/help`, `/info`
3. **Inline Buttons** - Interactive buttons in messages using the `web_app` format
4. **Deep Linking** - Direct access to the Mini App with authentication tokens

## 🔧 Troubleshooting

### Webhook Issues

Check if webhook is properly set:
```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Delete webhook if needed:
```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook
```

### Common Problems

1. **Bot not responding**: Check if webhook URL is publicly accessible
2. **Buttons not working**: Ensure `bot_username` is correctly configured
3. **Authentication issues**: Verify `bot_token` is correct
4. **Mini App not opening**: Make sure your frontend URL is accessible via HTTPS
5. **Button format issues**: Ensure you're using the `web_app` format instead of `url` for Mini App buttons

## 📱 User Experience

Users can now:

1. Open Telegram and search for your bot
2. Send any command (`/start`, `/help`, etc.)
3. Click the "Open VPN App" button to launch the Mini App
4. Use the menu button in the Telegram interface to open the app directly
5. Receive authenticated access when coming from the bot with a token