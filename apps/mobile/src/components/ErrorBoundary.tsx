import React from "react";
import { Button, Card, Screen, Txt } from "./ui";
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <Screen title="Let’s try that again">
          <Card>
            <Txt>
              This screen could not open. Your saved records have not been
              removed.
            </Txt>
            <Button
              title="Retry screen"
              onPress={() => this.setState({ failed: false })}
            />
          </Card>
        </Screen>
      );
    return this.props.children;
  }
}
