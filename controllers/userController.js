import {generateWarehouseCode} from '../utils/otpUtils.js';
import {prisma} from '../config/prismaClient.js'
import logger from '../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../utils/responseHelper.js';
import pkg from '@prisma/client';
const { UserRole } = pkg;
import bcrypt from 'bcryptjs';

// Create User API
const createUser = async (req, res) => {
  try {
    const {
      phone,
      role,
      name,
      email,
      password,
      avatar,
      // vehicleType,
      licensePlate,
      region,
      address, 
      warehouse,
      supplier,
      vehicleType,
      vehicleInfo 
    } = req.body;

    // Basic validation
    if (!name || !phone || !role || !avatar) {
      logger.warn('Name or Phone or role or avatar missing in request');
      return errorResponse(res, 400, 'Name, Phone, avatar and role are required');
    }

    // Validate region if role is REGIONAL_ADMIN
    if (role === UserRole.REGIONAL_ADMIN && !region) {
      logger.warn('Region missing for REGIONAL_ADMIN');
      return errorResponse(res, 400, 'Region is required for REGIONAL_ADMIN');
    }

    // Validate address object
    if (!address || !address.line1 || !address.city || !address.state || !address.pincode) {
      logger.warn('Incomplete address provided');
      return errorResponse(res, 400, 'Address line1, city, state, and pincode are required');
    }

    // Check duplicate phone
    const existingPhoneUser = await prisma.user.findUnique({
      where: { phone },
    });
    if (existingPhoneUser) {
      logger.warn(`Duplicate phone attempted: ${phone}`);
      return errorResponse(res, 400, 'Phone number already registered');
    }

    // Check duplicate email (if provided)
    if (email) {
      const existingEmailUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmailUser) {
        logger.warn(`Duplicate email attempted: ${email}`);
        return errorResponse(res, 400, 'Email already registered');
      }
    }

    // Hash password
    let hashedPassword = null;
    if(password){
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // // Create User along with Address in transaction
    // const user = await prisma.user.create({
    //   data: {
    //     phone,
    //     role,
    //     name,
    //     email,
    //     password: hashedPassword, // in production: hash password before storing
    //     avatar,
    //     vehicleType,
    //     licensePlate,
    //     region,
    //     addresses: {
    //       create: {
    //         label: address.label,
    //         line1: address.line1,
    //         line2: address.line2,
    //         city: address.city,
    //         state: address.state,
    //         pincode: address.pincode,
    //         isDefault: address.isDefault ?? true, // first address defaults to true
    //         location: address.location,
    //       },
    //     },
    //   },
    //   select: {
    //     id: true,
    //     phone: true,
    //     role: true,
    //     name: true,
    //     email: true,
    //     avatar: true,
    //     vehicleType: true,
    //     licensePlate: true,
    //     region: true,
    //     isActive: true,
    //     isVerified: true,
    //     createdAt: true,
    //     addresses: true, // include address relation
    //   },
    // });

    // Transaction: create user (with address) and optionally warehouse
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone,
          role,
          name,
          email,
          password: hashedPassword,
          avatar,
          vehicleType,
          licensePlate,
          region,
          addresses: {
            create: {
              label: address.label,
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              isDefault: address.isDefault ?? true,
              location: address.location,
            },
          },
        },
        select: {
          id: true,
          phone: true,
          role: true,
          name: true,
          email: true,
          avatar: true,
          region: true,
          createdAt: true,
          updatedAt: true,
          addresses: true,
        },
      });

      let warehouseData = null;
      let supplierData = null;
      let vehicleInfoData = null;

      if (role === UserRole.WAREHOUSE_STAFF) {
        if (
          !warehouse ||
          !warehouse.name ||
          !warehouse.location ||
          !warehouse.address ||
          !warehouse.servicePincodes
        ) {
          throw new Error(
            "Warehouse details (name, location, address, servicePincodes) are required for WAREHOUSE_STAFF"
          );
        }

        warehouseData = await tx.warehouse.create({
          data: {
            name: warehouse.name,
            code: generateWarehouseCode(),
            location: warehouse.location,
            address: warehouse.address,
            phone: phone, // optional mapping
            isActive: warehouse.isActive ?? true,
            opensAt: warehouse.opensAt,
            closesAt: warehouse.closesAt,
            servicePincodes: warehouse.servicePincodes,
          },
        });
        // Link warehouseId to user
        await tx.user.update({
          where: { id: user.id },
          data: { warehouseId: warehouseData.id },
        });
      }

      if (role === UserRole.SUPPLIER) {
        if (!supplier || !supplier.companyName || !supplier.businessAddress) {
          throw new Error('Supplier details (companyName, businessAddress) are required for SUPPLIER');
        }

        supplierData = await tx.supplier.create({
          data: {
            userId: user.id,
            companyName: supplier.companyName,
            gstin: supplier.gstin,
            businessAddress: supplier.businessAddress, // JSON form of address
            licenseDocs: supplier.licenseDocs,
            operatingHours: supplier.operatingHours,
            deliveryOptions: supplier.deliveryOptions,
          },
        });
      }

      // DELIVERY_AGENT
      if (role === UserRole.DELIVERY_AGENT) {

        if (!vehicleInfo) {
          throw new Error("Vehicle information is required for DELIVERY_AGENT");
        }
        const {
          vehicleType,
          brand,
          model,
          year,
          color,
          registrationNumber,
          engineNumber,
          chassisNumber,
          insuranceProvider,
          policyNumber,
          insuranceExpiry,
          drivingLicenseNumber,
          licenseExpiry,
          rcExpiry,
          pucExpiry
        } = vehicleInfo;

        const requiredVehicleFields = {
          vehicleType,
          brand,
          model,
          year,
          color,
          registrationNumber,
          engineNumber,
          chassisNumber,
        };

        const missingFields = Object.entries(requiredVehicleFields)
          .filter(([_, v]) => v === undefined || v === null || v === "")
          .map(([key]) => key);

        if (missingFields.length > 0) {
          throw new Error(`Missing required vehicle fields: ${missingFields.join(", ")}`);
        }

        vehicleInfoData = await tx.vehicleInfo.create({
          data: {
            agentId: user.id,
            vehicleType,
            brand,
            model,
            year: parseInt(year),
            color,
            registrationNumber,
            engineNumber,
            chassisNumber,
            insuranceProvider,
            policyNumber,
            insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
            drivingLicenseNumber,
            licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
            rcExpiry: rcExpiry ? new Date(rcExpiry) : null,
            pucExpiry: pucExpiry ? new Date(pucExpiry) : null,
          },
        });
      }

      return { user, warehouse: warehouseData, supplier: supplierData, vehicleInfo: vehicleInfoData };
    });

    logger.info(`User created successfully with ID: ${result.user.id}`);
    return successResponse(res, 201, result, 'User created successfully');
  } catch (error) {
    logger.error(`Error while creating user: ${error.message}`);
    return errorResponse(res, 500, 'Internal server error', error.message);
  }
};

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      phone,
      role,
      name,
      email,
      password,
      avatar,
      vehicleType,
      licensePlate,
      region,
      isActive,
      address,    // address object
      warehouse,  // warehouse object
      supplier,   // supplier object
      vehicleInfo,   // vehicle info object (for DELIVERY_AGENT)
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return errorResponse(res, 404, "User not found");
    }

    // Duplicate phone check
    if (phone && phone !== existingUser.phone) {
      const phoneExists = await prisma.user.findUnique({ where: { phone } });
      if (phoneExists) return errorResponse(res, 400, "Phone already exists");
    }

    // Duplicate email check
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) return errorResponse(res, 400, "Email already exists");
    }

    // Hash password if updated
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Transaction: update user, address, and warehouse if applicable
    const result = await prisma.$transaction(async (tx) => {
      // Update User
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          phone,
          role,
          name,
          email,
          password: hashedPassword,
          avatar,
          vehicleType,
          licensePlate,
          region,
          isActive,
        },
        select: {
          id: true,
          phone: true,
          role: true,
          name: true,
          email: true,
          avatar: true,
          region: true,
          isActive: true,
        },
      });

      let updatedWarehouse = null;

       if (warehouse) {
        let warehouseIdToLink = warehouse.id;

        if (warehouse.id) {
          // Update existing warehouse
          const warehouseDataToUpdate = {};
          if (warehouse.name) warehouseDataToUpdate.name = warehouse.name;
          if (warehouse.location) warehouseDataToUpdate.location = warehouse.location;
          if (warehouse.address) warehouseDataToUpdate.address = warehouse.address;
          if (warehouse.phone) warehouseDataToUpdate.phone = warehouse.phone;
          if (warehouse.isActive !== undefined) warehouseDataToUpdate.isActive = warehouse.isActive;
          if (warehouse.opensAt) warehouseDataToUpdate.opensAt = warehouse.opensAt;
          if (warehouse.closesAt) warehouseDataToUpdate.closesAt = warehouse.closesAt;
          if (warehouse.servicePincodes) warehouseDataToUpdate.servicePincodes = warehouse.servicePincodes;

          updatedWarehouse = await tx.warehouse.update({
            where: { id: warehouse.id },
            data: warehouseDataToUpdate,
          });
        } else {
          // Create new warehouse
          updatedWarehouse = await tx.warehouse.create({
            data: {
              name: warehouse.name,
              code: generateWarehouseCode(),
              location: warehouse.location,
              address: warehouse.address,
              phone: warehouse.phone,
              isActive: warehouse.isActive ?? true,
              opensAt: warehouse.opensAt,
              closesAt: warehouse.closesAt,
              servicePincodes: warehouse.servicePincodes,
            },
          });
          warehouseIdToLink = updatedWarehouse.id;
        }

        // Update user's warehouseId
        await tx.user.update({
          where: { id: userId },
          data: { warehouseId: warehouseIdToLink },
        });
      }

      // Update Supplier (if applicable)
      if (supplier) {
        const existingSupplier = await tx.supplier.findUnique({
          where: { userId },
        });

        if (existingSupplier) {
          await tx.supplier.update({
            where: { userId },
            data: {
              companyName: supplier.companyName,
              gstin: supplier.gstin,
              businessAddress: supplier.businessAddress,
              licenseDocs: supplier.licenseDocs,
              operatingHours: supplier.operatingHours,
              deliveryOptions: supplier.deliveryOptions,
            },
          });
        } else {
          await tx.supplier.create({
            data: {
              userId,
              companyName: supplier.companyName,
              gstin: supplier.gstin,
              businessAddress: supplier.businessAddress,
              licenseDocs: supplier.licenseDocs,
              operatingHours: supplier.operatingHours,
              deliveryOptions: supplier.deliveryOptions,
            },
          });
        }
      }

      // DELIVERY_AGENT logic (vehicleInfo)
      if (role === "DELIVERY_AGENT" && vehicleInfo) {
        const existingVehicle = await tx.vehicleInfo.findFirst({
          where: { agentId: userId },
        });

        const vehicleData = {
          vehicleType: vehicleInfo.vehicleType,
          brand: vehicleInfo.brand,
          model: vehicleInfo.model,
          year: vehicleInfo.year ? parseInt(vehicleInfo.year) : null,
          color: vehicleInfo.color,
          registrationNumber: vehicleInfo.registrationNumber,
          engineNumber: vehicleInfo.engineNumber,
          chassisNumber: vehicleInfo.chassisNumber,
          insuranceProvider: vehicleInfo.insuranceProvider,
          policyNumber: vehicleInfo.policyNumber,
          insuranceExpiry: vehicleInfo.insuranceExpiry ? new Date(vehicleInfo.insuranceExpiry) : null,
          drivingLicenseNumber: vehicleInfo.drivingLicenseNumber,
          licenseExpiry: vehicleInfo.licenseExpiry ? new Date(vehicleInfo.licenseExpiry) : null,
          rcExpiry: vehicleInfo.rcExpiry ? new Date(vehicleInfo.rcExpiry) : null,
          pucExpiry: vehicleInfo.pucExpiry ? new Date(vehicleInfo.pucExpiry) : null,
        };

        try {
          if (existingVehicle) {
            await tx.vehicleInfo.update({
              where: { id: existingVehicle.id },
              data: vehicleData,
            });
          } else {
            await tx.vehicleInfo.create({
              data: { agentId: userId, ...vehicleData },
            });
          }
        } catch (err) {
          if (err.code === "P2002") {
            // Prisma unique constraint error
            throw new Error("Duplicate vehicle info: registration, engine or chassis number already exists");
          }
          throw err; // rethrow unknown errors
        }

      }

      // Update Address if provided
      if (address) {
        if (!address.id) {
          throw new Error("Address ID is required to update address");
        }

        await tx.address.update({
          where: { id: address.id },
          data: {
            label: address.label,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            isDefault: address.isDefault,
            location: address.location,
          },
        });
      }

      // 4️⃣ Fetch user with warehouse and addresses for response
      const userWithRelations = await tx.user.findUnique({
        where: { id: userId },
        include: { addresses: true, Warehouse: true, supplier: true, vehicles: true },
      });

      return { user: userWithRelations };

      // return { user: updatedUser, warehouse: updatedWarehouse };
    });

    logger.info(`User updated successfully with ID: ${userId}`);
    return successResponse(res, 200, result, "User updated successfully");
  } catch (error) {
    logger.error(`Error while updating user: ${error.message}`);
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

const updateUserApproval = async (req, res) => {
  try {
    const { id } = req.params;          // from route param
    const { isActive } = req.body;      // true or false

    if (isActive === undefined) {
      logger.warn('updateUserStatus: isActive is missing in request body');
      return errorResponse(res, 400, 'isActive (true/false) is required');
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      logger.warn(`updateUserStatus: User not found with id ${id}`);
      return errorResponse(res, 404, 'User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    logger.info(
      `updateUserStatus: User status updated successfully, id=${id}, isActive=${isActive}`
    );
    return successResponse(
      res,
      200,
      updatedUser,
      `User ${isActive ? 'approved' : 'disapproved'} successfully`,
    );

  } catch (error) {
    logger.error(
      `updateUserStatus: Error while updating user status - ${error.message}`,
      { stack: error.stack }
    );
    return errorResponse(res, 500, 'Internal server error');
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const { role, search, isActive, page = 1, limit = 10 } = req.query;

    if (!role) {
      logger.warn('getUsersByRole: role is missing in query params');
      return errorResponse(res, 400, 'role is required');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Support role alias (CUSTOMER maps to enum CONSUMER)
    const normalizedRole = role.toUpperCase() === 'CUSTOMER' ? 'CONSUMER' : role;

    // Build filter conditions
    const whereClause = {
      role: normalizedRole,
      ...(isActive !== undefined && { isActive: isActive === 'true' }), // convert query string to boolean
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    };

    // const users = await prisma.user.findMany({
    //   where: whereClause,
    //   orderBy: { createdAt: 'desc' },
    // });

    // Fetch data + total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          addresses: true,
          Warehouse: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  price: true,
                  stock: true,
                  warehouseId: true,
                },
              },
            },
          },
          supplier: true,
          vehicles: true,
        },
        skip,
        take,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    logger.info(
      `getUsersByRole: Fetched ${users.length} users with filters role=${role}, search=${search || 'N/A'}, isActive=${isActive || 'N/A'}`
    );

    // Format response if role is WAREHOUSE_STAFF
    // let formattedUsers = users;
    // if (role === 'WAREHOUSE_STAFF') {
    //   formattedUsers = users.map((u) => {
    //     const defaultAddress = u.addresses?.find((a) => a.isDefault) || u.addresses?.[0];
    //     const wh = u.Warehouse;

    //     return {
    //       id: u.id,
    //       phone: u.phone,
    //       role: u.role,
    //       name: u.name,
    //       email: u.email,
    //       password: u.password,
    //       avatar: u.avatar || null,
    //       vehicleType: u.vehicleType || null,
    //       licensePlate: u.licensePlate || null,
    //       region: u.region || null,
    //       address: defaultAddress
    //         ? {
    //             label: defaultAddress.label || 'Home',
    //             line1: defaultAddress.line1,
    //             line2: defaultAddress.line2,
    //             city: defaultAddress.city,
    //             state: defaultAddress.state,
    //             pincode: defaultAddress.pincode,
    //             isDefault: defaultAddress.isDefault,
    //             location: defaultAddress.location
    //               ? {
    //                   lat: defaultAddress.location.lat,
    //                   lng: defaultAddress.location.lng,
    //                 }
    //               : null,
    //           }
    //         : null,
    //       warehouse: wh
    //         ? {
    //             id: wh.id,
    //             code: wh.code,
    //             name: wh.name,
    //             location: wh.location
    //               ? {
    //                   lat: wh.location.lat,
    //                   lng: wh.location.lng,
    //                 }
    //               : null,
    //             address: {
    //               line1: wh.addressLine1,
    //               city: wh.city,
    //               state: wh.state,
    //               pincode: wh.pincode,
    //             },
    //             phone: wh.phone,
    //             servicePincodes: wh.servicePincodes || [],
    //             opensAt: wh.opensAt,
    //             closesAt: wh.closesAt,
    //             isActive: wh.isActive,
    //           }
    //         : null,
    //     };
    //   });
    // }

    return paginatedResponse(res, 200, users,{
            page: Number(page),
            limit: Number(limit),
            total
        },'Users fetched successfully');

  } catch (error) {
    logger.error(
      `getUsersByRole: Error while fetching users - ${error.message}`,
      { stack: error.stack }
    );
    return errorResponse(res, 500, 'Internal server error');
  }
};

