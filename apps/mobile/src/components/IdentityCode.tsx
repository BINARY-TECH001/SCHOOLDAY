import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Txt } from "./ui";
/** Opaque demo lookup reference only. No personal data is encoded. */
export function IdentityCode({ reference }: { reference: string }) {
  return (
    <View
      accessible
      accessibilityLabel="Preview identity QR code. Contains only an opaque reference."
      style={{ alignItems: "center", paddingVertical: 16, gap: 12 }}
    >
      <QRCode
        value={"schoolday:ref:" + reference}
        size={144}
        quietZone={12}
        color="#14213e"
      />
      <Txt tone="muted">Identity reference · no personal details</Txt>
    </View>
  );
}
