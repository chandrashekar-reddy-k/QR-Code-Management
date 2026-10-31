import prisma from '../../utils/prisma.js';
import { logActivity } from '../../utils/activityLogger.js';

// Get current business settings
export const getSettings = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user.storeId || null;
    const tenantId = req.user.tenantId;

    // 1. Try to fetch store-specific settings using findFirst to avoid null storeId key error
    let settings = null;
    if (storeId) {
      settings = await prisma.businessSettings.findFirst({
        where: { tenantId, storeId }
      });
    }

    // 2. If no store settings, try to fetch global tenant settings (storeId IS NULL)
    if (!settings) {
      settings = await prisma.businessSettings.findFirst({
        where: { tenantId, storeId: null }
      });
    }
    
    // 3. If still no settings exist, return the defaults
    if (!settings) {
      let defaultAddress = null;
      try {
        if (storeId) {
          const wh = await prisma.warehouse.findFirst({
            where: { OR: [{ id: storeId }, { store: { id: storeId } }] },
            select: { address: true }
          });
          defaultAddress = wh?.address || null;
        }
      } catch (e) {
        console.warn('Could not fetch fallback warehouse address:', e.message);
      }
      return res.json({ 
        success: true, 
        data: {
          businessName: 'VillagKart',
          taxRates: '0,5,12,18',
          address: defaultAddress
        } 
      });
    }

    if (settings && !settings.address && storeId) {
      try {
        const wh = await prisma.warehouse.findFirst({
          where: { OR: [{ id: storeId }, { store: { id: storeId } }] },
          select: { address: true }
        });
        if (wh?.address) {
          settings.address = wh.address;
        }
      } catch (e) {
        console.warn('Could not fetch fallback warehouse address:', e.message);
      }
    }
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

// Update business settings
export const updateSettings = async (req, res) => {
  try {
    const { 
      businessName, gstNo, contactNo, email, address, taxRates, shifts, 
      deliverySlabs, deliverySlots, deliveryRadiusEnforced, deliveryRadius, surcharges,
      storeId: bodyStoreId 
    } = req.body;
    const tenantId = req.user.tenantId;
    const storeId = bodyStoreId || req.user.storeId || null;

    const dataToUpdate = {};
    const fields = [
      'businessName', 'gstNo', 'contactNo', 'email', 'address', 'taxRates', 
      'shifts', 'shiftMode', 'deliverySlabs', 'deliverySlots', 
      'deliveryRadiusEnforced', 'deliveryRadius', 'surcharges'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        dataToUpdate[field] = req.body[field];
      }
    });

    const settings = await prisma.businessSettings.upsert({
      where: { tenantId_storeId: { tenantId, storeId } },
      update: {
        ...dataToUpdate,
        updatedAt: new Date()
      },
      create: {
        ...dataToUpdate,
        tenantId,
        storeId: storeId || null
      }
    });

    // Log the activity
    await logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId,
      action: 'SETTINGS_UPDATED',
      details: `Business settings updated for ${storeId ? 'Store' : 'Organization'}`,
      metadata: { fieldsUpdated: Object.keys(dataToUpdate) }
    });

    res.json({ success: true, data: settings, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
};
