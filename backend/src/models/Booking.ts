import mongoose, { Document, Schema } from 'mongoose'

export interface IBooking extends Document {
  customer: mongoose.Types.ObjectId
  vehicle: mongoose.Types.ObjectId
  driver?: mongoose.Types.ObjectId
  pickupLocation: {
    type: 'Point'
    coordinates: [number, number]
    address: string
  }
  dropoffLocation: {
    type: 'Point'
    coordinates: [number, number]
    address: string
  }
  scheduledDate: {
    start: Date
    end: Date
  }
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  pricing: {
    baseAmount: number
    taxes: number
    fees: number
    totalAmount: number
    currency: string
  }
  payment: {
    method: 'credit_card' | 'cash' | 'bank_transfer'
    status: 'pending' | 'completed' | 'failed' | 'refunded'
    transactionId?: string
    paidAt?: Date
  }
  trip?: mongoose.Types.ObjectId
  customerNotes?: string
  cancelReason?: string
  cancelledBy?: mongoose.Types.ObjectId
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
  isDeleted: boolean
}

const locationSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true
  },
  address: {
    type: String,
    required: true
  }
}, { _id: false })

const bookingSchema = new Schema<IBooking>({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  pickupLocation: {
    type: locationSchema,
    required: true
  },
  dropoffLocation: {
    type: locationSchema,
    required: true
  },
  scheduledDate: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  pricing: {
    baseAmount: {
      type: Number,
      required: true,
      min: 0
    },
    taxes: {
      type: Number,
      default: 0,
      min: 0
    },
    fees: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'cash', 'bank_transfer'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  trip: {
    type: Schema.Types.ObjectId,
    ref: 'Trip'
  },
  customerNotes: String,
  cancelReason: String,
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
bookingSchema.index({ customer: 1 })
bookingSchema.index({ vehicle: 1 })
bookingSchema.index({ driver: 1 })
bookingSchema.index({ status: 1 })
bookingSchema.index({ 'scheduledDate.start': 1 })
bookingSchema.index({ 'payment.status': 1 })
bookingSchema.index({ pickupLocation: '2dsphere' })
bookingSchema.index({ dropoffLocation: '2dsphere' })
bookingSchema.index({ isDeleted: 1 })

// Virtual for duration in hours
bookingSchema.virtual('duration').get(function() {
  const start = new Date(this.scheduledDate.start)
  const end = new Date(this.scheduledDate.end)
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
})

// Default query to exclude deleted bookings
bookingSchema.pre(/^find/, function(this: any) {
  this.where({ isDeleted: { $ne: true } })
})

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema)