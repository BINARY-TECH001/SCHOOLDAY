import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Button } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { money, Student, Invoice } from "../../../domain/model";
import { useSchool } from "../../../providers/AppProvider";

interface DefaulterItem {
  student: Student;
  invoices: Invoice[];
  totalBalanceKobo: number;
  daysOverdue: number;
  isOverdue: boolean;
  guardianName: string;
}

interface DefaulterAutomationModalProps {
  visible: boolean;
  onClose: () => void;
  defaulters: DefaulterItem[];
  onBatchDispatched?: (count: number) => void;
}

export function DefaulterAutomationModal({
  visible,
  onClose,
  defaulters,
  onBatchDispatched,
}: DefaulterAutomationModalProps) {
  const { school, context, services, act, busy } = useSchool();

  // Channels
  const [inAppNotice, setInAppNotice] = useState(true);
  const [pushNotification, setPushNotification] = useState(true);
  const [emailCircular, setEmailCircular] = useState(true);
  const [smsAlert, setSmsAlert] = useState(false);

  // Frequency
  const [frequency, setFrequency] = useState<"immediate" | "weekly" | "days_before">("weekly");

  // Target Scope
  const [targetScope, setTargetScope] = useState<"all" | "critical" | "custom">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() =>
    defaulters.map((d) => d.student.id),
  );

  // Message Template
  const [template, setTemplate] = useState(
    "Dear Parent, this is an official reminder from {school_name} regarding {pupil_name}'s outstanding fee balance of {amount_due}. Kindly settle via our portal or bank transfer.",
  );

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    setSelectedStudentIds(defaulters.map((d) => d.student.id));
  };

  const deselectAll = () => {
    setSelectedStudentIds([]);
  };

  const eligibleDefaulters = defaulters.filter((d) => {
    if (targetScope === "all") return true;
    if (targetScope === "critical") return d.isOverdue && d.daysOverdue >= 14;
    return selectedStudentIds.includes(d.student.id);
  });

  const handleRunDispatch = async () => {
    if (eligibleDefaulters.length === 0) {
      toast.error("No Recipients Selected", {
        description: "Please select at least one student to send reminders to.",
      });
      return;
    }

    if (!inAppNotice && !pushNotification && !emailCircular && !smsAlert) {
      toast.error("Channel Required", {
        description: "Please enable at least one notification channel.",
      });
      return;
    }

    let successCount = 0;
    try {
      await act(async () => {
        for (const item of eligibleDefaulters) {
          const inv = item.invoices[0];
          if (inv) {
            try {
              await services.remind(context, inv.id);
              successCount++;
            } catch {
              // continue
            }
          }
        }
      }, `Automated reminder dispatched to ${eligibleDefaulters.length} parents across selected channels!`);

      onBatchDispatched?.(successCount);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Automated reminder dispatch failed.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconTile}>
              <Icon name="sms" size={20} color={colors.orange} filled />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>Automate Defaulter Reminders</Text>
              <Text style={styles.subtitle}>
                Multi-Channel Debt Recovery & Parent Notices
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Icon name="close" size={20} color={colors.slate400} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Delivery Channels */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DELIVERY CHANNELS</Text>
              <View style={styles.channelList}>
                <View style={styles.channelRow}>
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelName}>In-App Notification</Text>
                    <Text style={styles.channelDesc}>
                      School bulletin alert & invoice badge on parent app
                    </Text>
                  </View>
                  <Switch
                    value={inAppNotice}
                    onValueChange={setInAppNotice}
                    trackColor={{ false: colors.slate200, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>

                <View style={styles.channelRow}>
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelName}>Push Notification</Text>
                    <Text style={styles.channelDesc}>
                      Instant lockscreen push notification to parent devices
                    </Text>
                  </View>
                  <Switch
                    value={pushNotification}
                    onValueChange={setPushNotification}
                    trackColor={{ false: colors.slate200, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>

                <View style={styles.channelRow}>
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelName}>Email Circular</Text>
                    <Text style={styles.channelDesc}>
                      Formatted PDF invoice and settlement breakdown to guardian email
                    </Text>
                  </View>
                  <Switch
                    value={emailCircular}
                    onValueChange={setEmailCircular}
                    trackColor={{ false: colors.slate200, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>

                <View style={styles.channelRow}>
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelName}>SMS Mobile Dispatch</Text>
                    <Text style={styles.channelDesc}>
                      Direct cellular SMS text to verified guardian phone number
                    </Text>
                  </View>
                  <Switch
                    value={smsAlert}
                    onValueChange={setSmsAlert}
                    trackColor={{ false: colors.slate200, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>
              </View>
            </View>

            {/* Automation Frequency */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AUTOMATION SCHEDULE</Text>
              <View style={styles.scheduleRow}>
                {[
                  { id: "immediate" as const, label: "Immediate\nRun" },
                  { id: "weekly" as const, label: "Weekly on\nMondays" },
                  { id: "days_before" as const, label: "3 Days Before\nDue Date" },
                ].map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setFrequency(s.id)}
                    style={[
                      styles.schedulePill,
                      frequency === s.id && styles.schedulePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.schedulePillText,
                        frequency === s.id && styles.schedulePillTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Target Scope */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>TARGET AUDIENCE</Text>
                <Text style={styles.targetCountBadge}>
                  {eligibleDefaulters.length} Parents Selected
                </Text>
              </View>

              <View style={styles.scopeTabs}>
                <Pressable
                  onPress={() => setTargetScope("all")}
                  style={[
                    styles.scopeTab,
                    targetScope === "all" && styles.scopeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.scopeTabText,
                      targetScope === "all" && styles.scopeTabTextActive,
                    ]}
                  >
                    All Overdue ({defaulters.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTargetScope("critical")}
                  style={[
                    styles.scopeTab,
                    targetScope === "critical" && styles.scopeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.scopeTabText,
                      targetScope === "critical" && styles.scopeTabTextActive,
                    ]}
                  >
                    Critical (&gt;14d)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTargetScope("custom")}
                  style={[
                    styles.scopeTab,
                    targetScope === "custom" && styles.scopeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.scopeTabText,
                      targetScope === "custom" && styles.scopeTabTextActive,
                    ]}
                  >
                    Pick Students
                  </Text>
                </Pressable>
              </View>

              {targetScope === "custom" && (
                <View style={styles.customSelectArea}>
                  <View style={styles.customSelectHeader}>
                    <Text style={styles.customSelectHelper}>Select students to include:</Text>
                    <View style={styles.customSelectActions}>
                      <Pressable onPress={selectAll} style={styles.actionLink}>
                        <Text style={styles.actionLinkText}>All</Text>
                      </Pressable>
                      <Text style={styles.actionDivider}>•</Text>
                      <Pressable onPress={deselectAll} style={styles.actionLink}>
                        <Text style={styles.actionLinkText}>None</Text>
                      </Pressable>
                    </View>
                  </View>

                  <ScrollView style={styles.studentChecklist} nestedScrollEnabled>
                    {defaulters.map((item) => {
                      const isSelected = selectedStudentIds.includes(item.student.id);
                      return (
                        <Pressable
                          key={item.student.id}
                          style={[
                            styles.studentCheckRow,
                            isSelected && styles.studentCheckRowSelected,
                          ]}
                          onPress={() => toggleStudent(item.student.id)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Icon name="verify" size={12} color={colors.white} filled />
                            )}
                          </View>
                          <View style={styles.studentCheckDetails}>
                            <Text style={styles.studentCheckName}>{item.student.name}</Text>
                            <Text style={styles.studentCheckSub}>
                              {item.student.className} • {item.guardianName}
                            </Text>
                          </View>
                          <Text style={styles.studentCheckAmount}>
                            {money(item.totalBalanceKobo)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Template Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MESSAGE TEMPLATE</Text>
              <TextInput
                style={styles.templateInput}
                multiline
                numberOfLines={3}
                value={template}
                onChangeText={setTemplate}
              />
              <Text style={styles.templateTokensHint}>
                Variables: {"{pupil_name}"}, {"{amount_due}"}, {"{school_name}"}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title={`Run Automated Dispatch Now (${eligibleDefaulters.length})`}
              variant="primary"
              size="lg"
              loading={busy}
              onPress={handleRunDispatch}
            />
            <Button
              title="Close"
              variant="ghost"
              size="md"
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    maxHeight: "92%",
    paddingBottom: spacing.xl,
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate700,
    letterSpacing: 0.5,
  },
  targetCountBadge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  channelList: {
    backgroundColor: colors.slate50,
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  channelInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  channelName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  channelDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  schedulePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  schedulePillActive: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.orange,
  },
  schedulePillText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate700,
    textAlign: "center",
    lineHeight: 15,
  },
  schedulePillTextActive: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  scopeTabs: {
    flexDirection: "row",
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: 3,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radii.sm,
  },
  scopeTabActive: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  scopeTabText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate600,
  },
  scopeTabTextActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  customSelectArea: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.slate50,
    padding: spacing.sm,
  },
  customSelectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customSelectHelper: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  customSelectActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionLink: {
    paddingHorizontal: 4,
  },
  actionLinkText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  actionDivider: {
    color: colors.slate300,
    fontSize: 10,
  },
  studentChecklist: {
    maxHeight: 160,
  },
  studentCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  studentCheckRowSelected: {
    backgroundColor: colors.orangeLight,
    borderRadius: radii.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.slate400,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  studentCheckDetails: {
    flex: 1,
  },
  studentCheckName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  studentCheckSub: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.slate500,
  },
  studentCheckAmount: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.red,
  },
  templateInput: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
    backgroundColor: colors.slate50,
    textAlignVertical: "top",
    minHeight: 80,
  },
  templateTokensHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate400,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
});
