import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../utils/responseHelper.js';

export const getActiveCategoriesWithSubCategories = async (req, res) => {
    try {
        logger.info("[CATEGORY] Fetch active categories with subcategories");

        const categories = await prisma.category.findMany({
            where: {
                isActive: true
            },
            orderBy: {
                displayOrder: "asc"
            },
            select: {
                id: true,
                name: true,
                description: true,
                image: true,
                displayOrder: true,
                slug: true,

                subCategories: {
                    where: {
                        isActive: true
                    },
                    orderBy: {
                        displayOrder: "asc"
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        image: true,
                        displayOrder: true,
                        slug: true
                    }
                }
            }
        });

        logger.info("[CATEGORY] Categories fetched successfully", {
            count: categories.length
        });

        return successResponse(
            res,
            200,
            categories,
            "Categories with subcategories fetched successfully"
        );

    } catch (error) {
        logger.error("[CATEGORY] Fetch failed", {
            message: error.message,
            stack: error.stack
        });

        return errorResponse(res, 500, "Failed to fetch categories");
    }
};

export const addWarehouseCategories = async (req, res) => {
    try {
        const { categories } = req.body
        const userId = req.user?.id

        /* 1️⃣ Get warehouseId — prefer auth middleware, fallback to DB */
        let warehouseId = req.user?.warehouseId;
        if (!warehouseId) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { warehouseId: true } });
            warehouseId = user?.warehouseId;
        }

        if (!warehouseId) {
            return errorResponse(res, 400, "Warehouse not assigned to user");
        }

        if (!categories?.length) {
            return errorResponse(res, 400, "categories are required");
        }

        const result = []

        for (const category of categories) {

            // create or fetch warehouse category (Default approvalStatus: PENDING, isEnabled: false until approved by Admin)
            const warehouseCategory = await prisma.warehouseCategory.upsert({
                where: {
                    warehouseId_categoryId: {
                        warehouseId,
                        categoryId: category.categoryId
                    }
                },
                update: {
                    approvalStatus: 'PENDING',
                    isEnabled: false
                },
                create: {
                    warehouseId,
                    categoryId: category.categoryId,
                    approvalStatus: 'PENDING',
                    isEnabled: false
                }
            })

            // insert subcategories
            if (category.subCategoryIds?.length) {

                const subCategoryData = category.subCategoryIds.map(subId => ({
                    warehouseId,
                    warehouseCategoryId: warehouseCategory.id,
                    subCategoryId: subId,
                    approvalStatus: 'PENDING',
                    isEnabled: false
                }))

                await prisma.warehouseSubCategory.createMany({
                    data: subCategoryData,
                    skipDuplicates: true
                })
            }

            result.push(warehouseCategory)
        }

        return successResponse(res, 201, result, "Warehouse categories added successfully")

    } catch (error) {
        logger.error("[WAREHOUSE_CATEGORY] create failed", {
            message: error.message,
            stack: error.stack
        })

        return errorResponse(res, 500, "Failed to add warehouse categories")
    }
}

export const getPartnerWarehouseCategories = async (req, res) => {
  try {
    const userId = req.user?.id

    logger.info("[WAREHOUSE_CATEGORY] Fetch enabled categories request", { userId })

    /* 1️⃣ Get warehouseId — prefer auth middleware, fallback to DB */
    let warehouseId = req.user?.warehouseId;
    if (!warehouseId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { warehouseId: true } });
      warehouseId = user?.warehouseId;
    }

    if (!warehouseId) {
      return errorResponse(res, 400, "Warehouse not assigned to user");
    }

    /* ------------------------------
       2️⃣ Fetch enabled categories only
    ------------------------------ */

    const categories = await prisma.warehouseCategory.findMany({
      where: {
        warehouseId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            image: true,
            icon: true,
            displayOrder: true
          }
        },

        subCategories: {
          where: {
            warehouseId
          },
          include: {
            subCategory: {
              select: {
                id: true,
                name: true,
                image: true,
                displayOrder: true
              }
            }
          },

          // ✅ Sort by related SubCategory displayOrder
          orderBy: {
            subCategory: {
              displayOrder: "asc"
            }
          }
        }
      },

      // ✅ If WarehouseCategory has displayOrder field, this is okay
      orderBy: {
        displayOrder: "asc"
      }
    })

    /* ------------------------------
       3️⃣ Format response
    ------------------------------ */

    const formatted = categories.map(cat => ({
      id: cat.id,
      categoryId: cat.category?.id || null,
      categoryName: cat.category?.name || null,
      image: cat.category?.image || null,
      icon: cat.category?.icon || null,
      displayOrder: cat.category?.displayOrder ?? null,
      isEnabled: cat.isEnabled,

      subCategories: (cat.subCategories || []).map(sc => ({
        id: sc.subCategory?.id || null,
        name: sc.subCategory?.name || null,
        image: sc.subCategory?.image || null,
        displayOrder: sc.subCategory?.displayOrder ?? null,
        isEnabled: sc.isEnabled
      }))
    }))

    logger.info("[WAREHOUSE_CATEGORY] Enabled categories fetched successfully", {
      userId,
      warehouseId,
      totalCategories: formatted.length
    })

    return successResponse(
      res,
      200,
      formatted,
      "Warehouse enabled categories fetched successfully"
    )
  } catch (error) {
    logger.error("[WAREHOUSE_CATEGORY] fetch enabled categories failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, "Failed to fetch categories")
  }
}

