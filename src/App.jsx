import React, { useState } from "react";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) return alert("트윗 URL을 입력하세요!");

    setLoading(true);
    setError("");
    setImages([]);

    try {
      const apiUrl = url
        .replace("twitter.com", "api.vxtwitter.com")
        .replace("x.com", "api.vxtwitter.com");

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.media_extended || data.media_extended.length === 0)
        throw new Error("이미지를 찾을 수 없습니다.");

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
      alert("다운로드 오류: " + err.message);
    }
  };

  // ✅ 초기화 버튼 추가
  const handleReset = () => {
    setUrl("");
    setImages([]);
    setError("");
    setLoading(false);
  };

  return (
    <div className="app">
      <h2>🐦 트위터 원본 이미지 다운로더</h2>

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

      {error && <p className="error">❌ {error}</p>}

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
