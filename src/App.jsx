import React, { useState } from "react";
import Swal from "sweetalert2";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(false);

  const tweetUrlRegex = /^(https?:\/\/)?(x|twitter)\.com\/[^\/]+\/status\/\d+/i;

  const extractTweetId = (url) => {
    const match = url.match(/status\/(\d+)/i);
    return match ? match[1] : null;
  };

  const fetchImagesFromAllOrigins = async (tweetUrl) => {
    try {
      const res = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(tweetUrl)}`
      );
      const data = await res.json();
      const html = data?.contents || "";
  
      if (!html) return [];
  
      const matches = [
        ...html.matchAll(/https:\/\/pbs\.twimg\.com\/media\/[^\s"'<>]+/g),
      ];
  
      return [...new Set(matches.map((m) => {
        let u = m[0].replace(/(\?|\&)?name=[^&]+/, "");
        return u.includes("?") ? u + "&name=orig" : u + "?name=orig";
      }))].map((u) => ({
        url: u,
        type: "photo",
        thumb: u,
      }));
    } catch {
      return [];
    }
  };

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
    
      const tweetId = extractTweetId(url);
      if (!tweetId) {
        Swal.fire({
          icon: "error",
          title: "유효하지 않은 트윗 주소입니다",
          text: "status/숫자 형태의 주소인지 확인해주세요.",
          confirmButtonColor: "#1d9bf0",
          customClass: { title: "swal-custom-title" },
        });
        return;
      }
    
      setLoading(true);
      setMedias([]);
    
      try {
        let medias = [];
    
        // =========================
        // 1️⃣ VxTwitter 1차 시도
        // =========================
        try {
          const vxUrl = `https://api.vxtwitter.com/i/status/${tweetId}`;
          const res = await fetch(vxUrl);
          const data = await res.json();
    
          if (Array.isArray(data.media_extended)) {
            data.media_extended.forEach((m) => {
              // 📸 IMAGE
              if (m.type === "photo" && m.url) {
                let imgUrl = m.url.replace(/(\?|\&)?name=[^&]+/, "");
                imgUrl = imgUrl.includes("?")
                  ? imgUrl + "&name=orig"
                  : imgUrl + "?name=orig";
    
                medias.push({
                  url: imgUrl,
                  type: "photo",
                  thumb: imgUrl,
                });
              }
    
              // 🎞️ VIDEO / GIF
              if (
                (m.type === "video" || m.type === "animated_gif") &&
                Array.isArray(m.variants)
              ) {
                const best = m.variants
                  .filter((v) => v.content_type === "video/mp4")
                  .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    
                if (best?.url) {
                  medias.push({
                    url: best.url,
                    type: "video",
                    thumb: m.thumbnail_url || null,
                  });
                }
              }
            });
          }
        } catch {
          // Vx 실패 → 아래에서 백업
        }
    
        // =========================
        // 2️⃣ Vx 결과 없으면 이미지 백업
        // =========================
        if (medias.length === 0) {
          const backupImages = await fetchImagesFromAllOrigins(url);
          medias = backupImages;
        }
    
        if (medias.length === 0) {
          throw new Error("미디어를 찾을 수 없습니다.");
        }
    
        setMedias(medias);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "에러 발생 😢",
          text: err.message || "미디어를 불러올 수 없습니다.",
          confirmButtonColor: "#1d9bf0",
          customClass: { title: "swal-custom-title" },
        });
      } finally {
        setLoading(false);
      }
  };

  // ===================================================
  // 💾 단일 다운로드
  // ===================================================
  const handleDownload = async (media, idx) => {
    await downloadFile(media, idx);
  };

  // ===================================================
  // 📦 모두 다운로드 (Promise.all 병렬)
  // ===================================================
  const handleBulkDownload = async () => {
    if (medias.length === 0) {
      Swal.fire({
        icon: "info",
        title: "다운로드할 파일이 없습니다",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
      return;
    }

    Swal.fire({
      title: "파일 다운로드 중...",
      html: `0 / ${medias.length} 완료`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let completed = 0;

    await Promise.all(
      medias.map(async (media, idx) => {
        try {
          await downloadFile(media, idx);
          completed++;
          Swal.update({ html: `${completed} / ${medias.length} 완료` });
        } catch (e) {
          console.error("다운로드 실패:", e);
        }
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
  // 📥 공통 다운로드 함수
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
  // ♻️ 초기화
  // ===================================================
  const handleReset = () => {
    setUrl("");
    setMedias([]);
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
        <button onClick={handleBulkDownload} disabled={medias.length === 0}>
          📥 모두 다운로드
        </button>
        <button className="reset" onClick={handleReset} disabled={loading}>
          🔄 초기화
        </button>
      </div>

      <div className="images">
        {medias.map((media, idx) => (
          <div key={idx} className="image-block">
            {media.type === "photo" ? (
              <img src={media.thumb} alt={`media_${idx}`} />
            ) : (
              <video
                poster={media.thumb}
                src={media.url}
                controls
              />
            )}
            <button onClick={() => handleDownload(media, idx)}>
              📥 파일 {idx + 1} 다운로드
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
