import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { toast } from "sonner-native";
import { colors, fonts, shadows } from "../theme/tokens";
import { Icon } from "../components/Icon";
import { useApp } from "../providers/AppProvider";
import { CustomDateTimePickerSheet } from "../components/CustomDateTimePickerSheet";
import { uploadToCloudinary } from "../services/integrations";
import { DaySchedule, PersonTitle, personTitles } from "../domain/model";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const defaultPresets = [
  {
    label: "Modern Quad",
    url: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Campus Lab",
    url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Heritage Hall",
    url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  },
];

const INITIAL_SCHEDULE: DaySchedule[] = [
  { day: "Monday", short: "Mon", open: "07:30", close: "15:30", enabled: true },
  { day: "Tuesday", short: "Tue", open: "07:30", close: "15:30", enabled: true },
  { day: "Wednesday", short: "Wed", open: "07:30", close: "15:30", enabled: true },
  { day: "Thursday", short: "Thu", open: "07:30", close: "15:30", enabled: true },
  { day: "Friday", short: "Fri", open: "07:30", close: "13:30", enabled: true }, // Friday early dismissal
  { day: "Saturday", short: "Sat", open: "09:00", close: "12:00", enabled: false },
  { day: "Sunday", short: "Sun", open: "09:00", close: "12:00", enabled: false },
];

const SCHEDULE_PRESETS = [
  {
    name: "Standard Academic",
    desc: "Mon–Thu 07:30–15:30 · Fri early 13:30",
    schedule: [
      { day: "Monday", short: "Mon", open: "07:30", close: "15:30", enabled: true },
      { day: "Tuesday", short: "Tue", open: "07:30", close: "15:30", enabled: true },
      { day: "Wednesday", short: "Wed", open: "07:30", close: "15:30", enabled: true },
      { day: "Thursday", short: "Thu", open: "07:30", close: "15:30", enabled: true },
      { day: "Friday", short: "Fri", open: "07:30", close: "13:30", enabled: true },
      { day: "Saturday", short: "Sat", open: "09:00", close: "12:00", enabled: false },
      { day: "Sunday", short: "Sun", open: "09:00", close: "12:00", enabled: false },
    ],
  },
  {
    name: "Early Years & Nursery",
    desc: "Mon–Fri 08:00–13:00 · No weekends",
    schedule: [
      { day: "Monday", short: "Mon", open: "08:00", close: "13:00", enabled: true },
      { day: "Tuesday", short: "Tue", open: "08:00", close: "13:00", enabled: true },
      { day: "Wednesday", short: "Wed", open: "08:00", close: "13:00", enabled: true },
      { day: "Thursday", short: "Thu", open: "08:00", close: "13:00", enabled: true },
      { day: "Friday", short: "Fri", open: "08:00", close: "13:00", enabled: true },
      { day: "Saturday", short: "Sat", open: "09:00", close: "12:00", enabled: false },
      { day: "Sunday", short: "Sun", open: "09:00", close: "12:00", enabled: false },
    ],
  },
  {
    name: "Full Day College",
    desc: "Mon–Fri 07:00–16:30 · Sat Club Clinic",
    schedule: [
      { day: "Monday", short: "Mon", open: "07:00", close: "16:30", enabled: true },
      { day: "Tuesday", short: "Tue", open: "07:00", close: "16:30", enabled: true },
      { day: "Wednesday", short: "Wed", open: "07:00", close: "16:30", enabled: true },
      { day: "Thursday", short: "Thu", open: "07:00", close: "16:30", enabled: true },
      { day: "Friday", short: "Fri", open: "07:00", close: "15:00", enabled: true },
      { day: "Saturday", short: "Sat", open: "09:00", close: "12:30", enabled: true },
      { day: "Sunday", short: "Sun", open: "09:00", close: "12:00", enabled: false },
    ],
  },
];

interface CreateSchoolScreenProps {
  onBack: () => void;
  onGoToLogin: () => void;
}

