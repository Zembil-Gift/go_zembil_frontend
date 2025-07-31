import React, { useState, useEffect } from "react";

export default function AnimatedBlackboard() {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [isWriting, setIsWriting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [showHand, setShowHand] = useState(false);
  const [phase, setPhase] = useState<'waiting' | 'writing' | 'displaying' | 'erasing'>('waiting');

  const messages = [
    "Love Wrapped in Tradition",
    "Surprise Your Loved Ones in Ethiopia", 
    "Zembil: Where Culture Meets Care",
    "From Addis to Abroad, We Deliver Love",
    "Because Every Gift Tells a Story"
  ];

  // Main animation cycle
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const startCycle = () => {
      const currentMsg = messages[messageIndex % messages.length];
      
      // Phase 1: Show hand and start writing
      setPhase('writing');
      setShowHand(true);
      setCurrentMessage("");
      setIsWriting(true);
      
      // Phase 2: Write message character by character
      let charIndex = 0;
      const writeInterval = setInterval(() => {
        if (charIndex <= currentMsg.length) {
          setCurrentMessage(currentMsg.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(writeInterval);
          setIsWriting(false);
          setPhase('displaying');
          
          // Phase 3: Display complete message for 4 seconds
          setTimeout(() => {
            setPhase('erasing');
            setIsErasing(true);
            
            // Phase 4: Erase message
            let eraseIndex = currentMsg.length;
            const eraseInterval = setInterval(() => {
              if (eraseIndex >= 0) {
                setCurrentMessage(currentMsg.slice(0, eraseIndex));
                eraseIndex--;
              } else {
                clearInterval(eraseInterval);
                setIsErasing(false);
                setShowHand(false);
                setPhase('waiting');
                
                // Move to next message after brief pause
                setTimeout(() => {
                  setMessageIndex(prev => prev + 1);
                }, 1000);
              }
            }, 60); // Fast erasing
          }, 4000); // Display for 4 seconds
        }
      }, 150); // Writing speed
    };

    // Start the cycle
    timer = setTimeout(startCycle, 1000);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [messageIndex]);

  const handPosition = {
    left: `${20 + Math.min(currentMessage.length * 12, 280)}px`,
    top: '45%'
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Blackboard */}
      <div className="relative bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 rounded-2xl shadow-2xl border-8 border-amber-800 p-6 min-h-[300px] overflow-hidden">
        
        {/* Subtle chalk texture */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-gradient-to-br from-transparent via-white to-transparent opacity-5"></div>
        </div>

        {/* Message Text - Always visible */}
        <div className="relative z-20 flex items-center justify-center h-full min-h-[200px]">
          <div className="text-center px-4">
            <p 
              className="text-white font-bold leading-relaxed transition-all duration-300"
              style={{ 
                fontFamily: "'Kalam', 'Caveat', cursive",
                fontSize: 'clamp(1.25rem, 4vw, 2rem)',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(255,255,255,0.3)',
                letterSpacing: '1px',
                filter: 'brightness(1.1)'
              }}
            >
              {currentMessage}
              {isWriting && <span className="animate-pulse text-gray-300">|</span>}
            </p>
          </div>
        </div>

        {/* Writing Hand */}
        {showHand && (
          <div 
            className="absolute z-30 transition-all duration-200 ease-out pointer-events-none"
            style={{
              ...handPosition,
              transform: `scale(0.8) ${isErasing ? 'rotate(10deg)' : 'rotate(-5deg)'}`
            }}
          >
            <svg width="50" height="70" viewBox="0 0 50 70" className="drop-shadow-lg">
              {/* Ethiopian/Habesha skin tone hand */}
              <g>
                {/* Wrist */}
                <ellipse cx="25" cy="55" rx="7" ry="12" fill="#8D5524" opacity="0.95"/>
                
                {/* Palm */}
                <ellipse cx="25" cy="40" rx="10" ry="15" fill="#A0612A" opacity="0.95"/>
                
                {/* Thumb */}
                <ellipse cx="16" cy="35" rx="3.5" ry="9" fill="#A0612A" opacity="0.95" transform="rotate(-25 16 35)"/>
                
                {/* Index finger (writing) */}
                <ellipse cx="22" cy="25" rx="2.5" ry="10" fill="#A0612A" opacity="0.95"/>
                
                {/* Middle finger */}
                <ellipse cx="26" cy="23" rx="2.5" ry="11" fill="#A0612A" opacity="0.95"/>
                
                {/* Ring finger */}
                <ellipse cx="30" cy="26" rx="2.5" ry="9" fill="#A0612A" opacity="0.95"/>
                
                {/* Pinky */}
                <ellipse cx="33" cy="30" rx="2" ry="7" fill="#A0612A" opacity="0.95"/>
                
                {/* Chalk piece - properly gripped */}
                <rect x="20" y="18" width="3" height="12" rx="1.5" fill="#F8F8FF" opacity="0.9" transform="rotate(-10 21.5 24)"/>
                <rect x="20" y="18" width="3" height="2" rx="1.5" fill="#E6E6FA" opacity="0.7" transform="rotate(-10 21.5 19)"/>
                
                {/* Fingernails */}
                <ellipse cx="22" cy="20" rx="1" ry="2" fill="#8D5524" opacity="0.6"/>
                <ellipse cx="26" cy="18" rx="1" ry="2" fill="#8D5524" opacity="0.6"/>
              </g>
              
              {/* Writing motion lines */}
              {isWriting && (
                <g opacity="0.4" className="animate-pulse">
                  <path d="M 32 20 Q 36 16 40 20" stroke="white" strokeWidth="0.5" fill="none"/>
                  <path d="M 34 25 Q 38 21 42 25" stroke="white" strokeWidth="0.5" fill="none"/>
                </g>
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}