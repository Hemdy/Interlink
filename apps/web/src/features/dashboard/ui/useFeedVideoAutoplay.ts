"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Coordinates single-active-video scroll autoplay across feed video posts and reels:
 * - Plays the single most visible video (>= 55% in viewport) when autoplay is enabled.
 * - Pauses all other videos so multiple videos never play simultaneously.
 * - Disables scroll autoplay globally if a user manually pauses a video.
 * - Restores scroll autoplay globally once a user explicitly plays/resumes a video.
 */
export function useFeedVideoAutoplay(itemSignature: string) {
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
  const [feedMuted, setFeedMuted] = useState(true);

  const autoplayEnabledRef = useRef(true);
  const feedMutedRef = useRef(true);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const containerElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const ratiosRef = useRef<Map<string, number>>(new Map());
  const programmaticPauseRef = useRef<Set<string>>(new Set());
  const programmaticPlayRef = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const pauseProgrammatically = useCallback((key: string, el: HTMLVideoElement) => {
    if (el.paused) return;
    programmaticPauseRef.current.add(key);
    el.pause();
    window.setTimeout(() => {
      programmaticPauseRef.current.delete(key);
    }, 120);
  }, []);

  const playProgrammatically = useCallback((key: string, el: HTMLVideoElement) => {
    el.muted = feedMutedRef.current;
    if (!el.paused) return;
    programmaticPlayRef.current.add(key);
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Fallback to muted playback if browser blocks unmuted autoplay
        if (!el.muted) {
          el.muted = true;
          feedMutedRef.current = true;
          setFeedMuted(true);
          el.play().catch(() => undefined);
        }
      });
    }
    window.setTimeout(() => {
      programmaticPlayRef.current.delete(key);
    }, 150);
  }, []);

  const evaluateVisibility = useCallback(() => {
    let bestKey: string | null = null;
    let bestRatio = 0;

    ratiosRef.current.forEach((ratio, key) => {
      if (ratio >= 0.55 && ratio > bestRatio) {
        bestRatio = ratio;
        bestKey = key;
      }
    });

    videoElementsRef.current.forEach((el, key) => {
      if (key !== bestKey) {
        pauseProgrammatically(key, el);
      }
    });

    if (!bestKey || !autoplayEnabledRef.current) {
      setActiveVideoKey((prev) => {
        if (!bestKey) return null;
        const el = videoElementsRef.current.get(bestKey);
        return el && !el.paused ? prev : null;
      });
      return;
    }

    const targetEl = videoElementsRef.current.get(bestKey);
    if (targetEl) {
      playProgrammatically(bestKey, targetEl);
      setActiveVideoKey(bestKey);
    }
  }, [pauseProgrammatically, playProgrammatically]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.videoKey;
          if (!key) continue;
          ratiosRef.current.set(key, entry.intersectionRatio);
        }
        evaluateVisibility();
      },
      { threshold: [0, 0.25, 0.55, 0.75, 0.95] },
    );

    observerRef.current = observer;
    containerElementsRef.current.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [evaluateVisibility, itemSignature]);

  const registerContainer = useCallback((key: string, node: HTMLElement | null) => {
    const prev = containerElementsRef.current.get(key);
    if (prev && prev !== node && observerRef.current) {
      observerRef.current.unobserve(prev);
    }

    if (node) {
      node.dataset.videoKey = key;
      containerElementsRef.current.set(key, node);
      observerRef.current?.observe(node);
    } else {
      containerElementsRef.current.delete(key);
      ratiosRef.current.delete(key);
    }
  }, []);

  const registerVideo = useCallback((key: string, node: HTMLVideoElement | null) => {
    if (node) {
      videoElementsRef.current.set(key, node);
    } else {
      videoElementsRef.current.delete(key);
    }
  }, []);

  const handleVideoPlay = useCallback(
    (key: string) => {
      // Ensure single active video even on manual play
      videoElementsRef.current.forEach((el, otherKey) => {
        if (otherKey !== key) {
          pauseProgrammatically(otherKey, el);
        }
      });
      setActiveVideoKey(key);

      if (programmaticPlayRef.current.has(key)) {
        return;
      }

      // User explicitly played/resumed: restore automatic scroll playback
      autoplayEnabledRef.current = true;
      setAutoplayEnabled(true);
    },
    [pauseProgrammatically],
  );

  const handleVideoPause = useCallback((key: string, el: HTMLVideoElement) => {
    if (programmaticPauseRef.current.has(key)) {
      return;
    }
    if (el.ended) {
      return;
    }
    const ratio = ratiosRef.current.get(key) ?? 1;
    if (ratio < 0.35) {
      return;
    }

    // User manually paused/stopped an active visible video: disable autoplay for subsequent videos
    autoplayEnabledRef.current = false;
    setAutoplayEnabled(false);
    setActiveVideoKey((prev) => (prev === key ? null : prev));
  }, []);

  const triggerManualPlay = useCallback(
    (key: string) => {
      const el = videoElementsRef.current.get(key);
      if (!el) return;
      autoplayEnabledRef.current = true;
      setAutoplayEnabled(true);
      videoElementsRef.current.forEach((otherEl, otherKey) => {
        if (otherKey !== key) {
          pauseProgrammatically(otherKey, otherEl);
        }
      });
      el.muted = feedMutedRef.current;
      el.play().catch(() => {
        el.muted = true;
        feedMutedRef.current = true;
        setFeedMuted(true);
        el.play().catch(() => undefined);
      });
      setActiveVideoKey(key);
    },
    [pauseProgrammatically],
  );

  const toggleMute = useCallback(() => {
    const nextMuted = !feedMutedRef.current;
    feedMutedRef.current = nextMuted;
    setFeedMuted(nextMuted);
    videoElementsRef.current.forEach((el) => {
      el.muted = nextMuted;
    });
  }, []);

  return {
    autoplayEnabled,
    activeVideoKey,
    feedMuted,
    registerContainer,
    registerVideo,
    handleVideoPlay,
    handleVideoPause,
    triggerManualPlay,
    toggleMute,
  };
}
