import jwt from 'jsonwebtoken';

const generateToken = (id, role, assignedVehicleId, tenantId) => {
    const secret = process.env.JWT_SECRET || 'villagkart_default_jwt_secret_key_2026';
    return jwt.sign({ id, role, assignedVehicleId, tenantId }, secret, {
        expiresIn: '30d',
    });
};

export default generateToken;
