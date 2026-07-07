// backend/migrate-avatars.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const cloudinary = require('./config/cloudinary');
const User = require('./models/User');

async function migrate() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not set in .env');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all users where avatar is not empty
    const users = await User.find({
      avatar: { $ne: '' }
    });

    // Filter users that have local paths (e.g. not starting with http)
    const usersToMigrate = users.filter(user => user.avatar && !user.avatar.startsWith('http'));

    console.log(`📋 Found ${usersToMigrate.length} users with local avatars to migrate.`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const user of usersToMigrate) {
      console.log(`\n⏳ Migrating user: "${user.username}" (ID: ${user._id})`);
      console.log(`   Local avatar path in DB: ${user.avatar}`);

      // Resolve the local path of the avatar.
      // E.g., user.avatar could be "/uploads/avatars/avatar-xxx.jpg"
      // Remove leading slash if any
      const relativePath = user.avatar.startsWith('/') ? user.avatar.substring(1) : user.avatar;
      const absolutePath = path.resolve(__dirname, relativePath);

      if (!fs.existsSync(absolutePath)) {
        console.warn(`   ⚠️ Local file does not exist: ${absolutePath}`);
        skipCount++;
        continue;
      }

      console.log(`   Uploading to Cloudinary: ${absolutePath}`);
      try {
        const result = await cloudinary.uploader.upload(absolutePath, {
          folder: 'thinkflow/avatars',
          resource_type: 'image'
        });

        console.log(`   ✅ Uploaded! Cloudinary URL: ${result.secure_url}`);

        user.avatar = result.secure_url;
        await user.save();
        console.log(`   💾 Updated user avatar in database.`);
        successCount++;
      } catch (uploadErr) {
        console.error(`   ❌ Failed to upload avatar to Cloudinary: ${uploadErr.message}`);
        failCount++;
      }
    }

    console.log('\n📊 Avatar Migration Summary:');
    console.log(`   - Successfully migrated: ${successCount}`);
    console.log(`   - Failed: ${failCount}`);
    console.log(`   - Skipped (file not found): ${skipCount}`);
    console.log('🎉 Avatar migration process completed.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

migrate();
