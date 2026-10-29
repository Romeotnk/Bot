import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { DashboardState, BotStatus, Settings, BotState, Levels, Signal, Trade, DecisionLog, BrokerAccountConfig, MetaApiConfig } from '../types';

interface StateContextType {
  state: DashboardState | null;
  isLoading: boolean;
  isBotUnresponsive: boolean;
  minutesSinceLastUpdate: number;
  isAutoRefresh: boolean;
  toggleAutoRefresh: () => void;
  latencyMs: number;
  isPineScriptModalOpen: boolean;
  setIsPineScriptModalOpen: (open: boolean) => void;
  isBrokerModalOpen: boolean;
  setIsBrokerModalOpen: (open: boolean) => void;
  togglePause: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  connectBroker: (brokerConfig: Partial<BrokerAccountConfig>) => Promise<BrokerAccountConfig>;
  pingBroker: () => Promise<number>;
  disconnectBroker: () => Promise<void>;
  saveMetaApiConfig: (config: Partial<MetaApiConfig>) => Promise<MetaApiConfig>;
  syncMetaApiAccount: () => Promise<any>;
  executeMetaApiTrade: (params: { action: 'BUY' | 'SELL'; symbol?: string; volume?: number; stopLoss?: number; takeProfit?: number; comment?: string }) => Promise<any>;
  advanceDemoSequence: () => Promise<void>;
  setBotState: (newState: BotState) => Promise<void>;
  clearToRealState: () => Promise<void>;
  loadDemoScenario: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  ingestDemoSignal: () => Promise<void>;
  refreshState: () => Promise<void>;
  ownerEmail: string;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [isPineScriptModalOpen, setIsPineScriptModalOpen] = useState(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);

