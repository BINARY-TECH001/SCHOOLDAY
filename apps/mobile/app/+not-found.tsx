import { router } from "expo-router";
import { Button, Screen, Txt } from "../src/components/ui";
export default function NotFound() {
  return (
    <Screen title="This page isn’t here">
      <Txt>
        The link may be incomplete. Return to your workspace to continue.
      </Txt>
      <Button title="Go to Schoolday" onPress={() => router.replace("/")} />
    </Screen>
  );
}
