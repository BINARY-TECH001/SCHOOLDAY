import { OfficialAcademicCalendarScreen } from "../src/features/OfficialAcademicCalendarScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["calendar"]}>
      <OfficialAcademicCalendarScreen />
    </Guard>
  );
}
