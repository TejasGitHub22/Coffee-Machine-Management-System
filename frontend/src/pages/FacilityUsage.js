import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const FacilityUsage = () => {
    const { 
        usageHistory, 
        machines, 
        facilities,
        loading, 
        error, 
        getMachinesByFacility,
        getFacilityById
    } = useData();

    const { user } = useAuth();
    
    const [analyticsData, setAnalyticsData] = useState(null);
    const [simulatorError, setSimulatorError] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        endDate: new Date().toISOString().split('T')[0] // today
    });
    const [filteredUsage, setFilteredUsage] = useState(null);
    const [quickFilters] = useState([
        { label: 'Today', days: 0 },
        { label: 'Last 7 Days', days: 7 },
        { label: 'Last 30 Days', days: 30 },
        { label: 'Last 90 Days', days: 90 }
    ]);

    // Get user facility information
    const userFacilityId = user?.facilityId;
    const userFacilityName = user?.facilityName;
    const userFacility = userFacilityId ? getFacilityById(userFacilityId) : null;
    const facilityMachines = userFacilityId ? getMachinesByFacility(userFacilityId) : [];

    useEffect(() => {
        fetchSimulatorAnalytics();
    }, []);

    useEffect(() => {
        calculateFilteredUsage();
    }, [dateRange, analyticsData, facilityMachines]);

    const fetchSimulatorAnalytics = async () => {
        try {
            const [brewTypes, resourceAverages, recentActivity] = await Promise.all([
                fetch('http://localhost:8081/api/analytics/usage/brew-types').then(res => res.json()),
                fetch('http://localhost:8081/api/analytics/resources/averages').then(res => res.json()),
                fetch('http://localhost:8081/api/analytics/recent-activity').then(res => res.json())
            ]);

            setAnalyticsData({
                brewTypes,
                resourceAverages,
                recentActivity
            });
            setSimulatorError(null);
        } catch (err) {
            // Use mock data when simulator is not available
            const mockData = {
                brewTypes: {
                    'Espresso': 25,
                    'Cappuccino': 20,
                    'Latte': 18,
                    'Americano': 15,
                    'Mocha': 12,
                    'Macchiato': 10
                },
                resourceAverages: {
                    waterLevel: 75.5,
                    milkLevel: 60.2,
                    beansLevel: 85.8,
                    sugarLevel: 45.3,
                    temperature: 92.5
                },
                recentActivity: generateMockActivity()
            };
            
            setAnalyticsData(mockData);
            setSimulatorError('Using demo data - Simulator not connected');
            console.log('Using mock data instead of simulator analytics:', err);
        }
    };

    const generateMockActivity = () => {
        const brewTypes = ['Espresso', 'Cappuccino', 'Latte', 'Americano', 'Mocha', 'Macchiato'];
        const statuses = ['Brewing', 'Completed', 'Ready'];
        const activity = [];
        
        // Generate last 24 hours of activity
        const now = new Date();
        for (let i = 0; i < 50; i++) {
            const timestamp = new Date(now.getTime() - (i * 30 * 60 * 1000)); // Every 30 minutes
            const machineId = facilityMachines.length > 0 
                ? facilityMachines[Math.floor(Math.random() * facilityMachines.length)].id 
                : `M${Math.floor(Math.random() * 5) + 1}`;
            
            activity.push({
                timestamp: timestamp.toISOString(),
                machineId: machineId,
                brewType: brewTypes[Math.floor(Math.random() * brewTypes.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)]
            });
        }
        
        return activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    const handleDateChange = (field, value) => {
        setDateRange(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleQuickFilter = (days) => {
        const endDate = new Date();
        const startDate = days === 0 
            ? new Date(endDate.getTime()) 
            : new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        
        setDateRange({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        });
    };

    const calculateFilteredUsage = () => {
        if (!analyticsData || !analyticsData.recentActivity || !userFacilityId) {
            // Fallback to basic facility data
            const facilityUsageCount = usageHistory.filter(u => 
                facilityMachines.some(m => m.id === u.machineId)
            ).length;
            
            setFilteredUsage({
                totalBrews: facilityUsageCount,
                averagePerDay: 0,
                mostPopularBrew: 'N/A',
                activeMachines: facilityMachines.filter(m => m.status === 'ON').length,
                totalMachines: facilityMachines.length,
                efficiency: Math.round((facilityMachines.filter(m => m.status === 'ON').length / facilityMachines.length) * 100) || 0,
                brewTypeCounts: {}
            });
            return;
        }

        const startDateTime = new Date(dateRange.startDate).getTime();
        const endDateTime = new Date(dateRange.endDate).getTime() + 24 * 60 * 60 * 1000; // Include end date

        // Filter activities to only include facility machines
        const facilityMachineIds = facilityMachines.map(m => m.id);
        const filteredActivities = analyticsData.recentActivity.filter(activity => {
            if (!activity || !activity.timestamp || !activity.machineId) return false;
            const activityTime = new Date(activity.timestamp).getTime();
            return activityTime >= startDateTime && 
                   activityTime <= endDateTime && 
                   activity.brewType && 
                   activity.brewType !== 'None' &&
                   facilityMachineIds.includes(activity.machineId);
        });

        const totalBrews = filteredActivities.length;
        const daysDiff = Math.max(1, Math.ceil((endDateTime - startDateTime) / (24 * 60 * 60 * 1000)));
        const averagePerDay = Math.round((totalBrews / daysDiff) * 10) / 10;

        // Calculate most popular brew type in the selected period for this facility
        const brewTypeCounts = {};
        filteredActivities.forEach(activity => {
            if (activity.brewType) {
                brewTypeCounts[activity.brewType] = (brewTypeCounts[activity.brewType] || 0) + 1;
            }
        });

        const mostPopularBrew = Object.keys(brewTypeCounts).length > 0
            ? Object.keys(brewTypeCounts).reduce((a, b) => brewTypeCounts[a] > brewTypeCounts[b] ? a : b)
            : 'N/A';

        setFilteredUsage({
            totalBrews,
            averagePerDay,
            mostPopularBrew,
            activeMachines: facilityMachines.filter(m => m.status === 'ON').length,
            totalMachines: facilityMachines.length,
            efficiency: Math.round((facilityMachines.filter(m => m.status === 'ON').length / facilityMachines.length) * 100) || 0,
            brewTypeCounts
        });
    };

    const formatPercentage = (value) => {
        return Math.round(value * 100) / 100;
    };

    const formatDateRange = () => {
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        
        if (dateRange.startDate === dateRange.endDate) {
            return start.toLocaleDateString();
        }
        
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    };

    const getStatusColor = (status) => {
        return status === 'ON' ? '#28a745' : '#dc3545';
    };

    const getResourceColor = (level) => {
        if (level >= 70) return '#28a745';
        if (level >= 30) return '#ffc107';
        return '#dc3545';
    };

    const getTemperatureColor = (temp) => {
        if (temp >= 85 && temp <= 95) return '#28a745';
        if (temp >= 80 && temp <= 100) return '#ffc107';
        return '#dc3545';
    };

    // Filter analytics data for this facility
    const getFacilityAnalyticsData = () => {
        if (!analyticsData || !userFacilityId) return null;

        const facilityMachineIds = facilityMachines.map(m => m.id);
        
        // Filter recent activity for facility machines
        const facilityRecentActivity = analyticsData.recentActivity.filter(activity => 
            facilityMachineIds.includes(activity.machineId)
        );

        return {
            ...analyticsData,
            recentActivity: facilityRecentActivity
        };
    };

    const facilityAnalyticsData = getFacilityAnalyticsData();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="container">
                <div className="page-header">
                    <div className="page-title">
                        <h1>
                            <i className="fas fa-chart-bar"></i>
                            Facility Usage Analytics
                        </h1>
                        <p>View coffee brewing history and usage statistics for your facility</p>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Error</h3>
                    </div>
                    <div className="card-body">
                        <div className="alert alert-danger">
                            <i className="fas fa-exclamation-triangle"></i>
                            {error}
                        </div>
                        <button className="btn btn-primary" onClick={fetchSimulatorAnalytics}>
                            <i className="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!userFacilityId || !userFacilityName) {
        return (
            <div className="container">
                <div className="page-header">
                    <div className="page-title">
                        <h1>
                            <i className="fas fa-chart-bar"></i>
                            Facility Usage Analytics
                        </h1>
                        <p>View coffee brewing history and usage statistics for your facility</p>
                    </div>
                </div>

                <div className="card">
                    <div className="card-body">
                        <div className="alert alert-warning">
                            <i className="fas fa-exclamation-triangle"></i>
                            No facility information found. Please contact your administrator.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="facility-usage-container">
            <div className="page-header">
                <div className="page-title">
                    <h1>
                        <i className="fas fa-chart-bar"></i>
                        {userFacilityName} - Usage Analytics
                    </h1>
                    <p>Real-time insights into coffee machine usage, resource consumption, and performance metrics for {userFacilityName} facility</p>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={fetchSimulatorAnalytics}>
                            <i className="fas fa-sync-alt"></i>
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="row">
                <div className="col-12">
                    <div className="card filter-card">
                        <div className="filter-content">
                            <div className="date-inputs">
                                <div className="date-group">
                                    <label>Start Date:</label>
                                    <input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                                        className="form-control"
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="date-group">
                                    <label>End Date:</label>
                                    <input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                                        className="form-control"
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>
                            
                            <div className="quick-filters">
                                <span className="quick-filter-label">Quick Select:</span>
                                {quickFilters.map((filter, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickFilter(filter.days)}
                                        className="quick-filter-btn"
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="selected-period">
                            <i className="fas fa-info-circle"></i>
                            <span>Analyzing data for: <strong>{formatDateRange()}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage Statistics for Selected Period */}
            <div className="row">
                <div className="col-lg-3 col-md-6">
                    <div className="stat-card primary">
                        <div className="stat-icon">
                            <i className="fas fa-coffee"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{filteredUsage?.totalBrews || 0}</h3>
                            <p>Total Brews</p>
                            <small>In selected period</small>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6">
                    <div className="stat-card success">
                        <div className="stat-icon">
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{filteredUsage?.averagePerDay || 0}</h3>
                            <p>Avg per Day</p>
                            <small>Daily average</small>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6">
                    <div className="stat-card warning">
                        <div className="stat-icon">
                            <i className="fas fa-star"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{filteredUsage?.mostPopularBrew || 'N/A'}</h3>
                            <p>Most Popular</p>
                            <small>Top brew type</small>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6">
                    <div className="stat-card info">
                        <div className="stat-icon">
                            <i className="fas fa-percentage"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{filteredUsage?.efficiency || 0}%</h3>
                            <p>Machine Efficiency</p>
                            <small>{filteredUsage?.activeMachines || 0}/{filteredUsage?.totalMachines || 0} active</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Brew Type Usage for Selected Period */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <i className="fas fa-coffee"></i> Brew Type Analysis
                            </h3>
                            <p className="card-subtitle">Coffee preferences in {userFacilityName} during {formatDateRange()}</p>
                        </div>
                        <div className="card-body">
                            {filteredUsage && Object.keys(filteredUsage.brewTypeCounts).length > 0 ? (
                                <div className="brew-type-stats">
                                    {Object.entries(filteredUsage.brewTypeCounts)
                                        .sort(([,a], [,b]) => b - a)
                                        .map(([brewType, count], index) => (
                                        <div key={brewType} className="brew-stat-item">
                                            <div className="brew-info">
                                                <span className="brew-name">{brewType}</span>
                                                <span className="brew-count">{count} brews</span>
                                            </div>
                                            <div className="brew-bar">
                                                <div 
                                                    className="brew-progress"
                                                    style={{ 
                                                        width: `${(count / Math.max(...Object.values(filteredUsage.brewTypeCounts))) * 100}%`,
                                                        backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="brew-percentage">
                                                {Math.round((count / filteredUsage.totalBrews) * 100)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="alert alert-info">
                                    <i className="fas fa-info-circle"></i>
                                    {simulatorError || `No brew data available for ${userFacilityName} in the selected time period. Try a different date range or ensure the simulator is running.`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Resource Levels */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <i className="fas fa-tachometer-alt"></i> Average Resource Levels
                            </h3>
                            <p className="card-subtitle">Resource consumption across {userFacilityName} machines</p>
                        </div>
                        <div className="card-body">
                            {analyticsData && analyticsData.resourceAverages ? (
                                <div className="resource-grid">
                                    <div className="resource-item">
                                        <div className="resource-icon">
                                            <i className="fas fa-tint"></i>
                                        </div>
                                        <div className="resource-info">
                                            <span className="resource-name">Water Level</span>
                                            <span className="resource-value">{formatPercentage(analyticsData.resourceAverages.waterLevel)}%</span>
                                        </div>
                                        <div className="resource-bar">
                                            <div 
                                                className="resource-progress" 
                                                style={{ 
                                                    width: `${analyticsData.resourceAverages.waterLevel}%`,
                                                    backgroundColor: getResourceColor(analyticsData.resourceAverages.waterLevel)
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="resource-item">
                                        <div className="resource-icon">
                                            <i className="fas fa-milk"></i>
                                        </div>
                                        <div className="resource-info">
                                            <span className="resource-name">Milk Level</span>
                                            <span className="resource-value">{formatPercentage(analyticsData.resourceAverages.milkLevel)}%</span>
                                        </div>
                                        <div className="resource-bar">
                                            <div 
                                                className="resource-progress" 
                                                style={{ 
                                                    width: `${analyticsData.resourceAverages.milkLevel}%`,
                                                    backgroundColor: getResourceColor(analyticsData.resourceAverages.milkLevel)
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="resource-item">
                                        <div className="resource-icon">
                                            <i className="fas fa-seedling"></i>
                                        </div>
                                        <div className="resource-info">
                                            <span className="resource-name">Beans Level</span>
                                            <span className="resource-value">{formatPercentage(analyticsData.resourceAverages.beansLevel)}%</span>
                                        </div>
                                        <div className="resource-bar">
                                            <div 
                                                className="resource-progress" 
                                                style={{ 
                                                    width: `${analyticsData.resourceAverages.beansLevel}%`,
                                                    backgroundColor: getResourceColor(analyticsData.resourceAverages.beansLevel)
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="resource-item">
                                        <div className="resource-icon">
                                            <i className="fas fa-cube"></i>
                                        </div>
                                        <div className="resource-info">
                                            <span className="resource-name">Sugar Level</span>
                                            <span className="resource-value">{formatPercentage(analyticsData.resourceAverages.sugarLevel)}%</span>
                                        </div>
                                        <div className="resource-bar">
                                            <div 
                                                className="resource-progress" 
                                                style={{ 
                                                    width: `${analyticsData.resourceAverages.sugarLevel}%`,
                                                    backgroundColor: getResourceColor(analyticsData.resourceAverages.sugarLevel)
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="resource-item">
                                        <div className="resource-icon">
                                            <i className="fas fa-thermometer-half"></i>
                                        </div>
                                        <div className="resource-info">
                                            <span className="resource-name">Temperature</span>
                                            <span className="resource-value">{formatPercentage(analyticsData.resourceAverages.temperature)}°C</span>
                                        </div>
                                        <div className="resource-bar">
                                            <div 
                                                className="resource-progress" 
                                                style={{ 
                                                    width: `${(analyticsData.resourceAverages.temperature - 85) / 30 * 100}%`,
                                                    backgroundColor: getTemperatureColor(analyticsData.resourceAverages.temperature)
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="alert alert-info">
                                    <i className="fas fa-info-circle"></i>
                                    {simulatorError || 'Loading resource level data...'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <i className="fas fa-history"></i> Recent Activity in {userFacilityName}
                            </h3>
                            <p className="card-subtitle">Last 24 hours from facility machines</p>
                        </div>
                        <div className="card-body">
                            {facilityAnalyticsData && facilityAnalyticsData.recentActivity ? (
                                <div className="activity-list">
                                    {facilityAnalyticsData.recentActivity.slice(0, 10).map((activity, index) => (
                                        <div key={index} className="activity-item">
                                            <div className="activity-icon">
                                                <i className="fas fa-coffee"></i>
                                            </div>
                                            <div className="activity-info">
                                                <span className="activity-machine">Machine {activity.machineId}</span>
                                                <span className="activity-status">{activity.status}</span>
                                                {activity.brewType && activity.brewType !== 'None' && (
                                                    <span className="activity-brew">Brewed {activity.brewType}</span>
                                                )}
                                            </div>
                                            <div className="activity-time">
                                                {new Date(activity.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="alert alert-info">
                                    <i className="fas fa-info-circle"></i>
                                    {simulatorError || `Loading recent activity for ${userFacilityName}...`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .facility-usage-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 1rem;
                    width: 100%;
                }

                .facility-usage-container .page-header {
                    margin-bottom: 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 40px;
                    border-radius: 20px;
                    position: relative;
                }

                .facility-usage-container .page-title {
                    position: relative;
                }

                .page-title h1 {
                    color: white;
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .page-title p {
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 1.1rem;
                    margin-bottom: 20px;
                }

                .header-actions {
                    display: flex;
                    gap: 15px;
                    align-items: center;
                }

                .btn {
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-decoration: none;
                }

                .btn-secondary {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                .btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.3);
                    border-color: rgba(255, 255, 255, 0.5);
                }

                .btn-primary {
                    background: #667eea;
                    color: white;
                }

                .btn-primary:hover {
                    background: #5a6fd8;
                }

                /* Filter Card */
                .filter-card {
                    background: linear-gradient(135deg, #f8f9ff 0%, #e9ecef 100%);
                    border: none;
                    border-radius: 20px;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.1);
                    margin-bottom: 30px;
                    overflow: hidden;
                }

                .filter-content {
                    padding: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 25px;
                }

                .date-inputs {
                    display: flex;
                    gap: 20px;
                    align-items: end;
                }

                .date-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .date-group label {
                    font-weight: 600;
                    color: #495057;
                    font-size: 0.9rem;
                }

                .form-control {
                    padding: 12px 16px;
                    border: 2px solid #e9ecef;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: white;
                }

                .form-control:focus {
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                    outline: none;
                }

                .quick-filters {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                }

                .quick-filter-label {
                    font-weight: 600;
                    color: #495057;
                    margin-right: 10px;
                }

                .quick-filter-btn {
                    padding: 8px 16px;
                    background: white;
                    border: 2px solid #e9ecef;
                    border-radius: 25px;
                    font-weight: 500;
                    color: #495057;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }

                .quick-filter-btn:hover {
                    border-color: #667eea;
                    color: #667eea;
                    background: rgba(102, 126, 234, 0.05);
                }

                .selected-period {
                    background: rgba(102, 126, 234, 0.1);
                    padding: 15px 30px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #495057;
                    font-weight: 500;
                }

                .selected-period i {
                    color: #667eea;
                }

                /* Stat Cards */
                .stat-card {
                    background: white;
                    border-radius: 20px;
                    padding: 30px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    border: none;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 30px;
                    min-height: 120px;
                }

                .stat-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                }

                .stat-icon {
                    width: 70px;
                    height: 70px;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.8rem;
                    color: white;
                    flex-shrink: 0;
                }

                .stat-card.primary .stat-icon {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .stat-card.success .stat-icon {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                }

                .stat-card.warning .stat-icon {
                    background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
                }

                .stat-card.info .stat-icon {
                    background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);
                }

                .stat-content {
                    flex: 1;
                }

                .stat-content h3 {
                    font-size: 2.2rem;
                    font-weight: 700;
                    color: #2c3e50;
                    margin-bottom: 5px;
                    line-height: 1;
                }

                .stat-content p {
                    font-size: 1.1rem;
                    color: #495057;
                    font-weight: 600;
                    margin-bottom: 5px;
                }

                .stat-content small {
                    color: #6c757d;
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                /* Cards */
                .card {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    border: none;
                    margin-bottom: 30px;
                    overflow: hidden;
                }

                .card-header {
                    background: linear-gradient(135deg, #f8f9ff 0%, #e9ecef 100%);
                    padding: 25px 30px;
                    border-bottom: 1px solid #e9ecef;
                }

                .card-title {
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: #2c3e50;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .card-title i {
                    color: #667eea;
                }

                .card-subtitle {
                    color: #6c757d;
                    font-size: 0.95rem;
                    margin-top: 5px;
                    font-weight: 500;
                }

                .card-body {
                    padding: 30px;
                }

                /* Brew Type Stats */
                .brew-type-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .brew-stat-item {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                }

                .brew-stat-item:hover {
                    background: #e9ecef;
                    transform: translateX(5px);
                }

                .brew-info {
                    min-width: 150px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .brew-name {
                    font-weight: 600;
                    color: #2c3e50;
                    font-size: 1rem;
                }

                .brew-count {
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .brew-bar {
                    flex: 1;
                    height: 12px;
                    background: #e9ecef;
                    border-radius: 6px;
                    overflow: hidden;
                    margin: 0 15px;
                }

                .brew-progress {
                    height: 100%;
                    border-radius: 6px;
                    transition: width 0.5s ease;
                }

                .brew-percentage {
                    min-width: 50px;
                    text-align: right;
                    font-weight: 600;
                    color: #495057;
                }

                /* Resource Grid */
                .resource-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }

                .resource-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 15px;
                    transition: all 0.3s ease;
                }

                .resource-item:hover {
                    background: #e9ecef;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .resource-icon {
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }

                .resource-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .resource-name {
                    font-weight: 700;
                    color: #2c3e50;
                    margin-bottom: 5px;
                    font-size: 1rem;
                }

                .resource-value {
                    color: #667eea;
                    font-size: 0.9rem;
                    font-weight: 600;
                }

                .resource-bar {
                    width: 100px;
                    height: 10px;
                    background: #e9ecef;
                    border-radius: 5px;
                    margin-left: 15px;
                    overflow: hidden;
                }

                .resource-progress {
                    height: 100%;
                    border-radius: 5px;
                    transition: width 0.5s ease;
                }

                /* Activity List */
                .activity-list {
                    max-height: 500px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .activity-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                }

                .activity-item:hover {
                    background: #e9ecef;
                    transform: translateX(5px);
                }

                .activity-icon {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                }

                .activity-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .activity-machine {
                    font-weight: 600;
                    color: #2c3e50;
                }

                .activity-status {
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .activity-brew {
                    color: #667eea;
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .activity-time {
                    color: #6c757d;
                    font-size: 0.9rem;
                    font-weight: 500;
                    min-width: 80px;
                    text-align: right;
                }

                /* Alerts */
                .alert {
                    padding: 20px;
                    border-radius: 12px;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 500;
                }

                .alert-info {
                    background: #e7f3ff;
                    color: #0c5460;
                }

                .alert-warning {
                    background: #fff3cd;
                    color: #856404;
                }

                .alert-danger {
                    background: #f8d7da;
                    color: #721c24;
                }

                .alert i {
                    font-size: 1.2rem;
                }

                /* Responsive Design */
                @media (max-width: 1200px) {
                    .stat-content h3 {
                        font-size: 1.8rem;
                    }
                    
                    .stat-icon {
                        width: 60px;
                        height: 60px;
                        font-size: 1.5rem;
                    }

                    .filter-card {
                        padding: 25px;
                    }
                }

                @media (max-width: 768px) {
                    .page-header {
                        padding: 30px 20px;
                    }

                    .page-title h1 {
                        font-size: 2rem;
                    }

                    .header-actions {
                        flex-direction: column;
                        gap: 10px;
                    }

                    .date-inputs {
                        flex-direction: column;
                        gap: 15px;
                    }

                    .quick-filters {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                    }

                    .resource-grid {
                        grid-template-columns: 1fr;
                    }

                    .stat-card {
                        flex-direction: column;
                        text-align: center;
                        gap: 15px;
                        min-height: auto;
                        padding: 20px;
                    }

                    .stat-content h3 {
                        font-size: 2rem;
                    }

                    .stat-icon {
                        width: 60px;
                        height: 60px;
                        font-size: 1.5rem;
                    }

                    .brew-stat-item {
                        flex-direction: column;
                        gap: 15px;
                        text-align: center;
                    }

                    .brew-bar {
                        width: 100%;
                        margin: 0;
                    }

                    .activity-item {
                        flex-direction: column;
                        text-align: center;
                        gap: 10px;
                    }

                    .activity-time {
                        text-align: center;
                        min-width: auto;
                    }

                    .card-body,
                    .card-header {
                        padding: 20px;
                    }
                }

                @media (max-width: 480px) {
                    .page-title h1 {
                        font-size: 1.5rem;
                    }

                    .stat-content h3 {
                        font-size: 1.5rem;
                    }

                    .filter-content {
                        padding: 20px;
                    }

                    .resource-item {
                        flex-direction: column;
                        text-align: center;
                        gap: 10px;
                    }

                    .resource-bar {
                        width: 100%;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default FacilityUsage;
