import React from 'react';
import { Coins } from 'lucide-react';

export const GameLogo = ({ className = "w-16 h-16" }: { className?: string }) => {
  return (
    <div className={`relative group ${className}`}>
      {/* Square Container with Premium Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E6B038] via-[#FDE047] to-[#E6B038] rounded-2xl shadow-[0_0_30px_rgba(230,176,56,0.6)] group-hover:shadow-[0_0_50px_rgba(230,176,56,0.8)] transition-all duration-500" />
      
      {/* Inner Border/Glow */}
      <div className="absolute inset-[3px] bg-[#0A0A0A] rounded-[14px] flex items-center justify-center overflow-hidden">
        {/* Subtle Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_#E6B038_1px,_transparent_0)] bg-[size:12px_12px]" />
        
        {/* Content */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="bg-gradient-to-br from-[#E6B038] to-[#F5D061] p-1.5 rounded-lg mb-1 shadow-lg">
            <Coins size={20} className="text-[#3E2723]" strokeWidth={3} />
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[12px] font-black tracking-tighter text-white">SPIN71</span>
            <span className="text-[10px] font-black tracking-[0.2em] text-[#FDE047] -mt-0.5">BET</span>
          </div>
        </div>
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-2xl pointer-events-none" />
    </div>
  );
};
