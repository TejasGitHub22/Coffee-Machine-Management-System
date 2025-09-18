import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { logout, isAdmin, user, isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    // Define navigation items based on user role
    const getNavItems = () => {
        const baseItems = [
            { path: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/machines', label: 'Machines', icon: 'fas fa-coffee' },
            { path: '/alerts', label: 'Alerts', icon: 'fas fa-exclamation-triangle' }
        ];

        // Check if user is loaded and isAdmin function works
        if (!isAuthenticated || !user) {
            return baseItems;
        }

        try {
            if (isAdmin()) {
                return [
                    ...baseItems,
                    { path: '/facilities', label: 'Facilities', icon: 'fas fa-building' },
                    { path: '/usage', label: 'Usage', icon: 'fas fa-chart-bar' }
                ];
            }

            // For facility users, add facility-specific usage
            return [
                ...baseItems,
                { path: '/facility-usage', label: 'Usage', icon: 'fas fa-chart-bar' }
            ];
        } catch (error) {
            console.error('Navbar - Error determining user role:', error);
            return baseItems;
        }
    };

    const navItems = getNavItems();

    return (
        <>
            <nav className="navbar">
                <div className="container">
                    <div className="navbar-content">
                        {/* Brand */}
                        <Link to="/dashboard" className="navbar-brand">
                            <i className="fas fa-coffee"></i>
                            Coffee Manager
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="navbar-nav desktop-nav">
                            {navItems && navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                                >
                                    <i className={item.icon}></i>
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* User Menu */}
                        <div className="navbar-actions">
                            <button 
                                onClick={handleLogout}
                                className="btn btn-outline-primary"
                            >
                                <i className="fas fa-sign-out-alt"></i>
                                Logout
                            </button>

                            {/* Mobile Menu Button */}
                            <button 
                                className="mobile-menu-btn"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    <div className={`mobile-nav ${isMobileMenuOpen ? 'mobile-nav-open' : ''}`}>
                        {navItems && navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <i className={item.icon}></i>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>

            <style jsx global>{`
                /* Ensure navbar is always accessible */
                body {
                    padding-top: 80px;
                }

                .navbar {
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    z-index: 9999 !important;
                    width: 100% !important;
                    pointer-events: auto !important;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 1rem;
                    width: 100%;
                    pointer-events: auto !important;
                }

                .navbar-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 0;
                    min-height: 70px;
                    pointer-events: auto !important;
                }

                .navbar-brand {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #495057;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .navbar-brand:hover {
                    color: #667eea;
                }

                .navbar-brand i {
                    color: #667eea;
                }

                .desktop-nav {
                    display: flex !important;
                    align-items: center !important;
                    gap: 2rem !important;
                    position: relative !important;
                    z-index: 10000 !important;
                }

                .navbar .nav-link {
                    color: #495057 !important;
                    text-decoration: none !important;
                    font-weight: 500 !important;
                    padding: 0.5rem 1rem !important;
                    border-radius: 8px !important;
                    transition: all 0.3s ease !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    position: relative !important;
                    z-index: 10000 !important;
                    pointer-events: auto !important;
                }

                .navbar .nav-link:hover {
                    color: #667eea !important;
                    background: rgba(102, 126, 234, 0.1) !important;
                    text-decoration: none !important;
                }

                .navbar .nav-link.active {
                    color: #667eea !important;
                    background: rgba(102, 126, 234, 0.15) !important;
                    font-weight: 600 !important;
                }

                .navbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .btn-outline-primary {
                    background: transparent;
                    border: 2px solid #667eea;
                    color: #667eea;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .btn-outline-primary:hover {
                    background: #667eea;
                    color: white;
                    transform: translateY(-1px);
                }

                .mobile-menu-btn {
                    display: none;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #495057;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .mobile-menu-btn:hover {
                    background: rgba(102, 126, 234, 0.1);
                    color: #667eea;
                }

                .mobile-nav {
                    display: none;
                    flex-direction: column;
                    padding: 1rem 0;
                    border-top: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(10px);
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease, opacity 0.3s ease;
                    opacity: 0;
                }

                .mobile-nav-open {
                    max-height: 500px;
                    opacity: 1;
                }

                .mobile-nav-link {
                    color: #495057;
                    text-decoration: none;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }

                .mobile-nav-link:hover {
                    background: rgba(102, 126, 234, 0.1);
                    color: #667eea;
                }

                .mobile-nav-link.active {
                    background: rgba(102, 126, 234, 0.15);
                    color: #667eea;
                    font-weight: 600;
                }

                @media (max-width: 768px) {
                    .desktop-nav {
                        display: none;
                    }

                    .mobile-menu-btn {
                        display: block;
                    }

                    .mobile-nav {
                        display: flex;
                    }

                    .navbar-brand {
                        font-size: 1.25rem;
                    }
                }
            `}</style>
        </>
    );
};

export default Navbar;