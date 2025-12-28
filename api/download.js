export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  const { url, filename } = req.query;

  console.log("DOWNLOAD REQUEST:", url);

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

    console.log("FETCH STATUS:", response.status);
    console.log("CONTENT-TYPE:", response.headers.get("content-type"));

    if (!response.ok) {
      res.status(500).send("Failed to fetch media");
      return;
    }

    if (!response.body) {
      res.status(500).send("No response body");
      return;
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename || "media"}"`
    );

    response.body.pipe(res);
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    res.status(500).send("Server error");
  }
}
