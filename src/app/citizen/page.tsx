"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
    AlertTriangle, Shield, Mic, Camera, FileText, 
    Send, Radio, MapPin, Volume2, CheckCircle2, 
    Smartphone, Globe, ExternalLink, LogIn, LogOut,
    Flame, Heart, Droplets, Users, Compass, RefreshCw,
    Square, Trash2, StopCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Google Client ID provided by user
const GOOGLE_CLIENT_ID = "375902516674-uul3piammmjtvkpur89gpj75s4ibajco.apps.googleusercontent.com";

// Multilingual Dictionary
const I18N = {
    en: {
        app_name: "ResQ Citizen",
        subtitle: "Emergency Response & Citizen Distress Portal",
        sos_btn: "TAP FOR EMERGENCY SOS",
        sos_sub: "1-Click Armed Police, 108 ALS & Live GPS Broadcast",
        transmitting: "TRANSMITTING SOS SIGNAL...",
        gps_locating: "Acquiring High-Accuracy GPS...",
        location_acquired: "Location Verified",
        category_title: "Emergency Type",
        cat_crime: "Crime / Attack (Dial 100)",
        cat_medical: "Medical Trauma (Dial 108)",
        cat_fire: "Fire / Explosion (Dial 101)",
        cat_flood: "Flood / Disaster (NDRF)",
        cat_women: "Women Safety Emergency",
        report_title: "Distress Evidence & Details",
        photo_label: "Photo / Video Evidence",
        audio_label: "Record Voice Distress Note",
        text_label: "Describe Situation (Hindi / English / Hinglish)",
        placeholder_text: "Describe emergency details, trapped people, attacker description or threats...",
        submit_btn: "TRANSMIT DISTRESS REPORT",
        auth_title: "Citizen Authentication",
        login_with_google: "Sign in with Google",
        connected_as: "Verified Citizen",
        sign_out: "Sign Out",
        vibrate_notice: "Device vibration active for tactile emergency feedback",
    },
    hi: {
        app_name: "रेस्क्यू सिटिजन (ResQ Citizen)",
        subtitle: "नागरिक आपातकालीन सहायता एवं संकट निवारण पोर्टल",
        sos_btn: "आपातकालीन SOS बटन दबाएं",
        sos_sub: "एक क्लिक में पुलिस (100), 108 एम्बुलेंस और लाइव GPS प्रसारण",
        transmitting: "SOS सिग्नल प्रसारित हो रहा है...",
        gps_locating: "सटीक GPS लोकेशन प्राप्त की जा रही है...",
        location_acquired: "लोकेशन सत्यापित",
        category_title: "आपातकाल का प्रकार",
        cat_crime: "अपराध / हमला (डायल 100)",
        cat_medical: "गंभीर चिकित्सा (डायल 108)",
        cat_fire: "आग / धमाका (डायल 101)",
        cat_flood: "बाढ़ / आपदा (NDRF 1078)",
        cat_women: "महिला सुरक्षा आपातकाल",
        report_title: "घटना का विवरण एवं साक्ष्य",
        photo_label: "फोटो / वीडियो साक्ष्य",
        audio_label: "आवाज में संदेश रिकॉर्ड करें",
        text_label: "स्थिति का विवरण लिखें (हिंदी / अंग्रेजी)",
        placeholder_text: "स्थिति, फंसे हुए लोग, हमलावर या खतरे का विवरण लिखें...",
        submit_btn: "संकट रिपोर्ट दर्ज करें",
        auth_title: "नागरिक सत्यापन",
        login_with_google: "गूगल द्वारा साइन इन करें",
        connected_as: "सत्यापित नागरिक",
        sign_out: "साइन आउट",
        vibrate_notice: "आपातकालीन पुष्टि हेतु मोबाइल वाइब्रेशन सक्रिय",
    },
    hinglish: {
        app_name: "ResQ Citizen Portal",
        subtitle: "ERSS-112 Emergency Distress Reporting",
        sos_btn: "EMERGENCY SOS DABAO",
        sos_sub: "1-Click Police 100, 108 Ambulance aur Live Location",
        transmitting: "SOS Bheja Jaa Raha Hai...",
        gps_locating: "GPS Location Dhoondh Rahe Hain...",
        location_acquired: "GPS Verified",
        category_title: "Kaisi Emergency Hai?",
        cat_crime: "Crime / Attack / Hamla (Police 100)",
        cat_medical: "Medical Emergency / Ghayal (108)",
        cat_fire: "Aag / Cylinder Blast (101)",
        cat_flood: "Paani / Flood / Disaster (NDRF)",
        cat_women: "Women Safety Alert",
        report_title: "Details aur Saboot",
        photo_label: "Photo / Video Upload Karein",
        audio_label: "Voice Note Record Karein",
        text_label: "Emergency ki Baat Likhein",
        placeholder_text: "Kitne log fase hain, kya khatra hai yahan likhein...",
        submit_btn: "REPORT COMMAND CENTER BHEJO",
        auth_title: "Citizen Login",
        login_with_google: "Google se Login Karein",
        connected_as: "Verified Citizen",
        sign_out: "Logout",
        vibrate_notice: "Emergency alert vibration active",
    }
};

