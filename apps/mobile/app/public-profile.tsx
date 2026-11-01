import React from "react";
import { PublicProfileScreen } from "../src/features/profiles/screens/PublicProfileScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["directory", "students", "profile"]}>
      <PublicProfileScreen />
    </Guard>
  );
}
