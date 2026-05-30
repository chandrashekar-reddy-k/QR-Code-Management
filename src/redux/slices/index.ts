import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import inventoryReducer from './inventorySlice';

const rootReducer = combineReducers({
  auth: authReducer,
  inventory: inventoryReducer,
});

export default rootReducer;
