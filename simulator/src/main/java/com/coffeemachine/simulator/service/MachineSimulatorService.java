package com.coffeemachine.simulator.service;

import com.coffeemachine.simulator.model.MachineData;
import com.coffeemachine.simulator.repository.MachineDataRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import jakarta.annotation.PostConstruct;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class MachineSimulatorService {

    private final ObjectMapper objectMapper;
    private final MachineDataRepository machineDataRepository;
    private MqttClient mqttClient;
    
    // Store the current levels for each machine to simulate decreasing consumption
    private final Map<Integer, Map<String, Double>> machineStates = new HashMap<>();

    // MQTT Config from application.properties
    @Value("${mqtt.broker.url}")
    private String brokerUrl;

    private String clientId = "mqtt-simulator-client" + UUID.randomUUID();

    @Value("${mqtt.username}")
    private String username;

    @Value("${mqtt.password}")
    private String password;

    public MachineSimulatorService(ObjectMapper objectMapper, MachineDataRepository machineDataRepository) {
        this.objectMapper = objectMapper;
        this.machineDataRepository = machineDataRepository;
    }

    @PostConstruct
    public void init() {
        // Initialize MQTT client after properties are injected
        initializeMqttClient();
    }

    private void initializeMqttClient() {
        try {
            mqttClient = new MqttClient(brokerUrl, clientId);

            // Set up connection options with authentication
            MqttConnectOptions options = new MqttConnectOptions();
            options.setUserName(username);
            options.setPassword(password.toCharArray());
            options.setCleanSession(true);

            mqttClient.connect(options);
            System.out.println("✅ MQTT Client connected to: " + brokerUrl);
        } catch (MqttException e) {
            System.err.println("❌ Failed to connect MQTT client: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Runs every 30 seconds
    @Scheduled(fixedRate = 30000) // 30 seconds - more realistic for coffee machine monitoring
    public void simulateMachines() {
        try {
            if (mqttClient == null || !mqttClient.isConnected()) {
                System.out.println("⚠️ MQTT client not connected, attempting to reconnect...");
                initializeMqttClient();
                return;
            }

            System.out.println("🔄 Starting simulation cycle for 12 machines...");

            // Simulate 12 coffee machines across 4 facilities
            for (int machineId = 1; machineId <= 12; machineId++) {
                // Determine facility ID based on machine ID
                int facilityId = ((machineId - 1) / 3) + 1; // 3 machines per facility
                
                // Generate random machine data with integer values
                Map<String, Object> messageMap = generateMachineData(machineId, facilityId);

                try {
                    // Save analytics data to local database
                    MachineData machineData = new MachineData(
                            machineId,
                            (Integer) messageMap.get("facilityId"),
                            (String) messageMap.get("status"),
                            ((Number) messageMap.get("temperature")).doubleValue(),
                            ((Number) messageMap.get("waterLevel")).doubleValue(),
                            ((Number) messageMap.get("milkLevel")).doubleValue(),
                            ((Number) messageMap.get("beansLevel")).doubleValue(),
                            ((Number) messageMap.get("sugarLevel")).doubleValue(),
                            (String) messageMap.get("brewType"));

                    machineDataRepository.save(machineData);
                    System.out.println("💾 Saved analytics data for machine " + machineId);

                    // Convert to JSON for MQTT
                    String jsonMessage = objectMapper.writeValueAsString(messageMap);

                    // Publish to HiveMQ - let the backend handle real-time updates
                    String topic = "coffeemachine/" + machineId + "/data";
                    MqttMessage mqttMessage = new MqttMessage(jsonMessage.getBytes());
                    mqttMessage.setQos(1);
                    mqttClient.publish(topic, mqttMessage);

                    System.out.println("✅ Published to topic: " + topic + " → " + jsonMessage);

                } catch (Exception e) {
                    System.err.println("❌ Error processing machine " + machineId + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Error in simulation cycle: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private Map<String, Object> generateMachineData(int machineId, int facilityId) {
        Map<String, Object> messageMap = new LinkedHashMap<>();
        Random random = new Random();

        // Initialize machine state if not exists
        machineStates.putIfAbsent(machineId, initializeMachineState());
        Map<String, Double> currentState = machineStates.get(machineId);

        // Generate realistic coffee machine data with decreasing consumption
        messageMap.put("machineId", machineId);
        messageMap.put("facilityId", facilityId);
        
        // Status is mainly ON to simulate active usage
        boolean isOn = random.nextInt(100) < 85; // 85% chance to be ON for realistic usage
        String status = isOn ? "ON" : "OFF";
        messageMap.put("status", status);
        
        messageMap.put("temperature", 85 + random.nextInt(31)); // 85-115°C (temperature doesn't decrease)

        // Simulate decreasing levels when machine is ON
        if ("ON".equals(status)) {
            // Simulate consumption - levels decrease with each cycle
            simulateConsumption(currentState, random);
            
            // Generate brew type when machine is ON
            String[] brewTypes = { "AMERICANO", "LATTE", "BLACK_COFFEE", "CAPPUCCINO", "ESPRESSO" };
            String brewType = brewTypes[random.nextInt(brewTypes.length)];
            messageMap.put("brewType", brewType);
        } else {
            // When machine is OFF, levels stay the same or refill occasionally
            if (random.nextInt(100) < 10) { // 10% chance to refill when OFF
                refillSupplies(currentState, random);
            }
            messageMap.put("brewType", "None");
        }
        
        // Set the current levels (rounded to integers)
        messageMap.put("waterLevel", currentState.get("waterLevel").intValue());
        messageMap.put("milkLevel", currentState.get("milkLevel").intValue());
        messageMap.put("beansLevel", currentState.get("beansLevel").intValue());
        messageMap.put("sugarLevel", currentState.get("sugarLevel").intValue());

        messageMap.put("timestamp", LocalDateTime.now().toString());

        return messageMap;
    }
    
    private Map<String, Double> initializeMachineState() {
        Map<String, Double> state = new HashMap<>();
        Random random = new Random();
        
        // Initialize with random starting levels but ensure they're not too low
        state.put("waterLevel", 60.0 + random.nextDouble() * 40.0);  // 60-100%
        state.put("milkLevel", 60.0 + random.nextDouble() * 40.0);   // 60-100%
        state.put("beansLevel", 60.0 + random.nextDouble() * 40.0);  // 60-100%
        state.put("sugarLevel", 60.0 + random.nextDouble() * 40.0);  // 60-100%
        
        return state;
    }
    
    private void simulateConsumption(Map<String, Double> state, Random random) {
        // Simulate realistic consumption rates - 3-7% per 30-second cycle
        double waterConsumption = 3.0 + random.nextDouble() * 4.0;    // 3-7% per 30s cycle
        double milkConsumption = 3.0 + random.nextDouble() * 4.0;     // 3-7% per 30s cycle
        double beansConsumption = 3.0 + random.nextDouble() * 4.0;    // 3-7% per 30s cycle
        double sugarConsumption = 3.0 + random.nextDouble() * 4.0;    // 3-7% per 30s cycle
        
        // Apply consumption and auto-refill when reaching zero
        double newWaterLevel = state.get("waterLevel") - waterConsumption;
        double newMilkLevel = state.get("milkLevel") - milkConsumption;
        double newBeansLevel = state.get("beansLevel") - beansConsumption;
        double newSugarLevel = state.get("sugarLevel") - sugarConsumption;
        
        // Auto-refill to 100% when hitting zero (simulates maintenance refill)
        state.put("waterLevel", newWaterLevel <= 0 ? 100.0 : newWaterLevel);
        state.put("milkLevel", newMilkLevel <= 0 ? 100.0 : newMilkLevel);
        state.put("beansLevel", newBeansLevel <= 0 ? 100.0 : newBeansLevel);
        state.put("sugarLevel", newSugarLevel <= 0 ? 100.0 : newSugarLevel);
    }
    
    private void refillSupplies(Map<String, Double> state, Random random) {
        // Randomly refill supplies when machine is OFF (maintenance)
        if (random.nextBoolean()) state.put("waterLevel", Math.min(100.0, state.get("waterLevel") + 20.0 + random.nextDouble() * 30.0));
        if (random.nextBoolean()) state.put("milkLevel", Math.min(100.0, state.get("milkLevel") + 15.0 + random.nextDouble() * 25.0));
        if (random.nextBoolean()) state.put("beansLevel", Math.min(100.0, state.get("beansLevel") + 20.0 + random.nextDouble() * 30.0));
        if (random.nextBoolean()) state.put("sugarLevel", Math.min(100.0, state.get("sugarLevel") + 10.0 + random.nextDouble() * 20.0));
    }
}
