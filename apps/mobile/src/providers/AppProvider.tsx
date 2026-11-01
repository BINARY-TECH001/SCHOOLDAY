import React, { createContext, useContext, useEffect, useState } from "react";
import { z } from "zod";
import { ContextSchema } from "../domain/model";
import { MockSchoolServices } from "../services/mock/service";
import { SchoolServices } from "../services/contracts";
import { deviceStorage } from "../storage/device";
import { toast } from "sonner-native";

const services: SchoolServices = new MockSchoolServices(deviceStorage);
const PreferencesSchema = z.object({
  onboarded: z.boolean(),
  context: ContextSchema.nullable(),
  offline: z.boolean(),
});
type Preferences = z.infer<typeof PreferencesSchema>;
const initial: Preferences = {
  onboarded: false,
  context: null,
  offline: false,
};
async function loadPreferences(): Promise<Preferences> {
  await services.initialize();
  const raw = await deviceStorage.read("schoolday.preferences.v1");
  const parsed = raw ? PreferencesSchema.safeParse(JSON.parse(raw)) : null;
  const next = parsed?.success ? parsed.data : { ...initial };
  if (next.context) {
    try {
      services.snapshot(next.context);
    } catch {
      next.context = null;
      // Persist cleared context back to storage to avoid stale data on next launch
      void deviceStorage.write("schoolday.preferences.v1", JSON.stringify(next));
    }
  }
  return next;
}
function useApplication() {
  const [preferences, setPreferences] = useState(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const refresh = () => setRevision((r) => r + 1);
  const initialize = async () => {
    try {
      const next = await loadPreferences();
      setPreferences(next);
      setError(null);
      setReady(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to open local storage.",
      );
    }
  };
  useEffect(() => {
    let active = true;
    void loadPreferences().then(
      (next) => {
        if (!active) return;
        setPreferences(next);
        setReady(true);
      },
      (reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to open local storage.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, []);
  const update = async (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    await deviceStorage.write("schoolday.preferences.v1", JSON.stringify(next));
    setPreferences(next);
    setFeedback("");
  };
  const act = async <T,>(
    task: () => Promise<T>,
    message = "Saved on device",
  ) => {
    setBusy(true);
    setFeedback("");
    try {
      const result = await task();
      refresh();
      setFeedback(message);
      if (message) {
        toast.success(message);
      }
      return result;
    } catch (e) {
      const errMsg =
        e instanceof z.ZodError
          ? e.issues.map((i) => i.message).join(". ")
          : e instanceof Error
            ? e.message
            : "Something went wrong. Please retry.";
      setFeedback(errMsg);
      toast.error(errMsg);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    await services.reset();
    await deviceStorage.remove("schoolday.preferences.v1");
    setPreferences(initial);
    refresh();
    setError(null);
    setReady(true);
  };
  return {
    ...preferences,
    ready,
    error,
    services,
    revision,
    refresh,
    busy,
    feedback,
    setFeedback,
    update,
    act,
    reset,
    initialize,
  };
}
type Application = ReturnType<typeof useApplication>;
const AppContext = createContext<Application | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const app = useApplication();
  return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
export function useSchool() {
  const app = useApp();
  if (!app.context) throw new Error("Select a demo membership first.");
  const data = app.services.snapshot(app.context);
  const school = data.schools[0];
  if (!school) throw new Error("School not found.");
  return { ...app, context: app.context, data, school };
}
