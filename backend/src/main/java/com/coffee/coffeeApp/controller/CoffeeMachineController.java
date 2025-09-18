package com.coffee.coffeeApp.controller;

import com.coffee.coffeeApp.dto.CoffeeMachineDto;
import com.coffee.coffeeApp.dto.BrewCommandDto;
import com.coffee.coffeeApp.service.CoffeeMachineService;
import com.coffee.coffeeApp.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/machines")
@CrossOrigin(origins = "*")
public class CoffeeMachineController {

    @Autowired
    private CoffeeMachineService coffeeMachineService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<CoffeeMachineDto> createMachine(@Valid @RequestBody CoffeeMachineDto machineDto) {
        CoffeeMachineDto createdMachine = coffeeMachineService.createCoffeeMachine(machineDto);
        return ResponseEntity.ok(createdMachine);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CoffeeMachineDto> getMachineById(@PathVariable String id) {
        return coffeeMachineService.getMachineById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<CoffeeMachineDto>> getAllMachines(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<CoffeeMachineDto> machines;
        
        // Admin can see all machines, technicians can only see their facility's machines
        if ("ROLE_ADMIN".equals(user.getRole())) {
            machines = coffeeMachineService.getAllMachines();
        } else {
            // TECHNICIAN role - only show machines from their facility
            if (user.getFacility() == null) {
                return ResponseEntity.ok(List.of()); // Return empty list if no facility assigned
            }
            machines = coffeeMachineService.getMachinesByFacilityId(String.valueOf(user.getFacility().getId()));
        }
        
        return ResponseEntity.ok(machines);
    }

    @GetMapping("/facility/{facilityId}")
    public ResponseEntity<List<CoffeeMachineDto>> getMachinesByFacility(@PathVariable String facilityId) {
        List<CoffeeMachineDto> machines = coffeeMachineService.getMachinesByFacilityId(facilityId);
        return ResponseEntity.ok(machines);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<CoffeeMachineDto>> getMachinesByStatus(@PathVariable String status) {
        List<CoffeeMachineDto> machines = coffeeMachineService.getMachinesByStatus(status);
        return ResponseEntity.ok(machines);
    }

    @GetMapping("/operational")
    public ResponseEntity<List<CoffeeMachineDto>> getOperationalMachines() {
        List<CoffeeMachineDto> machines = coffeeMachineService.getOperationalMachines();
        return ResponseEntity.ok(machines);
    }

    @GetMapping("/low-supplies")
    public ResponseEntity<List<CoffeeMachineDto>> getMachinesWithLowSupplies() {
        List<CoffeeMachineDto> machines = coffeeMachineService.getMachinesWithLowSupplies();
        return ResponseEntity.ok(machines);
    }

    @PostMapping("/{id}/levels")
    public ResponseEntity<CoffeeMachineDto> updateMachineLevels(
            @PathVariable String id,
            @RequestParam Float waterLevel,
            @RequestParam Float milkLevel,
            @RequestParam Float beansLevel,
            @RequestParam Float temperature) {
        CoffeeMachineDto updatedMachine = coffeeMachineService.updateMachineLevels(id, waterLevel, milkLevel, beansLevel, temperature);
        return ResponseEntity.ok(updatedMachine);
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<CoffeeMachineDto> updateMachineStatus(
            @PathVariable String id,
            @RequestParam String status) {
        CoffeeMachineDto updatedMachine = coffeeMachineService.updateMachineStatus(id, status);
        return ResponseEntity.ok(updatedMachine);
    }

    @PostMapping("/{id}/refill")
    public ResponseEntity<CoffeeMachineDto> refillMachine(
            @PathVariable String id,
            @RequestParam(required = false) Float waterLevel,
            @RequestParam(required = false) Float milkLevel,
            @RequestParam(required = false) Float beansLevel,
            @RequestParam(required = false) Float sugarLevel) {
        CoffeeMachineDto updatedMachine = coffeeMachineService.refillMachine(id, waterLevel, milkLevel, beansLevel, sugarLevel);
        return ResponseEntity.ok(updatedMachine);
    }

    @PostMapping("/brew")
    public ResponseEntity<CoffeeMachineService.BrewResult> processBrew(@Valid @RequestBody BrewCommandDto brewCommand) {
        CoffeeMachineService.BrewResult result = coffeeMachineService.processBrew(brewCommand);
        return ResponseEntity.ok(result);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<CoffeeMachineDto> updateMachine(@PathVariable String id, @Valid @RequestBody CoffeeMachineDto machineDto) {
        CoffeeMachineDto updatedMachine = coffeeMachineService.updateMachine(id, machineDto);
        return ResponseEntity.ok(updatedMachine);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMachine(@PathVariable String id) {
        coffeeMachineService.deleteMachine(id);
        return ResponseEntity.noContent().build();
    }
}