export default async function handler(req, res) {
  const { url, filename } = req.query;

  if (!url) {
    return res.status(400).send("url required");
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return res.status(500).send("Failed to fetch media");
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename || "media"}"`
    );

    // 🔥 스트림 그대로 전달 (중요)
    response.body.pipe(res);
  } catch (e) {
    res.status(500).send("Server error");
  }
}
