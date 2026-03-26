import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, ShieldCheck, Rocket, Image as ImageIcon, ChevronLeft, Loader2, HelpCircle, BarChart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PersonasAndFAQ from './PersonasAndFAQ';
import UserGuideDashboard from './UserGuideDashboard';
import SEO from './SEO';
import { getHowToJsonLd } from '../lib/json-ld';

type GuideType = 'user' | 'admin' | 'launch' | 'assets' | 'summary' | 'faq';

interface UserGuideProps {
  isAdmin?: boolean;
  initialGuide?: GuideType;
}

export default function UserGuide({ isAdmin, initialGuide = 'user' }: UserGuideProps) {
  const [activeGuide, setActiveGuide] = useState<GuideType>(initialGuide);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const howToSteps = [
    {
      name: "Enter your Website URL",
      text: "Type the full URL of the website you want to analyze for AEO performance.",
      image: "https://picsum.photos/seed/aeo1/800/600"
    },
    {
      name: "Run the Analysis",
      text: "Click the 'Analyze' button. Our AI will crawl your site and simulate how search engines and AI models perceive your content.",
      image: "https://picsum.photos/seed/aeo2/800/600"
    },
    {
      name: "Review your AEO Score",
      text: "Examine your overall AEO score and specific breakdowns for semantic structure, content density, and technical schema.",
      image: "https://picsum.photos/seed/aeo3/800/600"
    },
    {
      name: "Implement Technical Fixes",
      text: "Follow the provided roadmap to fix missing JSON-LD, improve semantic headers, and optimize for AI citations.",
      image: "https://picsum.photos/seed/aeo4/800/600"
    }
  ];

  const fetchGuide = async (type: GuideType) => {
    setLoading(true);
    try {
      const fileName = type === 'user' ? 'user-guide.md' : 
                       type === 'admin' ? 'admin-guide.md' : 
                       type === 'launch' ? 'launch-plan.md' : 
                       type === 'assets' ? 'assets-prompts.md' :
                       type === 'summary' ? 'executive-summary.md' : 'personas-and-faq.md';
      const response = await fetch(`/docs/${fileName}`);
      if (!response.ok) throw new Error('Failed to fetch guide');
      const text = await response.text();
      setContent(text);
    } catch (err) {
      console.error('Error fetching guide:', err);
      setContent('# Error\nFailed to load the guide. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuide(activeGuide);
  }, [activeGuide]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
      <SEO 
        title="User Guide - How to Optimize for AEO"
        description="Learn how to use AEO Analyzers to improve your website's visibility in AI search results and secure your brand's citations."
        author="Lindsay Hiebert"
        publishedDate="2026-03-22T00:00:00Z"
        jsonLd={[
          getHowToJsonLd(howToSteps)
        ]}
      />
      {/* Sidebar Navigation */}
      <div className="md:w-64 shrink-0">
        <div className="sticky top-24 space-y-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 ml-4">Documentation</h3>
          
          <GuideNavItem 
            active={activeGuide === 'user'} 
            onClick={() => setActiveGuide('user')} 
            icon={<BookOpen className="w-4 h-4" />} 
            label="User Guide" 
          />

          <GuideNavItem 
            active={activeGuide === 'faq'} 
            onClick={() => setActiveGuide('faq')} 
            icon={<HelpCircle className="w-4 h-4" />} 
            label="Personas & FAQ" 
          />
          
          {isAdmin && (
            <>
              <GuideNavItem 
                active={activeGuide === 'summary'} 
                onClick={() => setActiveGuide('summary')} 
                icon={<BarChart className="w-4 h-4" />} 
                label="Exec Summary" 
              />
              <GuideNavItem 
                active={activeGuide === 'admin'} 
                onClick={() => setActiveGuide('admin')} 
                icon={<ShieldCheck className="w-4 h-4" />} 
                label="Admin Guide" 
              />
              <GuideNavItem 
                active={activeGuide === 'launch'} 
                onClick={() => setActiveGuide('launch')} 
                icon={<Rocket className="w-4 h-4" />} 
                label="Launch Plan" 
              />
              <GuideNavItem 
                active={activeGuide === 'assets'} 
                onClick={() => setActiveGuide('assets')} 
                icon={<ImageIcon className="w-4 h-4" />} 
                label="Asset Prompts" 
              />
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 md:p-12 shadow-sm min-h-[600px] relative">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-none"
              >
                {activeGuide === 'faq' ? (
                  <PersonasAndFAQ />
                ) : activeGuide === 'user' ? (
                  <UserGuideDashboard />
                ) : (
                  <div className="prose prose-zinc prose-sm md:prose-base max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function GuideNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all font-bold text-sm ${active ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10' : 'text-zinc-500 hover:bg-zinc-100'}`}
    >
      {icon}
      {label}
    </button>
  );
}
