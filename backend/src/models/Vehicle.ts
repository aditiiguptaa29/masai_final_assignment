import mongoose, { Document, Schema } from 'mongoose'

export interface IVehicle extends Document {
  owner: mongoose.Types.ObjectId
  make: string
  modelName: string
  year: number
  color: string
  licensePlate: string
  vin: string
  type: 'sedan' | 'suv' | 'truck' | 'van' | 'motorcycle' | 'bus'
  capacity: {
    passengers: number
    cargo: number // in cubic feet
  }
  features: string[]
  pricing: {
    baseRate: number // per hour/day
    currency: string
    rateType: 'hourly' | 'daily'
  }
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
    address?: string
    city: string
    state: string
  }
  availability: boolean
  documents?: {
    registration?: string
    insurance?: string
    inspection?: string
  }
  images: string[]
  status: 'active' | 'maintenance' | 'inactive'
  rating: {
    average: number
    count: number
  }
  trips: {
    total: number
    completed: number
  }
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
    default: [0, 0],
    validate: {
      validator: (coords: number[]) => coords.length === 2,
      message: 'Coordinates must contain exactly 2 numbers [longitude, latitude]'
    }
  },
  address: String,
  city: { type: String, required: true },
  state: { type: String, required: true }
}, { _id: false })

const vehicleSchema = new Schema<IVehicle>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  modelName: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 2
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  vin: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allow multiple null/undefined values
    uppercase: true,
    trim: true,
    minlength: 17,
    maxlength: 17
  },
  type: {
    type: String,
    enum: ['sedan', 'suv', 'truck', 'van', 'motorcycle', 'bus'],
    required: true
  },
  capacity: {
    passengers: {
      type: Number,
      required: true,
      min: 1,
      max: 50
    },
    cargo: {
      type: Number,
      required: true,
      min: 0
    }
  },
  features: [{
    type: String,
    trim: true
  }],
  pricing: {
    baseRate: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    rateType: {
      type: String,
      enum: ['hourly', 'daily'],
      default: 'daily'
    }
  },
  location: {
    type: locationSchema,
    required: true
  },
  availability: {
    type: Boolean,
    default: true
  },
  documents: {
    registration: String,
    insurance: String,
    inspection: String
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  trips: {
    total: {
      type: Number,
      default: 0
    },
    completed: {
      type: Number,
      default: 0
    }
  },
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
vehicleSchema.index({ location: '2dsphere' })
vehicleSchema.index({ owner: 1 })
vehicleSchema.index({ status: 1 })
vehicleSchema.index({ type: 1 })
vehicleSchema.index({ availability: 1 })
// licensePlate and vin already have unique: true, no need to index again
vehicleSchema.index({ isDeleted: 1 })

// Virtual for display name
vehicleSchema.virtual('displayName').get(function() {
  return `${this.year} ${this.make} ${this.modelName}`
})

// Default query to exclude deleted vehicles
vehicleSchema.pre(/^find/, function(this: any) {
  this.where({ isDeleted: { $ne: true } })
})

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema)