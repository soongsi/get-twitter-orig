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

  // ✅ 어떤 형태든 status/트윗ID 뽑기 (x.com/i/status, x.com/i/web/status 다 대응)
  const idMatch = url.match(/status\/(\d+)/i);
  const tweetId = idMatch?.[1];

  if (!tweetId) {
    Swal.fire({
      icon: "error",
      title: "유효하지 않은 트윗 주소입니다",
      text: "status/뒤에 숫자 ID가 포함된 주소인지 확인해주세요.",
      confirmButtonColor: "#1d9bf0",
      customClass: { title: "swal-custom-title" },
    });
    return;
  }

  setLoading(true);
  setMedias([]);

  try {
    // =========================
    // 1) HTML(AllOrigins)로 이미지 먼저 시도
    // =========================
    let html = "";
    try {
      const htmlRes = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      );
      const htmlData = await htmlRes.json();
      html = htmlData?.contents || "";
    } catch (e) {
      // AllOrigins 실패는 흔함 → 아래에서 Vx로 커버
      html = "";
    }

    // 📸 이미지 추출 (pbs.twimg.com/media/...)
    const imageMatches = [
      ...html.matchAll(/https:\/\/pbs\.twimg\.com\/media\/[^\s"'<>]+/g),
    ];
    const images = [...new Set(imageMatches.map((m) => {
      let u = m[0].replace(/(\?|\&)?name=[^&]+/, "");
      return u.includes("?") ? u + "&name=orig" : u + "?name=orig";
    }))];

    // 🎞️ 영상 힌트 (HTML에 video.twimg.com은 잘 안 나옴 → 메타로 판단)
    const looksLikeVideo =
      /property="og:video"|name="twitter:player"|twitter:player/i.test(html);

    // ✅ Vx 호출 조건:
    // - HTML에서 이미지 못 찾음
    // - 또는 영상 힌트 있음
    // - 또는 HTML이 비어있음(= AllOrigins가 제대로 못 가져옴)
    const shouldCallVx = images.length === 0 || looksLikeVideo || !html;

    let vxMedias = [];

    if (shouldCallVx) {
      // =========================
      // 2) 필요할 때만 Vx 호출 (영상/이미지 둘 다 여기서 커버)
      // =========================
      const vxUrl = `https://api.vxtwitter.com/i/status/${tweetId}`;
      const vxRes = await fetch(vxUrl);
      const vxData = await vxRes.json();

      // Vx 응답 구조 대응 (media_extended / media / media_urls)
      let mediaList = [];

      if (vxData.media_extended && vxData.media_extended.length > 0) {
        // media_extended는 객체일 수도/문자열일 수도 있어서 안전 처리
        mediaList = vxData.media_extended.map((m) => (typeof m === "string" ? m : m.url)).filter(Boolean);
      } else if (vxData.media && vxData.media.length > 0) {
        mediaList = vxData.media;
      } else if (vxData.media_urls && vxData.media_urls.length > 0) {
        mediaList = vxData.media_urls;
      }

      vxMedias = mediaList.map((link) => {
        let finalUrl = link;

        // 이미지면 orig 강제
        if (finalUrl.includes("pbs.twimg.com/media/")) {
          finalUrl = finalUrl.replace(/(\?|\&)?name=[^&]+/, "");
          const sep = finalUrl.includes("?") ? "&" : "?";
          finalUrl = `${finalUrl}${sep}name=orig`;
          return { url: finalUrl, type: "photo", thumb: finalUrl };
        }

        // 비디오면 그대로(mp4)
        if (finalUrl.includes("video.twimg.com")) {
          return { url: finalUrl, type: "video", thumb: null };
        }

        // 기타는 photo 취급
        return { url: finalUrl, type: "photo", thumb: finalUrl };
      });
    }

    // =========================
    // 3) 최종 병합 (중복 제거)
    // =========================
    const merged = [
      ...images.map((u) => ({ url: u, type: "photo", thumb: u })),
      ...vxMedias,
    ];

    // url 기준 중복 제거
    const uniq = [];
    const seen = new Set();
    for (const m of merged) {
      if (!m?.url) continue;
      if (seen.has(m.url)) continue;
      seen.add(m.url);
      uniq.push(m);
    }

    if (uniq.length === 0) throw new Error("미디어를 찾을 수 없습니다.");

    setMedias(uniq);
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "에러 발생 😢",
      text: err?.message || "미디어를 불러올 수 없습니다.",
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
