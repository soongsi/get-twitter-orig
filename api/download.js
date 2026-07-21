import { Readable } from "stream";

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

    if (!response.ok) {
      res.status(500).send("Failed to fetch media");
      return;
    }

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

    // 🔥 핵심: Web Stream → Node Stream 변환
    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    res.status(500).send("Server error");
  }
}
