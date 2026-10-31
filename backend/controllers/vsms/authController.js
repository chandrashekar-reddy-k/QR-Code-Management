import { prisma } from '../../config/prismaClient.js';
import bcrypt from 'bcryptjs';
import { generateUserToken } from '../../utils/jwtUtils.js';
import { uploadToSupabase } from '../utils/supabaseService.js';
import { createIdentityUser } from '../../utils/identityService.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
    try {
        const { mobile, password } = req.body;
        console.log(`[DEBUG] Login attempt: ${mobile}`);

        const isEmail = mobile && mobile.includes('@');
        const user = await prisma.user.findFirst({
            where: isEmail ? { email: mobile } : { phone: mobile },
            include: { assignedVehicle: true, store: true },
        });
        console.log(`[DEBUG] User found: ${!!user}, Active: ${user?.isActive}, Role: ${user?.role}`);

        if (!user) {
            console.log('[DEBUG] Login failed: User not found');
            res.status(401);
            throw new Error('Invalid mobile or password');
        }

        if (user.isActive === false) {
            console.log('[DEBUG] Login failed: User inactive');
            return res.status(403).json({
                success: false,
                message: 'Account is inactive. Please contact your administrator.'
            });
        }

        if (user.role === 'DELIVERY_AGENT') {
            console.log('[DEBUG] Login failed: DELIVERY_AGENT role not allowed');
            return res.status(403).json({
                success: false,
                message: 'Delivery agents are not permitted to log in here. Please use the Delivery Agent App.'
            });
        }

        if ((user.role === 'SALES_AGENT' || user.role === 'VEHICLE_AGENT') && user.assignedVehicle && user.assignedVehicle.status === false) {
            console.log('[DEBUG] Login failed: Vehicle inactive');
            return res.status(403).json({
                success: false,
                message: `Your assigned vehicle (${user.assignedVehicle.vehicleNumber}) is currently INACTIVE. Access denied.`
            });
        }

        console.log('[DEBUG] Comparing password...');
        if (await bcrypt.compare(password, user.password)) {
            console.log('[DEBUG] Password matched. Generating token...');
            const token = generateUserToken(user);
            console.log('[DEBUG] Token generated successfully');

            const isAgentRole = ['SALES_AGENT', 'VEHICLE_AGENT', 'DELIVERY_AGENT'].includes(user.role);

            res.json({
                id: user.id,
                tenantId: 'VK001',
                tenantName: 'VillagKart',
                tenantLogo: null,
                storeId: user.storeId,
                storeName: user.store?.name,
                storeLogo: user.store?.logo || null,
                name: user.name,
                avatar: user.avatar,
                email: user.email,
                mobile: user.phone,
                role: user.role,
                assignedVehicleId: user.assignedVehicleId,
                assignedVehicle: user.assignedVehicle,
                customRoleId: user.customRoleId,
                customRoleName: isAgentRole ? 'Agent' : null,
                permissions: isAgentRole ? ['*'] : null,
                portalType: isAgentRole ? 'AGENT' : null,
                attendanceEnabled: user.attendanceEnabled,
                token: token,
            });
        } else {
            console.log('[DEBUG] Login failed: Password mismatch');
            res.status(401);
            throw new Error('Invalid mobile or password');
        }

    } catch (error) {
        next(error);
    }
};

