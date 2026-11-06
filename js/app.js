class EnglishCoachApp {
  constructor() {
    this.initializeElements();
    this.attachEventListeners();
    this.initializeApp();
  }

  initializeElements() {
    this.elements = {
      modeSelect: document.getElementById("modeSelect"),
      startBtn: document.getElementById("startBtn"),
      btnText: document.getElementById("btnText"),
      chatMessages: document.getElementById("chatMessages"),
      statusText: document.getElementById("statusText"),
      statusDot: document.querySelector(".status-dot"),
      analysisPanel: document.getElementById("analysisPanel"),
      analysisContent: document.getElementById("analysisContent"),
      toggleAnalysis: document.getElementById("toggleAnalysis"),
      speechSpeed: document.getElementById("speechSpeed"),
      fluencyScore: document.getElementById("fluencyScore"),
      pronunciationScore: document.getElementById("pronunciationScore"),
      fillerWords: document.getElementById("fillerWords"),
      vocabularyLevel: document.getElementById("vocabularyLevel"),
      suggestions: document.getElementById("suggestions"),
      progressChart: document.getElementById("progressChart"),
    };
  }

  attachEventListeners() {
    this.elements.startBtn.addEventListener("click", () =>
      this.toggleRecording(),
    );
    this.elements.modeSelect.addEventListener("change", (e) =>
      this.changeMode(e.target.value),
    );
    this.elements.toggleAnalysis.addEventListener("click", () =>
      this.toggleAnalysisPanel(),
    );

    speechManager.onSpeechResult = (text, isFinal) =>
      this.handleSpeechResult(text, isFinal);
    speechManager.onStateChange = (state) => this.updateUIState(state);
  }

  initializeApp() {
    aiService.setMode(this.elements.modeSelect.value);
    this.updateProgressChart();
    this.checkInstallPrompt();

  }

  toggleRecording() {
    if (speechManager.isListening) {
      speechManager.stopListening();
      this.elements.startBtn.classList.remove("recording");
      this.elements.btnText.textContent = "Start Speaking";
    } else {
      speechManager.startListening();
      this.elements.startBtn.classList.add("recording");
      this.elements.btnText.textContent = "Stop Speaking";
    }
  }

  changeMode(mode) {
    aiService.setMode(mode);
    this.clearChat();

    let welcomeMessage = "";
    switch (mode) {
      case "daily":
        welcomeMessage = "Hi there! How was your day today?";
        break;
      case "interview":
        welcomeMessage =
          "Welcome to the interview practice. Let's begin. Tell me about yourself.";
        break;
      case "coach":
        welcomeMessage =
          "Hello! I'm your speaking coach. Let's practice. Say something and I'll help you improve.";
        break;
    }

    this.addMessage(welcomeMessage, "ai");
  }

  async handleSpeechResult(text, isFinal) {
    if (isFinal && text.trim()) {
      this.addMessage(text, "user");

      // Get analysis for coach mode
      const analysis = speechManager.getAnalysis();
      this.updateAnalysisDisplay(analysis);

      // Get AI response
      const aiResponse = await aiService.getResponse(text, analysis);
      this.addMessage(aiResponse, "ai");

      // Speak the response
      await speechManager.speak(aiResponse);

      // Save session data if in coach mode
      if (this.elements.modeSelect.value === "coach") {
        storage.saveSession(analysis);
        this.updateProgressChart();
      }
    } else if (text) {
      // Update interim results
      this.updateInterimDisplay(text);
    }
  }

  addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = text;

    messageDiv.appendChild(contentDiv);
    this.elements.chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    this.elements.chatMessages.scrollTop =
      this.elements.chatMessages.scrollHeight;
  }

  updateInterimDisplay(text) {
    // Remove existing interim message
    const interimMessage = document.querySelector(".interim-message");
    if (interimMessage) {
      interimMessage.remove();
    }

    // Add new interim message
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user-message interim-message";

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = text;
    contentDiv.style.opacity = "0.7";

    messageDiv.appendChild(contentDiv);
    this.elements.chatMessages.appendChild(messageDiv);
    this.elements.chatMessages.scrollTop =
      this.elements.chatMessages.scrollHeight;
  }

  updateAnalysisDisplay(analysis) {
    if (analysis) {
      this.elements.speechSpeed.textContent = analysis.speed || 0;
      this.elements.fluencyScore.textContent = (analysis.fluency || 0) + "%";
      this.elements.pronunciationScore.textContent =
        (analysis.pronunciation || 0) + "%";
      this.elements.fillerWords.textContent = analysis.fillerWords || 0;
      this.elements.vocabularyLevel.textContent =
        analysis.vocabulary || "Basic";

      // Generate suggestions
      this.generateSuggestions(analysis);
    }
  }

  generateSuggestions(analysis) {
    let suggestions = [];

    if (analysis.fillerWords > 3) {
      suggestions.push(
        'Try to reduce filler words like "um" and "uh". Pause instead.',
      );
    }

    if (analysis.speed < 100) {
      suggestions.push("Try speaking a bit faster to improve fluency.");
    } else if (analysis.speed > 180) {
      suggestions.push("Slow down a little for clearer pronunciation.");
    }

    if (analysis.fluency < 70) {
      suggestions.push(
        "Practice speaking in complete sentences without stopping.",
      );
    }

    if (suggestions.length === 0) {
      suggestions.push("Great job! Keep practicing to maintain your progress.");
    }

    this.elements.suggestions.innerHTML = suggestions
      .map((s) => `<p>💡 ${s}</p>`)
      .join("");
  }

  updateUIState(state) {
    this.elements.statusText.textContent =
      state.charAt(0).toUpperCase() + state.slice(1);

    if (state === "listening") {
      this.elements.statusDot.classList.add("listening");
    } else {
      this.elements.statusDot.classList.remove("listening");
    }
  }

  toggleAnalysisPanel() {
    this.elements.analysisPanel.classList.toggle("collapsed");
  }

  clearChat() {
    this.elements.chatMessages.innerHTML = "";
  }

  updateProgressChart() {
    const last7Days = storage.getLast7Days();
    this.elements.progressChart.innerHTML = "";

    last7Days.forEach((day) => {
      const barContainer = document.createElement("div");
      barContainer.className = "progress-bar-container";

      const bar = document.createElement("div");
      bar.className = "progress-bar";

      const fill = document.createElement("div");
      fill.className = "progress-fill";
      fill.style.height = `${day.data.averageFluency || 0}%`;

      bar.appendChild(fill);

      const label = document.createElement("span");
      label.className = "progress-label";
      label.textContent = new Date(day.date).toLocaleDateString("en-US", {
        weekday: "short",
      });

      const value = document.createElement("span");
      value.className = "progress-value";
      value.textContent = `${Math.round(day.data.averageFluency || 0)}%`;

      barContainer.appendChild(bar);
      barContainer.appendChild(label);
      barContainer.appendChild(value);

      this.elements.progressChart.appendChild(barContainer);
    });
  }

  checkInstallPrompt() {
    let deferredPrompt;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install prompt after 30 seconds
      setTimeout(() => {
        this.showInstallPrompt(deferredPrompt);
      }, 30000);
    });
  }

  showInstallPrompt(deferredPrompt) {
    const promptDiv = document.createElement("div");
    promptDiv.className = "install-prompt show";
    promptDiv.innerHTML = `
            <p>📱 Install this app on your home screen for easy access!</p>
            <button id="installBtn">Install App</button>
            <button id="closePrompt">Not Now</button>
        `;

    document.body.appendChild(promptDiv);

    document
      .getElementById("installBtn")
      .addEventListener("click", async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        promptDiv.remove();
      });

    document.getElementById("closePrompt").addEventListener("click", () => {
      promptDiv.remove();
    });
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new EnglishCoachApp();
});
