
/* =========================================
   MINDCARE AI - COMPLETE FRONTEND
========================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const form = $("#chat-form");
const input = $("#message");
const messages = $("#messages");
const statusLine = $("#status");
const sendButton = $("#send");
const chatList = $("#chat-list");
const speakButton = $("#speak");

const moodInfo = {
  1: { emoji: "😢", en: "Very Low", hi: "बहुत उदास" },
  2: { emoji: "😟", en: "Low", hi: "उदास" },
  3: { emoji: "😐", en: "Okay", hi: "ठीक" },
  4: { emoji: "🙂", en: "Good", hi: "अच्छा" },
  5: { emoji: "😄", en: "Great", hi: "बहुत अच्छा" }
};

let activeChatId = null;
let selectedMood = null;
let lastReply = "Hi! I'm here to listen.";

let allMoods = [];
let selectedCalendarDate = null;
let calendarMonth = new Date();

let language = localStorage.getItem("mindcare-language") || "en";

let exerciseSteps = [];
let exerciseIndex = 0;
let exerciseTimer = null;

/* Speech state */
let availableVoices = [];
let speechActive = false;
let currentUtterance = null;
let speechSession = 0;

/* =========================================
   TRANSLATIONS
========================================= */

const translations = {
  en: {
    newChat: "＋ New Chat",
    dashboard: "📊 Dashboard",
    journal: "📔 Journal",
    exercises: "🌿 Wellness Exercises",
    previousChats: "Previous Chats",
    localNote: "Your conversations and entries are saved locally on this computer.",
    subtitle: "Your friendly mental wellness companion",
    backToChat: "← Back to Chat",
    safetyNotice: "💜  MindCare AI is a wellness companion, not a medical service. It cannot replace a qualified mental health professional. If you are in immediate danger, contact local emergency services or someone you trust.",
    assistantTitle: "MindCare Assistant",
    hereToListen: "Here to listen",
    send: "Send ➤",
    breathing: "🌿 Breathing Exercise",
    readReply: "🔊 Read Last Reply",
    stopReply: "⏹ Stop Speaking",
    moreExercises: "✨ More Exercises",
    dailyThought: "A THOUGHT FOR TODAY",
    footerLine: "Take a moment for yourself. You matter. 💜",
    wellnessSpace: "YOUR WELLNESS SPACE",

    dashboardTitle: "Your Mental Wellness Dashboard 💜",
    dashboardIntro: "Notice your feelings, reflect on your journey, and take one small step at a time.",
    dailyCheckin: "DAILY CHECK-IN",
    howFeeling: "How are you feeling today?",
    moodPrompt: "Choose the mood that best describes how you feel right now.",
    veryLow: "Very Low",
    low: "Low",
    okay: "Okay",
    good: "Good",
    great: "Great",
    moodNoteLabel: "Want to share more about your feelings? (Optional)",
    saveMood: "Save Today's Mood 💜",
    yourProgress: "YOUR PROGRESS",
    moodOverview: "Your Mood Overview",
    selectMonth: "Month",
    totalCheckins: "Total check-ins",
    monthEntries: "Entries this month",
    averageMood: "Average mood",
    mostCommon: "Most common mood",
    monthAtGlance: "MONTH AT A GLANCE",
    moodCalendar: "Mood Calendar",
    calendarHelp: "Select a day to see the mood entries recorded for it.",
    patterns: "PATTERNS",
    monthlyAnalytics: "Monthly Analytics",
    distributionHelp: "How often each mood was recorded this month.",
    weeklyMood: "Weekly Mood Overview",
    weeklyHelp: "Your average mood for each of the last seven days.",
    recentHistory: "Recent Mood History",
    latestCheckins: "Your latest saved check-ins.",
    kindReminder: "Progress isn't always linear. Be kind to yourself. 💜",

    privateReflection: "PRIVATE REFLECTION",
    journalTitle: "Your Personal Journal 📔",
    journalIntro: "A place to put your thoughts into words, without judgment.",
    newEntry: "Write a journal entry",
    entryTitle: "Entry title",
    yourThoughts: "Your thoughts",
    saveEntry: "Save Entry",
    journalPrivacy: "Your journal entries are private to your account and are not visible to other users.",
    pastEntries: "Previous Entries",
    journalHistory: "Your saved reflections.",

    takeBreath: "PAUSE AND RESET",
    exerciseTitle: "Wellness Exercises 🌿",
    exerciseIntro: "Choose a gentle activity. Stop if anything feels uncomfortable.",
    boxBreathing: "Calm Breathing",
    boxBreathingDesc: "Follow a gentle breathing rhythm: breathe in, pause, breathe out, pause.",
    grounding: "5-4-3-2-1 Grounding",
    groundingDesc: "Bring attention to your surroundings through your five senses.",
    mindfulPause: "Mindful Pause",
    mindfulDesc: "Take a short pause to notice your body, thoughts and surroundings.",
    startExercise: "Start exercise",
    chooseExercise: "Choose an exercise",
    exerciseStageHint: "Your guided instructions will appear here.",
    nextStep: "Next step",
    finishExercise: "Finish",

    noChats: "No previous chats yet.",
    noMoods: "No mood records yet. Save your first mood check-in above.",
    noJournals: "No journal entries yet.",
    savedMood: "💜 Your mood check-in has been saved.",
    selectMood: "Please select how you are feeling first.",
    saving: "Saving...",
    savedJournal: "Your journal entry has been saved.",
    deleted: "Entry deleted.",
    confirmDelete: "Delete this journal entry? This cannot be undone.",
    loading: "Loading...",
    noData: "Not enough data yet",
    compared: "Compared with previous month",
    noComparison: "No previous-month data",
    dayEmpty: "No mood check-ins recorded for this day.",
    chooseDay: "Choose a day to view its check-ins.",
    exerciseDone: "Exercise complete. Take a moment to notice how you feel.",
    exerciseStopped: "Exercise finished. Be gentle with yourself.",
    startPrompt: "Let's begin. Find a comfortable position.",
    readOnly: "This is a local prototype. Avoid storing highly sensitive information here."
  },

  hi: {
    newChat: "＋ नई बातचीत",
    dashboard: "📊 डैशबोर्ड",
    journal: "📔 डायरी",
    exercises: "🌿 वेलनेस अभ्यास",
    previousChats: "पिछली बातचीत",
    localNote: "आपकी बातचीत और प्रविष्टियाँ इसी कंप्यूटर पर सहेजी जाती हैं।",
    subtitle: "आपका मानसिक स्वास्थ्य साथी",
    backToChat: "← चैट पर वापस जाएँ",
    safetyNotice: "💜 MindCare AI एक विद्यार्थी परियोजना है, चिकित्सा सेवा नहीं। यदि आप तत्काल खतरे में हैं, तो स्थानीय आपातकालीन सेवा या किसी भरोसेमंद व्यक्ति से संपर्क करें।",
    assistantTitle: "MindCare सहायक",
    hereToListen: "आपकी बात सुनने के लिए यहाँ",
    send: "भेजें ➤",
    breathing: "🌿 साँस लेने का अभ्यास",
    readReply: "🔊 जवाब सुनें",
    stopReply: "⏹ बोलना बंद करें",
    moreExercises: "✨ और अभ्यास",
    dailyThought: "आज का विचार",
    footerLine: "अपने लिए थोड़ा समय निकालें। आप महत्वपूर्ण हैं। 💜",
    wellnessSpace: "आपकी वेलनेस जगह",

    dashboardTitle: "आपका मानसिक स्वास्थ्य डैशबोर्ड 💜",
    dashboardIntro: "अपनी भावनाओं को समझें, अपनी यात्रा पर विचार करें और एक छोटा कदम उठाएँ।",
    dailyCheckin: "आज का चेक-इन",
    howFeeling: "आज आप कैसा महसूस कर रहे हैं?",
    moodPrompt: "वह भावना चुनें जो अभी आपकी स्थिति बताती है।",
    veryLow: "बहुत उदास",
    low: "उदास",
    okay: "ठीक",
    good: "अच्छा",
    great: "बहुत अच्छा",
    moodNoteLabel: "क्या आप अपनी भावनाओं के बारे में और लिखना चाहेंगे? (वैकल्पिक)",
    saveMood: "आज का मूड सहेजें 💜",
    yourProgress: "आपकी प्रगति",
    moodOverview: "आपके मूड का सारांश",
    selectMonth: "महीना",
    totalCheckins: "कुल चेक-इन",
    monthEntries: "इस महीने की प्रविष्टियाँ",
    averageMood: "औसत मूड",
    mostCommon: "सबसे आम मूड",
    monthAtGlance: "इस महीने की झलक",
    moodCalendar: "मूड कैलेंडर",
    calendarHelp: "उस दिन के मूड रिकॉर्ड देखने के लिए तारीख चुनें।",
    patterns: "रुझान",
    monthlyAnalytics: "मासिक विश्लेषण",
    distributionHelp: "इस महीने हर मूड कितनी बार दर्ज हुआ।",
    weeklyMood: "साप्ताहिक मूड",
    weeklyHelp: "पिछले सात दिनों का औसत मूड।",
    recentHistory: "हाल का मूड इतिहास",
    latestCheckins: "आपके हाल के चेक-इन।",
    kindReminder: "प्रगति हमेशा सीधी रेखा में नहीं होती। अपने प्रति दयालु रहें। 💜",

    privateReflection: "निजी विचार",
    journalTitle: "आपकी व्यक्तिगत डायरी 📔",
    journalIntro: "अपने विचार बिना किसी निर्णय के शब्दों में लिखने की जगह।",
    newEntry: "डायरी में लिखें",
    entryTitle: "शीर्षक",
    yourThoughts: "आपके विचार",
    saveEntry: "प्रविष्टि सहेजें",
    journalPrivacy: "डायरी की प्रविष्टियाँ इस ऐप के स्थानीय SQLite डेटाबेस में रखी जाती हैं। इस संस्करण में अलग-अलग खाते नहीं हैं।",
    pastEntries: "पुरानी प्रविष्टियाँ",
    journalHistory: "आपके सहेजे हुए विचार।",

    takeBreath: "रुकें और फिर से सहज हों",
    exerciseTitle: "वेलनेस अभ्यास 🌿",
    exerciseIntro: "कोई हल्का अभ्यास चुनें। असहज लगे तो रुक जाएँ।",
    boxBreathing: "शांत साँस अभ्यास",
    boxBreathingDesc: "धीरे साँस लें, थोड़ी देर रुकें, साँस छोड़ें और फिर रुकें।",
    grounding: "5-4-3-2-1 ग्राउंडिंग",
    groundingDesc: "अपनी पाँच इंद्रियों से आसपास की चीज़ों पर ध्यान दें।",
    mindfulPause: "सचेत विराम",
    mindfulDesc: "अपने शरीर, विचारों और आसपास के वातावरण को महसूस करने के लिए छोटा विराम लें।",
    startExercise: "अभ्यास शुरू करें",
    chooseExercise: "एक अभ्यास चुनें",
    exerciseStageHint: "निर्देश यहाँ दिखाई देंगे।",
    nextStep: "अगला चरण",
    finishExercise: "समाप्त करें",

    noChats: "अभी कोई पुरानी बातचीत नहीं है।",
    noMoods: "अभी कोई मूड रिकॉर्ड नहीं है। पहला चेक-इन सहेजें।",
    noJournals: "अभी कोई डायरी प्रविष्टि नहीं है।",
    savedMood: "💜 आपका मूड सहेज लिया गया है।",
    selectMood: "पहले अपना मूड चुनें।",
    saving: "सहेजा जा रहा है...",
    savedJournal: "आपकी डायरी प्रविष्टि सहेज ली गई है।",
    deleted: "प्रविष्टि हटा दी गई।",
    confirmDelete: "क्या आप यह प्रविष्टि हटाना चाहते हैं? इसे वापस नहीं लाया जा सकता।",
    loading: "लोड हो रहा है...",
    noData: "अभी पर्याप्त डेटा नहीं है",
    compared: "पिछले महीने से तुलना",
    noComparison: "पिछले महीने का डेटा उपलब्ध नहीं है",
    dayEmpty: "इस दिन कोई मूड चेक-इन दर्ज नहीं है।",
    chooseDay: "चेक-इन देखने के लिए तारीख चुनें।",
    exerciseDone: "अभ्यास पूरा हुआ। ध्यान दें कि अब आप कैसा महसूस कर रहे हैं।",
    exerciseStopped: "अभ्यास समाप्त हुआ। अपने प्रति कोमल रहें।",
    startPrompt: "शुरू करते हैं। आरामदायक स्थिति में बैठें।",
    readOnly: "यह स्थानीय प्रोटोटाइप है। इसमें बहुत संवेदनशील जानकारी न रखें।"
  }
};

