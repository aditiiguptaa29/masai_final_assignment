import * as Yup from 'yup'

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
})

export const registerSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  role: Yup.string()
    .oneOf(['vehicle_owner', 'driver', 'customer'], 'Invalid role')
    .required('Role is required'),
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .required('Last name is required'),
  phone: Yup.string()
    .matches(/^[+]?[\d\s()-]+$/, 'Invalid phone number')
    .required('Phone is required'),
  street: Yup.string().required('Street address is required'),
  city: Yup.string().required('City is required'),
  state: Yup.string().required('State is required'),
  zipCode: Yup.string().required('Zip code is required'),
  country: Yup.string().required('Country is required'),
})

export const vehicleSchema = Yup.object().shape({
  make: Yup.string().required('Make is required'),
  model: Yup.string().required('Model is required'),
  year: Yup.number()
    .min(1900, 'Invalid year')
    .max(new Date().getFullYear() + 2, 'Invalid year')
    .required('Year is required'),
  color: Yup.string().required('Color is required'),
  licensePlate: Yup.string().required('License plate is required'),
  vin: Yup.string()
    .length(17, 'VIN must be exactly 17 characters')
    .required('VIN is required'),
  type: Yup.string()
    .oneOf(['sedan', 'suv', 'truck', 'van', 'motorcycle', 'bus'])
    .required('Vehicle type is required'),
  passengers: Yup.number()
    .min(1)
    .max(50)
    .required('Passenger capacity is required'),
  cargo: Yup.number().min(0).required('Cargo capacity is required'),
  baseRate: Yup.number().min(0).required('Base rate is required'),
  rateType: Yup.string()
    .oneOf(['hourly', 'daily'])
    .required('Rate type is required'),
})

export const bookingSchema = Yup.object().shape({
  vehicleId: Yup.string().required('Vehicle is required'),
  pickupAddress: Yup.string().required('Pickup address is required'),
  dropoffAddress: Yup.string().required('Dropoff address is required'),
  startDate: Yup.date()
    .min(new Date(), 'Start date must be in the future')
    .required('Start date is required'),
  endDate: Yup.date()
    .min(Yup.ref('startDate'), 'End date must be after start date')
    .required('End date is required'),
  paymentMethod: Yup.string()
    .oneOf(['credit_card', 'cash', 'bank_transfer'])
    .required('Payment method is required'),
  customerNotes: Yup.string().max(500, 'Notes must be less than 500 characters'),
})