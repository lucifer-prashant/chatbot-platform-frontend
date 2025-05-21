// This is chatbot-widget.js - it runs on the user's website

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const defaultConfig = {
            siteId: 'defaultSiteId_fallback',
            options: {
                theme: 'light',
                persona: 'Chatbot',
                language: 'en',
                iconPosition: 'bottom-right', // Where the icon initially appears
                windowAlignment: 'bottom-right', // Where the window initially opens relative to screen
                greeting: 'Hello! How can I help you today?',
                mainColor: '#007bff',
                textColor: '#ffffff',
                pulseAnimation: true,
                windowWidth: 350,  // Decreased width
                windowHeight: 520 // Decreased height
            }
        };

        const userConfig = window.chatbotConfig || {};
        const config = {
            siteId: userConfig.siteId || defaultConfig.siteId,
            options: { ...defaultConfig.options, ...userConfig.options }
        };

        console.log('Chatbot Loaded with config:', config);

        let chatbotContainer, chatButton, chatWindow, chatHeader, messagesDiv, inputField, sendButton, internalCloseButton;
        let isChatOpen = false;
        let isFirstOpen = true;
        let isDragging = false;
        let offsetX, offsetY;
        let lastWindowPosition = { x: null, y: null };

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

        function createChatbotElements() {
            chatbotContainer = document.createElement('div');
            chatbotContainer.id = 'my-chatbot-container';
            chatbotContainer.style.position = 'fixed';
            chatbotContainer.style.zIndex = '10000';
            // Container will be transparent, its size will match its content (button or window)
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

        function applyStyles() {
            const style = document.createElement('style');
            const themeStyles = { /* ... (same as before) ... */
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
                    /* Positioned by JS */
                    transition: left 0.2s ease-out, right 0.2s ease-out, top 0.2s ease-out, bottom 0.2s ease-out; /* Smooth repositioning */
                }
                #my-chatbot-button { /* ... (same as before, including pulse animation) ... */
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
                    /* Window itself is not positioned; it fills the container when container holds window */
                }
                #my-chatbot-window.open {
                    opacity: 1; transform: scale(1);
                }
                #my-chatbot-header { /* ... (same as before, including cursor: move) ... */
                    background-color: ${currentTheme.headerBg}; color: ${currentTheme.headerText}; padding: 12px 18px;
                    font-weight: 600; display: flex; justify-content: space-between; align-items: center;
                    border-top-left-radius: 12px; border-top-right-radius: 12px;
                    flex-shrink: 0; cursor: move;
                }
                #my-chatbot-header span { font-size: 1.1em; }
                #my-chatbot-close-btn { /* ... (same as before) ... */
                    background: none; border: none; color: ${currentTheme.headerText}; cursor: pointer;
                    padding: 5px; line-height: 1; opacity: 0.8; transition: opacity 0.2s;
                }
                #my-chatbot-close-btn:hover { opacity: 1; }
                #my-chatbot-close-btn svg { fill: ${currentTheme.headerText}; }

                /* --- MESSAGES, INPUT, SEND BUTTON CSS (Restored and Checked) --- */
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
                    flex-shrink: 0; /* Prevent input area from shrinking */
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

        function setIconContainerPosition() {
            // Position the container for the icon state
            const margin = '20px';
            chatbotContainer.style.width = 'auto'; // Icon size
            chatbotContainer.style.height = 'auto'; // Icon size

            if (config.options.iconPosition === 'bottom-left') {
                chatbotContainer.style.left = margin;
                chatbotContainer.style.right = 'auto';
                chatbotContainer.style.bottom = margin;
                chatbotContainer.style.top = 'auto';
            } else { // Default bottom-right
                chatbotContainer.style.right = margin;
                chatbotContainer.style.left = 'auto';
                chatbotContainer.style.bottom = margin;
                chatbotContainer.style.top = 'auto';
            }
        }

        function setWindowContainerPosition(isInitialOpen = false) {
            // Position the container for the window state
            const margin = 20; // Margin from viewport edge
            chatbotContainer.style.width = config.options.windowWidth + 'px';
            chatbotContainer.style.height = config.options.windowHeight + 'px';

            if (isInitialOpen && lastWindowPosition.x === null) { // First open ever, no drag history
                if (config.options.windowAlignment === 'bottom-left') {
                    chatbotContainer.style.left = margin + 'px';
                    chatbotContainer.style.bottom = margin + 'px';
                    chatbotContainer.style.right = 'auto';
                    chatbotContainer.style.top = 'auto';
                } else { // Default bottom-right
                    chatbotContainer.style.right = margin + 'px';
                    chatbotContainer.style.bottom = margin + 'px';
                    chatbotContainer.style.left = 'auto';
                    chatbotContainer.style.top = 'auto';
                }
            } else if (lastWindowPosition.x !== null) { // Re-opening after drag
                chatbotContainer.style.left = lastWindowPosition.x + 'px';
                chatbotContainer.style.top = lastWindowPosition.y + 'px';
                chatbotContainer.style.bottom = 'auto';
                chatbotContainer.style.right = 'auto';
            } else { // Fallback (should be covered by initialOpen logic)
                 chatbotContainer.style.right = margin + 'px';
                 chatbotContainer.style.bottom = margin + 'px';
                 chatbotContainer.style.left = 'auto';
                 chatbotContainer.style.top = 'auto';
            }
        }


        function addMessage(text, sender, isTyping = false) { /* ... (same as before) ... */
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

        function openChatWindow() {
            if (isChatOpen) return;
            isChatOpen = true;

            setWindowContainerPosition(true); // Position container for window (true for initial open logic)

            chatButton.style.display = 'none';
            chatWindow.style.display = 'flex';

            void chatWindow.offsetWidth;
            chatWindow.classList.add('open');
            inputField.focus();

            if (isFirstOpen && config.options.greeting) {
                setTimeout(() => {
                    if (isChatOpen) addMessage(config.options.greeting, 'bot');
                }, 150);
                isFirstOpen = false;
            }
        }

        function closeChatWindow() {
            if (!isChatOpen) return;

            // Store current position BEFORE resetting container for icon
            const currentRect = chatbotContainer.getBoundingClientRect();
            lastWindowPosition.x = currentRect.left;
            lastWindowPosition.y = currentRect.top;

            isChatOpen = false; // Set state before timeout

            chatWindow.classList.remove('open');

            setTimeout(() => {
                // Check state again in case of rapid open/close
                if (!isChatOpen) {
                    chatWindow.style.display = 'none';
                    chatButton.style.display = 'flex';
                    setIconContainerPosition(); // Reset container for icon
                }
            }, 260);
        }

        function getBotResponse(userInput) { /* ... (same as before) ... */
            const lowerInput = userInput.toLowerCase().trim();
            if (lowerInput.includes("hello") || lowerInput.includes("hi") || lowerInput.includes("hey")) {
                return "Hello there! How can I assist you today?";
            } else if (lowerInput.includes("how are you")) {
                return "I'm functioning optimally! Thanks for asking. How can I help?";
            } else if (lowerInput.includes("your name") || lowerInput.includes("who are you")) {
                return `I am ${config.options.persona}, your virtual assistant.`;
            } else if (lowerInput.includes("help") || lowerInput.includes("support")) {
                return "Sure, I can try to help. Please describe your question or issue.";
            } else if (lowerInput.includes("time")) {
                return `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
            } else if (lowerInput.includes("date")) {
                return `Today's date is ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
            } else if (lowerInput.includes("thank you") || lowerInput.includes("thanks")) {
                return "You're welcome! Is there anything else I can do for you?";
            } else if (lowerInput.includes("bye") || lowerInput.includes("goodbye")) {
                return "Goodbye! Have a wonderful day.";
            } else if (lowerInput.includes("joke")) {
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "I told my wife she was drawing her eyebrows too high. She seemed surprised.",
                    "Why did the scarecrow win an award? Because he was outstanding in his field!",
                    "Parallel lines have so much in common. It’s a shame they’ll never meet."
                ];
                return jokes[Math.floor(Math.random() * jokes.length)];
            } else if (lowerInput.length > 0 && lowerInput.length < 4) {
                 return "Could you please elaborate a little more on that?";
            }

            const fallbacks = [
                "I'm still learning. Could you rephrase that or ask something else?",
                "Sorry, I didn't quite understand. How about asking in a different way?",
                `I'm not sure about that. You can ask about our services or general topics.`,
                "My apologies, I don't have specific information on that right now."
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
        function handleSendMessage() { /* ... (same as before) ... */
             const messageText = inputField.value.trim();
            if (messageText) {
                addMessage(messageText, 'user');
                inputField.value = '';
                inputField.focus();

                const typingIndicator = addMessage('', 'bot', true);

                setTimeout(() => {
                    if (typingIndicator && typingIndicator.parentNode) {
                        messagesDiv.removeChild(typingIndicator);
                    }
                    const botResponse = getBotResponse(messageText);
                    addMessage(botResponse, 'bot');
                }, 600 + Math.random() * 700);
            }
        }

        function onMouseDown(e) { /* ... (same as before, but check target relative to chatWindow) ... */
            if (e.target.closest('button, input, #my-chatbot-messages')) return; // Check if click is on interactive elements inside

            isDragging = true;
            const containerRect = chatbotContainer.getBoundingClientRect();
            offsetX = e.clientX - containerRect.left;
            offsetY = e.clientY - containerRect.top;

            chatbotContainer.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none'; // Prevent text selection globally
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
        function onMouseMove(e) { /* ... (same as before, ensure const_winWidth/Height are from chatbotContainer) ... */
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
        function onMouseUp() { /* ... (same as before) ... */
            if (!isDragging) return;
            isDragging = false;
            chatbotContainer.style.cursor = 'default';
            document.body.style.userSelect = ''; // Re-enable text selection
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        function setupEventListeners() { /* ... (same as before) ... */
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
        setIconContainerPosition(); // Start with icon position
        setupEventListeners();

        console.log(`Chatbot for site ${config.siteId} (draggable, revised) initialized.`);
    });
})();