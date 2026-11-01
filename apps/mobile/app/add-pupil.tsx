import React from "react";
import { AddPupilScreen } from "../src/features/AddPupilScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["students", "classes"]}>
      <AddPupilScreen />
    </Guard>
  );
}