const t = (key) =>
  translations[language][key] || translations.en[key] || key;

/* =========================================
   DATE HELPERS
========================================= */

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value) {
  if (!value) return null;

  const parts = value.slice(0, 10).split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDate(
  value,
  options = { day: "numeric", month: "short", year: "numeric" }
) {
  const d = parseLocalDate(value) || new Date(value);

  return Number.isNaN(d.getTime())
    ? (value || "")
    : d.toLocaleDateString(
        language === "hi" ? "hi-IN" : "en-IN",
        options
      );
}

function setStatus(el, message, isError = false) {
  if (!el) return;

  el.textContent = message;
  el.classList.toggle("error-text", isError);
}

/* =========================================
   LANGUAGE
========================================= */

function applyLanguage() {
  document.documentElement.lang = language;

  $$("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;

    if (el === speakButton && speechActive) {
      el.textContent = t("stopReply");
    } else {
      el.textContent = t(key);
    }
  });

  const languageSelect = $("#language-select");

  if (languageSelect) {
    languageSelect.value = language;
  }

  if (input) {
    input.placeholder = language === "hi"
      ? "अपने मन की बात लिखें... हिंदी या English"
      : "Share what's on your mind... English or हिंदी";
  }

  const moodNote = $("#mood-note");
  if (moodNote) {
    moodNote.placeholder = language === "hi"
      ? "आज के बारे में थोड़ा लिखें..."
      : "Write a little about your day...";
  }

  const journalTitle = $("#journal-title");
  if (journalTitle) {
    journalTitle.placeholder = language === "hi"
      ? "आज की डायरी का शीर्षक..."
      : "A title for today...";
  }

  const journalContent = $("#journal-content");
  if (journalContent) {
    journalContent.placeholder = language === "hi"
      ? "खुलकर लिखें। आज क्या हुआ? आपको कैसा लगा?"
      : "Write freely. What happened today? How did it make you feel?";
  }

  renderDailyMotivation();
  renderMoodHistory(allMoods);
  renderCalendar();
  renderMonthlyChart(lastAnalytics);
  renderJournalEntries(lastJournalEntries);

  if (messages && messages.children.length === 0) {
    showWelcomeMessage();
  }

  // Notify voice.js. It listens on window.
  window.dispatchEvent(
    new CustomEvent("mindcare:languagechange", {
      detail: { language }
    })
  );
}

