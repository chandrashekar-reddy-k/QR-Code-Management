import express from "express";
import { validateRequest } from "../../middlewares/validateReqMiddleware.js";
import { uploadMedia, getMediaList, getMediaDetails, updateMedia, deleteMedia } from "../../controllers/product&invManagement/mediaController.js";
// import validations bypassed for dev

const router = express.Router();

router.post("/", uploadMedia);
router.get("/", getMediaList);
router.get("/:id", getMediaDetails);
router.put("/:id", updateMedia);
router.delete("/:id", deleteMedia);

export default router;
