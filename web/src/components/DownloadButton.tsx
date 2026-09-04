"use client";

import { useEffect, useState } from "react";

const REPO = "Akhil24thakur/thesocialbook";
const FALLBACK_URL = `https://github.com/${REPO}/releases/latest/download/SocialBook.apk`;
const FALLBACK_VERSION = "4.5.3";

export default function DownloadButton() {
  const [url, setUrl] = useState(FALLBACK_URL);
  const [version, setVersion] = useState(FALLBACK_VERSION);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tag_name) setVersion(data.tag_name.replace("v", ""));
        const apk = data.assets?.find(
          (a: { name: string }) => a.name.endsWith(".apk")
        );
        if (apk?.browser_download_url) setUrl(apk.browser_download_url);
      })
      .catch(() => {});
  }, []);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "SocialBook.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.location.href = url;
    } finally {
      setDownloading(false);
    }
  };

  return (
    <a
      href={url}
      onClick={handleDownload}
      className="flex items-center space-x-3 px-8 py-4 bg-white text-[#0F0B1C] rounded-full font-semibold hover:bg-white/90 transition-colors"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zM15.53 2.16l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
      </svg>
      <span>{downloading ? "Downloading..." : "Download for Android"}</span>
      <span className="text-sm text-gray-500">v{version}</span>
    </a>
  );
}