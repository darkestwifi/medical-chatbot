
(() => {
    "use strict";

    const $ = (selector) => document.querySelector(selector);

    // Voice chat elements
    const button = $("#voice-toggle");
    const status = $("#voice-status");
    const orb = $("#voice-orb");
    const title = $("#voice-title");
    const description = $("#voice-description");

    // Language buttons
    const englishButton = $("#voice-english");
    const hindiButton = $("#voice-hindi");

    if (!button || !status) {
        console.error("MindCare: Voice chat elements not found.");
        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    let recognition = null;
    let active = false;
    let processing = false;
    let speaking = false;

    let voiceChatId = null;

    // English is selected by default.
    let selectedVoiceLanguage = "en";

    const words = {
        en: {
            title: "Talk to MindCare",
            description: "Speak in English. MindCare will reply in English.",
            ready: "Ready when you are.",
            start: "Start talking",
            stop: "Stop conversation",
            listening: "Listening in English...",
            thinking: "MindCare is thinking...",
            speaking: "MindCare is speaking...",
            restarting: "Getting ready to listen again...",
            stopped: "Voice conversation stopped.",
            unsupported: "Voice recognition is not supported. Try Chrome or Edge.",
            permission: "Microphone permission denied. Please allow microphone access.",
            noSpeech: "I didn't hear anything. Please try again.",
            network: "Speech recognition network error. Check your internet connection.",
            apiError: "I couldn't connect to MindCare. Please try again.",
            genericError: "Something went wrong. Please try again."
        },

        hi: {
            title: "MindCare से बात करें",
            description: "हिंदी में बोलें। MindCare हिंदी में जवाब देगा।",
            ready: "जब आप तैयार हों, शुरू करें।",
            start: "बात शुरू करें",
            stop: "बातचीत बंद करें",
            listening: "हिंदी में सुन रहा हूँ...",
            thinking: "MindCare सोच रहा है...",
            speaking: "MindCare जवाब दे रहा है...",
            restarting: "दोबारा सुनने के लिए तैयार हो रहा हूँ...",
            stopped: "वॉइस बातचीत बंद कर दी गई है।",
            unsupported: "इस ब्राउज़र में वॉइस रिकग्निशन उपलब्ध नहीं है। Chrome या Edge इस्तेमाल करें।",
            permission: "माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया माइक्रोफ़ोन एक्सेस दें।",
            noSpeech: "आपकी आवाज़ सुनाई नहीं दी। कृपया फिर से बोलें।",
            network: "स्पीच रिकग्निशन नेटवर्क में समस्या है। इंटरनेट कनेक्शन जाँचें।",
            apiError: "MindCare से कनेक्ट नहीं हो पाया। कृपया दोबारा कोशिश करें।",
            genericError: "कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।"
        }
    };

    function t(key) {
        return words[selectedVoiceLanguage][key] || words.en[key] || key;
    }

    function setStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle("error-text", isError);
    }

    function updateInterface() {
        button.textContent = active ? t("stop") : t("start");

        if (title) title.textContent = t("title");
        if (description) description.textContent = t("description");

        if (orb) {
            orb.classList.toggle("active", active);
            orb.classList.toggle("listening", active && !speaking && !processing);
            orb.classList.toggle("speaking", speaking);

            orb.textContent = speaking ? "🔊" : active ? "🎙️" : "🎤";
        }

        if (englishButton && hindiButton) {
            englishButton.classList.toggle(
                "active",
                selectedVoiceLanguage === "en"
            );

            hindiButton.classList.toggle(
                "active",
                selectedVoiceLanguage === "hi"
            );
        }
    }

    // Select language manually.
    function setVoiceLanguage(language) {
        if (language !== "en" && language !== "hi") return;

        selectedVoiceLanguage = language;

        // Stop currently playing speech.
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        speaking = false;

        // Restart recognition with the newly selected language.
        if (recognition && active) {
            try {
                recognition.abort();
            } catch (error) {
                console.warn(error);
            }
        }

        processing = false;

        updateInterface();

        if (active) {
            setStatus(t("listening"));

            window.setTimeout(() => {
                startListening();
            }, 600);
        } else {
            setStatus(t("ready"));
        }
    }

    englishButton?.addEventListener("click", () => {
        setVoiceLanguage("en");
    });

    hindiButton?.addEventListener("click", () => {
        setVoiceLanguage("hi");
    });

    // Find a suitable installed speech voice.
    function chooseVoice(language) {
        if (!window.speechSynthesis) return null;

        const voices = window.speechSynthesis.getVoices();

        const prefix = language === "hi" ? "hi" : "en";

        const matchingVoices = voices.filter((voice) =>
            voice.lang &&
            voice.lang.toLowerCase().startsWith(prefix)
        );

        if (!matchingVoices.length) {
            console.warn("No matching speech voice found for:", language);
            return null;
        }

        const preferredNames = [
            "heera",
            "zira",
            "samantha",
            "female"
        ];

        return (
            matchingVoices.find((voice) =>
                preferredNames.some((name) =>
                    voice.name.toLowerCase().includes(name)
                )
            ) || matchingVoices[0]
        );
    }

    // Speak AI response in the selected language.
    function speakReply(reply) {
        if (!window.speechSynthesis || !reply) {
            processing = false;
            speaking = false;
            updateInterface();

            if (active) {
                startListening();
            }

            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(reply);

        utterance.lang =
            selectedVoiceLanguage === "hi" ? "hi-IN" : "en-IN";

        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 1;

        const selectedVoice = chooseVoice(selectedVoiceLanguage);

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            // Use the actual language of the installed voice.
            utterance.lang = selectedVoice.lang;
        }

        speaking = true;
        updateInterface();
        setStatus(t("speaking"));

        utterance.onend = () => {
            speaking = false;
            processing = false;

            updateInterface();

            if (active) {
                setStatus(t("restarting"));
                window.setTimeout(startListening, 500);
            } else {
                setStatus(t("stopped"));
            }
        };

        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event.error);

            speaking = false;
            processing = false;

            updateInterface();

            if (active) {
                window.setTimeout(startListening, 500);
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    // Send recognized speech to Flask / Ollama.
    async function sendToMindCare(message) {
        processing = true;
        setStatus(t("thinking"));

        try {
            const response = await fetch("/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: message,
                    chat_id: voiceChatId,
                    language: selectedVoiceLanguage
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Chat request failed");
            }

            if (data.chat_id !== undefined && data.chat_id !== null) {
                voiceChatId = data.chat_id;
            }

            if (!data.reply) {
                throw new Error("MindCare returned an empty response");
            }

            speakReply(data.reply);

        } catch (error) {
            console.error("Voice chat error:", error);

            processing = false;
            speaking = false;

            updateInterface();
            setStatus(t("apiError"), true);

            if (active) {
                window.setTimeout(startListening, 1800);
            }
        }
    }

    // Start microphone recognition.
    function startListening() {
        if (!active || processing || speaking || !recognition) return;

        try {
            recognition.lang =
                selectedVoiceLanguage === "hi" ? "hi-IN" : "en-IN";

            recognition.start();

            setStatus(t("listening"));
            updateInterface();

        } catch (error) {
            console.warn("Recognition could not start:", error);
        }
    }

    // Stop voice conversation.
    function stopConversation() {
        active = false;
        processing = false;
        speaking = false;

        if (recognition) {
            try {
                recognition.abort();
            } catch (error) {
                console.warn(error);
            }
        }

        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        updateInterface();
        setStatus(t("stopped"));
    }

    // Start voice conversation.
    function startConversation() {
        if (!SpeechRecognition) {
            setStatus(t("unsupported"), true);
            return;
        }

        if (!recognition) {
            recognition = new SpeechRecognition();

            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.lang =
                selectedVoiceLanguage === "hi" ? "hi-IN" : "en-IN";

            recognition.onresult = (event) => {
                const result = event.results[event.results.length - 1];

                if (!result || !result[0]) return;

                const spokenText = result[0].transcript.trim();

                if (!spokenText) {
                    processing = false;
                    setStatus(t("noSpeech"));
                    return;
                }

                sendToMindCare(spokenText);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);

                if (
                    event.error === "not-allowed" ||
                    event.error === "service-not-allowed"
                ) {
                    stopConversation();
                    setStatus(t("permission"), true);
                    return;
                }

                if (event.error === "no-speech") {
                    setStatus(t("noSpeech"));
                    return;
                }

                if (event.error === "network") {
                    setStatus(t("network"), true);
                    return;
                }

                if (event.error !== "aborted") {
                    setStatus(t("genericError"), true);
                }
            };

            recognition.onend = () => {
                if (active && !processing && !speaking) {
                    window.setTimeout(startListening, 500);
                }
            };
        }

        active = true;
        processing = false;
        speaking = false;

        updateInterface();
        startListening();
    }

    // Main voice button.
    button.addEventListener("click", () => {
        if (active) {
            stopConversation();
        } else {
            startConversation();
        }
    });

    // Sync with the main app language selector.
    window.addEventListener("mindcare:languagechange", (event) => {
        const language = event.detail?.language;

        if (language === "en" || language === "hi") {
            setVoiceLanguage(language);
        }
    });

    // Stop voice chat when leaving its screen.
    window.addEventListener("mindcare:viewchange", (event) => {
        const view = event.detail?.view || event.detail?.name;

        if (view !== "voice" && active) {
            stopConversation();
        }
    });

    // Load available speech voices.
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();

        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }

    updateInterface();
    setStatus(t("ready"));

})();
