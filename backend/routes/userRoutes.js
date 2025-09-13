const express = require("express");
const { registerUser, authUser, allUsers, updateUserPic } = require("../controllers/userControllers");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
router.route("/").post(registerUser).get(protect, allUsers);
router.route("/login").post(authUser);
router.route("/pic").put(protect, updateUserPic);

module.exports = router;