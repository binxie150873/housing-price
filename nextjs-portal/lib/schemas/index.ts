import { z } from "zod";

/**
 * Zod validation schema for HouseFeatures input.
 * Constraints match Requirement 2.2 and the ML model input specification.
 */
export const houseFeaturesSchema = z.object({
  square_footage: z
    .number({ message: "Square footage is required" })
    .min(1, "Square footage must be at least 1")
    .max(100_000, "Square footage must be at most 100,000"),

  bedrooms: z
    .number({ message: "Bedrooms is required" })
    .int("Bedrooms must be a whole number")
    .min(1, "Bedrooms must be at least 1")
    .max(10, "Bedrooms must be at most 10"),

  bathrooms: z
    .number({ message: "Bathrooms is required" })
    .min(0.5, "Bathrooms must be at least 0.5")
    .max(10, "Bathrooms must be at most 10")
    .refine(
      (val) => val % 0.5 === 0,
      "Bathrooms must be in 0.5 increments"
    ),

  year_built: z
    .number({ message: "Year built is required" })
    .int("Year built must be a whole number")
    .min(1800, "Year built must be at least 1800")
    .max(new Date().getFullYear(), `Year built must be at most ${new Date().getFullYear()}`),

  lot_size: z
    .number({ message: "Lot size is required" })
    .min(1, "Lot size must be at least 1")
    .max(1_000_000, "Lot size must be at most 1,000,000"),

  distance_to_city_center: z
    .number({ message: "Distance to city center is required" })
    .min(0, "Distance to city center must be at least 0")
    .max(500, "Distance to city center must be at most 500"),

  school_rating: z
    .number({ message: "School rating is required" })
    .min(0, "School rating must be at least 0")
    .max(10, "School rating must be at most 10"),
});

/**
 * TypeScript type inferred from the Zod schema.
 * Can be used interchangeably with the HouseFeatures interface.
 */
export type HouseFeaturesInput = z.infer<typeof houseFeaturesSchema>;
