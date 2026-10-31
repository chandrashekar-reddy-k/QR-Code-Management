import { prisma } from '../../config/prismaClient.js';

export const masterDataService = {
  // --- Categories ---
  async getCategories(params = {}) {
    const where = {};
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    return categories;
  },

  async createCategory(data) {
    return prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  },

  async updateCategory(id, data) {
    return prisma.category.update({
      where: { id },
      data
    });
  },

  async toggleCategoryStatus(id) {
    const current = await prisma.category.findUnique({ where: { id } });
    if (!current) throw new Error('Category not found');
    return prisma.category.update({
      where: { id },
      data: { isActive: !current.isActive }
    });
  },

  async deleteCategory(id) {
    return prisma.category.delete({ where: { id } });
  },

  // --- UOM ---
  async getUOMs(params = {}) {
    const [units, legacyUoms] = await Promise.all([
      prisma.unit.findMany({
        where: {
          ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
          status: 'ACTIVE'
        },
        orderBy: { name: 'asc' }
      }).catch(() => []),
      prisma.unitOfMeasure.findMany({
        where: params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {},
        orderBy: { name: 'asc' }
      }).catch(() => [])
    ]);

    const mappedUnits = units.map(u => ({
      id: u.id,
      name: u.name,
      abbreviation: u.shortCode || u.name,
      isActive: u.status === 'ACTIVE'
    }));

    const existingIds = new Set(mappedUnits.map(u => u.id));
    legacyUoms.forEach(lu => {
      if (!existingIds.has(lu.id)) {
        mappedUnits.push({
          id: lu.id,
          name: lu.name,
          abbreviation: lu.abbreviation || lu.name,
          isActive: lu.isActive !== false
        });
      }
    });

    return mappedUnits;
  },

  async createUOM(data) {
    return prisma.unitOfMeasure.create({
      data: {
        name: data.name,
        abbreviation: data.abbreviation || data.name.slice(0, 3).toLowerCase(),
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  },

  async updateUOM(id, data) {
    return prisma.unitOfMeasure.update({
      where: { id },
      data
    });
  },

  async toggleUOMStatus(id) {
    const current = await prisma.unitOfMeasure.findUnique({ where: { id } });
    if (!current) throw new Error('UOM not found');
    return prisma.unitOfMeasure.update({
      where: { id },
      data: { isActive: !current.isActive }
    });
  },

  async deleteUOM(id) {
    return prisma.unitOfMeasure.delete({ where: { id } });
  },

  // --- Products ---
  async getProducts(params = {}) {
    const where = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } }
      ];
    }
    if (params.type || params.productType) {
      const typeVal = params.type || params.productType;
      if (typeVal === 'RAW_MATERIAL') {
        const typeConditions = [
          { productType: 'RAW_MATERIAL' },
          { productType: null }
        ];
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            { OR: typeConditions }
          ];
          delete where.OR;
        } else {
          where.OR = typeConditions;
        }
      } else {
        where.productType = typeVal;
      }
    }
    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    // Default to PRODUCTION; callers can override by passing inventoryType param (e.g. 'READY,RAW')
    const invTypes = params.inventoryType
      ? String(params.inventoryType).split(',').map((s) => s.trim()).filter(Boolean)
      : ['PRODUCTION'];

    const invCondition = invTypes.includes('PRODUCTION')
      ? [
          { inventoryType: { in: invTypes } },
          { productionStock: { inProductionQty: { gt: 0 } } }
        ]
      : [{ inventoryType: invTypes.length === 1 ? invTypes[0] : { in: invTypes } }];

    if (where.OR) {
      where.AND = [
        ...(where.AND || []),
        { OR: where.OR },
        { OR: invCondition }
      ];
      delete where.OR;
    } else {
      where.OR = invCondition;
    }

    const [rawProducts, units, uoms, unitTypes] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          masterProduct: true,
          variants: true,
          productionStock: true
        },
        orderBy: { name: 'asc' }
      }),
      prisma.unit.findMany().catch(() => []),
      prisma.unitOfMeasure.findMany().catch(() => []),
      prisma.unitType.findMany().catch(() => [])
    ]);

    const unitMap = new Map();
    units.forEach(u => {
      unitMap.set(u.id, { name: u.name, abbreviation: u.shortCode || u.name });
    });
    uoms.forEach(u => {
      unitMap.set(u.id, { name: u.name, abbreviation: u.abbreviation || u.name });
    });
    unitTypes.forEach(ut => {
      if (!unitMap.has(ut.id)) {
        unitMap.set(ut.id, { name: ut.name, abbreviation: ut.name });
      }
    });

    const data = rawProducts.map(p => {
      const rawUnit = p.unit;
      const isUuid = rawUnit && rawUnit.length === 36 && rawUnit.includes('-');
      let uomInfo = { id: rawUnit || 'unit', name: rawUnit || 'unit', abbreviation: rawUnit || 'unit' };

      if (isUuid) {
        const found = unitMap.get(rawUnit) || unitMap.get(p.unitType);
        if (found) {
          uomInfo = {
            id: rawUnit,
            name: found.name,
            abbreviation: found.abbreviation
          };
        } else {
          uomInfo = {
            id: rawUnit,
            name: 'Piece',
            abbreviation: 'P'
          };
        }
      }

      // Resolve SKU with intelligent fallback
      let resolvedSku = p.sku?.trim() || p.masterProduct?.sku?.trim() || p.barcode?.trim();
      if (!resolvedSku) {
        const nameClean = (p.name || 'PROD').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
        let qty = p.measurement || p.weight;
        let unit = uomInfo?.abbreviation || uomInfo?.name || 'P';
        if (!qty && p.name) {
          const match = p.name.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
          if (match) {
            qty = match[1];
            if (match[2]) unit = match[2].toUpperCase();
          }
        }
        qty = qty || 1;
        const unitClean = unit.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        resolvedSku = `${nameClean}-${qty}-${unitClean}`;
      }

      const inProdQty = p.productionStock?.inProductionQty || 0;
      return {
        ...p,
        sku: resolvedSku,
        resolvedSku,
        type: p.productType || 'RAW_MATERIAL',
        availableStock: inProdQty > 0 ? inProdQty : (p.stock || 0),
        inProductionQty: inProdQty,
        uom: uomInfo
      };
    });

    return data;
  },



  async updateProduct(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.type !== undefined || data.productType !== undefined) updateData.productType = data.type || data.productType;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.mrp !== undefined) updateData.mrp = parseFloat(data.mrp);
    if (data.stock !== undefined || data.availableStock !== undefined) updateData.stock = parseInt(data.availableStock || data.stock);
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return prisma.product.update({
      where: { id },
      data: updateData
    });
  },

  async toggleProductStatus(id) {
    const current = await prisma.product.findUnique({ where: { id } });
    if (!current) throw new Error('Product not found');
    return prisma.product.update({
      where: { id },
      data: { isActive: !current.isActive }
    });
  },

  async deleteProduct(id) {
    return prisma.product.delete({ where: { id } });
  },

  // --- Warehouses ---
  async getWarehouses(params = {}) {
    const where = {};
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    return warehouses;
  },

  async createWarehouse(data) {
    return prisma.warehouse.create({
      data: {
        name: data.name,
        code: data.code || `WH-${Date.now().toString().slice(-4)}`,
        address: data.address || '',
        city: data.city || '',
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  },

  async updateWarehouse(id, data) {
    return prisma.warehouse.update({
      where: { id },
      data
    });
  },

  async toggleWarehouseStatus(id) {
    const current = await prisma.warehouse.findUnique({ where: { id } });
    if (!current) throw new Error('Warehouse not found');
    return prisma.warehouse.update({
      where: { id },
      data: { isActive: !current.isActive }
    });
  },

  async deleteWarehouse(id) {
    return prisma.warehouse.delete({ where: { id } });
  },

  // --- Recipes / BOM ---
  async getRecipes(params = {}) {
    if (!prisma.recipe) return [];
    try {
      const where = {};
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { code: { contains: params.search, mode: 'insensitive' } }
        ];
      }
      const recipes = await prisma.recipe.findMany({
        where,
        include: {
          outputProduct: { select: { id: true, name: true, sku: true } },
          items: { include: { inputProduct: { select: { id: true, name: true, sku: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return recipes;
    } catch (err) {
      return [];
    }
  },

  async createRecipe(data) {
    if (!prisma.recipe) return null;
    const { code, name, outputProductId, outputQty, items } = data;
    return prisma.recipe.create({
      data: {
        code: code || `REC-${Date.now().toString().slice(-4)}`,
        name,
        outputProductId,
        outputQty: parseFloat(outputQty) || 1,
        items: {
          create: (items || []).map(item => ({
            inputProductId: item.inputProductId,
            requiredQty: parseFloat(item.requiredQty) || 0,
            tolerancePct: parseFloat(item.tolerancePct) || 0,
            isPackaging: item.isPackaging || false
          }))
        }
      },
      include: {
        outputProduct: { select: { id: true, name: true, sku: true } },
        items: { include: { inputProduct: { select: { id: true, name: true, sku: true } } } }
      }
    });
  },

  async updateRecipe(id, data) {
    if (!prisma.recipe) return null;
    const { code, name, outputProductId, outputQty, items } = data;
    const updateData = {};
    if (code) updateData.code = code;
    if (name) updateData.name = name;
    if (outputProductId) updateData.outputProductId = outputProductId;
    if (outputQty !== undefined) updateData.outputQty = parseFloat(outputQty);

    if (items && prisma.recipeItem) {
      await prisma.recipeItem.deleteMany({ where: { recipeId: id } });
      updateData.items = {
        create: items.map(item => ({
          inputProductId: item.inputProductId,
          requiredQty: parseFloat(item.requiredQty) || 0,
          tolerancePct: parseFloat(item.tolerancePct) || 0,
          isPackaging: item.isPackaging || false
        }))
      };
    }

    return prisma.recipe.update({
      where: { id },
      data: updateData,
      include: {
        outputProduct: { select: { id: true, name: true, sku: true } },
        items: { include: { inputProduct: { select: { id: true, name: true, sku: true } } } }
      }
    });
  },

  async deleteRecipe(id) {
    await prisma.recipeItem.deleteMany({ where: { recipeId: id } });
    return prisma.recipe.delete({ where: { id } });
  },

  // --- Storage Locations ---
  async getLocations(params = {}) {
    const where = {};
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    return prisma.storageLocation.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  },

  async createLocation(data) {
    return prisma.storageLocation.create({
      data: {
        name: data.name,
        warehouseId: data.warehouseId
      }
    });
  }
};
