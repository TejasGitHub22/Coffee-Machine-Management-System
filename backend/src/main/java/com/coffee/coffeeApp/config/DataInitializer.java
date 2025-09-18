package com.coffee.coffeeApp.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.coffee.coffeeApp.entity.User;
import com.coffee.coffeeApp.entity.CoffeeMachine;
import com.coffee.coffeeApp.entity.Facility;
import com.coffee.coffeeApp.repository.UserRepository;
import com.coffee.coffeeApp.repository.CoffeeMachineRepository;
import com.coffee.coffeeApp.repository.FacilityRepository;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CoffeeMachineRepository coffeeMachineRepository;

    @Autowired
    private FacilityRepository facilityRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Check if default admin user exists
        if (!userRepository.findByUsername("Ashutosh").isPresent()) {
            User adminUser = new User();
            adminUser.setUsername("Ashutosh");
            adminUser.setEmail("admin@coffeeapp.com");
            adminUser.setPassword(passwordEncoder.encode("p@ssword123"));
            adminUser.setRole("ROLE_ADMIN");
            adminUser.setIsActive(true);

            userRepository.save(adminUser);
            System.out.println("✅ Default admin user created: Ashutosh");
        }

        // Initialize facilities for 2 locations
        if (facilityRepository.count() == 0) {
            // Pune facilities
            Facility puneFacility1 = new Facility();
            puneFacility1.setName("Pune Office Branch");
            puneFacility1.setLocation("Pune");
            puneFacility1.setIsActive(true);
            puneFacility1.setCreationDate(LocalDateTime.now());
            puneFacility1.setLastUpdate(LocalDateTime.now());
            facilityRepository.save(puneFacility1);
            
            Facility puneFacility2 = new Facility();
            puneFacility2.setName("Pune Tech Park");
            puneFacility2.setLocation("Pune");
            puneFacility2.setIsActive(true);
            puneFacility2.setCreationDate(LocalDateTime.now());
            puneFacility2.setLastUpdate(LocalDateTime.now());
            facilityRepository.save(puneFacility2);

            // Mumbai facilities
            Facility mumbaiFacility1 = new Facility();
            mumbaiFacility1.setName("Mumbai Central Office");
            mumbaiFacility1.setLocation("Mumbai");
            mumbaiFacility1.setIsActive(true);
            mumbaiFacility1.setCreationDate(LocalDateTime.now());
            mumbaiFacility1.setLastUpdate(LocalDateTime.now());
            facilityRepository.save(mumbaiFacility1);
            
            Facility mumbaiFacility2 = new Facility();
            mumbaiFacility2.setName("Mumbai Financial District");
            mumbaiFacility2.setLocation("Mumbai");
            mumbaiFacility2.setIsActive(true);
            mumbaiFacility2.setCreationDate(LocalDateTime.now());
            mumbaiFacility2.setLastUpdate(LocalDateTime.now());
            facilityRepository.save(mumbaiFacility2);

            System.out.println("✅ Facilities created for Pune and Mumbai locations");
        }

        // Initialize coffee machines for all facilities
        if (coffeeMachineRepository.count() == 0) {
            var facilities = facilityRepository.findAll();
            String[] machineNames = {"Alpha", "Beta", "Gamma", "Delta", "Echo", "Foxtrot", 
                                   "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima"};
            
            int machineIndex = 0;
            for (Facility facility : facilities) {
                for (int i = 0; i < 3; i++) {
                    CoffeeMachine machine = new CoffeeMachine();
                    machine.setFacilityId(facility.getId());
                    machine.setName(machineNames[machineIndex]);
                    machine.setStatus("ON");
                    machine.setTemperature(95.0f);
                    machine.setWaterLevel(100.0f);
                    machine.setMilkLevel(100.0f);
                    machine.setBeansLevel(100.0f);
                    machine.setSugarLevel(100.0f);
                    machine.setIsActive(true);
                    machine.setCreationDate(LocalDateTime.now());
                    machine.setLastUpdate(LocalDateTime.now());

                    CoffeeMachine savedMachine = coffeeMachineRepository.save(machine);
                    System.out.println("✅ Coffee machine created: " + savedMachine.getName() + " at " + facility.getName());
                    machineIndex++;
                }
            }
        }
    }
}
