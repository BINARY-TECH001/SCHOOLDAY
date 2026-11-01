import React from "react";
import { AttendanceCalendarScreen } from "../src/features/attendance/AttendanceCalendarScreen";
import { Guard } from "../src/components/Guard";

export default function AttendanceCalendarRoute() {
  return (
    <Guard permissions={["attendance"]}>
      <AttendanceCalendarScreen />
    </Guard>
  );
}
