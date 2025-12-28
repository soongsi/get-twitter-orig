export const config = {
  runtime: "nodejs",
};

const extractTweetId = (url) => {
  const m = url.match(/status\/(\d+)/i);
  return m ? m[1] : null;
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: "url required" });
    return;
  }

  const tweetId = extractTweetId(url);
  if (!tweetId) {
    res.status(400).json({ error: "invalid tweet url" });
    return;
  }

  try {
    const vxRes = await fetch(
      `https://api.vxtwitter.com/i/status/${tweetId}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!vxRes.ok) {
      res.status(500).json({ error: "vx fetch failed" });
      return;
    }

    const data = await vxRes.json();
    const medias = [];

    if (Array.isArray(data.media_extended)) {
      data.media_extended.forEach((m) => {
        /* ======================
           📸 PHOTO
        ====================== */
        if (m.type === "photo") {
          const raw = m.url || m.media_url_https || m.media_url;
          if (!raw) return;

          let img = raw.replace(/(\?|\&)?name=[^&]+/, "");
          img = img.includes("?") ? img + "&name=orig" : img + "?name=orig";

          medias.push({
            type: "photo",
            url: img,
            thumb: img,
          });
          return;
        }

        /* ======================
           🎞️ VIDEO (direct mp4)
        ====================== */
        if ((m.type === "video" || m.type === "animated_gif") && m.url) {
          if (m.url.includes("video.twimg.com")) {
            medias.push({
              type: "video",
              url: m.url,
              thumb: m.thumbnail_url || null,
            });
            return;
          }
        }

        /* ======================
           🎞️ VIDEO (variants)
        ====================== */
        if (
          (m.type === "video" || m.type === "animated_gif") &&
          Array.isArray(m.variants)
        ) {
          const mp4s = m.variants.filter(
            (v) => v.content_type === "video/mp4" && v.url
          );
          if (mp4s.length === 0) return;

          const best = mp4s.sort(
            (a, b) => (b.bitrate || 0) - (a.bitrate || 0)
          )[0];

          medias.push({
            type: "video",
            url: best.url,
            thumb:
              m.thumbnail_url ||
              m.media_url_https ||
              m.media_url ||
              null,
          });
        }
      });
    }

    res.status(200).json({
      tweetId,
      medias,
    });
  } catch (e) {
    res.status(500).json({ error: "server error", detail: e.message });
  }
}
