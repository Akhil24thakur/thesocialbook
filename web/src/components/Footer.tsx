import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0F0B1C] border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold">SocialBook</span>
            </Link>
            <p className="text-white/60 max-w-md">
              Connect with friends, share moments, and discover content on SocialBook.
              Your social media experience, reimagined.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-white/60 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/download" className="text-white/60 hover:text-white transition-colors">
                  Download
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-white/60 hover:text-white transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-white/60 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-white/60 hover:text-white transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 text-center text-white/40">
          <p>&copy; {new Date().getFullYear()} SocialBook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}