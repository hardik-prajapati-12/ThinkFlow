// backend/migrate-cloudinary.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const cloudinary = require('./config/cloudinary');
const Post = require('./models/Post');

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

    // Find all posts where coverImage is not empty
    const posts = await Post.find({
      coverImage: { $ne: '' }
    });

    // Filter posts that have local paths (e.g. not starting with http)
    const postsToMigrate = posts.filter(post => post.coverImage && !post.coverImage.startsWith('http'));

    console.log(`📋 Found ${postsToMigrate.length} posts with local cover images to migrate.`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const post of postsToMigrate) {
      console.log(`\n⏳ Migrating post: "${post.title}" (ID: ${post._id})`);
      console.log(`   Local image path in DB: ${post.coverImage}`);

      // Resolve the local path of the image.
      // E.g., post.coverImage could be "/uploads/1773848212531.png"
      // Remove leading slash if any
      const relativePath = post.coverImage.startsWith('/') ? post.coverImage.substring(1) : post.coverImage;
      const absolutePath = path.resolve(__dirname, relativePath);

      if (!fs.existsSync(absolutePath)) {
        console.warn(`   ⚠️ Local file does not exist: ${absolutePath}`);
        skipCount++;
        continue;
      }

      console.log(`   Uploading to Cloudinary: ${absolutePath}`);
      try {
        const result = await cloudinary.uploader.upload(absolutePath, {
          folder: 'thinkflow',
          resource_type: 'image'
        });

        console.log(`   ✅ Uploaded! Cloudinary URL: ${result.secure_url}`);

        post.coverImage = result.secure_url;
        await post.save();
        console.log(`   💾 Updated post in database.`);
        successCount++;
      } catch (uploadErr) {
        console.error(`   ❌ Failed to upload image to Cloudinary: ${uploadErr.message}`);
        failCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   - Successfully migrated: ${successCount}`);
    console.log(`   - Failed: ${failCount}`);
    console.log(`   - Skipped (file not found): ${skipCount}`);
    console.log('🎉 Migration process completed.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

migrate();
