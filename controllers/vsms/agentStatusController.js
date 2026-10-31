// @desc    Toggle agent online/offline status
// @route   PUT /api/agent/auth/status
// @access  Private
export const updateAgentStatus = async (req, res, next) => {
    try {
        const { isOnline } = req.body;
        let userId = req.user.id;

        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user && (req.user.email || req.user.phone)) {
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        ...(req.user.phone ? [{ phone: req.user.phone }] : []),
                        ...(req.user.email ? [{ email: req.user.email }] : [])
                    ]
                }
            });
            if (user) userId = user.id;
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                isOnline: Boolean(isOnline),
                lastActive: new Date()
            },
            select: { id: true, isOnline: true, lastActive: true }
        });

        res.json({
            success: true,
            message: `Status updated to ${updated.isOnline ? 'ONLINE' : 'OFFLINE'}`,
            data: updated
        });
    } catch (error) {
        next(error);
    }
};
