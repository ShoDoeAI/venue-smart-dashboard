import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function InteractiveTooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        let x = rect.left + scrollX;
        let y = rect.top + scrollY;
        
        switch (position) {
          case 'top':
            x += rect.width / 2;
            y -= 8;
            break;
          case 'bottom':
            x += rect.width / 2;
            y += rect.height + 8;
            break;
          case 'left':
            x -= 8;
            y += rect.height / 2;
            break;
          case 'right':
            x += rect.width + 8;
            y += rect.height / 2;
            break;
        }
        
        setCoords({ x, y });
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div
          className={cn(
            'absolute z-[9999] bg-gray-900 text-white text-sm rounded-lg py-2 px-3 shadow-lg pointer-events-none transition-opacity',
            position === 'top' && '-translate-x-1/2 -translate-y-full',
            position === 'bottom' && '-translate-x-1/2',
            position === 'left' && '-translate-y-1/2 -translate-x-full',
            position === 'right' && '-translate-y-1/2',
            className
          )}
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
            opacity: isVisible ? 1 : 0,
          }}
        >
          {content}
          
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-0 h-0 border-4 border-transparent',
              position === 'top' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-gray-900',
              position === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-gray-900',
              position === 'left' && 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-gray-900',
              position === 'right' && 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-gray-900'
            )}
          />
        </div>,
        document.body
      )}
    </>
  );
}