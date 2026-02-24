import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String },
  phone: { type: String },
  address: { type: String },
  birth_date: { type: Date },
  profile_photo: { type: String },
  subscription_status: {
    type: String,
    enum: ['PENDING', 'ACTIVE_MEMBER', 'INACTIVE', 'GUEST'],
    default: 'PENDING'
  },
  subscription_id: { type: String },
  role: {
    type: String,
    enum: ['user', 'admin', 'ADMIN', 'SUPER_ADMIN'],
    default: 'user'
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'Users' });

// Subscription Schema
const subscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  xendit_subscription_id: { type: String, unique: true },
  xendit_customer_id: { type: String },
  plan_id: { type: String },
  plan_code: { type: String },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'CANCELLED'],
    default: 'PENDING'
  },
  amount: { type: Number, required: true },
  interval: { type: String, default: 'MONTH' },
  interval_count: { type: Number, default: 1 },
  start_date: { type: Date },
  next_payment_date: { type: Date },
  payment_url: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'Subscriptions' });

// Points Schema
const pointsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 },
  total_earned: { type: Number, default: 0 },
  total_spent: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now }
}, { collection: 'Points' });

// Points History Schema
const pointsHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['EARNED', 'SPENT', 'ADJUSTED'],
    required: true
  },
  description: { type: String },
  reference_id: { type: String },
  created_at: { type: Date, default: Date.now }
}, { collection: 'PointsHistory' });

// Payment Schema
const paymentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  xendit_payment_id: { type: String, unique: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCEEDED', 'FAILED'],
    required: true
  },
  payment_method: { type: String },
  paid_at: { type: Date },
  created_at: { type: Date, default: Date.now }
}, { collection: 'Payments' });

// Webhook Log Schema
const webhookLogSchema = new mongoose.Schema({
  event_type: { type: String, required: true },
  xendit_id: { type: String },
  status: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  processed: { type: Boolean, default: false },
  error: { type: String },
  created_at: { type: Date, default: Date.now }
}, { collection: 'Webhooks' });

// Admin Log Schema
const adminLogSchema = new mongoose.Schema({
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  target_type: { type: String },
  target_id: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
}, { collection: 'AdminLogs' });

// Event Schema
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  event_date: { type: Date, required: true },
  location: { type: String },
  points_cost: { type: Number, required: true },
  max_attendees: { type: Number, required: true },
  current_attendees: { type: Number, default: 0 },
  image_url: { type: String },
  status: {
    type: String,
    enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
    default: 'UPCOMING'
  },
  created_at: { type: Date, default: Date.now }
}, { collection: 'Events' });

// Event Registration Schema
const eventRegistrationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  points_spent: { type: Number, required: true },
  reservation_code: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['REGISTERED', 'ATTENDED', 'CANCELLED'],
    default: 'REGISTERED'
  },
  registered_at: { type: Date, default: Date.now }
}, { collection: 'EventRegistrations' });

// App Config Schema
const appConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'AppConfig' });

// Create indexes
eventRegistrationSchema.index({ user_id: 1, event_id: 1 }, { unique: true });

// Export models with check for existing models (prevents recompilation errors in dev)
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
export const Points = mongoose.models.Points || mongoose.model('Points', pointsSchema);
export const PointsHistory = mongoose.models.PointsHistory || mongoose.model('PointsHistory', pointsHistorySchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export const WebhookLog = mongoose.models.WebhookLog || mongoose.model('WebhookLog', webhookLogSchema);
export const AdminLog = mongoose.models.AdminLog || mongoose.model('AdminLog', adminLogSchema);
export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
export const EventRegistration = mongoose.models.EventRegistration || mongoose.model('EventRegistration', eventRegistrationSchema);
export const AppConfig = mongoose.models.AppConfig || mongoose.model('AppConfig', appConfigSchema);
