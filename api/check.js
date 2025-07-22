module.exports = (req, res) => {
  res.status(200).json({
    test: "working",
    env: {
      hasToast: !!process.env.TOAST_CLIENT_ID,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL
    }
  });
};