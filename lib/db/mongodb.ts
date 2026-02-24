import mongoose from 'mongoose';
import * as models from './models';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log('✅ MongoDB already connected');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'club_wine'
    });
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// User operations
export const UserDB = {
  create: async (email: string, hashedPassword: string, subscriptionId?: string, subscriptionStatus = 'PENDING') => {
    await connectDB();
    const user = new models.User({
      email,
      password: hashedPassword,
      subscription_id: subscriptionId,
      subscription_status: subscriptionStatus
    });
    await user.save();
    return user;
  },

  findByEmail: async (email: string) => {
    await connectDB();
    return await models.User.findOne({ email });
  },

  findById: async (userId: string) => {
    await connectDB();
    return await models.User.findById(userId);
  },

  updateProfile: async (userId: string, profileData: Record<string, unknown>) => {
    await connectDB();
    profileData.updated_at = new Date();
    return await models.User.findByIdAndUpdate(userId, profileData, { new: true });
  },

  updatePassword: async (userId: string, hashedPassword: string) => {
    await connectDB();
    return await models.User.findByIdAndUpdate(
      userId,
      { password: hashedPassword, updated_at: new Date() },
      { new: true }
    );
  },

  updateStatus: async (userId: string, status: string) => {
    await connectDB();
    return await models.User.findByIdAndUpdate(
      userId,
      { subscription_status: status, updated_at: new Date() },
      { new: true }
    );
  },

  getAll: async () => {
    await connectDB();
    return await models.User.find().sort({ created_at: -1 });
  }
};

// Subscription operations
export const SubscriptionDB = {
  create: async (subscriptionData: Record<string, unknown>) => {
    await connectDB();
    const subscription = new models.Subscription(subscriptionData);
    await subscription.save();
    return subscription;
  },

  findByUserId: async (userId: string) => {
    await connectDB();
    return await models.Subscription.findOne({ user_id: userId });
  },

  findByXenditId: async (xenditId: string) => {
    await connectDB();
    return await models.Subscription.findOne({ xendit_subscription_id: xenditId });
  },

  updateStatus: async (subscriptionId: string, status: string, nextPaymentDate: Date | null = null) => {
    await connectDB();
    const update: { status: string; updated_at: Date; next_payment_date?: Date } = { status, updated_at: new Date() };
    if (nextPaymentDate) update.next_payment_date = nextPaymentDate;
    return await models.Subscription.findByIdAndUpdate(subscriptionId, update, { new: true });
  },

  getAll: async () => {
    await connectDB();
    return await models.Subscription.find().populate('user_id').sort({ created_at: -1 });
  },

  deleteById: async (subscriptionId: string) => {
    await connectDB();
    return await models.Subscription.findByIdAndDelete(subscriptionId);
  }
};

