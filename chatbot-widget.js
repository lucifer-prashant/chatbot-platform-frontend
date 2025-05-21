// This is chatbot-widget.js - it runs on the user's website

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const defaultConfig = {
            siteId: 'defaultSiteId_fallback',
            options: {
                theme: 'light',
                persona: 'Chatbot',
                language: 'en',
                position: 'bottom-right', // Initial position of the icon
                greeting: 'Hello! How can I help you today?',
                mainColor: '#007bff',
                textColor: '#ffffff',
                pulseAnimation: true,
                windowWidth: 370, // Default width
                windowHeight: 580 // Default height
            }
        };

        const userConfig = window.chatbotConfig || {};
        const config = {
            siteId: userConfig.siteId || defaultConfig.siteId,
            options: { ...defaultConfig.options, ...userConfig.options }
        };

        console.log('Chatbot Loaded with config:', config);

        // --- DOM Elements ---
        let chatbotContainer, chatButton, chatWindow, chatHeader, messagesDiv, inputField, sendButton, internalCloseButton;
        let isChatOpen = false;
        let isFirstOpen = true;

        // For dragging
        let isDragging = false;
        let offsetX, offsetY;
        let lastWindowPosition = { x: null, y: null }; // To store last position for reopening

        // --- SVGs ---
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

            chatButton = document.createElement('button');
            chatButton.id = 'my-chatbot-button';
            chatButton.innerHTML = chatIconSvg;
            chatButton.title = `Open ${config.options.persona}`;
            chatButton.style.display = 'flex'; // Initially visible

            chatWindow = document.createElement('div');
            chatWindow.id = 'my-chatbot-window';
            chatWindow.style.display = 'none'; // Initially hidden
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
            chatbotContainer.appendChild(chatButton); // Button appended last so it's "on top" if overlapping initially
            document.body.appendChild(chatbotContainer);

            // Assign to global vars after creation
            chatHeader = document.getElementById('my-chatbot-header');
            messagesDiv = document.getElementById('my-chatbot-messages');
            inputField = document.getElementById('my-chatbot-input');
            sendButton = document.getElementById('my-chatbot-send-btn');
            internalCloseButton = document.getElementById('my-chatbot-close-btn');
        }

        function applyStyles() {
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
                    /* Default position, will be adjusted by logic */
                    bottom: 20px;
                    right: 20px;
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
                @keyframes pulse-animation { /* ... (pulse animation from before) ... */ }

                #my-chatbot-window {
                    width: ${config.options.windowWidth}px;
                    height: ${config.options.windowHeight}px;
                    max-width: 90vw; /* Responsive max width */
                    max-height: calc(100vh - 40px); /* Responsive max height, with some margin */
                    background-color: ${currentTheme.bgColor}; color: ${currentTheme.textColor};
                    border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                    display: none; /* Controlled by JS */
                    flex-direction: column; overflow: hidden; /* Important for fixed header/footer */
                    opacity: 0; transform: scale(0.95);
                    transition: opacity 0.25s ease-out, transform 0.25s ease-out;
                    position: absolute; /* Will be positioned by container */
                    bottom: 0; /* Align to bottom of container initially */
                    right: 0; /* Align to right of container initially */
                }
                #my-chatbot-window.open {
                    opacity: 1; transform: scale(1);
                }
                #my-chatbot-header {
                    background-color: ${currentTheme.headerBg}; color: ${currentTheme.headerText}; padding: 12px 18px;
                    font-weight: 600; display: flex; justify-content: space-between; align-items: center;
                    border-top-left-radius: 12px; border-top-right-radius: 12px;
                    flex-shrink: 0; cursor: move; /* For dragging */
                }
                /* ... (rest of the styles for header, close-btn, messages, input area, etc. from previous version) ... */
                /* Make sure these styles are complete from your previous working version */
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

                 .chatbot-message { /* ... (as before) ... */ }
                 .chatbot-message.bot { /* ... (as before) ... */ }
                 .chatbot-message.user { /* ... (as before) ... */ }
                 .chatbot-message.typing-indicator { /* ... (as before) ... */ }
                 @keyframes typing-bounce { /* ... (as before) ... */ }

                 #my-chatbot-input-area { /* ... (as before) ... */ flex-shrink: 0; }
                 #my-chatbot-input { /* ... (as before) ... */ }
                 #my-chatbot-input:focus { /* ... (as before) ... */ }
                 #my-chatbot-input::placeholder { /* ... (as before) ... */ }
                 #my-chatbot-send-btn { /* ... (as before) ... */ }
                 #my-chatbot-send-btn:hover { /* ... (as before) ... */ }
                 #my-chatbot-send-btn svg { fill: ${currentTheme.headerText}; }
            `;
            document.head.appendChild(style);
        }

        function setInitialContainerPosition() {
            // The container itself will now hold the window or the button
            // It will be positioned fixed, and its content (window or button) will be placed within it.
            if (config.options.position === 'bottom-left') {
                chatbotContainer.style.left = '20px';
                chatbotContainer.style.right = 'auto';
                chatbotContainer.style.bottom = '20px';
                chatbotContainer.style.top = 'auto';
            } else { // Default bottom-right
                chatbotContainer.style.right = '20px';
                chatbotContainer.style.left = 'auto';
                chatbotContainer.style.bottom = '20px';
                chatbotContainer.style.top = 'auto';
            }
            // Ensure the window is positioned at 0,0 relative to the container when it opens
            chatWindow.style.left = '0px';
            chatWindow.style.top = '0px'; // Or bottom:0, right:0 depending on how you want it to "grow" from the icon spot
            chatWindow.style.bottom = 'auto'; // Override fixed bottom if using top/left for dragging
            chatWindow.style.right = 'auto';
        }

        function addMessage(text, sender, isTyping = false) {
            // ... (addMessage function from previous version, ensure messagesDiv is correct) ...
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

            chatButton.style.display = 'none'; // Hide the icon button
            chatWindow.style.display = 'flex'; // Show the window

            // Restore last position or default
            if (lastWindowPosition.x !== null && lastWindowPosition.y !== null) {
                chatbotContainer.style.left = lastWindowPosition.x + 'px';
                chatbotContainer.style.top = lastWindowPosition.y + 'px';
                chatbotContainer.style.bottom = 'auto'; // Important for draggable
                chatbotContainer.style.right = 'auto';  // Important for draggable
            } else {
                 // Default open position relative to viewport edges
                const defaultMargin = 20; // Margin from viewport edge
                const windowRect = chatWindow.getBoundingClientRect(); // Get its dimensions
                chatbotContainer.style.right = defaultMargin + 'px';
                chatbotContainer.style.bottom = defaultMargin + 'px';
                chatbotContainer.style.left = 'auto';
                chatbotContainer.style.top = 'auto';
            }


            void chatWindow.offsetWidth; // Force reflow for transition
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
            isChatOpen = false;

            chatWindow.classList.remove('open');
            // Store current position if window was moved
            const currentRect = chatbotContainer.getBoundingClientRect();
            lastWindowPosition.x = currentRect.left;
            lastWindowPosition.y = currentRect.top;


            setTimeout(() => {
                if (!isChatOpen) { // Check again
                    chatWindow.style.display = 'none';
                    chatButton.style.display = 'flex'; // Show the icon button again
                    setInitialContainerPosition(); // Reset container to default icon position
                }
            }, 260); // Match CSS transition
        }

        function getBotResponse(userInput) { /* ... (same as before) ... */
             const lowerInput = userInput.toLowerCase().trim();
            // Simple Rule-Based Responses
            if (lowerInput.includes("hello") || lowerInput.includes("hi") || lowerInput.includes("hey")) {
                return "Hello there! How can I assist you today?";
            } else if (lowerInput.includes("how are you")) {
                return "I'm just a bunch of code, but I'm functioning optimally! Thanks for asking.";
            } else if (lowerInput.includes("your name") || lowerInput.includes("who are you")) {
                return `I am ${config.options.persona}, your friendly assistant.`;
            } else if (lowerInput.includes("help") || lowerInput.includes("support")) {
                return "Sure, I can try to help. Please describe the issue or question you have.";
            } else if (lowerInput.includes("time")) {
                return `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
            } else if (lowerInput.includes("date")) {
                return `Today's date is ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
            } else if (lowerInput.includes("thank you") || lowerInput.includes("thanks")) {
                return "You're welcome! Is there anything else I can help with?";
            } else if (lowerInput.includes("bye") || lowerInput.includes("goodbye")) {
                return "Goodbye! Have a great day.";
            } else if (lowerInput.includes("joke")) {
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "Why did the scarecrow win an award? Because he was outstanding in his field!",
                    "I told my wife she was drawing her eyebrows too high. She seemed surprised.",
                    "Why don't programmers like nature? It has too many bugs."
                ];
                return jokes[Math.floor(Math.random() * jokes.length)];
            } else if (lowerInput.length < 3 && lowerInput.length > 0) {
                return "Could you please provide a bit more detail in your message?";
            } else if (lowerInput === "") {
                return "It seems you sent an empty message. How can I help?";
            }
            const fallbacks = [
                "I'm still learning. Could you try rephrasing that?",
                "Sorry, I didn't quite understand that. Can you ask in a different way?",
                `I'm not sure how to respond to that. Perhaps you can ask about our services or ${config.options.persona}'s capabilities?`,
                "My apologies, I don't have an answer for that right now."
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

        // --- Drag Functionality ---
        function onMouseDown(e) {
            // Only drag if mousedown is on the header, not input fields or buttons
            if (e.target.closest('button, input, #my-chatbot-messages')) return;

            isDragging = true;
            // Calculate offset from top-left of container to mouse position
            const containerRect = chatbotContainer.getBoundingClientRect();
            offsetX = e.clientX - containerRect.left;
            offsetY = e.clientY - containerRect.top;

            chatbotContainer.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function onMouseMove(e) {
            if (!isDragging) return;
            e.preventDefault(); // Prevent text selection while dragging

            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // Boundary checks (optional, but good for UX)
            const_winWidth = chatbotContainer.offsetWidth; // window becomes the container
            const_winHeight = chatbotContainer.offsetHeight;
            newX = Math.max(0, Math.min(newX, window.innerWidth - const_winWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - const_winHeight));

            chatbotContainer.style.left = newX + 'px';
            chatbotContainer.style.top = newY + 'px';
            chatbotContainer.style.right = 'auto'; // Override fixed positioning
            chatbotContainer.style.bottom = 'auto'; // Override fixed positioning
        }

        function onMouseUp() {
            if (!isDragging) return;
            isDragging = false;
            chatbotContainer.style.cursor = 'default'; // Or 'move' if you want to indicate it's still draggable
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        function setupEventListeners() {
            chatButton.addEventListener('click', openChatWindow);
            internalCloseButton.addEventListener('click', closeChatWindow);
            sendButton.addEventListener('click', handleSendMessage);
            inputField.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSendMessage();
                }
            });
            // Add mousedown listener to the chat window's header for dragging
            chatHeader.addEventListener('mousedown', onMouseDown);
        }

        // --- Initialization ---
        createChatbotElements();
        applyStyles();
        setInitialContainerPosition(); // For the icon initially
        setupEventListeners();

        console.log(`Chatbot for site ${config.siteId} (draggable) initialized.`);
    });
})();