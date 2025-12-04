#!/usr/bin/env python3
"""
Simple WebSocket client to test the WebSocket notification service.
This script can be used to simulate frontend connections and test message delivery.
"""

import asyncio
import websockets
import json
import uuid
import argparse

async def test_websocket(uri, user_id):
    """Connect to WebSocket and listen for messages."""
    try:
        async with websockets.connect(f"{uri}?user_id={user_id}") as websocket:
            print(f"Connected to WebSocket as user {user_id}")
            
            # Listen for messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    print(f"Received message: {json.dumps(data, indent=2)}")
                except json.JSONDecodeError:
                    print(f"Received non-JSON message: {message}")
                    
    except websockets.exceptions.ConnectionClosed:
        print("WebSocket connection closed")
    except Exception as e:
        print(f"Error: {e}")

async def send_test_message_to_rabbitmq(user_id, message_type, message_data):
    """
    This function would publish a test message to RabbitMQ.
    In a real implementation, you would use the RabbitMQ client library to publish to the exchange.
    """
    print(f"Would publish message to RabbitMQ:")
    print(f"  User ID: {user_id}")
    print(f"  Type: {message_type}")
    print(f"  Data: {message_data}")
    print("Implementation would use RabbitMQ client to publish to 'websocket_notifications' queue")

def main():
    parser = argparse.ArgumentParser(description="Test WebSocket notification service")
    parser.add_argument("--uri", default="ws://localhost:8081/ws", help="WebSocket URI")
    parser.add_argument("--user-id", default=str(uuid.uuid4()), help="User ID (default: random)")
    parser.add_argument("--test-publish", action="store_true", help="Test publishing a message")
    
    args = parser.parse_args()
    
    if args.test_publish:
        # Test publishing a message
        send_test_message_to_rabbitmq(
            args.user_id,
            "test",
            {"message": "Hello from test script!", "timestamp": "2023-01-01T00:00:00Z"}
        )
    else:
        # Connect and listen
        print(f"Connecting to {args.uri} as user {args.user_id}")
        asyncio.run(test_websocket(args.uri, args.user_id))

if __name__ == "__main__":
    main()