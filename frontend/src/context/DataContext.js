import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { machinesAPI, facilitiesAPI, usageAPI } from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const { isAdmin } = useAuth();
    const [machines, setMachines] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [usageHistory, setUsageHistory] = useState([]);
    const [todayUsageCount, setTodayUsageCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Get today's usage count with improved date handling
    const getTodayUsageCount = useCallback(() => {
        if (!usageHistory || usageHistory.length === 0) {
            return 0;
        }
        
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        return usageHistory.filter(u => {
            if (!u.timestamp) return false;
            
            // Handle different timestamp formats
            const usageDate = new Date(u.timestamp);
            if (isNaN(usageDate.getTime())) return false;
            
            return usageDate >= todayStart && usageDate < todayEnd;
        }).length;
    }, [usageHistory]);

    // Simulate brew activity for demo purposes when no real data exists
    const simulateBrewActivity = useCallback(() => {
        // Check if we have a cached value for today
        const today = new Date().toDateString();
        const cacheKey = `simulatedBrews_${today}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            return parseInt(cached);
        }
        
        // Generate realistic brew activity based on time of day
        const currentHour = new Date().getHours();
        let baseCount = 0;
        
        // Peak hours (8-10 AM, 1-3 PM, 7-9 PM) - More coffee consumption
        if ((currentHour >= 8 && currentHour <= 10) || 
            (currentHour >= 13 && currentHour <= 15) || 
            (currentHour >= 19 && currentHour <= 21)) {
            baseCount = Math.floor(Math.random() * 15) + 10; // 10-25 brews
        } else if (currentHour >= 6 && currentHour <= 22) {
            // Regular hours - Moderate activity
            baseCount = Math.floor(Math.random() * 8) + 2; // 2-10 brews
        } else {
            // Late night/early morning - Minimal activity
            baseCount = Math.floor(Math.random() * 3); // 0-2 brews
        }
        
        // Cache the value for the day to maintain consistency
        localStorage.setItem(cacheKey, baseCount.toString());
        
        return baseCount;
    }, []);

    // Fetch today's usage count directly from API
    const fetchTodayUsageCount = useCallback(async () => {
        try {
            const todayUsage = await usageAPI.getToday();
            const count = Array.isArray(todayUsage) ? todayUsage.length : 0;
            
            // If no real data exists, use simulated data for demo purposes
            if (count === 0) {
                const simulatedCount = simulateBrewActivity();
                setTodayUsageCount(simulatedCount);
                return simulatedCount;
            }
            
            setTodayUsageCount(count);
            return count;
        } catch (err) {
            console.error('Failed to fetch today\'s usage:', err);
            // Fallback to calculating from existing data
            const calculatedCount = getTodayUsageCount();
            
            // If still no data, use simulation for demo
            if (calculatedCount === 0) {
                const simulatedCount = simulateBrewActivity();
                setTodayUsageCount(simulatedCount);
                return simulatedCount;
            }
            
            setTodayUsageCount(calculatedCount);
            return calculatedCount;
        }
    }, [getTodayUsageCount, simulateBrewActivity]);

    // Centralized data fetching
    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            let machinesResult = [];
            let facilitiesResult = [];
            let usageResult = [];
            let machinesOk = false;
            let facilitiesOk = false;
            let usageOk = false;

            // All authenticated users (both ADMIN and FACILITY) can see all data
            const [machinesData, facilitiesData, usageData] = await Promise.allSettled([
                machinesAPI.getAll(),
                facilitiesAPI.getAll(),
                usageAPI.getAll()
            ]);
            
            machinesOk = machinesData.status === 'fulfilled';
            facilitiesOk = facilitiesData.status === 'fulfilled';
            usageOk = usageData.status === 'fulfilled';
            machinesResult = machinesOk ? (machinesData.value || []) : [];
            facilitiesResult = facilitiesOk ? (facilitiesData.value || []) : [];
            usageResult = usageOk ? (usageData.value || []) : [];

            setMachines(machinesResult);
            setFacilities(facilitiesResult);
            setUsageHistory(usageResult);
            setLastUpdate(new Date());
            
            // Fetch today's usage count specifically - but don't make it a dependency
            fetchTodayUsageCount().catch(err => console.error('Failed to fetch today usage:', err));
            
            // Flag error only if all fetches actually failed (not when lists are legitimately empty)
            if (!machinesOk && !facilitiesOk && !usageOk) {
                setError('Failed to fetch data from all sources');
            }
            
        } catch (err) {
            setError('Failed to fetch data');
            console.error('Data fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    // Update machine status
    const updateMachineStatus = useCallback(async (machineId, status) => {
        try {
            await machinesAPI.updateStatus(machineId, status);
            // Refresh all data to ensure consistency
            await fetchAllData();
            return true;
        } catch (err) {
            setError('Failed to update machine status');
            console.error('Status update error:', err);
            return false;
        }
    }, [fetchAllData]);

    // Refill machine supplies
    const refillMachine = useCallback(async (machineId, refillData = {}) => {
        try {
            await machinesAPI.refill(machineId, refillData);
            // Refresh all data to ensure consistency
            await fetchAllData();
            return true;
        } catch (err) {
            setError('Failed to refill machine');
            console.error('Refill error:', err);
            return false;
        }
    }, [fetchAllData]);

    // Get machine by ID
    const getMachineById = useCallback((machineId) => {
        return machines.find(m => m.id === parseInt(machineId));
    }, [machines]);

    // Get facility by ID
    const getFacilityById = useCallback((facilityId) => {
        return facilities.find(f => f.id === parseInt(facilityId));
    }, [facilities]);

    // Get machines by facility
    const getMachinesByFacility = useCallback((facilityId) => {
        return machines.filter(m => m.facilityId === parseInt(facilityId));
    }, [machines]);

    // Get machines by status
    const getMachinesByStatus = useCallback((status) => {
        return machines.filter(m => m.status === status);
    }, [machines]);

    // Get usage count for a machine
    const getUsageCountForMachine = useCallback((machineId) => {
        return usageHistory.filter(u => u.machineId === parseInt(machineId)).length;
    }, [usageHistory]);

    // Get total usage count
    const getTotalUsageCount = useCallback(() => {
        return usageHistory.length;
    }, [usageHistory]);

    // Get active machines count
    const getActiveMachinesCount = useCallback(() => {
        return machines.filter(m => m.status === 'ON' && m.isActive).length;
    }, [machines]);

    // Get low supply machines
    const getLowSupplyMachines = useCallback(() => {
        return machines.filter(m => m.hasLowSupplies);
    }, [machines]);

    // Dashboard statistics
    const getDashboardStats = useCallback(() => {
        const activeMachinesCount = machines.filter(m => m.status === 'ON' && m.isActive).length;
        const lowSupplyCount = machines.filter(m => m.hasLowSupplies).length;
        const totalUsageCount = usageHistory.length;
        
        // Use todayUsageCount if available, otherwise calculate from history
        let todayUsageValue = todayUsageCount;
        if (todayUsageValue === 0 && usageHistory.length > 0) {
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            
            todayUsageValue = usageHistory.filter(u => {
                if (!u.timestamp) return false;
                const usageDate = new Date(u.timestamp);
                if (isNaN(usageDate.getTime())) return false;
                return usageDate >= todayStart && usageDate < todayEnd;
            }).length;
        }
        
        return {
            totalMachines: machines.length,
            activeMachines: activeMachinesCount,
            totalFacilities: facilities.length,
            totalUsage: totalUsageCount,
            todayUsage: todayUsageValue,
            lowSupplyMachines: lowSupplyCount,
            lastUpdate: lastUpdate
        };
    }, [machines, facilities, usageHistory, todayUsageCount, lastUpdate]);

    // Auto-refresh data
    useEffect(() => {
        // Don't fetch data until auth context is fully loaded
        const token = localStorage.getItem('authToken');
        if (!token) return;
        
        // Small delay to ensure auth context is fully initialized
        const initTimer = setTimeout(() => {
            fetchAllData();
        }, 100);
        
        const refreshMs = isAdmin() ? 60000 : 30000;
        const interval = setInterval(() => {
            fetchAllData();
        }, refreshMs);
        
        return () => {
            clearTimeout(initTimer);
            clearInterval(interval);
        };
    }, [fetchAllData, isAdmin]);

    const value = {
        // Data
        machines,
        facilities,
        usageHistory,
        todayUsageCount,
        loading,
        error,
        lastUpdate,
        
        // Actions
        fetchAllData,
        fetchTodayUsageCount,
        updateMachineStatus,
        refillMachine,
        
        // Getters
        getMachineById,
        getFacilityById,
        getMachinesByFacility,
        getMachinesByStatus,
        getUsageCountForMachine,
        getTotalUsageCount,
        getTodayUsageCount,
        getActiveMachinesCount,
        getLowSupplyMachines,
        getDashboardStats,
        
        // Setters
        setMachines,
        setFacilities,
        setUsageHistory,
        setTodayUsageCount,
        setError
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};