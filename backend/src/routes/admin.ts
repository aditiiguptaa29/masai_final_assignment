import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Vehicle } from '../models/Vehicle';
import { User } from '../models/User';
import { Trip } from '../models/Trip';
import { Booking } from '../models/Booking';

const router = Router();

// ============ DASHBOARD ANALYTICS ============
router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Get counts
    const [totalVehicles, totalDrivers, totalTrips, totalBookings, totalCustomers, completedBookings] = await Promise.all([
      Vehicle.countDocuments({ isDeleted: false }),
      User.countDocuments({ role: 'driver', isDeleted: false }),
      Trip.countDocuments(),
      Booking.countDocuments(),
      User.countDocuments({ role: 'customer', isDeleted: false }),
      Booking.countDocuments({ status: 'completed' }),
    ]);

    // Total revenue: sum of Booking.pricing.totalAmount for bookings linked to completed trips
    const revenueFromCompletedTripsAgg = await Trip.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$booking.pricing.totalAmount', 0] } }
        }
      }
    ])

    const totalRevenue = revenueFromCompletedTripsAgg[0]?.totalRevenue || 0;

    // Get cancelled trips count
    const cancelledTrips = await Trip.countDocuments({ status: 'cancelled' });

    // Get recent activities
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'profile')
      .populate('vehicle', 'make model');

    const recentTrips = await Trip.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('driver', 'profile')
      .populate('booking');

    res.json({
      success: true,
      data: {
        stats: {
          totalVehicles,
          totalDrivers,
          totalTrips,
          totalBookings,
          totalCustomers,
          completedBookings,
          totalRevenue,
          cancelledTrips,
        },
        recentBookings,
        recentTrips,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard analytics',
      error: error.message,
    });
  }
});

// ============ REVENUE ANALYTICS ============
router.get('/revenue', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let groupBy: any;
    let dateFilter: any = {};

    const now = new Date();

    switch (period) {
      case 'week':
        dateFilter.createdAt = {
          $gte: new Date(now.setDate(now.getDate() - 7)),
        };
        groupBy = {
          day: { $dayOfMonth: '$createdAt' },
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        };
        break;
      case 'month':
        dateFilter.createdAt = {
          $gte: new Date(now.setMonth(now.getMonth() - 1)),
        };
        groupBy = {
          day: { $dayOfMonth: '$createdAt' },
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        };
        break;
      case 'year':
        dateFilter.createdAt = {
          $gte: new Date(now.setFullYear(now.getFullYear() - 1)),
        };
        groupBy = {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        };
        break;
      default:
        groupBy = {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        };
    }

    const revenueData = await Trip.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: { $ifNull: ['$booking.pricing.totalAmount', 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json({
      success: true,
      data: revenueData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue analytics',
      error: error.message,
    });
  }
});

// ============ VEHICLE STATS ============
router.get('/vehicles/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const stats = await Vehicle.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          available: { $sum: { $cond: ['$availability', 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle stats',
      error: error.message,
    });
  }
});

// ============ DRIVER STATS ============
router.get('/drivers/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const activeDrivers = await User.countDocuments({
      role: 'driver',
      isDeleted: false,
      'driverProfile.isAvailable': true,
    });

    const totalDrivers = await User.countDocuments({
      role: 'driver',
      isDeleted: false,
    });

    const topDrivers = await Trip.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$driver',
          totalTrips: { $sum: 1 },
          totalEarnings: { $sum: '$fare.totalAmount' },
        },
      },
      { $sort: { totalTrips: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $unwind: '$driver' },
    ]);

    res.json({
      success: true,
      data: {
        activeDrivers,
        totalDrivers,
        topDrivers,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching driver stats',
      error: error.message,
    });
  }
});

// ============ TRIP STATS ============
router.get('/trips/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const statusStats = await Trip.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const avgTripDuration = await Trip.aggregate([
      { $match: { status: 'completed' } },
      {
        $project: {
          duration: {
            $subtract: ['$actualEndTime', '$actualStartTime'],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        statusStats,
        avgTripDuration: avgTripDuration[0]?.avgDuration || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trip stats',
      error: error.message,
    });
  }
});

export default router;
