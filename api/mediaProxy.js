import { Readable } from "stream";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).send("url required");
    return;
  }

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0",
    };

    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await fetch(url, { headers });

    if (!response.ok && response.status !== 206) {
      res.status(500).send("Failed to fetch media");
      return;
    }

    if (!response.body) {
      res.status(500).send("No response body");
      return;
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges") || "bytes";

    res.status(response.status === 206 ? 206 : 200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", acceptRanges);

    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }

    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error("MEDIA PROXY ERROR:", err);
    res.status(500).send("Server error");
  }
}
