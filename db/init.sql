-- ═══════════════════════════════════════════════════════════════════════════════
-- Database Initialization Script
-- Portal DB: estimation_history (App 1) + property_data (App 2)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: estimation_history
-- Purpose: Stores past property value estimations from App 1 (Estimator)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    square_footage NUMERIC NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms NUMERIC NOT NULL,
    year_built INTEGER NOT NULL,
    lot_size NUMERIC NOT NULL,
    distance_to_city_center NUMERIC NOT NULL,
    school_rating NUMERIC NOT NULL,
    predicted_price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    model_version VARCHAR(50) NOT NULL,
    feature_importance JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_price_positive CHECK (predicted_price > 0),
    CONSTRAINT chk_square_footage_positive CHECK (square_footage > 0),
    CONSTRAINT chk_bedrooms_range CHECK (bedrooms >= 1 AND bedrooms <= 10),
    CONSTRAINT chk_bathrooms_range CHECK (bathrooms >= 0.5 AND bathrooms <= 10),
    CONSTRAINT chk_year_built_range CHECK (year_built >= 1800 AND year_built <= 2100),
    CONSTRAINT chk_lot_size_positive CHECK (lot_size > 0),
    CONSTRAINT chk_distance_non_negative CHECK (distance_to_city_center >= 0),
    CONSTRAINT chk_school_rating_range CHECK (school_rating >= 0 AND school_rating <= 10)
);

-- Indexes for estimation_history
CREATE INDEX IF NOT EXISTS idx_history_created_at ON estimation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_predicted_price ON estimation_history(predicted_price);
CREATE INDEX IF NOT EXISTS idx_history_neighborhood ON estimation_history((feature_importance->>'neighborhood'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: property_data
-- Purpose: Stores property market data for App 2 (Market Analysis)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_data (
    id SERIAL PRIMARY KEY,
    square_footage NUMERIC NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms NUMERIC NOT NULL,
    year_built INTEGER,
    lot_size NUMERIC,
    distance_to_city_center NUMERIC,
    school_rating NUMERIC,
    price NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for property_data
CREATE INDEX IF NOT EXISTS idx_property_year_built ON property_data(year_built);
CREATE INDEX IF NOT EXISTS idx_property_price ON property_data(price);
CREATE INDEX IF NOT EXISTS idx_property_square_footage ON property_data(square_footage);
CREATE INDEX IF NOT EXISTS idx_property_bedrooms ON property_data(bedrooms);
CREATE INDEX IF NOT EXISTS idx_property_school_rating ON property_data(school_rating);

-- ─────────────────────────────────────────────────────────────────────────────
-- Composite indexes for common query patterns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_property_year_price ON property_data(year_built, price);
CREATE INDEX IF NOT EXISTS idx_property_sqft_price ON property_data(square_footage, price);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data: property_data (from HousePriceDataset.csv)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO property_data (square_footage, bedrooms, bathrooms, year_built, lot_size, distance_to_city_center, school_rating, price) VALUES
(1250, 2, 1, 1985, 5200, 3.2, 7.1, 185000),
(1850, 3, 2, 1998, 7500, 5.6, 8.2, 265000),
(1420, 3, 2, 1992, 6800, 2.8, 6.9, 210000),
(2100, 4, 2.5, 2005, 9200, 7.3, 8.5, 345000),
(1700, 3, 2, 2001, 7100, 4.1, 7.8, 275000),
(980, 2, 1, 1978, 4500, 2.5, 6.5, 165000),
(2400, 4, 3, 2010, 10500, 8.2, 9, 410000),
(1600, 3, 1.5, 1995, 6700, 3.8, 7.2, 225000),
(2200, 4, 2.5, 2008, 9800, 6.9, 8.7, 375000),
(1350, 3, 1, 1987, 5800, 3, 7, 195000),
(1950, 3, 2, 2003, 8100, 5.2, 8.1, 285000),
(1100, 2, 1, 1982, 4800, 2.1, 6.8, 175000),
(2350, 4, 3, 2012, 10200, 7.8, 9.1, 400000),
(1550, 3, 1.5, 1994, 6500, 3.6, 7.3, 220000),
(2050, 4, 2.5, 2006, 9000, 6.7, 8.6, 355000),
(1300, 2, 1, 1986, 5500, 2.9, 7.2, 190000),
(1800, 3, 2, 1999, 7300, 4.9, 8, 260000),
(1150, 2, 1, 1980, 4600, 2.3, 6.7, 170000),
(2300, 4, 3, 2011, 10000, 7.5, 9, 395000),
(1500, 3, 1.5, 1993, 6400, 3.5, 7.4, 215000),
(1650, 3, 2, 1997, 7000, 4, 7.7, 240000),
(2150, 4, 2.5, 2007, 9500, 7, 8.8, 365000),
(1200, 2, 1, 1984, 5000, 2.6, 6.9, 180000),
(1900, 3, 2, 2002, 7800, 5, 8.3, 280000),
(1400, 3, 1.5, 1990, 6000, 3.2, 7.1, 205000),
(2250, 4, 3, 2009, 9900, 7.2, 8.9, 385000),
(1750, 3, 2, 2000, 7200, 4.5, 7.9, 255000),
(1050, 2, 1, 1979, 4400, 2.2, 6.6, 160000),
(2050, 4, 2.5, 2004, 8800, 6.5, 8.4, 335000),
(1450, 3, 1.5, 1991, 6200, 3.4, 7.5, 215000),
(1330, 2, 1, 1988, 5600, 3.1, 7, 195000),
(1870, 3, 2, 2000, 7600, 5, 8.1, 270000),
(1380, 3, 1.5, 1992, 6100, 3.2, 7.3, 205000),
(2120, 4, 2.5, 2006, 9300, 7.1, 8.6, 350000),
(1680, 3, 2, 1998, 7050, 4.2, 7.6, 250000),
(1010, 2, 1, 1980, 4550, 2.4, 6.7, 170000),
(2380, 4, 3, 2011, 10300, 7.9, 9, 405000),
(1580, 3, 1.5, 1996, 6650, 3.7, 7.2, 230000),
(2180, 4, 2.5, 2007, 9700, 6.8, 8.7, 370000),
(1270, 2, 1, 1985, 5300, 2.8, 7, 190000),
(1930, 3, 2, 2002, 8000, 5.3, 8.2, 290000),
(1120, 2, 1, 1983, 4850, 2.2, 6.9, 175000),
(2320, 4, 3, 2010, 10100, 7.7, 9, 390000),
(1520, 3, 1.5, 1995, 6350, 3.5, 7.4, 225000),
(2070, 4, 2.5, 2005, 9100, 6.6, 8.5, 345000),
(1290, 2, 1, 1986, 5400, 3, 7.1, 195000),
(1820, 3, 2, 1999, 7400, 4.8, 8, 265000),
(1130, 2, 1, 1981, 4700, 2.3, 6.8, 170000),
(2280, 4, 3, 2009, 9950, 7.4, 8.9, 385000),
(1480, 3, 1.5, 1992, 6300, 3.4, 7.5, 220000);
