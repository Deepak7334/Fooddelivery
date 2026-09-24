const express = require('express');
const router = express.Router();
const { getHomeFeed } = require('../controllers/homeFeedController');

router.get('/', getHomeFeed);

module.exports = router;
