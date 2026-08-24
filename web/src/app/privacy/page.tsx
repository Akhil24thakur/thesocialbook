export default function Privacy() {
  return (
    <div className="pt-16">
      <section className="py-24 bg-[#0F0B1C]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-white/60 mb-6">Last updated: August 21, 2026</p>
          
          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-white/80">
                Welcome to SocialBook. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our application.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <p className="text-white/80">
                We collect information you provide directly, including:
              </p>
              <ul className="list-disc list-inside text-white/80 space-y-2 mt-4">
                <li>Account information (name, email, username)</li>
                <li>Profile information (bio, profile picture)</li>
                <li>Content you create and share (posts, messages, photos)</li>
                <li>Device information and identifiers</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <p className="text-white/80">
                We use your information to provide, maintain, and improve our services, including to personalize your experience and communicate with you.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
              <p className="text-white/80">
                We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">5. Contact Us</h2>
              <p className="text-white/80">
                If you have questions about this Privacy Policy, please contact us at privacy@thesocialbook.com.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}