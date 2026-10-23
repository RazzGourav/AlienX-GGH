import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Vibration,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

// Google Client ID provided by user
const GOOGLE_CLIENT_ID = "375902516674-uul3piammmjtvkpur89gpj75s4ibajco.apps.googleusercontent.com";

// Auto-detect computer IP from Metro connection for physical devices
const getAutoDetectedServerUrl = () => {
  try {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return `http://${ip}:3000`;
      }
    }
  } catch (e) {}
  // Default to workstation LAN IP (reachable from phone on same Wi-Fi)
  return "http://10.0.15.145:3000";
};

const DEFAULT_SERVER_URL = getAutoDetectedServerUrl();

// Multilingual Dictionary
const I18N = {
  en: {
    app_title: "ResQ Citizen",
    subtitle: "ERSS-112 Emergency Distress Hub",
    sos_btn: "1-CLICK EMERGENCY SOS",
    sos_sub: "Vibrates & broadcasts real-time GPS and audio to Police (100) & 108 ALS",
    location_label: "Current GPS Position",
    acquiring_loc: "Acquiring GPS...",
    category_title: "Select Emergency Type",
    cat_crime: "🚨 Police (100) - Crime / Attack",
    cat_medical: "🚑 Medical (108) - Trauma Casualty",
    cat_fire: "🔥 Fire (101) - Blaze / Gas Leak",
    cat_flood: "🌊 Disaster - Flood / Landslide",
    cat_women: "🛡️ Women Safety SOS",
    details_label: "Incident Evidence & Description",
    photo_btn: "📷 Add Photo Evidence",
    audio_btn: "🎙️ Record Voice Note",
    stop_audio: "⏹️ Stop Recording",
    text_placeholder: "Describe the emergency, attacker details, or trapped victims...",
    submit_btn: "TRANSMIT DISTRESS REPORT",
    sending: "Transmitting to Command Center...",
    connected: "🟢 Command Center Connected",
    disconnected: "🔴 Checking Connection...",
  },
  hi: {
    app_title: "रेस्क्यू सिटिजन (ResQ Citizen)",
    subtitle: "ERSS-112 आपातकालीन नागरिक सहायता",
    sos_btn: "आपातकालीन SOS बटन दबाएं",
    sos_sub: "मोबाइल वाइब्रेशन के साथ पुलिस (100), 108 एम्बुलेंस और लाइव GPS प्रसारण",
    location_label: "वर्तमान GPS लोकेशन",
    acquiring_loc: "GPS खोजा जा रहा है...",
    category_title: "आपातकाल का प्रकार चुनें",
    cat_crime: "🚨 पुलिस (100) - अपराध / हमला",
    cat_medical: "🚑 चिकित्सा (108) - गंभीर घायल",
    cat_fire: "🔥 फायर (101) - आग / गैस रिसाव",
    cat_flood: "🌊 आपदा - बाढ़ / भूस्खलन",
    cat_women: "🛡️ महिला सुरक्षा आपातकाल",
    details_label: "साक्ष्य एवं घटना विवरण",
    photo_btn: "📷 फोटो साक्ष्य जोड़ें",
    audio_btn: "🎙️ आवाज में संदेश रिकॉर्ड करें",
    stop_audio: "⏹️ रिकॉर्डिंग रोकें",
    text_placeholder: "घटना, फंसे हुए लोग या खतरे का विवरण लिखें...",
    submit_btn: "संकट रिपोर्ट प्रसारित करें",
    sending: "कमांड सेंटर भेजा जा रहा है...",
    connected: "🟢 कमांड सेंटर कनेक्टेड",
    disconnected: "🔴 कनेक्शन जांच रहे हैं...",
  },
  hinglish: {
    app_title: "ResQ Citizen App",
    subtitle: "Emergency Distress Portal",
    sos_btn: "EMERGENCY SOS DABAO",
    sos_sub: "Vibrate + Police 100 aur 108 Ambulance ko Live Location Bhejo",
    location_label: "Current GPS Location",
    acquiring_loc: "GPS dhoondh rahe hain...",
    category_title: "Kaisi Emergency Hai?",
    cat_crime: "🚨 Police 100 - Hamla / Crime",
    cat_medical: "🚑 Medical 108 - Trauma",
    cat_fire: "🔥 Fire 101 - Aag / Cylinder Blast",
    cat_flood: "🌊 Disaster - Flood / Landslide",
    cat_women: "🛡️ Women Safety Alert",
    details_label: "Details aur Saboot",
    photo_btn: "📷 Photo Saboot Dalein",
    audio_btn: "🎙️ Voice Note Record Karein",
    stop_audio: "⏹️ Recording Rokein",
    text_placeholder: "Kitne log fase hain, kya khatra hai yahan likhein...",
    submit_btn: "COMMAND CENTER BHEJO",
    sending: "Report bheja jaa raha hai...",
    connected: "🟢 Connected",
    disconnected: "🔴 Connecting...",
  },
};

