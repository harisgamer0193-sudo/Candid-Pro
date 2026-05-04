import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Camera, Copy, Check, Trash2, Sparkles, Sliders, Info, Zap, Image as ImageIcon, Loader2, Upload, Scan, Globe, Shield, Sun, Moon, Command, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { cn } from './lib/utils';
import { analyzeImage } from './services/aiService';

const SETTINGS_SUFFIX = "raw photo, realistic candid natural amateur snapshot, 8k resolution, highly detailed texture, Captured on iPhone 16 Pro, 24mm lens f/8, background in focus, natural hard shadows, flash photography, subtle lens flare, tiny imperfections, everyday aesthetic, slight JPEG artifacts, unpolished look, unedited, realistic skin tones, realistic textures, grainy snapshot, random positioning, unposed, Nano Banana hyper-realism.";

const EXAMPLES = [
  "A slightly messy kitchen table with a half-eaten dry toast on a plastic plate, a crushed soda can next to it, harsh overhead kitchen light.",
  "An average person standing in line at a grocery store, wearing a generic grey hoodie, fluorescent lighting, blurry people in the background, realistic skin texture.",
  "Interior of a cluttered car dashboard with loose coins, a charging cable, and a dusty windshield, bright daylight outside.",
  "A mirror selfie in a dimly lit public bathroom, fingerprints on the mirror, flash reflecting off the glass, low quality smartphone camera vibe.",
];

// Placeholder "candid" style background images
const BG_IMAGES = [
  "https://images.unsplash.com/photo-1543332164-6e82f355badc?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516733968668-dbdce39c46ef?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520170350707-b2da59970118?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?q=80&w=600&auto=format&fit=crop",
];

