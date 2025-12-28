import React, { useState } from "react";
import Swal from "sweetalert2";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(false);

  // =========================
  // 트윗 ID 추출
  // =========================
  const extractTweetId = (url) => {
    const match = url.match(/status\/(\d+)/i);
    return match ? match[1] : null;
  };

  // =========================
  // 미디어 파서 (최종판)
  // =========================
  const parseVxMedia = (data) => {
    const results = [];

    if (!Array.isArray(data.media_extended)) return results;

    data.media_extended.forEach((m) => {
      /* ======================
         📸 PHOTO
      ====================== */
      if (m.type === "photo") {
        const raw = m.url || m.media_url_https || m.media_url;
        if (!raw) return;

        let img = raw.replace(/(\?|\&)?name=[^&]+/, "");
        img = img.includes("?") ? img + "&name=orig" : img + "?name=orig";

        results.push({
          url: img,
          type: "photo",
          thumb: img,
        });
        return;
      }

      /* ======================
         🎞️ VIDEO / GIF
         1) amplify / direct mp4
      ====================== */
      if ((m.type === "video" || m.type === "animated_gif") && m.url) {
        if (m.url.includes("video.twimg.com")) {
          results.push({
            url: m.url,
            type: "video",
            thumb: m.thumbnail_url || null,
          });
          return;
        }
      }

      /* ======================
         🎞️ VIDEO / GIF
         2) variants 기반
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

        results.push({
          url: best.url,
          type: "video",
          thumb:
            m.thumbnail_url ||
            m.media_url_https ||
            m.media_url ||
            null,
        });
      }
    });

    return results;
  };

  // =========================
  // 📸 미디어 불러오기
  // =========================
  const handleFetch = async () => {
      if (!url.trim()) {
        Swal.fire({ icon: "warning", title: "트윗 URL을 입력해주세요" });
        return;
      }
    
      setLoading(true);
      setMedias([]);
    
      try {
        const res = await fetch(
          `/api/tweetMedia?url=${encodeURIComponent(url)}`
        );
        const data = await res.json();
    
        if (!data.medias || data.medias.length === 0) {
          throw new Error("다운로드 가능한 미디어가 없습니다.");
        }
    
        setMedias(data.medias);
      } catch (e) {
        Swal.fire({
          icon: "error",
          title: "에러 발생 😢",
          text: e.message,
        });
      } finally {
        setLoading(false);
      }
  };


  // =========================
  // 📥 다운로드
  // =========================
  const downloadFile = async (media, idx) => {
    const ext = media.type === "video" ? "mp4" : "jpg";
    const filename = `twitter_${Date.now()}_${idx + 1}.${ext}`;
  
    const proxyUrl =
      `/api/download?url=${encodeURIComponent(media.url)}&filename=${filename}`;
  
    const a = document.createElement("a");
    a.href = proxyUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setUrl("");
    setMedias([]);
    setLoading(false);
  };
  
  const handleBulkDownload = async () => {
    if (!medias.length) return;

    Swal.fire({
      title: "파일 다운로드 중...",
      html: `0 / ${medias.length} 완료`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let done = 0;

    for (let i = 0; i < medias.length; i++) {
      await downloadFile(medias[i], i);
      done++;
      Swal.update({ html: `${done} / ${medias.length} 완료` });
    }

    Swal.close();
    Swal.fire({
      icon: "success",
      title: "모두 다운로드 완료!",
      confirmButtonColor: "#1d9bf0",
    });
  };

  // =========================
  // 🎨 렌더링
  // =========================
  return (
    <div className="app">
      <h2>트위터 원본 이미지 / 영상 다운로더</h2>

      <div className="input-container">
        <input
          type="text"
          placeholder="트윗 URL 입력 (예: https://x.com/.../status/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      
        <button onClick={handleFetch} disabled={loading}>
          {loading ? "불러오는 중..." : "불러오기"}
        </button>
      
        <button onClick={handleBulkDownload} disabled={!medias.length}>
          📥 모두 다운로드
        </button>
      
        {/* ♻️ 초기화 버튼 */}
        <button
          className="reset"
          onClick={handleReset}
          disabled={loading && !medias.length}
        >
          🔄 초기화
        </button>
      </div>

      <div className="images">
        {medias.map((m, i) => (
          <div key={i} className="image-block">
            {m.type === "photo" ? (
              <img src={m.url} alt={`media_${i}`} />
            ) : (
              <video
                src={m.url}
                poster={m.thumb || undefined}
                controls
                muted
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
              />
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
