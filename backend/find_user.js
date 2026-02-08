require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function findUser() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const email = 'japhetjohnk@gmail.com';
    const user = await User.findOne({ email });

    if (user) {
        console.log(`\n✅ FOUND USER: ${user.email}`);
        console.log(`🆔 ID: ${user._id}`);
    } else {
        console.log(`\n❌ User not found: ${email}`);
    }

    process.exit();
}

findUser();
