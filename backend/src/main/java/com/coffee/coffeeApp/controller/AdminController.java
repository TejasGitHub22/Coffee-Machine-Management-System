package com.coffee.coffeeApp.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.coffee.coffeeApp.service.FacilityService;
import com.coffee.coffeeApp.dto.FacilityDto;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "http://localhost:3000")
public class AdminController {

    @Autowired
    private FacilityService facilityService;

    @GetMapping("/locations")
    public ResponseEntity<List<Map<String, Object>>> getLocations() {
        try {
            List<FacilityDto> facilities = facilityService.getAllFacilities();
            
            // Group facilities by location and count them
            Map<String, List<FacilityDto>> facilitiesByLocation = facilities.stream()
                    .collect(Collectors.groupingBy(FacilityDto::getLocation));
            
            List<Map<String, Object>> locations = facilitiesByLocation.entrySet().stream()
                    .map(entry -> {
                        String location = entry.getKey();
                        List<FacilityDto> locationFacilities = entry.getValue();
                        
                        long totalMachines = locationFacilities.stream()
                                .mapToLong(facility -> facility.getTotalMachines() != null ? facility.getTotalMachines() : 0L)
                                .sum();
                        long activeMachines = locationFacilities.stream()
                                .mapToLong(facility -> facility.getActiveMachines() != null ? facility.getActiveMachines() : 0L)
                                .sum();
                        
                        Map<String, Object> locationMap = new HashMap<>();
                        locationMap.put("location", location);
                        locationMap.put("facilityCount", locationFacilities.size());
                        locationMap.put("totalMachines", totalMachines);
                        locationMap.put("activeMachines", activeMachines);
                        return locationMap;
                    })
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(locations);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/locations/{location}/facilities")
    public ResponseEntity<List<FacilityDto>> getFacilitiesByLocation(@PathVariable String location) {
        try {
            List<FacilityDto> facilities = facilityService.getAllFacilities();
            List<FacilityDto> locationFacilities = facilities.stream()
                    .filter(facility -> location.equalsIgnoreCase(facility.getLocation()))
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(locationFacilities);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
