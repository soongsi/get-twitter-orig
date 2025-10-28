import React, { useState } from "react";
import Swal from "sweetalert2";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        text: "트윗 URL 형식이 올바르지 않습니다.<br>예) https://x.com/TVXQ/status/1234567890",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
      return;
    }

    setLoading(true);
    setError("");
    setImages([]);

    try {
      // x.com → api.vxtwitter.com 변환
      const apiUrl = url
        .replace("twitter.com", "api.vxtwitter.com")
        .replace("x.com", "api.vxtwitter.com");

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.media_extended || data.media_extended.length === 0) {
        throw new Error("이미지를 찾을 수 없습니다.");
      }

      const originals = data.media_extended.map((m) => {
        let imgUrl = m.url;
        if (imgUrl.includes("name=")) {
          imgUrl = imgUrl.replace(/name=[^&]+/, "name=orig");
        } else {
          const sep = imgUrl.includes("?") ? "&" : "?";
          imgUrl = `${imgUrl}${sep}name=orig`;
        }
        return imgUrl;
      });

      setImages(originals);
    } catch (err) {
      setError(err.message);
      Swal.fire({
        icon: "error",
        title: "에러 발생 😢",
        text: err.message || "이미지를 불러올 수 없습니다.",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imgUrl) => {
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
    const filename = `twitter_${serial}.jpg`;

    try {
      const imgRes = await fetch(imgUrl);
      const blob = await imgRes.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "다운로드 실패",
        text: "이미지를 저장하는 중 오류가 발생했습니다.",
        confirmButtonColor: "#1d9bf0",
        customClass: { title: "swal-custom-title" },
      });
    }
  };

  const handleReset = () => {
    setUrl("");
    setImages([]);
    setError("");
    setLoading(false);
  };

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
          {loading ? "불러오는 중..." : "이미지 찾기"}
        </button>
        <button className="reset" onClick={handleReset} disabled={loading}>
          🔄 초기화
        </button>
      </div>

      <div className="images">
        {images.map((img, idx) => (
          <div key={idx} className="image-block">
            <img src={img} alt={`tweet_${idx}`} />
            <button onClick={() => handleDownload(img)}>
              📥 이미지 {idx + 1} 다운로드
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
