const mongoose = require('mongoose')

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || '', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const db = mongoose.connection

// Define schemas (simplified versions)
const tripSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  route: {
    startLocation: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
      address: String,
      timestamp: Date
    },
    endLocation: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
      address: String,
      timestamp: Date
    }
  },
  expenses: {
    fuel: {
      amount: Number,
      liters: Number,
      pricePerLiter: Number,
      location: String
    },
    tolls: [{
      amount: Number,
      location: String
    }],
    parking: [{
      amount: Number,
      location: String,
      duration: Number
    }]
  },
  earnings: {
    baseAmount: Number,
    bonuses: Number,
    deductions: Number,
    totalAmount: Number
  },
  distance: Number,
  notes: String
}, { timestamps: true })

const bookingSchema = new mongoose.Schema({
  pickupLocation: {
    coordinates: [Number],
    address: String
  },
  dropoffLocation: {
    coordinates: [Number],
    address: String
  },
  pricing: {
    baseAmount: Number
  },
  scheduledDate: {
    start: Date,
    end: Date
  }
}, { timestamps: true })

const Trip = mongoose.model('Trip', tripSchema)
const Booking = mongoose.model('Booking', bookingSchema)

async function populateTripsWithMeaningfulData() {
  try {
    console.log('🔄 Updating existing trips with meaningful data...')
    
    // Get all trips that need updating
    const trips = await Trip.find({}).populate('booking')
    
    console.log(`📊 Found ${trips.length} trips to update`)
    
    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i]
      const booking = trip.booking
      
      if (!booking) {
        console.log(`⚠️  Trip ${trip._id} has no booking reference, skipping...`)
        continue
      }
      
      // Generate realistic data
      const estimatedDistance = Math.floor(Math.random() * 80) + 20 // 20-100km
      const fuelCost = Math.round(estimatedDistance * 0.08 * 90) // ₹90/L, 12.5 km/L
      const baseEarnings = booking.pricing?.baseAmount ? booking.pricing.baseAmount * 0.7 : 350
      const distanceBonus = estimatedDistance > 50 ? 50 : 0
      const ratingBonus = Math.random() > 0.5 ? 25 : 0 // Random bonus
      const tollCost = estimatedDistance > 30 ? Math.round(estimatedDistance * 0.5) : 0
      const parkingCost = 20
      
      const totalExpenses = fuelCost + tollCost + parkingCost
      
      // Update trip with meaningful data
      await Trip.findByIdAndUpdate(trip._id, {
        distance: estimatedDistance,
        route: {
          startLocation: booking.pickupLocation ? {
            type: 'Point',
            coordinates: booking.pickupLocation.coordinates || [72.8777, 19.0760],
            address: booking.pickupLocation.address || 'Pickup Location',
            timestamp: booking.scheduledDate?.start || new Date()
          } : undefined
        },
        expenses: {
          fuel: {
            amount: fuelCost,
            liters: Math.round(estimatedDistance * 0.08 * 10) / 10,
            pricePerLiter: 90,
            location: 'Highway Petrol Pump'
          },
          tolls: tollCost > 0 ? [{
            amount: tollCost,
            location: 'Highway Toll Plaza'
          }] : [],
          parking: [{
            amount: parkingCost,
            location: 'Destination Parking',
            duration: 30
          }]
        },
        earnings: {
          baseAmount: baseEarnings,
          bonuses: distanceBonus + ratingBonus,
          deductions: totalExpenses,
          totalAmount: baseEarnings + distanceBonus + ratingBonus - totalExpenses
        },
        notes: `Updated trip data - Distance: ${estimatedDistance}km, Fuel: ₹${fuelCost}, Total Expenses: ₹${totalExpenses}`
      })
      
      console.log(`✅ Updated trip ${i + 1}/${trips.length}: ${trip._id} - Distance: ${estimatedDistance}km, Earnings: ₹${baseEarnings + distanceBonus + ratingBonus - totalExpenses}`)
    }
    
    console.log('🎉 All trips updated successfully!')
    console.log('')
    console.log('📋 Sample trip data now includes:')
    console.log('   • Route with pickup coordinates and address')
    console.log('   • Realistic fuel expenses (₹90/L)')
    console.log('   • Toll costs for longer trips')
    console.log('   • Parking fees')
    console.log('   • Distance-based and rating bonuses')
    console.log('   • Comprehensive earnings breakdown')
    console.log('   • Detailed trip notes')
    console.log('')
    console.log('🔍 Check MongoDB Compass to see the updated data!')
    
  } catch (error) {
    console.error('❌ Error updating trips:', error)
  } finally {
    mongoose.connection.close()
    console.log('📤 Database connection closed')
  }
}

db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function() {
  console.log('📊 Connected to MongoDB')
  populateTripsWithMeaningfulData()
})