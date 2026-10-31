import { prisma } from "../config/prismaClient.js";

/**
 * Controller for Managing Dynamic App Section Configurations
 * (e.g., "Shop More, Unlock More", "Featured Products", etc.)
 */

// GET /api/v1/partner/promotions/app-sections
export const getAllAppSections = async (req, res) => {
  try {
    const { roleName, isActive, search } = req.query;

    const where = {};
    if (roleName) where.roleName = String(roleName);
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subTitle: { contains: search, mode: 'insensitive' } },
        { titleType: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sections = await prisma.appSectionConfig.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: "App sections fetched successfully",
      data: sections,
    });
  } catch (error) {
    console.error("Error fetching app sections:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching app sections",
      error: error.message,
    });
  }
};

// GET /api/v1/partner/promotions/app-sections/:id
export const getAppSectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await prisma.appSectionConfig.findUnique({
      where: { id },
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "App section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error("Error fetching app section by id:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// POST /api/v1/partner/promotions/app-sections
export const createAppSection = async (req, res) => {
  try {
    const {
      title,
      subTitle,
      titleType,
      roleName = "CUSTOMER",
      linkPath = "/coupons",
      icon = null,
      displayOrder = 1,
      isActive = true,
    } = req.body;

    if (!title || !titleType) {
      return res.status(400).json({
        success: false,
        message: "Title and titleType are required fields",
      });
    }

    const cleanTitleType = String(titleType).trim().toUpperCase();

    // Check duplicate titleType
    const existing = await prisma.appSectionConfig.findUnique({
      where: { titleType: cleanTitleType },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Section with titleType '${cleanTitleType}' already exists`,
      });
    }

    const newSection = await prisma.appSectionConfig.create({
      data: {
        title: String(title).trim(),
        subTitle: subTitle ? String(subTitle).trim() : null,
        titleType: cleanTitleType,
        roleName: String(roleName).trim(),
        linkPath: linkPath ? String(linkPath).trim() : "/coupons",
        icon: icon || null,
        displayOrder: Number(displayOrder) || 1,
        isActive: Boolean(isActive),
      },
    });

    res.status(201).json({
      success: true,
      message: "App section created successfully",
      data: newSection,
    });
  } catch (error) {
    console.error("Error creating app section:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating app section",
      error: error.message,
    });
  }
};

// PUT /api/v1/partner/promotions/app-sections/:id
export const updateAppSection = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subTitle,
      titleType,
      roleName,
      linkPath,
      icon,
      displayOrder,
      isActive,
    } = req.body;

    const existing = await prisma.appSectionConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "App section not found",
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = String(title).trim();
    if (subTitle !== undefined) updateData.subTitle = subTitle ? String(subTitle).trim() : null;
    if (roleName !== undefined) updateData.roleName = String(roleName).trim();
    if (linkPath !== undefined) updateData.linkPath = linkPath ? String(linkPath).trim() : "/coupons";
    if (icon !== undefined) updateData.icon = icon;
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (titleType !== undefined) {
      const cleanTitleType = String(titleType).trim().toUpperCase();
      if (cleanTitleType !== existing.titleType) {
        const duplicate = await prisma.appSectionConfig.findUnique({
          where: { titleType: cleanTitleType },
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Section with titleType '${cleanTitleType}' already exists`,
          });
        }
        updateData.titleType = cleanTitleType;
      }
    }

    const updated = await prisma.appSectionConfig.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "App section updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating app section:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating app section",
      error: error.message,
    });
  }
};

// DELETE /api/v1/partner/promotions/app-sections/:id
export const deleteAppSection = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.appSectionConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "App section not found",
      });
    }

    await prisma.appSectionConfig.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "App section deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting app section:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting app section",
      error: error.message,
    });
  }
};