  const fetchState = useCallback(async () => {
    const t0 = performance.now();
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        const roundTrip = Math.round(performance.now() - t0);
        setLatencyMs(roundTrip > 0 ? roundTrip : 12);
        setState(data);
        setLastHeartbeat(Date.now());

        // Auto-rehydrate MetaApi credentials from localStorage if server was restarted
        try {
          const stored = localStorage.getItem('metaapi_persisted_config');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.token && parsed.account_id && (!data.metaapi?.token || !data.metaapi?.connected)) {
              fetch('/api/metaapi/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed),
              }).then(() => {
                fetch('/api/metaapi/sync-account', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(parsed),
                });
              });
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to fetch state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-time Server-Sent Events connection (Instant Sub-Second Push)
  useEffect(() => {
    fetchState();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'state_update' || payload.type === 'connected') {
              setState(payload.data);
              setLastHeartbeat(Date.now());
              setLatencyMs((prev) => (payload.data?.stream_latency_ms ? payload.data.stream_latency_ms : prev));
            }
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
          }
          // Immediate fast reconnect in 1000ms
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connectSSE, 1000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectSSE, 1500);
      }
    };

    connectSSE();

    const heartbeatInterval = setInterval(() => {
      setLastHeartbeat(Date.now());
    }, 5000);

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(reconnectTimeout);
      clearInterval(heartbeatInterval);
    };
  }, [fetchState]);

  // Ultra-fast auto-refresh fallback polling (every 1000ms / 1s in record time)
  useEffect(() => {
    if (!isAutoRefresh) return;
    const autoInterval = setInterval(() => {
      fetchState();
    }, 1000);

    return () => clearInterval(autoInterval);
  }, [isAutoRefresh, fetchState]);

  // Check if robot is unresponsive: updated_at older than 2 minutes
  const { isBotUnresponsive, minutesSinceLastUpdate } = useMemo(() => {
    if (!state?.bot_status?.updated_at) return { isBotUnresponsive: false, minutesSinceLastUpdate: 0 };
    const updatedTime = new Date(state.bot_status.updated_at).getTime();
    const diffMs = Date.now() - updatedTime;
    const diffMin = Math.floor(diffMs / 60000);
    return {
      isBotUnresponsive: diffMs > 2 * 60 * 1000,
      minutesSinceLastUpdate: diffMin,
    };
  }, [state?.bot_status?.updated_at, lastHeartbeat]);

  const togglePause = async () => {
    try {
      const res = await fetch('/api/pause', { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    }
  };

  const updateSettings = async (partial: Partial<Settings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur de mise à jour des réglages.');
    }
    await fetchState();
  };

  const connectBroker = async (brokerConfig: Partial<BrokerAccountConfig>): Promise<BrokerAccountConfig> => {
    const res = await fetch('/api/broker/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brokerConfig),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Impossible de connecter le compte courtier.');
    }
    const data = await res.json();
    await fetchState();
    return data.broker;
  };

  const pingBroker = async (): Promise<number> => {
    try {
      const res = await fetch('/api/broker/ping', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await fetchState();
        return data.ping_ms || 18;
      }
    } catch (err) {
      console.error('Failed to ping broker:', err);
    }
    return 24;
  };

  const disconnectBroker = async (): Promise<void> => {
    try {
      const res = await fetch('/api/broker/disconnect', { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Failed to disconnect broker:', err);
    }
  };

  const saveMetaApiConfig = async (config: Partial<MetaApiConfig>): Promise<MetaApiConfig> => {
    try {
      const stored = localStorage.getItem('metaapi_persisted_config');
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem('metaapi_persisted_config', JSON.stringify({ ...parsed, ...config }));
    } catch (e) {
      // ignore
    }

    const res = await fetch('/api/metaapi/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Impossible d\'enregistrer la configuration MetaApi.');
    }
    const data = await res.json();
    await fetchState();
    return data.metaapi;
  };

  const syncMetaApiAccount = async (): Promise<any> => {
    const res = await fetch('/api/metaapi/sync-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.details || 'Échec de synchronisation avec le compte MetaApi.');
    }
    const data = await res.json();
    await fetchState();
    return data;
  };

  const executeMetaApiTrade = async (params: {
    action: 'BUY' | 'SELL';
    symbol?: string;
    volume?: number;
    stopLoss?: number;
    takeProfit?: number;
    comment?: string;
  }): Promise<any> => {
    const res = await fetch('/api/metaapi/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    await fetchState();
    if (!res.ok || !data.success) {
      throw new Error(data.reason || data.error?.message || data.error || 'Erreur lors de l\'exécution de l\'ordre sur MetaApi.');
    }
    return data;
  };

  const advanceDemoSequence = async () => {
    try {
      const res = await fetch('/api/demo/advance-sequence', { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Failed to advance sequence:', err);
    }
  };

  const setBotState = async (newState: BotState) => {
    try {
      const res = await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Failed to set bot state:', err);
    }
  };

  const clearToRealState = async () => {
    try {
      const res = await fetch('/api/demo/clear-real', { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Failed to clear to real state:', err);
    }
  };

  const loadDemoScenario = async () => {
    try {
      const res = await fetch('/api/demo/load-scenario', { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Failed to load demo scenario:', err);
    }
  };

  const resetDemoData = async () => {
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Failed to reset demo data:', err);
    }
  };

  const ingestDemoSignal = async () => {
    if (!state) return;
    try {
      await fetch('/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-key': state.bot_key || 'aurum-prod-secret-xauusd-key',
        },
        body: JSON.stringify({
          type: 'signal',
          payload: {
            strategy: 'Balayage liquidité New York',
            side: 'BUY',
            entry: Number((state.bot_status.last_price + 0.5).toFixed(2)),
            stop_loss: Number((state.bot_status.last_price - 3.5).toFixed(2)),
            take_profit: Number((state.bot_status.last_price + 12.0).toFixed(2)),
            rr: 3.4,
            status: 'pris',
            filter: 'aucun',
            reason_fr: 'Signal test direct injecté avec succès via le canal x-bot-key.',
          },
        }),
      });
      await fetchState();
    } catch (err) {
      console.error('Error injecting signal:', err);
    }
  };

  return (
    <StateContext.Provider
      value={{
        state,
        isLoading,
        isBotUnresponsive,
        minutesSinceLastUpdate,
        isAutoRefresh,
        toggleAutoRefresh: () => setIsAutoRefresh((prev) => !prev),
        latencyMs,
        isPineScriptModalOpen,
        setIsPineScriptModalOpen,
        isBrokerModalOpen,
        setIsBrokerModalOpen,
        togglePause,
        updateSettings,
        connectBroker,
        pingBroker,
        disconnectBroker,
        saveMetaApiConfig,
        syncMetaApiAccount,
        executeMetaApiTrade,
        advanceDemoSequence,
        setBotState,
        clearToRealState,
        loadDemoScenario,
        resetDemoData,
        ingestDemoSignal,
        refreshState: fetchState,
        ownerEmail: 'vdohinnon22@gmail.com',
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
}
