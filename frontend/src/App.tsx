import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { HealthStatus, DashboardSummary, NetworkFlowRecord } from './types';
import { api } from './services/api';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { FlowDetailModal } from './components/common/FlowDetailModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { LiveTraffic } from './pages/LiveTraffic';
import { ThreatCenter } from './pages/ThreatCenter';
import { NetworkAnalytics } from './pages/NetworkAnalytics';
import { ModelPerformance } from './pages/ModelPerformance';
import { ExplainableAI } from './pages/ExplainableAI/ExplainableAI';
import { Studio } from './pages/Studio/Studio';
import { ResearchStudio } from './pages/ResearchStudio';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deep flow inspect modal
  const [inspectedFlow, setInspectedFlow] = useState<NetworkFlowRecord | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, summaryData] = await Promise.all([
        api.getHealth(),
        api.getDashboardSummary(),
      ]);
      setHealth(healthData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Initialization error', err);
      // Try fallback to health if summary alone failed
      try {
        const h = await api.getHealth();
        setHealth(h);
      } catch {
        setError('Unable to reach the backend REST API at http://127.0.0.1:8000. Please start the backend service.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // Heartbeat health poller every 10 seconds
    const interval = setInterval(async () => {
      try {
        const h = await api.getHealth();
        setHealth(h);
        setError(null);
      } catch (err) {
        setHealth(null);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleInspectFlow = (flow: NetworkFlowRecord) => {
    setInspectedFlow(flow);
  };

  return (
    <div className="min-h-screen bg-soc-bg text-soc-text flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        health={health}
        loading={loading}
        onRefresh={fetchInitialData}
        lastUpdated={summary?.last_updated}
      />

      {/* Disconnection Banner */}
      {!health && !loading && (
        <div className="bg-soc-critical/20 border-b border-soc-critical/40 px-6 py-2.5 flex items-center justify-between text-xs font-mono text-soc-critical">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              <strong>BACKEND DISCONNECTED:</strong> Cannot connect to REST API at <code>http://127.0.0.1:8000</code>.
            </span>
          </div>
          <button
            onClick={fetchInitialData}
            className="px-3 py-1 rounded bg-soc-critical text-white font-bold hover:bg-soc-critical/80 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Retry Connection
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          criticalCount={summary?.critical_alerts ?? 0}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)]">
          {currentTab === 'dashboard' && (
            <Dashboard
              summary={summary}
              loading={loading}
              onInspectFlow={handleInspectFlow}
            />
          )}

          {currentTab === 'traffic' && (
            <LiveTraffic onInspectFlow={handleInspectFlow} />
          )}

          {currentTab === 'threats' && (
            <ThreatCenter onInspectFlow={handleInspectFlow} />
          )}

          {currentTab === 'analytics' && <NetworkAnalytics />}

          {currentTab === 'model' && <ModelPerformance />}

          {currentTab === 'xai' && <ExplainableAI />}

          {currentTab === 'studio' && <Studio />}

          {currentTab === 'research' && <ResearchStudio />}

          {currentTab === 'reports' && <Reports />}

          {currentTab === 'settings' && <Settings health={health} />}
        </main>
      </div>

      {/* Flow Feature Inspector Modal */}
      <FlowDetailModal
        flow={inspectedFlow}
        onClose={() => setInspectedFlow(null)}
      />
    </div>
  );
};

export default App;
