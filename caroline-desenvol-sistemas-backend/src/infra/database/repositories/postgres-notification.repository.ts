import { Pool } from 'pg';
import { Notification } from '../../../domain/entities/notification.entity';

export class PostgresNotificationRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async findPending(): Promise<Notification[]> {
    const result = await this.pool.query(
      `SELECT * FROM notifications 
       WHERE status = 'pending' 
       AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC`
    );
    
    return result.rows.map(this.mapToEntity);
  }

  async update(notification: Notification): Promise<void> {
    await this.pool.query(
      `UPDATE notifications 
       SET status = $1, sent_at = $2 
       WHERE id = $3`,
      [notification.status, notification.sentAt, notification.id]
    );
  }

  async create(notification: Notification): Promise<Notification> {
    const result = await this.pool.query(
      `INSERT INTO notifications (id, email, subject, message, scheduled_for, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        notification.id,
        notification.email,
        notification.subject,
        notification.message,
        notification.scheduledFor,
        notification.status,
        notification.createdAt,
      ]
    );
    
    return this.mapToEntity(result.rows[0]);
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await this.pool.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  private mapToEntity(row: any): Notification {
    return {
      id: row.id,
      email: row.email,
      subject: row.subject,
      message: row.message,
      scheduledFor: row.scheduled_for,
      status: row.status,
      sentAt: row.sent_at,
      createdAt: row.created_at,
    };
  }
}