import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Loader } from 'lucide-react';
import NetworkCanvas from '../components/landing/NetworkCanvas';
import ScholarshipCard from '../components/scholarships/ScholarshipCard';
import ScholarshipModal from '../components/scholarships/ScholarshipModal';
import { scholarships } from '../data/scholarships';

export default function FirstTimePage() {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [filtered, setFiltered] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState(null);

  // Sort scholarships by match score and get top 10 or top 3
  const sortedScholarships = [...scholarships].sort((a, b) => b.matchScore - a.matchScore);
  const displayedScholarships = filtered ? sortedScholarships.slice(0, 3) : sortedScholarships.slice(0, 10);

  const handleSearchWithAI = async () => {
    setIsSearching(true);
    // Simulate AI search processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSearching(false);
    setFiltered(true);
  };

  const handleContinue = () => {
    navigate('/dashboard/home');
  };

  return (
    <div className="relative min-h-screen bg-brand-bg overflow-hidden">
      {/* 3D Background with Blur Overlay */}
      <NetworkCanvas />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-brand-bg/80 via-brand-bg/40 to-transparent" />

      {/* Center Card - Google Forms Style */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl">
          {/* Card Container */}
          <div className="glass-card border border-brand-border/40 rounded-2xl shadow-2xl backdrop-blur-md bg-white/90 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-brand-accent via-brand-accent/80 to-yellow-500 px-8 py-10">
              <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome!</h1>
              <p className="text-white/90 text-lg">Let's find scholarships matched to your profile</p>
            </div>

            {/* Content Section */}
            <div className="p-8 md:p-10">
              {/* Scholarship Recommendations Title */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-brand-text mb-1">
                  {filtered ? 'Top 3 AI-Recommended Scholarships' : 'Top 10 Recommended Scholarships'}
                </h2>
                <p className="text-sm text-brand-muted">
                  {filtered 
                    ? 'Based on your profile analysis, these are your best matches' 
                    : 'Browse these opportunities and click Search with AI for personalized analysis'}
                </p>
              </div>

              {/* Scholarships Grid */}
              <div className="grid grid-cols-1 gap-4 mb-8 max-h-[500px] overflow-y-auto">
                {displayedScholarships.map(scholarship => (
                  <ScholarshipCard
                    key={scholarship.id}
                    scholarship={scholarship}
                    onViewDetails={setSelectedScholarship}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-6 border-t border-brand-border">
                {!filtered ? (
                  <button
                    onClick={handleSearchWithAI}
                    disabled={isSearching}
                    className="btn-primary w-full py-3 justify-center disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSearching ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Analyzing your profile...
                      </>
                    ) : (
                      <>
                        <Zap size={20} />
                        Search with AI
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleContinue}
                    className="btn-primary w-full py-3 justify-center flex items-center gap-2"
                  >
                    Continue to Dashboard
                    <ArrowRight size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scholarship Modal */}
      {selectedScholarship && (
        <ScholarshipModal 
          scholarship={selectedScholarship} 
          onClose={() => setSelectedScholarship(null)}
        />
      )}
    </div>
  );
}
