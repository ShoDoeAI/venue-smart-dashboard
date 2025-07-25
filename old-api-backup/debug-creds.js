module.exports = (req, res) => {
  const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'using-default';
  const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || 'using-default';
  const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'using-default';

  res.status(200).json({
    check: {
      clientId: {
        fromEnv: !!process.env.TOAST_CLIENT_ID,
        length: TOAST_CLIENT_ID.length,
        firstChars: TOAST_CLIENT_ID.substring(0, 6),
        lastChars: TOAST_CLIENT_ID.substring(TOAST_CLIENT_ID.length - 4),
        hasSpaces: TOAST_CLIENT_ID.includes(' '),
        hasNewlines: TOAST_CLIENT_ID.includes('\n'),
      },
      clientSecret: {
        fromEnv: !!process.env.TOAST_CLIENT_SECRET,
        length: TOAST_CLIENT_SECRET.length,
        firstChar: TOAST_CLIENT_SECRET[0],
        hasSpaces: TOAST_CLIENT_SECRET.includes(' '),
        hasNewlines: TOAST_CLIENT_SECRET.includes('\n'),
      },
      locationId: {
        fromEnv: !!process.env.TOAST_LOCATION_ID,
        length: TOAST_LOCATION_ID.length,
        hasSpaces: TOAST_LOCATION_ID.includes(' '),
        hasNewlines: TOAST_LOCATION_ID.includes('\n'),
      },
    },
  });
};