const BackgroundGrid = ({ isDark }: { isDark: boolean }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const x = useTransform(springX, [-500, 500], [20, -20]);
  const y = useTransform(springY, [-500, 500], [20, -20]);

  return (
    <motion.div 
      style={{ x, y }}
      className="fixed inset-0 -z-10 overflow-hidden opacity-20 pointer-events-none"
    >
      <div className={cn(
        "absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-transparent",
        isDark ? "from-[#030303] to-[#030303]" : "from-[#f8f9fa] to-[#f8f9fa]"
      )} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 grayscale opacity-40">
        {BG_IMAGES.map((src, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="aspect-[4/5] rounded-xl overflow-hidden border border-black/5 dark:border-white/5"
          >
            <img src={src} alt="" className="w-full h-full object-cover" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const MagneticButton = ({ children, className, onClick, disabled }: { children: React.ReactNode, className?: string, onClick?: () => void, disabled?: boolean }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 15, stiffness: 150 });
  const springY = useSpring(y, { damping: 15, stiffness: 150 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * 0.3);
    y.set((clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

export default function App() {
  const [description, setDescription] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const statusMessages = [
    "Initializing neural core...",
    "Scanning photonic data...",
    "Calibrating lens parameters...",
    "Reconstructing scene lighting...",
    "Detecting raw textures...",
    "Evaluating background clutter...",
    "Finalizing raw description..."
  ];

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      let i = 0;
      setAnalysisStatus(statusMessages[0]);
      interval = setInterval(() => {
        i = (i + 1) % statusMessages.length;
        setAnalysisStatus(statusMessages[i]);
      }, 1000);
    } else {
      setAnalysisStatus("");
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);
  const [isDark, setIsDark] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme Sync
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDeep = !isDark;
    setIsDark(newDeep);
    if (newDeep) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const triggerFlash = () => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 400);
  };

  const handleGenerate = useCallback(() => {
    if (!description.trim()) return;
    
    setIsGenerating(true);
    triggerFlash();
    
    setTimeout(() => {
      let prompt = `${description.trim()}. ${SETTINGS_SUFFIX}`;
      if (negativePrompt.trim()) {
        prompt += ` --no ${negativePrompt.trim()}`;
      }
      setGeneratedPrompt(prompt);
      setIsGenerating(false);
    }, 600);
  }, [description, negativePrompt]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setIsAnalyzing(true);
      
      try {
        const base64Data = base64.split(',')[1];
        const rawDescription = await analyzeImage(base64Data, file.type, negativePrompt);
        setDescription(rawDescription);
        let finalPrompt = `${rawDescription.trim()}. ${SETTINGS_SUFFIX}`;
        if (negativePrompt.trim()) {
          finalPrompt += ` --no ${negativePrompt.trim()}`;
        }
        setGeneratedPrompt(finalPrompt);
        triggerFlash();
      } catch (error) {
        console.error("Analysis failed:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleImageUpload({ target: fileInputRef.current } as any);
      }
    }
  };

  const handleCopy = useCallback(() => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedPrompt]);

  const handleClear = () => {
    setDescription('');
    setGeneratedPrompt('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const setExample = (example: string) => {
    setDescription(example);
    setGeneratedPrompt('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate]);

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#FFD700] selection:text-black p-4 md:p-12 flex flex-col items-center overflow-x-hidden transition-colors duration-500">
      <BackgroundGrid isDark={isDark} />
      
      <AnimatePresence>
        {showFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="w-full max-w-5xl flex flex-col gap-10">
        
        {/* Navigation */}
          <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between py-5 px-8 glass rounded-[2rem] border border-black/10 dark:border-white/10"
        >
          <div className="flex items-center gap-4 group">
            <motion.div 
              whileHover={{ rotate: 90, scale: 1.1, backgroundColor: "black", color: "#FFD700" }}
              transition={{ type: "spring", stiffness: 400 }}
              className="w-10 h-10 rounded-2xl bg-[#FFD700] flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all"
            >
              <Camera className="w-5 h-5 transition-colors" />
            </motion.div>
            <div className="flex flex-col">
              <motion.span 
                initial={{ letterSpacing: "0em" }}
                whileHover={{ letterSpacing: "0.1em" }}
                className="font-bold tracking-tighter text-xl leading-none text-[var(--text-primary)] cursor-default"
              >
                LUMEN NANO
              </motion.span>
              <span className="text-[8px] font-mono tracking-[0.4em] text-[var(--text-secondary)] uppercase">PRO PHOTOGRAPHY</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-10 text-[9px] uppercase tracking-[0.3em] font-mono text-[var(--text-secondary)]">
            <motion.div whileHover={{ x: 5 }} className="group flex items-center gap-2 cursor-help transition-colors hover:text-[var(--text-primary)]">
              <Globe className="w-3 h-3 text-[#FFD700]" /> GLOBAL ENGINE
            </motion.div>
            <motion.div whileHover={{ x: 5 }} className="group flex items-center gap-2 cursor-help transition-colors hover:text-[var(--text-primary)]">
              <Shield className="w-3 h-3 text-[#FFD700]" /> RAW INTEGRITY
            </motion.div>
            <motion.div whileHover={{ x: 5 }} className="group flex items-center gap-2 cursor-help transition-colors hover:text-[var(--text-primary)]">
              <Zap className="w-3 h-3 text-[#FFD700]" /> AUTO LENS
            </motion.div>
          </div>

          <div className="flex items-center gap-4">
            <MagneticButton
              onClick={toggleTheme}
              className="p-3 rounded-2xl glass hover:bg-[#FFD700]/10 transition-all border border-black/5 dark:border-white/10 text-[var(--text-primary)]"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </MagneticButton>
            <motion.div 
              whileHover={{ scale: 1.05, background: "rgba(255, 215, 0, 0.1)" }}
              className="px-5 py-2 glass-gold rounded-full text-[10px] font-bold text-[#FFD700] uppercase tracking-widest border border-[#FFD700]/20 hidden sm:block"
            >
              ENTERPRISE v2.0
            </motion.div>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <header className="flex flex-col gap-6 text-center md:text-left mt-10 md:mt-16 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-10 -left-10 w-40 h-40 bg-[#FFD700]/10 blur-[100px] pointer-events-none"
          />
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-6xl md:text-9xl font-bold tracking-tighter leading-[0.85] uppercase text-[var(--text-primary)]"
          >
            UNFILTERED <br /> 
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-transparent border-t-2 border-b-2 border-[#FFD700]/20 inline-block py-2 bg-clip-text bg-gradient-to-r from-[#FFD700] to-[var(--text-primary)]"
            >
                REALITY
            </motion.span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-[var(--text-secondary)] max-w-2xl font-light leading-relaxed"
          >
            The world doesn't need more filters. Lumen Nano engineers precision prompts for raw, candid, unpolished photography.
          </motion.p>
        </header>

        {/* Main Interface Wrapper */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative group/interface"
        >
          {/* Decorative accents */}
          <div className="absolute -inset-2 bg-gradient-to-r from-[#FFD700]/10 to-transparent blur-3xl opacity-0 group-hover/interface:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          
          <section className="relative glass rounded-[3rem] overflow-hidden border border-black/10 dark:border-white/10 shadow-[0_48px_96px_rgba(0,0,0,0.05)] dark:shadow-[0_48px_96px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="p-8 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/5 flex items-center justify-between px-12 py-8">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20">
                  <Scan className="w-5 h-5 text-[#FFD700]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFD700]">Lens Input</span>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest">Awaiting spatial description...</span>
                </div>
              </div>
              <MagneticButton 
                onClick={handleClear}
                className="group p-3 rounded-2xl hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
              >
                <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </MagneticButton>
            </div>
            
            <div className="p-10 flex flex-col lg:flex-row gap-12">
              <div className="flex-1 flex flex-col gap-10">
                <motion.div
                   initial={false}
                   animate={{ opacity: isGenerating ? 0.3 : 1 }}
                >
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe a messy kitchen, a crowded station, or a blurry mirror selfie..."
                    className="w-full h-40 bg-transparent border-none outline-none resize-none text-3xl font-light tracking-tight leading-tight placeholder:text-black/5 dark:placeholder:text-white/5 focus:ring-0 custom-scrollbar text-[var(--text-primary)]"
                  />
                </motion.div>

                {/* Negative Prompt Field */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4 mt-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-red-500/60 uppercase tracking-[0.4em]">Negative Constraints</span>
                    <div className="flex-1 h-px bg-red-500/5" />
                  </div>
                  <div className="relative group/negative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-red-500/30 group-focus-within/negative:text-red-500/60 transition-colors">
                      <Zap className="w-3 h-3" />
                    </div>
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="EXCLUDE: blur, people, saturation, bright light..."
                      className="w-full bg-red-500/[0.02] border border-red-500/10 hover:border-red-500/20 focus:border-red-500/40 rounded-xl py-3 pl-10 pr-4 text-xs font-mono text-[var(--text-primary)] transition-all outline-none"
                    />
                  </div>
                </motion.div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-40 uppercase tracking-[0.4em]">QUICK CALIBRATION</span>
                    <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((ex, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.05, backgroundColor: "var(--bg-secondary)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setExample(ex)}
                        className="px-5 py-2.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all backdrop-blur-sm"
                      >
                        {ex.slice(0, 30)}...
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-80 shrink-0">
                <label 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className={cn(
                    "relative cursor-pointer group flex flex-col items-center justify-center aspect-square md:aspect-auto lg:h-full min-h-[300px] rounded-[2.5rem] border-2 border-dashed transition-all duration-500 overflow-hidden",
                    selectedImage ? "border-[#FFD700] ring-[12px] ring-[#FFD700]/5" : "border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden" 
                  />
                  
                  <AnimatePresence mode="wait">
                    {isAnalyzing ? (
                      <motion.div 
                        key="analyzing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-6"
                      >
                        <div className="relative">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="w-16 h-16 rounded-full border-t-2 border-b-2 border-transparent border-l-2 border-r-2 border-l-[#FFD700] border-r-[#FFD700]/20"
                          />
                          <Zap className="absolute inset-0 m-auto w-6 h-6 text-[#FFD700] animate-pulse" />
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] font-bold text-[#FFD700] uppercase tracking-[0.4em] block mb-1">Scanning</span>
                          <span className="text-[8px] font-mono text-[var(--text-secondary)] uppercase">Analyzing Photons...</span>
                        </div>
                      </motion.div>
                    ) : selectedImage ? (
                      <motion.div 
                        key="preview"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full h-full relative"
                      >
                        <img src={selectedImage} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-[3s]" />
                        {isAnalyzing && (
                          <>
                            <motion.div 
                              initial={{ top: "0%" }}
                              animate={{ top: "100%" }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="absolute left-0 right-0 h-1 bg-[#FFD700] shadow-[0_0_15px_#FFD700] z-10"
                            />
                            <div className="absolute inset-x-0 bottom-10 flex justify-center z-20">
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="px-4 py-2 bg-black/80 border border-[#FFD700]/30 rounded-full backdrop-blur-md"
                              >
                                <span className="text-[10px] font-mono text-[#FFD700] uppercase tracking-[0.2em]">
                                  {analysisStatus}
                                </span>
                              </motion.div>
                            </div>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-500 backdrop-blur-md">
                          <motion.div whileHover={{ scale: 1.1 }} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/20">
                            <Upload className="w-6 h-6 text-white" />
                          </motion.div>
                          <span className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">Replace Source</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-20 h-20 rounded-[2.5rem] bg-black/5 dark:bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#FFD700]/20 group-hover:rotate-12 transition-all duration-700 border border-black/5 dark:border-white/5">
                          <ImageIcon className="w-10 h-10 text-[var(--text-secondary)] opacity-30 group-hover:text-[#FFD700] group-hover:opacity-100 transition-all" />
                        </div>
                        <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase text-center px-10 leading-relaxed tracking-[0.2em]">
                          Drop Frame or <br /><span className="text-[#FFD700] font-bold underline underline-offset-8">Browse System</span>
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>
              </div>
            </div>

            <div className="p-8 bg-black/[0.02] dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row justify-between items-center px-12 py-10 gap-8 text-[var(--text-primary)]">
              <div className="flex gap-10 items-center opacity-60">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">System State</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#FFD700]" />
                    <span className="text-xs font-mono tabular-nums">IDLE_ACTIVE</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Processing</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#FFD700] animate-pulse" />
                    <span className="text-xs font-mono text-[#FFD700] tabular-nums">0.00s</span>
                  </div>
                </div>
              </div>
              
              <MagneticButton
                onClick={handleGenerate}
                disabled={!description.trim() || isGenerating}
                className={cn(
                  "px-16 py-6 rounded-[2.5rem] font-bold text-base uppercase tracking-[0.4em] transition-all flex items-center gap-4 relative overflow-hidden group/bake shadow-2xl",
                  description.trim() && !isGenerating
                    ? "bg-[#FFD700] text-black hover:shadow-[#FFD700]/20"
                    : "bg-black/10 dark:bg-white/10 text-[var(--text-secondary)] cursor-not-allowed opacity-50"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    CALIBRATING...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover/bake:rotate-12 transition-transform" />
                    BAKE MASTER
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent opacity-0 group-hover/bake:opacity-100 transition-opacity pointer-events-none" />
              </MagneticButton>
            </div>
          </section>
        </motion.div>

        {/* Output Section */}
        <AnimatePresence mode="wait">
          {generatedPrompt && (
            <motion.section
              initial={{ opacity: 0, y: 50, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="glass rounded-[3.5rem] overflow-hidden border border-black/10 dark:border-white/10 shadow-[0_64px_128px_rgba(0,0,0,0.1)] dark:shadow-[0_64px_128px_rgba(0,0,0,0.7)] relative mb-32 group/output-card"
            >
              <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#FFD700]/5 flex items-center justify-between px-12 py-8">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-[#FFD700] rounded-2xl shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                    <Sliders className="w-5 h-5 text-black" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase tracking-[0.25em] text-[#FFD700]">CALIBRATED RAW MASTER</span>
                    <span className="text-[10px] font-mono opacity-30 uppercase tracking-[0.1em]">UNFLATTENED BANA-STREAM 0.42</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <MagneticButton
                    onClick={handleCopy}
                    className={cn(
                      "flex items-center gap-3 px-10 py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                      copied 
                        ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40" 
                        : "bg-black/5 dark:bg-white/10 text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/20 border border-black/5 dark:border-white/10"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        CALIBRATED
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        DEPLOY TEXT
                      </>
                    )}
                  </MagneticButton>
                </div>
              </div>
              
              <div className="p-12">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="font-mono text-xl leading-[1.8] text-[var(--text-primary)] bg-black/[0.03] dark:bg-black/40 p-12 rounded-[3rem] border border-black/5 dark:border-white/5 selection:bg-[#FFD700] selection:text-black relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Command className="w-20 h-20" />
                  </div>
                  <div className="flex items-center gap-3 mb-8">
                    <span className="text-[10px] font-bold text-[#FFD700] opacity-60 uppercase tracking-widest px-4 py-1.5 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10">
                      RAW_PROMPT_FINAL_01
                    </span>
                    <div className="flex-1 h-px bg-black/10 dark:bg-white/5" />
                  </div>
                  <span className="text-[var(--text-primary)] opacity-80 tracking-tight block max-w-4xl">{generatedPrompt}</span>
                </motion.div>
              </div>

              <div className="px-12 pb-14 pt-0 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                <div className="flex-1 flex items-start gap-6 opacity-70">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center shrink-0">
                    <Info className="w-6 h-6 text-[#FFD700]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFD700]">
                      System Compatibility
                    </p>
                    <p className="text-sm leading-relaxed max-w-xl font-light">
                      Synthesized for Flux.1 Pro, Midjourney v6.1 (Niji/Raw), and stable diffusion 3.5. 24mm f/8 focus lock, direct flash reconstruction.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-30 text-center">INTEGRITY</div>
                    <div className="h-16 w-1 rounded-full bg-black/5 dark:bg-white/5 relative overflow-hidden">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "98%" }}
                        transition={{ duration: 1.5, delay: 0.8 }}
                        className="absolute bottom-0 left-0 w-full bg-[#FFD700]"
                      />
                    </div>
                  </div>
                  <div className="h-20 w-px bg-black/10 dark:bg-white/10" />
                  <div className="flex flex-col gap-4">
                    <div className="px-6 py-4 glass rounded-[1.5rem] border border-black/5 dark:border-white/5 flex flex-col gap-1 min-w-[140px]">
                      <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Render</span>
                      <span className="text-xs font-mono opacity-80 uppercase tracking-tighter">ULTRA_RAW</span>
                    </div>
                    <div className="px-6 py-4 glass-gold rounded-[1.5rem] border border-[#FFD700]/20 flex flex-col gap-1 min-w-[140px]">
                      <span className="text-[9px] font-bold text-[#FFD700]/60 uppercase tracking-widest">Engine</span>
                      <span className="text-xs font-mono text-[#FFD700] uppercase tracking-tighter">LUMEN_PRO_V2</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Improved Footer */}
        <footer className="mt-auto py-24 text-center flex flex-col items-center gap-12">
          <motion.div 
            animate={{ height: [60, 160, 60], opacity: [0.2, 0.6, 0.2] }}
            transition={{ repeat: Infinity, duration: 6 }}
            className="w-px bg-gradient-to-b from-[#FFD700] via-[#FFD700]/30 to-transparent shadow-[0_0_20px_rgba(255,215,0,0.5)]" 
          />
          <div className="flex flex-col gap-6">
            <motion.h3 
              whileHover={{ letterSpacing: "1.2em" }}
              className="text-base font-bold text-[var(--text-primary)] uppercase tracking-[0.8em] transition-all duration-700"
            >
              LUMEN NANO LABS
            </motion.h3>
            <p className="text-[10px] font-mono text-[var(--text-secondary)] opacity-40 uppercase tracking-[0.3em] max-w-md mx-auto leading-loose">
              ENGINEERING RAW PHOTOGRAPHY AESTHETICS THROUGH ADVANCED GENERATIVE PHOTONIC CALIBRATION.
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-12 text-[10px] font-mono text-[var(--text-secondary)] opacity-20 uppercase tracking-[0.5em] border-t border-black/5 dark:border-white/5 pt-16 w-full">
            <motion.span whileHover={{ color: "#FFD700", opacity: 1 }} className="cursor-pointer transition-all">EST. 2026</motion.span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/20" />
            <motion.span whileHover={{ color: "#FFD700", opacity: 1 }} className="cursor-pointer transition-all">ENCRYPTED STREAM</motion.span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/20" />
            <motion.span whileHover={{ color: "#FFD700", opacity: 1 }} className="cursor-pointer transition-all">V2.0 ALPHA BUILD</motion.span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/20" />
            <motion.span whileHover={{ color: "#FFD700", opacity: 1 }} className="cursor-pointer transition-all">GLOBAL_NODES: OK</motion.span>
          </div>
        </footer>
      </div>
      
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] noise hidden md:block" />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.1);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 215, 0, 0.3);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}} />
    </div>
  );
}
