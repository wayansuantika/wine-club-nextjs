export interface User {
  _id: string;
  email: string;
  role: 'GUEST' | 'ACTIVE_MEMBER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'GUEST' | 'ACTIVE_MEMBER' | 'CANCELLED';
  created_at: Date;
}

export interface Event {
  _id: string;
  id: string; // Important: API returns both _id and id
  title: string;
  description?: string;
  location: string;
  event_date: Date;
  points_cost: number;
  max_attendees: number;
  current_attendees: number;
  image_url?: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  isRegistered?: boolean; // Added by API for current user
}

export interface Points {
  user_id: string;
  balance: number;
  last_updated: Date;
}

export interface Subscription {
  user_id: string;
  xendit_customer_id: string;
  xendit_subscription_id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
  amount: number;
  start_date: Date;
  next_billing_date?: Date;
}

export interface Payment {
  _id: string;
  user_id: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  payment_method: string;
  xendit_invoice_id?: string;
  created_at: Date;
}

export interface EventRegistration {
  _id: string;
  user_id: string;
  event_id: string;
  points_spent: number;
  reservation_code: string;
  registration_date: Date;
  status: 'REGISTERED' | 'ATTENDED' | 'CANCELLED';
}

export interface PointsHistory {
  _id: string;
  user_id: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reason: string;
  created_at: Date;
}

export interface AdminLog {
  _id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  timestamp: Date;
}

export interface Webhook {
  _id: string;
  event_type: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  received_at: Date;
  processed_at?: Date;
}
