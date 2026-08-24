import Image from "next/image";
import Link from "next/link";
import DownloadButton from "@/components/DownloadButton";

export default function Home() {
  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative py-20 flex items-center justify-center overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/20 via-[#0F0B1C] to-[#EC4899]/20" />
        
        {/* Animated Background Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#8B5CF6]/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#EC4899]/30 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">
            SocialBook
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
            Connect with friends, share moments, and discover content on the social platform designed for you.
          </p>
          
          {/* Download Buttons */}
          <div id="download" className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <DownloadButton />
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-[#0F0B1C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why SocialBook?</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Discover what makes SocialBook the perfect platform for staying connected.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:border-[#8B5CF6]/50 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect with Friends</h3>
              <p className="text-white/60">
                Build meaningful relationships and stay connected with the people who matter most.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:border-[#8B5CF6]/50 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Share Moments</h3>
              <p className="text-white/60">
                Share your favorite moments through posts, stories, reels, and live videos.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:border-[#8B5CF6]/50 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Discover Content</h3>
              <p className="text-white/60">
                Explore trending content, discover new creators, and find content that interests you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-[#8B5CF6] to-[#EC4899]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Join millions of users on SocialBook and start connecting today.
          </p>
          <a
            href="#download"
            className="inline-block px-8 py-4 bg-white text-[#0F0B1C] rounded-full font-semibold hover:bg-white/90 transition-colors"
          >
            Download SocialBook
          </a>
        </div>
      </section>
    </div>
  );
}