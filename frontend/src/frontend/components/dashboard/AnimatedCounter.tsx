"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedCounter({
  from = 0,
  to,
  duration = 2,
  className = "",
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const count = useMotionValue(from);
  const [isClient, setIsClient] = useState(false);

  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    setIsClient(true);
    const controls = animate(count, to, {
      duration: duration,
      ease: "easeOut",
    });

    return controls.stop;
  }, [count, to, duration]);

  if (!isClient) return <span className={className}>{prefix}{to}{suffix}</span>;

  return (
    <span className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
