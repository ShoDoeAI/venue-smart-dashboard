import { z } from 'zod';

/**
 * OpenTable Zod Schemas
 * 
 * Note: This is a placeholder implementation as OpenTable doesn't have a public API
 */

// Guest info schema
export const openTableGuestInfoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

// Reservation schema
export const openTableReservationSchema = z.object({
  confirmationNumber: z.string(),
  restaurantId: z.string(),
  partySize: z.number().int().min(1).max(20),
  dateTime: z.string(),
  status: z.enum(['confirmed', 'seated', 'completed', 'cancelled', 'no_show']),
  guestInfo: openTableGuestInfoSchema,
  specialRequests: z.string().optional(),
  tablePreference: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.enum(['opentable', 'restaurant_website', 'phone', 'walk_in']).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

// Address schema
export const openTableAddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

// Restaurant schema
export const openTableRestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  cuisineType: z.array(z.string()),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']),
  neighborhood: z.string(),
  address: openTableAddressSchema,
  phone: z.string(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  hours: z.record(z.object({
    open: z.string(),
    close: z.string(),
  })),
  capacity: z.number().int().min(1),
  averageRating: z.number().min(0).max(5).optional(),
  totalReviews: z.number().int().min(0).optional(),
});

// Availability slot schema
export const openTableSlotSchema = z.object({
  time: z.string(),
  partySize: z.array(z.number().int().min(1)),
  available: z.boolean(),
  tablesAvailable: z.number().int().min(0).optional(),
});

// Availability schema
export const openTableAvailabilitySchema = z.object({
  date: z.string(),
  slots: z.array(openTableSlotSchema),
});

// Special occasion schema
export const openTableSpecialOccasionSchema = z.object({
  type: z.string(),
  date: z.string(),
});

// Guest schema
export const openTableGuestSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  joinDate: z.string(),
  totalReservations: z.number().int().min(0),
  noShows: z.number().int().min(0),
  cancellations: z.number().int().min(0),
  favoriteRestaurants: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  specialOccasions: z.array(openTableSpecialOccasionSchema).optional(),
  notes: z.string().optional(),
  vipStatus: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// Review rating schema
export const openTableRatingSchema = z.object({
  overall: z.number().min(1).max(5),
  food: z.number().min(1).max(5),
  service: z.number().min(1).max(5),
  ambiance: z.number().min(1).max(5),
  value: z.number().min(1).max(5),
});

// Management response schema
export const openTableManagementResponseSchema = z.object({
  message: z.string(),
  respondedAt: z.string(),
});

// Review schema
export const openTableReviewSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  guestId: z.string(),
  rating: openTableRatingSchema,
  comment: z.string().optional(),
  dinedOn: z.string(),
  reviewDate: z.string(),
  managementResponse: openTableManagementResponseSchema.optional(),
});

// Analytics overview schema
export const openTableAnalyticsOverviewSchema = z.object({
  totalReservations: z.number().int().min(0),
  totalCovers: z.number().int().min(0),
  totalRevenue: z.number().min(0).optional(),
  averagePartySize: z.number().min(0),
  averageRating: z.number().min(0).max(5),
  fillRate: z.number().min(0).max(100),
  noShowRate: z.number().min(0).max(100),
  cancellationRate: z.number().min(0).max(100),
});

// Peak hours schema
export const openTablePeakHoursSchema = z.object({
  dayOfWeek: z.string(),
  hour: z.string(),
  averageCovers: z.number().min(0),
});

// Guest demographics schema
export const openTableGuestDemographicsSchema = z.object({
  newGuests: z.number().int().min(0),
  returningGuests: z.number().int().min(0),
  vipGuests: z.number().int().min(0),
});

// Analytics schema
export const openTableAnalyticsSchema = z.object({
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  overview: openTableAnalyticsOverviewSchema,
  peakHours: z.array(openTablePeakHoursSchema),
  popularDishes: z.array(z.string()).optional(),
  guestDemographics: openTableGuestDemographicsSchema.optional(),
  sourceBreakdown: z.record(z.number()),
  revenueByDay: z.record(z.number()).optional(),
});

// Waitlist schema
export const openTableWaitlistEntrySchema = z.object({
  id: z.string(),
  guestName: z.string(),
  phone: z.string(),
  partySize: z.number().int().min(1),
  requestedTime: z.string(),
  quotedWait: z.number().int().min(0),
  actualWait: z.number().int().min(0).optional(),
  status: z.enum(['waiting', 'seated', 'cancelled', 'no_show']),
  addedAt: z.string(),
  seatedAt: z.string().optional(),
  notes: z.string().optional(),
});

// Table schema
export const openTableTableSchema = z.object({
  number: z.string(),
  capacity: z.number().int().min(1),
  section: z.string().optional(),
});

// Shift schema
export const openTableShiftSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  days: z.array(z.string()),
  maxCovers: z.number().int().min(0).optional(),
  tables: z.array(openTableTableSchema).optional(),
});

// Today stats schema
export const openTableTodayStatsSchema = z.object({
  totalReservations: z.number().int().min(0),
  totalCovers: z.number().int().min(0),
  completedReservations: z.number().int().min(0),
  noShows: z.number().int().min(0),
  cancellations: z.number().int().min(0),
  currentlySeated: z.number().int().min(0),
  upcomingToday: z.number().int().min(0),
});

// Top guest schema
export const openTableTopGuestSchema = z.object({
  guest: openTableGuestSchema,
  totalSpent: z.number().min(0).optional(),
  lastVisit: z.string(),
});

// Guest insights schema
export const openTableGuestInsightsSchema = z.object({
  topGuests: z.array(openTableTopGuestSchema),
  newGuestsThisMonth: z.number().int().min(0),
  returningGuestRate: z.number().min(0).max(100),
});

// Transformed data schema
export const transformedOpenTableDataSchema = z.object({
  restaurant: openTableRestaurantSchema,
  reservations: z.array(openTableReservationSchema),
  analytics: openTableAnalyticsSchema,
  upcomingReservations: z.array(openTableReservationSchema),
  todayStats: openTableTodayStatsSchema,
  guestInsights: openTableGuestInsightsSchema,
});

// API response schema
export const openTableApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }).optional(),
    pagination: z.object({
      page: z.number().int().min(1),
      perPage: z.number().int().min(1),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
    }).optional(),
  });