export function CreateSchoolScreen({ onBack, onGoToLogin }: CreateSchoolScreenProps) {
  const app = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Proprietor Info
  const [proprietorTitle, setProprietorTitle] = useState<PersonTitle>("Dr.");
  const [proprietorFirstName, setProprietorFirstName] = useState("");
  const [proprietorMiddleName, setProprietorMiddleName] = useState("");
  const [proprietorLastName, setProprietorLastName] = useState("");
  const [proprietorEmail, setProprietorEmail] = useState("");
  const [proprietorPhone, setProprietorPhone] = useState("");

  const proprietorFullName = [
    proprietorTitle,
    proprietorFirstName.trim(),
    proprietorMiddleName.trim(),
    proprietorLastName.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  // Step 2: OTP Verification
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<any[]>([]);

  // Step 3: School Profile & Cover Photo
  const [schoolName, setSchoolName] = useState("");
  const [schoolMotto, setSchoolMotto] = useState("Excellence, Wisdom & Leadership");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [selectedCoverUrl, setSelectedCoverUrl] = useState(
    defaultPresets[0]?.url || ""
  );
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Step 4: Schedule & Launch
  const [schoolTerm, setSchoolTerm] = useState("First Term · 2026/27");
  const [schedule, setSchedule] = useState<DaySchedule[]>(INITIAL_SCHEDULE);
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  // Custom Date Time Picker Sheet state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    dayIndex: number;
    type: "open" | "close";
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // Countdown timer for Step 2 OTP resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  // Step 1: Submit verification code request
  const handleSendVerificationCode = async () => {
    if (!proprietorFirstName.trim()) {
      toast.error("Please enter your legal first name as proprietor.");
      return;
    }
    if (!proprietorLastName.trim()) {
      toast.error("Please enter your surname / last name as proprietor.");
      return;
    }
    if (!proprietorEmail.trim()) {
      toast.error("Please enter your institutional email address.");
      return;
    }
    setLoading(true);

    try {
      await app.services.requestOtp(proprietorEmail.trim().toLowerCase(), true);
      setLoading(false);
      setStep(2);
      setTimer(RESEND_COOLDOWN);
      toast.success("Security verification code dispatched to " + proprietorEmail.trim());
    } catch {
      setLoading(false);
      toast.error("Unable to send verification code. Please check connection.");
    }
  };

  // Step 2: Handle OTP input
  const handleOtpChangeText = (text: string, index: number) => {
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
        handleVerifyOtp(newOtp.join(""));
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
        handleVerifyOtp(fullCode);
      }
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = codeOverride || otp.join("");
    if (code.length < 4) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }
    setLoading(true);

    try {
      const verified = await app.services.verifyOtp(proprietorEmail.trim().toLowerCase(), code, true);
      setLoading(false);
      if (!verified) {
        toast.error("Invalid or expired verification code.");
        return;
      }
      toast.success("Proprietor identity verified!");
      setStep(3); // Proceed to School Profile
    } catch {
      setLoading(false);
      toast.error("Verification failed. Please retry.");
    }
  };

  const handleResendCode = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    try {
      await app.services.requestOtp(proprietorEmail.trim().toLowerCase(), true);
      setTimer(RESEND_COOLDOWN);
      toast.success("Fresh verification code sent.");
    } catch {
      toast.error("Failed to resend code. Please retry.");
    } finally {
      setIsResending(false);
    }
  };

  // Step 3: Handle Custom Cover Photo Upload to Cloudinary
  const handlePickCustomCover = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.error("Camera roll permission required to upload campus photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const localUri = result.assets[0].uri;
        setIsUploadingCover(true);

        try {
          const uploadResult = await uploadToCloudinary(localUri, {
            folder: "school_covers",
          });
          setCustomCoverUrl(uploadResult.secureUrl);
          setSelectedCoverUrl(uploadResult.secureUrl);
          toast.success("Campus cover photo uploaded to Cloudinary!");
        } catch (uploadErr: any) {
          console.warn("[Cloudinary Upload Warning]", uploadErr);
          setCustomCoverUrl(localUri);
          setSelectedCoverUrl(localUri);
          toast.info("Using local photo preview.");
        } finally {
          setIsUploadingCover(false);
        }
      }
    } catch (err: any) {
      setIsUploadingCover(false);
      toast.error("Unable to select photo. Please try again.");
    }
  };

  // Step 3 Next
  const handleProfileNext = () => {
    if (!schoolName.trim()) {
      toast.error("Please enter your official school name.");
      return;
    }
    if (!schoolAddress.trim()) {
      toast.error("Please enter the physical campus address.");
      return;
    }
    setStep(4);
  };

  // Step 4: Schedule manipulation
  const handleApplyPreset = (index: number) => {
    setActivePresetIndex(index);
    const chosen = SCHEDULE_PRESETS[index];
    if (chosen) {
      setSchedule(chosen.schedule);
    }
  };

  const handleToggleDay = (dayIndex: number) => {
    const current = schedule[dayIndex];
    if (!current) return;
    const updated = [...schedule];
    updated[dayIndex] = {
      ...current,
      enabled: !current.enabled,
    };
    setSchedule(updated);
  };

  const openTimePicker = (dayIndex: number, type: "open" | "close") => {
    setPickerTarget({ dayIndex, type });
    setPickerVisible(true);
  };

  const handlePickerConfirm = (result: { timeString?: string }) => {
    if (pickerTarget && result.timeString) {
      const current = schedule[pickerTarget.dayIndex];
      if (current) {
        const updated = [...schedule];
        if (pickerTarget.type === "open") {
          updated[pickerTarget.dayIndex] = {
            ...current,
            open: result.timeString,
          };
        } else {
          updated[pickerTarget.dayIndex] = {
            ...current,
            close: result.timeString,
          };
        }
        setSchedule(updated);
      }
    }
    setPickerVisible(false);
    setPickerTarget(null);
  };

  // Step 4 Submit: Launch Workspace
  const handleLaunchSchool = async () => {
    setLoading(true);

    const firstActiveDay = schedule.find((d) => d.enabled) || schedule[0];
    const openTimeVal = firstActiveDay?.open || "07:30";
    const closeTimeVal = firstActiveDay?.close || "15:30";

    try {
      await app.act(async () => {
        const created = await app.services.registerSchoolWithProprietor({
          proprietorTitle,
          proprietorFirstName: proprietorFirstName.trim(),
          proprietorMiddleName: proprietorMiddleName.trim() || undefined,
          proprietorLastName: proprietorLastName.trim(),
          proprietorName: proprietorFullName,
          email: proprietorEmail.trim().toLowerCase(),
          phone: proprietorPhone.trim(),
          schoolName: schoolName.trim(),
          address: schoolAddress.trim(),
          term: schoolTerm.trim(),
          motto: schoolMotto.trim(),
          coverPhoto: selectedCoverUrl,
          openTime: openTimeVal,
          closeTime: closeTimeVal,
          schedule,
        });

        // Permanent WhatsApp-style persistence in deviceStorage
        await app.update({
          context: {
            schoolId: created.schoolId,
            userId: created.userId,
            role: created.role,
          },
          onboarded: true,
        });
        setLoading(false);
        router.replace("/home");
      }, `Campus workspace created! Welcome, Proprietor ${proprietorFullName}.`);
    } catch {
      setLoading(false);
      toast.error("Failed to provision school workspace. Please retry.");
    }
  };

  const handleStepBack = () => {
    if (step === 1) {
      onBack();
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
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
            {/* Top Bar with Back Button & Progress Segment */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleStepBack}
                activeOpacity={0.7}
              >
                <Icon name="back" size={18} color={colors.navy} />
              </TouchableOpacity>

              {/* LEED-style horizontal progress bars */}
              <View style={styles.progressBars}>
                {[1, 2, 3, 4].map((s) => (
                  <View
                    key={s}
                    style={[
                      styles.progressBar,
                      s <= step && styles.progressBarActive,
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.stepCounterText}>Step {step} of 4</Text>
            </View>

            {/* Scrollable Upper Form Body */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollInner}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ======================================================== */}
              {/* STEP 1: PROPRIETOR IDENTITY */}
              {/* ======================================================== */}
              {step === 1 && (
                <View>
                  <View style={styles.header}>
                    <Text style={styles.stepKicker}>School Proprietor</Text>
                    <Text style={styles.title}>Create School Account</Text>
                    <Text style={styles.subtitle}>
                      Set up your institutional command center. Teachers and staff are invited subsequently.
                    </Text>
                  </View>

                  {/* Institutional Title Selector */}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Institutional Title</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    >
                      {personTitles.map((t) => (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setProprietorTitle(t)}
                          style={[
                            styles.titleChip,
                            proprietorTitle === t && styles.titleChipActive,
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.titleChipText,
                              proprietorTitle === t && styles.titleChipTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* First Name & Surname in two-column row */}
                  <View style={styles.nameRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>First Name *</Text>
                      <View style={styles.inputWrapper}>
                        <Icon name="profile" size={18} color="#94A3B8" />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. Folashade"
                          placeholderTextColor="#94A3B8"
                          value={proprietorFirstName}
                          onChangeText={setProprietorFirstName}
                        />
                      </View>
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Middle Name</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. Bisi"
                          placeholderTextColor="#94A3B8"
                          value={proprietorMiddleName}
                          onChangeText={setProprietorMiddleName}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Surname / Last Name *</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="profile" size={18} color="#94A3B8" />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Adeleke"
                        placeholderTextColor="#94A3B8"
                        value={proprietorLastName}
                        onChangeText={setProprietorLastName}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Institutional Email Address</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="sms" size={18} color="#94A3B8" />
                      <TextInput
                        style={styles.input}
                        placeholder="johndoe@gmail.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={proprietorEmail}
                        onChangeText={setProprietorEmail}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="call" size={18} color="#94A3B8" />
                      <TextInput
                        style={styles.input}
                        placeholder="+234 803 123 4567"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={proprietorPhone}
                        onChangeText={setProprietorPhone}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* ======================================================== */}
              {/* STEP 2: EMAIL VERIFICATION OTP */}
              {/* ======================================================== */}
              {step === 2 && (
                <View>
                  <View style={styles.header}>
                    <Text style={styles.stepKicker}>Email Verification</Text>
                    <Text style={styles.title}>Confirm your email</Text>
                    <Text style={styles.subtitle}>
                      We dispatched a 6-digit verification code to{"\n"}
                      <Text style={styles.emailHighlight}>{proprietorEmail}</Text>
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
                        onChangeText={(text) => handleOtpChangeText(text, i)}
                        onKeyPress={(e) => handleOtpKeyPress(e, i)}
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

              {/* ======================================================== */}
              {/* STEP 3: SCHOOL IDENTITY & LOCATION */}
              {/* ======================================================== */}
              {step === 3 && (
                <View>
                  <View style={styles.header}>
                    <Text style={styles.stepKicker}>Campus Identity</Text>
                    <Text style={styles.title}>School Campus Profile</Text>
                    <Text style={styles.subtitle}>
                      Enter your official school name, motto and campus location.
                    </Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Official School Name</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="school" size={18} color="#94A3B8" />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Cedar Grove International Academy"
                        placeholderTextColor="#94A3B8"
                        value={schoolName}
                        onChangeText={setSchoolName}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>School Motto & Vision</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="verify" size={18} color="#94A3B8" />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Excellence, Wisdom & Leadership"
                        placeholderTextColor="#94A3B8"
                        value={schoolMotto}
                        onChangeText={setSchoolMotto}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Physical Campus Location</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="location" size={18} color="#94A3B8" />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos"
                        placeholderTextColor="#94A3B8"
                        value={schoolAddress}
                        onChangeText={setSchoolAddress}
                      />
                    </View>
                  </View>

                  {/* Campus Cover Photography with Cloudinary Upload Option */}
                  <View style={styles.formGroup}>
                    <View style={styles.coverLabelRow}>
                      <Text style={styles.inputLabel}>Campus Cover Photography</Text>
                      <Text style={styles.coverSubLabel}>CDN Cloudinary</Text>
                    </View>

                    {/* Curated Presets */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.coverScroll}
                    >
                      {/* Upload Custom Card */}
                      <TouchableOpacity
                        style={[
                          styles.coverUploadCard,
                          selectedCoverUrl === customCoverUrl && styles.coverCardActive,
                        ]}
                        onPress={handlePickCustomCover}
                        disabled={isUploadingCover}
                        activeOpacity={0.8}
                      >
                        {isUploadingCover ? (
                          <ActivityIndicator size="small" color={colors.orange} />
                        ) : customCoverUrl ? (
                          <Image
                            source={{ uri: customCoverUrl }}
                            style={styles.coverThumb}
                          />
                        ) : (
                          <View style={styles.uploadPlaceholder}>
                            <Icon name="camera" size={22} color={colors.orange} />
                            <Text style={styles.uploadText}>Upload Custom</Text>
                          </View>
                        )}
                        {customCoverUrl ? (
                          <Text style={[styles.coverLabel, styles.coverLabelActive]}>
                            Custom
                          </Text>
                        ) : null}
                      </TouchableOpacity>

                      {/* Default Presets */}
                      {defaultPresets.map((preset) => (
                        <TouchableOpacity
                          key={preset.label}
                          onPress={() => setSelectedCoverUrl(preset.url)}
                          style={[
                            styles.coverCard,
                            selectedCoverUrl === preset.url && styles.coverCardActive,
                          ]}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: preset.url }}
                            style={styles.coverThumb}
                          />
                          <Text
                            style={[
                              styles.coverLabel,
                              selectedCoverUrl === preset.url && styles.coverLabelActive,
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* ======================================================== */}
              {/* STEP 4: OPERATING RULES & DAY SCHEDULE ARRAY */}
              {/* ======================================================== */}
              {step === 4 && (
                <View>
                  <View style={styles.header}>
                    <Text style={styles.stepKicker}>Campus Rules</Text>
                    <Text style={styles.title}>Operating Hours & Schedule</Text>
                    <Text style={styles.subtitle}>
                      Configure daily arrival & dismissal hours. Some days like Friday may close early.
                    </Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Current Academic Term</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="calendar" size={18} color="#94A3B8" />
                      <TextInput
                        style={styles.input}
                        placeholder="First Term · 2026/27"
                        placeholderTextColor="#94A3B8"
                        value={schoolTerm}
                        onChangeText={setSchoolTerm}
                      />
                    </View>
                  </View>

                  {/* Schedule Presets */}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Quick Schedule Presets</Text>
                    <View style={styles.presetsRow}>
                      {SCHEDULE_PRESETS.map((p, idx) => (
                        <TouchableOpacity
                          key={p.name}
                          style={[
                            styles.presetChip,
                            activePresetIndex === idx && styles.presetChipActive,
                          ]}
                          onPress={() => handleApplyPreset(idx)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.presetChipTitle,
                              activePresetIndex === idx && styles.presetChipTitleActive,
                            ]}
                          >
                            {p.name}
                          </Text>
                          <Text
                            style={[
                              styles.presetChipDesc,
                              activePresetIndex === idx && styles.presetChipDescActive,
                            ]}
                          >
                            {p.desc}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Daily Operating Schedule Array */}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Daily Operating Schedule</Text>
                    <View style={styles.daysContainer}>
                      {schedule.map((item, idx) => (
                        <View
                          key={item.day}
                          style={[
                            styles.dayRow,
                            !item.enabled && styles.dayRowDisabled,
                          ]}
                        >
                          <View style={styles.dayHeaderRow}>
                            <View style={styles.dayTitleGroup}>
                              <Text
                                style={[
                                  styles.dayName,
                                  !item.enabled && styles.dayNameDisabled,
                                ]}
                              >
                                {item.day}
                              </Text>
                              {item.day === "Friday" ? (
                                <View style={styles.earlyBadge}>
                                  <Text style={styles.earlyBadgeText}>Early Close</Text>
                                </View>
                              ) : null}
                            </View>

                            <Switch
                              value={item.enabled}
                              onValueChange={() => handleToggleDay(idx)}
                              trackColor={{ false: "#E2E8F0", true: colors.orange }}
                              thumbColor="#FFFFFF"
                            />
                          </View>

                          {item.enabled ? (
                            <View style={styles.timeButtonsRow}>
                              {/* Open Time Picker Trigger */}
                              <TouchableOpacity
                                style={styles.timeBox}
                                onPress={() => openTimePicker(idx, "open")}
                                activeOpacity={0.7}
                              >
                                <Icon name="clock" size={15} color={colors.navy} />
                                <View>
                                  <Text style={styles.timeBoxLabel}>Opens</Text>
                                  <Text style={styles.timeBoxValue}>{item.open}</Text>
                                </View>
                              </TouchableOpacity>

                              <Text style={styles.timeArrow}>→</Text>

                              {/* Close Time Picker Trigger */}
                              <TouchableOpacity
                                style={styles.timeBox}
                                onPress={() => openTimePicker(idx, "close")}
                                activeOpacity={0.7}
                              >
                                <Icon name="clock" size={15} color={colors.navy} />
                                <View>
                                  <Text style={styles.timeBoxLabel}>Dismissal</Text>
                                  <Text style={styles.timeBoxValue}>{item.close}</Text>
                                </View>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <Text style={styles.dayClosedText}>Campus Closed</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Clean Summary Table */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>School</Text>
                      <Text style={styles.summaryVal}>{schoolName}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>Proprietor</Text>
                      <Text style={styles.summaryVal}>{proprietorFullName}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>Active Days</Text>
                      <Text style={styles.summaryVal}>
                        {schedule.filter((d) => d.enabled).map((d) => d.short).join(", ")}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>Term</Text>
                      <Text style={styles.summaryVal}>{schoolTerm}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* ======================================================== */}
            {/* PINNED BOTTOM BUTTON BAR */}
            {/* ======================================================== */}
            <View style={styles.bottomBar}>
              {step === 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                    onPress={handleSendVerificationCode}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryButtonText}>
                      {loading ? "Sending Code…" : "Continue to Verification"}
                    </Text>
                    <Icon name="arrow" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.footerLinkRow}>
                    <TouchableOpacity onPress={onGoToLogin} activeOpacity={0.7}>
                      <Text style={styles.footerLinkText}>
                        Already registered? <Text style={styles.footerLinkBold}>Sign In</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 2 && (
                <TouchableOpacity
                  style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                  onPress={() => handleVerifyOtp()}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? "Verifying…" : "Verify & Continue"}
                  </Text>
                  <Icon name="check" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {step === 3 && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleProfileNext}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryButtonText}>
                    Continue to Operating Schedule
                  </Text>
                  <Icon name="arrow" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {step === 4 && (
                <TouchableOpacity
                  style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                  onPress={handleLaunchSchool}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? "Provisioning Campus…" : "Launch School Workspace"}
                  </Text>
                  <Icon name="school" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Custom Date / Time Picker Sheet */}
            <CustomDateTimePickerSheet
              visible={pickerVisible}
              onClose={() => setPickerVisible(false)}
              mode="time"
              title={
                pickerTarget
                  ? `${schedule[pickerTarget.dayIndex]?.day} ${
                      pickerTarget.type === "open" ? "Opening" : "Dismissal"
                    } Time`
                  : "Select Time"
              }
              subtitle="Use custom steppers or quick presets below"
              initialTime={
                pickerTarget
                  ? pickerTarget.type === "open"
                    ? schedule[pickerTarget.dayIndex]?.open
                    : schedule[pickerTarget.dayIndex]?.close
                  : "07:30"
              }
              onConfirm={handlePickerConfirm}
            />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
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
  progressBars: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  progressBarActive: {
    backgroundColor: colors.orange,
  },
  stepCounterText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: "#64748B",
  },
  scrollInner: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  stepKicker: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.orange,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.navy,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#64748B",
    lineHeight: 20,
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
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.navy,
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
  coverLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  coverSubLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.orange,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coverScroll: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  coverCard: {
    width: 140,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    ...shadows.sm,
  },
  coverUploadCard: {
    width: 140,
    height: 118,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.navy,
  },
  coverCardActive: {
    borderColor: colors.orange,
  },
  coverThumb: {
    width: "100%",
    height: 84,
    backgroundColor: "#CBD5E1",
  },
  coverLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 6,
  },
  coverLabelActive: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  presetsRow: {
    gap: 8,
  },
  presetChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  presetChipActive: {
    borderColor: colors.orange,
    backgroundColor: "#FFFBF7",
  },
  presetChipTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.navy,
    marginBottom: 2,
  },
  presetChipTitleActive: {
    color: colors.orange,
  },
  presetChipDesc: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#64748B",
  },
  presetChipDescActive: {
    color: "#7C2D12",
  },
  daysContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 12,
    ...shadows.sm,
  },
  dayRow: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dayRowDisabled: {
    opacity: 0.6,
    backgroundColor: "#F1F5F9",
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  dayNameDisabled: {
    color: "#94A3B8",
  },
  earlyBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earlyBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#B45309",
    textTransform: "uppercase",
  },
  timeButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  timeBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  timeBoxLabel: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: "#64748B",
    textTransform: "uppercase",
  },
  timeBoxValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  timeArrow: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#94A3B8",
  },
  dayClosedText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 6,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginTop: 8,
    gap: 10,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryKey: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#64748B",
  },
  summaryVal: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.navy,
    maxWidth: "65%",
    textAlign: "right",
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
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  titleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...shadows.sm,
  },
  titleChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  titleChipText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: "#64748B",
  },
  titleChipTextActive: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
  },
});
