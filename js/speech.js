class SpeechManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.onSpeechResult = null;
        this.onStateChange = null;
        
        this.analysis = {
            words: [],
            startTime: null,
            fillerWords: ['um', 'uh', 'like', 'well', 'you know'],
            fillerCount: 0,
            wordCount: 0
        };
        
        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.analysis.startTime = Date.now();
                this.updateState('listening');
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.updateState('stopped');
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateState('error');
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                        this.analyzeSpeech(transcript);
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (this.onSpeechResult) {
                    this.onSpeechResult(finalTranscript || interimTranscript, finalTranscript !== '');
                }
            };
        } else {
            console.error('Speech recognition not supported');
        }
    }

    analyzeSpeech(text) {
        // Word count
        const words = text.toLowerCase().split(/\s+/);
        this.analysis.wordCount += words.length;
        
        // Filler words
        words.forEach(word => {
            if (this.analysis.fillerWords.includes(word)) {
                this.analysis.fillerCount++;
            }
        });
        
        // Calculate WPM
        const timeElapsed = (Date.now() - this.analysis.startTime) / 60000; // in minutes
        const wpm = Math.round(this.analysis.wordCount / timeElapsed);
        
        // Calculate fluency score (based on filler words ratio and speed)
        const fillerRatio = this.analysis.fillerCount / this.analysis.wordCount || 0;
        let fluencyScore = 100 - (fillerRatio * 100);
        
        // Adjust fluency based on WPM
        if (wpm < 80) fluencyScore -= 20;
        if (wpm > 200) fluencyScore -= 10;
        
        // Calculate pronunciation score (simplified version)
        const pronunciationScore = Math.max(0, 100 - (fillerRatio * 150));
        
        // Vocabulary level estimation
        let vocabLevel = 'Basic';
        const uniqueWords = new Set(words).size;
        if (uniqueWords > 50) vocabLevel = 'Advanced';
        else if (uniqueWords > 20) vocabLevel = 'Intermediate';
        
        this.analysis.metrics = {
            speed: wpm,
            fluency: Math.max(0, Math.min(100, Math.round(fluencyScore))),
            pronunciation: Math.max(0, Math.min(100, Math.round(pronunciationScore))),
            fillerWords: this.analysis.fillerCount,
            vocabulary: vocabLevel
        };
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            this.resetAnalysis();
            this.recognition.start();
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    resetAnalysis() {
        this.analysis = {
            words: [],
            startTime: Date.now(),
            fillerWords: ['um', 'uh', 'like', 'well', 'you know'],
            fillerCount: 0,
            wordCount: 0
        };
    }

    speak(text) {
        return new Promise((resolve) => {
            if (this.synthesis.speaking) {
                this.synthesis.cancel();
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            
            utterance.onend = () => {
                this.updateState('finished speaking');
                resolve();
            };
            
            utterance.onerror = () => {
                resolve();
            };
            
            this.synthesis.speak(utterance);
            this.updateState('speaking');
        });
    }

    updateState(state) {
        if (this.onStateChange) {
            this.onStateChange(state);
        }
    }

    getAnalysis() {
        return this.analysis.metrics || {
            speed: 0,
            fluency: 0,
            pronunciation: 0,
            fillerWords: 0,
            vocabulary: 'Basic'
        };
    }
}

const speechManager = new SpeechManager();