// Points operations
export const PointsDB = {
  create: async (userId: string, initialBalance = 0) => {
    await connectDB();
    const points = new models.Points({
      user_id: userId,
      balance: initialBalance,
      total_earned: initialBalance
    });
    await points.save();
    return points;
  },

  getBalance: async (userId: string) => {
    await connectDB();
    const points = await models.Points.findOne({ user_id: userId });
    return points ? points.balance : 0;
  },

  getByUserId: async (userId: string) => {
    await connectDB();
    const points = await models.Points.findOne({ user_id: userId });
    if (!points) {
      return {
        user_id: userId,
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        last_updated: new Date()
      };
    }
    return points;
  },

  addPoints: async (userId: string, amount: number, description: string, referenceId: string | null = null) => {
    await connectDB();

    // Use findOneAndUpdate with upsert
    const points = await models.Points.findOneAndUpdate(
      { user_id: userId },
      {
        $inc: { balance: amount, total_earned: amount },
        $set: { last_updated: new Date() }
      },
      { upsert: true, new: true }
    );

    // Log history
    const history = new models.PointsHistory({
      user_id: userId,
      amount,
      type: 'EARNED',
      description,
      reference_id: referenceId
    });
    await history.save();

    return points.balance;
  },

  deductPoints: async (userId: string, amount: number, description: string, referenceId: string | null = null) => {
    await connectDB();

    const points = await models.Points.findOne({ user_id: userId });
    if (!points || points.balance < amount) {
      throw new Error('Insufficient points');
    }

    await models.Points.findByIdAndUpdate(points._id, {
      $inc: { balance: -amount, total_spent: amount },
      $set: { last_updated: new Date() }
    });

    // Log history
    const history = new models.PointsHistory({
      user_id: userId,
      amount: -amount,
      type: 'SPENT',
      description,
      reference_id: referenceId
    });
    await history.save();

    return points.balance - amount;
  },

  manualAdjustment: async (userId: string, amount: number, description: string, adminId: string) => {
    await connectDB();

    // Use findOneAndUpdate with upsert
    const points = await models.Points.findOneAndUpdate(
      { user_id: userId },
      {
        $inc: {
          balance: amount,
          total_earned: amount > 0 ? amount : 0,
          total_spent: amount < 0 ? Math.abs(amount) : 0
        },
        $set: { last_updated: new Date() }
      },
      { upsert: true, new: true }
    );

    // Log history
    const history = new models.PointsHistory({
      user_id: userId,
      amount,
      type: 'ADJUSTED',
      description: `Admin adjustment: ${description}`,
      reference_id: adminId
    });
    await history.save();

    return points.balance;
  },

  getHistory: async (userId: string, limit = 50) => {
    await connectDB();
    return await models.PointsHistory.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit);
  }
};

// Payment operations
export const PaymentDB = {
  create: async (paymentData: Record<string, unknown>) => {
    await connectDB();
    const payment = new models.Payment(paymentData);
    await payment.save();
    return payment;
  },

  findByXenditId: async (xenditPaymentId: string) => {
    await connectDB();
    return await models.Payment.findOne({ xendit_payment_id: xenditPaymentId });
  },

  updateStatus: async (paymentId: string, status: string, paidAt: Date | null = null) => {
    await connectDB();
    const update: { status: string; paid_at?: Date } = { status };
    if (paidAt) update.paid_at = paidAt;
    return await models.Payment.findByIdAndUpdate(paymentId, update, { new: true });
  },

  getByUserId: async (userId: string, limit = 50) => {
    await connectDB();
    return await models.Payment.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit);
  },

  getAll: async () => {
    await connectDB();
    return await models.Payment.find()
      .populate('user_id')
      .sort({ created_at: -1 });
  }
};

// Webhook operations
export const WebhookDB = {
  log: async (eventType: string, xenditId: string, status: string, payload: unknown) => {
    await connectDB();
    const log = new models.WebhookLog({
      event_type: eventType,
      xendit_id: xenditId,
      status,
      payload
    });
    await log.save();
    return log;
  },

  markProcessed: async (logId: string, error: string | null = null) => {
    await connectDB();
    const update: { processed: boolean; error?: string } = { processed: true };
    if (error) update.error = error;
    return await models.WebhookLog.findByIdAndUpdate(logId, update);
  },

  getRecent: async (limit = 50) => {
    await connectDB();
    return await models.WebhookLog.find()
      .sort({ created_at: -1 })
      .limit(limit);
  }
};

