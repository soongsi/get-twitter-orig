export default async function handler(req, res) {
  const { tweetId } = req.query;

  if (!tweetId) {
    return res.status(400).json({ error: "tweetId is required" });
  }

  try {
    const vxUrl = `https://api.vxtwitter.com/i/status/${tweetId}`;

    const vxRes = await fetch(vxUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });

    if (!vxRes.ok) {
      return res.status(vxRes.status).json({
        error: "Failed to fetch from vxtwitter",
      });
    }

    const data = await vxRes.json();

    // CORS 허용 (사실 Vercel에서는 없어도 되지만 명시)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      detail: err.message,
    });
  }
}