const getUserCountsByRoleAndStatus = async (req, res) => {
  try {
    // Group by role + isActive
    const grouped = await prisma.user.groupBy({
      by: ['role', 'isActive'],
      _count: { _all: true },
    });

    // Group by role only
    const groupedByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });

    // Merge results
    const result = groupedByRole.map(roleItem => {
      const role = roleItem.role;
      const total = roleItem._count._all;

      const activeItem = grouped.find(
        item => item.role === role && item.isActive === true
      );
      const inactiveItem = grouped.find(
        item => item.role === role && item.isActive === false
      );

      return {
        role,
        total,
        active: activeItem ? activeItem._count._all : 0,
        inactive: inactiveItem ? inactiveItem._count._all : 0,
      };
    });

    logger.info('getUserCountsByRoleAndStatus: Fetched grouped user counts');

    return successResponse(res, 200, result, 'User counts fetched successfully');

  } catch (error) {
    logger.error(
      `getUserCountsByRoleAndStatus: Error while grouping users - ${error.message}`,
      { stack: error.stack }
    );
    return errorResponse(res, 500, 'Internal server error');
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      logger.warn('UserId missing in request params');
      return errorResponse(res, 400, 'UserId is required');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      logger.warn(`User not found with id: ${userId}`);
      return errorResponse(res, 404, 'User not found');
    }

    // Soft delete user (set isDeleted = true)
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info(`User permanently deleted successfully: ${userId}`);
    return successResponse(res, 200, null, 'User deleted successfully');
  } catch (error) {
    logger.error(`Error while deleting user: ${error.message}`);
    return errorResponse(res, 500, 'Internal server error', error.message);
  }
};