const languageSelect = $("#language-select");

if (languageSelect) {
  languageSelect.addEventListener("change", e => {
    language = e.target.value === "hi" ? "hi" : "en";

    localStorage.setItem("mindcare-language", language);
    applyLanguage();
  });
}

/* =========================================
   NAVIGATION
========================================= */

const views = {
  chat: $("#chat-view"),
  dashboard: $("#dashboard-view"),
  journal: $("#journal-view"),
  exercises: $("#exercises-view"),
  voice: $("#voice-view"),
  about: $("#about-view")
};

function showView(name) {
  if (!views[name]) return;

  Object.entries(views).forEach(([key, el]) => {
    if (el) {
      el.hidden = key !== name;
    }
  });

  const dashboardButton = $("#dashboard-button");
  const backButton = $("#back-to-chat");

  if (dashboardButton) {
    dashboardButton.hidden = name === "dashboard";
  }

  if (backButton) {
    backButton.hidden = name === "chat";
  }

  const subtitle = {
  chat: t("subtitle"),
  dashboard: t("dashboardTitle"),
  journal: t("journalTitle"),
  exercises: t("exerciseTitle"),
  voice: language === "hi" ? "वॉइस चैट" : "Voice Chat",
  about: language === "hi" ? "हमारे बारे में" : "About MindCare AI"
};

  const pageSubtitle = $("#page-subtitle");

  if (pageSubtitle) {
    pageSubtitle.textContent = subtitle[name];
  }

  if (name === "chat" && input) {
    input.focus();
  }

  if (name === "dashboard") {
    refreshDashboard();
  }

  if (name === "journal") {
    loadJournal();
  }

  // Notify voice.js whenever the page changes.
  // Both property names are included for compatibility.
  window.dispatchEvent(
    new CustomEvent("mindcare:viewchange", {
      detail: {
        name: name,
        view: name
      }
    })
  );
}

$("#dashboard-button")?.addEventListener("click", () => {
  showView("dashboard");
});

$("#sidebar-dashboard")?.addEventListener("click", () => {
  showView("dashboard");
});

$("#back-to-chat")?.addEventListener("click", () => {
  showView("chat");
});

$("#sidebar-journal")?.addEventListener("click", () => {
  showView("journal");
});

