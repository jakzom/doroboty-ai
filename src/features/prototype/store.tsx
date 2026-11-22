import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  i02AnalysisPath,
  parseI02Analysis,
  type ApplicationAnalysis,
  type I02Materials,
} from "./i02-chat-contract";
import { initialState, transition, type Action, type State } from "./model";
import { parseState, StorageConflictError } from "./storage";
import { fetchI02Json } from "./i02-client";
import {
  loadBrowserState,
  saveBrowserState,
  pendingBrowserState,
  MEMORY_NOTICE,
} from "./browser-storage";
function useStore() {
  const [loaded, setLoaded] = useState(pendingBrowserState);
  const [ready, setReady] = useState(false);
  const durable = useRef(false);
  const [state, setState] = useState(loaded.state);
  const [issue, setIssue] = useState("");
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const latest = useRef(state);
  const savedRaw = useRef<string | null>(null);
  const blockedSave = useRef(false);
  const conflict = useRef(false);
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    void loadBrowserState().then((result) => {
      if (!active) return;
      latest.current = result.state;
      savedRaw.current = result.savedRaw;
      blockedSave.current = result.blocked;
      durable.current = result.durable;
      setLoaded({ state: result.state, original: result.original });
      setState(result.state);
      setIssue(result.issue);
      setBlocked(result.blocked);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const commit = useCallback(
    (update: State | ((current: State) => State), replace = false, background = false) => {
      const operation = writeQueue.current.then(async () => {
        let persisted = false;
        const next = typeof update === "function" ? update(latest.current) : update;
        if (replace) setRevision(++revisionRef.current);
        if (!background) setError("");
        if (!conflict.current && (!blockedSave.current || replace)) {
          if (!durable.current) {
            setIssue(MEMORY_NOTICE);
          } else {
            try {
              savedRaw.current = await saveBrowserState(next, savedRaw.current);
              persisted = true;
              blockedSave.current = false;
              setIssue("");
              setBlocked(false);
            } catch (error) {
              if (error instanceof StorageConflictError) {
                conflict.current = true;
                setBlocked(true);
              } else {
                // An ambiguous failed commit must not be followed by another blind write.
                durable.current = false;
              }
              setIssue((error as Error).message);
            }
          }
        }

        latest.current = next;
        setState(next);
        return persisted;
      });
      // A rejected transition must not prevent subsequent recovery operations.
      writeQueue.current = operation.catch(() => {});
      return operation;
    },
    [],
  );
  const run = useCallback(
    async (action: Action) => {
      try {
        return await commit((current) => transition(current, action));
      } catch (e) {
        setError(
          e instanceof Error && e.name !== "ZodError"
            ? e.message
            : "Sprawdź poprawność i długość wprowadzonych danych.",
        );
        return false;
      }
    },
    [commit],
  );

  const pendingId = state.applications.find(
    (item) => item.experienceAnalysis?.status === "pending",
  )?.id;
  useEffect(() => {
    if (!ready || !pendingId) return;
    const application = latest.current.applications.find((item) => item.id === pendingId);
    const pending = application?.experienceAnalysis;
    if (!application || pending?.status !== "pending") return;
    const controller = new AbortController();
    const materials = {
      answer: application.answer,
      cv: application.cv,
      jobTitle: application.jobTitle,
      roleDescription: pending.roleDescription,
    };

    async function processAnalysis() {
      const result = await fetchAnalysis(materials, controller.signal);
      if (controller.signal.aborted || revisionRef.current !== revision) return;
      await commit(
        (current) => {
          if (controller.signal.aborted || revisionRef.current !== revision) return current;
          return {
            ...current,
            applications: current.applications.map((item) =>
              item.id === pendingId && item.experienceAnalysis?.status === "pending"
                ? { ...item, experienceAnalysis: result }
                : item,
            ),
          };
        },
        false,
        true,
      );
    }
    const kickoff = window.setTimeout(() => void processAnalysis(), 0);
    return () => {
      window.clearTimeout(kickoff);
      controller.abort();
    };
  }, [ready, pendingId, revision, commit]);
  async function importState(raw: string) {
    try {
      const next = parseState(raw);
      return await commit(next, true);
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return {
    state,
    ready,
    issue,
    error,
    blocked,
    original: loaded.original,
    run,
    importState,
    clearError: () => setError(""),
    reset: () => commit(initialState(), true),
  };
}

async function fetchAnalysis(
  materials: I02Materials,
  signal: AbortSignal,
): Promise<ApplicationAnalysis> {
  const { roleDescription } = materials;
  try {
    const response = await fetchI02Json(
      i02AnalysisPath,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materials }),
      },
      signal,
    );
    if (!response) return { status: "unavailable", roleDescription };
    if ([404, 405, 503].includes(response.status))
      return { status: "unavailable", roleDescription };
    if (!response.ok) return { status: "failed", roleDescription };
    if (response.data === null) return { status: "unavailable", roleDescription };
    const result = parseI02Analysis(response.data, materials);
    return { status: "ready", roleDescription, result };
  } catch {
    return { status: "failed", roleDescription };
  }
}
type Store = ReturnType<typeof useStore>;
const Context = createContext<Store | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  if (!store.ready)
    return (
      <p role="status" className="prototype-notice">
        Wczytywanie lokalnego scenariusza…
      </p>
    );
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function usePrototype() {
  const store = useContext(Context);
  if (!store) throw new Error("PrototypeProvider is required");
  return store;
}
