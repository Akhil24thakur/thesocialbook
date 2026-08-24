"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0F0B1C]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-xl font-bold">SocialBook</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-white/80 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/features" className="text-white/80 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/about" className="text-white/80 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/support" className="text-white/80 hover:text-white transition-colors">
              Support
            </Link>
          </div>

          {/* Download Button */}
          <div className="hidden md:flex items-center space-x-4">
            <a
              href="#download"
              className="px-6 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-full text-white font-medium hover:opacity-90 transition-opacity"
            >
              Download App
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col space-y-4">
              <Link href="/" className="text-white/80 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/features" className="text-white/80 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/about" className="text-white/80 hover:text-white transition-colors">
                About
              </Link>
              <Link href="/support" className="text-white/80 hover:text-white transition-colors">
                Support
              </Link>
              <a
                href="#download"
                className="px-6 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-full text-white font-medium text-center hover:opacity-90 transition-opacity"
              >
                Download App
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}