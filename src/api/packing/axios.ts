import api from '../axios';

// Route all packing API requests through Partner API server on port 3004 with JWT auth interceptor
export const packerApiClient = api;
export default api;
