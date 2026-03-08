require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");
  
  const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      phone: String,
      role: String,
      name: String
  }, { strict: false }));
  
  const users = await User.find({ role: 'admin' }).select('email name role phone').lean();
  console.log("Found admins:", users);
  
  const anyUsers = await User.find().limit(5).select('email name role phone').lean();
  console.log("Found any users:", anyUsers);
  
  process.exit(0);
}
check();
