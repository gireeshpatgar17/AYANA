class AIService {
    constructor() {
        // Change this to your Groq API key
        this.apiKey = process.env.GROQ_API_KEY || ''; // Replace with your actual Groq key
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.currentMode = 'daily';
        this.conversationHistory = [];
        
        // Available free models on Groq
        this.models = {
            'daily': 'llama-3.3-70b-versatile',  // Best for conversation
            'interview': 'mixtral-8x7b-32768',   // Good for structured responses
            'coach': 'llama-3.1-8b-instant'      // Faster for quick feedback
        };
        
        console.log('AI Service initialized with Groq (free API)');
    }

    setMode(mode) {
        this.currentMode = mode;
        this.conversationHistory = [];
        this.addSystemMessage();
    }

    addSystemMessage() {
        let systemPrompt = '';
        
        switch(this.currentMode) {
            case 'daily':
                systemPrompt = 'You are a friendly English conversation partner. Ask casual questions about daily life, interests, and experiences. Keep the conversation natural and engaging. Ask follow-up questions to encourage more speaking. Keep responses brief and conversational.';
                break;
            case 'interview':
                systemPrompt = 'You are a campus placement interviewer. Ask common interview questions one at a time. After each answer, provide brief feedback and ask the next question. Be professional but friendly. Keep responses concise.';
                break;
            case 'coach':
                systemPrompt = 'You are an English speaking coach. After each user response, provide constructive feedback on grammar, vocabulary, and pronunciation. Suggest improvements and encourage practice. Keep feedback supportive, actionable, and brief.';
                break;
        }
        
        this.conversationHistory = [{
            role: 'system',
            content: systemPrompt
        }];
    }

    async getResponse(userMessage, analysis) {
        try {
            // Add context from speech analysis for coaching mode
            if (this.currentMode === 'coach' && analysis) {
                const analysisContext = this.createAnalysisContext(analysis);
                // Add as a user message to provide context
                this.conversationHistory.push({
                    role: 'user',
                    content: `[Context: ${analysisContext}] ${userMessage}`
                });
            } else {
                this.conversationHistory.push({
                    role: 'user',
                    content: userMessage
                });
            }

            console.log('Sending request to Groq...');
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.models[this.currentMode],
                    messages: this.conversationHistory,
                    temperature: 0.7,
                    max_tokens: 150,
                    top_p: 0.9,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Groq API Error:', errorData);
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Groq response received:', data);
            
            const aiResponse = data.choices[0].message.content;

            // Add AI response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });

            // Keep history manageable (last 10 messages)
            if (this.conversationHistory.length > 10) {
                this.conversationHistory = [
                    this.conversationHistory[0], // Keep system prompt
                    ...this.conversationHistory.slice(-8) // Keep last 8 messages
                ];
            }

            return aiResponse;

        } catch (error) {
            console.error('AI Service Error:', error);
            // Fallback to local responses if API fails
            return this.getFallbackResponse();
        }
    }

    createAnalysisContext(analysis) {
        let feedback = '';
        
        if (analysis.fillerWords > 3) {
            feedback += `The user used ${analysis.fillerWords} filler words. `;
        }
        
        if (analysis.speed < 100) {
            feedback += 'Speaking speed could be increased. ';
        } else if (analysis.speed > 180) {
            feedback += 'Speaking speed is a bit fast. ';
        }
        
        if (analysis.fluency < 70) {
            feedback += 'Fluency needs improvement. ';
        }
        
        return `Speech analysis: ${feedback} Provide appropriate feedback in your response.`;
    }

    getFallbackResponse() {
        // Enhanced fallback responses in case API fails
        const responses = {
            daily: [
                "That's interesting! Tell me more about that.",
                "How did that make you feel?",
                "What happened next?",
                "Why do you think that is?",
                "That's great! Can you elaborate a bit more?",
                "I see. And then what did you do?"
            ],
            interview: [
                "Thank you for sharing. Can you tell me about a challenging situation you faced?",
                "Interesting. How do you handle working in a team?",
                "What are your career goals?",
                "Tell me about a time you showed leadership.",
                "How do you handle pressure or stressful situations?",
                "Where do you see yourself in 5 years?"
            ],
            coach: [
                "Good attempt! Try to speak a bit slower and focus on pronunciation.",
                "You're doing well. Pay attention to your grammar and try to reduce filler words.",
                "Practice this sentence: 'I would like to improve my English speaking skills.'",
                "Great progress! Let's work on expanding your vocabulary.",
                "Your pronunciation is clear. Try to use more descriptive words.",
                "Good effort! Remember to pause instead of using filler words."
            ]
        };
        
        const modeResponses = responses[this.currentMode] || responses.daily;
        return modeResponses[Math.floor(Math.random() * modeResponses.length)];
    }

    // Optional: Method to check available models
    async getAvailableModels() {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            const data = await response.json();
            console.log('Available Groq models:', data);
            return data;
        } catch (error) {
            console.error('Error fetching models:', error);
            return null;
        }
    }
}

const aiService = new AIService();