$("#sidebar-exercises")?.addEventListener("click", () => {
  showView("exercises");
});

$("#open-exercises")?.addEventListener("click", () => {
  showView("exercises");
});

$("#sidebar-voice-chat")?.addEventListener("click", () => {
  showView("voice");
});

$("#sidebar-about")?.addEventListener("click", () => {
  showView("about");
});

/* =========================================
   CHAT
========================================= */

function addBubble(text, kind) {
  if (!messages) return;

  const div = document.createElement("div");

  div.className = `bubble ${kind}`;
  div.textContent = text;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showWelcomeMessage() {
  if (!messages) return;

  messages.replaceChildren();

  const welcome = language === "hi"
    ? "नमस्ते! 👋\n\nमैं MindCare AI हूँ, आपका मानसिक स्वास्थ्य साथी।\nआप हिंदी या English में अपनी बात साझा कर सकते हैं। मैं बिना किसी निर्णय के आपकी बात सुनूँगा।"
    : "Hi! नमस्ते! 👋\n\nI'm MindCare AI, your friendly mental wellness companion.\nYou can share what's on your mind in English or Hindi. I'm here to listen without judgment.";

  addBubble(welcome, "bot");
  lastReply = welcome;
}

async function loadChatHistory() {
  try {
    const response = await fetch("/api/chats");

    if (!response.ok) {
      throw new Error("Could not load chat history.");
    }

    const { chats = [] } = await response.json();

    chatList.replaceChildren();

    if (!chats.length) {
      const empty = document.createElement("p");

      empty.className = "muted";
      empty.textContent = t("noChats");

      chatList.appendChild(empty);
      return;
    }

    chats.forEach(chat => {
      const item = document.createElement("div");

      item.className = "chat-item";

      if (chat.id === activeChatId) {
        item.classList.add("active");
      }

      const title = document.createElement("span");

      title.className = "chat-title";
      title.textContent = chat.title || "New Chat";

      const del = document.createElement("button");

      del.type = "button";
      del.className = "delete-chat";
      del.textContent = "🗑";
      del.title = "Delete chat";

      del.addEventListener("click", e => {
        e.stopPropagation();
        deleteChat(chat.id);
      });

      item.addEventListener("click", () => {
        openChat(chat.id);
      });

      item.append(title, del);
      chatList.appendChild(item);
    });

  } catch (error) {
    setStatus(statusLine, error.message, true);
  }
}

async function createNewChat() {
  stopSpeech();

  try {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not create a chat.");
    }

    activeChatId = data.chat_id;

    showView("chat");
    showWelcomeMessage();

    await loadChatHistory();

    setStatus(statusLine, "");

  } catch (error) {
    setStatus(statusLine, error.message, true);
  }
}

async function openChat(chatId) {
  stopSpeech();

  try {
    setStatus(statusLine, t("loading"));

    const response = await fetch(`/api/chats/${chatId}/messages`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not open this chat.");
    }

    activeChatId = chatId;
    messages.replaceChildren();

    if (!data.messages.length) {
      showWelcomeMessage();
    } else {
      data.messages.forEach(msg => {
        addBubble(
          msg.content,
          msg.role === "user" ? "user" : "bot"
        );

        if (msg.role === "assistant") {
          lastReply = msg.content;
        }
      });
    }

    await loadChatHistory();

    setStatus(statusLine, "");
    showView("chat");

  } catch (error) {
    setStatus(statusLine, error.message, true);
  }
}

