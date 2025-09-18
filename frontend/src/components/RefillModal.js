import React, { useState } from 'react';

const RefillModal = ({ machine, isOpen, onClose, onRefill }) => {
    const [refillData, setRefillData] = useState({
        waterLevel: '',
        milkLevel: '',
        beansLevel: '',
        sugarLevel: ''
    });

    const handleInputChange = (supply, value) => {
        setRefillData(prev => ({
            ...prev,
            [supply]: value === '' ? '' : Math.max(0, Math.min(100, parseFloat(value) || 0))
        }));
    };

    const handleRefill = async () => {
        // Only send non-empty values
        const dataToSend = {};
        Object.keys(refillData).forEach(key => {
            if (refillData[key] !== '' && refillData[key] !== undefined) {
                dataToSend[key] = parseFloat(refillData[key]);
            }
        });

        if (Object.keys(dataToSend).length === 0) {
            alert('Please select at least one supply to refill');
            return;
        }

        const success = await onRefill(machine.id, dataToSend);
        if (success) {
            setRefillData({
                waterLevel: '',
                milkLevel: '',
                beansLevel: '',
                sugarLevel: ''
            });
            onClose();
        }
    };

    const handleQuickFill = (supply) => {
        setRefillData(prev => ({
            ...prev,
            [supply]: '100'
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Refill Machine #{machine.id}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <div className="modal-body">
                    <p className="modal-description">
                        Select which supplies to refill and specify the target levels (0-100%)
                    </p>
                    
                    <div className="supply-grid">
                        {/* Water */}
                        <div className="supply-item">
                            <div className="supply-header">
                                <i className="fas fa-tint supply-icon water"></i>
                                <span className="supply-name">Water</span>
                                <span className="current-level">Current: {Math.round(machine.waterLevel || 0)}%</span>
                            </div>
                            <div className="supply-controls">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={refillData.waterLevel}
                                    onChange={(e) => handleInputChange('waterLevel', e.target.value)}
                                    placeholder="Target %"
                                    className="level-input"
                                />
                                <button 
                                    onClick={() => handleQuickFill('waterLevel')}
                                    className="quick-fill-btn"
                                >
                                    Fill 100%
                                </button>
                            </div>
                        </div>

                        {/* Milk */}
                        <div className="supply-item">
                            <div className="supply-header">
                                <i className="fas fa-glass-whiskey supply-icon milk"></i>
                                <span className="supply-name">Milk</span>
                                <span className="current-level">Current: {Math.round(machine.milkLevel || 0)}%</span>
                            </div>
                            <div className="supply-controls">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={refillData.milkLevel}
                                    onChange={(e) => handleInputChange('milkLevel', e.target.value)}
                                    placeholder="Target %"
                                    className="level-input"
                                />
                                <button 
                                    onClick={() => handleQuickFill('milkLevel')}
                                    className="quick-fill-btn"
                                >
                                    Fill 100%
                                </button>
                            </div>
                        </div>

                        {/* Beans */}
                        <div className="supply-item">
                            <div className="supply-header">
                                <i className="fas fa-seedling supply-icon beans"></i>
                                <span className="supply-name">Beans</span>
                                <span className="current-level">Current: {Math.round(machine.beansLevel || 0)}%</span>
                            </div>
                            <div className="supply-controls">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={refillData.beansLevel}
                                    onChange={(e) => handleInputChange('beansLevel', e.target.value)}
                                    placeholder="Target %"
                                    className="level-input"
                                />
                                <button 
                                    onClick={() => handleQuickFill('beansLevel')}
                                    className="quick-fill-btn"
                                >
                                    Fill 100%
                                </button>
                            </div>
                        </div>

                        {/* Sugar */}
                        <div className="supply-item">
                            <div className="supply-header">
                                <i className="fas fa-cube supply-icon sugar"></i>
                                <span className="supply-name">Sugar</span>
                                <span className="current-level">Current: {Math.round(machine.sugarLevel || 0)}%</span>
                            </div>
                            <div className="supply-controls">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={refillData.sugarLevel}
                                    onChange={(e) => handleInputChange('sugarLevel', e.target.value)}
                                    placeholder="Target %"
                                    className="level-input"
                                />
                                <button 
                                    onClick={() => handleQuickFill('sugarLevel')}
                                    className="quick-fill-btn"
                                >
                                    Fill 100%
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleRefill}>
                        <i className="fas fa-fill-drip"></i>
                        Refill Selected
                    </button>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    border-radius: 15px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 25px;
                    border-bottom: 1px solid #e9ecef;
                }

                .modal-header h3 {
                    margin: 0;
                    color: #495057;
                    font-weight: 700;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #6c757d;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close-btn:hover {
                    color: #495057;
                }

                .modal-body {
                    padding: 25px;
                }

                .modal-description {
                    color: #6c757d;
                    margin-bottom: 25px;
                    text-align: center;
                }

                .supply-grid {
                    display: grid;
                    gap: 20px;
                }

                .supply-item {
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 20px;
                    border: 1px solid #e9ecef;
                }

                .supply-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .supply-icon {
                    font-size: 1.2rem;
                    width: 25px;
                    text-align: center;
                }

                .supply-icon.water { color: #007bff; }
                .supply-icon.milk { color: #ffc107; }
                .supply-icon.beans { color: #28a745; }
                .supply-icon.sugar { color: #6f42c1; }

                .supply-name {
                    font-weight: 600;
                    color: #495057;
                    flex: 1;
                }

                .current-level {
                    font-size: 0.9rem;
                    color: #6c757d;
                    font-weight: 500;
                }

                .supply-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .level-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 6px;
                    font-size: 0.9rem;
                }

                .level-input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
                }

                .quick-fill-btn {
                    padding: 8px 12px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    white-space: nowrap;
                }

                .quick-fill-btn:hover {
                    background: #5a6fd8;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 20px 25px;
                    border-top: 1px solid #e9ecef;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #5a6268;
                }

                .btn-primary {
                    background: #667eea;
                    color: white;
                }

                .btn-primary:hover {
                    background: #5a6fd8;
                }

                @media (max-width: 768px) {
                    .modal-content {
                        width: 95%;
                        margin: 20px;
                    }

                    .supply-controls {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .quick-fill-btn {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default RefillModal;
