import React, { useState } from "react";
import Swal from "sweetalert2";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(false);

  const tweetUrlRegex = /^(https?:\/\/)?(x|twitter)\.com\/[^\/]+\/status\/\d+/i;

  // ===================================================
  // 📸 트윗 미디어 불러오기
  // ===================================================
  const handleFetch = async () => {
    if (!url.trim()) {
      Swal.fire({
        icon: "warning",
        title: "트윗 URL을 입력해주세요",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
      return;
    }

    if (!tweetUrlRegex.test(url)) {
      Swal.fire({
        icon: "error",
        title: "유효하지 않은 주소입니다",
        text: "예: https://x.com/TVXQ/status/1234567890",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
      return;
    }

    setLoading(true);
    setMedias([]);

    try {
      // ===================================================
      // 1️⃣ AllOrigins로 HTML 가져오기 (이미지 + 영상 여부 판단)
      // ===================================================
      const htmlRes = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      );
      const htmlData = await htmlRes.json();
      const html = htmlData.contents || "";

      // 📸 이미지 추출
      const imageMatches = [
        ...html.matchAll(/https:\/\/pbs\.twimg\.com\/media\/[^\s"'<>]+/g),
      ];

      const images = [...new Set(imageMatches.map((m) => {
        let u = m[0].replace(/(\?|\&)?name=[^&]+/, "");
        return u.includes("?") ? u + "&name=orig" : u + "?name=orig";
      }))];

      // 🎞️ 영상 존재 여부 판단
      const hasVideo = /video\.twimg\.com/.test(html);

      let videos = [];

      // ===================================================
      // 2️⃣ 영상이 있을 때만 VxTwitter 호출
      // ===================================================
      if (hasVideo) {
        const vxUrl = url
          .replace("twitter.com", "api.vxtwitter.com")
          .replace("x.com", "api.vxtwitter.com");

        const vxRes = await fetch(vxUrl);
        const vxData = await vxRes.json();

        if (vxData.media_extended) {
          vxData.media_extended.forEach((m) => {
            if (m.type === "video" || m.type === "animated_gif") {
              const best = m.variants
                ?.filter((v) => v.content_type === "video/mp4")
                .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

              if (best?.url) {
                videos.push(best.url);
              }
            }
          });
        }
      }

      if (!images.length && !videos.length) {
        throw new Error("미디어를 찾을 수 없습니다.");
      }

      // ===================================================
      // 3️⃣ medias 배열로 통합
      // ===================================================
      const finalList = [
        ...images.map((u) => ({
          url: u,
          type: "photo",
          thumb: u,
        })),
        ...videos.map((u) => ({
          url: u,
          type: "video",
          thumb: null,
        })),
      ];

      setMedias(finalList);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "에러 발생 😢",
        text: err.message,
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // 📥 공통 다운로드
  // ===================================================
  const downloadFile = async (media, idx) => {
    const { url, type } = media;
    const ext = type === "video" ? "mp4" : "jpg";

    const timestamp = new Date();
    const serial = `${timestamp.getFullYear()}${String(
      timestamp.getMonth() + 1
    ).padStart(2, "0")}${String(timestamp.getDate()).padStart(2, "0")}_${String(
      timestamp.getHours()
    ).padStart(2, "0")}${String(timestamp.getMinutes()).padStart(
      2,
      "0"
    )}${String(timestamp.getSeconds()).padStart(2, "0")}_${Math.floor(
      Math.random() * 1000
    )}`;
    const filename = `twitter_${serial}_${idx + 1}.${ext}`;

    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ===================================================
  // 📦 모두 다운로드
  // ===================================================
  const handleBulkDownload = async () => {
    if (!medias.length) return;

    let completed = 0;

    Swal.fire({
      title: "파일 다운로드 중...",
      html: `0 / ${medias.length} 완료`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    await Promise.all(
      medias.map(async (m, i) => {
        await downloadFile(m, i);
        completed++;
        Swal.update({ html: `${completed} / ${medias.length} 완료` });
      })
    );

    Swal.close();
    Swal.fire({
      icon: "success",
      title: "모두 다운로드 완료!",
      text: `${completed}개의 파일을 저장했습니다.`,
      confirmButtonColor: "#1d9bf0",
    });
  };

  // ===================================================
  // 🎨 렌더링
  // ===================================================
  return (
    <div className="app">
      <h2>트위터 원본 이미지 다운로더</h2>

      <div className="input-container">
        <input
          type="text"
          placeholder="트윗 URL 입력 (예: https://x.com/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button onClick={handleFetch} disabled={loading}>
          {loading ? "불러오는 중..." : "불러오기"}
        </button>
        <button onClick={handleBulkDownload} disabled={!medias.length}>
          📥 모두 다운로드
        </button>
      </div>

      <div className="images">
        {medias.map((m, i) => (
          <div key={i} className="image-block">
            {m.type === "photo" ? (
              <img src={m.url} alt={`media_${i}`} />
            ) : (
              <video src={m.url} controls />
            )}
            <button onClick={() => downloadFile(m, i)}>
              📥 파일 {i + 1} 다운로드
            </button>
          </div>
        ))}
      </div>
    </div>
  );
    }
