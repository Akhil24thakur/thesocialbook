"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_URL = "https://thesocialbook-sp3c.onrender.com";
const PLAY_STORE_URL = "https://github.com/Akhil24thakur/thesocialbook/releases/latest";

interface PostView {
  id: number;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  author: { id: number; name: string; username?: string | null; avatarUrl?: string | null; isVerified?: boolean };
  likeCount: number;
  commentCount: number;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function PostPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <p className="text-sm text-white/60">Loading post…</p>
          </div>
        </div>
      }
    >
      <PostContent />
    </Suspense>
  );
}

function PostContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [post, setPost] = useState<PostView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triedApp, setTriedApp] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("No post specified");
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/posts/${id}/view`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "This post no longer exists" : "Could not load post");
        return res.json();
      })
      .then((data) => setPost(data.post))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad/i.test(navigator.userAgent);

  const appLink = isIOS
    ? `socialbook://post/${id}`
    : `intent://post/${id}#Intent;scheme=socialbook;package=com.thesocialbook.app;S.browser_fallback_url=${encodeURIComponent(
        typeof window !== "undefined" ? window.location.href : ""
      )};end`;

  const openInApp = () => {
    if (typeof window === "undefined") return;
    window.location.href = appLink;
    setTriedApp(true);
  };

  useEffect(() => {
    if (loading || error || triedApp) return;
    if (isAndroid || isIOS) {
      const t = setTimeout(() => {
        openInApp();
        setTimeout(() => setTriedApp(true), 2500);
      }, 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-white/60">Loading post…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600/20 text-2xl">
            📱
          </div>
          <h1 className="text-lg font-bold text-white">{error}</h1>
          <p className="mt-2 text-sm text-white/60">Check the link, or open SocialBook to explore posts.</p>
          <a
            href={PLAY_STORE_URL}
            className="mt-6 inline-block rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
          >
            Get SocialBook
          </a>
        </div>
      )}

      {!loading && !error && post && (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white">
                {post.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.author.avatarUrl} alt={post.author.name} className="h-full w-full object-cover" />
                ) : (
                  post.author.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate font-bold text-white">
                  {post.author.name}
                  {post.author.isVerified && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-sky-500">
                      <path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3 1.6-1.3 3.2 1.3 3.2-3 1.6-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3-1.6L3.5 12 2.2 8.8l3-1.6 1-3.3 3.4.5L12 2zm-1.2 13.3l5-5-1.4-1.4-3.6 3.6-1.8-1.8-1.4 1.4 3.2 3.2z" />
                    </svg>
                  )}
                </p>
                <p className="text-xs text-white/50">{timeAgo(post.createdAt)}</p>
              </div>
            </div>

            {post.content && (
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{post.content}</p>
            )}
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt="Post" className="mt-4 w-full rounded-xl" />
            )}

            <div className="mt-4 flex gap-5 text-sm text-white/50">
              <span>❤️ {post.likeCount}</span>
              <span>💬 {post.commentCount}</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-600/10 p-5 text-center">
            <p className="font-bold text-white">Open in the SocialBook app</p>
            <p className="mt-1 text-sm text-white/60">For the full experience — comments, likes and more.</p>
            <button
              onClick={openInApp}
              className="mt-4 rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
            >
              Open in app
            </button>
            {triedApp && (
              <p className="mt-3 text-xs text-white/40">
                Didn&apos;t open? You may not have the app installed.
              </p>
            )}
            <a
              href={PLAY_STORE_URL}
              className="mt-3 inline-block text-xs font-semibold text-violet-300 underline underline-offset-4"
            >
              Download SocialBook
            </a>
          </div>
        </>
      )}
    </div>
  );
}
