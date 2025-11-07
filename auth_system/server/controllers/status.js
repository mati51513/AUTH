const SystemStatus = require('../models/SystemStatus');
const { getValidatedTime } = require('../utils/timeValidator');

// @desc    Get all system statuses
// @route   GET /api/status
// @access  Public
exports.getSystemStatus = async (req, res) => {
  try {
    const statuses = await SystemStatus.find();
    
    // If no statuses exist, initialize default services
    if (statuses.length === 0) {
      await initializeDefaultServices();
      const newStatuses = await SystemStatus.find();
      return res.status(200).json({
        success: true,
        data: newStatuses
      });
    }
    
    res.status(200).json({
      success: true,
      data: statuses
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update system status
// @route   PUT /api/status/:id
// @access  Private/Admin
exports.updateSystemStatus = async (req, res) => {
  try {
    const { status, message } = req.body;
    
    if (!['operational', 'degraded', 'outage'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    const systemStatus = await SystemStatus.findById(req.params.id);
    
    if (!systemStatus) {
      return res.status(404).json({
        success: false,
        error: 'System status not found'
      });
    }
    
    const now = await getValidatedTime();
    
    // Update status and add to history
    systemStatus.status = status;
    systemStatus.lastUpdated = now;
    systemStatus.history.push({
      status,
      timestamp: now,
      message: message || `Status changed to ${status}`
    });
    
    await systemStatus.save();
    
    res.status(200).json({
      success: true,
      data: systemStatus
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get system status incidents (last 30 days)
// @route   GET /api/status/incidents
// @access  Public
exports.getIncidents = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const statuses = await SystemStatus.find();
    
    // Group incidents by day
    const incidents = {};
    
    statuses.forEach(service => {
      service.history.forEach(event => {
        if (event.status !== 'operational' && new Date(event.timestamp) >= thirtyDaysAgo) {
          const date = new Date(event.timestamp).toISOString().split('T')[0];
          
          if (!incidents[date]) {
            incidents[date] = [];
          }
          
          incidents[date].push({
            service: service.service,
            status: event.status,
            message: event.message,
            timestamp: event.timestamp
          });
        }
      });
    });
    
    res.status(200).json({
      success: true,
      data: incidents
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Helper function to initialize default services
async function initializeDefaultServices() {
  const defaultServices = [
    'API',
    'Authentication',
    'License Validation',
    'Database',
    'Panel',
    'Discord Bot',
    'Loader Connections',
    'HWID Verification',
    'Email Service'
  ];
  
  const now = await getValidatedTime();
  
  for (const service of defaultServices) {
    await SystemStatus.create({
      service,
      status: 'operational',
      lastUpdated: now,
      history: [{
        status: 'operational',
        timestamp: now,
        message: 'Service initialized'
      }]
    });
  }
}