const getWarehouseStaffList = async (req, res) => {
  try {
    const users = await prisma.Warehouse.findMany({
      where: {
        User: {
          some: {
            role: 'WAREHOUSE_STAFF',
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return successResponse(res, 200, users, 'Active warehouse staff fetched successfully');
  } catch (error) {
    console.error('Error fetching warehouse staff list:', error);
    return errorResponse(res, 500, 'Error fetching warehouse staff list');
  }
};

const getSupplierList = async (req, res) => {
  try {
    const users = await prisma.Supplier.findMany({
      where: {
        user:{
            role: 'SUPPLIER',
            isActive: true,
        },
      },
      select: {
        id: true,
        companyName: true,
      },
      orderBy: {
        companyName: 'asc',
      },
    });

    return successResponse(res, 200, users, 'Active supplier fetched successfully');
  } catch (error) {
    console.error('Error fetching supplier list:', error);
    return errorResponse(res, 500, 'Error fetching supplier list');
  }
};

const getDeliveryAgentList = async (req, res) => {
  try {
    const users = await prisma.User.findMany({
      where: {
            role: 'DELIVERY_AGENT',
            isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return successResponse(res, 200, users, 'Active delivery agent fetched successfully');
  } catch (error) {
    console.error('Error fetching delivery agent list:', error);
    return errorResponse(res, 500, 'Error fetching delivery agent list');
  }
};

export {
  createUser,
  updateUser,
  updateUserApproval,
  getUsersByRole,
  getUserCountsByRoleAndStatus,
  deleteUser,
  getWarehouseStaffList,
  getSupplierList,
  getDeliveryAgentList
}