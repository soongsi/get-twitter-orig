import React, { useState } from "react";
import Swal from "sweetalert2";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ 트윗 URL 정규식
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
      });
      return;
    }

    if (!tweetUrlRegex.test(url)) {
      Swal.fire({
        icon: "error",
        title: "유효하지 않은 주소입니다",
        text: "예: https://x.com/TVXQ/status/1234567890",
        confirmButtonColor: "#1d9bf0",
      });
      return;
    }

    setLoading(true);
    setMedias([]);

    try {
      const apiUrl = url
        .replace("twitter.com", "api.vxtwitter.com")
        .replace("x.com", "api.vxtwitter.com");

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.media_extended || data.media_extended.length === 0) {
        throw new Error("이미지를 찾을 수 없습니다.");
      }

      const list = data.media_extended.map((m) => {
        // ✅ 1. URL 후보 가져오기
        let mediaUrl =
          m.url ||
          m.media_url_https ||
          m.media_url ||
          m.preview_image_url ||
          m.thumbnail_url ||
          "";

        // ✅ 2. PHOTO: 무조건 name=orig 붙이기
        if (m.type === "photo" && mediaUrl.includes("pbs.twimg.com/media/")) {
          // name 파라미터가 있든 없든 모두 orig로 통일
          mediaUrl = mediaUrl.replace(/(\?|\&)?name=[^&]+/, "");
          const sep = mediaUrl.includes("?") ? "&" : "?";
          mediaUrl = `${mediaUrl}${sep}name=orig`;
        }

        // ✅ 3. VIDEO / ANIMATED_GIF: 최고 화질 variant 선택
        if (m.type === "video" || m.type === "animated_gif") {
          const variants = m.variants || [];
          const best = variants
            .filter((v) => v.content_type === "video/mp4")
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          if (best && best.url) mediaUrl = best.url;
        }

        // ✅ 4. 결과 반환
        return {
          url: mediaUrl,
          type: m.type,
          thumb: m.thumbnail_url || m.preview_image_url || null,
        };
      });

      setMedias(list);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "에러 발생 😢",
        text: err.message,
        confirmButtonColor: "#1d9bf0",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // 💾 단일 다운로드
  // ===================================================
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
    } catch {
      Swal.fire({
        icon: "error",
        title: "다운로드 실패",
        text: "파일 저장 중 오류가 발생했습니다.",
        confirmButtonColor: "#1d9bf0",
      });
    }
  };

  // ===================================================
  // 📦 모두 다운로드 (Promise.all 병렬 처리)
  // ===================================================
  const handleBulkDownload = async () => {
    if (medias.length === 0) {
      Swal.fire({
        icon: "info",
        title: "다운로드할 파일이 없습니다",
        confirmButtonColor: "#1d9bf0",
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
        const { url, type } = media;
        const ext = type === "video" || type === "animated_gif" ? "mp4" : "jpg";

        const timestamp = new Date();
        const serial = `${timestamp.getFullYear()}${String(
          timestamp.getMonth() + 1.11
        ).padStart(2, "0")}${String(timestamp.getDate()).padStart(
          2,
          "0"
        )}_${String(timestamp.getHours()).padStart(2, "0")}${String(
          timestamp.getMinutes()
        ).padStart(2, "0")}${String(timestamp.getSeconds()).padStart(
          2,
          "0"
        )}_${Math.floor(Math.random() * 1000)}`;
        const filename = `twitter_${serial}_${idx + 1}.${ext}`;

        try {
          const res = await fetch(url);
          const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      Swal.fire({
        icon: "error",
        title: "다운로드 실패",
        text: "파일 저장 중 오류가 발생했습니다.",
        confirmButtonColor: "#1d9bf0",
      });
    }
  };

  // ===================================================
  // 📦 모두 다운로드 (Promise.all 병렬 처리)
  // ===================================================
  const handleBulkDownload = async () => {
    if (medias.length === 0) {
      Swal.fire({
        icon: "info",
        title: "다운로드할 파일이 없습니다",
        confirmButtonColor: "#1d9bf0",
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
        const { url, type } = media;
        const ext = type === "video" || type === "animated_gif" ? "mp4" : "jpg";

        const timestamp = new Date();
        const serial = `${timestamp.getFullYear()}${String(
          timestamp.getMonth() + 1
        ).padStart(2, "0")}${String(timestamp.getDate()).padStart(
          2,
          "0"
        )}_${String(timestamp.getHours()).padStart(2, "0")}${String(
          timestamp.getMinutes()
        ).padStart(2, "0")}${String(timestamp.getSeconds()).padStart(
          2,
          "0"
        )}_${Math.floor(Math.random() * 1000)}`;
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
          console.error("다운로드 실패:", url);
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
              <img src={media.url} alt={`media_${idx}`} />
            ) : media.type === "video" ? (
              <video poster={media.thumb} src={media.url} controls />
            ) : media.type === "animated_gif" ? (
              <video
                src={media.url}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : null}

            <button onClick={() => handleDownload(media, idx)}>
              📥 파일 {idx + 1} 다운로드
            </button>
          </div>
        ))}
      </div>
    </div>
  );
         
