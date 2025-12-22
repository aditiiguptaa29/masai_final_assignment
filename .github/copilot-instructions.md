## Fleet Management System

This is a comprehensive Fleet Management System built with the MERN stack.

### Tech Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS 3.4
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB 7.0+ with Mongoose ODM
- **Caching**: Redis 6.x for performance optimization
- **Authentication**: JWT-based auth with role-based access control
- **Forms**: Formik + Yup validation
- **HTTP Client**: Axios with interceptors
- **Deployment**: Docker + Docker Compose (AWS ECR/ECS planned)
- **Package Managers**: Yarn (frontend), npm (backend)

### Project Structure
```
feetvehiclee/
├── frontend/          # Next.js 14 application
│   ├── src/app/       # App Router with role-based routes
│   ├── components/    # Reusable UI components
│   ├── lib/           # API client & validations
│   └── providers/     # React Context providers
├── backend/           # Express.js TypeScript API
│   ├── src/
│   │   ├── controllers/  # Business logic
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth, validation, errors
│   │   └── config/       # DB & Redis config
├── admin/             # React Admin portal (planned)
└── shared/            # Shared TypeScript types (planned)
```

### Completed Features

#### Backend ✅
- Express server with TypeScript
- MongoDB models: User, Vehicle, Booking, Trip
- JWT authentication with refresh tokens
- Redis caching layer
- Rate limiting & security (Helmet, CORS)
- API routes: auth, users, vehicles, bookings, trips, analytics
- Middleware: authentication, authorization, validation, error handling
- **Status**: Running on http://localhost:5000

#### Frontend ✅
**Authentication**
- Multi-step registration with role selection
- Login with JWT token management
- Protected routes by role
- Automatic token refresh on 401

**Vehicle Owner Dashboard**
- Dashboard with stats (vehicles, bookings, revenue)
- Vehicle list with search & filters
- Add new vehicle form (with image upload UI)
- Edit vehicle page
- Bookings management (accept/reject, assign drivers)
- Settings page

**Driver Dashboard**
- Dashboard with active trips & earnings
- Trip list with status filters
- Start/complete trip actions
- Trip details with navigation
- Settings page

**Customer Dashboard**
- Dashboard overview
- Browse vehicles with filters (type, price, location)
- Vehicle detail page with booking form
- Date picker for booking dates
- Price calculation
- My bookings page with filtering
- Cancel booking functionality
- Settings page

**Shared Components**
- DashboardLayout with role-based navigation
- ProtectedRoute wrapper
- Reusable Button component
- Form inputs with validation
- API client with Axios interceptors
- Comprehensive Yup validation schemas

### API Endpoints
All routes prefixed with `/api`

**Auth**: /auth/register, /auth/login, /auth/logout, /auth/profile, /auth/change-password
**Users**: CRUD operations with role-based access
**Vehicles**: List, create, update, delete with owner filtering
**Bookings**: Create, list, update, cancel with role-specific views
**Trips**: Manage trip lifecycle and status updates
**Analytics**: Owner and driver analytics endpoints

### Environment Setup

#### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/fleet-management
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### Running the Project

1. **Start MongoDB & Redis**
   ```bash
   brew services start mongodb-community
   brew services start redis
   ```

2. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev  # Runs on port 5000
   ```

3. **Frontend**
   ```bash
   cd frontend
   yarn install
   yarn dev  # Runs on port 3000
   ```

4. **Docker (Alternative)**
   ```bash
   docker-compose up --build
   ```

### Key Implementation Details

**Authentication Flow**:
- User registers → JWT token generated
- Token stored in localStorage
- Axios interceptor adds Bearer token to requests
- 401 errors trigger token refresh
- Role-based route protection

**Data Models**:
- User: email, password (hashed), role, profile, soft delete
- Vehicle: owner ref, specs, location (geospatial), pricing, status
- Booking: customer/vehicle refs, dates, locations, payment tracking
- Trip: booking/driver refs, timestamps, distance, status

**Security**:
- Password hashing with bcrypt
- JWT with 7-day expiration
- Rate limiting (100 req/15min)
- Helmet for HTTP headers
- CORS configuration
- Input validation & sanitization

### Pending Tasks

- [ ] Install frontend dependencies (network issue during setup)
- [ ] Analytics charts with chart library (recharts/chart.js)
- [ ] Image upload to AWS S3
- [ ] Payment integration (Stripe)
- [ ] Real-time notifications (Socket.io)
- [ ] React Admin portal
- [ ] Unit & integration tests
- [ ] CI/CD pipeline
- [ ] AWS deployment

### Development Guidelines

**Code Style**:
- TypeScript strict mode enabled
- Functional components with hooks
- Async/await for promises
- Proper error handling with try/catch
- Descriptive variable names

**File Naming**:
- PascalCase for components: `DashboardLayout.tsx`
- camelCase for utilities: `api.ts`
- kebab-case for routes: `change-password`

**Best Practices**:
- One component per file
- Extract reusable logic into hooks
- Use TypeScript interfaces for props
- Validate all user inputs
- Handle loading & error states
- Mobile-first responsive design

### Troubleshooting

**MongoDB Connection Issues**:
```bash
mongosh  # Verify MongoDB is running
brew services restart mongodb-community
```

**Redis Connection Issues**:
```bash
redis-cli ping  # Should return PONG
brew services restart redis
```

**Port Already in Use**:
```bash
lsof -ti:3000 | xargs kill  # Kill process on port 3000
lsof -ti:5000 | xargs kill  # Kill process on port 5000
```

### Project Status

✅ Backend: 100% complete and running
✅ Frontend: 95% complete (all pages created)
⏳ Dependencies: Need to install with yarn/npm
⏳ API Integration: Replace mock data with real API calls
⏳ Analytics: Add chart visualizations
⏳ Testing: Write unit and integration tests