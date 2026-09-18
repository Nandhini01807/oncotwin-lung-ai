require("dotenv").config();
const cloudinary = require("cloudinary").v2;

const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, "").trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || "").replace(/['"]/g, "").trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || "").replace(/['"]/g, "").trim();

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
});

console.log("=================================");
console.log("Cloudinary Configuration (Sanitized)");
console.log("Cloud Name:", cloudName || "Missing");
console.log("API Key Length:", apiKey ? apiKey.length : 0);
console.log("API Secret Length:", apiSecret ? apiSecret.length : 0);
console.log("=================================");

module.exports = cloudinary;