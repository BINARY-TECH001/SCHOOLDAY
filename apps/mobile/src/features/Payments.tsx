import { parseNaira } from "../domain/payments";
import { useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Screen,
  Section,
  Txt,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon, IconName } from "../components/Icon";
import { balance, money, Payment as PaymentModel } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import { IdentityCode } from "../components/IdentityCode";

export function Payment() {
  const { invoice } = useLocalSearchParams<{ invoice?: string }>();
  const { context, data, services, act, offline, busy, school } = useSchool();
  const eligible = data.invoices.filter((i) => balance(i) > 0);
  const [ids, setIds] = useState<string[]>(invoice ? [invoice] : []);
  const max = eligible
    .filter((i) => ids.includes(i.id))
    .reduce((s, i) => s + balance(i), 0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentModel["method"]>("transfer");
  const [fail, setFail] = useState(false);
  const [review, setReview] = useState(false);
  const [key] = useState(() => "PAY-" + Date.now());

  // Countdown timer for virtual account transfer
  const [countdown, setCountdown] = useState(900); // 15 mins
  useEffect(() => {
    if (method === "transfer") {
      const interval = setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : 900));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [method]);

  const kobo = amount === "" ? max : (parseNaira(amount) ?? NaN);

  const submit = () =>
    void act(async () => {
      const result = await services.pay(
        context,
        { invoiceIds: ids, amount: kobo, method, fail, key },
        offline,
      );
      router.replace({ pathname: "/receipt", params: { id: result.id } });
    }, "");

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Screen
      title={review ? "Review & Confirm" : "School Fee Checkout"}
      subtitle={
        review
          ? "Verify invoice allocations before proceeding."
          : "Instant fee clearance with dedicated Nigerian virtual account or card."
      }
      back={() => (review ? setReview(false) : router.back())}
    >
      {review ? (
        <View style={{ gap: 14 }}>
          {/* Review Summary Card */}
          <Card variant="dark" style={styles.reviewCard}>
            <View style={{ alignItems: "center", paddingVertical: 14, gap: 12 }}>
              <View style={styles.reviewIconBox}>
                <Icon name="wallet" size={32} color={colors.orange} filled />
              </View>
              <Text style={styles.reviewPayingLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.reviewAmountText}>{money(kobo)}</Text>
              <Badge text={method.toUpperCase() + " PAYMENT"} tone="dark" />
            </View>

            <View style={styles.reviewMetaBox}>
              <View style={styles.reviewMetaRow}>
                <Text style={styles.reviewMetaLabel}>Institution</Text>
                <Text style={styles.reviewMetaVal}>{school.name}</Text>
              </View>
              <View style={styles.reviewMetaRow}>
                <Text style={styles.reviewMetaLabel}>Academic Term</Text>
                <Text style={styles.reviewMetaVal}>{school.term}</Text>
              </View>
              <View style={styles.reviewMetaRow}>
                <Text style={styles.reviewMetaLabel}>Selected Invoices</Text>
                <Text style={styles.reviewMetaVal}>{ids.length} invoice(s)</Text>
              </View>
            </View>
          </Card>

          {/* Virtual Account Instructions (if transfer) */}
          {method === "transfer" && (
            <Card style={styles.virtualAccountCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.vaHeading}>DEDICATED VIRTUAL ACCOUNT</Text>
                  <Text style={styles.vaSub}>Transfer exact amount to clear instantly</Text>
                </View>
                <Badge text={`EXPIRES IN ${formatCountdown(countdown)}`} tone="warning" dot />
              </View>

              <View style={styles.vaDetailsBox}>
                <View style={styles.vaRow}>
                  <Text style={styles.vaLabel}>Bank Name</Text>
                  <Text style={styles.vaVal}>Providus Bank / Wema Bank</Text>
                </View>
                <View style={styles.vaRow}>
                  <Text style={styles.vaLabel}>Account Number</Text>
                  <Text style={styles.vaNumber}>9920 481 029</Text>
                </View>
                <View style={styles.vaRow}>
                  <Text style={styles.vaLabel}>Account Name</Text>
                  <Text style={styles.vaVal}>{school.name} - Tuition</Text>
                </View>
              </View>
              <Text style={styles.vaNotice}>
                Simulated Virtual Account: Tap confirm below to simulate instant payment settlement and generate an official receipt.
              </Text>
            </Card>
          )}

          <Button
            title={
              fail
                ? "Simulate Failed Payment"
                : method === "transfer"
                  ? "I Have Transferred · Confirm Payment"
                  : "Authorize Payment & Settle"
            }
            size="lg"
            variant={fail ? "danger" : "primary"}
            disabled={busy || offline}
            loading={busy}
            icon="wallet"
            onPress={submit}
          />
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Invoice Selection Section */}
          <Section title="Select Invoices to Settle" subtitle="Choose one or multiple student fee bills" />

          {eligible.length === 0 ? (
            <Empty
              title="All invoices cleared"
              detail="There are no outstanding tuition fees at this time."
              icon="verify"
            />
          ) : (
            <Card>
              {eligible.map((inv) => {
                const isChecked = ids.includes(inv.id);
                const student = data.students.find((s) => s.id === inv.studentId);
                return (
                  <Pressable
                    key={inv.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Select ${inv.id}`}
                    accessibilityState={{ checked: isChecked }}
                    onPress={() =>
                      setIds(
                        isChecked ? ids.filter((id) => id !== inv.id) : [...ids, inv.id],
                      )
                    }
                    style={[
                      styles.invoiceSelectRow,
                      isChecked && styles.invoiceSelectRowChecked,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkBoxIcon,
                        isChecked && styles.checkBoxIconChecked,
                      ]}
                    >
                      {isChecked && <Icon name="check" size={14} color="#ffffff" filled />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.invoiceStudentName}>{student?.name || "Student"}</Text>
                      <Text style={styles.invoiceItemDescription}>
                        {inv.items[0]?.label || "Term Tuition"} · {student?.className}
                      </Text>
                    </View>
                    <Text style={styles.invoiceBalanceAmount}>{money(balance(inv))}</Text>
                  </Pressable>
                );
              })}
            </Card>
          )}

          {/* Quick Amount Options */}
          {max > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 12, color: colors.muted }}>
                Payment Schedule Options
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  style={[
                    styles.methodCard,
                    { flex: 1, padding: 10, alignItems: "center" },
                    amount === "" && styles.methodCardActive,
                  ]}
                  onPress={() => setAmount("")}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.navy }}>
                    100% Full
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.muted }}>
                    {money(max)}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.methodCard,
                    { flex: 1, padding: 10, alignItems: "center" },
                    amount === String(Math.round((max / 2) / 100)) && styles.methodCardActive,
                  ]}
                  onPress={() => setAmount(String(Math.round((max / 2) / 100)))}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.navy }}>
                    50% Split
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.muted }}>
                    {money(Math.round(max / 2))}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.methodCard,
                    { flex: 1, padding: 10, alignItems: "center" },
                    amount === String(Math.round((max / 4) / 100)) && styles.methodCardActive,
                  ]}
                  onPress={() => setAmount(String(Math.round((max / 4) / 100)))}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.navy }}>
                    25% Deposit
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.muted }}>
                    {money(Math.round(max / 4))}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Custom Amount Field */}
          <Field
            label="Custom Payment Amount (₦)"
            placeholder={`Full selected balance · ${money(max)}`}
            numeric
            value={amount}
            onChangeText={setAmount}
            helper="Leave blank to settle the entire selected balance."
            icon="wallet"
          />

          {/* Payment Method Selector */}
          <Section title="Select Payment Method" subtitle="Choose how you prefer to pay" />

          <View style={styles.methodsGrid}>
            {[
              {
                m: "transfer" as const,
                label: "Instant Transfer",
                sub: "Providus / Wema VA",
                icon: "building" as IconName,
              },
              {
                m: "card" as const,
                label: "Debit Card",
                sub: "Mastercard / Visa / Verve",
                icon: "card" as IconName,
              },
              {
                m: "ussd" as const,
                label: "Bank USSD",
                sub: "*737# / *919# / *894#",
                icon: "document" as IconName,
              },
            ].map((item) => (
              <Pressable
                key={item.m}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: method === item.m }}
                onPress={() => setMethod(item.m)}
                style={[
                  styles.methodCard,
                  method === item.m && styles.methodCardActive,
                ]}
              >
                <View
                  style={[
                    styles.methodIconBox,
                    method === item.m && styles.methodIconBoxActive,
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={22}
                    color={method === item.m ? colors.orange : colors.muted}
                  />
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={[styles.methodTitle, method === item.m && { color: colors.navy }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.methodSub}>{item.sub}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Checkout Bar */}
          <Card style={styles.checkoutBarCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ gap: 2 }}>
                <Text style={styles.checkoutBarLabel}>SELECTED TOTAL</Text>
                <Text style={styles.checkoutBarAmount}>{money(Number.isFinite(kobo) ? kobo : 0)}</Text>
              </View>
              <Button
                title="Review & Pay"
                size="md"
                variant="primary"
                icon="arrow"
                disabled={
                  ids.length === 0 ||
                  !Number.isFinite(kobo) ||
                  kobo <= 0 ||
                  kobo > max ||
                  offline
                }
                onPress={() => setReview(true)}
              />
            </View>
          </Card>
        </View>
      )}
    </Screen>
  );
}

export function Receipts() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, school } = useSchool();
  const payments = data.payments
    .filter((p) => !id || p.id === id)
    .slice()
    .reverse();

  return (
    <Screen
      title={id ? "Payment Receipt" : "Official Receipts"}
      subtitle="Authenticated school fee transactions & QR verify code."
      back={() => router.back()}
    >
      {payments.length === 0 ? (
        <Empty
          title="No receipts found"
          detail="Settled tuition transactions will appear here with downloadable receipts."
          icon="receipt"
        />
      ) : (
        payments.map((p) => (
          <Card key={p.id} style={styles.receiptContainer}>
            {/* Top School Receipt Header */}
            <View style={styles.receiptTopHeader}>
              <View style={{ gap: 2 }}>
                <Text style={styles.receiptSchoolName}>{school.name}</Text>
                <Text style={styles.receiptTerm}>{school.term} · Official Receipt</Text>
              </View>
              <Badge
                text={p.state === "settled" ? "OFFICIALLY SETTLED" : p.state.toUpperCase()}
                tone={p.state === "settled" ? "success" : p.state === "failed" ? "danger" : "warning"}
                dot
              />
            </View>

            {/* Central Stamp & Amount */}
            <View style={styles.receiptCenterBlock}>
              <View style={styles.stampCircle}>
                <Icon
                  name={p.state === "settled" ? "verify" : p.state === "failed" ? "close" : "clock"}
                  color={p.state === "settled" ? colors.green : colors.orange}
                  size={36}
                  filled
                />
              </View>
              <Text style={styles.receiptAmount}>{money(p.amount)}</Text>
              <Text style={styles.receiptMethod}>PAID VIA {p.method.toUpperCase()} TRANSFER</Text>
            </View>

            {/* QR Authentication Code */}
            <View style={styles.receiptQrBox}>
              <IdentityCode reference={`receipt_${p.id}_${p.amount}`} />
              <Text style={styles.receiptRefText}>RECEIPT ID: {p.id}</Text>
              <Text style={styles.receiptDateText}>
                Date: {new Date(p.createdAt).toLocaleString("en-NG")}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                title="Download Receipt (PDF)"
                variant="outline"
                size="md"
                icon="document"
                style={{ flex: 1 }}
                onPress={() => alert("Digital receipt generated & saved to device!")}
              />
              <Button
                title="Back to Home"
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                onPress={() => router.replace("/home")}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reviewCard: {
    padding: 22,
    gap: 16,
    backgroundColor: colors.navyDark,
    borderColor: colors.navyBorder,
  },
  reviewIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewPayingLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    color: "#94a3b8",
  },
  reviewAmountText: {
    fontFamily: fonts.extra,
    fontSize: 34,
    color: "#ffffff",
    letterSpacing: -1,
  },
  reviewMetaBox: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  reviewMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewMetaLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#cbd5e1",
  },
  reviewMetaVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  virtualAccountCard: {
    padding: 18,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  vaHeading: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  vaSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  vaDetailsBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  vaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vaLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  vaVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  vaNumber: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.orange,
    letterSpacing: 1,
  },
  vaNotice: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
  invoiceSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  invoiceSelectRowChecked: {
    backgroundColor: colors.surfaceSubtle,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  checkBoxIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxIconChecked: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  invoiceStudentName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  invoiceItemDescription: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  invoiceBalanceAmount: {
    fontFamily: fonts.extra,
    fontSize: 15,
    color: colors.navy,
  },
  methodsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  methodCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    alignItems: "center",
    textAlign: "center",
  },
  methodCardActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
    ...shadows.sm,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  methodIconBoxActive: {
    backgroundColor: "#ffffff",
  },
  methodTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textAlign: "center",
    color: colors.inkSecondary,
  },
  methodSub: {
    fontFamily: fonts.regular,
    fontSize: 9,
    textAlign: "center",
    color: colors.muted,
  },
  checkoutBarCard: {
    padding: 18,
    backgroundColor: colors.surfaceSubtle,
  },
  checkoutBarLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  checkoutBarAmount: {
    fontFamily: fonts.extra,
    fontSize: 22,
    color: colors.navy,
  },
  receiptContainer: {
    padding: 22,
    gap: 18,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    borderRadius: 24,
  },
  receiptTopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingBottom: 12,
  },
  receiptSchoolName: {
    fontFamily: fonts.extra,
    fontSize: 17,
    color: colors.navy,
  },
  receiptTerm: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  receiptCenterBlock: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  stampCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptAmount: {
    fontFamily: fonts.extra,
    fontSize: 32,
    color: colors.navy,
    letterSpacing: -0.8,
  },
  receiptMethod: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  receiptQrBox: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 16,
    gap: 6,
  },
  receiptRefText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.navy,
  },
  receiptDateText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
});
