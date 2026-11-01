import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, fonts, shadows } from "../theme/tokens";
import { Icon } from "../components/Icon";
import { useApp } from "../providers/AppProvider";
import { toast } from "sonner-native";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

interface LoginScreenProps {
  onBack: () => void;
  onGoToCreate: () => void;
}

export function LoginScreen({ onBack, onGoToCreate }: LoginScreenProps) {
  const app = useApp();

  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);

  // OTP state
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<any[]>([]);

  const [loading, setLoading] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isOtpStep && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOtpStep, timer]);

  // Request OTP for Email
  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Please enter your registered institutional email.");
      return;
    }
    setLoading(true);

    try {
      const res = await app.services.requestOtp(cleanEmail, false);
      setLoading(false);
      if (!res.success) {
        toast.error(res.message);
      } else {
        setIsOtpStep(true);
        setTimer(RESEND_COOLDOWN);
        toast.success("Security login code dispatched to " + cleanEmail);
      }
    } catch {
      setLoading(false);
      toast.error("Unable to send security code. Check connection.");
    }
  };

  // Handle single digit input
  const handleChangeText = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    if (cleanText.length > 1) {
      const pastedDigits = cleanText.slice(0, OTP_LENGTH).split("");
      const newOtp = [...otp];
      pastedDigits.forEach((digit, i) => {
        newOtp[i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pastedDigits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();

      if (pastedDigits.length === OTP_LENGTH) {
        submitVerification(newOtp.join(""));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanText;
    setOtp(newOtp);

    if (cleanText && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (cleanText && index === OTP_LENGTH - 1) {
      const fullCode = newOtp.join("");
      if (fullCode.length === OTP_LENGTH) {
        submitVerification(fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const submitVerification = async (codeOverride?: string) => {
    const code = codeOverride || otp.join("");
    if (code.length < 4) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }
    setLoading(true);

    try {
      const verified = await app.services.verifyOtp(email.trim().toLowerCase(), code, false);
      if (!verified) {
        setLoading(false);
        toast.error("Invalid or expired verification code. Please retry.");
        return;
      }

      await app.act(async () => {
        await app.update({
          context: {
            schoolId: verified.schoolId,
            userId: verified.userId,
            role: verified.role,
          },
          onboarded: true,
        });
        setLoading(false);
        router.replace("/home");
      }, `Signed in as ${verified.name}`);
    } catch {
      setLoading(false);
      toast.error("Verification failed. Please retry.");
    }
  };

  const handleResendCode = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    try {
      await app.services.requestOtp(email.trim().toLowerCase(), false);
      setTimer(RESEND_COOLDOWN);
      toast.success("Fresh security code sent.");
    } catch {
      toast.error("Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Top Bar with Circular Back Button */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  if (isOtpStep) {
                    setIsOtpStep(false);
                    setOtp(Array(OTP_LENGTH).fill(""));
                  } else {
                    onBack();
                  }
                }}
                activeOpacity={0.7}
              >
                <Icon name="back" size={18} color={colors.navy} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Upper Section */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollInner}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {!isOtpStep ? (
                /* SCREEN 1: EMAIL INPUT */
                <View style={styles.body}>
                  <View style={styles.header}>
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>
                      Enter your institutional email address to receive an instant verification code.
                    </Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Institutional Email Address</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        emailFocused && styles.inputWrapperFocused,
                      ]}
                    >
                      <Icon
                        name="sms"
                        size={18}
                        color={emailFocused ? colors.orange : "#94A3B8"}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="johndoe@gmail.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                      />
                    </View>
                  </View>

                  <View style={styles.infoCallout}>
                    <Icon name="verify" size={18} color={colors.navy} />
                    <Text style={styles.infoCalloutText}>
                      Passwordless login. We dispatch a 6-digit one-time code to your verified inbox via Resend.
                    </Text>
                  </View>
                </View>
              ) : (
                /* SCREEN 2: 6-DIGIT OTP VERIFICATION */
                <View style={styles.body}>
                  <View style={styles.header}>
                    <Text style={styles.title}>Enter verification code</Text>
                    <Text style={styles.subtitle}>
                      We sent a 6-digit security code to{"\n"}
                      <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>
                  </View>

                  {/* 6 Square Digit Inputs */}
                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={(ref) => {
                          inputRefs.current[i] = ref;
                        }}
                        style={[
                          styles.otpBox,
                          digit ? styles.otpBoxFilled : null,
                        ]}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={(text) => handleChangeText(text, i)}
                        onKeyPress={(e) => handleKeyPress(e, i)}
                        autoFocus={i === 0}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {/* Resend Countdown */}
                  <View style={styles.resendRow}>
                    {timer > 0 ? (
                      <Text style={styles.resendWaitText}>
                        Resend code in{" "}
                        <Text style={{ fontFamily: fonts.bold, color: colors.navy }}>
                          {timer}s
                        </Text>
                      </Text>
                    ) : (
                      <TouchableOpacity
                        onPress={handleResendCode}
                        disabled={isResending}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.resendActiveText}>
                          {isResending ? "Resending…" : "Resend code"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Pinned Bottom Button Bar */}
            <View style={styles.bottomBar}>
              {!isOtpStep ? (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                    onPress={handleRequestOtp}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryButtonText}>
                      {loading ? "Sending Code…" : "Continue with Email"}
                    </Text>
                    <Icon name="arrow" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.footerLinkRow}>
                    <TouchableOpacity onPress={onGoToCreate} activeOpacity={0.7}>
                      <Text style={styles.footerLinkText}>
                        Are you a School Proprietor?{" "}
                        <Text style={styles.footerLinkBold}>Create an account</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                    onPress={() => submitVerification()}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryButtonText}>
                      {loading ? "Verifying…" : "Verify & Enter School"}
                    </Text>
                    <Icon name="check" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.footerLinkRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsOtpStep(false);
                        setOtp(Array(OTP_LENGTH).fill(""));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.footerLinkText}>
                        Entered the wrong email?{" "}
                        <Text style={styles.footerLinkBold}>Change Email</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  content: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  scrollInner: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  body: {
    paddingTop: 8,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.navy,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#64748B",
    lineHeight: 22,
  },
  emailHighlight: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    height: 52,
    gap: 12,
    ...shadows.sm,
  },
  inputWrapperFocused: {
    borderColor: colors.orange,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.navy,
  },
  infoCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 8,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#475569",
    lineHeight: 18,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    gap: 8,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    textAlign: "center",
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.navy,
    ...shadows.sm,
  },
  otpBoxFilled: {
    borderColor: colors.orange,
    backgroundColor: "#FFFBF7",
  },
  resendRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  resendWaitText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#64748B",
  },
  resendActiveText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.orange,
    textDecorationLine: "underline",
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
    backgroundColor: "#F7F8FA",
    borderTopWidth: 1,
    borderTopColor: "rgba(226, 232, 240, 0.6)",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orange,
    height: 54,
    borderRadius: 14,
    gap: 10,
    ...shadows.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#FFFFFF",
  },
  footerLinkRow: {
    marginTop: 14,
    alignItems: "center",
  },
  footerLinkText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#64748B",
  },
  footerLinkBold: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
});
