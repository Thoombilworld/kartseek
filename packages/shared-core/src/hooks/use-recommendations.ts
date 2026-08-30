'use client';

/**
 * KARTSEEK — useRecommendations Hook
 *
 * React hook for consuming real-time personalized recommendations.
 *
 * Features:
 *  - Connects to /recommendations WebSocket namespace
 *  - Subscribes to the active module for real-time updates
 *  - Falls back to REST API if WebSocket is unavailable
 *  - Caches last recommendations in sessionStorage for instant display
 *  - Provides trackClick() for feedback loop
 *
 * Usage:
 *   const { forYou, trending, crossModule, status, trackClick } = useRecommendations('marketplace', userId);
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '../socket/socket';
import { API_BASE_URL } from '@/lib/config/api-base';

// ─── Types (mirrored from backend) ──────────────────────────────────────────

export type RecommendationModule =
  | 'marketplace'
  | 'grocery'
  | 'pharmacy'
  | 'hotel'
  | 'restaurant'
  | 'doctor';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface Recommendation {
  id: string;
  module: RecommendationModule;
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  score: number;
  reason: string;
  reasonLabel: string;
  metadata: Record<string, any>;
}

interface WsRecommendationUpdate {
  module: RecommendationModule;
  recommendations: Recommendation[];
  type: 'for_you' | 'trending' | 'cross_module';
  generatedAt: string;
}

// ─── Cache Helpers ──────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'kartseek_reco_';

function getCached(module: RecommendationModule): { forYou: Recommendation[]; trending: Recommendation[]; crossModule: Recommendation[] } | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${module}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCache(module: RecommendationModule, data: { forYou: Recommendation[]; trending: Recommendation[]; crossModule: Recommendation[] }) {
  try {
    sessionStorage.setItem(`${CACHE_KEY_PREFIX}${module}`, JSON.stringify(data));
  } catch {
    // sessionStorage might be full or unavailable
  }
}

// ─── REST Fallback ──────────────────────────────────────────────────────────

// Gateway origin resolved once in lib/config/api-base.ts. The local fallback
// here was the bare origin with no `/api/v1`, so whenever the environment
// variable was missing this fetched `/recommendations/...` and 404'd — the
// opposite mistake to the one in lib/seo/override-resolver.ts.
const API_BASE = API_BASE_URL;

async function fetchRecommendationsREST(module: RecommendationModule, token?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/recommendations/${module}?limit=10`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useRecommendations(
  module: RecommendationModule,
  userId: string | null,
  options: { token?: string; enabled?: boolean } = {},
) {
  const { token, enabled = true } = options;
  const [forYou, setForYou] = useState<Recommendation[]>([]);
  const [trending, setTrending] = useState<Recommendation[]>([]);
  const [crossModule, setCrossModule] = useState<Recommendation[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const subscribedRef = useRef<string | null>(null);

  // Load cached data immediately
  useEffect(() => {
    const cached = getCached(module);
    if (cached) {
      setForYou(cached.forYou);
      setTrending(cached.trending);
      setCrossModule(cached.crossModule);
    }
  }, [module]);

  // WebSocket connection + subscription
  useEffect(() => {
    if (!enabled || !userId) return;

    setStatus('connecting');
    const socket = getSocket('recommendations', { userId, token });

    const onConnect = () => {
      setStatus('connected');
      // Subscribe to the current module
      socket.emit('subscribe_module', { module });
      subscribedRef.current = module;
    };

    const onDisconnect = () => setStatus('disconnected');

    const onRecommendationsUpdate = (data: WsRecommendationUpdate) => {
      if (data.module !== module) return;
      setForYou(data.recommendations);
      setCache(module, { forYou: data.recommendations, trending, crossModule });
    };

    const onTrendingUpdate = (data: WsRecommendationUpdate) => {
      if (data.module !== module) return;
      setTrending(data.recommendations);
      setCache(module, { forYou, trending: data.recommendations, crossModule });
    };

    const onCrossModulePicks = (data: WsRecommendationUpdate) => {
      if (data.module !== module) return;
      setCrossModule(data.recommendations);
      setCache(module, { forYou, trending, crossModule: data.recommendations });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('recommendations_update', onRecommendationsUpdate);
    socket.on('trending_update', onTrendingUpdate);
    socket.on('cross_module_picks', onCrossModulePicks);

    // If already connected, subscribe immediately
    if (socket.connected) {
      setStatus('connected');
      socket.emit('subscribe_module', { module });
      subscribedRef.current = module;
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('recommendations_update', onRecommendationsUpdate);
      socket.off('trending_update', onTrendingUpdate);
      socket.off('cross_module_picks', onCrossModulePicks);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, userId, enabled]);

  // REST fallback — if WebSocket doesn't connect within 3s
  useEffect(() => {
    if (!enabled || !userId) return;
    if (forYou.length > 0 || trending.length > 0) return; // Already have data

    const timeout = setTimeout(async () => {
      if (status !== 'connected') {
        const data = await fetchRecommendationsREST(module, token);
        if (data) {
          if (data.forYou?.length) setForYou(data.forYou);
          if (data.trending?.length) setTrending(data.trending);
          if (data.crossModule?.length) setCrossModule(data.crossModule);
          setCache(module, {
            forYou: data.forYou || [],
            trending: data.trending || [],
            crossModule: data.crossModule || [],
          });
        }
      }
    }, 3000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, userId, status]);

  // Track click
  const trackClick = useCallback(
    (recommendation: Recommendation, position: number) => {
      if (!userId) return;
      const socket = getSocket('recommendations', { userId });
      socket.emit('recommendation_clicked', {
        recommendationId: recommendation.id,
        module: recommendation.module,
        entityId: recommendation.entityId,
        position,
      });
    },
    [userId],
  );

  // Track view (for scroll-into-viewport tracking)
  const trackView = useCallback(
    (entityType: string, entityId: string, category?: string, durationMs?: number) => {
      if (!userId) return;
      const socket = getSocket('recommendations', { userId });
      socket.emit('track_view', { module, entityType, entityId, category, durationMs });
    },
    [userId, module],
  );

  return {
    forYou,
    trending,
    crossModule,
    status,
    trackClick,
    trackView,
    isLoading: status === 'connecting' && forYou.length === 0 && trending.length === 0,
    hasData: forYou.length > 0 || trending.length > 0 || crossModule.length > 0,
  };
}
