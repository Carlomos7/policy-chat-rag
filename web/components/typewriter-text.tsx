"use client";

import { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  cursorClassName?: string;
  showCursorAfterComplete?: boolean;
}

export function TypewriterText({
  text,
  speed = 80,
  delay = 300,
  className = "",
  cursorClassName = "",
  showCursorAfterComplete = true,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Initial delay before typing starts
    const startTimer = setTimeout(() => {
      setHasStarted(true);
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!hasStarted) return;

    if (displayedText.length < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, speed);

      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [displayedText, text, speed, hasStarted]);

  const showCursor = isTyping || showCursorAfterComplete;

  return (
    <span className={className}>
      {displayedText}
      {showCursor && (
        <span 
          className={`typing-cursor ${cursorClassName}`} 
          aria-hidden="true"
        >
          |
        </span>
      )}
    </span>
  );
}
