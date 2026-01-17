import express from "express";

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ msg: "AI route working" });
});

export default router;
