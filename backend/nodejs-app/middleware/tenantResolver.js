const { Tenant } = require('../models');

module.exports = async function tenantResolver(req, res, next) {
    try {
        const host = req.headers.host || '';
        const subdomain = host.split('.')[0];

        if (process.env.MULTI_TENANT === 'true' && subdomain && subdomain !== 'www') {
            const tenant = await Tenant.findBySlug(subdomain);
            if (tenant) {
                req.tenant = tenant;
            }
        }
    } catch (err) {
        console.error('Tenant resolution error:', err);
    }
    next();
};
