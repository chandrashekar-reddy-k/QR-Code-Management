import express from 'express';
import {
  createPriceBook,
  getPriceBooks,
  createProductPrice,
  getPrices,
  getPriceComparison,
  getProductPriceHistory,
  deleteProductPrice
} from '../../controllers/product&invManagement/pricingController.js';

const router = express.Router();

router.post('/price-books', createPriceBook);
router.get('/price-books', getPriceBooks);
router.post('/product-prices', createProductPrice);
router.delete('/product-prices/:id', deleteProductPrice);
router.delete('/product-prices', deleteProductPrice);
router.get('/prices', getPrices);
router.get('/prices/comparison', getPriceComparison);
router.get('/prices/history', getProductPriceHistory);

export default router;