async function deleteChat(chatId) {
  if (!confirm(
    language === "hi"
      ? "क्या आप यह बातचीत हटाना चाहते हैं?"
      : "Are you sure you want to delete this conversation?"
  )) {
    return;
  }

  try {
    const response = await fetch(`/api/chats/${chatId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not delete chat.");
    }

    if (activeChatId === chatId) {
      activeChatId = null;
    }

    const listResponse = await fetch("/api/chats");
    const listData = await listResponse.json();

    if (listData.chats.length) {
      await openChat(listData.chats[0].id);
    } else {
      await createNewChat();
    }

  } catch (error) {
    setStatus(statusLine, error.message, true);
  }
}

$("#new-chat")?.addEventListener("click", createNewChat);

/* Written chat submission */

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();

    const message = input.value.trim();

    if (!message) return;

    stopSpeech();

    addBubble(message, "user");

    input.value = "";

    setStatus(
      statusLine,
      language === "hi"
        ? "MindCare AI सोच रहा है..."
        : "MindCare AI is thinking..."
    );

    sendButton.disabled = true;

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          chat_id: activeChatId,
          language
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.reply || "Something went wrong.");
      }

      activeChatId = data.chat_id;
      lastReply = data.reply || "I'm here to listen.";

      addBubble(lastReply, "bot");

      await loadChatHistory();

    } catch (error) {
      lastReply = error.message;
      addBubble(lastReply, "bot");

    } finally {
      setStatus(statusLine, "");
      sendButton.disabled = false;
      input.focus();
    }
  });
}

/* =========================================
   MOOD CHECK-IN AND DASHBOARD
========================================= */

function moodLabel(score) {
  return moodInfo[score]
    ? moodInfo[score][language]
    : "—";
}

$$(".mood-option").forEach(button => {
  button.addEventListener("click", () => {
    selectedMood = Number(button.dataset.score);

    $$(".mood-option").forEach(b => {
      b.classList.toggle("selected", b === button);
    });

    setStatus($("#mood-status"), "");
  });
});

$("#save-mood")?.addEventListener("click", async () => {
  if (selectedMood === null) {
    setStatus($("#mood-status"), t("selectMood"), true);
    return;
  }

  const button = $("#save-mood");

  button.disabled = true;
  setStatus($("#mood-status"), t("saving"));

  try {
    const response = await fetch("/api/moods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mood_score: selectedMood,
        note: $("#mood-note").value.trim(),
        entry_date: localDateKey()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not save mood.");
    }

    selectedMood = null;
    $("#mood-note").value = "";

    $$(".mood-option").forEach(b => {
      b.classList.remove("selected");
    });

    setStatus($("#mood-status"), t("savedMood"));

    await refreshDashboard();

  } catch (error) {
    setStatus($("#mood-status"), error.message, true);

  } finally {
    button.disabled = false;
  }
});

let lastAnalytics = null;

async function fetchMoods() {
  const response = await fetch("/api/moods");

  if (!response.ok) {
    throw new Error("Could not load mood records.");
  }

  const data = await response.json();

  allMoods = data.moods || [];

  return allMoods;
}

async function fetchAnalytics(year, month) {
  const response = await fetch(
    `/api/moods/analytics?year=${year}&month=${month}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load monthly analytics.");
  }

  return data;
}

async function refreshDashboard() {
  try {
    await fetchMoods();

    renderMoodHistory(allMoods);
    renderWeeklyChart(allMoods);
    renderCalendar();

    const monthInput = $("#analytics-month");

    const value = monthInput?.value ||
      `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;

    const [year, month] = value.split("-").map(Number);

    lastAnalytics = await fetchAnalytics(year, month);

    renderAnalytics(lastAnalytics);
    renderMonthlyChart(lastAnalytics);

  } catch (error) {
    console.error(error);
    setStatus($("#mood-status"), error.message, true);
  }
}

function renderMoodHistory(moods) {
  const holder = $("#mood-history");

  if (!holder) return;

  holder.replaceChildren();

  if (!moods.length) {
    const p = document.createElement("p");

    p.textContent = t("noMoods");
    holder.appendChild(p);

    return;
  }

  moods.slice(0, 12).forEach(mood => {
    const row = document.createElement("div");

    row.className = "mood-history-item";

    const emoji = document.createElement("span");

    emoji.className = "mood-history-emoji";
    emoji.textContent = moodInfo[mood.mood_score]?.emoji || "😐";

    const details = document.createElement("div");

    details.className = "mood-history-details";

    const strong = document.createElement("strong");

    strong.textContent = moodLabel(mood.mood_score);

    const note = document.createElement("p");

    note.textContent = mood.note ||
      (language === "hi"
        ? "कोई नोट नहीं जोड़ा गया।"
        : "No note added.");

    const when = document.createElement("span");

    when.className = "mood-history-date";

    when.textContent =
      `${formatDate(mood.entry_date)}${mood.created_at ? " · " + mood.created_at.slice(11, 16) : ""}`;

    details.append(strong, note);
    row.append(emoji, details, when);

    holder.appendChild(row);
  });
}

function renderAnalytics(data) {
  $("#total-checkins").textContent = data.count;

  $("#average-mood").textContent =
    data.average === null
      ? "—"
      : `${data.average.toFixed(1)} / 5`;

  $("#average-label").textContent =
    data.average === null
      ? t("noData")
      : moodLabel(Math.round(data.average));

  $("#most-common-mood").textContent =
    data.most_common_score
      ? `${moodInfo[data.most_common_score].emoji} ${moodLabel(data.most_common_score)}`
      : "—";

  const change = data.previous_average === null
    ? t("noComparison")
    : `${t("compared")}: ${data.previous_average.toFixed(1)} / 5`;

  $("#monthly-change").textContent = change;
}

function renderMonthlyChart(data) {
  const holder = $("#monthly-chart");

  if (!holder || !data) return;

  holder.replaceChildren();

  for (let score = 1; score <= 5; score++) {
    const count = data.distribution[String(score)] || 0;

    const row = document.createElement("div");

    row.className = "distribution-row";

    const name = document.createElement("span");

    name.className = "distribution-name";
    name.textContent = `${moodInfo[score].emoji} ${moodLabel(score)}`;

    const track = document.createElement("div");

    track.className = "distribution-track";

    const bar = document.createElement("div");

    bar.className = `distribution-bar score-${score}`;
    bar.style.width =
      `${data.count ? count / data.count * 100 : 0}%`;

    track.appendChild(bar);

    const value = document.createElement("strong");

    value.textContent = count;

    row.append(name, track, value);
    holder.appendChild(row);
  }

  $("#monthly-summary").textContent = data.count
    ? `${data.count} ${language === "hi" ? "चेक-इन" : "check-ins"} · ${language === "hi" ? "औसत" : "Average"}: ${data.average.toFixed(1)} / 5`
    : t("noData");
}

function renderWeeklyChart(moods) {
  const chart = $("#weekly-chart");

  if (!chart) return;

  chart.replaceChildren();

  const days = [];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();

    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);

    days.push({
      key: localDateKey(d),
      label: d.toLocaleDateString(
        language === "hi" ? "hi-IN" : "en-IN",
        { weekday: "short" }
      ),
      scores: []
    });
  }

  const lookup = new Map(days.map(day => [day.key, day]));

  moods.forEach(m => {
    const day = lookup.get(m.entry_date);

    if (day) {
      day.scores.push(m.mood_score);
    }
  });

  days.forEach(day => {
    const avg = day.scores.length
      ? day.scores.reduce((a, b) => a + b, 0) / day.scores.length
      : 0;

    const col = document.createElement("div");

    col.className = "chart-column";

    const val = document.createElement("span");

    val.className = "chart-value";
    val.textContent = avg ? avg.toFixed(1) : "—";

    const track = document.createElement("div");

    track.className = "chart-track";

    const bar = document.createElement("div");

    bar.className = "chart-bar";
    bar.style.height = `${avg ? avg / 5 * 100 : 2}%`;

    if (!avg) {
      bar.classList.add("empty-bar");
    }

    track.appendChild(bar);

    const label = document.createElement("span");

    label.className = "chart-day";
    label.textContent = day.label;

    col.append(val, track, label);
    chart.appendChild(col);
  });
}

/* =========================================
   MOOD CALENDAR
========================================= */

function renderCalendar() {
  const grid = $("#mood-calendar");

  if (!grid) return;

  grid.replaceChildren();

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  $("#calendar-title").textContent =
    calendarMonth.toLocaleDateString(
      language === "hi" ? "hi-IN" : "en-IN",
      { month: "long", year: "numeric" }
    );

  const weekdayNames = language === "hi"
    ? ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  weekdayNames.forEach(name => {
    const el = document.createElement("div");

    el.className = "calendar-weekday";
    el.textContent = name;

    grid.appendChild(el);
  });

  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < first; i++) {
    const blank = document.createElement("div");

    blank.className = "calendar-blank";
    grid.appendChild(blank);
  }

  const byDate = new Map();

  allMoods.forEach(m => {
    if (!byDate.has(m.entry_date)) {
      byDate.set(m.entry_date, []);
    }

    byDate.get(m.entry_date).push(m);
  });

  for (let day = 1; day <= total; day++) {
    const key =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const entries = byDate.get(key) || [];

    const avg = entries.length
      ? entries.reduce((sum, m) => sum + m.mood_score, 0) / entries.length
      : 0;

    const button = document.createElement("button");

    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;

    if (avg) {
      button.classList.add("has-mood", `score-${Math.round(avg)}`);

      button.title =
        `${entries.length} ${language === "hi" ? "रिकॉर्ड" : "record(s)"}`;
    }

    if (key === localDateKey()) {
      button.classList.add("today");
    }

    if (selectedCalendarDate === key) {
      button.classList.add("chosen");
    }

    button.addEventListener("click", () => {
      selectedCalendarDate = key;

      renderCalendar();
      renderCalendarDay(key, entries);
    });

    grid.appendChild(button);
  }

  if (
    !selectedCalendarDate ||
    !selectedCalendarDate.startsWith(
      `${year}-${String(month + 1).padStart(2, "0")}`
    )
  ) {
    $("#calendar-day-detail").textContent = t("chooseDay");
  }
}

function renderCalendarDay(key, entries) {
  const box = $("#calendar-day-detail");

  if (!box) return;

  box.replaceChildren();

  const heading = document.createElement("strong");

  heading.textContent = formatDate(key);
  box.appendChild(heading);

  if (!entries.length) {
    const p = document.createElement("p");

    p.textContent = t("dayEmpty");
    box.appendChild(p);

    return;
  }

  entries.forEach(entry => {
    const p = document.createElement("p");

    p.textContent =
      `${moodInfo[entry.mood_score].emoji} ${moodLabel(entry.mood_score)}${entry.note ? ` — ${entry.note}` : ""}`;

    box.appendChild(p);
  });
}

$("#calendar-prev")?.addEventListener("click", () => {
  calendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() - 1,
    1
  );

  selectedCalendarDate = null;
  renderCalendar();
});

$("#calendar-next")?.addEventListener("click", () => {
  calendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    1
  );

  selectedCalendarDate = null;
  renderCalendar();
});

const analyticsMonth = $("#analytics-month");

if (analyticsMonth) {
  analyticsMonth.value =
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  analyticsMonth.addEventListener("change", async e => {
    if (!e.target.value) return;

    const [year, month] = e.target.value.split("-").map(Number);

    calendarMonth = new Date(year, month - 1, 1);
    selectedCalendarDate = null;

    try {
      lastAnalytics = await fetchAnalytics(year, month);

      renderAnalytics(lastAnalytics);
      renderMonthlyChart(lastAnalytics);
      renderCalendar();

    } catch (error) {
      setStatus($("#mood-status"), error.message, true);
    }
  });
}

/* =========================================
   JOURNAL
========================================= */

let lastJournalEntries = [];

async function loadJournal() {
  try {
    const response = await fetch("/api/journal");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load journal.");
    }

    lastJournalEntries = data.entries || [];

    renderJournalEntries(lastJournalEntries);

  } catch (error) {
    setStatus($("#journal-status"), error.message, true);
  }
}

function renderJournalEntries(entries) {
  const holder = $("#journal-list");

  if (!holder) return;

  holder.replaceChildren();

  if (!entries.length) {
    const p = document.createElement("p");

    p.className = "muted";
    p.textContent = t("noJournals");

    holder.appendChild(p);
    return;
  }

  entries.forEach(entry => {
    const card = document.createElement("article");

    card.className = "journal-entry";

    const head = document.createElement("div");

    head.className = "journal-entry-head";

    const title = document.createElement("h3");

    title.textContent = entry.title;

    const dateEl = document.createElement("time");

    dateEl.textContent = formatDate(entry.created_at);

    const del = document.createElement("button");

    del.type = "button";
    del.className = "delete-entry";
    del.textContent = "🗑";
    del.setAttribute("aria-label", "Delete entry");

    del.addEventListener("click", () => {
      deleteJournalEntry(entry.id);
    });

    const content = document.createElement("p");

    content.textContent = entry.content;

    head.append(title, dateEl, del);
    card.append(head, content);

    holder.appendChild(card);
  });
}

$("#save-journal")?.addEventListener("click", async () => {
  const content = $("#journal-content").value.trim();

  if (!content) {
    setStatus(
      $("#journal-status"),
      language === "hi" ? "पहले कुछ लिखें।" : "Write something before saving.",
      true
    );

    return;
  }

  const button = $("#save-journal");

  button.disabled = true;
  setStatus($("#journal-status"), t("saving"));

  try {
    const response = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: $("#journal-title").value.trim(),
        content
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not save entry.");
    }

    $("#journal-title").value = "";
    $("#journal-content").value = "";

    setStatus($("#journal-status"), t("savedJournal"));

    await loadJournal();

  } catch (error) {
    setStatus($("#journal-status"), error.message, true);

  } finally {
    button.disabled = false;
  }
});

async function deleteJournalEntry(id) {
  if (!confirm(t("confirmDelete"))) return;

  try {
    const response = await fetch(`/api/journal/${id}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not delete entry.");
    }

    setStatus($("#journal-status"), t("deleted"));

    await loadJournal();

  } catch (error) {
    setStatus($("#journal-status"), error.message, true);
  }
}