// @desc    Register a new user (Tenant Owner)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
    try {
        const { name, surname, mobile, gender, password, email } = req.body;

        if (!mobile || !password || !name) {
            res.status(400);
            throw new Error('Please provide name, mobile and password');
        }

        const userExists = await prisma.user.findUnique({ where: { phone: mobile } });
        if (userExists) {
            res.status(400);
            throw new Error('User with this mobile number already exists');
        }

        // Generate a unique tenant code
        const tenantCount = await prisma.tenant.count();
        const tenantCode = `VK${String(tenantCount + 1).padStart(3, '0')}`;

        // Create Tenant first
        const tenant = await prisma.tenant.create({
            data: {
                name: `${name}'s Business`,
                code: tenantCode,
                contactPhone: mobile,
                contactEmail: email || null,
            }
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ── Step 1: Create user in Identity Service (single source of truth) ──
        let identityUserId;
        try {
          const identityUser = await createIdentityUser({
            name: `${name} ${surname || ''}`.trim(),
            email: email || null,
            phone: mobile,
            password,
            role: 'TENANT_OWNER'
          });
          identityUserId = identityUser.id;
        } catch (identityErr) {
          // Roll back tenant creation
          await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
          res.status(502);
          throw new Error(`Failed to register user in Identity Service: ${identityErr.message}`);
        }

        // ── Step 2: Create local user record using Identity Service user ID ──
        const user = await prisma.user.create({
            data: {
                id: identityUserId, // Use Identity Service UUID as primary key
                name: `${name} ${surname || ''}`.trim(),
                phone: mobile,
                email: email || `${mobile}@villagkart.com`,
                password: hashedPassword,
                role: 'TENANT_OWNER',
                isActive: true
            }
        });

        const token = generateUserToken(user);

        res.status(201).json({
            id: user.id,
            tenantId: 'VK001',
            tenantName: tenant.name,
            name: user.name,
            mobile: user.phone,
            role: user.role,
            token: token,
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Logout user / clear cookie or token (using token so frontend clears it)
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/me (or /api/profile)
// @access  Private
export const getUserProfile = async (req, res, next) => {
    try {
        let user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                store: { select: { id: true, name: true, logoUrl: true } },
                assignedVehicle: true,
                documents: true
            }
        });

        if (!user && (req.user.email || req.user.phone)) {
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        ...(req.user.phone ? [{ phone: req.user.phone }] : []),
                        ...(req.user.email ? [{ email: req.user.email }] : [])
                    ]
                },
                include: {
                    store: { select: { id: true, name: true, logoUrl: true } },
                    assignedVehicle: true,
                    documents: true
                }
            });
        }

        if (user) {
            res.json({
                ...user,
                mobile: user.phone,
                tenantName: 'VillagKart',
                tenantLogo: null,
                storeName: user.store?.name,
                storeLogo: user.store?.logoUrl || null,
                customRoleName: 'Agent',
                permissions: ['*'],
                portalType: 'AGENT',
            });
        } else {
            res.status(404).json({ success: false, message: 'User profile not found' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
export const updatePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify old password
        if (!(await bcrypt.compare(oldPassword, user.password))) {
            return res.status(401).json({ message: 'Incorrect old password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle agent online/offline status in database
// @route   PUT /api/agent/auth/status
// @access  Private
export const updateAgentStatus = async (req, res, next) => {
    try {
        const { isOnline } = req.body;
        let userId = req.user.id;

        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user && (req.user.email || req.user.phone)) {
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        ...(req.user.phone ? [{ phone: req.user.phone }] : []),
                        ...(req.user.email ? [{ email: req.user.email }] : [])
                    ]
                }
            });
            if (user) userId = user.id;
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                isOnline: Boolean(isOnline),
                lastActive: new Date()
            },
            select: { id: true, isOnline: true, lastActive: true, currentLocation: true }
        });

        // Broadcast socket update immediately to partner web portal
        try {
            const { getIO } = await import('../../services/socketService.js');
            const io = getIO();
            if (io) {
                const loc = updated.currentLocation && typeof updated.currentLocation === 'object' ? updated.currentLocation : {};
                const payload = {
                    userId,
                    isOnDuty: updated.isOnline,
                    isOnline: updated.isOnline,
                    lat: loc.lat || null,
                    long: loc.lon || null,
                    subLocation: loc.subLocation || (updated.isOnline ? 'Active (GPS ON)' : 'Offline'),
                    timestamp: updated.lastActive
                };
                io.emit('location:update', payload);
                io.to('admin_room').emit('location:update', payload);
            }
        } catch (socketErr) {
            console.warn('[Status] Socket broadcast skipped:', socketErr.message);
        }

        res.json({
            success: true,
            message: `Status updated to ${updated.isOnline ? 'ONLINE' : 'OFFLINE'}`,
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

// jsjsjs
// @desc    Upload document for current user
// @route   POST /api/auth/me/documents
// @access  Private
export const uploadMyDocument = async (req, res, next) => {
    try {
        const { type, documentNumber } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = await uploadToSupabase(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'users',
            'kyc'
        );

        if (!fileUrl) {
            return res.status(500).json({ message: 'Failed to upload to cloud storage' });
        }

        const document = await prisma.userDocument.create({
            data: {
                userId: req.user.id,
                type,
                documentNumber,
                fileUrl,
                status: 'PENDING'
            }
        });

        res.status(201).json({ message: 'Document uploaded successfully', document });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile (name, avatar)
// @route   PUT /api/auth/me
// @access  Private
export const updateUserProfile = async (req, res, next) => {
    try {
        console.log('[updateUserProfile] Request received. Body:', req.body, 'File present:', !!req.file);
        if (!req.user || !req.user.id) {
            console.error('[updateUserProfile] req.user is missing or invalid');
            return res.status(401).json({ message: 'User reference missing from session request' });
        }

        const { name, phone, email } = req.body;
        const updateData = { updatedAt: new Date() };

        if (name !== undefined && name.trim() !== '') {
            updateData.name = name.trim();
        }

        if (phone !== undefined && phone.trim() !== '') {
            updateData.phone = phone.trim();
        }

        if (email !== undefined && email.trim() !== '') {
            updateData.email = email.trim();
        }

        if (req.file) {
            console.log(`[updateUserProfile] Uploading avatar: ${req.file.originalname} (${req.file.mimetype})`);
            try {
                const avatarUrl = await uploadToSupabase(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'users',
                    'avatars'
                );
                console.log('[updateUserProfile] Avatar uploaded successfully to URL:', avatarUrl);
                if (avatarUrl) {
                    updateData.avatar = avatarUrl;
                }
            } catch (uploadErr) {
                console.error('[updateUserProfile] Upload failed:', uploadErr.message);
                // Keep processing name even if file upload triggers a non-fatal storage block
            }
        }

        console.log('[updateUserProfile] Executing user lookup for ID:', req.user.id);
        let targetUserId = req.user.id;
        let existingUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!existingUser && (req.user.email || req.user.phone)) {
            existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        ...(req.user.phone ? [{ phone: req.user.phone }] : []),
                        ...(req.user.email ? [{ email: req.user.email }] : [])
                    ]
                }
            });
            if (existingUser) {
                targetUserId = existingUser.id;
            }
        }

        if (!existingUser) {
            console.error('[updateUserProfile] User record not found for ID:', req.user.id);
            return res.status(404).json({ success: false, message: 'User profile not found in database' });
        }

        console.log('[updateUserProfile] Executing DB update for user ID:', targetUserId, 'with data:', updateData);
        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: updateData,
            select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
                phone: true,
                role: true,
            }
        });

        console.log('[updateUserProfile] Update successful:', updatedUser);
        res.json({ 
            success: true, 
            data: {
                ...updatedUser,
                mobile: updatedUser.phone
            }, 
            message: 'Profile updated successfully' 
        });
    } catch (error) {
        console.error('[updateUserProfile Final Error]:', error);
        if (error.code === 'P2002') {
            const field = error.meta?.target?.includes('phone') ? 'Phone number' : 'Email address';
            return res.status(400).json({
                success: false,
                message: `${field} is already registered with another account.`
            });
        }
        res.status(500).json({ success: false, message: error.message || 'Internal server error updating profile' });
    }
};

