import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Usage = () => {
    const [searchParams] = useSearchParams();
    const facilityFilter = searchParams.get('facility');
    
    const { 
        usageHistory, 
        machines, 
        facilities,
        loading, 
        error, 
        getTotalUsageCount, 
        getTodayUsageCount,
        getUsageCountForMachine,
        getFacilityById
    } = useData();
    
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

    // Get filtered facility information
    const selectedFacility = facilityFilter ? getFacilityById(parseInt(facilityFilter)) : null;
    const facilityMachines = selectedFacility ? machines.filter(m => m.facilityId === selectedFacility.id) : machines;

    useEffect(() => {
        fetchSimulatorAnalytics();
    }, []);

    useEffect(() => {
        calculateFilteredUsage();
    }, [dateRange, analyticsData, selectedFacility, facilityMachines]);

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
            setSimulatorError('Simulator analytics not available. Make sure the simulator is running on port 8081.');
            console.error('Error fetching simulator analytics:', err);
        }
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
        if (!analyticsData || !analyticsData.recentActivity) {
            setFilteredUsage({
                totalBrews: getTotalUsageCount(),
                averagePerDay: 0,
                mostPopularBrew: 'N/A',
                activeMachines: facilityMachines.filter(m => m.status === 'ON').length,
                totalMachines: facilityMachines.length,
                efficiency: Math.round((facilityMachines.filter(m => m.status === 'ON').length / facilityMachines.length) * 100) || 0
            });
            return;
        }

        const startDateTime = new Date(dateRange.startDate).getTime();
        const endDateTime = new Date(dateRange.endDate).getTime() + 24 * 60 * 60 * 1000; // Include end date

        // Filter activities for selected facility if specified
        const facilityMachineIds = facilityMachines.map(m => m.id);
        const filteredActivities = analyticsData.recentActivity.filter(activity => {
            if (!activity || !activity.timestamp) return false;
            const activityTime = new Date(activity.timestamp).getTime();
            const matchesFacility = !selectedFacility || facilityMachineIds.includes(activity.machineId);
            return activityTime >= startDateTime && activityTime <= endDateTime && 
                   activity.brewType && activity.brewType !== 'None' && matchesFacility;
        });

        const totalBrews = filteredActivities.length;
        const daysDiff = Math.max(1, Math.ceil((endDateTime - startDateTime) / (24 * 60 * 60 * 1000)));
        const averagePerDay = Math.round((totalBrews / daysDiff) * 10) / 10;

        // Calculate most popular brew type in the selected period
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
                        Usage History
                    </h1>
                    <p>View coffee brewing history and usage statistics</p>
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

    return (
        <div className="container">
            <div className="page-header">
                <div className="page-title">
                    <h1>
                        <i className="fas fa-chart-bar"></i>
                        {selectedFacility ? `${selectedFacility.name} - Usage Analytics` : 'Usage Analytics & Statistics'}
                    </h1>
                    <p>
                        {selectedFacility 
                            ? `Real-time insights into coffee machine usage and performance metrics for ${selectedFacility.name}` 
                            : 'Real-time insights into coffee machine usage, resource consumption, and performance metrics'
                        }
                    </p>
                    <div className="header-actions">
                        {selectedFacility && (
                            <Link 
                                to="/usage"
                                className="btn btn-secondary"
                                style={{ marginRight: '10px' }}
                            >
                                <i className="fas fa-arrow-left"></i>
                                View All Facilities
                            </Link>
                        )}
                        <button className="btn btn-secondary" onClick={fetchSimulatorAnalytics}>
                            <i className="fas fa-sync-alt"></i>
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Date Range Filter Section */}
            <div className="row">
                <div className="col-12">
                    <div className="filter-card">
                        <div className="filter-header">
                            <h3>
                                <i className="fas fa-calendar-alt"></i>
                                Select Date Range
                            </h3>
                            <p>Choose a custom date range to analyze coffee brewing patterns</p>
                        </div>
                        
                        <div className="filter-controls">
                            <div className="date-inputs">
                                <div className="input-group">
                                    <label>From Date</label>
                                    <input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                                        className="date-input"
                                        max={dateRange.endDate}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>To Date</label>
                                    <input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                                        className="date-input"
                                        min={dateRange.startDate}
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
                            <p>System Efficiency</p>
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
                            <p className="card-subtitle">Coffee preferences during {formatDateRange()}</p>
                        </div>
                        <div className="card-body">
                            {filteredUsage && filteredUsage.brewTypeCounts && Object.keys(filteredUsage.brewTypeCounts).length > 0 ? (
                                Object.entries(filteredUsage.brewTypeCounts).map(([brewType, count]) => (
                                    <div key={brewType} className="brew-type-item">
                                        <div className="brew-type-info">
                                            <span className="brew-type-name">{brewType}</span>
                                            <span className="brew-type-count">{count} brews ({Math.round((count / filteredUsage.totalBrews) * 100)}%)</span>
                                        </div>
                                        <div className="brew-type-bar">
                                            <div 
                                                className="brew-type-progress" 
                                                style={{ 
                                                    width: `${(count / Math.max(...Object.values(filteredUsage.brewTypeCounts))) * 100}%`,
                                                    backgroundColor: getRandomColor(brewType)
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="alert alert-info">
                                    <i className="fas fa-info-circle"></i>
                                    {simulatorError || 'No brew data available for the selected time period. Try a different date range or ensure the simulator is running.'}
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
                                <i className="fas fa-history"></i> Recent Activity (Last 24 Hours)
                            </h3>
                        </div>
                        <div className="card-body">
                            {analyticsData && analyticsData.recentActivity ? (
                                <div className="activity-list">
                                    {analyticsData.recentActivity.slice(0, 10).map((activity, index) => (
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
                                    {simulatorError || 'Loading recent activity...'}
                                </div>
                            )}
                        </div>
                </div>
                </div>
            </div>

            <style jsx>{`
                .page-header {
                    margin-bottom: 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 40px;
                    border-radius: 20px;
                    position: relative;
                }

                .page-title {
                    position: relative;
                    z-index: 2;
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
                    margin: 0 0 20px 0;
                }

                .header-actions {
                    display: flex;
                    gap: 15px;
                }

                /* Filter Card Styles */
                .filter-card {
                    background: white;
                    border-radius: 16px;
                    padding: 30px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    margin-bottom: 30px;
                }

                .filter-header {
                    text-align: center;
                    margin-bottom: 25px;
                }

                .filter-header h3 {
                    color: #2c3e50;
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }

                .filter-header p {
                    color: #6c757d;
                    margin: 0;
                    font-size: 1rem;
                }

                .filter-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    align-items: center;
                }

                .date-inputs {
                    display: flex;
                    gap: 20px;
                    align-items: end;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .input-group label {
                    font-weight: 600;
                    color: #495057;
                    font-size: 0.9rem;
                }

                .date-input {
                    padding: 12px 16px;
                    border: 2px solid #e9ecef;
                    border-radius: 10px;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    background: white;
                    min-width: 160px;
                }

                .date-input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .quick-filters {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .quick-filter-label {
                    font-weight: 600;
                    color: #495057;
                    margin-right: 10px;
                }

                .quick-filter-btn {
                    padding: 8px 16px;
                    border: 2px solid #667eea;
                    background: transparent;
                    color: #667eea;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .quick-filter-btn:hover {
                    background: #667eea;
                    color: white;
                    transform: translateY(-2px);
                }

                .selected-period {
                    margin-top: 20px;
                    padding: 15px 20px;
                    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #1565c0;
                    font-size: 0.95rem;
                    justify-content: center;
                }

                .selected-period i {
                    font-size: 1.1rem;
                }

                .row {
                    margin-bottom: 30px;
                }

                /* Add proper spacing between cards */
                .row > [class*="col-"] {
                    padding-left: 15px;
                    padding-right: 15px;
                    margin-bottom: 20px;
                }

                /* Enhanced Stat Cards with better spacing */
                .stat-card {
                    background: white;
                    border-radius: 16px;
                    padding: 25px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    border: 2px solid transparent;
                    transition: all 0.3s ease;
                    height: 100%;
                    min-height: 130px;
                    position: relative;
                    overflow: hidden;
                    margin-bottom: 20px;
                }

                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    transition: all 0.3s ease;
                }

                .stat-card.primary::before {
                    background: linear-gradient(90deg, #667eea, #764ba2);
                }

                .stat-card.success::before {
                    background: linear-gradient(90deg, #28a745, #20c997);
                }

                .stat-card.warning::before {
                    background: linear-gradient(90deg, #ffc107, #e0a800);
                }

                .stat-card.info::before {
                    background: linear-gradient(90deg, #17a2b8, #138496);
                }

                .stat-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
                    border-color: rgba(102, 126, 234, 0.3);
                }

                .stat-icon {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.8rem;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    flex-shrink: 0;
                }

                .stat-card.primary .stat-icon {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                }

                .stat-card.success .stat-icon {
                    background: linear-gradient(135deg, #28a745, #20c997);
                }

                .stat-card.warning .stat-icon {
                    background: linear-gradient(135deg, #ffc107, #e0a800);
                }

                .stat-card.info .stat-icon {
                    background: linear-gradient(135deg, #17a2b8, #138496);
                }

                .stat-content {
                    flex: 1;
                    min-width: 0;
                }

                .stat-content h3 {
                    margin: 0 0 8px 0;
                    font-size: 2.2rem;
                    font-weight: 700;
                    color: #2c3e50;
                    line-height: 1.2;
                    word-break: break-word;
                }

                .stat-content p {
                    margin: 0 0 5px 0;
                    color: #495057;
                    font-size: 1rem;
                    font-weight: 600;
                    line-height: 1.3;
                }

                .stat-content small {
                    color: #6c757d;
                    font-size: 0.85rem;
                    font-style: italic;
                    line-height: 1.2;
                }

                /* Enhanced Cards */
                .card {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    transition: all 0.3s ease;
                }

                .card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
                }

                .card-header {
                    padding: 25px 25px 0;
                    border-bottom: none;
                }

                .card-title {
                    color: #2c3e50;
                    font-size: 1.4rem;
                    font-weight: 700;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .card-subtitle {
                    color: #6c757d;
                    font-size: 0.95rem;
                    margin: 8px 0 0 0;
                    font-style: italic;
                }

                .card-body {
                    padding: 20px 25px 25px;
                }

                /* Enhanced Brew Type Items */
                .brew-type-item, .status-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 12px;
                    border-left: 4px solid transparent;
                    transition: all 0.3s ease;
                }

                .brew-type-item:hover, .status-item:hover {
                    background: #e9ecef;
                    transform: translateX(5px);
                    border-left-color: #667eea;
                }

                .brew-type-info, .status-info {
                    flex: 1;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .brew-type-name, .status-name {
                    font-weight: 700;
                    color: #2c3e50;
                    font-size: 1rem;
                }

                .brew-type-count, .status-count {
                    color: #667eea;
                    font-size: 0.9rem;
                    font-weight: 600;
                    background: rgba(102, 126, 234, 0.1);
                    padding: 4px 8px;
                    border-radius: 6px;
                }

                .brew-type-bar {
                    width: 120px;
                    height: 10px;
                    background: #e9ecef;
                    border-radius: 5px;
                    margin-left: 15px;
                    overflow: hidden;
                }

                .brew-type-progress {
                    height: 100%;
                    border-radius: 5px;
                    transition: width 0.5s ease;
                }

                /* Enhanced Resource Grid */
                .resource-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 20px;
                }

                .resource-item {
                    display: flex;
                    align-items: center;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 12px;
                    border-left: 4px solid transparent;
                    transition: all 0.3s ease;
                }

                .resource-item:hover {
                    background: #e9ecef;
                    transform: translateY(-2px);
                    border-left-color: #667eea;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                }

                .resource-icon {
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin-right: 15px;
                    font-size: 1.2rem;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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

                /* Enhanced Activity List */
                .activity-list {
                    max-height: 500px;
                    overflow-y: auto;
                    padding-right: 10px;
                }

                .activity-list::-webkit-scrollbar {
                    width: 6px;
                }

                .activity-list::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }

                .activity-list::-webkit-scrollbar-thumb {
                    background: #667eea;
                    border-radius: 3px;
                }

                .activity-item {
                    display: flex;
                    align-items: center;
                    padding: 15px;
                    border-bottom: 1px solid #e9ecef;
                    border-radius: 8px;
                    margin-bottom: 5px;
                    transition: all 0.3s ease;
                }

                .activity-item:hover {
                    background: #f8f9fa;
                    transform: translateX(5px);
                }

                .activity-icon {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #28a745, #20c997);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin-right: 15px;
                    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                }

                .activity-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .activity-machine {
                    font-weight: 700;
                    color: #2c3e50;
                    font-size: 1rem;
                }

                .activity-status {
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .activity-brew {
                    color: #28a745;
                    font-size: 0.9rem;
                    font-weight: 600;
                }

                .activity-time {
                    color: #6c757d;
                    font-size: 0.85rem;
                    font-weight: 500;
                }

                /* Enhanced Buttons */
                .btn {
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    text-decoration: none;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border: 2px solid transparent;
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }

                .btn-secondary {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(10px);
                }

                .btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.3);
                    border-color: rgba(255, 255, 255, 0.5);
                    transform: translateY(-2px);
                }

                /* Enhanced Alerts */
                .alert {
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .alert-danger {
                    background: linear-gradient(135deg, #f8d7da, #f1aeb5);
                    color: #721c24;
                    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.2);
                }

                .alert-info {
                    background: linear-gradient(135deg, #d1ecf1, #b8daff);
                    color: #0c5460;
                    box-shadow: 0 4px 15px rgba(23, 162, 184, 0.2);
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

                    /* Better mobile spacing for cards */
                    .row > [class*="col-"] {
                        padding-left: 10px;
                        padding-right: 10px;
                        margin-bottom: 15px;
                    }

                    /* Filter card mobile adjustments */
                    .filter-card {
                        padding: 20px 15px;
                    }

                    .date-inputs {
                        flex-direction: column;
                        gap: 15px;
                        width: 100%;
                    }

                    .date-input {
                        min-width: auto;
                        width: 100%;
                    }

                    .quick-filters {
                        justify-content: center;
                    }

                    .quick-filter-btn {
                        padding: 6px 12px;
                        font-size: 0.8rem;
                    }
                }

                @media (max-width: 576px) {
                    .stat-card {
                        margin-bottom: 15px;
                        padding: 15px;
                    }

                    .stat-content h3 {
                        font-size: 1.6rem;
                    }

                    .stat-content p {
                        font-size: 0.9rem;
                    }

                    .stat-icon {
                        width: 50px;
                        height: 50px;
                        font-size: 1.2rem;
                    }

                    .row > [class*="col-"] {
                        padding-left: 5px;
                        padding-right: 5px;
                    }

                    .filter-header h3 {
                        font-size: 1.3rem;
                    }

                    .filter-header p {
                        font-size: 0.9rem;
                    }

                    .quick-filter-label {
                        width: 100%;
                        text-align: center;
                        margin-bottom: 10px;
                    }

                    .quick-filters {
                        flex-direction: column;
                        align-items: center;
                    }
                }
            `}</style>
        </div>
    );
};

// Helper functions
const getRandomColor = (seed) => {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getResourceColor = (level) => {
    if (level >= 70) return '#28a745';
    if (level >= 40) return '#ffc107';
    return '#dc3545';
};

const getTemperatureColor = (temp) => {
    if (temp <= 95) return '#28a745';
    if (temp <= 105) return '#ffc107';
    return '#dc3545';
};

export default Usage;