export const updateWarehouseCategories = async (req, res) => {
  try {
    const { categories } = req.body
    const userId = req.user?.id

    /* 1️⃣ Validation */
    if (!Array.isArray(categories) || categories.length === 0) {
      return errorResponse(res, 400, "At least one category is required")
    }

    const invalidCategory = categories.find(c => !c.categoryId)
    if (invalidCategory) {
      return errorResponse(res, 400, "categoryId is required for every category")
    }

    /* 2️⃣ Get warehouseId — prefer auth middleware, fallback to DB */
    let warehouseId = req.user?.warehouseId;
    if (!warehouseId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { warehouseId: true } });
      warehouseId = user?.warehouseId;
    }

    if (!warehouseId) {
      return errorResponse(res, 400, "Warehouse not assigned to user");
    }

    logger.info("[WAREHOUSE_CATEGORY] update started", {
      userId,
      warehouseId,
      categoryCount: categories.length
    })

    /* ------------------------------
       3️⃣ Prepare incoming category ids
    ------------------------------ */

    const incomingCategoryIds = [
      ...new Set(categories.map(c => c.categoryId))
    ]

    /* ------------------------------
       4️⃣ Disable categories not coming in request
       ❌ No delete
    ------------------------------ */

    await prisma.warehouseCategory.updateMany({
      where: {
        warehouseId,
        categoryId: {
          notIn: incomingCategoryIds
        }
      },
      data: {
        isEnabled: false
      }
    })

    /* ------------------------------
       5️⃣ Disable subcategories under disabled categories
       ❌ No delete
    ------------------------------ */

    await prisma.warehouseSubCategory.updateMany({
      where: {
        warehouseId,
        warehouseCategory: {
          warehouseId,
          categoryId: {
            notIn: incomingCategoryIds
          }
        }
      },
      data: {
        isEnabled: false
      }
    })

    /* ------------------------------
       6️⃣ Add / enable incoming categories
    ------------------------------ */

    for (const category of categories) {
      const incomingSubCategoryIds = [
        ...new Set(category.subCategoryIds || [])
      ]

      /* ------------------------------
         6.1 Category exists => enable
             Category new    => create
      ------------------------------ */

      const warehouseCategory = await prisma.warehouseCategory.upsert({
        where: {
          warehouseId_categoryId: {
            warehouseId,
            categoryId: category.categoryId
          }
        },
        update: {
          approvalStatus: 'PENDING'
        },
        create: {
          warehouseId,
          categoryId: category.categoryId,
          approvalStatus: 'PENDING',
          isEnabled: false
        }
      })

      /* ------------------------------
         6.2 Disable removed subcategories
         ❌ No delete
      ------------------------------ */

      await prisma.warehouseSubCategory.updateMany({
        where: {
          warehouseId,
          warehouseCategoryId: warehouseCategory.id,
          subCategoryId: {
            notIn: incomingSubCategoryIds
          }
        },
        data: {
          isEnabled: false
        }
      })

      /* ------------------------------
         6.3 Enable existing incoming subcategories
      ------------------------------ */

      if (incomingSubCategoryIds.length > 0) {
        await prisma.warehouseSubCategory.updateMany({
          where: {
            warehouseId,
            warehouseCategoryId: warehouseCategory.id,
            subCategoryId: {
              in: incomingSubCategoryIds
            }
          },
          data: {
            approvalStatus: 'PENDING'
          }
        })
      }

      /* ------------------------------
         6.4 Find existing subcategories
      ------------------------------ */

      const existingSubs = await prisma.warehouseSubCategory.findMany({
        where: {
          warehouseId,
          warehouseCategoryId: warehouseCategory.id
        },
        select: {
          subCategoryId: true
        }
      })

      const existingSubCategoryIds = existingSubs.map(s => s.subCategoryId)

      /* ------------------------------
         6.5 Create new subcategories
      ------------------------------ */

      const newSubs = incomingSubCategoryIds
        .filter(id => !existingSubCategoryIds.includes(id))
        .map(id => ({
          warehouseId,
          warehouseCategoryId: warehouseCategory.id,
          subCategoryId: id,
          approvalStatus: 'PENDING',
          isEnabled: false
        }))

      if (newSubs.length > 0) {
        await prisma.warehouseSubCategory.createMany({
          data: newSubs,
          skipDuplicates: true
        })
      }

      logger.info("[WAREHOUSE_CATEGORY] category processed", {
        warehouseId,
        categoryId: category.categoryId,
        subCategoryCount: incomingSubCategoryIds.length,
        newSubCategoryCount: newSubs.length
      })
    }

    logger.info("[WAREHOUSE_CATEGORY] update completed", {
      userId,
      warehouseId,
      totalCategories: incomingCategoryIds.length
    })

    return successResponse(
      res,
      200,
      null,
      "Warehouse categories updated successfully"
    )

  } catch (error) {
    logger.error("[WAREHOUSE_CATEGORY] update failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, "Failed to update categories")
  }
}

