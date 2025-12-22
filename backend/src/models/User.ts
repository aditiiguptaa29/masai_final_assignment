import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  email: string
  password: string
  role: 'vehicle_owner' | 'driver' | 'customer' | 'admin'
  profile: {
    firstName: string
    lastName: string
    phone: string
    avatar?: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
  }
  driverVehicleIds?: mongoose.Types.ObjectId[]
  status: 'active' | 'inactive' | 'suspended'
  emailVerified: boolean
  phoneVerified: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  isDeleted: boolean
  comparePassword(candidatePassword: string): Promise<boolean>
  getPublicProfile(): any
}

const addressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'US' }
}, { _id: false })

const profileSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true },
  avatar: { type: String },
  address: { type: addressSchema, required: true }
}, { _id: false })

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['vehicle_owner', 'driver', 'customer', 'admin'],
    required: true,
    default: 'customer'
  },
  profile: {
    type: profileSchema,
    required: true
  },
  driverVehicleIds: [{ type: Schema.Types.ObjectId, ref: 'Vehicle' }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
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

// Indexes (email already has unique: true, so we don't need to index it again)
userSchema.index({ role: 1 })
userSchema.index({ status: 1 })
userSchema.index({ isDeleted: 1 })

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject()
  delete user.password
  delete user.isDeleted
  return user
}

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`
})

// Default query to exclude deleted users
userSchema.pre(/^find/, function(this: any) {
  this.where({ isDeleted: { $ne: true } })
})

export const User = mongoose.model<IUser>('User', userSchema)