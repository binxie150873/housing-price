package com.portal.market.repository;

import com.portal.market.repository.entity.PropertyDataEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface PropertyDataRepository extends JpaRepository<PropertyDataEntity, Long>,
        JpaSpecificationExecutor<PropertyDataEntity> {

    // Custom query methods will be added in subsequent tasks
}