export const toggleWarehouseCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    /* Get warehouseId — prefer auth middleware, fallback to DB */
    let warehouseId = req.user?.warehouseId;
    if (!warehouseId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { warehouseId: true } });
      warehouseId = user?.warehouseId;
    }

    if (!warehouseId) {
      return errorResponse(res, 400, "Warehouse not assigned to user");
    }

    const record = await prisma.warehouseCategory.findFirst({
      where: {
        OR: [
          { id, warehouseId },
          { categoryId: id, warehouseId }
        ]
      }
    });

    if (!record) {
      return errorResponse(res, 404, "Warehouse category not found");
    }

    const updated = await prisma.warehouseCategory.update({
      where: { id: record.id },
      data: { isEnabled: !record.isEnabled }
    });

    logger.info("[WAREHOUSE_CATEGORY] status toggled", { id, isEnabled: updated.isEnabled });
    return successResponse(res, 200, updated, "Status updated successfully");
  } catch (error) {
    logger.error("[WAREHOUSE_CATEGORY] toggle failed", { message: error.message });
    return errorResponse(res, 500, "Failed to toggle status");
  }
};

export const requestNewCategory = async (req, res) => {
  try {
    const { name, description, image, icon, subCategories, subCategoryNames } = req.body;
    const userId = req.user?.id;

    if (!name || !name.trim()) {
      return errorResponse(res, 400, "Category name is required");
    }

    let warehouseId = req.user?.warehouseId;
    if (!warehouseId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { warehouseId: true } });
      warehouseId = user?.warehouseId;
    }

    if (!warehouseId) {
      return errorResponse(res, 400, "Warehouse not assigned to user");
    }

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    // Check if category already exists in master Category table
    let category = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName, mode: "insensitive" } },
          { slug: slug }
        ]
      }
    });

    if (!category) {
      // Create Category in master with isActive: false (Pending Admin approval)
      category = await prisma.category.create({
        data: {
          name: trimmedName,
          description: description || null,
          image: image || null,
          icon: icon || null,
          slug,
          isActive: false
        }
      });
    }

    // Upsert WarehouseCategory linking to partner warehouse with approvalStatus PENDING and isEnabled false
    const warehouseCategory = await prisma.warehouseCategory.upsert({
      where: {
        warehouseId_categoryId: {
          warehouseId,
          categoryId: category.id
        }
      },
      update: {
        approvalStatus: "PENDING",
        isEnabled: false
      },
      create: {
        warehouseId,
        categoryId: category.id,
        approvalStatus: "PENDING",
        isEnabled: false
      }
    });

    // Handle simultaneous creation of mapped SubCategories
    const rawSubCats = subCategoryNames || subCategories || [];
    const subCatList = Array.isArray(rawSubCats) ? rawSubCats.filter(s => s && String(s).trim()) : [];
    const createdWarehouseSubs = [];

    for (const subItem of subCatList) {
      const subName = (typeof subItem === "string" ? subItem : subItem.name || "").trim();
      const subDesc = typeof subItem === "object" ? subItem.description : undefined;
      const subImg = typeof subItem === "object" ? subItem.image : undefined;
      if (!subName) continue;

      const subSlug = subName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      
      let subCategory = await prisma.subCategory.findFirst({
        where: {
          categoryId: category.id,
          name: { equals: subName, mode: "insensitive" }
        }
      });

      if (!subCategory) {
        subCategory = await prisma.subCategory.create({
          data: {
            name: subName,
            categoryId: category.id,
            description: subDesc || null,
            image: subImg || null,
            slug: subSlug,
            isActive: false
          }
        });
      }

      const warehouseSubCategory = await prisma.warehouseSubCategory.upsert({
        where: {
          warehouseId_warehouseCategoryId_subCategoryId: {
            warehouseId,
            warehouseCategoryId: warehouseCategory.id,
            subCategoryId: subCategory.id
          }
        },
        update: {
          approvalStatus: "PENDING",
          isEnabled: false
        },
        create: {
          warehouseId,
          warehouseCategoryId: warehouseCategory.id,
          subCategoryId: subCategory.id,
          approvalStatus: "PENDING",
          isEnabled: false
        }
      });

      createdWarehouseSubs.push(warehouseSubCategory);
    }

    logger.info("[PARTNER_CATEGORY_REQUEST] New category requested with subcategories", {
      warehouseId,
      categoryId: category.id,
      categoryName: trimmedName,
      subCategoriesCount: createdWarehouseSubs.length
    });

    return successResponse(
      res,
      201,
      { category, warehouseCategory, subCategories: createdWarehouseSubs },
      "New category & mapped subcategory request submitted successfully. It will be available once approved by Admin."
    );
  } catch (error) {
    logger.error("[PARTNER_CATEGORY_REQUEST] requestNewCategory failed", {
      message: error.message,
      stack: error.stack
    });
    return errorResponse(res, 500, "Failed to submit new category request");
  }
};

