# Telegram Stars Payment Integration

## Overview

This document explains how to set up and use the Telegram Stars payment integration for the VPN service. Telegram Stars is Telegram's virtual currency that users can purchase and use to pay for digital goods and services within Telegram.

## Prerequisites

1. A Telegram bot with payments enabled
2. A Telegram account with access to the BotFather
3. A webhook URL that can receive HTTPS requests from Telegram

## Setup Instructions

### 1. Enable Payments for Your Bot

1. Open Telegram and go to [@BotFather](https://t.me/BotFather)
2. Select your bot or create a new one
3. Send the command `/mybots` and select your bot
4. Go to "Bot Settings" → "Payments"
5. Turn on payments
6. Follow the instructions to set up your payment provider

### 2. Configure Environment Variables

Add the following environment variables to your application:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/stars-payment
```

### 3. Configure Webhook

The application automatically sets up the webhook when it starts, but you can also manually set it using the Telegram Bot API:

```bash
curl -F "url=https://your-domain.com/webhook/stars-payment" \
     https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook
```

## How It Works

### 1. User Initiates Payment

When a user clicks the "Top Up" button in the shop, they are presented with options to purchase different amounts of Telegram Stars:

- 500 Stars
- 1000 Stars
- 2500 Stars

### 2. Payment Request Creation

When the user selects an amount, the frontend makes a request to the backend API:

```
POST /api/v1/users/initiate-stars-payment
Authorization: X-Telegram-Init-Data header
Content-Type: application/json

{
  "amount": 500
}
```

### 3. Invoice Generation

The backend creates an invoice using Telegram's `createInvoiceLink` API endpoint:

```go
request := TelegramInvoiceRequest{
    ChatID:      chatID,
    Title:       "VPN Service Balance Top-up",
    Description: "Top-up your VPN service balance with 500 Telegram Stars",
    Payload:     "unique_payment_identifier",
    Currency:    "XTR", // XTR is the currency code for Telegram Stars
    Prices: []Price{
        {
            Label:  "VPN Service Balance",
            Amount: 500,
        },
    },
}
```

### 4. User Completes Payment

The backend returns an invoice link to the frontend, which opens in Telegram for the user to complete the payment.

### 5. Payment Confirmation

When the user completes the payment, Telegram sends a webhook to the application:

```
POST /webhook/stars-payment
Content-Type: application/json

{
  "update_id": 123456789,
  "successful_payment": {
    "currency": "XTR",
    "total_amount": 500,
    "invoice_payload": "unique_payment_identifier"
  }
}
```

### 6. Balance Update

The application processes the webhook, verifies the payment, and updates the user's balance in the database.

## API Endpoints

### Initiate Payment

```
POST /api/v1/users/initiate-stars-payment
```

**Request Body:**
```json
{
  "amount": 500
}
```

**Response:**
```json
{
  "invoice_link": "https://t.me/$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "payment_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### Webhook Endpoint

```
POST /webhook/stars-payment
```

This endpoint receives payment confirmations from Telegram.

## Security Considerations

1. **Webhook Verification**: All webhooks from Telegram are verified using the bot token
2. **Payload Validation**: Payment payloads are validated to prevent tampering
3. **Amount Validation**: Only valid amounts (1-2500 Stars) are accepted
4. **Idempotency**: Duplicate payments are prevented using unique payment identifiers

## Testing

### Test Payments

Telegram provides a test environment for payments. To use it:

1. Create a test invoice with amount 100 (this will simulate a payment)
2. Use the test payment provider token provided by BotFather

### Manual Testing

1. Start the application
2. Open the Telegram Mini App
3. Navigate to the Shop page
4. Click the "Top Up" button
5. Select an amount
6. Complete the payment flow in Telegram
7. Verify that the user's balance is updated

## Troubleshooting

### Common Issues

1. **Webhook Not Received**: 
   - Check that your webhook URL is accessible from the internet
   - Verify that your SSL certificate is valid
   - Check the Telegram Bot API for webhook errors

2. **Payment Not Processed**:
   - Check the application logs for errors
   - Verify that the payment payload matches a pending payment
   - Ensure the database is accessible

3. **Invoice Link Not Generated**:
   - Check that the bot token is correct
   - Verify that payments are enabled for your bot
   - Ensure the Telegram API is accessible

### Logging

The application logs all payment-related activities, including:

- Payment initiation
- Invoice creation
- Webhook receipt
- Payment processing
- Balance updates
- Errors

Check the logs for troubleshooting information.

## Future Enhancements

1. **Refund Support**: Implement functionality to process refunds
2. **Payment History**: Add a payment history page for users
3. **Analytics Dashboard**: Create an admin dashboard to view payment statistics
4. **Custom Amounts**: Allow users to enter custom payment amounts
5. **Multiple Currencies**: Support other payment methods in addition to Telegram Stars

## Conclusion

The Telegram Stars payment integration provides a seamless way for users to purchase VPN service credits directly within Telegram. By following the setup instructions and understanding how the integration works, you can easily enable this feature for your users.