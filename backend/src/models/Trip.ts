import mongoose, { Schema, Document } from 'mongoose'

export interface ITrip extends Document {
  booking: mongoose.Types.ObjectId
  driver: mongoose.Types.ObjectId
  bookingReference?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  startTime?: Date
  endTime?: Date
  startOdometer?: number
  endOdometer?: number
  distance?: number
  route?: {
    startLocation?: {
      type: 'Point'
      coordinates: [number, number]
      address: string
      timestamp: Date
    }
    endLocation?: {
      type: 'Point'
      coordinates: [number, number]
      address: string
      timestamp: Date
    }
    waypoints?: Array<{
      type: 'Point'
      coordinates: [number, number]
      timestamp: Date
    }>
  }
  expenses?: {
    fuel?: {
      amount: number
      liters: number
      pricePerLiter: number
      location: string
      receiptImage?: string
    }
    tolls?: Array<{
      amount: number
      location: string
      receiptImage?: string
    }>
    parking?: Array<{
      amount: number
      location: string
      duration: number
      receiptImage?: string
    }>
    other?: Array<{
      description: string
      amount: number
      category: string
      receiptImage?: string
    }>
  }
  notes?: string
  rating?: {
    byCustomer?: number
    byDriver?: number
    customerComment?: string
    driverComment?: string
  }
  earnings?: {
    baseAmount: number
    bonuses: number
    deductions: number
    totalAmount: number
  }
  createdAt: Date
  updatedAt: Date
}

const locationPointSchema = new Schema({
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
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false })

const waypointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false })

const tripSchema = new Schema<ITrip>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    bookingReference: {
      type: String,
      default: function(this: any) {
        return this.booking ? String(this.booking) : undefined
      }
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    startOdometer: {
      type: Number,
      min: 0
    },
    endOdometer: {
      type: Number,
      min: 0
    },
    distance: {
      type: Number,
      min: 0
    },
    route: {
      startLocation: {
        type: locationPointSchema,
        required: false
      },
      endLocation: {
        type: locationPointSchema,
        required: false
      },
      waypoints: [waypointSchema]
    },
    expenses: {
      fuel: {
        amount: {
          type: Number,
          min: 0
        },
        liters: {
          type: Number,
          min: 0
        },
        pricePerLiter: {
          type: Number,
          min: 0
        },
        location: String,
        receiptImage: String
      },
      tolls: [{
        amount: {
          type: Number,
          min: 0
        },
        location: String,
        receiptImage: String
      }],
      parking: [{
        amount: {
          type: Number,
          min: 0
        },
        location: String,
        duration: {
          type: Number,
          min: 0
        },
        receiptImage: String
      }],
      other: [{
        description: String,
        amount: {
          type: Number,
          min: 0
        },
        category: String,
        receiptImage: String
      }]
    },
    notes: String,
    rating: {
      byCustomer: {
        type: Number,
        min: 1,
        max: 5
      },
      byDriver: {
        type: Number,
        min: 1,
        max: 5
      },
      customerComment: String,
      driverComment: String
    },
    earnings: {
      baseAmount: {
        type: Number,
        min: 0
      },
      bonuses: {
        type: Number,
        default: 0
      },
      deductions: {
        type: Number,
        default: 0
      },
      totalAmount: {
        type: Number,
        min: 0
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Indexes
tripSchema.index({ booking: 1 })
tripSchema.index({ driver: 1 })
tripSchema.index({ status: 1 })
tripSchema.index({ startTime: 1 })
tripSchema.index({ 'route.startLocation': '2dsphere' })
tripSchema.index({ 'route.endLocation': '2dsphere' })
// Ensure bookingReference uniqueness aligns with existing DB index
tripSchema.index({ bookingReference: 1 }, { unique: true, partialFilterExpression: { bookingReference: { $type: 'string' } } })

// Virtual for total trip duration in hours
tripSchema.virtual('duration').get(function() {
  if (this.startTime && this.endTime) {
    return (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60 * 60)
  }
  return null
})

// Virtual for total expenses
tripSchema.virtual('totalExpenses').get(function() {
  let total = 0
  if (this.expenses) {
    if (this.expenses.fuel?.amount) total += this.expenses.fuel.amount
    if (this.expenses.tolls?.length) {
      total += this.expenses.tolls.reduce((sum, toll) => sum + (toll.amount || 0), 0)
    }
    if (this.expenses.parking?.length) {
      total += this.expenses.parking.reduce((sum, parking) => sum + (parking.amount || 0), 0)
    }
    if (this.expenses.other?.length) {
      total += this.expenses.other.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    }
  }
  return total
})

export const Trip = mongoose.model<ITrip>('Trip', tripSchema)
