import Link from "next/link";

export default function About() {
  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-br from-[#8B5CF6]/20 via-[#0F0B1C] to-[#EC4899]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">About SocialBook</h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Building the future of social connection, one friend at a time.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-[#0F0B1C]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-invert prose-lg max-w-none">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-white/80 mb-6">
              SocialBook was created with a simple mission: to help people connect meaningfully in a digital world. We believe social media should bring people together, not drive them apart.
            </p>
            <p className="text-white/80 mb-6">
              Our platform is designed to prioritize genuine connections over endless scrolling, meaningful interactions over mindless consumption, and user privacy over data exploitation.
            </p>

            <h2 className="text-3xl font-bold mt-12 mb-6">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
                <p className="text-white/60">
                  Your data belongs to you. We never sell your personal information and give you full control over your privacy settings.
                </p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-xl font-semibold mb-3">Authentic Connections</h3>
                <p className="text-white/60">
                  We foster genuine relationships by prioritizing meaningful interactions over viral content.
                </p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-xl font-semibold mb-3">Safe Environment</h3>
                <p className="text-white/60">
                  We maintain strict community guidelines and moderation to keep SocialBook a safe space for everyone.
                </p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-xl font-semibold mb-3">Innovation</h3>
                <p className="text-white/60">
                  We continuously improve our platform based on user feedback and emerging technologies.
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-bold mt-12 mb-6">Join Us</h2>
            <p className="text-white/80 mb-8">
              Ready to experience social media done right? Download SocialBook today and join our growing community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/#download"
                className="inline-block px-8 py-4 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-full text-white font-semibold text-center hover:opacity-90 transition-opacity"
              >
                Download SocialBook
              </Link>
              <Link
                href="/support"
                className="inline-block px-8 py-4 border border-white/20 rounded-full text-white font-semibold text-center hover:bg-white/10 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}