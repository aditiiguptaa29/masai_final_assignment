const mongoose = require('mongoose')

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || '')

const db = mongoose.connection

async function getComprehensiveTripData() {
  try {
    console.log('🔍 Fetching comprehensive trip data...\n')
    
    // Query to get complete trip information with all populated data
    const trips = await db.collection('trips').aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'bookingDetails'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'driver',
          foreignField: '_id',
          as: 'driverDetails'
        }
      },
      {
        $unwind: { path: '$bookingDetails', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$driverDetails', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'bookingDetails.customer',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'bookingDetails.vehicle',
          foreignField: '_id',
          as: 'vehicleDetails'
        }
      },
      {
        $unwind: { path: '$customerDetails', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$vehicleDetails', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          status: 1,
          distance: 1,
          startTime: 1,
          endTime: 1,
          createdAt: 1,
          updatedAt: 1,
          
          // Route Information
          'route.startLocation.address': 1,
          'route.startLocation.coordinates': 1,
          'route.endLocation.address': 1,
          'route.endLocation.coordinates': 1,
          
          // Customer Information
          customerName: {
            $concat: ['$customerDetails.profile.firstName', ' ', '$customerDetails.profile.lastName']
          },
          customerEmail: '$customerDetails.email',
          customerPhone: '$customerDetails.profile.phone',
          
          // Driver Information  
          driverName: {
            $concat: ['$driverDetails.profile.firstName', ' ', '$driverDetails.profile.lastName']
          },
          driverPhone: '$driverDetails.profile.phone',
          
          // Vehicle Information
          vehicleInfo: {
            $concat: ['$vehicleDetails.make', ' ', '$vehicleDetails.modelName', ' (', '$vehicleDetails.licensePlate', ')']
          },
          vehicleYear: '$vehicleDetails.year',
          
          // Booking Information
          pickupLocation: '$bookingDetails.pickupLocation.address',
          dropoffLocation: '$bookingDetails.dropoffLocation.address',
          scheduledStart: '$bookingDetails.scheduledDate.start',
          scheduledEnd: '$bookingDetails.scheduledDate.end',
          bookingAmount: '$bookingDetails.pricing.totalAmount',
          
          // Financial Information
          'earnings.baseAmount': 1,
          'earnings.bonuses': 1,
          'earnings.deductions': 1,
          'earnings.totalAmount': 1,
          
          // Expenses
          'expenses.fuel.amount': 1,
          'expenses.fuel.liters': 1,
          'expenses.tolls': 1,
          'expenses.parking': 1,
          
          notes: 1
        }
      }
    ]).toArray()
    
    console.log(`📊 Found ${trips.length} trip(s) with complete information:\n`)
    
    trips.forEach((trip, index) => {
      console.log(`🚗 TRIP ${index + 1}:`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📋 Trip ID: ${trip._id}`)
      console.log(`📍 Route: ${trip.pickupLocation} → ${trip.dropoffLocation}`)
      console.log(`👤 Customer: ${trip.customerName} (${trip.customerEmail})`)
      console.log(`🚗 Driver: ${trip.driverName} (${trip.driverPhone})`)
      console.log(`🚙 Vehicle: ${trip.vehicleInfo} (${trip.vehicleYear})`)
      console.log(`📅 Scheduled: ${new Date(trip.scheduledStart).toLocaleString()} - ${new Date(trip.scheduledEnd).toLocaleString()}`)
      console.log(`📏 Distance: ${trip.distance || 'N/A'}km`)
      console.log(`⭐ Status: ${trip.status}`)
      console.log('')
      
      console.log(`💰 FINANCIAL BREAKDOWN:`)
      console.log(`   💵 Booking Amount: ₹${trip.bookingAmount}`)
      console.log(`   💸 Driver Base: ₹${trip.earnings?.baseAmount || 0}`)
      console.log(`   🎁 Bonuses: ₹${trip.earnings?.bonuses || 0}`)
      console.log(`   📉 Deductions: ₹${trip.earnings?.deductions || 0}`)
      console.log(`   💳 Driver Net: ₹${trip.earnings?.totalAmount || 0}`)
      console.log('')
      
      console.log(`⛽ EXPENSES:`)
      console.log(`   🛢️ Fuel: ₹${trip.expenses?.fuel?.amount || 0} (${trip.expenses?.fuel?.liters || 0}L)`)
      console.log(`   🛣️ Tolls: ${trip.expenses?.tolls?.length || 0} charges`)
      console.log(`   🅿️ Parking: ${trip.expenses?.parking?.length || 0} charges`)
      console.log('')
      
      if (trip.route?.startLocation?.coordinates) {
        console.log(`🗺️ COORDINATES:`)
        console.log(`   📍 Pickup: [${trip.route.startLocation.coordinates.join(', ')}]`)
        if (trip.route?.endLocation?.coordinates) {
          console.log(`   🏁 Dropoff: [${trip.route.endLocation.coordinates.join(', ')}]`)
        }
        console.log('')
      }
      
      if (trip.notes) {
        console.log(`📝 Notes: ${trip.notes}`)
        console.log('')
      }
      
      console.log(`⏰ Created: ${new Date(trip.createdAt).toLocaleString()}`)
      console.log(`🔄 Updated: ${new Date(trip.updatedAt).toLocaleString()}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
    })
    
    console.log('📊 SUMMARY:')
    console.log(`   • Total Trips: ${trips.length}`)
    console.log(`   • Active Trips: ${trips.filter(t => t.status === 'in_progress').length}`)
    console.log(`   • Completed Trips: ${trips.filter(t => t.status === 'completed').length}`)
    console.log(`   • Scheduled Trips: ${trips.filter(t => t.status === 'scheduled').length}`)
    
    const totalEarnings = trips.reduce((sum, t) => sum + (t.earnings?.totalAmount || 0), 0)
    const totalDistance = trips.reduce((sum, t) => sum + (t.distance || 0), 0)
    console.log(`   • Total Distance: ${totalDistance}km`)
    console.log(`   • Total Driver Earnings: ₹${totalEarnings}`)
    
  } catch (error) {
    console.error('❌ Error fetching trip data:', error)
  } finally {
    mongoose.connection.close()
    console.log('\n📤 Database connection closed')
  }
}

db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function() {
  console.log('📊 Connected to MongoDB\n')
  getComprehensiveTripData()
})