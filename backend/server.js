require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err));

// Schemas
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
});
const User = mongoose.model("User", userSchema);

const folderSchema = new mongoose.Schema({
  name: String,
  user_id: mongoose.Schema.Types.ObjectId,
  parent_folder_id: { type: mongoose.Schema.Types.ObjectId, default: null },
});
const Folder = mongoose.model("Folder", folderSchema);

const imageSchema = new mongoose.Schema({
  name: String,
  url: String,
  folder_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  user_id: mongoose.Schema.Types.ObjectId,
  s3_key: String, // Store S3 key for deletion
});
const Image = mongoose.model("Image", imageSchema);

// AWS S3 setup with v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // e.g., 'us-east-1'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).send("Access denied: No token provided");
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user_id = decoded.user_id;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(400).send("Invalid token");
  }
};

// Signup
app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, email });
  await user.save();
  res.send("User created");
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).send("Invalid credentials");
  }
  const token = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET);
  res.send({ token });
});

// Folders
app.get("/folders", authenticate, async (req, res) => {
  const folders = await Folder.find({ user_id: req.user_id });
  res.send(folders);
});

app.post("/folders", authenticate, async (req, res) => {
  const { name, parent_folder_id } = req.body;
  if (parent_folder_id) {
    const parentFolder = await Folder.findOne({
      _id: parent_folder_id,
      user_id: req.user_id,
    });
    if (!parentFolder) return res.status(400).send("Invalid parent folder");
  }
  const folder = new Folder({ name, user_id: req.user_id, parent_folder_id });
  await folder.save();
  res.send(folder);
});

app.delete("/folders/:id", authenticate, async (req, res) => {
  const folderId = req.params.id;
  const folder = await Folder.findOne({ _id: folderId, user_id: req.user_id });
  if (!folder) return res.status(404).send("Folder not found");

  // Check if folder has contents
  const subFolders = await Folder.find({ parent_folder_id: folderId });
  const images = await Image.find({ folder_id: folderId });
  if (subFolders.length > 0 || images.length > 0) {
    return res.status(400).send("Cannot delete folder with contents");
  }

  await Folder.deleteOne({ _id: folderId });
  res.send("Folder deleted");
});

// Images
app.post("/images", authenticate, upload.single("image"), async (req, res) => {
  const { name, folder_id } = req.body;
  if (folder_id) {
    const folder = await Folder.findOne({
      _id: folder_id,
      user_id: req.user_id,
    });
    if (!folder) return res.status(400).send("Invalid folder");
  }
  const key = `${req.user_id}/${folder_id || "root"}/${uuidv4()}-${
    req.file.originalname
  }`;
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    ACL: "public-read",
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    const image = new Image({
      name,
      url: `https://${params.Bucket}.s3.amazonaws.com/${key}`,
      folder_id,
      user_id: req.user_id,
      s3_key: key, // Store key for deletion
    });
    await image.save();
    res.send(image);
  } catch (error) {
    console.error("S3 upload failed:", error);
    res.status(500).send("Upload failed");
  }
});

app.get("/images", authenticate, async (req, res) => {
  const { parent_id } = req.query;
  console.log(
    `Fetching images for user_id: ${req.user_id}, parent_id: ${
      parent_id || "null"
    }`
  );
  try {
    const images = await Image.find({
      user_id: req.user_id,
      folder_id: parent_id === "" || parent_id === undefined ? null : parent_id,
    });
    console.log(`Found ${images.length} images:`, images);
    res.send(images);
  } catch (error) {
    console.error("Error fetching images:", error.message);
    res.status(500).send("Failed to fetch images");
  }
});

app.delete("/images/:id", authenticate, async (req, res) => {
  const imageId = req.params.id;
  const image = await Image.findOne({ _id: imageId, user_id: req.user_id });
  if (!image) return res.status(404).send("Image not found");

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: image.s3_key,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    await Image.deleteOne({ _id: imageId });
    res.send("Image deleted");
  } catch (error) {
    console.error("S3 delete failed:", error);
    res.status(500).send("Delete failed");
  }
});

// Search
app.get("/search", authenticate, async (req, res) => {
  const { q } = req.query;
  const images = await Image.find({
    user_id: req.user_id,
    name: { $regex: q, $options: "i" },
  });
  res.send(images);
});

app.listen(5000, () => console.log("Server running on port 5000"));
