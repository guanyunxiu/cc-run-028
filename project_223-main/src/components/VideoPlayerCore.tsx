import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import styles from './VideoPlayerCore.module.css';

type VideoJsPlayer = ReturnType<typeof videojs>;

interface VideoPlayerCoreProps {
  videoUrl: string;
  onProgress: (watchedSec: number) => void;
  resumeFrom?: number;
  durationSec: number;
}

export default function VideoPlayerCore({ videoUrl, onProgress, resumeFrom = 0, durationSec }: VideoPlayerCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const durationSecRef = useRef(durationSec);
  durationSecRef.current = durationSec;

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';
    const videoEl = document.createElement('video');
    videoEl.className = 'video-js vjs-big-play-centered';
    videoEl.setAttribute('data-setup', '{}');
    containerRef.current.appendChild(videoEl);

    const player = videojs(videoEl, {
      controls: true,
      responsive: true,
      fluid: false,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      sources: [{ src: videoUrl, type: 'video/mp4' }],
    });

    playerRef.current = player;

    player.on('play', () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        onProgressRef.current(player.currentTime());
      }, 10000);
    });

    player.on('pause', () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onProgressRef.current(player.currentTime());
    });

    player.on('seeked', () => {
      onProgressRef.current(player.currentTime());
    });

    player.on('ended', () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onProgressRef.current(durationSecRef.current);
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    if (!playerRef.current || resumeFrom <= 0) return;
    const player = playerRef.current;
    const seek = () => {
      player.currentTime(resumeFrom);
    };
    if (player.readyState() >= 1) {
      seek();
    } else {
      player.one('loadedmetadata', seek);
    }
  }, [resumeFrom]);

  return (
    <div ref={containerRef} className={styles.wrapper} data-setup='{}' />
  );
}
