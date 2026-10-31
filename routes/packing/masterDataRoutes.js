import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import * as masterDataCtr from '../../controllers/packing/masterDataController.js';

const router = express.Router();

// Apply partner JWT auth middleware
router.use(authMiddleware);

// Categories
router.get('/categories', masterDataCtr.getCategories);
router.post('/categories', masterDataCtr.createCategory);
router.put('/categories/:id', masterDataCtr.updateCategory);
router.patch('/categories/:id', masterDataCtr.toggleCategoryStatus);
router.delete('/categories/:id', masterDataCtr.deleteCategory);

// UOM
router.get('/uom', masterDataCtr.getUOMs);
router.post('/uom', masterDataCtr.createUOM);
router.put('/uom/:id', masterDataCtr.updateUOM);
router.patch('/uom/:id', masterDataCtr.toggleUOMStatus);
router.delete('/uom/:id', masterDataCtr.deleteUOM);

// Products
router.get('/products', masterDataCtr.getProducts);
router.put('/products/:id', masterDataCtr.updateProduct);
router.patch('/products/:id', masterDataCtr.toggleProductStatus);
router.delete('/products/:id', masterDataCtr.deleteProduct);

// Warehouses
router.get('/warehouses', masterDataCtr.getWarehouses);
router.post('/warehouses', masterDataCtr.createWarehouse);
router.put('/warehouses/:id', masterDataCtr.updateWarehouse);
router.patch('/warehouses/:id', masterDataCtr.toggleWarehouseStatus);
router.delete('/warehouses/:id', masterDataCtr.deleteWarehouse);

// Recipes / BOM
router.get('/recipes', masterDataCtr.getRecipes);
router.post('/recipes', masterDataCtr.createRecipe);
router.put('/recipes/:id', masterDataCtr.updateRecipe);
router.patch('/recipes/:id', masterDataCtr.updateRecipe);
router.delete('/recipes/:id', masterDataCtr.deleteRecipe);

// Storage Locations
router.get('/locations', masterDataCtr.getLocations);
router.post('/locations', masterDataCtr.createLocation);

export default router;
