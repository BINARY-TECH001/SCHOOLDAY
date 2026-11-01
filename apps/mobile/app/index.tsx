import { Redirect } from "expo-router";
import { Entry } from "../src/features/Entry";
import { useApp } from "../src/providers/AppProvider";
export default function Index() {
  const app = useApp();
  return app.ready && app.context ? <Redirect href="/home" /> : <Entry />;
}
