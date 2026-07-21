export const config = {
  runtime: "nodejs",
};

const extractTweetId = (url) => {
  const m = url.match(/status\/(\d+)/i);
  return m ? m[1] : null;
};

const pickBestVideoUrl = (media) => {
  if (!Array.isArray(media.variants)) {
    return media.url?.includes("video.twimg.com") ? media.url : null;
  }

  const mp4s = media.variants.filter(
    (variant) => variant.content_type === "video/mp4" && variant.url
  );

  if (mp4s.length === 0) {
    return media.url?.includes("video.twimg.com") ? media.url : null;
  }

  return mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0].url;
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
    const seen = new Set();

    /* ======================
       1️⃣ media_extended
    ====================== */
    if (Array.isArray(data.media_extended)) {
      data.media_extended.forEach((m) => {
        // PHOTO
        if (m.type === "photo") {
          const raw = m.url || m.media_url_https || m.media_url;
          if (!raw || seen.has(raw)) return;
          seen.add(raw);

          const base = raw.replace(/(\?|\&)?name=[^&]+/, "");
          medias.push({
            type: "photo",
            thumb: base + "?name=large",
            url: base + "?name=orig",
          });
        }

        // VIDEO / GIF
        if ((m.type === "video" || m.type === "animated_gif")) {
          const videoUrl = pickBestVideoUrl(m);

          if (videoUrl) {
            if (seen.has(videoUrl)) return;
            seen.add(videoUrl);

            medias.push({
              type: "video",
              url: videoUrl,
              thumb: m.thumbnail_url || null,
            });
          }
        }
      });
    }

    /* ======================
       2️⃣ mediaURLs (mixed media 핵심)
    ====================== */
    if (Array.isArray(data.mediaURLs)) {
      data.mediaURLs.forEach((u) => {
        if (!u || seen.has(u)) return;
        seen.add(u);

        const base = u.replace(/(\?|\&)?name=[^&]+/, "");
        medias.push({
          type: "photo",
          thumb: base + "?name=large",
          url: base + "?name=orig",
        });
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
