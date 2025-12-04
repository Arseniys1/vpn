package queue

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	amqp "github.com/rabbitmq/amqp091-go"
)

type Queue struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	exchange string
}

type Task struct {
	Type        string                 `json:"type"`
	UserID      uuid.UUID              `json:"user_id"`
	ServerID    uuid.UUID              `json:"server_id,omitempty"`
	ConnectionID uuid.UUID             `json:"connection_id,omitempty"`
	Data        map[string]interface{} `json:"data,omitempty"`
}

const (
	TaskCreateConnection = "create_connection"
	TaskDeleteConnection = "delete_connection"
	TaskUpdateTraffic    = "update_traffic"
	TaskRefreshConnection = "refresh_connection"
	TaskWebSocketNotification = "websocket_notification"
)

func New(url, exchange string) (*Queue, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	channel, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	// Declare exchange
	err = channel.ExchangeDeclare(
		exchange,
		"topic",
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,
	)
	if err != nil {
		channel.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	// Declare queues
	queues := []string{"tasks", "traffic_updates", "websocket_notifications"}
	for _, queueName := range queues {
		_, err = channel.QueueDeclare(
			queueName,
			true,  // durable
			false, // delete when unused
			false, // exclusive
			false, // no-wait
			nil,
		)
		if err != nil {
			channel.Close()
			conn.Close()
			return nil, fmt.Errorf("failed to declare queue %s: %w", queueName, err)
		}

		// Bind queue to exchange
		routingKey := queueName
		err = channel.QueueBind(
			queueName,
			routingKey,
			exchange,
			false,
			nil,
		)
		if err != nil {
			channel.Close()
			conn.Close()
			return nil, fmt.Errorf("failed to bind queue %s: %w", queueName, err)
		}
	}

	log.Info().Str("exchange", exchange).Msg("RabbitMQ connection established")

	return &Queue{
		conn:    conn,
		channel: channel,
		exchange: exchange,
	}, nil
}

func (q *Queue) PublishTask(task Task) error {
	body, err := json.Marshal(task)
	if err != nil {
		return fmt.Errorf("failed to marshal task: %w", err)
	}

	// Determine routing key based on task type
	routingKey := "tasks"
	if task.Type == TaskWebSocketNotification {
		routingKey = "websocket_notifications"
	}

	err = q.channel.Publish(
		q.exchange,
		routingKey,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to publish task: %w", err)
	}

	log.Debug().
		Str("type", task.Type).
		Str("user_id", task.UserID.String()).
		Msg("Task published")

	return nil
}

func (q *Queue) ConsumeTasks(queueName string, handler func(Task) error) error {
	msgs, err := q.channel.Consume(
		queueName,
		"",    // consumer
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to register consumer: %w", err)
	}

	go func() {
		for msg := range msgs {
			var task Task
			if err := json.Unmarshal(msg.Body, &task); err != nil {
				log.Error().Err(err).Msg("Failed to unmarshal task")
				msg.Nack(false, false)
				continue
			}

			if err := handler(task); err != nil {
				log.Error().
					Err(err).
					Str("type", task.Type).
					Msg("Task handler failed")
				msg.Nack(false, true) // Requeue on failure
			} else {
				msg.Ack(false)
			}
		}
	}()

	log.Info().Str("queue", queueName).Msg("Started consuming tasks")
	return nil
}

func (q *Queue) Close() error {
	if q.channel != nil {
		if err := q.channel.Close(); err != nil {
			return err
		}
	}
	if q.conn != nil {
		return q.conn.Close()
	}
	return nil
}

// PublishWebSocketNotification publishes a WebSocket notification task
func (q *Queue) PublishWebSocketNotification(userID uuid.UUID, messageType string, data map[string]interface{}) error {
	task := Task{
		Type:   TaskWebSocketNotification,
		UserID: userID,
		Data:   data,
	}

	return q.PublishTask(task)
}

// PublishWebSocketBroadcast publishes a WebSocket broadcast notification to all users
func (q *Queue) PublishWebSocketBroadcast(messageType string, data map[string]interface{}) error {
	// Use zero UUID for broadcast messages
	task := Task{
		Type:   TaskWebSocketNotification,
		UserID: uuid.Nil,
		Data:   data,
	}

	return q.PublishTask(task)
}

