package com.coffeemachine.simulator.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class SimulatorDataInitializer implements CommandLineRunner {

    @Override
    public void run(String... args) throws Exception {
        System.out.println("🎯 MQTT Coffee Machine Simulator starting up...");
        System.out.println("📡 Will simulate 12 coffee machines across 4 facilities and publish data every 30 seconds");
        System.out.println("🌐 Data will be sent to backend via MQTT for analytics and storage");
        System.out.println("🏢 Facilities: Pune (Alpha, Beta, Gamma), Mumbai (Delta, Echo, Foxtrot)");
        System.out.println("🏢          Pune Tech (Golf, Hotel, India), Mumbai Financial (Juliet, Kilo, Lima)");
    }
}