/* =========================================
   DAILY MOTIVATION
========================================= */

const motivation = {
  en: [
    "Small steps still move you forward.",
    "You deserve the same kindness you give to others.",
    "A difficult day does not mean a difficult life.",
    "Rest is productive when you need it.",
    "You do not have to solve everything today.",
    "Your feelings are valid, even when they are complicated.",
    "Progress can be quiet and still be real."
  ],

  hi: [
    "छोटे कदम भी आपको आगे बढ़ाते हैं।",
    "आप भी उतनी ही दया के हकदार हैं जितनी आप दूसरों को देते हैं।",
    "एक कठिन दिन का अर्थ कठिन जीवन नहीं है।",
    "जब ज़रूरत हो, आराम करना भी उपयोगी है।",
    "आपको आज सब कुछ हल करने की ज़रूरत नहीं है।",
    "आपकी भावनाएँ महत्वपूर्ण हैं।",
    "धीमी प्रगति भी प्रगति होती है।"
  ]
};

function renderDailyMotivation() {
  const holder = $("#daily-motivation");

  if (!holder) return;

  const day = Math.floor(
    new Date().setHours(0, 0, 0, 0) / 86400000
  );

  holder.textContent =
    motivation[language][day % motivation[language].length];
}

/* =========================================
   GUIDED WELLNESS EXERCISES
========================================= */

