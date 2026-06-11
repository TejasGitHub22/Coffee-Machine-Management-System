[README (1).md](https://github.com/user-attachments/files/28826842/README.1.md)
# ☕ Coffee Machine Management System

A full-stack IoT-based application for real-time monitoring and management of coffee machines deployed across multiple facilities. Built with **Spring Boot**, **MQTT**, **React**, and **MySQL**.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Simulator Setup](#simulator-setup)
- [API Endpoints](#api-endpoints)
- [Role-Based Access Control](#role-based-access-control)
- [Default Credentials](#default-credentials)
- [MQTT Integration](#mqtt-integration)
- [Alert System](#alert-system)

---

## Overview

The Coffee Machine Management System enables administrators and technicians to monitor coffee machine telemetry (water, milk, beans, sugar levels, temperature) in real time via MQTT. It provides automated alerting, usage history tracking, facility-wise machine management, and a React-based dashboard.

---

## Architecture

```
┌─────────────────┐        MQTT (SSL)        ┌──────────────────────┐
│   MQTT Simulator │ ──────────────────────► │  HiveMQ Cloud Broker │
│  (Spring Boot)   │                          └──────────┬───────────┘
└─────────────────┘                                      │
                                                         ▼ Subscribe
                                              ┌──────────────────────┐
                                              │   Spring Boot Backend │
                                              │  (REST API + Security)│
                                              └──────────┬───────────┘
                                                         │ JPA
                                                         ▼
                                              ┌──────────────────────┐
                                              │       MySQL DB        │
                                              └──────────────────────┘
                                                         ▲
                                              ┌──────────┴───────────┐
                                              │   React 19 Frontend   │
                                              │  (REST API consumer)  │
                                              └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.5 |
| Security | Spring Security, JWT (JJWT 0.12.6) |
| ORM | Spring Data JPA, Hibernate |
| Database | MySQL 8 |
| IoT Protocol | MQTT (Eclipse Paho Client 1.2.5) |
| MQTT Broker | HiveMQ Cloud (SSL/TLS) |
| Frontend | React 19, React Router 7 |
| Build Tools | Maven (Backend), Webpack 5 (Frontend) |
| Utilities | Lombok, Jackson, Bean Validation |

---

## Features

### Machine Management
- Register, update, and deactivate coffee machines
- Track real-time supply levels: water, milk, beans, sugar
- Monitor temperature and operational status (ON/OFF)
- Refill supplies through dedicated API

### Facility Management
- Organize machines across multiple facilities/locations
- Facility-wise usage and alert reporting

### Real-Time IoT Integration
- MQTT subscriber listens to `coffeemachine/+/data` topic
- Processes live telemetry from machines every 30 seconds
- Exponential backoff retry logic for connection resilience
- Thread-pool based concurrent message processing

### Alert System
- Auto-generated alerts for:
  - Low water / milk / beans / sugar (< 20%)
  - High temperature (> 140°C)
  - Machine malfunction / offline
- Alert acknowledgement workflow

### Usage History
- Tracks every brew event with type, quantity, and timestamp
- Usage analytics per machine and facility

### Authentication & Authorization
- JWT-based stateless authentication
- Role-based access: **ADMIN** and **TECHNICIAN**
- Admins manage all resources; Technicians see only their facility

### Dashboard
- Summary of machines, alerts, and usage across all facilities

---

## Project Structure

```
Coffee-Machine-Management-System/
│
├── backend/                          # Spring Boot Application
│   └── src/main/java/com/coffee/coffeeApp/
│       ├── config/                   # Security, CORS, Data Initializer, MQTT config
│       ├── controller/               # REST Controllers
│       ├── dto/                      # Data Transfer Objects
│       ├── entity/                   # JPA Entities
│       ├── exception/                # Global Exception Handler
│       ├── repository/               # Spring Data JPA Repositories
│       ├── security/                 # JWT Filter, Auth Service, UserDetails
│       └── service/                  # Business Logic Services
│
├── frontend/                         # React 19 Application
│   └── src/
│       ├── components/               # Navbar, LoadingSpinner, RefillModal
│       ├── context/                  # AuthContext, DataContext
│       ├── hooks/                    # useApi custom hook
│       ├── pages/                    # Dashboard, Machines, Facilities, Alerts, Usage, Users
│       ├── services/                 # API service layer (Axios calls)
│       └── utils/                    # Helper utilities
│
└── simulator/                        # MQTT Machine Simulator
    └── src/main/java/com/coffeemachine/simulator/
        ├── controller/               # Analytics Controller
        ├── model/                    # CoffeeMachine, MachineData
        ├── repository/               # JPA Repositories
        └── service/                  # MachineSimulatorService (publishes every 30s)
```

---

## Prerequisites

- Java 17+
- Maven 3.8+
- MySQL 8+
- Node.js 18+ & npm
- HiveMQ Cloud account (or any MQTT broker)

---

## Getting Started

### Backend Setup

1. **Create the MySQL database:**
   ```sql
   CREATE DATABASE coffeeappdb;
   ```

2. **Configure `application.properties`:**
   ```properties
   # backend/src/main/resources/application.properties
   spring.datasource.url=jdbc:mysql://localhost:3306/coffeeappdb?useSSL=false&serverTimezone=UTC
   spring.datasource.username=YOUR_DB_USERNAME
   spring.datasource.password=YOUR_DB_PASSWORD

   jwt.secretKey=YOUR_JWT_SECRET_KEY

   mqtt.broker.url=ssl://YOUR_HIVEMQ_BROKER_URL:8883
   mqtt.username=YOUR_MQTT_USERNAME
   mqtt.password=YOUR_MQTT_PASSWORD
   ```

3. **Run the backend:**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   Backend starts at: `http://localhost:8080`

   > On first run, the `DataInitializer` automatically seeds default facilities, machines, and an admin user.

---

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```
   Frontend starts at: `http://localhost:3000`

---

### Simulator Setup

The simulator publishes real machine telemetry to the MQTT broker every **30 seconds**, simulating gradual consumption of supplies.

1. **Configure simulator `application.properties`:**
   ```properties
   # simulator/src/main/resources/application.properties
   mqtt.broker.url=ssl://YOUR_HIVEMQ_BROKER_URL:8883
   mqtt.username=YOUR_MQTT_USERNAME
   mqtt.password=YOUR_MQTT_PASSWORD
   ```

2. **Run the simulator:**
   ```bash
   cd simulator
   ./mvnw spring-boot:run
   ```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login and get JWT token |
| POST | `/api/auth/signup` | Register new user |

### Machines
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/machines` | Get all machines (role-filtered) | Required |
| GET | `/api/machines/{id}` | Get machine by ID | Public |
| POST | `/api/machines` | Create machine | ADMIN |
| PUT | `/api/machines/{id}` | Update machine | ADMIN |
| DELETE | `/api/machines/{id}` | Delete machine | ADMIN |
| POST | `/api/machines/{id}/refill` | Refill supplies | Public |
| POST | `/api/machines/{id}/status` | Update status | Public |
| POST | `/api/machines/brew` | Process brew command | Public |
| GET | `/api/machines/low-supplies` | Get machines with low supplies | Public |

### Facilities
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/facilities` | Get all facilities |
| POST | `/api/facilities` | Create facility |
| PUT | `/api/facilities/{id}` | Update facility |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts` | Get all alerts |
| POST | `/api/alerts/{id}/acknowledge` | Acknowledge alert |

### Usage History
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/usage` | Get all usage records |
| GET | `/api/usage/machine/{id}` | Usage by machine |

---

## Role-Based Access Control

| Feature | ADMIN | TECHNICIAN |
|---|---|---|
| View all machines | ✅ | ❌ (own facility only) |
| Create / Delete machines | ✅ | ❌ |
| Manage facilities | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| View alerts | ✅ | ✅ |
| Refill / Update machine | ✅ | ✅ |

---

## Default Credentials

On first run, a default admin account is created:

| Field | Value |
|---|---|
| Username | `Ashutosh` |
| Password | `p@ssword123` |
| Role | `ROLE_ADMIN` |

> ⚠️ Change these credentials immediately in a production environment.

---

## MQTT Integration

The backend subscribes to the topic pattern:
```
coffeemachine/+/data
```

Each machine publishes a JSON payload:
```json
{
  "machineId": 1,
  "waterLevel": 75.5,
  "milkLevel": 60.0,
  "beansLevel": 45.2,
  "sugarLevel": 80.0,
  "temperature": 92.5,
  "status": "ON"
}
```

The backend processes each message asynchronously using a thread pool and updates the machine state in MySQL. If the broker is unreachable on startup, the service retries up to 5 times with exponential backoff.

---

## Alert System

Alerts are auto-generated when thresholds are breached:

| Alert Type | Trigger Condition |
|---|---|
| Low Water | Water level < 20% |
| Low Milk | Milk level < 20% |
| Low Beans | Beans level < 20% |
| Low Sugar | Sugar level < 20% |
| High Temperature | Temperature > 140°C |
| Malfunction | Error in machine operation |
| Offline | Machine unreachable |

Alerts can be acknowledged via the dashboard or directly through the API.
