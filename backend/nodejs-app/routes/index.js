const express = require('express');
const router = express.Router();

// Simple home page
router.get('/', (req, res) => {
    res.render('pages/index', { title: 'Home', layout: 'layouts/main' });
});

module.exports = router;
