import express from 'express';
const router = express.Router();
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { sendOtpValidator, verifyOtpValidator, createUserValidator, updateUserValidator } from '../validations/userValidation.js'
import { createProductValidator, updateProductValidator } from '../validations/productValidation.js'
import { updateOrderStatusValidator } from '../validations/orderValidation.js'
import { sendOtp, verifyOtp, resendOtp, logout } from '../controllers/authController.js'
import { createUser, updateUserApproval, updateUser, getUsersByRole, getUserCountsByRoleAndStatus, deleteUser, getWarehouseStaffList, getSupplierList, getDeliveryAgentList } from '../controllers/userController.js';
import { createOrder, getOrderList, updateOrderStatus, getOrdersByOrderId } from '../controllers/orderController.js';
import { uploadFile, getFile } from '../controllers/uploadController.js'

// Auth
router.post('/login', sendOtpValidator, sendOtp);
router.post('/verify-otp', verifyOtpValidator, verifyOtp);
router.post('/resend-otp', sendOtpValidator, resendOtp);
router.post('/logout', authMiddleware, logout);

// file upload APIs
router.post('/upload',authMiddleware, uploadFile);
router.get('/files', authMiddleware, getFile);

// Users
router.post('/register', createUserValidator, authMiddleware, createUser);
router.put('/:userId', updateUserValidator, authMiddleware, updateUser);
router.post('/approve/:id', authMiddleware, updateUserApproval);
router.get('/users-list', authMiddleware, getUsersByRole);
router.get('/stats', authMiddleware, getUserCountsByRoleAndStatus);
router.delete('/users/:userId', authMiddleware, deleteUser);
router.get('/users/warehouse', authMiddleware, getWarehouseStaffList);
router.get('/users/suppliers', authMiddleware, getSupplierList);
router.get('/users/delivery-agent', authMiddleware, getDeliveryAgentList);

// Orders
router.post('/create-order', createOrder);
router.get('/order-list', authMiddleware, getOrderList);
router.put('/order/status', updateOrderStatusValidator, authMiddleware, updateOrderStatus);
router.get('/orders/:orderId', authMiddleware, getOrdersByOrderId);


export default router;