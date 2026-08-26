"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
}

const services: ServiceItem[] = [
  {
    id: "green-energy",
    title: "Green Energy Solutions",
    description: "Clean energy insights to help you adopt efficient, renewable systems.",
    image: "/images/service-green-energy.jpg",
    alt: "Green Energy Solar and Wind Solutions",
  },
  {
    id: "sustainability",
    title: "Sustainability Advisory",
    description: "Expert guidance to strengthen ESG performance and responsible practices.",
    image: "/images/service-sustainability.jpg",
    alt: "Sustainability Advisory Foliage",
  },
  {
    id: "net-zero",
    title: "Net-Zero Strategy",
    description: "Strategic planning to reduce emissions and guide long-term net-zero goals.",
    image: "/images/service-net-zero.jpg",
    alt: "Net-Zero Strategy Sustainable Architecture",
  },
  {
    id: "climate-assessment",
    title: "Climate Assessment",
    description: "Comprehensive analysis of climate risks to support resilient decisions.",
    image: "/images/service-climate.jpg",
    alt: "Climate Assessment Coastal Landscape",
  },
];

const brandLogos = [
  {
    id: "novio",
    content: (
      <div className="flex items-center gap-2 font-bold text-lg sm:text-xl tracking-tight text-zinc-500 hover:text-zinc-800 transition-colors">
        <span className="w-3 h-3 rounded-full bg-[#a855f7] inline-block shadow-sm"></span>
        <span>novio</span>
      </div>
    ),
  },
  {
    id: "zenzap",
    content: (
      <div className="flex items-center gap-1.5 font-bold text-lg sm:text-xl tracking-tight text-zinc-600 hover:text-zinc-900 transition-colors">
        <span className="text-[#eab308] text-lg font-normal">⚡</span>
        <span>ZenZap</span>
      </div>
    ),
  },
  {
    id: "sparkle",
    content: (
      <div className="flex items-center gap-1.5 font-bold text-lg sm:text-xl tracking-tight text-zinc-600 hover:text-zinc-900 transition-colors">
        <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
        </svg>
        <span>sparkle</span>
      </div>
    ),
  },
  {
    id: "lumlabs",
    content: (
      <div className="flex items-center gap-1.5 font-bold text-lg sm:text-xl tracking-tight text-zinc-600 hover:text-zinc-900 transition-colors">
        <span>Lum</span>
        <span className="bg-zinc-800 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md tracking-normal">
          Labs
        </span>
      </div>
    ),
  },
  {
    id: "pulse",
    content: (
      <div className="flex items-center gap-2 font-bold text-lg sm:text-xl tracking-tight text-zinc-600 hover:text-zinc-900 transition-colors">
        <div className="flex items-center gap-0.5">
          <span className="w-1 h-3.5 bg-[#ec4899] rounded-full"></span>
          <span className="w-1 h-4.5 bg-[#ec4899] rounded-full"></span>
          <span className="w-1 h-3.5 bg-[#ec4899] rounded-full"></span>
        </div>
        <span>Pulse</span>
      </div>
    ),
  },
  {
    id: "swift",
    content: (
      <div className="flex items-center font-extrabold italic text-lg sm:text-xl text-[#4f46e5] hover:text-[#4338ca] transition-colors">
        <span>swift&gt;</span>
      </div>
    ),
  },
  {
    id: "innovio",
    content: (
      <div className="flex items-center gap-1.5 font-bold text-lg sm:text-xl tracking-tight text-zinc-500 hover:text-zinc-800 transition-colors">
        <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M4 16C4 10.4772 8.47715 6 14 6C16.5 6 18.5 7 20 8.5" />
        </svg>
        <span>innovio</span>
      </div>
    ),
  },
];

