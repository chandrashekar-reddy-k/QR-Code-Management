import { masterDataService } from '../../services/packing/masterDataService.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

export const getCategories = async (req, res, next) => {
  try {
    const result = await masterDataService.getCategories(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const data = await masterDataService.createCategory(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const data = await masterDataService.updateCategory(req.params.id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleCategoryStatus = async (req, res, next) => {
  try {
    const data = await masterDataService.toggleCategoryStatus(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await masterDataService.deleteCategory(req.params.id);
    return res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// UOM
export const getUOMs = async (req, res, next) => {
  try {
    const result = await masterDataService.getUOMs(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const createUOM = async (req, res, next) => {
  try {
    const data = await masterDataService.createUOM(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateUOM = async (req, res, next) => {
  try {
    const data = await masterDataService.updateUOM(req.params.id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleUOMStatus = async (req, res, next) => {
  try {
    const data = await masterDataService.toggleUOMStatus(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteUOM = async (req, res, next) => {
  try {
    await masterDataService.deleteUOM(req.params.id);
    return res.status(200).json({ success: true, message: 'UOM deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Products
export const getProducts = async (req, res, next) => {
  try {
    const result = await masterDataService.getProducts(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};


export const updateProduct = async (req, res, next) => {
  try {
    const data = await masterDataService.updateProduct(req.params.id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleProductStatus = async (req, res, next) => {
  try {
    const data = await masterDataService.toggleProductStatus(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await masterDataService.deleteProduct(req.params.id);
    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Warehouses
export const getWarehouses = async (req, res, next) => {
  try {
    const result = await masterDataService.getWarehouses(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const data = await masterDataService.createWarehouse(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const data = await masterDataService.updateWarehouse(req.params.id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleWarehouseStatus = async (req, res, next) => {
  try {
    const data = await masterDataService.toggleWarehouseStatus(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteWarehouse = async (req, res, next) => {
  try {
    await masterDataService.deleteWarehouse(req.params.id);
    return res.status(200).json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Recipes
export const getRecipes = async (req, res, next) => {
  try {
    const result = await masterDataService.getRecipes(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const createRecipe = async (req, res, next) => {
  try {
    const data = await masterDataService.createRecipe(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateRecipe = async (req, res, next) => {
  try {
    const data = await masterDataService.updateRecipe(req.params.id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteRecipe = async (req, res, next) => {
  try {
    await masterDataService.deleteRecipe(req.params.id);
    return res.status(200).json({ success: true, message: 'Recipe deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Storage Locations
export const getLocations = async (req, res, next) => {
  try {
    const data = await masterDataService.getLocations(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createLocation = async (req, res, next) => {
  try {
    const data = await masterDataService.createLocation(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
