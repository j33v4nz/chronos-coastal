import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TacticalMap from './components/TacticalMap';
import ControlPanel from './components/ControlPanel';
import DarkGridMatrix from './components/DarkGridMatrix';
import LogisticsCountdown from './components/LogisticsCountdown';
import SwarmMissionFeed from './components/SwarmMissionFeed';
import GeminiInspectorModal from './components/GeminiInspectorModal';
import ParametricOracleModal from './components/ParametricOracleModal';
import PitchGuideModal from './components/PitchGuideModal';

export default function App() {
  // Active Corridor
  const [activeCorridor, setActiveCorridor] = useState('kochi');
  const [corridors, setCorridors] = useState([]);

  // Hydrodynamic parameters
  const [surge, setSurge] = useState(1.85);
  const [inflow, setInflow] = useState(550.0);
  const [hours, setHours] = useState(6.0);
  const [activeScenario, setActiveScenario] = useState('compound_cyclone_landfall');

  // Simulation State
  const [simData, setSimData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const [isPitchOpen, setIsPitchOpen] = useState(false);
  const [inspectionData, setInspectionData] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // WebSocket Live Messages
  const [messages, setMessages] = useState([]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Fetch available corridors on mount
  useEffect(() => {
    fetch('/api/corridors')
      .then(res => res.json())
      .then(data => setCorridors(data))
      .catch(err => console.error('Failed to load corridors:', err));
  }, []);

  // Run full simulation
  const runSimulation = async (s = surge, inf = inflow, h = hours, cid = activeCorridor) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corridor_id: cid,
          ocean_surge_m: Number(s),
          river_inflow_m3s: Number(inf),
          hours_to_landfall: Number(h)
        })
      });
      const data = await resp.json();
      if (data.success) {
        setSimData(data);
      }
    } catch (err) {
      console.error('Simulation call failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Change active corridor
  const handleSelectCorridor = (cid) => {
    setActiveCorridor(cid);
    // Set appropriate baseline for chosen corridor
    if (cid === 'chennai') {
      setSurge(1.80);
      setInflow(520.0);
      setActiveScenario('chennai_cyclone_michaung');
      runSimulation(1.80, 520.0, hours, cid);
    } else if (cid === 'mumbai') {
      setSurge(2.10);
      setInflow(600.0);
      setActiveScenario('mumbai_spring_tide_deluge');
      runSimulation(2.10, 600.0, hours, cid);
    } else if (cid === 'odisha') {
      setSurge(3.20);
      setInflow(880.0);
      setActiveScenario('odisha_supercyclone_surge');
      runSimulation(3.20, 880.0, hours, cid);
    } else {
      setSurge(1.85);
      setInflow(550.0);
      setActiveScenario('compound_cyclone_landfall');
      runSimulation(1.85, 550.0, hours, 'kochi');
    }
  };

  // Run Gemini Multimodal Inspection
  const triggerGeminiInspection = async () => {
    setIsInspecting(true);
    setIsGeminiOpen(true);
    try {
      const resp = await fetch('/api/gemini/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corridor_id: activeCorridor,
          water_depth_m: 0.50,
          surge_m: surge,
          target_facility: selectedAsset?.name || null
        })
      });
      const data = await resp.json();
      setInspectionData(data);
    } catch (err) {
      console.error('Gemini inspection failed:', err);
    } finally {
      setIsInspecting(false);
    }
  };

  // Trigger initial simulation on mount
  useEffect(() => {
    runSimulation(surge, inflow, hours, activeCorridor);
  }, []);

  // WebSocket Live Swarm Feed Listener
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/tactical-feed`;
    let ws = null;
    let reconnectTimeout = null;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsWsConnected(true);
        console.log('Connected to Chronos Swarm Tactical Event Bus.');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setMessages((prev) => [msg, ...prev].slice(0, 80));
        } catch (e) {
          console.error('Error parsing swarm WS frame:', e);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Handle Preset Scenario Switch
  const handleSelectScenario = (scenarioKey) => {
    setActiveScenario(scenarioKey);
    let s = 1.85, inf = 550.0, h = 6.0;

    if (scenarioKey === 'baseline_monsoon') {
      s = 0.40; inf = 280.0; h = 18.0;
    } else if (scenarioKey === 'compound_cyclone_landfall') {
      s = 1.85; inf = 550.0; h = 6.0;
    } else if (scenarioKey === 'catastrophic_2018_deluge') {
      s = 2.80; inf = 950.0; h = 3.0;
    } else if (scenarioKey === 'chennai_cyclone_michaung') {
      s = 1.80; inf = 520.0; h = 5.0;
    } else if (scenarioKey === 'mumbai_spring_tide_deluge') {
      s = 2.10; inf = 600.0; h = 4.0;
    } else if (scenarioKey === 'odisha_supercyclone_surge') {
      s = 3.20; inf = 880.0; h = 6.0;
    }

    setSurge(s);
    setInflow(inf);
    setHours(h);
    runSimulation(s, inf, h, activeCorridor);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Master Top Navigation Header */}
      <Header
        simData={simData}
        activeCorridor={activeCorridor}
        onSelectCorridor={handleSelectCorridor}
        corridors={corridors}
        onOpenPitchGuide={() => setIsPitchOpen(true)}
        onOpenGeminiInspector={triggerGeminiInspection}
        onOpenParametricOracle={() => setIsOracleOpen(true)}
        isLoading={isLoading}
      />

      {/* Main Mission Control Grid */}
      <main className="flex-1 p-3 grid grid-cols-1 xl:grid-cols-12 gap-3 overflow-hidden">
        {/* Left Column: Tactical Controls, Logistics & Live Feed (4 cols) */}
        <div className="xl:col-span-4 flex flex-col space-y-3 overflow-y-auto max-h-[calc(100vh-4rem)] pr-1">
          <ControlPanel
            surge={surge}
            setSurge={setSurge}
            inflow={inflow}
            setInflow={setInflow}
            hours={hours}
            setHours={setHours}
            activeCorridor={activeCorridor}
            onSelectCorridor={handleSelectCorridor}
            onRunSimulation={() => runSimulation(surge, inflow, hours, activeCorridor)}
            onSelectScenario={handleSelectScenario}
            activeScenario={activeScenario}
            isLoading={isLoading}
          />

          <LogisticsCountdown
            logisticsData={simData?.logistics}
            hoursToLandfall={hours}
          />

          <SwarmMissionFeed
            messages={messages}
            isConnected={isWsConnected}
          />
        </div>

        {/* Center & Right Column: Interactive Geospatial Canvas & Cascading Dark-Grid (8 cols) */}
        <div className="xl:col-span-8 flex flex-col space-y-3 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {/* Geospatial Digital Twin Canvas */}
          <div className="h-[460px] 2xl:h-[520px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <TacticalMap
              simData={simData}
              activeCorridor={activeCorridor}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>

          {/* Cascading Dark-Grid Matrix & Healthcare Lifeline Panel */}
          <div className="flex-1">
            <DarkGridMatrix
              gridData={simData?.grid}
              hydroData={simData?.hydro}
              onInspectHospital={(h) => {
                setSelectedAsset(h);
                triggerGeminiInspection();
              }}
            />
          </div>
        </div>
      </main>

      {/* Modal 1: Gemini 3.7 Flash Multimodal Geotechnical Inspector */}
      <GeminiInspectorModal
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
        inspectionData={inspectionData}
        isInspecting={isInspecting}
        activeCorridor={activeCorridor}
        surge={surge}
        inflow={inflow}
        selectedAsset={selectedAsset}
      />

      {/* Modal 2: Parametric Proof Oracle & Contingency Liquidity Seal */}
      <ParametricOracleModal
        isOpen={isOracleOpen}
        onClose={() => setIsOracleOpen(false)}
        oracleData={simData?.oracle}
        corridorId={activeCorridor}
      />

      {/* Modal 3: Built-In 3-Minute Hackathon Pitch Teleprompter */}
      <PitchGuideModal
        isOpen={isPitchOpen}
        onClose={() => setIsPitchOpen(false)}
        activeCorridor={activeCorridor}
        onSelectCorridor={handleSelectCorridor}
        onTriggerScenario={handleSelectScenario}
        onTriggerGemini={triggerGeminiInspection}
        onTriggerOracle={() => setIsOracleOpen(true)}
      />
    </div>
  );
}
