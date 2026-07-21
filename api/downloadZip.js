const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const getDosDateTime = () => {
  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate =
    ((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();
  return { dosTime, dosDate };
};

const sanitizeFilename = (name) =>
  String(name || "media")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);

const createZip = (files) => {
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;
  const { dosTime, dosDate } = getDosDateTime();

  files.forEach((file) => {
    const name = Buffer.from(file.name);
    const data = file.data;
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    chunks.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralDirectory.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  });

  const centralOffset = offset;
  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralSize, 12);
  endRecord.writeUInt32LE(centralOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, ...centralDirectory, endRecord]);
};

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  const { items, filename } = req.query;

  if (!items) {
    res.status(400).send("items required");
    return;
  }

  try {
    let medias;
    try {
      medias = JSON.parse(items);
    } catch {
      medias = JSON.parse(decodeURIComponent(items));
    }

    if (!Array.isArray(medias) || medias.length === 0) {
      res.status(400).send("invalid items");
      return;
    }

    const files = [];

    for (let i = 0; i < medias.length; i++) {
      const media = medias[i];
      if (!media?.url) continue;

      const ext = media.type === "video" ? "mp4" : "jpg";
      const mediaRes = await fetch(media.url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      if (!mediaRes.ok) continue;

      const data = Buffer.from(await mediaRes.arrayBuffer());
      files.push({
        name: sanitizeFilename(`twitter_${i + 1}.${ext}`),
        data,
      });
    }

    if (files.length === 0) {
      res.status(500).send("Failed to fetch media");
      return;
    }

    const zip = createZip(files);
    const zipName = sanitizeFilename(filename || `twitter_media_${Date.now()}.zip`);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Length", zip.length);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipName}"; filename*=UTF-8''${encodeURIComponent(zipName)}`
    );
    res.status(200).send(zip);
  } catch (err) {
    console.error("ZIP DOWNLOAD ERROR:", err);
    res.status(500).send("Server error");
  }
}