const exerciseContent = {
  breathing: {
    title: {
      en: "Calm Breathing",
      hi: "शांत साँस अभ्यास"
    },

    steps: {
      en: [
        "Sit comfortably and relax your shoulders.",
        "Breathe in gently for 4 counts.",
        "Pause softly for 2 counts. Do not strain.",
        "Breathe out slowly for 6 counts.",
        "Repeat once more, at a comfortable pace."
      ],

      hi: [
        "आराम से बैठें और कंधों को ढीला छोड़ें।",
        "4 गिनती तक धीरे-धीरे साँस अंदर लें।",
        "2 गिनती तक सहज रूप से रुकें। ज़ोर न डालें।",
        "6 गिनती तक धीरे-धीरे साँस बाहर छोड़ें।",
        "अपनी सुविधा के अनुसार एक बार फिर दोहराएँ।"
      ]
    }
  },

  grounding: {
    title: {
      en: "5-4-3-2-1 Grounding",
      hi: "5-4-3-2-1 ग्राउंडिंग"
    },

    steps: {
      en: [
        "Look around and name 5 things you can see.",
        "Notice 4 things you can physically feel.",
        "Listen for 3 things you can hear.",
        "Notice 2 things you can smell, or two scents you like.",
        "Notice 1 thing you can taste, or one kind thing you can tell yourself."
      ],

      hi: [
        "आसपास देखें और 5 चीज़ों के नाम लें जिन्हें आप देख सकते हैं।",
        "4 चीज़ों को महसूस करें जिन्हें आप छू सकते हैं।",
        "3 आवाज़ों पर ध्यान दें जिन्हें आप सुन सकते हैं।",
        "2 ऐसी खुशबुओं पर ध्यान दें जिन्हें आप महसूस कर सकते हैं।",
        "1 स्वाद या एक अच्छी बात पर ध्यान दें जो आप खुद से कह सकते हैं।"
      ]
    }
  },

  mindful: {
    title: {
      en: "Mindful Pause",
      hi: "सचेत विराम"
    },

    steps: {
      en: [
        "Pause and notice where your body touches the chair or floor.",
        "Relax your jaw, hands and shoulders if that feels comfortable.",
        "Notice one thought without needing to follow it.",
        "Notice one sound around you.",
        "Ask yourself: what is one small thing I need right now?"
      ],

      hi: [
        "रुकें और महसूस करें कि आपका शरीर कुर्सी या ज़मीन को कहाँ छू रहा है।",
        "यदि सहज लगे तो जबड़े, हाथ और कंधों को ढीला करें।",
        "एक विचार को देखें, बिना उसके पीछे जाएँ।",
        "अपने आसपास की एक आवाज़ पर ध्यान दें।",
        "खुद से पूछें: अभी मुझे किस छोटी चीज़ की ज़रूरत है?"
      ]
    }
  }
};

