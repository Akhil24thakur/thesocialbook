"use client";

import { useState } from "react";

export default function Support() {
  const [activeTab, setActiveTab] = useState<"faq" | "contact">("faq");
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const faqs = [
    {
      question: "How do I download SocialBook?",
      answer: "You can download SocialBook from our GitHub releases page for Android, or from the App Store for iOS. Visit our download page for direct links.",
    },
    {
      question: "Is SocialBook free to use?",
      answer: "Yes! SocialBook is completely free to download and use. We may offer optional premium features in the future, but the core experience will always be free.",
    },
    {
      question: "How do I reset my password?",
      answer: "You can reset your password from the login screen by tapping 'Forgot Password' and following the instructions sent to your email.",
    },
    {
      question: "How do I report a bug or issue?",
      answer: "You can report bugs through our contact form below, or by emailing support@thesocialbook.com. Please include your device type and app version.",
    },
    {
      question: "How do I delete my account?",
      answer: "You can delete your account from Settings > Account > Delete Account. This action is permanent and cannot be undone.",
    },
    {
      question: "Is my data safe on SocialBook?",
      answer: "Yes. We take privacy seriously. Your data is encrypted, we never sell personal information, and you have full control over your privacy settings.",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-br from-[#8B5CF6]/20 via-[#0F0B1C] to-[#EC4899]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Support</h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Need help? We're here for you. Check our FAQ or reach out to our team.
          </p>
        </div>
      </section>

      <section className="py-24 bg-[#0F0B1C]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-12 border-b border-white/10">
            <button
              onClick={() => setActiveTab("faq")}
              className={`pb-4 px-4 font-semibold transition-colors ${
                activeTab === "faq"
                  ? "text-white border-b-2 border-[#8B5CF6]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              FAQ
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`pb-4 px-4 font-semibold transition-colors ${
                activeTab === "contact"
                  ? "text-white border-b-2 border-[#8B5CF6]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Contact Us
            </button>
          </div>

          {/* FAQ Tab */}
          {activeTab === "faq" && (
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                  <p className="text-white/60">{faq.answer}</p>
                </div>
              ))}
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Message Sent!</h3>
                  <p className="text-white/60">
                    Thank you for reaching out. We'll get back to you within 24-48 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#8B5CF6] transition-colors"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#8B5CF6] transition-colors"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Subject</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#8B5CF6] transition-colors"
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#8B5CF6] transition-colors resize-none"
                      placeholder="Tell us more..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full px-8 py-4 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}