import React, { useState } from "react";
import Swal from "sweetalert2";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ 트윗 URL 정규식 (x.com / twitter.com 모두 허용)
  const tweetUrlRegex = /^(https?:\/\/)?(x|twitter)\.com\/[^\/]+\/status\/\d+/i;

  const handleFetch = async () => {
    // ✅ URL 입력 여부 확인
    if (!url.trim()) {
      Swal.fire({
        icon: "warning",
        title: "트윗 URL을 입력해주세요",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
      return;
    }

    // ✅ URL 형식 유효성 검사
    if (!tweetUrlRegex.test(url)) {
      Swal.fire({
        icon: "error",
        title: "유효하지 않은 주소입니다.",
        text: "예) https://x.com/TVXQ/status/1234567890",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
      return;
    }

    setLoading(true);
    setMedias([]);

    try {
      // x.com → api.vxtwitter.com 변환
      const apiUrl = url
        .replace("twitter.com", "api.vxtwitter.com")
        .replace("x.com", "api.vxtwitter.com");

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.media_extended || data.media_extended.length === 0) {
        throw new Error("파일을 찾을 수 없습니다.");
      }

      const list = data.media_extended.map((m) => {
        let mediaUrl = m.url;
        if (m.type === "photo") {
          if (mediaUrl.includes("name=")) {
            mediaUrl = mediaUrl.replace(/name=[^&]+/, "name=orig");
          } else {
            const sep = mediaUrl.includes("?") ? "&" : "?";
            mediaUrl = `${mediaUrl}${sep}name=orig`;
          }
        }

        return {
          url: mediaUrl,
          type: m.type,
          thumb: m.thumbnail_url || null,
        };
      });
      setMedias(list);
    } catch (err) {
      setError(err.message);
      Swal.fire({
        icon: "error",
        title: "에러 발생 😢",
        text: err.message || "파일을 불러올 수 없습니다.",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (media, idx) => {
    const { url, type } = media;
    const ext = type === "video" || type === "animated_gif" ? "mp4" : "jpg";
  
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
  
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "저장 실패",
        text: "파일 저장 중 오류가 발생했습니다.",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" }
      });
    }
  };

  const handleBulkDownload = async () => {
    if (medias.length === 0) {
      Swal.fire({ icon: "info", title: "저장할 파일이 없습니다" });
      return;
    }
  
    let completed = 0;
  
    Swal.fire({
      title: "파일 저장 중...",
      html: `0 / ${medias.length} 완료`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { title: "swal-custom-title" }
    });
  
    await Promise.all(
      medias.map(async (media, idx) => {
        const { url, type } = media;
        const ext = type === "video" || type === "animated_gif" ? "mp4" : "jpg";
  
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
  
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
          completed++;
          Swal.update({ html: `${completed} / ${medias.length} 완료` });
        } catch (err) {
          console.error("저장 실패:", url);
        }
      })
    );
  
    Swal.close();
    Swal.fire({
      icon: "success",
      title: "모두 다운로드 완료!",
      text: `${completed}개의 파일을 저장했습니다.`,
      confirmButtonColor: "#1d9bf0"
    });
  };

  const handleReset = () => {
    setUrl("");
    setMedias([]);
  };

  return (
    <div className="app">
      <h2>트위터 원본 파일 다운로더</h2>

      <div className="input-container">
        <input
          type="text"
          placeholder="트윗 URL 입력 (예: https://x.com/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button onClick={handleFetch} disabled={loading}>
          {loading ? "불러오는 중..." : "찾기"}
        </button>
        <button className="reset" onClick={handleReset} disabled={loading}>
          🔄 초기화
        </button>
        <button onClick={handleBulkDownload} disabled={medias.length === 0}>
          📥 모두 저장
        </button>
      </div>

      <div className="images">
        {medias.map((media, idx) => {
          const isPhoto =
            media.type?.toLowerCase() === "photo" ||
            /\.(jpg|jpeg|png)$/i.test(media.url);
          const isVideo =
            media.type?.toLowerCase() === "video" || media.url.includes(".mp4");
          const isGif =
            media.type?.toLowerCase() === "animated_gif";

          return (
            <div key={idx} className="image-block">
              {isPhoto ? (
                <img src={media.url} alt={`media_${idx}`} />
              ) : isVideo ? (
                <video
                  poster={media.thumb}
                  src={media.url}
                  controls={true}
                  onClick={(e) => (e.target.controls = true)}
                />
              ) : isGif ? (
                <video
                  poster={media.thumb}
                  src={media.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img src={media.thumb || media.url} alt={`media_${idx}`} />
              )}

              <button onClick={() => handleDownload(media, idx)}>
                📥 파일 {idx + 1} 다운로드
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
