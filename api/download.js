export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  const { url, filename } = req.query;

  if (!url) {
    res.status(400).send("url required");
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    // ✅ 응답 자체 실패
    if (!response.ok) {
      res.status(500).send("Failed to fetch media");
      return;
    }

    // ✅ body 없음 방어
    if (!response.body) {
      res.status(500).send("No response body");
      return;
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename || "media"}"`
    );

    // 🔥 Node.js 스트림 전달 (Edge에선 안 됨)
    response.body.pipe(res);
  } catch (err) {
    console.error("download error:", err);
    res.status(500).send("Server error");
  }
}
