import express from 'express';
import {
  createPriceBook,
  getPriceBooks,
  deletePriceBook,
  createProductPrice,
  getPrices,
  getPriceComparison,
  getProductPriceHistory,
  deleteProductPrice
} from '../../controllers/product&invManagement/pricingController.js';
import { getChannels } from '../../controllers/product&invManagement/channelsController.js';

const router = express.Router();

router.get('/channels', getChannels);
router.post('/price-books', createPriceBook);
router.get('/price-books', getPriceBooks);
router.delete('/price-books/:id', deletePriceBook);
router.post('/product-prices', createProductPrice);
router.delete('/product-prices/:id', deleteProductPrice);
router.delete('/product-prices', deleteProductPrice);
router.get('/prices', getPrices);
router.get('/prices/comparison', getPriceComparison);
router.get('/prices/history', getProductPriceHistory);

export default router;
