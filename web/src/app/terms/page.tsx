export default function Terms() {
  return (
    <div className="pt-16">
      <section className="py-24 bg-[#0F0B1C]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-white/60 mb-6">Last updated: August 21, 2026</p>
          
          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-white/80">
                By accessing or using SocialBook, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">2. User Responsibilities</h2>
              <p className="text-white/80">
                You are responsible for your activity on SocialBook and must comply with our community guidelines. You must not:
              </p>
              <ul className="list-disc list-inside text-white/80 space-y-2 mt-4">
                <li>Post harmful, abusive, or illegal content</li>
                <li>Impersonate others or misrepresent your identity</li>
                <li>Spam or engage in unauthorized advertising</li>
                <li>Attempt to access other users' accounts</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">3. Content Ownership</h2>
              <p className="text-white/80">
                You retain ownership of the content you post on SocialBook. By posting content, you grant us a license to display and distribute it within the platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">4. Termination</h2>
              <p className="text-white/80">
                We reserve the right to suspend or terminate your account if you violate these terms or engage in behavior that harms our community.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">5. Contact</h2>
              <p className="text-white/80">
                For questions about these Terms, contact us at legal@thesocialbook.com.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}