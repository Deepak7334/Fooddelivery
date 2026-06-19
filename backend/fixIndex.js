const mongoose = require('mongoose');
require('dotenv').config();

const cleanMongoUri = (process.env.MONGODB_URI || '').replace(/^["']|["']$/g, '').trim();

mongoose.connect(cleanMongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    try {
      await mongoose.connection.collection('tables').dropIndex('number_1');
      console.log('Successfully dropped number_1 index');
    } catch (err) {
      console.log('Index might not exist or error:', err.message);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