// Event operations
export const EventDB = {
  create: async (eventData: Record<string, unknown>) => {
    await connectDB();
    const event = new models.Event(eventData);
    await event.save();
    return event;
  },

  getAll: async (includeAll = false) => {
    await connectDB();
    const filter = includeAll ? {} : { status: { $ne: 'CANCELLED' } };
    return await models.Event.find(filter).sort({ event_date: 1 });
  },

  getById: async (eventId: string) => {
    await connectDB();
    return await models.Event.findById(eventId);
  },

  update: async (eventId: string, eventData: Record<string, unknown>) => {
    await connectDB();
    return await models.Event.findByIdAndUpdate(eventId, eventData, { new: true });
  },

  delete: async (eventId: string) => {
    await connectDB();
    return await models.Event.findByIdAndDelete(eventId);
  },

  getUserRegistrations: async (userId: string) => {
    await connectDB();
    return await models.EventRegistration.find({ user_id: userId })
      .populate('event_id')
      .sort({ registered_at: -1 });
  },

  getEventRegistrations: async (eventId: string) => {
    await connectDB();
    return await models.EventRegistration.find({ event_id: eventId })
      .populate('user_id', 'email full_name')
      .sort({ registered_at: -1 });
  },

  register: async (userId: string, eventId: string, pointsSpent: number) => {
    await connectDB();

    // Check if already registered
    const existing = await models.EventRegistration.findOne({ user_id: userId, event_id: eventId });
    if (existing) {
      throw new Error('Already registered for this event');
    }

    // Check event capacity
    const event = await models.Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (event.current_attendees >= event.max_attendees) {
      throw new Error('Event is full');
    }

    // Generate unique reservation code
    let reservationCode = '';
    let isUnique = false;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    while (!isUnique) {
      reservationCode = 'RES-';
      for (let i = 0; i < 8; i++) {
        reservationCode += chars[Math.floor(Math.random() * chars.length)];
      }
      
      // Check if code already exists
      const existingCode = await models.EventRegistration.findOne({ reservation_code: reservationCode });
      if (!existingCode) {
        isUnique = true;
      }
    }

    // Register
    const registration = new models.EventRegistration({
      user_id: userId,
      event_id: eventId,
      points_spent: pointsSpent,
      reservation_code: reservationCode
    });
    await registration.save();

    // Update attendee count
    await models.Event.findByIdAndUpdate(eventId, {
      $inc: { current_attendees: 1 }
    });

    return registration;
  },

  isUserRegistered: async (userId: string, eventId: string) => {
    await connectDB();
    const registration = await models.EventRegistration.findOne({ user_id: userId, event_id: eventId });
    return !!registration;
  }
};

// Admin operations
export const AdminDB = {
  logAction: async (adminId: string, action: string, targetType: string, targetId: string, details: unknown) => {
    await connectDB();
    const log = new models.AdminLog({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details
    });
    await log.save();
    return log;
  },

  getRecentLogs: async (limit = 100) => {
    await connectDB();
    return await models.AdminLog.find()
      .populate('admin_id', 'email full_name')
      .sort({ created_at: -1 })
      .limit(limit);
  },

  getStats: async () => {
    await connectDB();

    const totalUsers = await models.User.countDocuments();
    const activeMembers = await models.User.countDocuments({ subscription_status: 'ACTIVE_MEMBER' });
    const totalSubscriptions = await models.Subscription.countDocuments({ status: 'ACTIVE' });
    const totalRevenue = await models.Payment.aggregate([
      { $match: { status: 'SUCCEEDED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalEvents = await models.Event.countDocuments();
    const upcomingEvents = await models.Event.countDocuments({
      status: 'UPCOMING',
      event_date: { $gte: new Date() }
    });

    return {
      totalUsers,
      activeMembers,
      totalSubscriptions,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalEvents,
      upcomingEvents
    };
  }
};

// App Config operations
export const AppConfigDB = {
  getByKey: async (key: string) => {
    await connectDB();
    return await models.AppConfig.findOne({ key });
  },

  upsert: async (key: string, value: unknown, updatedBy?: string) => {
    await connectDB();
    return await models.AppConfig.findOneAndUpdate(
      { key },
      {
        $set: {
          value,
          updated_at: new Date(),
          ...(updatedBy ? { updated_by: updatedBy } : {})
        }
      },
      { upsert: true, new: true }
    );
  }
};
