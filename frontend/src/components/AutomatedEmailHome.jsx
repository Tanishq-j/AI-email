import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ScrollAnimation } from "./ScrollAnimation";

// ==========================================
// INLINED SPOTLIGHT COMPONENT (Light Mode Adjusted)
// ==========================================
export const Spotlight = ({
    gradientFirst = "radial-gradient(50% 50% at 50% 50%, hsla(120, 100%, 20%, .20) 0, hsla(120, 100%, 10%, .08) 60%, hsla(120, 100%, 10%, 0) 100%)",
    gradientSecond = "radial-gradient(50% 50% at 50% 50%, hsla(120, 100%, 20%, .15) 0, hsla(120, 100%, 15%, .06) 60%, hsla(120, 100%, 15%, 0) 100%)",
    gradientThird = "radial-gradient(50% 50% at 50% 50%, hsla(120, 100%, 20%, .15) 0, hsla(120, 100%, 10%, .06) 60%, hsla(120, 100%, 10%, 0) 100%)",
    translateY = -350,
    width = 560,
    height = 1000,
    smallWidth = 240,
    duration = 7,
    xOffset = 100,
} = {}) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
            <motion.div
                animate={{ x: [0, xOffset, 0] }}
                transition={{ duration, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                className="absolute top-0 left-0 w-screen h-screen z-0 pointer-events-none">
                <div style={{ transform: `translateY(${translateY}px) rotate(-45deg)`, background: gradientFirst, width: `${width}px`, height: `${height}px` }} className="absolute top-0 left-0" />
                <div style={{ transform: "rotate(-45deg) translate(5%, -50%)", background: gradientSecond, width: `${smallWidth}px`, height: `${height}px` }} className="absolute top-0 left-0 origin-top-left" />
                <div style={{ transform: "rotate(-45deg) translate(-180%, -70%)", background: gradientThird, width: `${smallWidth}px`, height: `${height}px` }} className="absolute top-0 left-0 origin-top-left" />
            </motion.div>
            <motion.div
                animate={{ x: [0, -xOffset, 0] }}
                transition={{ duration, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                className="absolute top-0 right-0 w-screen h-screen z-0 pointer-events-none">
                <div style={{ transform: `translateY(${translateY}px) rotate(45deg)`, background: gradientFirst, width: `${width}px`, height: `${height}px` }} className="absolute top-0 right-0" />
                <div style={{ transform: "rotate(45deg) translate(-5%, -50%)", background: gradientSecond, width: `${smallWidth}px`, height: `${height}px` }} className="absolute top-0 right-0 origin-top-right" />
                <div style={{ transform: "rotate(45deg) translate(180%, -70%)", background: gradientThird, width: `${smallWidth}px`, height: `${height}px` }} className="absolute top-0 right-0 origin-top-right" />
            </motion.div>
        </motion.div>
    );
};

// ==========================================
// NAVBAR COMPONENT
// ==========================================
const Navbar = () => {
    return (
        <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md border-b border-neutral-200">
            <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
                
                {/* Left side: Logo & Navigation Options */}
                <div className="flex items-center gap-10">
                    {/* Logo (if /logo.png is missing, it will fallback to alt text) */}
                    <div className="flex items-center gap-2 cursor-pointer">
                        <img src="/logo.png" alt="" className="h-8 w-auto object-contain fallback-image" onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233A8F4A'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z'/%3E%3C/svg%3E"
                        }} />
                        <span className="font-bold text-xl text-neutral-900 tracking-tight">SoMail</span>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
                        <a href="#" className="hover:text-[#3A8F4A] transition-colors">Product</a>
                        <a href="#" className="hover:text-[#3A8F4A] transition-colors">About Us</a>
                        <a href="#pricing" className="hover:text-[#3A8F4A] transition-colors">Pricing</a>
                        <a href="#" className="hover:text-[#3A8F4A] transition-colors">Contact Us</a>
                    </div>
                </div>

                {/* Right side: Dashboard icon */}
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 hover:text-[#3A8F4A] hover:bg-neutral-100 rounded-lg transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Dashboard
                    </Link>
                    <a href="#pricing" className="hidden sm:inline-flex px-4 py-2 bg-[#3A8F4A] hover:bg-[#2b6d37] text-white text-sm font-semibold rounded-lg transition-colors">
                        Buy Plan
                    </a>
                </div>
            </div>
        </nav>
    );
};

// ==========================================
// INLINED MINIMAL PROFESSIONAL FOOTER (Light)
// ==========================================
const Footer = () => {
    return (
        <footer className="w-full py-10 px-8 border-t border-neutral-200 bg-white text-neutral-600">
            <div className="md:w-[80%] w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="" className="h-6 w-auto" onError={(e) => e.target.style.display='none'} />
                    <span className="text-neutral-900 font-bold text-xl tracking-tight">SoMail</span>
                </div>
                <div className="flex gap-8 md:text-[14px] text-[13px] font-medium">
                    <a href="#" className="hover:text-[#3A8F4A] transition-colors">Product</a>
                    <a href="#" className="hover:text-[#3A8F4A] transition-colors">About Us</a>
                    <a href="#pricing" className="hover:text-[#3A8F4A] transition-colors">Pricing</a>
                    <a href="#" className="hover:text-[#3A8F4A] transition-colors">Contact Us</a>
                </div>
                <div className="md:text-[14px] text-[13px]">
                    <p>&copy; {new Date().getFullYear()} SoMail. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

// ==========================================
// AUTOMATED EMAIL PROJECT LANDING PAGE (Light Theme)
// ==========================================
const AutomatedEmailHome = () => {
    // Icons for pricing sections
    const CheckIcon = () => (
        <svg className="w-4 h-4 text-neutral-500 mr-3 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    );

    const ProCheckIcon = () => (
        <svg className="w-4 h-4 text-white mr-3 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    );

    return (
        <div className="bg-white min-h-screen text-neutral-900 font-sans overflow-x-hidden selection:bg-[#3A8F4A] selection:text-white">
            <Navbar />
            
            {/* HERO SECTION */}
            <div className="relative md:min-h-screen min-h-[80vh] w-full flex flex-col items-center justify-center pt-24 pb-16 bg-[#F8F9FA] antialiased">
                <Spotlight />
                
                <div className="p-4 w-[90%] md:w-[70%] mx-auto relative z-10 flex flex-col items-center gap-8 text-center mt-10 md:mt-0">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/20 bg-green-50 text-[#2b6d37] text-sm font-semibold shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-[#3A8F4A] animate-pulse"></span>
                        Agentic Email Intelligence
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl lg:text-[80px] leading-tight font-bold tracking-tight text-neutral-900">
                        Don't just apply.<br /> 
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-[#3A8F4A]">Get SoHired.</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-neutral-600 max-w-2xl">
                        SoMail is your instant assistant that learns your writing voice, scores urgency, and automates your entire inbox without you having to explain a thing. Select a plan below to start supercharging your workflow.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                        <a href="#pricing" className="px-8 py-4 bg-[#3A8F4A] hover:bg-[#2b6d37] text-white rounded-lg font-bold text-lg transition-transform hover:-translate-y-1 shadow-md shadow-green-900/10">
                            See Pricing Options
                        </a>
                        <button className="px-8 py-4 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-lg font-bold text-lg transition-transform hover:-translate-y-1 shadow-sm">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>

            {/* SCROLL ANIMATION 3D SHOWCASE */}
            <div className="relative w-full z-20 bg-transparent flex justify-center items-center -mt-10 mb-10 overflow-visible">
                <ScrollAnimation
                    titleComponent={
                        <div className="mb-4">
                            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-neutral-900 leading-tight">
                                An inbox that acts as <br />
                                <span className="text-[#3A8F4A]">your brain extension.</span>
                            </h2>
                        </div>
                    }
                >
                    <div className="w-full h-full bg-[#fcfcfc] rounded-2xl overflow-hidden flex flex-col relative z-30">
                        {/* Windows/Mac mock header */}
                        <div className="h-12 w-full border-b border-neutral-200 bg-neutral-100/50 flex items-center px-4 gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="mx-auto px-4 py-1.5 bg-white border border-neutral-200 rounded-md text-xs font-medium text-neutral-500 shadow-sm">
                                somail.ai/inbox
                            </div>
                        </div>
                        
                        <div className="flex-1 w-full h-full">
                            <img
                                src="/Dino.PNG"
                                alt="Dashboard Interface"
                                height={720}
                                width={1400}
                                className="w-full h-full object-cover object-left-top"
                                draggable={false}
                            />
                        </div>
                    </div>
                </ScrollAnimation>
            </div>

            {/* FEATURES SECTION (Bento Box Layout) */}
            <div className="py-24 px-6 md:px-0 w-full max-w-[1200px] mx-auto bg-white">
                <div className="flex flex-col mb-16 px-4">
                    <h2 className="text-4xl md:text-5xl font-bold font-sans text-neutral-900">
                        Brain-like reasoning for your inbox.
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 px-4">
                    {/* Top Left - Huge Green Box */}
                    <div className="md:col-span-5 bg-[#3A8F4A] text-white p-8 md:p-10 rounded-3xl flex flex-col justify-end min-h-[340px] transform transition duration-500 hover:scale-[1.02] shadow-xl shadow-green-900/20">
                        <div className="mb-auto">
                            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-md inline-block tracking-wide">
                                Neural Urgency Scoring
                            </span>
                        </div>
                        <p className="text-xl md:text-2xl font-medium leading-[1.4] mt-6">
                            SoMail stops using "dumb" keyword filters and starts using brain-like reasoning. Every email gets a Priority Score (0.0–1.0) based on how critical it actually is. It spots a "Emergency" vs. a "Newsletter" with 98% accuracy, automatically sending high-priority alerts to Slack or Jira before you even open your phone.
                        </p>
                    </div>

                    {/* Top Right & Bottom Elements structured in columns */}
                    <div className="md:col-span-7 flex flex-col gap-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                            {/* Your Writing Voice */}
                            <div className="bg-[#F8F9FA] border border-neutral-200 p-8 rounded-3xl flex flex-col transform transition duration-500 hover:scale-[1.02] hover:shadow-md">
                                <div className="mb-4">
                                     <span className="bg-white text-neutral-700 border border-neutral-200 shadow-sm text-xs font-bold px-3 py-1.5 rounded-md inline-block">
                                        Your Writing Voice
                                    </span>
                                </div>
                                <p className="text-neutral-600 text-lg leading-relaxed font-medium mt-auto">
                                    Learns your specific writing style and professional tone from your last 50 emails to draft replies that actually sound exactly like you.
                                </p>
                            </div>

                            {/* Instant Assistant */}
                            <div className="bg-[#F8F9FA] border border-neutral-200 p-8 rounded-3xl flex flex-col transform transition duration-500 hover:scale-[1.02] hover:shadow-md">
                                <div className="mb-4">
                                    <span className="bg-white text-neutral-700 border border-neutral-200 shadow-sm text-xs font-bold px-3 py-1.5 rounded-md inline-block">
                                        Instant Assistant
                                    </span>
                                </div>
                                <p className="text-neutral-600 text-lg leading-relaxed font-medium mt-auto">
                                    A floating AI that knows exactly which page or chart you are looking at, giving you instant help without you having to explain anything.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                             {/* Smart Documents */}
                             <div className="bg-[#F8F9FA] border border-neutral-200 p-8 rounded-3xl flex flex-col transform transition duration-500 hover:scale-[1.02] hover:shadow-md">
                                <div className="mb-4">
                                    <span className="bg-white text-neutral-700 border border-neutral-200 shadow-sm text-xs font-bold px-3 py-1.5 rounded-md inline-block">
                                        Smart Documents
                                    </span>
                                </div>
                                <p className="text-neutral-600 text-lg leading-relaxed font-medium mt-auto">
                                    It "sees" inside your PDFs and images to find totals and dates, turning messy attachments into a searchable, organized library.
                                </p>
                            </div>

                            {/* Relationship Strategy */}
                            <div className="bg-[#F8F9FA] border border-neutral-200 p-8 rounded-3xl flex flex-col transform transition duration-500 hover:scale-[1.02] hover:shadow-md">
                                <div className="mb-4">
                                    <span className="bg-white text-neutral-700 border border-neutral-200 shadow-sm text-xs font-bold px-3 py-1.5 rounded-md inline-block">
                                        Relationship Strategy
                                    </span>
                                </div>
                                <p className="text-neutral-600 text-lg leading-relaxed font-medium mt-auto">
                                    Tracks your email history to show you which contacts are "heating up" or gaining momentum, so you never let a lead go cold.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PRICING SECTION - Specifically adapted for Light Theme */}
             <div id="pricing" className="py-24 bg-[#F8F9FA] text-neutral-900 border-t border-neutral-200">
                <div className="w-[90vw] md:w-[85vw] max-w-[1100px] mx-auto flex flex-col items-center">
                    <h2 className="text-[44px] md:text-[64px] font-bold text-center leading-tight tracking-tight text-neutral-900">
                        Pricing & Business(ROI)
                    </h2>
                    <p className="text-[17px] md:text-[19px] font-semibold text-center mt-3 max-w-2xl text-neutral-600">
                        If SoMail saves a senior manager just <span className="text-[#3A8F4A]">1 hour per week</span>, the <br className="hidden md:block" />
                        <span className="text-[#3A8F4A]">ROI is 1,200%</span> based on average executive hourly rates.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-16 w-full items-stretch">
                        
                        {/* Basic Plan */}
                        <div className="bg-white border border-neutral-200 shadow-sm p-8 rounded-[24px] flex flex-col transform transition-transform hover:-translate-y-1">
                            <h3 className="text-[24px] font-medium text-neutral-900">Basic</h3>
                            <div className="mt-4 mb-10 flex items-baseline gap-2">
                                <span className="text-[48px] font-bold text-neutral-900 leading-none">Rs. 0</span>
                                <span className="text-neutral-500 font-semibold text-[17px]">per month</span>
                            </div>
                            
                            <div className="text-neutral-400 font-medium mb-6 mt-auto">Features</div>
                            <ul className="flex flex-col gap-3.5 pb-4">
                                <li className="flex items-start"><CheckIcon /><span className="text-neutral-600 font-medium">Basic Email Categorization</span></li>
                                <li className="flex items-start"><CheckIcon /><span className="text-neutral-600 font-medium">Standard Slack Notifications</span></li>
                                <li className="flex items-start"><CheckIcon /><span className="text-neutral-600 font-medium">Basic Notion Sync</span></li>
                                <li className="flex items-start"><CheckIcon /><span className="text-neutral-600 font-medium">50 Automated Actions/month</span></li>
                            </ul>
                            <a href="#" className="mt-4 w-full py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl transition-colors text-center">
                                Get Basic
                            </a>
                        </div>

                        {/* Pro Plan */}
                        <div className="bg-[#3B4828] text-white p-8 rounded-[24px] flex flex-col shadow-2xl relative z-10 transform lg:scale-[1.08] transition-transform hover:-translate-y-1">
                            <h3 className="text-[24px] font-medium text-white">Pro</h3>
                            <div className="mt-4 mb-10 flex items-baseline gap-2">
                                <span className="text-[48px] font-bold leading-none">Rs. 899</span>
                                <span className="text-[#B4B9AC] font-semibold text-[17px]">per month</span>
                            </div>
                            
                            <div className="text-[#D4D6CF] font-medium mb-6 mt-auto">Everything in Basic, plus:</div>
                            <ul className="flex flex-col gap-3.5 pb-4">
                                <li className="flex items-start"><ProCheckIcon /><span className="font-medium text-[#E2E4DF]">10 AI Voice Alerts / month</span></li>
                                <li className="flex items-start"><ProCheckIcon /><span className="font-medium text-[#E2E4DF]">Google Calendar Auto-Scheduling</span></li>
                                <li className="flex items-start"><ProCheckIcon /><span className="font-medium text-[#E2E4DF]">Advanced Notion Auto-Logging</span></li>
                                <li className="flex items-start"><ProCheckIcon /><span className="font-medium text-[#E2E4DF]">Up to 500 Automated Actions</span></li>
                                <li className="flex items-start"><ProCheckIcon /><span className="font-medium text-[#E2E4DF]">Priority Email Support</span></li>
                            </ul>
                            <a href="#" className="mt-4 w-full py-3.5 bg-[#549E5F] hover:bg-[#468A50] text-white font-bold rounded-xl transition-colors text-center shadow-lg">
                                Buy Pro Plan
                            </a>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="bg-white border border-neutral-200 shadow-sm p-8 rounded-[24px] flex flex-col transform transition-transform hover:-translate-y-1">
                            <h3 className="text-[24px] font-medium text-neutral-900">Enterprise</h3>
                            <div className="mt-4 mb-10 flex items-baseline gap-2">
                                <span className="text-[48px] font-bold text-neutral-900 leading-none">Rs. 3,999</span>
                                <span className="text-neutral-500 font-semibold text-[17px]">per month</span>
                            </div>
                            
                            <div className="text-neutral-400 font-medium mb-6 mt-auto">Everything in Pro, plus:</div>
                            <ul className="flex flex-col gap-3.5 pb-4">
                                <li className="flex items-start"><CheckIcon /><span className="text-neutral-600 font-medium">Unlimited AI Voice Calls</span></li>
                                <li className="flex items-start"><CheckIcon /><span className="text-neutral-600 font-medium">Custom workflows</span></li>
                                <li className="flex items-start"><CheckIcon /><span className="text-neutral-600 font-medium">Advanced CRM Integrations</span></li>
                                <li className="flex items-start"><CheckIcon /><span className="text-neutral-600 font-medium">Any customizations on Plan</span></li>
                            </ul>
                            <a href="#" className="mt-4 w-full py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl transition-colors text-center">
                                Contact Sales
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* COMPACT FOOTER */}
            <Footer />
        </div>
    );
};

export default AutomatedEmailHome;
