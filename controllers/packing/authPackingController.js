import { prisma } from '../../config/prismaClient.js';

// Returns ONLY QC Inspector / Checker accounts for QC Inspection dropdown
export const getQcInspectors = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'QC_INSPECTOR' },
          { email: { contains: 'qcchecker', mode: 'insensitive' } },
          { email: { contains: 'checker', mode: 'insensitive' } },
          { email: { contains: 'qc', mode: 'insensitive' } },
          { name: { contains: 'qc', mode: 'insensitive' } },
          { name: { contains: 'inspector', mode: 'insensitive' } },
          { name: { contains: 'checker', mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true, email: true, phone: true, role: true },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

// Returns ONLY Operator accounts for Operator dropdowns
export const getOperators = async (req, res, next) => {
  try {
    const isRoleOnly = req.query.roleOnly === 'true';

    const where = isRoleOnly
      ? { role: 'PACKING_OPERATOR' }
      : {
          OR: [
            { role: 'PACKING_OPERATOR' },
            { email: { contains: 'operator', mode: 'insensitive' } },
            { name: { contains: 'operator', mode: 'insensitive' } },
            { name: { contains: 'packer', mode: 'insensitive' } }
          ]
        };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        approvalStatus: true,
        warehouseId: true
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const getTeamUsers = getOperators;
