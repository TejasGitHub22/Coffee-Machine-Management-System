import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
    const { user, isAdmin, isFacility } = useAuth();
    const navigate = useNavigate();
    const { 
        machines, 
        facilities, 
        loading, 
        error, 
        getDashboardStats, 
        getLowSupplyMachines,
        updateMachineStatus 
    } = useData();

    const [localError, setLocalError] = useState(null);
    const [locations, setLocations] = useState([]);
    const [locationsLoading, setLocationsLoading] = useState(false);

    // Get real-time dashboard statistics
    const stats = getDashboardStats();
    const lowSupplyMachines = getLowSupplyMachines();

    // Fetch locations for admin dashboard
    useEffect(() => {
        if (isAdmin()) {
            fetchLocations();
        }
    }, [isAdmin]);

    const fetchLocations = async () => {
        setLocationsLoading(true);
        try {
            const response = await fetch('http://localhost:8080/api/admin/locations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setLocations(data);
            } else {
                console.error('Failed to fetch locations');
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            setLocationsLoading(false);
        }
    };

    const handleLocationClick = (location) => {
        navigate(`/facilities?location=${encodeURIComponent(location)}`);
    };

    if (loading) {
        return <LoadingSpinner text="Loading dashboard..." />;
    }

    return (
        <div className="container">
            <div className="page-header">
                <div className="page-title">
                    <h1>
                        <i className="fas fa-tachometer-alt"></i>
                        {isAdmin() ? 'Admin Dashboard' : 'Facility Dashboard'}
                    </h1>
                    <p>
                        {isAdmin() 
                            ? 'Centralized monitoring across all facilities' 
                            : 'Real-time coffee machine monitoring for your facility'
                        }
                        <span className="refresh-info">
                            <i className="fas fa-sync-alt"></i> 
                            Auto-refresh every {isAdmin() ? '60' : '30'} seconds
                        </span>
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row">
                <div className={isAdmin() ? "col-md-3" : "col-md-4"}>
                    <div className="summary-card">
                        <div className="card-icon">
                            <i className="fas fa-coffee"></i>
                        </div>
                        <div className="card-content">
                            <h3>{stats.totalMachines}</h3>
                            <p>Total Machines</p>
                            <small className="card-subtitle">in your {isAdmin() ? 'system' : 'facility'}</small>
                        </div>
                    </div>
                </div>
                <div className={isAdmin() ? "col-md-3" : "col-md-4"}>
                    <div className="summary-card">
                        <div className="card-icon active">
                            <i className="fas fa-power-off"></i>
                        </div>
                        <div className="card-content">
                            <h3>{stats.activeMachines}</h3>
                            <p>Active Machines</p>
                            <small className="card-subtitle">currently running</small>
                        </div>
                    </div>
                </div>
                {isAdmin() && (
                    <div className="col-md-3">
                        <div className="summary-card">
                            <div className="card-icon facility">
                                <i className="fas fa-building"></i>
                            </div>
                            <div className="card-content">
                                <h3>{stats.totalFacilities}</h3>
                                <p>Total Facilities</p>
                                <small className="card-subtitle">system-wide</small>
                            </div>
                        </div>
                    </div>
                )}
                <div className={isAdmin() ? "col-md-3" : "col-md-4"}>
                    <div className="summary-card">
                        <div className="card-icon alert">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className="card-content">
                            <h3>{stats.lowSupplyMachines}</h3>
                            <p>Critical Alerts</p>
                            <small className="card-subtitle">need attention</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions for Facility Users */}
            {!isAdmin() && (
                <div className="row">
                    <div className="col-12">
                        <div className="quick-actions-card">
                            <h3>
                                <i className="fas fa-bolt"></i>
                                Quick Actions
                            </h3>
                            <div className="actions-grid">
                                <Link to="/machines" className="action-item">
                                    <div className="action-icon">
                                        <i className="fas fa-coffee"></i>
                                    </div>
                                    <div className="action-content">
                                        <h4>Manage Machines</h4>
                                        <p>View and control all coffee machines in your facility</p>
                                    </div>
                                    <i className="fas fa-arrow-right action-arrow"></i>
                                </Link>
                                
                                <Link to="/alerts" className="action-item">
                                    <div className="action-icon alert-icon">
                                        <i className="fas fa-bell"></i>
                                    </div>
                                    <div className="action-content">
                                        <h4>View Alerts</h4>
                                        <p>Check critical alerts and maintenance notifications</p>
                                    </div>
                                    <i className="fas fa-arrow-right action-arrow"></i>
                                </Link>
                                
                                <Link to="/facility-usage" className="action-item">
                                    <div className="action-icon">
                                        <i className="fas fa-chart-bar"></i>
                                    </div>
                                    <div className="action-content">
                                        <h4>Usage Analytics</h4>
                                        <p>View detailed usage statistics and brewing trends</p>
                                    </div>
                                    <i className="fas fa-arrow-right action-arrow"></i>
                                </Link>
                                
                                <div className="action-item status-item">
                                    <div className="action-icon success-icon">
                                        <i className="fas fa-chart-line"></i>
                                    </div>
                                    <div className="action-content">
                                        <h4>Performance Today</h4>
                                        <p>{stats.todayUsage || 0} total brews completed</p>
                                    </div>
                                    <div className="performance-badge">
                                        <i className="fas fa-check-circle"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Location Cards - Only for Admin Users */}
            {isAdmin() && (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">
                                    <i className="fas fa-map-marker-alt"></i> 
                                    Locations
                                </h3>
                            </div>
                            <div className="card-body">
                                {locationsLoading ? (
                                    <div className="text-center py-4">
                                        <i className="fas fa-spinner fa-spin"></i> Loading locations...
                                    </div>
                                ) : (
                                    <div className="locations-grid">
                                        {locations.map((location) => (
                                            <div 
                                                key={location.location} 
                                                className="location-card"
                                                onClick={() => handleLocationClick(location.location)}
                                            >
                                                <div className="location-header">
                                                    <div className="location-icon">
                                                        <i className="fas fa-building"></i>
                                                    </div>
                                                    <h4>{location.location}</h4>
                                                </div>
                                                <div className="location-stats">
                                                    <div className="stat-row">
                                                        <span className="stat-label">Facilities:</span>
                                                        <span className="stat-value">{location.facilityCount}</span>
                                                    </div>
                                                    <div className="stat-row">
                                                        <span className="stat-label">Total Machines:</span>
                                                        <span className="stat-value">{location.totalMachines}</span>
                                                    </div>
                                                    <div className="stat-row">
                                                        <span className="stat-label">Active Machines:</span>
                                                        <span className="stat-value">{location.activeMachines}</span>
                                                    </div>
                                                </div>
                                                <div className="location-footer">
                                                    <i className="fas fa-arrow-right"></i>
                                                    <span>Click to view facilities</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* System Status & Performance */}
            <div className="row">
                <div className="col-md-6">
                    <div className="card status-card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <i className="fas fa-shield-alt"></i> System Status
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="system-status">
                                <div className="status-item">
                                    <i className="fas fa-check-circle text-success"></i>
                                    <span>All systems operational</span>
                                </div>
                                <div className="status-item">
                                    <i className="fas fa-check-circle text-success"></i>
                                    <span>Database connection stable</span>
                                </div>
                                <div className="status-item">
                                    <i className="fas fa-check-circle text-success"></i>
                                    <span>MQTT connection active</span>
                                </div>
                                <div className="status-footer">
                                    <small className="text-muted">
                                        <i className="fas fa-clock"></i> Last updated: just now
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card performance-card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <i className="fas fa-chart-line"></i> Performance Overview
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="performance-stats">
                                <div className="performance-item">
                                    <div className="perf-number">{stats.todayUsage || 0}</div>
                                    <div className="perf-label">Brews Today</div>
                                </div>
                                <div className="performance-item">
                                    <div className="perf-number">{Math.round((stats.activeMachines / stats.totalMachines) * 100) || 0}%</div>
                                    <div className="perf-label">Uptime</div>
                                </div>
                                {!isAdmin() && (
                                    <div className="performance-action">
                                        <Link to="/machines" className="btn btn-primary btn-sm">
                                            <i className="fas fa-cogs"></i> Manage Machines
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .page-header {
                    margin-bottom: 30px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 40px;
                    border-radius: 20px;
                    margin-bottom: 40px;
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
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .refresh-info {
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.7);
                    background: rgba(255, 255, 255, 0.2);
                    padding: 8px 15px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }

                .row {
                    margin-bottom: 30px;
                }

                /* Add proper spacing between cards */
                .row > [class*="col-"] {
                    padding-left: 10px;
                    padding-right: 10px;
                    margin-bottom: 20px;
                }

                .summary-card {
                    background: white;
                    border-radius: 16px;
                    padding: 25px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    height: 100%;
                    min-height: 120px;
                }

                .summary-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
                }

                .card-icon {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.8rem;
                    background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }

                .card-icon.active { 
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                }
                .card-icon.facility { 
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                }
                .card-icon.alert { 
                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                }

                .card-content h3 {
                    margin: 0 0 5px 0;
                    font-size: 2.2rem;
                    font-weight: 700;
                    color: #2c3e50;
                }

                .card-content p {
                    margin: 0 0 5px 0;
                    color: #6c757d;
                    font-size: 1rem;
                    font-weight: 600;
                }

                .card-subtitle {
                    color: #adb5bd;
                    font-size: 0.85rem;
                    font-style: italic;
                }

                .quick-actions-card {
                    background: white;
                    border-radius: 16px;
                    padding: 30px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }

                .quick-actions-card h3 {
                    color: #2c3e50;
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 25px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }

                .action-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 20px;
                    border-radius: 12px;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    border: 2px solid #f8f9fa;
                    background: #f8f9fa;
                }

                .action-item:hover {
                    border-color: #667eea;
                    background: #fff;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
                }

                .action-item.status-item {
                    border-color: #e3f2fd;
                    background: #e3f2fd;
                }

                .action-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    font-size: 1.3rem;
                }

                .action-icon.alert-icon {
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                }

                .action-icon.success-icon {
                    background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
                }

                .action-content h4 {
                    margin: 0 0 5px 0;
                    color: #2c3e50;
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .action-content p {
                    margin: 0;
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .action-arrow {
                    margin-left: auto;
                    color: #adb5bd;
                    font-size: 1.2rem;
                }

                .performance-badge {
                    margin-left: auto;
                    color: #28a745;
                    font-size: 1.5rem;
                }

                .status-card, .performance-card {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }

                .card-header {
                    padding: 20px 25px 0;
                    border-bottom: none;
                }

                .card-title {
                    color: #2c3e50;
                    font-size: 1.3rem;
                    font-weight: 600;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .card-body {
                    padding: 20px 25px 25px;
                }

                .system-status {
                    padding: 0;
                }

                .status-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 15px;
                    font-size: 1rem;
                    color: #495057;
                }

                .status-footer {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #e9ecef;
                }

                .text-success {
                    color: #28a745 !important;
                }

                .text-muted {
                    color: #6c757d !important;
                }

                .performance-stats {
                    display: flex;
                    align-items: center;
                    gap: 30px;
                }

                .performance-item {
                    text-align: center;
                }

                .perf-number {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: #667eea;
                    margin-bottom: 5px;
                }

                .perf-label {
                    color: #6c757d;
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .performance-action {
                    margin-left: auto;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    text-decoration: none;
                    transition: all 0.3s ease;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: 2px solid transparent;
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }

                .btn-sm {
                    padding: 8px 16px;
                    font-size: 0.85rem;
                }

                /* Admin-only styles */
                .machine-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }

                .machine-card {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 20px;
                    border-left: 4px solid #667eea;
                    transition: all 0.3s ease;
                }

                .machine-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                }

                .machine-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .machine-header h4 {
                    margin: 0;
                    color: #2c3e50;
                    font-weight: 600;
                }

                .status-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .status-on {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .status-off {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }

                .machine-info {
                    margin-bottom: 15px;
                }

                .info-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .label {
                    color: #6c757d;
                    font-weight: 500;
                }

                .value {
                    color: #2c3e50;
                    font-weight: 600;
                }

                .resource-levels {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .resource-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .resource-item i {
                    width: 20px;
                    color: #6c757d;
                }

                .progress-bar {
                    flex: 1;
                    height: 8px;
                    background: #e9ecef;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }

                .progress-fill.water { background: linear-gradient(90deg, #007bff, #0056b3); }
                .progress-fill.milk { background: linear-gradient(90deg, #ffc107, #e0a800); }
                .progress-fill.beans { background: linear-gradient(90deg, #28a745, #1e7e34); }

                /* Location Cards Styles - Improved for better visibility and less bulk */
                .locations-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                }

                .location-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    border: 2px solid #f8f9fa;
                    position: relative;
                    overflow: hidden;
                    min-height: 180px;
                }

                .location-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
                    border-color: #667eea;
                }

                .location-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 15px;
                }

                .location-icon {
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .location-header h4 {
                    margin: 0;
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: #2c3e50;
                    flex: 1;
                }

                .location-stats {
                    margin-bottom: 15px;
                }

                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    padding: 8px 0;
                }

                .stat-label {
                    font-weight: 500;
                    font-size: 0.9rem;
                    color: #6c757d;
                }

                .stat-value {
                    font-weight: 700;
                    font-size: 1rem;
                    color: #2c3e50;
                    background: #f8f9fa;
                    padding: 4px 8px;
                    border-radius: 6px;
                    min-width: 35px;
                    text-align: center;
                }

                .location-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #e9ecef;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #667eea;
                }

                .location-footer i {
                    transition: transform 0.3s ease;
                    font-size: 1rem;
                }

                .location-card:hover .location-footer i {
                    transform: translateX(4px);
                }

                @media (max-width: 768px) {
                    .page-header {
                        padding: 30px 20px;
                    }
                    
                    .page-title h1 {
                        font-size: 2rem;
                    }
                    
                    .actions-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .performance-stats {
                        flex-direction: column;
                        gap: 20px;
                    }

                    /* Better mobile spacing for cards */
                    .row > [class*="col-"] {
                        padding-left: 15px;
                        padding-right: 15px;
                        margin-bottom: 15px;
                    }

                    .summary-card {
                        padding: 20px;
                        min-height: 100px;
                    }

                    .card-content h3 {
                        font-size: 1.8rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;