export const requestNewSubCategory = async (req, res) => {
  try {
    const { categoryId, name, description, image } = req.body;
    const userId = req.user?.id;

    if (!categoryId) {
      return errorResponse(res, 400, "Parent categoryId is required");
    }
    if (!name || !name.trim()) {
      return errorResponse(res, 400, "Subcategory name is required");
    }

    let warehouseId = req.user?.warehouseId;
    if (!warehouseId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { warehouseId: true } });
      warehouseId = user?.warehouseId;
    }

    if (!warehouseId) {
      return errorResponse(res, 400, "Warehouse not assigned to user");
    }

    // Verify parent Category exists
    const parentCategory = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!parentCategory) {
      return errorResponse(res, 404, "Parent category not found");
    }

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    // Check if subcategory already exists under this category
    let subCategory = await prisma.subCategory.findFirst({
      where: {
        categoryId,
        name: { equals: trimmedName, mode: "insensitive" }
      }
    });

    if (!subCategory) {
      // Create SubCategory with isActive: false (Pending Admin approval)
      subCategory = await prisma.subCategory.create({
        data: {
          name: trimmedName,
          categoryId,
          description: description || null,
          image: image || null,
          slug,
          isActive: false
        }
      });
    }

    // Get or create parent WarehouseCategory
    let warehouseCategory = await prisma.warehouseCategory.findUnique({
      where: {
        warehouseId_categoryId: {
          warehouseId,
          categoryId
        }
      }
    });

    if (!warehouseCategory) {
      warehouseCategory = await prisma.warehouseCategory.create({
        data: {
          warehouseId,
          categoryId,
          approvalStatus: "PENDING",
          isEnabled: false
        }
      });
    } else {
      // Mark parent warehouseCategory approvalStatus as PENDING so it appears in Admin pending requests
      warehouseCategory = await prisma.warehouseCategory.update({
        where: { id: warehouseCategory.id },
        data: {
          approvalStatus: "PENDING"
        }
      });
    }

    // Upsert WarehouseSubCategory
    const warehouseSubCategory = await prisma.warehouseSubCategory.upsert({
      where: {
        warehouseId_warehouseCategoryId_subCategoryId: {
          warehouseId,
          warehouseCategoryId: warehouseCategory.id,
          subCategoryId: subCategory.id
        }
      },
      update: {
        approvalStatus: "PENDING",
        isEnabled: false
      },
      create: {
        warehouseId,
        warehouseCategoryId: warehouseCategory.id,
        subCategoryId: subCategory.id,
        approvalStatus: "PENDING",
        isEnabled: false
      }
    });

    logger.info("[PARTNER_SUBCATEGORY_REQUEST] New subcategory requested", {
      warehouseId,
      subCategoryId: subCategory.id,
      subCategoryName: trimmedName
    });

    return successResponse(
      res,
      201,
      { subCategory, warehouseSubCategory },
      "New subcategory request submitted successfully. It will be available once approved by Admin."
    );
  } catch (error) {
    logger.error("[PARTNER_SUBCATEGORY_REQUEST] requestNewSubCategory failed", {
      message: error.message,
      stack: error.stack
    });
    return errorResponse(res, 500, "Failed to submit new subcategory request");
  }
};