export default function CitizenPortalPage() {
    const [lang, setLang] = useState<"en" | "hi" | "hinglish">("en");
    const t = I18N[lang];

    // User Profile
    const [user, setUser] = useState<{
        name: string;
        email: string;
        photo_url?: string;
        google_id?: string;
    }>({
        name: "Aakash Sharma",
        email: "aakash.sharma.citizen@gmail.com",
        photo_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
        google_id: "GOOG-IND-987452",
    });

    const [isLoggedIn, setIsLoggedIn] = useState(true);

    // Location State
    const [location, setLocation] = useState<{
        lat: number;
        lng: number;
        address: string;
        accuracy?: number;
    }>({
        lat: 28.6139,
        lng: 77.2090,
        address: "Rajpath, India Gate Circle, New Delhi",
        accuracy: 10,
    });
    const [isLocating, setIsLocating] = useState(false);
    const [locationSource, setLocationSource] = useState<"GPS" | "IP" | "PRESET">("GPS");

    // Form State
    const [category, setCategory] = useState<string>("CRIME_ATTACK");
    const [description, setDescription] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
    const [audioBase64, setAudioBase64] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // SOS State & Alarm Silencing
    const [isSosActive, setIsSosActive] = useState(false);
    const sosVibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Submission Status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSubmission, setLastSubmission] = useState<{
        incidentId: string;
        time: string;
        status: string;
        mode: string;
    } | null>(null);

    // Real-time Dashboard Connectivity Status
    const [commandCenterMode, setCommandCenterMode] = useState<"ACTIVE" | "ISOLATED" | "OFFLINE">("ISOLATED");

    // Fetch GPS on mount
    useEffect(() => {
        refreshGPS();
        checkCommandCenterStatus();
        const poll = setInterval(checkCommandCenterStatus, 4000);
        return () => {
            clearInterval(poll);
            if (sosVibrationIntervalRef.current) clearInterval(sosVibrationIntervalRef.current);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };
    }, []);

    const checkCommandCenterStatus = async () => {
        try {
            const res = await fetch("/api/signals/live");
            if (res.ok) {
                const data = await res.json();
                setCommandCenterMode(data.mode || "ISOLATED");
            }
        } catch {
            setCommandCenterMode("OFFLINE");
        }
    };

    // IP Geolocation Fallback (Works even if browser blocks GPS or over HTTP)
    const fetchIPLocation = async (): Promise<boolean> => {
        try {
            const res = await fetch("https://ipapi.co/json/");
            if (res.ok) {
                const data = await res.json();
                if (data.latitude && data.longitude) {
                    const lat = parseFloat(data.latitude);
                    const lng = parseFloat(data.longitude);
                    const address = `${data.city || "City"}, ${data.region || "Region"}, ${data.country_name || "India"} (IP Geo)`;
                    setLocation({ lat, lng, address, accuracy: 250 });
                    setLocationSource("IP");
                    return true;
                }
            }
        } catch (e) {
            console.warn("[GPS] IP Geolocation fallback failed:", e);
        }
        return false;
    };

    const refreshGPS = () => {
        setIsLocating(true);
        if (typeof window !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const accuracy = Math.round(pos.coords.accuracy || 10);

                    let address = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (GPS Position)`;
                    try {
                        const geoRes = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
                        );
                        if (geoRes.ok) {
                            const data = await geoRes.json();
                            if (data.display_name) {
                                address = data.display_name.split(",").slice(0, 3).join(",");
                            }
                        }
                    } catch (e) { }

                    setLocation({ lat, lng, address, accuracy });
                    setLocationSource("GPS");
                    setIsLocating(false);
                },
                async (err) => {
                    console.warn("[GPS] Device geolocation denied/timed out, attempting IP-based fallback...", err);
                    const ipSuccess = await fetchIPLocation();
                    if (!ipSuccess) {
                        setLocation({
                            lat: 28.6139,
                            lng: 77.2090,
                            address: "Rajpath, India Gate Circle, New Delhi",
                            accuracy: 100,
                        });
                        setLocationSource("PRESET");
                    }
                    setIsLocating(false);
                },
                { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
            );
        } else {
            fetchIPLocation().finally(() => setIsLocating(false));
        }
    };

    const setPresetLocation = (lat: number, lng: number, address: string) => {
        setLocation({ lat, lng, address, accuracy: 5 });
        setLocationSource("PRESET");
        triggerVibration([50]);
    };

    // Trigger Device Vibration
    const triggerVibration = (pattern = [100, 50, 100, 50, 300]) => {
        if (typeof window !== "undefined" && navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) { }
        }
    };

    // Stop and Silence SOS Alarm
    const stopSOSAlarm = () => {
        setIsSosActive(false);
        if (sosVibrationIntervalRef.current) {
            clearInterval(sosVibrationIntervalRef.current);
            sosVibrationIntervalRef.current = null;
        }
        if (typeof window !== "undefined" && navigator.vibrate) {
            navigator.vibrate(0); // Immediately stops vibration
        }
        if (isRecordingAudio) {
            stopAudioRecording();
        }
    };

    // Audio Recorder with 20s Max Auto-Stop and Base64 conversion
    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                setAudioBlobUrl(URL.createObjectURL(blob));

                // Convert audio Blob into Base64 data URL for real transmission to API
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAudioBase64(reader.result as string);
                };
                reader.readAsDataURL(blob);

                stream.getTracks().forEach(track => track.stop());
                if (recordingTimerRef.current) {
                    clearInterval(recordingTimerRef.current);
                    recordingTimerRef.current = null;
                }
            };

            mediaRecorderRef.current.start();
            setIsRecordingAudio(true);
            setRecordingDuration(0);
            triggerVibration([100]);

            // Auto-stop countdown at 20s
            let duration = 0;
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = setInterval(() => {
                duration += 1;
                setRecordingDuration(duration);
                if (duration >= 20) {
                    stopAudioRecording();
                }
            }, 1000);
        } catch (err) {
            alert("Microphone permission required to record distress voice notes.");
        }
    };

    const stopAudioRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        setIsRecordingAudio(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        triggerVibration([50, 50, 100]);
    };

    const clearAudioRecording = () => {
        setAudioBlobUrl(null);
        setAudioBase64(null);
        setRecordingDuration(0);
    };

    // Image Upload Handler
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // ========================================================
    // ONE-CLICK SOS TRIGGER
    // ========================================================
    const triggerOneClickSOS = async () => {
        setIsSosActive(true);
        triggerVibration([0, 500, 200, 500, 200, 1000]);

        // Periodic high-alert pulsing vibration
        if (sosVibrationIntervalRef.current) clearInterval(sosVibrationIntervalRef.current);
        sosVibrationIntervalRef.current = setInterval(() => {
            triggerVibration([300, 150, 300]);
        }, 2500);

        setIsSubmitting(true);

        const customMsg = description.trim();
        const sosDescription = customMsg
            ? `🚨 URGENT 1-CLICK SOS: "${customMsg}" [Citizen: ${user.name} | Location: ${location.address}]`
            : `🚨 URGENT 1-CLICK CITIZEN SOS! High alert emergency declared by ${user.name} at ${location.address}. Immediate Police (100) & Emergency Life Support intervention requested.`;

        const sosPayload = {
            signal_type: "SOS" as const,
            citizen: user,
            location: location,
            category_hint: "CRIME_ATTACK" as const,
            description: sosDescription,
            media_base64: audioBase64 || imagePreview || undefined,
            timestamp: new Date().toISOString(),
            is_live_citizen: true,
        };

        try {
            const res = await fetch("/api/signals/live", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sosPayload),
            });

            const data = await res.json();
            if (res.ok) {
                setLastSubmission({
                    incidentId: data.incident_id,
                    time: new Date().toLocaleTimeString(),
                    status: data.is_live_handled 
                        ? "DISPATCHED TO COMMAND CENTER (Live Multi-Agent Response Engaged)" 
                        : "QUEUED IN CITIZEN INBOX (Command Center currently in isolated drill mode)",
                    mode: data.mode,
                });
            } else {
                alert(`SOS Failed: ${data.error || "Network error"}`);
            }
        } catch (err: any) {
            alert(`Error transmitting SOS: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ========================================================
    // GENERAL DISTRESS REPORT SUBMISSION
    // ========================================================
    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerVibration([80, 40, 80]);
        setIsSubmitting(true);

        const hasAudio = !!audioBase64;
        const hasImage = !!imagePreview;
        const signalType = hasAudio ? "AUDIO" : hasImage ? "IMAGE" : "TEXT";
        const mediaBase64 = hasAudio ? audioBase64 : hasImage ? imagePreview : undefined;

        const customMsg = description.trim();
        const reportDescription = customMsg
            ? customMsg
            : hasAudio
            ? `Citizen voice distress note (${category}) recorded at ${location.address}.`
            : hasImage
            ? `Citizen photographic evidence (${category}) captured at ${location.address}.`
            : `Citizen emergency distress report (${category}) from ${location.address}`;

        const payload = {
            signal_type: signalType,
            citizen: user,
            location: location,
            category_hint: category as any,
            description: reportDescription,
            media_base64: mediaBase64,
            timestamp: new Date().toISOString(),
            is_live_citizen: true,
        };

        try {
            const res = await fetch("/api/signals/live", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok) {
                setLastSubmission({
                    incidentId: data.incident_id,
                    time: new Date().toLocaleTimeString(),
                    status: data.is_live_handled 
                        ? "DISPATCHED TO COMMAND CENTER (Live Multi-Agent Response Engaged)" 
                        : "QUEUED IN CITIZEN INBOX (Command Center currently in isolated drill mode)",
                    mode: data.mode,
                });
                setDescription("");
                setImagePreview(null);
                setAudioBlobUrl(null);
                setAudioBase64(null);
                setRecordingDuration(0);
            } else {
                alert(`Transmission failed: ${data.error || "Server error"}`);
            }
        } catch (err: any) {
            alert(`Transmission error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen w-full bg-[#07090e] text-zinc-100 flex flex-col font-sans selection:bg-red-500/30">
            {/* Top Navigation & Status Bar */}
            <header className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[#0a0d14]/90 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-black text-white text-lg shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        R
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                            {t.app_name}
                            <span className="px-1.5 py-0.2 rounded text-[8px] bg-red-500/20 text-red-400 font-mono border border-red-500/30">
                                ERSS-112
                            </span>
                        </h1>
                        <p className="text-[9px] text-zinc-400 font-mono">{t.subtitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Language Switcher */}
                    <div className="flex items-center bg-zinc-900 border border-white/10 rounded-full p-0.5 text-[10px] font-mono">
                        <button
                            onClick={() => setLang("en")}
                            className={cn("px-2.5 py-1 rounded-full transition-all", lang === "en" ? "bg-red-500 text-white font-bold" : "text-zinc-400 hover:text-white")}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLang("hi")}
                            className={cn("px-2.5 py-1 rounded-full transition-all", lang === "hi" ? "bg-red-500 text-white font-bold" : "text-zinc-400 hover:text-white")}
                        >
                            हिंदी
                        </button>
                        <button
                            onClick={() => setLang("hinglish")}
                            className={cn("px-2.5 py-1 rounded-full transition-all", lang === "hinglish" ? "bg-red-500 text-white font-bold" : "text-zinc-400 hover:text-white")}
                        >
                            Hinglish
                        </button>
                    </div>

                    {/* Command Center Live Badge */}
                    <div className={cn(
                        "hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-mono font-bold tracking-wider",
                        commandCenterMode === "ACTIVE"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 animate-pulse"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    )}>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            commandCenterMode === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400"
                        )} />
                        <span>{commandCenterMode === "ACTIVE" ? "COMMAND CENTER: LIVE ONLINE" : "DRILL ISOLATION: QUEUED"}</span>
                    </div>

                    {/* Return to Dashboard */}
                    <a
                        href="/"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-[10px] font-mono font-bold transition-all"
                    >
                        <span>DASHBOARD</span>
                        <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </a>
                </div>
            </header>

            {/* Main Citizen Container */}
            <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">
                {/* User Profile & Google Auth Banner */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img
                            src={user.photo_url}
                            alt={user.name}
                            className="w-11 h-11 rounded-full border-2 border-emerald-500/50 shadow-md object-cover"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{user.name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[8px] bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30 flex items-center gap-1">
                                    <Shield className="w-2.5 h-2.5" /> GOOGLE AUTH
                                </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 font-mono">{user.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                        <button
                            onClick={() => {
                                const nextUser = user.name === "Aakash Sharma"
                                    ? {
                                        name: "Pooja Varma",
                                        email: "pooja.varma.citizen@gmail.com",
                                        photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
                                        google_id: "GOOG-IND-443210",
                                    }
                                    : {
                                        name: "Aakash Sharma",
                                        email: "aakash.sharma.citizen@gmail.com",
                                        photo_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
                                        google_id: "GOOG-IND-987452",
                                    };
                                setUser(nextUser);
                                triggerVibration([50]);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-[10px] font-mono text-zinc-300 hover:text-white transition-all bg-white/[0.02]"
                        >
                            Switch Demo Citizen
                        </button>
                    </div>
                </div>

                {/* Active SOS Emergency Alarm Sticky Bar */}
                {isSosActive && (
                    <div className="sticky top-20 z-40 p-4 rounded-2xl bg-red-950/90 border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 animate-pulse">
                        <div className="flex items-center gap-3">
                            <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
                            <div>
                                <h4 className="font-black text-sm text-white tracking-wider flex items-center gap-2">
                                    <span>🚨 SOS DISTRESS ALARM BROADCASTING</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-600 text-white">ACTIVE</span>
                                </h4>
                                <p className="text-[11px] text-red-200 font-mono">
                                    Vibration & emergency telemetry active. Dispatched to Police 100 & ALS Ambulance.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={stopSOSAlarm}
                            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-red-700 font-black text-xs font-mono tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                        >
                            <Square className="w-4 h-4 fill-red-700 text-red-700" />
                            <span>STOP SOS & SILENCE ALARM</span>
                        </button>
                    </div>
                )}

                {/* GPS Location Telemetry Banner & Quick Preset Controls */}
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                        <div className="flex items-center gap-2.5 text-zinc-300">
                            <MapPin className={cn("w-4 h-4 text-red-500 shrink-0", isLocating && "animate-bounce")} />
                            <span className="text-zinc-500 uppercase text-[10px] font-bold">REAL GPS:</span>
                            <span className="text-white font-bold tracking-wide">
                                {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                                ±{location.accuracy || 10}m ({locationSource})
                            </span>
                        </div>
                        <button
                            onClick={refreshGPS}
                            disabled={isLocating}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border border-white/5"
                        >
                            <RefreshCw className={cn("w-3 h-3", isLocating && "animate-spin")} />
                            <span>{isLocating ? "Detecting GPS..." : "Auto-Detect Device GPS"}</span>
                        </button>
                    </div>

                    {/* Editable / Verified Address Field */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-mono uppercase shrink-0">Address:</span>
                        <input
                            type="text"
                            value={location.address}
                            onChange={(e) => setLocation(prev => ({ ...prev, address: e.target.value }))}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-red-500/50"
                            placeholder="Type or verify emergency landmark / street..."
                        />
                    </div>

                    {/* Quick Location Presets for Instant Real Testing */}
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] text-zinc-500 font-mono uppercase mr-1">Quick Cities:</span>
                        <button
                            type="button"
                            onClick={() => setPresetLocation(28.6315, 77.2167, "Connaught Place, New Delhi")}
                            className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[9px] font-mono border border-white/5 transition-all"
                        >
                            Delhi (CP)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPresetLocation(18.9438, 72.8231, "Marine Drive Promenade, Mumbai")}
                            className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[9px] font-mono border border-white/5 transition-all"
                        >
                            Mumbai (Marine Dr)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPresetLocation(12.9352, 77.6245, "Koramangala 5th Block, Bengaluru")}
                            className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[9px] font-mono border border-white/5 transition-all"
                        >
                            Bengaluru (Koramangala)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPresetLocation(21.1702, 72.8311, "Tapi River Flood Bank, Surat")}
                            className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[9px] font-mono border border-white/5 transition-all"
                        >
                            Surat (Flood Area)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPresetLocation(22.5516, 88.3524, "Park Street Crossing, Kolkata")}
                            className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[9px] font-mono border border-white/5 transition-all"
                        >
                            Kolkata (Park St)
                        </button>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 🚨 ONE-CLICK SOS BIG PANIC BUTTON                          */}
                {/* ======================================================== */}
                <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-b from-red-950/40 via-red-900/10 to-transparent border-2 border-red-500/30 flex flex-col items-center justify-center text-center overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none" />

                    <div className="text-center mb-6 z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-mono text-[10px] font-bold tracking-widest uppercase border border-red-500/30 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> DIAL 100 / 108 / 112 HIGH ALERT
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                            {t.sos_btn}
                        </h2>
                        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 font-mono">
                            {t.sos_sub}
                        </p>
                    </div>

                    {/* Massive SOS Circular Button with Waves */}
                    <div className="relative my-4">
                        <div className="absolute inset-0 rounded-full bg-red-600/30 animate-ping duration-1000" />
                        <div className="absolute inset-[-12px] rounded-full border border-red-500/40 animate-pulse" />

                        <button
                            onClick={triggerOneClickSOS}
                            disabled={isSubmitting}
                            className={cn(
                                "relative w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white font-black text-3xl md:text-4xl tracking-widest shadow-[0_0_40px_rgba(239,68,68,0.6)] flex flex-col items-center justify-center transition-all transform active:scale-95 hover:scale-105 border-4 border-white/20 cursor-pointer",
                                isSubmitting && "opacity-80 cursor-wait"
                            )}
                        >
                            <AlertTriangle className="w-10 h-10 mb-1 animate-bounce" />
                            <span>SOS</span>
                            <span className="text-[9px] font-mono tracking-widest text-red-200 uppercase mt-1">
                                {isSubmitting ? "TRANSMITTING..." : "TAP TO SEND"}
                            </span>
                        </button>
                    </div>

                    {/* Control Buttons for Stopping SOS / Silencing Alarm */}
                    <div className="flex items-center gap-3 mt-3 z-10">
                        {isSosActive && (
                            <button
                                onClick={stopSOSAlarm}
                                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-red-500/40 text-red-400 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                            >
                                <StopCircle className="w-4 h-4 text-red-400" />
                                <span>SILENCE / CANCEL SOS ALARM</span>
                            </button>
                        )}
                    </div>

                    <p className="text-[10px] text-zinc-500 font-mono mt-3 flex items-center gap-1.5 z-10">
                        <Smartphone className="w-3 h-3 text-red-400" />
                        {t.vibrate_notice}
                    </p>
                </div>

                {/* Last Submission Feedback Banner */}
                {lastSubmission && (
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="font-bold text-xs text-white flex items-center gap-2">
                                    <span>SIGNAL TRANSMITTED: {lastSubmission.incidentId}</span>
                                    <span className="text-[9px] font-mono text-emerald-400">({lastSubmission.time})</span>
                                </div>
                                <p className="text-[11px] text-emerald-200/90 font-mono mt-0.5">
                                    {lastSubmission.status}
                                </p>
                            </div>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold shrink-0">
                            MODE: {lastSubmission.mode}
                        </span>
                    </div>
                )}

                {/* ======================================================== */}
                {/* MULTIMODAL DISTRESS REPORT FORM                          */}
                {/* ======================================================== */}
                <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-5">
                    <div className="border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            {t.report_title}
                        </h3>
                    </div>

                    <form onSubmit={handleSubmitReport} className="space-y-4">
                        {/* Emergency Category Chips */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
                                {t.category_title}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setCategory("CRIME_ATTACK")}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer",
                                        category === "CRIME_ATTACK"
                                            ? "border-red-500 bg-red-500/20 text-white font-bold shadow-sm"
                                            : "border-white/5 bg-white/[0.02] text-zinc-300 hover:bg-white/5"
                                    )}
                                >
                                    <Shield className="w-4 h-4 text-red-400 shrink-0" />
                                    <span>{t.cat_crime}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCategory("WOMEN_SAFETY")}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer",
                                        category === "WOMEN_SAFETY"
                                            ? "border-pink-500 bg-pink-500/20 text-white font-bold shadow-sm"
                                            : "border-white/5 bg-white/[0.02] text-zinc-300 hover:bg-white/5"
                                    )}
                                >
                                    <Users className="w-4 h-4 text-pink-400 shrink-0" />
                                    <span>{t.cat_women}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCategory("MEDICAL")}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer",
                                        category === "MEDICAL"
                                            ? "border-emerald-500 bg-emerald-500/20 text-white font-bold shadow-sm"
                                            : "border-white/5 bg-white/[0.02] text-zinc-300 hover:bg-white/5"
                                    )}
                                >
                                    <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>{t.cat_medical}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCategory("FIRE")}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer",
                                        category === "FIRE"
                                            ? "border-amber-500 bg-amber-500/20 text-white font-bold shadow-sm"
                                            : "border-white/5 bg-white/[0.02] text-zinc-300 hover:bg-white/5"
                                    )}
                                >
                                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>{t.cat_fire}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCategory("FLOOD_DISASTER")}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer",
                                        category === "FLOOD_DISASTER"
                                            ? "border-cyan-500 bg-cyan-500/20 text-white font-bold shadow-sm"
                                            : "border-white/5 bg-white/[0.02] text-zinc-300 hover:bg-white/5"
                                    )}
                                >
                                    <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span>{t.cat_flood}</span>
                                </button>
                            </div>
                        </div>

                        {/* Text Description Field */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
                                    {t.text_label}
                                </label>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                    (Included automatically if you tap 1-Click SOS)
                                </span>
                            </div>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder={t.placeholder_text}
                                className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 font-sans leading-relaxed"
                            />
                        </div>

                        {/* Multimodal Inputs (Audio & Photo) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Photo / Camera Evidence Upload */}
                            <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2">
                                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                                    {t.photo_label}
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    capture="environment"
                                    onChange={handleImageChange}
                                    className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-mono file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                                />
                                {imagePreview && (
                                    <div className="relative mt-2 rounded-lg overflow-hidden border border-white/10 max-h-32">
                                        <img src={imagePreview} alt="Incident Preview" className="w-full h-32 object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setImagePreview(null)}
                                            className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-red-400 text-[9px] font-mono cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Voice Distress Memo with 20s Countdown & Stop/Discard Controls */}
                            <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                                        {t.audio_label}
                                    </label>
                                    {isRecordingAudio && (
                                        <span className="text-[9px] font-mono text-red-400 animate-pulse font-bold">
                                            00:{String(recordingDuration).padStart(2, '0')} / 20s max
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {!isRecordingAudio ? (
                                        <button
                                            type="button"
                                            onClick={startAudioRecording}
                                            className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center justify-center gap-2 transition-all border border-white/5 cursor-pointer"
                                        >
                                            <Mic className="w-3.5 h-3.5 text-red-400" />
                                            <span>{audioBlobUrl ? "Re-record Voice Note" : "Record Voice Note"}</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={stopAudioRecording}
                                            className="flex-1 py-2 px-3 rounded-lg bg-red-600 animate-pulse text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                        >
                                            <Square className="w-3.5 h-3.5 fill-white text-white" />
                                            <span>Stop Recording ({20 - recordingDuration}s left)</span>
                                        </button>
                                    )}

                                    {audioBlobUrl && !isRecordingAudio && (
                                        <button
                                            type="button"
                                            onClick={clearAudioRecording}
                                            className="p-2 rounded-lg bg-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-white/5 transition-all cursor-pointer"
                                            title="Discard Voice Note"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {audioBlobUrl && (
                                    <div className="pt-1.5 space-y-1">
                                        <div className="flex items-center justify-between text-[9px] font-mono text-emerald-400">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                Voice Memo Encoded (Ready to Transmit)
                                            </span>
                                            <span className="text-zinc-500">audio/webm</span>
                                        </div>
                                        <audio src={audioBlobUrl} controls className="h-7 w-full rounded" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={cn(
                                "w-full py-3.5 rounded-xl font-mono text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer",
                                isSubmitting
                                    ? "bg-zinc-800 text-zinc-500 cursor-wait"
                                    : "bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-[0.99]"
                            )}
                        >
                            <Send className="w-4 h-4" />
                            <span>{isSubmitting ? t.transmitting : t.submit_btn}</span>
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