// @desc    Update business profile (store/tenant name and logo)
// @route   PUT /api/auth/business
// @access  Private
export const updateBusinessProfile = async (req, res, next) => {
    try {
        console.log('[updateBusinessProfile] Request received. Body:', req.body, 'File present:', !!req.file);
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { store: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User reference missing' });
        }

        const { businessName } = req.body;
        let logoUrl = null;

        if (req.file) {
            console.log(`[updateBusinessProfile] Uploading logo: ${req.file.originalname}`);
            try {
                logoUrl = await uploadToSupabase(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'business',
                    'logos'
                );
                console.log('[updateBusinessProfile] Logo uploaded successfully:', logoUrl);
            } catch (err) {
                console.error('[updateBusinessProfile] Logo upload failed:', err.message);
            }
        }

        let updatedData = null;

        if (user.storeId) {
            const updatePayload = { updatedAt: new Date() };
            if (businessName !== undefined && businessName.trim() !== '') {
                updatePayload.name = businessName.trim();
            }
            if (logoUrl) {
                updatePayload.logo = logoUrl;
            }
            updatedData = await prisma.store.update({
                where: { id: user.storeId },
                data: updatePayload
            });
        } else {
            const updatePayload = { updatedAt: new Date() };
            if (businessName !== undefined && businessName.trim() !== '') {
                updatePayload.name = businessName.trim();
            }
            if (logoUrl) {
                updatePayload.logo = logoUrl;
            }
            updatedData = await prisma.tenant.update({
                where: { id: 'VK001' },
                data: updatePayload
            });
        }

        res.json({
            success: true,
            data: updatedData,
            message: 'Business profile customized successfully'
        });
    } catch (error) {
        console.error('[updateBusinessProfile Error]:', error.message || error);
        if (error.stack) {
            console.error('[updateBusinessProfile Stack]:', error.stack);
        }
        res.status(500).json({ success: false, message: error.message || 'Internal server error updating business profile' });
    }
};

