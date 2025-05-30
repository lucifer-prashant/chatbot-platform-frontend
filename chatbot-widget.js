// This is chatbot-widget.js - it runs on the user's website

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const defaultConfig = {
            siteId: 'defaultSiteId_fallback',
            options: {
                theme: 'light',
                persona: 'Chatbot',
                language: 'en',
                iconPosition: 'bottom-right',
                windowAlignment: 'bottom-right',
                greeting: 'Hello! How can I help you today?',
                mainColor: '#007bff',
                textColor: '#ffffff',
                pulseAnimation: true,
                windowWidth: 350,
                windowHeight: 520,
                enablePageContentContext: false,
                pageContentContextGreetingSuffix: " I can also try to answer questions about this page.",
                hfToken: null, 
                hfApiUrl: 'https://api-inference.huggingface.co/models/deepset/roberta-base-squad2',
                hfConfidenceThreshold: 0.1 
            }
        };

        const userConfig = window.chatbotConfig || {};
        const config = {
            siteId: userConfig.siteId || defaultConfig.siteId,
            options: { ...defaultConfig.options, ...userConfig.options }
        };

        console.log('Chatbot Loaded with config:', config);

        if (config.options.enablePageContentContext && window.ChatbotContentScraper && typeof window.ChatbotContentScraper.scrape === 'function') {
            console.log('Chatbot: Page content context is enabled. Attempting to scrape page.');
            try {
                window.ChatbotContentScraper.scrape();
            } catch (e) {
                console.error("Chatbot: Error initializing page scraper.", e);
            }
        } else if (config.options.enablePageContentContext) {
            console.warn('Chatbot: Page content context is enabled, but ChatbotContentScraper not found.');
        }

        let chatbotContainer, chatButton, chatWindow, chatHeader, messagesDiv, inputField, sendButton, internalCloseButton;
        let isChatOpen = false;
        let isFirstOpen = true;
        let isDragging = false;
        let offsetX, offsetY;
        let lastWindowPosition = { x: null, y: null };
        let lastBotResponseInfo = null; // To store info about the last bot response for follow-ups

        const chatIconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>`;
        const closeIconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>`;
        const sendIconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>`;

        function createChatbotElements() { /* ... (no changes to this function) ... */ 
            chatbotContainer = document.createElement('div');
            chatbotContainer.id = 'my-chatbot-container';
            chatbotContainer.style.position = 'fixed';
            chatbotContainer.style.zIndex = '10000';
            chatbotContainer.style.width = 'auto';
            chatbotContainer.style.height = 'auto';

            chatButton = document.createElement('button');
            chatButton.id = 'my-chatbot-button';
            chatButton.innerHTML = chatIconSvg;
            chatButton.title = `Open ${config.options.persona}`;
            chatButton.style.display = 'flex';

            chatWindow = document.createElement('div');
            chatWindow.id = 'my-chatbot-window';
            chatWindow.style.display = 'none';
            chatWindow.innerHTML = `
                <div id="my-chatbot-header">
                    <span>${config.options.persona}</span>
                    <button id="my-chatbot-close-btn" title="Close Chat">${closeIconSvg}</button>
                </div>
                <div id="my-chatbot-messages"></div>
                <div id="my-chatbot-input-area">
                    <input type="text" id="my-chatbot-input" placeholder="Type your message..." autocomplete="off">
                    <button id="my-chatbot-send-btn" title="Send Message">${sendIconSvg}</button>
                </div>
            `;

            chatbotContainer.appendChild(chatWindow);
            chatbotContainer.appendChild(chatButton);
            document.body.appendChild(chatbotContainer);

            chatHeader = document.getElementById('my-chatbot-header');
            messagesDiv = document.getElementById('my-chatbot-messages');
            inputField = document.getElementById('my-chatbot-input');
            sendButton = document.getElementById('my-chatbot-send-btn');
            internalCloseButton = document.getElementById('my-chatbot-close-btn');
        }

        function applyStyles() { /* ... (no changes to this function) ... */ 
            const style = document.createElement('style');
            const themeStyles = {
                light: {
                    bgColor: '#ffffff', textColor: '#333333', headerBg: config.options.mainColor, headerText: config.options.textColor,
                    inputBg: '#f1f1f1', borderColor: '#e0e0e0', botMessageBg: '#e9e9e9', botMessageText: '#333333',
                    userMessageBg: config.options.mainColor, userMessageText: config.options.textColor,
                },
                dark: {
                    bgColor: '#2c2c2c', textColor: '#f1f1f1', headerBg: config.options.mainColor, headerText: config.options.textColor,
                    inputBg: '#3a3a3a', borderColor: '#444444', botMessageBg: '#404040', botMessageText: '#f1f1f1',
                    userMessageBg: config.options.mainColor, userMessageText: config.options.textColor,
                }
            };
            const currentTheme = themeStyles[config.options.theme] || themeStyles.light;

            style.textContent = `
                #my-chatbot-container {
                    transition: left 0.2s ease-out, right 0.2s ease-out, top 0.2s ease-out, bottom 0.2s ease-out;
                }
                #my-chatbot-button {
                    background-color: ${currentTheme.headerBg}; color: ${currentTheme.headerText}; border: none;
                    border-radius: 50%; width: 60px; height: 60px; font-size: 24px; cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; justify-content: center;
                    align-items: center; transition: transform 0.2s ease-out, box-shadow 0.2s;
                    ${config.options.pulseAnimation ? `animation: pulse-animation 2s infinite ease-in-out;` : ''}
                }
                #my-chatbot-button:hover {
                    transform: scale(1.1); box-shadow: 0 6px 16px rgba(0,0,0,0.3);
                    ${config.options.pulseAnimation ? `animation-play-state: paused;` : ''}
                }
                @keyframes pulse-animation {
                    0% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
                    50% { transform: scale(1.05); box-shadow: 0 6px 18px rgba(0,0,0,0.3); }
                    100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
                }

                #my-chatbot-window {
                    width: ${config.options.windowWidth}px;
                    height: ${config.options.windowHeight}px;
                    max-width: 90vw; max-height: calc(100vh - 40px);
                    background-color: ${currentTheme.bgColor}; color: ${currentTheme.textColor};
                    border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                    display: none; flex-direction: column; overflow: hidden;
                    opacity: 0; transform: scale(0.95);
                    transition: opacity 0.25s ease-out, transform 0.25s ease-out;
                }
                #my-chatbot-window.open {
                    opacity: 1; transform: scale(1);
                }
                #my-chatbot-header {
                    background-color: ${currentTheme.headerBg}; color: ${currentTheme.headerText}; padding: 12px 18px;
                    font-weight: 600; display: flex; justify-content: space-between; align-items: center;
                    border-top-left-radius: 12px; border-top-right-radius: 12px;
                    flex-shrink: 0; cursor: move;
                }
                #my-chatbot-header span { font-size: 1.1em; }
                #my-chatbot-close-btn {
                    background: none; border: none; color: ${currentTheme.headerText}; cursor: pointer;
                    padding: 5px; line-height: 1; opacity: 0.8; transition: opacity 0.2s;
                }
                #my-chatbot-close-btn:hover { opacity: 1; }
                #my-chatbot-close-btn svg { fill: ${currentTheme.headerText}; }

                #my-chatbot-messages {
                    flex-grow: 1; padding: 15px; overflow-y: auto; border-bottom: 1px solid ${currentTheme.borderColor};
                    display: flex; flex-direction: column; gap: 10px;
                }
                #my-chatbot-messages::-webkit-scrollbar { width: 8px; }
                #my-chatbot-messages::-webkit-scrollbar-track { background: ${currentTheme.inputBg}; border-radius: 4px; }
                #my-chatbot-messages::-webkit-scrollbar-thumb { background: ${currentTheme.borderColor}; border-radius: 4px; }
                #my-chatbot-messages::-webkit-scrollbar-thumb:hover { background: ${currentTheme.textColor}55; }

                .chatbot-message {
                    max-width: 85%; padding: 10px 15px; border-radius: 18px; line-height: 1.45;
                    word-wrap: break-word; font-size: 0.95em;
                }
                .chatbot-message p { margin: 0; }
                .chatbot-message.bot {
                    background-color: ${currentTheme.botMessageBg}; color: ${currentTheme.botMessageText};
                    border-bottom-left-radius: 5px; align-self: flex-start;
                }
                .chatbot-message.user {
                    background-color: ${currentTheme.userMessageBg}; color: ${currentTheme.userMessageText};
                    border-bottom-right-radius: 5px; align-self: flex-end;
                }
                .chatbot-message.typing-indicator {
                    background-color: ${currentTheme.botMessageBg}; color: ${currentTheme.botMessageText};
                    border-bottom-left-radius: 5px; align-self: flex-start;
                    padding: 12px 15px; display: flex; align-items: center;
                }
                .chatbot-message.typing-indicator span {
                    display: inline-block; width: 7px; height: 7px; margin: 0 2.5px;
                    background-color: ${currentTheme.botMessageText}99; border-radius: 50%;
                    animation: typing-bounce 1.3s infinite ease-in-out;
                }
                .chatbot-message.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
                .chatbot-message.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
                .chatbot-message.typing-indicator span:nth-child(3) { animation-delay: 0s; }
                @keyframes typing-bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                }

                #my-chatbot-input-area {
                    display: flex; padding: 12px; border-top: 1px solid ${currentTheme.borderColor};
                    background-color: ${currentTheme.bgColor}; align-items: center;
                    flex-shrink: 0;
                }
                #my-chatbot-input {
                    flex-grow: 1; padding: 10px 15px; border: 1px solid ${currentTheme.borderColor};
                    border-radius: 20px; margin-right: 10px; background-color: ${currentTheme.inputBg};
                    color: ${currentTheme.textColor}; font-size: 1em;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                #my-chatbot-input:focus {
                    outline: none;
                    border-color: ${config.options.mainColor};
                    box-shadow: 0 0 0 2px ${config.options.mainColor}40;
                }
                #my-chatbot-input::placeholder { color: ${currentTheme.textColor}99; }
                #my-chatbot-send-btn {
                    background-color: ${currentTheme.headerBg}; color: ${currentTheme.headerText}; border: none;
                    width: 42px; height: 42px; border-radius: 50%; cursor: pointer;
                    display: flex; justify-content: center; align-items: center; transition: background-color 0.2s;
                }
                #my-chatbot-send-btn:hover { opacity: 0.85; }
                #my-chatbot-send-btn svg { fill: ${currentTheme.headerText}; }
            `;
            document.head.appendChild(style);
        }
        
        function setIconContainerPosition() { /* ... (no changes to this function) ... */ 
            const margin = '20px';
            chatbotContainer.style.width = 'auto';
            chatbotContainer.style.height = 'auto';
            if (config.options.iconPosition === 'bottom-left') {
                chatbotContainer.style.left = margin; chatbotContainer.style.right = 'auto';
                chatbotContainer.style.bottom = margin; chatbotContainer.style.top = 'auto';
            } else { // bottom-right is default
                chatbotContainer.style.right = margin; chatbotContainer.style.left = 'auto';
                chatbotContainer.style.bottom = margin; chatbotContainer.style.top = 'auto';
            }
        }

        function setWindowContainerPosition(isInitialOpen = false) { /* ... (no changes to this function) ... */ 
            const margin = 20;
            chatbotContainer.style.width = config.options.windowWidth + 'px';
            chatbotContainer.style.height = config.options.windowHeight + 'px';

            if (isInitialOpen && lastWindowPosition.x === null) {
                if (config.options.windowAlignment === 'bottom-left') {
                    chatbotContainer.style.left = margin + 'px'; chatbotContainer.style.bottom = margin + 'px';
                    chatbotContainer.style.right = 'auto'; chatbotContainer.style.top = 'auto';
                } else { // bottom-right is default
                    chatbotContainer.style.right = margin + 'px'; chatbotContainer.style.bottom = margin + 'px';
                    chatbotContainer.style.left = 'auto'; chatbotContainer.style.top = 'auto';
                }
            } else if (lastWindowPosition.x !== null) {
                chatbotContainer.style.left = lastWindowPosition.x + 'px'; chatbotContainer.style.top = lastWindowPosition.y + 'px';
                chatbotContainer.style.bottom = 'auto'; chatbotContainer.style.right = 'auto';
            } else { // Fallback, e.g. if called when not initial and no last position
                 chatbotContainer.style.right = margin + 'px'; chatbotContainer.style.bottom = margin + 'px';
                 chatbotContainer.style.left = 'auto'; chatbotContainer.style.top = 'auto';
            }
        }

        function addMessage(text, sender, isTyping = false) { /* ... (no changes to this function) ... */ 
            const messageElement = document.createElement('div');
            messageElement.classList.add('chatbot-message', sender);
            if (isTyping) {
                messageElement.classList.add('typing-indicator');
                messageElement.innerHTML = `<span></span><span></span><span></span>`;
            } else {
                const p = document.createElement('p');
                p.textContent = text;
                messageElement.appendChild(p);
            }
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            return messageElement;
        }

        function openChatWindow() { /* ... (slight change in greeting logic, but mostly same) ... */ 
            if (isChatOpen) return;
            isChatOpen = true;
            setWindowContainerPosition(true);
            chatButton.style.display = 'none';
            chatWindow.style.display = 'flex';
            void chatWindow.offsetWidth; 
            chatWindow.classList.add('open');
            inputField.focus();

            if (isFirstOpen) {
                let greetingMsg = config.options.greeting;
                if (config.options.enablePageContentContext && window.ChatbotContentScraper && window.ChatbotContentScraper.isScraped()) {
                    greetingMsg += (config.options.pageContentContextGreetingSuffix || " I can also try to answer questions about this page.");
                }
                 if (greetingMsg) {
                    setTimeout(() => {
                        if (isChatOpen) addMessage(greetingMsg, 'bot');
                    }, 150);
                }
                isFirstOpen = false;
            }
        }

        function closeChatWindow() { /* ... (no changes to this function) ... */ 
            if (!isChatOpen) return;
            const currentRect = chatbotContainer.getBoundingClientRect();
            lastWindowPosition.x = currentRect.left;
            lastWindowPosition.y = currentRect.top;
            isChatOpen = false;
            chatWindow.classList.remove('open');
            setTimeout(() => {
                if (!isChatOpen) { 
                    chatWindow.style.display = 'none';
                    chatButton.style.display = 'flex';
                    setIconContainerPosition();
                }
            }, 260); 
        }

        async function getBotResponse(userInput) {
            const lowerInput = userInput.toLowerCase().trim();
            const { hfToken, hfApiUrl, hfConfidenceThreshold, enablePageContentContext } = config.options;
            let botReply = { text: "", type: "fallback", sectionContext: null }; // Store structured reply

            // 0. Handle direct follow-up questions about a previously mentioned heading
            const followUpKeywords = ["tell me more", "expand", "details", "elaborate", "yes expand on it", "give me details"];
            if (lastBotResponseInfo && lastBotResponseInfo.type === 'heading_prompt' && lastBotResponseInfo.headingText &&
                followUpKeywords.some(kw => lowerInput.includes(kw))) {
                console.log("Chatbot: Handling follow-up for heading:", lastBotResponseInfo.headingText);
                if (enablePageContentContext && window.ChatbotContentScraper && window.ChatbotContentScraper.isScraped()) {
                    const detailSearchResult = window.ChatbotContentScraper.search(lastBotResponseInfo.headingText, { type: 'details_for_heading', topicHint: lastBotResponseInfo.headingText });
                    if (detailSearchResult && detailSearchResult.answer) {
                        botReply = { text: detailSearchResult.answer, type: "details", sectionContext: detailSearchResult.sectionContext };
                        lastBotResponseInfo = null; // Clear follow-up state
                        return botReply; // Return early with detailed answer
                    }
                }
            }
            // Reset if not a direct follow-up, or if it was handled.
            // lastBotResponseInfo = null; // Reset for new unrelated query - This is now handled after the full response is determined

            // 1. Attempt Hugging Face QA
            let aiContext = null;
            let localSearchForAIContext = null;

            if (enablePageContentContext && window.ChatbotContentScraper && window.ChatbotContentScraper.isScraped()) {
                localSearchForAIContext = window.ChatbotContentScraper.search(userInput);
                if (localSearchForAIContext && localSearchForAIContext.sectionContext) {
                    aiContext = localSearchForAIContext.sectionContext;
                } else {
                    const pageData = window.ChatbotContentScraper.getData();
                    aiContext = pageData ? pageData.fullText.substring(0,3000) : "";
                }
            }
            
            if (hfToken && hfApiUrl && aiContext && aiContext.length > 30) {
                console.log("Chatbot: Attempting Hugging Face QA with context length:", aiContext.length);
                try {
                    const response = await fetch(hfApiUrl, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ inputs: { question: userInput, context: aiContext } })
                    });
                    if (!response.ok) {
                        // ... (error handling as before, setting botReply.text to error message) ...
                        const errorData = await response.json().catch(() => ({ error: "Unknown API error" }));
                        console.error("Chatbot: Hugging Face API Error:", response.status, errorData);
                        if (response.status === 401) botReply.text = "AI features unavailable: Invalid Hugging Face Token.";
                        else if (response.status === 429) botReply.text = "AI features temporarily unavailable (rate limit).";
                        else if (errorData && errorData.error && typeof errorData.error === 'string' && errorData.error.includes("currently loading")) {
                             botReply.text = `The AI model is currently loading (est. ${errorData.estimated_time || 'N/A'}s). Please try again shortly.`;
                        } else botReply.text = "AI features encountered an issue. Falling back.";
                        botReply.type = "error_ai";
                    } else {
                        const result = await response.json();
                        if (result && result.answer && result.score >= hfConfidenceThreshold) {
                            console.log("Chatbot: Hugging Face QA successful.", result);
                            botReply = { text: result.answer, type: "ai_answer", sectionContext: aiContext };
                            // AI answered, so we can return this.
                            // We'll set lastBotResponseInfo outside this function based on the final botReply.
                            return botReply;
                        } else {
                            console.log("Chatbot: HF QA returned no confident answer or unexpected result:", result);
                        }
                    }
                } catch (e) {
                    console.error("Chatbot: Error calling Hugging Face API:", e);
                    botReply.text = "Could not reach AI services. Falling back.";
                    botReply.type = "error_api";
                }
            }

            // If AI provided an error message, return that
            if (botReply.type === "error_ai" || botReply.type === "error_api") {
                return botReply;
            }

            // 2. Basic hardcoded responses
            if (lowerInput.includes("hello") || lowerInput.includes("hi") || lowerInput.includes("hey")) {
                botReply = { text: "Hello there! How can I assist you today?", type: "greeting" };
            } else if (lowerInput.includes("how are you")) {
                botReply = { text: "I'm functioning optimally! Thanks for asking. How can I help?", type: "status" };
            } else if (lowerInput.includes("your name") || lowerInput.includes("who are you")) {
                botReply = { text: `I am ${config.options.persona}, your virtual assistant.`, type: "identity" };
            } else if (lowerInput.includes("help") || lowerInput.includes("support")) {
                let helpMsg = "Sure, I can try to help. Please describe your question or issue.";
                if (enablePageContentContext && window.ChatbotContentScraper && window.ChatbotContentScraper.isScraped()) {
                     helpMsg += " You can also ask me about the content on this page.";
                }
                botReply = { text: helpMsg, type: "help" };
            } else if (lowerInput.includes("time")) {
                botReply = { text: `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`, type: "time" };
            } else if (lowerInput.includes("date")) {
                botReply = { text: `Today's date is ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`, type: "date" };
            } else if (lowerInput.includes("thank you") || lowerInput.includes("thanks")) {
                botReply = { text: "You're welcome! Is there anything else I can do for you?", type: "thanks" };
            } else if (lowerInput.includes("bye") || lowerInput.includes("goodbye")) {
                botReply = { text: "Goodbye! Have a wonderful day.", type: "goodbye" };
            } else if (lowerInput.includes("joke")) {
                const jokes = [ /* ... jokes ... */ ];
                botReply = { text: jokes[Math.floor(Math.random() * jokes.length)], type: "joke" };
            }

            // If hardcoded response found, return it
            if (botReply.type !== "fallback" && botReply.type !== "ai_answer") { // if not default or AI
                // No specific lastBotResponseInfo needed for these simple hardcoded ones
                return botReply;
            }

            // 3. Try to answer from local page content scraper (if AI didn't answer or wasn't used)
            // Use the localSearchForAIContext result if available and AI didn't answer
            if (enablePageContentContext && window.ChatbotContentScraper && window.ChatbotContentScraper.isScraped()) {
                const localSearchResult = localSearchForAIContext || window.ChatbotContentScraper.search(userInput); // Use cached or new search
                if (localSearchResult && localSearchResult.answer) {
                    botReply = {
                        text: localSearchResult.answer,
                        type: localSearchResult.type, // 'heading_prompt', 'details', 'paragraph'
                        headingText: localSearchResult.headingText, // Store heading if it was a prompt
                        rawAnswer: localSearchResult.rawAnswer,
                        sectionContext: localSearchResult.sectionContext
                    };
                    // If local search provided an answer, we use this.
                    // lastBotResponseInfo will be set outside based on this botReply.
                    return botReply;
                }
            }
            
            // 4. More generic fallbacks if input is very short
            if (botReply.type === "fallback" && lowerInput.length > 0 && lowerInput.length < 4) {
                 botReply.text = "Could you please elaborate a little more on that?";
            }

            // 5. Final fallbacks
            if (botReply.type === "fallback" || botReply.text === "") { // If still no answer
                const fallbacks = [
                    "I'm still learning. Could you rephrase that or ask something else?",
                    "Sorry, I didn't quite understand. How about asking in a different way?",
                    `I'm not sure about that. You can ask about our services or general topics.`,
                    "My apologies, I don't have specific information on that right now."
                ];
                if (enablePageContentContext && window.ChatbotContentScraper && window.ChatbotContentScraper.isScraped()) {
                    fallbacks.push("I couldn't find specific information about that on this page. Could you try asking differently?");
                }
                 if (hfToken && enablePageContentContext) {
                    fallbacks.push("I couldn't find a specific answer on this page using AI. Try rephrasing or asking a more general question.");
                }
                botReply.text = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            }
            
            // If we reached here, it's a fallback or a short elaboration request
            return botReply;
        }

        async function handleSendMessage() {
            const messageText = inputField.value.trim();
            if (messageText) {
                addMessage(messageText, 'user');
                inputField.value = '';
                inputField.focus();

                const typingIndicator = addMessage('', 'bot', true);
                await new Promise(resolve => setTimeout(resolve, 100)); 

                const botResponseObject = await getBotResponse(messageText);

                if (typingIndicator && typingIndicator.parentNode) {
                    messagesDiv.removeChild(typingIndicator);
                }
                addMessage(botResponseObject.text, 'bot');

                // Update lastBotResponseInfo for potential follow-ups
                if (botResponseObject.type === 'heading_prompt' && botResponseObject.headingText) {
                    lastBotResponseInfo = { type: 'heading_prompt', headingText: botResponseObject.headingText };
                } else {
                    lastBotResponseInfo = null; // Clear if not a heading prompt
                }
            }
        }

        function onMouseDown(e) { /* ... (no changes to this function) ... */ 
            if (e.target.closest('button, input, #my-chatbot-messages, #my-chatbot-input-area')) return;
            if (e.target.id !== 'my-chatbot-header' && !e.target.closest('#my-chatbot-header')) return;

            isDragging = true;
            const containerRect = chatbotContainer.getBoundingClientRect();
            offsetX = e.clientX - containerRect.left;
            offsetY = e.clientY - containerRect.top;
            chatbotContainer.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none'; 
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function onMouseMove(e) { /* ... (no changes to this function) ... */ 
            if (!isDragging) return;
            e.preventDefault(); 
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            const contWidth = chatbotContainer.offsetWidth;
            const contHeight = chatbotContainer.offsetHeight;

            newX = Math.max(0, Math.min(newX, window.innerWidth - contWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - contHeight));
            
            chatbotContainer.style.left = newX + 'px';
            chatbotContainer.style.top = newY + 'px';
            chatbotContainer.style.right = 'auto'; 
            chatbotContainer.style.bottom = 'auto'; 
        }

        function onMouseUp() { /* ... (no changes to this function) ... */ 
            if (!isDragging) return;
            isDragging = false;
            chatbotContainer.style.cursor = 'move'; 
            document.body.style.userSelect = ''; 
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        function setupEventListeners() { /* ... (no changes to this function) ... */ 
            chatButton.addEventListener('click', openChatWindow);
            internalCloseButton.addEventListener('click', closeChatWindow);
            sendButton.addEventListener('click', handleSendMessage);
            inputField.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault(); 
                    handleSendMessage();
                }
            });
            chatHeader.addEventListener('mousedown', onMouseDown);
        }

        createChatbotElements();
        applyStyles();
        setIconContainerPosition(); 
        setupEventListeners();

        console.log(`Chatbot for site ${config.siteId} (AI: ${config.options.hfToken ? 'Yes' : 'No'}, Page-Context: ${config.options.enablePageContentContext ? 'Enabled' : 'Disabled'}) initialized.`);
    });
})();