const missionStatement = "Our mission is to support forward thinking organizations with sustainability consulting, climate focused strategies, and actionable insights that strengthen resilience, accelerate transformation, and create a more responsible future for people and planet.";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const missionTextRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Smooth Scroll with Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // Create preloader timeline
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" }
      });

      // 1. Reveal preloader logo and text
      tl.to(".preloader-logo", {
        y: 0,
        duration: 0.8,
        ease: "power4.out",
      });

      tl.to(".preloader-text", {
        y: 0,
        duration: 0.8,
        ease: "power4.out",
      }, "-=0.6");

      // 2. Animate the accent progress line
      tl.to(".preloader-bar", {
        scaleX: 1,
        duration: 1.1,
        ease: "power2.inOut",
      }, "-=0.4");

      // 3. Slide the entire preloader panel upward out of screen
      tl.to(".preloader-panel", {
        yPercent: -100,
        duration: 1.1,
        ease: "expo.inOut",
      }, "+=0.2");
      
      tl.set(".preloader-panel", { display: "none" });

      // 4. Staggered Hero Section Entrance
      tl.from(".hero-header", {
        opacity: 0,
        y: -30,
        duration: 0.8,
        ease: "power3.out",
      }, "-=0.6");

      tl.from(".hero-headline", {
        opacity: 0,
        y: 40,
        duration: 1.0,
        ease: "power4.out",
      }, "-=0.6");

      tl.from(".hero-copy", {
        opacity: 0,
        y: 25,
        duration: 0.8,
        ease: "power3.out",
      }, "-=0.7");

      tl.from(".hero-image-card", {
        opacity: 0,
        scale: 0.95,
        y: 35,
        duration: 1.1,
        ease: "power3.out",
      }, "-=0.8");

      // 2. Introduction Reading Text Scrub Reveal
      const wordElements = gsap.utils.toArray<HTMLElement>(".mission-word");
      if (wordElements.length > 0) {
        gsap.to(wordElements, {
          color: "#09090b", // Transitions from muted grey (#cbd5e1) to rich black (#09090b)
          stagger: 0.1,
          scrollTrigger: {
            trigger: missionTextRef.current,
            start: "top 80%",
            end: "bottom 45%",
            scrub: 1.2,
          },
        });
      }

      // 3. Stats Stagger Entrance
      gsap.from(".stat-item", {
        opacity: 0,
        y: 25,
        stagger: 0.15,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".stats-container",
          start: "top 85%",
        },
      });

      // 4. Services Section Entrance
      gsap.from(".service-header", {
        opacity: 0,
        y: 30,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#services",
          start: "top 80%",
        },
      });

      // 5. Footer "LET'S WORK" Gentle Parallax Entrance
      gsap.from(".footer-big-text", {
        opacity: 0.4,
        y: "40%",
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#contact",
          start: "top 85%",
          scrub: 1.5,
        },
      });
    }, containerRef);

    return () => {
      ctx.revert();
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
    };
  }, []);

  const words = missionStatement.split(" ");

  return (
    <div ref={containerRef} className="min-h-screen bg-white text-zinc-900 selection:bg-[#bef238] selection:text-[#0e3b2e]">
      {/* ------------------------------------------------------------- */}
      {/* PRELOADER INTRO COVER                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="preloader-panel fixed inset-0 z-[9999] bg-[#114234] flex flex-col items-center justify-center select-none overflow-hidden">
        <div className="flex flex-col items-center text-center">
          {/* Logo with clipping mask */}
          <div className="overflow-hidden mb-3 h-16 w-16 relative">
            <Image
              src="/images/logosiputih.png"
              alt="Studioin"
              width={64}
              height={64}
              className="preloader-logo w-full h-full object-contain translate-y-full"
              priority
            />
          </div>
          {/* Text with clipping mask */}
          <div className="overflow-hidden py-1">
            <span className="preloader-text text-white font-extrabold text-2xl tracking-[0.25em] uppercase translate-y-full block">
              STUDIOIN
            </span>
          </div>
          {/* Accent Line Progress */}
          <div className="w-32 h-[3px] bg-emerald-950 rounded-full mt-5 overflow-hidden relative">
            <div className="preloader-bar absolute top-0 left-0 h-full w-full bg-[#bef238] origin-left scale-x-0" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: Full Screen Green Hero Container                  */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#114234] text-white">
        <section className="min-h-screen w-full flex flex-col justify-between px-5 sm:px-8 md:px-12 lg:px-16 py-6 sm:py-8 lg:py-10 max-w-[1560px] mx-auto">
          
          {/* Navigation Bar */}
          <header className="hero-header flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <Image
                  src="/images/logosiputih.png"
                  alt="Studioin"
                  width={36}
                  height={36}
                  className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
                  priority
                />
              </div>
              <span className="text-white text-xl sm:text-2xl font-bold tracking-tight">
                Studioin
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-10 text-[15px] font-medium">
              <Link
                href="#campaigns"
                className="text-[#d5e5dd] hover:text-white transition-colors duration-150"
              >
                Campaigns
              </Link>
              <Link
                href="#about"
                className="text-[#d5e5dd] hover:text-white transition-colors duration-150"
              >
                About Us
              </Link>
              <Link
                href="#how-it-works"
                className="text-[#d5e5dd] hover:text-white transition-colors duration-150"
              >
                How It Works
              </Link>
              <Link
                href="#services"
                className="text-[#d5e5dd] hover:text-white transition-colors duration-150"
              >
                Resources
              </Link>
              <Link
                href="#contact"
                className="text-[#bef238] font-semibold hover:text-[#d3f95e] transition-colors duration-150"
              >
                Contact
              </Link>
            </nav>

            {/* Top CTA Button & Mobile Toggle */}
            <div className="flex items-center gap-3">
              <Link
                href="#contact"
                className="group hidden sm:inline-flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full border border-[#2b6553] bg-[#0e372b]/60 hover:bg-[#154e3d] hover:border-[#387e68] transition-all duration-200 text-[14px] font-medium text-white shadow-sm"
              >
                <span>Get started</span>
                <span className="w-6 h-6 rounded-full bg-[#bef238] text-[#114234] flex items-center justify-center transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="6" y1="18" x2="18" y2="6"></line>
                    <polyline points="9 6 18 6 18 15"></polyline>
                  </svg>
                </span>
              </Link>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/40 focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </header>

          {/* Mobile Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden flex flex-col gap-3 pt-5 pb-5 border-t border-emerald-800/40 mt-3 text-[15px] font-medium">
              <Link href="#campaigns" className="text-emerald-100 hover:text-white py-1">Campaigns</Link>
              <Link href="#about" className="text-emerald-100 hover:text-white py-1">About Us</Link>
              <Link href="#how-it-works" className="text-emerald-100 hover:text-white py-1">How It Works</Link>
              <Link href="#services" className="text-emerald-100 hover:text-white py-1">Resources</Link>
              <Link href="#contact" className="text-[#bef238] font-semibold py-1">Contact</Link>
              <Link
                href="#contact"
                className="inline-flex items-center justify-between px-4 py-2.5 rounded-full bg-[#bef238] text-[#114234] font-semibold mt-2"
              >
                <span>Get started</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="6" y1="18" x2="18" y2="6"></line>
                  <polyline points="9 6 18 6 18 15"></polyline>
                </svg>
              </Link>
            </div>
          )}

          {/* Hero Headline & Subtext Content */}
          <div className="pt-8 sm:pt-10 md:pt-12 pb-6 sm:pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10">
            {/* Left: Giant Bold Headline */}
            <div className="hero-headline flex-1 max-w-full lg:max-w-3xl">
              <h1 className="text-[36px] xs:text-[42px] sm:text-5xl md:text-[54px] lg:text-[62px] xl:text-[70px] font-extrabold tracking-[-0.035em] text-white leading-[1.06]">
                <span className="block">Impact</span>
                <span className="block whitespace-nowrap">Through Creativity</span>
              </h1>
            </div>

            {/* Right: Copy & CTA Button */}
            <div className="hero-copy flex flex-col items-start md:items-end text-left md:text-right gap-5 md:gap-6 max-w-[420px]">
              <p className="text-[#d2e4dc] text-[15px] sm:text-base md:text-[16px] leading-relaxed font-normal">
                Every act of creativity brings innovation, design, and inspiration to professional teams and creators who need it most.
              </p>

              <Link
                href="#contact"
                className="group inline-flex items-center gap-3 bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-bold text-[15px] sm:text-base pl-6 pr-2.5 py-2.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lime-500/20 active:scale-98"
              >
                <span>Create Now</span>
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#114234] text-[#bef238] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                  <svg
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </span>
              </Link>
            </div>
          </div>

          {/* Hero Featured Media Card */}
          <div className="hero-image-card relative w-full h-[260px] sm:h-[340px] md:h-[390px] lg:h-[430px] rounded-[18px] sm:rounded-[26px] md:rounded-[30px] overflow-hidden shadow-2xl bg-[#09261f]">
            <Image
              src="/images/hero-photoshoot.jpg"
              alt="Studio photoshoot session with professional photographer and model"
              fill
              priority
              className="object-cover object-[center_35%] hover:scale-[1.015] transition-transform duration-700 ease-out"
              sizes="(max-width: 1560px) 100vw, 1560px"
            />
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Seamless Continuous Marquee Brand Partner Slider             */}
      {/* ------------------------------------------------------------- */}
      <section className="w-full bg-white text-zinc-600 pt-16 sm:pt-20 md:pt-24 pb-14 sm:pb-16 border-b border-zinc-100 overflow-hidden relative">
        {/* Soft edge gradient masks for cinematic fade */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Infinite Slider Track */}
        <div className="animate-marquee flex items-center gap-12 sm:gap-16 md:gap-20">
          {/* Repeat set 1 */}
          <div className="flex items-center gap-12 sm:gap-16 md:gap-20 shrink-0">
            {brandLogos.map((brand) => (
              <div key={`brand-1-${brand.id}`} className="shrink-0 cursor-pointer">
                {brand.content}
              </div>
            ))}
          </div>

          {/* Repeat set 2 for seamless loop */}
          <div className="flex items-center gap-12 sm:gap-16 md:gap-20 shrink-0" aria-hidden="true">
            {brandLogos.map((brand) => (
              <div key={`brand-2-${brand.id}`} className="shrink-0 cursor-pointer">
                {brand.content}
              </div>
            ))}
          </div>

          {/* Repeat set 3 */}
          <div className="flex items-center gap-12 sm:gap-16 md:gap-20 shrink-0" aria-hidden="true">
            {brandLogos.map((brand) => (
              <div key={`brand-3-${brand.id}`} className="shrink-0 cursor-pointer">
                {brand.content}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: Introduction / Mission & Statistics Section       */}
      {/* ------------------------------------------------------------- */}
      <section id="about" className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 py-16 sm:py-24 lg:py-28 border-b border-zinc-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-stretch">
          
          {/* Left Column: Image that matches top & bottom bounds of text */}
          <div className="lg:col-span-5 flex">
            <div className="relative w-full min-h-[340px] sm:min-h-[420px] lg:min-h-full rounded-[24px] sm:rounded-[32px] md:rounded-[36px] overflow-hidden shadow-xl bg-zinc-100">
              <Image
                src="/images/mission-team.jpg"
                alt="Studioin team strategy and creative session"
                fill
                priority
                className="object-cover object-center hover:scale-[1.02] transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </div>

          {/* Right Column: Introduction Badge, Mission Statement & Stats */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-8 sm:gap-12">
            
            {/* Top Area: Badge & Mission Statement */}
            <div>
              {/* Badge */}
              <div className="mb-6 sm:mb-8">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full border border-zinc-200 text-zinc-600 text-xs font-semibold tracking-wider uppercase bg-zinc-50/50">
                  Introduction
                </span>
              </div>

              {/* Scroll-Triggered Reading Scrub Reveal Mission Text */}
              <h2 ref={missionTextRef} className="text-[26px] sm:text-[32px] md:text-[38px] lg:text-[38px] xl:text-[42px] font-bold tracking-[-0.025em] leading-[1.24]">
                {words.map((word, i) => (
                  <span
                    key={`word-${i}`}
                    className="mission-word text-[#cbd5e1] inline-block mr-2"
                  >
                    {word}
                  </span>
                ))}
              </h2>
            </div>

            {/* Bottom Area: Key Metrics / Stats */}
            <div className="stats-container grid grid-cols-3 gap-4 sm:gap-8 pt-4">
              {/* Stat 1 */}
              <div className="stat-item border-l-[2.5px] sm:border-l-[3px] border-[#bef238] pl-3.5 sm:pl-4">
                <span className="block text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-zinc-950 tracking-tight leading-none">
                  10+
                </span>
                <span className="block text-zinc-500 text-xs sm:text-[13px] font-medium leading-snug mt-2">
                  Years of Meaningful Impact
                </span>
              </div>

              {/* Stat 2 */}
              <div className="stat-item border-l-[2.5px] sm:border-l-[3px] border-[#bef238] pl-3.5 sm:pl-4">
                <span className="block text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-zinc-950 tracking-tight leading-none">
                  90+
                </span>
                <span className="block text-zinc-500 text-xs sm:text-[13px] font-medium leading-snug mt-2">
                  Successful Global Projects
                </span>
              </div>

              {/* Stat 3 */}
              <div className="stat-item border-l-[2.5px] sm:border-l-[3px] border-[#bef238] pl-3.5 sm:pl-4">
                <span className="block text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-zinc-950 tracking-tight leading-none">
                  40+
                </span>
                <span className="block text-zinc-500 text-xs sm:text-[13px] font-medium leading-snug mt-2">
                  Trusted Global Partners
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: Interactive Professional Creative Services         */}
      {/* ------------------------------------------------------------- */}
      <section id="services" className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 py-16 sm:py-24 lg:py-28">
        
        {/* Section Header */}
        <div className="service-header text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full border border-zinc-200 text-zinc-600 text-xs font-semibold tracking-wider uppercase bg-zinc-50/50 mb-4">
            Service
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-950 tracking-tight">
            Professional Creative Services
          </h2>
          <p className="text-zinc-500 text-sm sm:text-base leading-relaxed mt-3.5 max-w-2xl mx-auto">
            Discover tailored creative solutions designed to strengthen your brand strategy, reduce environmental impact, and support growth with actionable insights.
          </p>
        </div>

        {/* Interactive Services List Container */}
        <div className="relative border-t border-zinc-200">
          
          {services.map((service, index) => {
            const isActive = activeService === index;

            return (
              <div
                key={service.id}
                onClick={() => setActiveService(index)}
                className={`relative group cursor-pointer transition-all duration-300 border-b border-zinc-200 px-6 sm:px-10 py-7 sm:py-9 flex items-center justify-between ${
                  isActive ? "bg-[#bef238] shadow-sm" : "bg-white hover:bg-zinc-50/80"
                }`}
              >
                {/* Text Content */}
                <div className="flex-1 pr-6 sm:pr-10 z-10">
                  <h3
                    className={`text-xl sm:text-2xl md:text-[26px] font-bold tracking-tight transition-colors duration-200 ${
                      isActive ? "text-zinc-950" : "text-zinc-900 group-hover:text-zinc-950"
                    }`}
                  >
                    {service.title}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm md:text-[15px] mt-1.5 max-w-xl transition-colors duration-200 ${
                      isActive ? "text-zinc-800" : "text-zinc-500"
                    }`}
                  >
                    {service.description}
                  </p>
                </div>

                {/* Right Arrow Icon */}
                <div className="flex items-center gap-4 z-10 shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-200 ${
                      isActive ? "text-zinc-950 scale-110" : "text-zinc-400 group-hover:text-zinc-800 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="7" y1="17" x2="17" y2="7"></line>
                      <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Floating Active Image Preview Card */}
                {isActive && (
                  <div className="hidden lg:block absolute right-24 top-1/2 -translate-y-1/2 w-[280px] xl:w-[320px] h-[190px] xl:h-[210px] rounded-[20px] overflow-hidden shadow-2xl z-20 pointer-events-none border-2 border-white animate-fadeIn">
                    <Image
                      src={service.image}
                      alt={service.alt}
                      fill
                      priority
                      className="object-cover object-center"
                      sizes="320px"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Mobile Image Preview for Active Tab */}
          <div className="lg:hidden mt-6 rounded-[20px] overflow-hidden shadow-lg aspect-[16/10] relative">
            <Image
              src={services[activeService].image}
              alt={services[activeService].alt}
              fill
              priority
              className="object-cover object-center transition-all duration-500"
              sizes="100vw"
            />
          </div>

        </div>

      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 4: Footer with Hero Color & Half-Submerged Typography  */}
      {/* ------------------------------------------------------------- */}
      <footer id="contact" className="w-full bg-[#114234] text-white pt-10 sm:pt-12 lg:pt-14 overflow-hidden relative selection:bg-[#bef238] selection:text-[#114234]">
        
        {/* Subtle center radial ambient highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_rgba(255,255,255,0.06)_0%,_transparent_65%)] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 relative z-10">
          
          {/* Top Footer Grid: Contact, Main Callout & Locations */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start justify-between">
            
            {/* Left: Contact Info */}
            <div className="md:col-span-3">
              <span className="block text-xs font-semibold uppercase tracking-widest text-[#bef238] mb-2">
                Contact
              </span>
              <a
                href="mailto:Hi@studioin.com"
                className="block text-base sm:text-lg font-bold hover:text-[#bef238] transition-colors duration-150"
              >
                Hi@studioin.com
              </a>
              <a
                href="tel:+6282159495854"
                className="block text-base sm:text-lg font-bold mt-1 hover:text-[#bef238] transition-colors duration-150"
              >
                +62821-5949-5854
              </a>
            </div>

            {/* Center: Main Heading & CTA Button */}
            <div className="md:col-span-6 text-center flex flex-col items-center">
              <h3 className="text-xl sm:text-2xl md:text-[28px] font-extrabold tracking-tight leading-snug max-w-md">
                Got a project? Want to collaborate?
              </h3>

              <Link
                href="mailto:Hi@studioin.com"
                className="group mt-4 inline-flex items-center gap-2 bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-bold text-xs sm:text-sm px-6 py-2.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lime-500/20 active:scale-95"
              >
                <span>Discuss your project</span>
                <svg
                  className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>

            {/* Right: Locations */}
            <div className="md:col-span-3 text-left md:text-right space-y-4">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-widest text-[#bef238] mb-1">
                  Indonesia
                </span>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                  Jln. Bambu No. 375<br />
                  Samarinda, Kalimantan Timur
                </p>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-widest text-[#bef238] mb-1">
                  Hong Kong
                </span>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                  60 Ya Fung Sung<br />
                  San Tsuen, 75129
                </p>
              </div>
            </div>

          </div>

          {/* Divider Line */}
          <div className="border-t border-emerald-800/60 my-6 sm:my-8" />

          {/* Middle Meta Info: Copyright, Terms, Social Icons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-300 pb-2 sm:pb-3">
            <div>
              <p>© Copyright 2026. Studioin. All rights reserved.</p>
            </div>

            <div>
              <Link href="#terms" className="hover:text-white transition-colors">
                Terms & Conditions
              </Link>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3.5 text-zinc-300">
              {/* Globe */}
              <Link href="#" className="hover:text-[#bef238] transition-colors p-1" aria-label="Website">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
              </Link>
              {/* Instagram */}
              <Link href="#" className="hover:text-[#bef238] transition-colors p-1" aria-label="Instagram">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </Link>
              {/* Users / Community */}
              <Link href="#" className="hover:text-[#bef238] transition-colors p-1" aria-label="Community">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </Link>
            </div>
          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* Compact Moderately-Submerged Typography "LET'S WORK"          */}
        {/* ------------------------------------------------------------- */}
        <div className="w-full overflow-hidden flex justify-center select-none pointer-events-none pt-2 sm:pt-4">
          <h2 className="footer-big-text text-[9.5vw] sm:text-[10vw] md:text-[10.5vw] font-black tracking-[0.14em] sm:tracking-[0.18em] text-black uppercase leading-none translate-y-[20%] text-center whitespace-nowrap drop-shadow-sm">
            LET&apos;S WORK
          </h2>
        </div>

      </footer>
    </div>
  );
}
