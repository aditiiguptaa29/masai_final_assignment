const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define User schema for admin creation
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['vehicle_owner', 'driver', 'customer', 'admin'], 
    required: true 
  },
  profile: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: String,
    avatar: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended'], 
    default: 'active' 
  },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLogin: Date,
  isDeleted: { type: Boolean, default: false }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet-management');
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@fleetmanager.com' });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Role:', existingAdmin.role);
      
      // Update password to ensure it's correct
      existingAdmin.password = 'FleetAdmin2024!';
      existingAdmin.updatedAt = new Date();
      await existingAdmin.save();
      console.log('🔄 Admin password updated');
    } else {
      // Create new admin user
      const adminUser = new User({
        email: 'admin@fleetmanager.com',
        password: 'FleetAdmin2024!', // This will be hashed automatically
        role: 'admin',
        profile: {
          firstName: 'Fleet',
          lastName: 'Administrator',
          phone: '+1-555-ADMIN',
          address: {
            street: 'Fleet Management Headquarters',
            city: 'Admin City',
            state: 'CA',
            zipCode: '90210',
            country: 'US'
          }
        },
        status: 'active',
        emailVerified: true
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log('');
    console.log('🚀 =================================');
    console.log('📧 Email:    admin@fleetmanager.com');
    console.log('🔑 Password: FleetAdmin2024!');
    console.log('👤 Role:     admin');
    console.log('🚀 =================================');
    console.log('');
    console.log('🌐 Admin Portal: http://localhost:3001/login');
    console.log('');

    // Verify credentials work
    const testAdmin = await User.findOne({ email: 'admin@fleetmanager.com' });
    const isValid = await testAdmin.comparePassword('FleetAdmin2024!');
    
    if (isValid) {
      console.log('✅ Admin authentication verified');
    } else {
      console.log('❌ Admin authentication failed');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

createAdminUser();