export default function App() {
  const [lang, setLang] = useState<"en" | "hi" | "hinglish">("en");
  const t = I18N[lang];

  // Server URL
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [serverStatus, setServerStatus] = useState<"online" | "offline">("online");

  // User Profile
  const [user, setUser] = useState({
    name: "Aakash Sharma",
    email: "aakash.sharma.citizen@gmail.com",
    photo_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
    google_id: "GOOG-IND-987452",
  });

  // Google OAuth Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      // Fetch user info from Google API
      fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${authentication?.accessToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.name) {
            setUser({
              name: data.name,
              email: data.email,
              photo_url: data.picture,
              google_id: data.id,
            });
          }
        })
        .catch((e) => console.warn("Google fetch error", e));
    }
  }, [response]);

  // Location State
  const [location, setLocation] = useState({
    lat: 28.6139,
    lng: 77.209,
    address: "New Delhi, India (Default)",
    accuracy: 10,
  });
  const [isLocating, setIsLocating] = useState(false);

  // Form State
  const [category, setCategory] = useState("CRIME_ATTACK");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSosActive, setIsSosActive] = useState(false);

  // Load Permissions and Location on Start
  useEffect(() => {
    (async () => {
      setIsLocating(true);
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          let address = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

          // Reverse geocode
          const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (geocode && geocode.length > 0) {
            const g = geocode[0];
            address = [g.name, g.street, g.city, g.region].filter(Boolean).join(", ");
          }

          setLocation({
            lat,
            lng,
            address,
            accuracy: Math.round(loc.coords.accuracy || 10),
          });
        } catch (e) {
          console.warn("Location error:", e);
        }
      }
      setIsLocating(false);
    })();
  }, []);

  const checkServerHealth = async (urlToCheck = serverUrl) => {
    try {
      const trimmed = urlToCheck.trim().replace(/\/+$/, "");
      const res = await fetch(`${trimmed}/api/signals/live`);
      if (res.ok) setServerStatus("online");
      else setServerStatus("offline");
    } catch {
      setServerStatus("offline");
    }
  };

  // Re-check health on mount and whenever serverUrl changes
  useEffect(() => {
    checkServerHealth(serverUrl);
  }, [serverUrl]);

  // Device Vibration Helper
  const triggerVibration = (pattern = [100, 50, 100, 50, 300]) => {
    try {
      Vibration.vibrate(pattern);
    } catch (e) {}
  };

  // Stop & Silence SOS
  const stopSOSAlarm = () => {
    setIsSosActive(false);
    try {
      Vibration.cancel();
    } catch (e) {}
    Alert.alert("SOS Cancelled", "Emergency alarm silenced and vibration stopped.");
  };

  // Image Picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is needed to capture evidence.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
      triggerVibration([50]);
    }
  };

  // Voice Recording (SDK 57 expo-audio)
  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Microphone access is required to record voice notes.");
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      triggerVibration([100]);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Microphone Error", "Unable to start recording on this device.");
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      setIsRecording(false);
      const uri = audioRecorder.uri;
      setRecordedUri(uri);

      // Convert audio file to base64 data URI
      if (uri) {
        try {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setAudioBase64(reader.result as string);
          };
          reader.readAsDataURL(blob);
        } catch (e) {
          console.warn("[App] Audio base64 encoding fallback:", e);
        }
      }

      triggerVibration([50, 50, 100]);
    } catch (err) {
      console.error("Failed to stop recording", err);
      setIsRecording(false);
    }
  };

  // ========================================================
  // 🚨 1-CLICK SOS TRIGGER
  // ========================================================
  const handleOneClickSOS = async () => {
    setIsSosActive(true);
    triggerVibration([0, 500, 200, 500, 200, 1000]);
    setIsSubmitting(true);

    const customMsg = description.trim();
    const sosDesc = customMsg
      ? `🚨 ONE-CLICK SOS: "${customMsg}" [Citizen: ${user.name} | Location: ${location.address}]`
      : `🚨 ONE-CLICK SOS TRIGGERED! Citizen ${user.name} reported life threat at ${location.address}. Immediate Police (100) & Emergency Ambulance dispatched.`;

    const payload = {
      signal_type: "SOS",
      citizen: user,
      location: location,
      category_hint: "CRIME_ATTACK",
      description: sosDesc,
      media_base64: photoBase64 || audioBase64 || undefined,
      timestamp: new Date().toISOString(),
      is_live_citizen: true,
    };

    const targetUrl = (serverUrl || "http://10.0.15.145:3000").trim().replace(/\/+$/, "");

    try {
      const res = await fetch(`${targetUrl}/api/signals/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          "🚨 SOS TRANSMITTED!",
          `Emergency Signal Reference: ${data.incident_id}\n\nLive GPS location and caller identity broadcasted to ERSS-112 Command Center. Multi-Agent AI Response Engaged.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Transmission Notice", data.message || "Failed to reach Command Center");
      }
    } catch (err: any) {
      Alert.alert(
        "Connection Error",
        `Could not reach ResQ Bharat Command Center at ${targetUrl}. Please ensure your mobile phone and computer are on the same Wi-Fi network.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // SUBMIT GENERAL REPORT
  // ========================================================
  const handleSubmitReport = async () => {
    triggerVibration([80, 40, 80]);
    setIsSubmitting(true);

    const hasAudio = !!audioBase64 || !!recordedUri;
    const hasPhoto = !!photoBase64 || !!photoUri;
    const signalType = hasAudio ? "AUDIO" : hasPhoto ? "IMAGE" : "TEXT";

    const customMsg = description.trim();
    const repDesc = customMsg
      ? customMsg
      : hasAudio
      ? `Voice distress note (${category}) recorded at ${location.address}`
      : hasPhoto
      ? `Photo evidence (${category}) captured at ${location.address}`
      : `Citizen distress report (${category}) from ${location.address}`;

    const payload = {
      signal_type: signalType,
      citizen: user,
      location: location,
      category_hint: category,
      description: repDesc,
      media_base64: photoBase64 || audioBase64 || undefined,
      timestamp: new Date().toISOString(),
      is_live_citizen: true,
    };

    const targetUrl = (serverUrl || "http://10.0.15.145:3000").trim().replace(/\/+$/, "");

    try {
      const res = await fetch(`${targetUrl}/api/signals/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          "Report Transmitted!",
          `Incident ID: ${data.incident_id}\n\nStatus: ${data.message}`
        );
        setDescription("");
        setPhotoUri(null);
        setPhotoBase64(null);
        setRecordedUri(null);
        setAudioBase64(null);
      } else {
        Alert.alert("Transmission Failed", data.error || "Server rejected report");
      }
    } catch (err: any) {
      Alert.alert("Network Error", `Could not connect to ${targetUrl}: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>R</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{t.app_title}</Text>
            <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
          </View>
        </View>

        {/* Language Tabs */}
        <View style={styles.langBar}>
          {(["en", "hi", "hinglish"] as const).map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => setLang(l)}
              style={[styles.langBtn, lang === l && styles.langBtnActive]}
            >
              <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                {l === "en" ? "EN" : l === "hi" ? "हिंदी" : "Hinglish"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <Image source={{ uri: user.photo_url }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={styles.verifiedChip}>
                <Text style={styles.verifiedText}>GOOGLE AUTH</Text>
              </View>
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => promptAsync()}
            style={styles.switchUserBtn}
          >
            <Text style={styles.switchUserText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* GPS Location Bar */}
        <View style={styles.locationBar}>
          <Text style={styles.locationLabel}>📍 {t.location_label}:</Text>
          <Text style={styles.locationAddress} numberOfLines={1}>
            {isLocating ? t.acquiring_loc : location.address}
          </Text>
        </View>

        {/* 🚨 ONE-CLICK SOS BIG PANIC BUTTON */}
        <View style={styles.sosContainer}>
          <Text style={styles.sosTag}>🚨 POLICE 100 / 108 AMBULANCE HIGH ALERT</Text>
          <Text style={styles.sosTitle}>{t.sos_btn}</Text>
          <Text style={styles.sosSubtitle}>{t.sos_sub}</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOneClickSOS}
            disabled={isSubmitting}
            style={styles.sosCircle}
          >
            <Text style={styles.sosIcon}>⚠️</Text>
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosActionText}>
              {isSubmitting ? t.sending : "1-CLICK TAP"}
            </Text>
          </TouchableOpacity>

          {isSosActive && (
            <TouchableOpacity
              onPress={stopSOSAlarm}
              style={{
                marginTop: 16,
                backgroundColor: "#3f1111",
                borderColor: "#ef4444",
                borderWidth: 1.5,
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: "#ef4444",
                  fontWeight: "bold",
                  fontSize: 12,
                  textAlign: "center",
                  letterSpacing: 1,
                }}
              >
                🛑 STOP SOS ALARM & SILENCE
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Multimodal Report Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>{t.category_title}</Text>

          {/* Emergency Category Selector */}
          <View style={styles.categoryGrid}>
            {[
              { id: "CRIME_ATTACK", label: t.cat_crime },
              { id: "WOMEN_SAFETY", label: t.cat_women },
              { id: "MEDICAL", label: t.cat_medical },
              { id: "FIRE", label: t.cat_fire },
              { id: "FLOOD_DISASTER", label: t.cat_flood },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={[styles.catBtn, category === cat.id && styles.catBtnActive]}
              >
                <Text
                  style={[styles.catBtnText, category === cat.id && styles.catBtnTextActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Text Description */}
          <Text style={styles.sectionTitle}>{t.details_label}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t.text_placeholder}
            placeholderTextColor="#71717a"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          {/* Media Buttons */}
          <View style={styles.mediaRow}>
            <TouchableOpacity onPress={pickImage} style={styles.mediaBtn}>
              <Text style={styles.mediaBtnText}>{photoUri ? "✓ Photo Added" : t.photo_btn}</Text>
            </TouchableOpacity>

            {!isRecording ? (
              <TouchableOpacity onPress={startRecording} style={styles.mediaBtn}>
                <Text style={styles.mediaBtnText}>
                  {recordedUri ? "✓ Voice Note Saved" : t.audio_btn}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={stopRecording}
                style={[styles.mediaBtn, { backgroundColor: "#dc2626" }]}
              >
                <Text style={[styles.mediaBtnText, { color: "#fff" }]}>{t.stop_audio}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmitReport}
            disabled={isSubmitting}
            style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{t.submit_btn}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Server Endpoint Settings */}
        <View style={styles.serverSettings}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.serverLabel}>Dashboard Command Center Host:</Text>
            <TouchableOpacity
              onPress={() => setServerUrl("http://10.0.15.145:3000")}
              style={{ backgroundColor: "#1e293b", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
            >
              <Text style={{ color: "#38bdf8", fontSize: 10, fontWeight: "bold" }}>Reset to Wi-Fi IP</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={serverUrl}
            onChangeText={setServerUrl}
            style={styles.serverInput}
            autoCapitalize="none"
          />
          <Text style={styles.serverHint}>
            {serverStatus === "online" ? t.connected : t.disconnected} • Physical device must connect to your PC's IP (http://10.0.15.145:3000) on Wi-Fi.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070c",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    backgroundColor: "#090d16",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  headerSubtitle: {
    color: "#71717a",
    fontSize: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  langBar: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langBtnActive: {
    backgroundColor: "#dc2626",
  },
  langText: {
    color: "#a1a1aa",
    fontSize: 9,
    fontWeight: "bold",
  },
  langTextActive: {
    color: "#fff",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  userCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111520",
    borderWidth: 1,
    borderColor: "#27272a",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#10b981",
  },
  userName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  userEmail: {
    color: "#71717a",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  verifiedChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  verifiedText: {
    color: "#10b981",
    fontSize: 7,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  switchUserBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#1f2937",
  },
  switchUserText: {
    color: "#d1d5db",
    fontSize: 10,
  },
  locationBar: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#0d111a",
    borderWidth: 1,
    borderColor: "#27272a",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationLabel: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "bold",
  },
  locationAddress: {
    color: "#fff",
    fontSize: 11,
    flex: 1,
  },
  sosContainer: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#16090a",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.4)",
    alignItems: "center",
  },
  sosTag: {
    color: "#f87171",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 6,
  },
  sosTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  sosSubtitle: {
    color: "#a1a1aa",
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  sosCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  sosIcon: {
    fontSize: 28,
  },
  sosText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 26,
    letterSpacing: 2,
  },
  sosActionText: {
    color: "#fecaca",
    fontSize: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "bold",
    marginTop: 2,
  },
  formContainer: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#111520",
    borderWidth: 1,
    borderColor: "#27272a",
    gap: 12,
  },
  sectionTitle: {
    color: "#d4d4d8",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  categoryGrid: {
    gap: 8,
  },
  catBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#181d28",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  catBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "#ef4444",
  },
  catBtnText: {
    color: "#d4d4d8",
    fontSize: 11,
  },
  catBtnTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#090d16",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
    fontSize: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    textAlignVertical: "top",
  },
  mediaRow: {
    flexDirection: "row",
    gap: 8,
  },
  mediaBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#1f2937",
    alignItems: "center",
  },
  mediaBtnText: {
    color: "#e5e7eb",
    fontSize: 10,
    fontWeight: "bold",
  },
  submitBtn: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#b91c1c",
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  serverSettings: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#0d111a",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 20,
  },
  serverLabel: {
    color: "#71717a",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  serverInput: {
    backgroundColor: "#181d28",
    borderRadius: 6,
    padding: 8,
    color: "#38bdf8",
    fontSize: 11,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  serverHint: {
    color: "#52525b",
    fontSize: 9,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
