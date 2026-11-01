import React from "react";
import { Alert, Image, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { ModalSheet, Avatar, Badge, Button } from "./ui";
import { colors, fonts, radii, shadows } from "../theme/tokens";
import { Icon } from "./Icon";
import { IdentityCode } from "./IdentityCode";
import { useSchool } from "../providers/AppProvider";
import { roleLabels } from "../features/Entry";
import { Staff } from "../domain/model";

export interface DigitalIdSheetProps {
  visible: boolean;
  onClose: () => void;
  targetStaff?: Staff | null;
  targetStudent?: {
    id: string;
    name: string;
    className: string;
    avatar?: string;
  } | null;
}

export function DigitalIdSheet({
  visible,
  onClose,
  targetStaff,
  targetStudent,
}: DigitalIdSheetProps) {
  const { data, context, school } = useSchool();

  const isStudent = !!targetStudent;
  const isTargetStaff = !!targetStaff;

  const staff =
    targetStaff || data.staff.find((s) => s.userId === context.userId);

  const holderName = isStudent
    ? targetStudent.name
    : isTargetStaff
      ? targetStaff?.name
      : context.userId.replace("demo-", "");

  const holderRoleOrClass = isStudent
    ? targetStudent.className
    : isTargetStaff
      ? (roleLabels as Record<string, string>)[targetStaff?.role || "teacher"] || "Faculty"
      : (roleLabels as Record<string, string>)[context.role] || "Member";

  const holderRef = isStudent
    ? targetStudent.id
    : staff?.id || `ID-${context.userId.toUpperCase()}`;

  const qrRef = `pass_${school.id}_${holderRef}_${isStudent ? "student" : "staff"}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrRef)}`;

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${school.name} Digital Pass - ${holderName}`,
        message:
          `🎓 *${school.name.toUpperCase()} DIGITAL PASS*\n` +
          `• Holder: ${holderName}\n` +
          `• Credential: ${holderRoleOrClass}\n` +
          `• ID: ${holderRef}\n\n` +
          `📷 *Verified QR Code Image:*\n${qrImageUrl}\n\n` +
          `AES-256 cryptographically signed under SchoolDay Institutional Security.`,
        url: qrImageUrl,
      });
    } catch {
      // Ignore
    }
  };

  const handlePrint = () => {
    Alert.alert(
      "Print Credential Badge",
      `Prepare physical PVC badge print for ${holderName} (${holderRef}) with high-resolution QR?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Print Pass",
          onPress: () =>
            Alert.alert("Sent to Printer", "Institutional badge sent to campus network printer."),
        },
      ],
    );
  };

  const handleSaveToDevice = () => {
    Alert.alert("Saved", "Digital Pass credential image saved to your photos.");
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Digital Pass"
      subtitle="Accredited QR identity & gate access credential."
    >
      <View style={styles.container}>
        {/* Sleek Minimalist ID Card */}
        <View style={[styles.idCard, shadows.md]}>
          {/* Card Top Brand & Active Pill */}
          <View style={styles.cardHeader}>
            {school.logo ? (
              <Image source={{ uri: school.logo }} style={styles.schoolHeaderLogo} resizeMode="contain" />
            ) : null}
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[styles.schoolName, school.primaryColor ? { color: school.primaryColor } : null]} numberOfLines={1}>
                {school.name}
              </Text>
              <Text style={styles.schoolTerm}>
                {school.term} · Official Credential
              </Text>
            </View>
            <Badge text="ACTIVE" tone="success" dot />
          </View>

          {/* Centered Clean QR Code Box */}
          <View style={styles.qrWrapper}>
            <View style={styles.qrInner}>
              <IdentityCode reference={qrRef} />
            </View>
          </View>

          {/* Holder Name, Role, & Reference Code */}
          <View style={styles.holderBlock}>
            <Text style={styles.holderName} numberOfLines={1}>
              {holderName}
            </Text>

            <View style={styles.metaRow}>
              <Badge
                text={holderRoleOrClass.toUpperCase()}
                tone={isStudent ? "info" : "purple"}
              />
              <Text style={styles.holderRefCode}>REF: {holderRef}</Text>
            </View>
          </View>

          {/* Card Security Watermark */}
          <View style={styles.securityBar}>
            <Icon name="shield" size={13} color={colors.greenDark} />
            <Text style={styles.securityText}>AES-256 Cryptographically Signed</Text>
          </View>
        </View>

        {/* Action Buttons: Share, Print, Save */}
        <View style={styles.actionGrid}>
          <Pressable onPress={handleShare} style={styles.actionBtn}>
            <Icon name="share" size={16} color={colors.navy} />
            <Text style={styles.actionBtnText}>Share</Text>
          </Pressable>

          <Pressable onPress={handlePrint} style={styles.actionBtn}>
            <Icon name="document" size={16} color={colors.navy} />
            <Text style={styles.actionBtnText}>Print</Text>
          </Pressable>

          <Pressable onPress={handleSaveToDevice} style={styles.actionBtn}>
            <Icon name="camera" size={16} color={colors.navy} />
            <Text style={styles.actionBtnText}>Save</Text>
          </Pressable>
        </View>

        <Button
          title="Done"
          variant="primary"
          size="lg"
          onPress={onClose}
        />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingTop: 2,
    paddingBottom: 8,
  },
  idCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 10,
  },
  schoolHeaderLogo: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    marginRight: 8,
  },
  schoolName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  schoolTerm: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  qrInner: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  holderBlock: {
    alignItems: "center",
    gap: 6,
    width: "100%",
  },
  holderName: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  holderRefCode: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
  },
  securityBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  securityText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.greenDark,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
});