function startExercise(type) {
  const item = exerciseContent[type];

  if (!item) return;

  clearInterval(exerciseTimer);
  exerciseTimer = null;

  exerciseSteps = item.steps[language];
  exerciseIndex = 0;

  $("#exercise-stage-title").textContent = item.title[language];

  $("#exercise-next").hidden = false;
  $("#exercise-stop").hidden = false;

  $("#breathing-orb").classList.toggle(
    "active",
    type === "breathing"
  );

  showExerciseStep();

  $("#exercise-stage").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function showExerciseStep() {
  $("#exercise-instruction").textContent =
    exerciseSteps[exerciseIndex];

  $("#exercise-progress").textContent =
    `${exerciseIndex + 1} / ${exerciseSteps.length}`;

  $("#exercise-next").textContent =
    exerciseIndex === exerciseSteps.length - 1
      ? t("finishExercise")
      : t("nextStep");

  $("#breathing-orb").textContent = exerciseIndex + 1;
}

function stopExercise(completed = false) {
  clearInterval(exerciseTimer);
  exerciseTimer = null;

  exerciseSteps = [];

  $("#exercise-stage-title").textContent = t("chooseExercise");

  $("#exercise-instruction").textContent =
    completed ? t("exerciseDone") : t("exerciseStopped");

  $("#exercise-progress").textContent = "";

  $("#breathing-orb").classList.remove("active");
  $("#breathing-orb").textContent = "💜";

  $("#exercise-next").hidden = true;
  $("#exercise-stop").hidden = true;
}

$$(".exercise-start").forEach(button => {
  button.addEventListener("click", () => {
    startExercise(button.dataset.exercise);
  });
});

$("#exercise-next")?.addEventListener("click", () => {
  if (exerciseIndex >= exerciseSteps.length - 1) {
    stopExercise(true);
  } else {
    exerciseIndex++;
    showExerciseStep();
  }
});

$("#exercise-stop")?.addEventListener("click", () => {
  stopExercise(false);
});

/* =========================================
   QUICK BREATHING HELPER
========================================= */

$("#breathe")?.addEventListener("click", () => {
  startExercise("breathing");
  showView("exercises");
});

/* =========================================
   BILINGUAL TEXT-TO-SPEECH
========================================= */

function loadVoices() {
  if (!("speechSynthesis" in window)) return;

  availableVoices = speechSynthesis.getVoices();
}

if ("speechSynthesis" in window) {
  loadVoices();

  speechSynthesis.addEventListener(
    "voiceschanged",
    loadVoices
  );
}

function detectReplyLanguage(text) {
  const hindiCount =
    (text.match(/[\u0900-\u097F]/g) || []).length;

  const englishCount =
    (text.match(/[a-zA-Z]/g) || []).length;

  return hindiCount > englishCount ? "hi-IN" : "en-IN";
}

function getPreferredVoice(lang) {
  loadVoices();

  const languageCode = lang.toLowerCase().split("-")[0];

  const matchingVoices = availableVoices.filter(voice =>
    voice.lang.toLowerCase().startsWith(languageCode)
  );

  if (!matchingVoices.length) return null;

  const femaleNames = [
    "female",
    "zira",
    "samantha",
    "susan",
    "hazel",
    "heera",
    "kalpana",
    "swara"
  ];

  return matchingVoices.find(voice =>
    femaleNames.some(name =>
      voice.name.toLowerCase().includes(name)
    )
  ) || matchingVoices[0];
}

function updateSpeakButton() {
  if (!speakButton) return;

  speakButton.textContent =
    speechActive ? t("stopReply") : t("readReply");

  speakButton.setAttribute(
    "aria-pressed",
    speechActive ? "true" : "false"
  );
}

function stopSpeech() {
  speechSession++;

  speechActive = false;
  currentUtterance = null;

  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }

  updateSpeakButton();
}

function startSpeech() {
  if (!("speechSynthesis" in window)) {
    setStatus(
      statusLine,
      "Speech playback is not supported in this browser.",
      true
    );

    return;
  }

  if (!lastReply || !lastReply.trim()) {
    setStatus(statusLine, "There is no reply to read.", true);
    return;
  }

  const session = ++speechSession;

  speechSynthesis.cancel();

  const detectedLanguage = detectReplyLanguage(lastReply);

  const utterance = new SpeechSynthesisUtterance(lastReply);

  utterance.lang = detectedLanguage;
  utterance.rate = 0.9;
  utterance.pitch = 1.08;
  utterance.volume = 1;

  const voice = getPreferredVoice(detectedLanguage);

  if (voice) {
    utterance.voice = voice;
  }

  currentUtterance = utterance;
  speechActive = true;

  updateSpeakButton();

  utterance.onstart = () => {
    if (session !== speechSession) return;

    setStatus(
      statusLine,
      language === "hi"
        ? "MindCare AI बोल रहा है..."
        : "MindCare AI is speaking..."
    );
  };

  utterance.onend = () => {
    if (session !== speechSession) return;

    speechActive = false;
    currentUtterance = null;

    updateSpeakButton();
    setStatus(statusLine, "");
  };

  utterance.onerror = event => {
    if (session !== speechSession) return;

    speechActive = false;
    currentUtterance = null;

    updateSpeakButton();

    if (
      event.error !== "canceled" &&
      event.error !== "interrupted"
    ) {
      setStatus(
        statusLine,
        "Voice playback failed. Please try again.",
        true
      );
    } else {
      setStatus(statusLine, "");
    }
  };

  setStatus(
    statusLine,
    language === "hi"
      ? "आवाज़ शुरू हो रही है..."
      : "Starting voice..."
  );

  speechSynthesis.speak(utterance);
}

if (speakButton) {
  speakButton.addEventListener("click", () => {
    if (speechActive) {
      stopSpeech();

      setStatus(
        statusLine,
        language === "hi"
          ? "आवाज़ बंद कर दी गई।"
          : "Speech stopped."
      );

    } else {
      startSpeech();
    }
  });
}

/* =========================================
   THEME
========================================= */

function updateTheme(dark) {
  document.body.classList.toggle("dark-mode", dark);

  const themeButton = $("#theme-toggle");

  if (themeButton) {
    themeButton.textContent = dark ? "☀️" : "🌙";
  }
}

updateTheme(
  localStorage.getItem("mindcare-theme") === "dark"
);

$("#theme-toggle")?.addEventListener("click", () => {
  const dark =
    !document.body.classList.contains("dark-mode");

  updateTheme(dark);

  localStorage.setItem(
    "mindcare-theme",
    dark ? "dark" : "light"
  );
});

/* =========================================
   INITIALIZE
========================================= */

async function initializeApp() {
  applyLanguage();

  calendarMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  await loadChatHistory();

  try {
    const response = await fetch("/api/chats");
    const data = await response.json();

    if (data.chats && data.chats.length) {
      await openChat(data.chats[0].id);
    } else {
      await createNewChat();
    }

  } catch (error) {
    showWelcomeMessage();

    setStatus(
      statusLine,
      "Could not initialize chats. Refresh the page.",
      true
    );
  }

  renderDailyMotivation();
}

initializeApp();
