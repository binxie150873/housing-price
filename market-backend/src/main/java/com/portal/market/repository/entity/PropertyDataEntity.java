package com.portal.market.repository.entity;

import com.portal.market.service.PropertyDataChangeListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "property_data")
@EntityListeners(PropertyDataChangeListener.class)
public class PropertyDataEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "square_footage", nullable = false)
    private BigDecimal squareFootage;

    @Column(name = "bedrooms", nullable = false)
    private Integer bedrooms;

    @Column(name = "bathrooms", nullable = false)
    private BigDecimal bathrooms;

    @Column(name = "year_built")
    private Integer yearBuilt;

    @Column(name = "lot_size")
    private BigDecimal lotSize;

    @Column(name = "distance_to_city_center")
    private BigDecimal distanceToCityCenter;

    @Column(name = "school_rating")
    private BigDecimal schoolRating;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "created_at")
    private Instant createdAt;

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getSquareFootage() { return squareFootage; }
    public void setSquareFootage(BigDecimal squareFootage) { this.squareFootage = squareFootage; }

    public Integer getBedrooms() { return bedrooms; }
    public void setBedrooms(Integer bedrooms) { this.bedrooms = bedrooms; }

    public BigDecimal getBathrooms() { return bathrooms; }
    public void setBathrooms(BigDecimal bathrooms) { this.bathrooms = bathrooms; }

    public Integer getYearBuilt() { return yearBuilt; }
    public void setYearBuilt(Integer yearBuilt) { this.yearBuilt = yearBuilt; }

    public BigDecimal getLotSize() { return lotSize; }
    public void setLotSize(BigDecimal lotSize) { this.lotSize = lotSize; }

    public BigDecimal getDistanceToCityCenter() { return distanceToCityCenter; }
    public void setDistanceToCityCenter(BigDecimal distanceToCityCenter) { this.distanceToCityCenter = distanceToCityCenter; }

    public BigDecimal getSchoolRating() { return schoolRating; }
    public void setSchoolRating(BigDecimal schoolRating) { this.schoolRating = schoolRating; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
