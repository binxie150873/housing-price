import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { houseFeaturesSchema } from "./index";

// Feature: nextjs-portal, Property 2: Form validation schema correctness

const currentYear = new Date().getFullYear();

describe("houseFeaturesSchema", () => {
  describe("unit tests", () => {
    it("accepts valid house features", () => {
      const valid = {
        square_footage: 2000,
        bedrooms: 3,
        bathrooms: 2.5,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7.5,
      };
      const result = houseFeaturesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects square_footage below 1", () => {
      const invalid = {
        square_footage: 0,
        bedrooms: 3,
        bathrooms: 2,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7,
      };
      const result = houseFeaturesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects square_footage above 100,000", () => {
      const invalid = {
        square_footage: 100_001,
        bedrooms: 3,
        bathrooms: 2,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7,
      };
      const result = houseFeaturesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects non-integer bedrooms", () => {
      const invalid = {
        square_footage: 2000,
        bedrooms: 2.5,
        bathrooms: 2,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7,
      };
      const result = houseFeaturesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects bathrooms not in 0.5 increments", () => {
      const invalid = {
        square_footage: 2000,
        bedrooms: 3,
        bathrooms: 2.3,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7,
      };
      const result = houseFeaturesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("accepts bathrooms at 0.5 boundary", () => {
      const valid = {
        square_footage: 2000,
        bedrooms: 3,
        bathrooms: 0.5,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7,
      };
      const result = houseFeaturesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects year_built before 1800", () => {
      const invalid = {
        square_footage: 2000,
        bedrooms: 3,
        bathrooms: 2,
        year_built: 1799,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7,
      };
      const result = houseFeaturesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects year_built after current year", () => {
      const invalid = {
        square_footage: 2000,
        bedrooms: 3,
        bathrooms: 2,
        year_built: currentYear + 1,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7,
      };
      const result = houseFeaturesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects distance_to_city_center below 0", () => {
      const invalid = {
        square_footage: 2000,
        bedrooms: 3,
        bathrooms: 2,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: -1,
        school_rating: 7,
      };
      const result = houseFeaturesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects school_rating above 10", () => {
      const invalid = {
        square_footage: 2000,
        bedrooms: 3,
        bathrooms: 2,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 10.1,
      };
      const result = houseFeaturesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("property-based tests", () => {
    /**
     * **Validates: Requirements 2.2**
     *
     * For any input value within the defined constraints, the Zod schema
     * SHALL accept the value.
     */
    it("accepts all valid inputs within constraints", () => {
      fc.assert(
        fc.property(
          fc.record({
            square_footage: fc.double({ min: 1, max: 100_000, noNaN: true }),
            bedrooms: fc.integer({ min: 1, max: 10 }),
            bathrooms: fc.integer({ min: 1, max: 20 }).map((n) => n * 0.5),
            year_built: fc.integer({ min: 1800, max: currentYear }),
            lot_size: fc.double({ min: 1, max: 1_000_000, noNaN: true }),
            distance_to_city_center: fc.double({ min: 0, max: 500, noNaN: true }),
            school_rating: fc.double({ min: 0, max: 10, noNaN: true }),
          }),
          (features) => {
            const result = houseFeaturesSchema.safeParse(features);
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.2**
     *
     * For any input value outside the defined constraints for square_footage,
     * the Zod schema SHALL reject the value.
     */
    it("rejects square_footage outside valid range", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.double({ max: 0.99, noNaN: true }),
            fc.double({ min: 100_000.01, noNaN: true, noDefaultInfinity: true })
          ),
          (invalidSqft) => {
            const features = {
              square_footage: invalidSqft,
              bedrooms: 3,
              bathrooms: 2,
              year_built: 2000,
              lot_size: 5000,
              distance_to_city_center: 10,
              school_rating: 7,
            };
            const result = houseFeaturesSchema.safeParse(features);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.2**
     *
     * For any input value outside the defined constraints for bedrooms,
     * the Zod schema SHALL reject the value.
     */
    it("rejects bedrooms outside valid range", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 11 })
          ),
          (invalidBedrooms) => {
            const features = {
              square_footage: 2000,
              bedrooms: invalidBedrooms,
              bathrooms: 2,
              year_built: 2000,
              lot_size: 5000,
              distance_to_city_center: 10,
              school_rating: 7,
            };
            const result = houseFeaturesSchema.safeParse(features);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.2**
     *
     * For any bathrooms value not in 0.5 increments, the Zod schema
     * SHALL reject the value.
     */
    it("rejects bathrooms not in 0.5 increments", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.5, max: 10, noNaN: true }).filter(
            (val) => val % 0.5 !== 0
          ),
          (invalidBathrooms) => {
            const features = {
              square_footage: 2000,
              bedrooms: 3,
              bathrooms: invalidBathrooms,
              year_built: 2000,
              lot_size: 5000,
              distance_to_city_center: 10,
              school_rating: 7,
            };
            const result = houseFeaturesSchema.safeParse(features);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.2**
     *
     * For any year_built outside the valid range [1800, currentYear],
     * the Zod schema SHALL reject the value.
     */
    it("rejects year_built outside valid range", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 1799 }),
            fc.integer({ min: currentYear + 1 })
          ),
          (invalidYear) => {
            const features = {
              square_footage: 2000,
              bedrooms: 3,
              bathrooms: 2,
              year_built: invalidYear,
              lot_size: 5000,
              distance_to_city_center: 10,
              school_rating: 7,
            };
            const result = houseFeaturesSchema.safeParse(features);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
