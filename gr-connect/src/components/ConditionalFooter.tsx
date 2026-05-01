"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <footer className="bg-charcoal text-cream-bg">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-warm-brown rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GR</span>
              </div>
              <span className="font-serif text-xl font-semibold text-cream-bg tracking-tight">Connect</span>
            </Link>
            <p className="text-sm text-cream-bg/60 leading-relaxed">
              The premier platform connecting researchers, academics, and industry experts for meaningful collaboration and global impact.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-cream-bg/40 mb-4">Platform</h4>
            <ul className="space-y-2.5">
              <li><Link href="/" className="text-sm text-cream-bg/70 hover:text-warm-brown transition-colors">Vision</Link></li>
              <li><Link href="/discover" className="text-sm text-cream-bg/70 hover:text-warm-brown transition-colors">Find Experts</Link></li>
              <li><Link href="/hub" className="text-sm text-cream-bg/70 hover:text-warm-brown transition-colors">Research Hub</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-cream-bg/40 mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-sm text-cream-bg/70 hover:text-warm-brown transition-colors">About</Link></li>
              <li><Link href="/privacy" className="text-sm text-cream-bg/70 hover:text-warm-brown transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-sm text-cream-bg/70 hover:text-warm-brown transition-colors">Terms</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-cream-bg/40 mb-4">Stay Connected</h4>
            <p className="text-sm text-cream-bg/60 mb-4">Join our community of 10,000+ researchers shaping the future of global collaboration.</p>
            <Link href="/signup" className="inline-block text-sm font-medium px-5 py-2 bg-warm-brown text-white rounded-full hover:bg-warm-brown-dark transition-colors">
              Get Started
            </Link>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 gap-4">
          <p className="text-xs text-cream-bg/40">&copy; {new Date().getFullYear()} GR Connect. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-xs text-cream-bg/40 hover:text-cream-bg/70 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-cream-bg/40 hover:text-cream-bg/70 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
