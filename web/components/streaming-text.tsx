"use client";

import { useState, useEffect } from "react";

interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
  speed?: number;
}

export default function StreamingText({
  text,
  isStreaming = false,
  speed = 20,
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset when text changes completely (new message)
  useEffect(() => {
    if (text !== displayedText + text.slice(currentIndex)) {
      setDisplayedText("");
      setCurrentIndex(0);
    }
  }, [text]);

  // Character-by-character reveal effect
  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  return (
    <span className="inline">
      {displayedText}
      {isStreaming && currentIndex < text.length && (
        <span className="typing-cursor" aria-hidden="true">|</span>
      )}
    </span>
  );
}
