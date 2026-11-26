import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CONTENT_REGISTRY } from './content';
import { GameState, PlayerProfile, SaveRecord } from './engine/types';
import { advanceChoice, commitTransition, createInitialState } from './engine/scheduler';
import {
  clearActiveRun,
  deleteManualSlot,
  loadActiveRun,
  loadCheckpoints,
  loadManualSlots,
  loadMetaArchive,
  loadPrefs,
  recordCheckpoint,
  saveActiveRun,
  saveManualSlot,
  savePrefs,
  STORAGE_KEYS,
  syncMetaFromState,
  UserPrefs,
  validateAndNormalizeState,
} from './engine/storage';
import { TitleScreen } from './ui/TitleScreen';
import { OpeningWizard } from './ui/OpeningWizard';
import { DrawerTab, TopStatusBar } from './ui/TopStatusBar';
import { ReaderView } from './ui/ReaderView';
import { DrawerPanels } from './ui/DrawerPanels';
import { EndingView } from './ui/EndingView';

type ScreenMode = 'title' | 'wizard' | 'playing';

export const App: React.FC = () => {
  const [prefs, setPrefs] = useState<UserPrefs>(() => loadPrefs());
  const [state, setState] = useState<GameState | null>(() =>
    loadActiveRun(undefined, CONTENT_REGISTRY)
  );
  const [screen, setScreen] = useState<ScreenMode>('title');
  const [activeDrawer, setActiveDrawer] = useState<DrawerTab>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  const [checkpoints, setCheckpoints] = useState<SaveRecord[]>(() =>
    loadCheckpoints(undefined, CONTENT_REGISTRY)
  );
  const [manualSlots, setManualSlots] = useState<SaveRecord[]>(() =>
    loadManualSlots(undefined, CONTENT_REGISTRY)
  );
  const [meta, setMeta] = useState(() => loadMetaArchive(undefined, CONTENT_REGISTRY));
  const [externalRunChanged, setExternalRunChanged] = useState(false);
  const isAdvancingRef = useRef(false);
  const mainShellRef = useRef<HTMLDivElement | null>(null);
  const skipNextPrefsWriteRef = useRef(false);
  const screenRef = useRef<ScreenMode>(screen);
  screenRef.current = screen;
  const stateRef = useRef<GameState | null>(state);
  stateRef.current = state;

  useLayoutEffect(() => {
    const el = mainShellRef.current as (HTMLDivElement & { inert?: boolean }) | null;
    if (el) {
      el.inert = activeDrawer !== null;
    }
  }, [activeDrawer]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.content = prefs.theme === 'ink' ? '#131210' : '#f6f0e4';
    }
    if (skipNextPrefsWriteRef.current) {
      skipNextPrefsWriteRef.current = false;
      return;
    }
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.storageArea && e.storageArea !== window.localStorage) return;
      const key = e.key;
      if (key === null || key === STORAGE_KEYS.MANUAL_SLOTS) {
        setManualSlots(loadManualSlots(undefined, CONTENT_REGISTRY));
      }
      if (key === null || key === STORAGE_KEYS.AUTO_CHECKPOINTS) {
        setCheckpoints(loadCheckpoints(undefined, CONTENT_REGISTRY));
      }
      if (key === null || key === STORAGE_KEYS.META_ARCHIVE) {
        setMeta(loadMetaArchive(undefined, CONTENT_REGISTRY));
      }
      if (key === null || key === STORAGE_KEYS.PREFS) {
        skipNextPrefsWriteRef.current = true;
        setPrefs(loadPrefs());
      }
      if (key === null || key === STORAGE_KEYS.ACTIVE_RUN) {
        const latest = loadActiveRun(undefined, CONTENT_REGISTRY);
        if (screenRef.current !== 'playing') {
          setState(latest);
          setExternalRunChanged(false);
        } else {
          const cur = stateRef.current;
          const diverged =
            !cur ||
            !latest ||
            cur.runId !== latest.runId ||
            cur.currentSceneId !== latest.currentSceneId ||
            cur.totalActions !== latest.totalActions ||
            cur.endingId !== latest.endingId ||
            Boolean(cur.pendingTransition) !== Boolean(latest.pendingTransition);
          if (diverged) {
            setExternalRunChanged(true);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  useEffect(() => {
    isAdvancingRef.current = false;
  }, [state]);

  useEffect(() => {
    if (screen === 'title' || screen === 'wizard') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [screen]);

  const toggleTheme = () =>
    setPrefs((p) => ({
      ...p,
      theme: p.theme === 'parchment' ? 'ink' : 'parchment',
    }));

  const toggleTianji = () =>
    setPrefs((p) => ({ ...p, tianjiInsight: !p.tianjiInsight }));

  const toggleInstantText = () =>
    setPrefs((p) => ({ ...p, instantText: !p.instantText }));

  const handleCloseDrawer = useCallback(() => setActiveDrawer(null), []);

  const handleStartNewRun = (profile: PlayerProfile) => {
    if (state && !state.endingId && state.totalActions > 0) {
      recordCheckpoint(
        state,
        `往世封存 · ${state.profile.name}`,
        CONTENT_REGISTRY,
        'auto'
      );
    }
    const fresh = createInitialState(profile, CONTENT_REGISTRY);
    saveActiveRun(fresh);
    const updatedMeta = syncMetaFromState(
      fresh,
      { incrementRuns: true },
      undefined,
      CONTENT_REGISTRY
    );
    const startScene = CONTENT_REGISTRY.scenes[fresh.currentSceneId];
    const updatedCp = recordCheckpoint(
      fresh,
      startScene?.checkpointLabel ?? '卷一初启',
      CONTENT_REGISTRY,
      'auto'
    );
    setState(fresh);
    setMeta(updatedMeta);
    setCheckpoints(updatedCp);
    setExternalRunChanged(false);
    setLoadNonce((n) => n + 1);
    setActiveDrawer(null);
    setScreen('playing');
  };

  const handleSelectChoice = (choiceId: string) => {
    if (!state || state.pendingTransition || isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    try {
      const step = advanceChoice(state, choiceId, CONTENT_REGISTRY);
      saveActiveRun(step.state);
      setState(step.state);
      setExternalRunChanged(false);
      setMeta(syncMetaFromState(step.state, undefined, undefined, CONTENT_REGISTRY));

      if (step.shouldCheckpoint) {
        setCheckpoints(
          recordCheckpoint(
            step.state,
            step.checkpointLabel ?? '关键节点',
            CONTENT_REGISTRY,
            'auto'
          )
        );
      }
    } catch (err) {
      isAdvancingRef.current = false;
      throw err;
    }
  };

  const handleCommitTransition = () => {
    if (!state || !state.pendingTransition || isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    try {
      const step = commitTransition(state, CONTENT_REGISTRY);
      saveActiveRun(step.state);
      setState(step.state);
      setExternalRunChanged(false);
      setMeta(syncMetaFromState(step.state, undefined, undefined, CONTENT_REGISTRY));

      if (step.shouldCheckpoint) {
        setCheckpoints(
          recordCheckpoint(
            step.state,
            step.checkpointLabel ?? '关键节点',
            CONTENT_REGISTRY,
            'auto'
          )
        );
      }
    } catch (err) {
      isAdvancingRef.current = false;
      throw err;
    }
  };

  const handleDirectStateUpdate = (next: GameState) => {
    saveActiveRun(next);
    setState(next);
    setExternalRunChanged(false);
    setMeta(syncMetaFromState(next, undefined, undefined, CONTENT_REGISTRY));
  };

  const handleLoadSave = (record: SaveRecord) => {
    const validated = validateAndNormalizeState(record.state, CONTENT_REGISTRY);
    if (!validated) return;
    saveActiveRun(validated);
    setState(validated);
    setExternalRunChanged(false);
    setMeta(syncMetaFromState(validated, undefined, undefined, CONTENT_REGISTRY));
    setLoadNonce((n) => n + 1);
    setActiveDrawer(null);
    setScreen('playing');
    if (!validated.pendingTransition) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleImportState = (imported: GameState) => {
    const validated = validateAndNormalizeState(imported, CONTENT_REGISTRY);
    if (!validated) return;
    saveActiveRun(validated);
    setState(validated);
    setExternalRunChanged(false);
    setMeta(syncMetaFromState(validated, undefined, undefined, CONTENT_REGISTRY));
    setLoadNonce((n) => n + 1);
    setActiveDrawer(null);
    setScreen('playing');
    if (!validated.pendingTransition) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleSyncExternalRun = () => {
    const latest = loadActiveRun(undefined, CONTENT_REGISTRY);
    setExternalRunChanged(false);
    if (latest) {
      setState(latest);
      setLoadNonce((n) => n + 1);
      if (!latest.pendingTransition) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } else {
      setState(null);
      setScreen('title');
    }
  };

  const currentScene =
    state && Object.prototype.hasOwnProperty.call(CONTENT_REGISTRY.scenes, state.currentSceneId)
      ? CONTENT_REGISTRY.scenes[state.currentSceneId]
      : undefined;
  const currentEnding =
    state?.endingId &&
    Object.prototype.hasOwnProperty.call(CONTENT_REGISTRY.endings, state.endingId)
      ? CONTENT_REGISTRY.endings[state.endingId]
      : undefined;

  return (
    <div className="app-shell">
      <div
        className="app-backdrop-root"
        ref={mainShellRef}
        aria-hidden={activeDrawer !== null || undefined}
      >
        {screen === 'title' && (
          <TitleScreen
            hasActiveRun={Boolean(state)}
            activeRunEnded={Boolean(state?.endingId)}
            meta={meta}
            totalTruthClues={Object.keys(CONTENT_REGISTRY.truthClues).length}
            totalEndings={Object.keys(CONTENT_REGISTRY.endings).length}
            prefs={prefs}
            onContinue={() => setScreen('playing')}
            onStartNew={() => setScreen('wizard')}
            onOpenSaves={() => setActiveDrawer('saves')}
            onOpenMeta={() => setActiveDrawer('meta')}
            onToggleTheme={toggleTheme}
            onToggleInstantText={toggleInstantText}
          />
        )}

        {screen === 'wizard' && (
          <OpeningWizard
            registry={CONTENT_REGISTRY}
            hasActiveRun={Boolean(state)}
            onCancel={() => setScreen('title')}
            onComplete={handleStartNewRun}
          />
        )}

        {screen === 'playing' && state && currentScene && (
          <>
            <TopStatusBar
              state={state}
              registry={CONTENT_REGISTRY}
              prefs={prefs}
              activeDrawer={activeDrawer}
              onOpenDrawer={setActiveDrawer}
              onToggleTianji={toggleTianji}
              onToggleTheme={toggleTheme}
              onGoTitle={() => {
                setActiveDrawer(null);
                setScreen('title');
              }}
            />

            {state.endingId && currentEnding ? (
              <EndingView
                state={state}
                registry={CONTENT_REGISTRY}
                onRewindSaves={() => setActiveDrawer('saves')}
                onStartNewRun={() => setScreen('wizard')}
                onOpenMeta={() => setActiveDrawer('meta')}
                onGoTitle={() => setScreen('title')}
              />
            ) : (
              <ReaderView
                state={state}
                scene={currentScene}
                registry={CONTENT_REGISTRY}
                tianjiInsight={prefs.tianjiInsight}
                instantText={prefs.instantText}
                drawerOpen={activeDrawer !== null}
                loadNonce={loadNonce}
                externalRunChanged={externalRunChanged}
                onSyncExternalRun={handleSyncExternalRun}
                onSelectChoice={handleSelectChoice}
                onCommitTransition={handleCommitTransition}
                onUpdateState={handleDirectStateUpdate}
              />
            )}
          </>
        )}

        {screen === 'playing' && (!state || !currentScene) && (
          <main className="recovery-container">
            <h1>命盘节点未能承接</h1>
            <p>
              当前记录所处卷目已失效或残损。你可以打开命盘回溯往期刻痕，或返回封面重开一世。
            </p>
            <div className="recovery-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => setActiveDrawer('saves')}
              >
                打开命盘回溯
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  clearActiveRun();
                  setState(null);
                  setScreen('title');
                }}
              >
                清除残档并返回封面
              </button>
            </div>
          </main>
        )}
      </div>

      <DrawerPanels
        activeTab={activeDrawer}
        state={state}
        registry={CONTENT_REGISTRY}
        meta={meta}
        checkpoints={checkpoints}
        manualSlots={manualSlots}
        tianjiInsight={prefs.tianjiInsight}
        instantText={prefs.instantText}
        onToggleInstantText={toggleInstantText}
        onClose={handleCloseDrawer}
        onCreateManualSave={(label) => {
          if (!state) return;
          setManualSlots(saveManualSlot(state, label, CONTENT_REGISTRY));
        }}
        onDeleteManualSave={(id) =>
          setManualSlots(deleteManualSlot(id, undefined, CONTENT_REGISTRY))
        }
        onLoadSave={handleLoadSave}
        onImportState={handleImportState}
      />
    </div>
  );
};
