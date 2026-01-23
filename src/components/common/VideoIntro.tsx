import { useState, useEffect, useRef } from 'react';

interface VideoIntroProps {
    onComplete: () => void;
    showOnce?: boolean; // If true, video will only play once per session
}

const VideoIntro = ({ onComplete, showOnce = false }: VideoIntroProps) => {
    const [isVideoEnded, setIsVideoEnded] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Check if video should be skipped (if it was already shown this session and showOnce is true)
        if (showOnce && sessionStorage.getItem('videoPlayed') === 'true') {
            onComplete();
            return;
        }

        // Auto-play the video when component mounts
        if (videoRef.current) {
            videoRef.current.play().catch(error => {
                console.error('Video autoplay failed:', error);
                // If autoplay fails, skip the video after a short delay
                setTimeout(() => {
                    handleVideoEnd();
                }, 500);
            });
        }
    }, [onComplete, showOnce]);

    const handleVideoEnd = () => {
        setFadeOut(true);

        // Mark video as played in session storage
        if (showOnce) {
            sessionStorage.setItem('videoPlayed', 'true');
        }

        // Wait for fade-out animation to complete before calling onComplete
        setTimeout(() => {
            setIsVideoEnded(true);
            onComplete();
        }, 800); // Match the CSS transition duration
    };

    const handleSkip = () => {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        handleVideoEnd();
    };

    const handleVideoLoaded = () => {
        setIsVideoLoaded(true);
    };

    if (isVideoEnded) {
        return null;
    }

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'
                }`}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className={`w-full h-full object-cover md:object-contain transition-opacity duration-500 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                onEnded={handleVideoEnd}
                onLoadedData={handleVideoLoaded}
                playsInline
                muted
                preload="auto"
            >
                <source src="/intro-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>





            <style>{`
        .duration-800 {
          transition-duration: 800ms;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

export default VideoIntro;
