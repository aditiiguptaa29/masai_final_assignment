# 🚗 Fleet Management System

A comprehensive fleet management platform built with MERN stack (MongoDB, Express, React, Node.js) featuring Next.js frontend, role-based authentication, real-time tracking, and analytics.

## 🌟 Features

### Multi-Role Support
- **Vehicle Owners**: Manage vehicles, view earnings, track performance
- **Drivers**: Accept trips, update status, manage assignments
- **Customers**: Browse vehicles, make bookings, track trips
- **Admin**: System management, analytics, user administration

### Core Functionality
- ✅ User authentication with NextAuth and JWT
- ✅ Role-based access control
- ✅ Vehicle management with location services
- ✅ Booking and trip lifecycle management
- ✅ Real-time notifications
- ✅ Analytics and reporting
- ✅ Redis caching for performance
- ✅ Responsive UI with Tailwind CSS

## 🏗️ Architecture

```
fleet-management/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # Reusable UI components
│   │   ├── providers/    # Context providers
│   │   └── styles/       # Global styles
│   └── package.json
├── backend/           # Express.js API
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Custom middleware
│   │   └── config/       # Database & Redis config
│   └── package.json
├── admin/             # React Admin portal
└── shared/            # Shared types and utilities
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB 6.0+
- Redis 7.0+
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd fleet-management

# Install dependencies
cd frontend && yarn install
cd ../backend && npm install
```

### 2. Environment Configuration

**Frontend (.env.local):**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-jwt-secret-key-here
MONGODB_URI=mongodb://localhost:27017/fleet_management
BACKEND_URL=http://localhost:5000
```

**Backend (.env):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/fleet_management
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-for-backend
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Start Services

**Option A: Development Mode**
```bash
# Terminal 1 - Start MongoDB & Redis
mongod
redis-server

# Terminal 2 - Start Backend
cd backend
npm run dev

# Terminal 3 - Start Frontend
cd frontend
yarn dev
```

**Option B: Docker (Recommended)**
```bash
docker-compose up -d
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Admin Portal**: http://localhost:3001

## 📱 User Roles & Features

### Vehicle Owner Dashboard
- Add and manage vehicles
- View booking requests
- Assign drivers to vehicles
- Track earnings and analytics
- Manage vehicle availability

### Driver Dashboard
- View assigned vehicles
- Accept/decline trip requests
- Update trip status (ongoing, completed)
- Navigation integration
- Earnings tracking

### Customer Dashboard
- Browse available vehicles with filters
- Create bookings with date/location
- Track active trips in real-time
- View booking history
- Rate and review completed trips

### Admin Dashboard
- User management and verification
- System analytics and reports
- Fleet performance monitoring
- Revenue tracking
- Platform configuration

## 🛠️ Technology Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **NextAuth** - Authentication
- **React Query** - Data fetching
- **Formik + Yup** - Form handling and validation
- **React Hot Toast** - Notifications

### Backend
- **Node.js + Express** - Server framework
- **TypeScript** - Type safety
- **MongoDB + Mongoose** - Database and ODM
- **Redis** - Caching and sessions
- **JWT** - Token-based authentication
- **Nodemailer** - Email notifications
- **Express Validator** - Input validation

### DevOps & Deployment
- **Docker** - Containerization
- **AWS ECR** - Container registry
- **MongoDB Atlas** - Cloud database (production)
- **Redis Cloud** - Managed Redis (production)

## 🔧 Development

### API Endpoints

**Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - Logout user

**Vehicles**
- `GET /api/vehicles` - List vehicles
- `POST /api/vehicles` - Create vehicle
- `GET /api/vehicles/:id` - Get vehicle details
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

**Bookings**
- `GET /api/bookings` - List user bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Database Schema

**Users Collection**
- Personal information and profile
- Role-based permissions
- Authentication credentials
- Soft delete support

**Vehicles Collection**
- Vehicle details and specifications
- Location and availability
- Pricing and features
- Performance metrics

**Bookings Collection**
- Trip details and scheduling
- Pricing and payment information
- Status tracking
- Customer and vehicle references

## 📋 Todo List

- [x] ✅ Project setup and architecture
- [x] ✅ Authentication system
- [x] ✅ Database models and schemas
- [x] ✅ Basic API routes
- [x] ✅ Frontend UI components
- [ ] 🔄 Complete vehicle CRUD operations
- [ ] 🔄 Booking system implementation
- [ ] 🔄 Real-time trip tracking
- [ ] 🔄 Payment integration
- [ ] 🔄 Admin dashboard
- [ ] 🔄 Email notifications
- [ ] 🔄 Mobile responsiveness
- [ ] 🔄 Testing suite
- [ ] 🔄 Docker deployment
- [ ] 🔄 Production optimization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@fleetmanager.com or join our Slack channel.

---

**Built with ❤️ using the MERN Stack**