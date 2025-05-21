// This is chatbot-widget.js - it runs on the user's website

(function() {
    // Wait for the DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Default configuration (in case window.chatbotConfig is missing some parts)
        const defaultConfig = {
            siteId: 'defaultSiteId',
            options: {
                theme: 'light',
                persona: 'Chatbot',
                language: 'en',
                position: 'bottom-right', // example: bottom-right, bottom-left
                greeting: 'Hello! How can I help you today?',
                mainColor: '#007bff', // Default primary color
                textColor: '#ffffff'  // Default text color for button/header
            }
        };

        // Merge user config with defaults
        const userConfig = window.chatbotConfig || {};
        const config = {
            siteId: userConfig.siteId || defaultConfig.siteId,
            options: { ...defaultConfig.options, ...userConfig.options }
        };


        console.log('Chatbot Loaded with config:', config);

        // Create chatbot elements
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

        const chatbotContainer = document.createElement('div');
        chatbotContainer.id = 'my-chatbot-container';
        chatbotContainer.style.position = 'fixed';
        chatbotContainer.style.zIndex = '9999';
        chatbotContainer.style.transition = 'all 0.3s ease-in-out';

        const chatButton = document.createElement('button');
        chatButton.id = 'my-chatbot-button';
        chatButton.innerHTML = chatIconSvg; // Placeholder text/icon
        chatButton.title = config.options.persona;

        const chatWindow = document.createElement('div');
        chatWindow.id = 'my-chatbot-window';
        chatWindow.style.display = 'none'; // Initially hidden
        chatWindow.innerHTML = `
            <div id="my-chatbot-header">
                <span>${config.options.persona}</span>
                <button id="my-chatbot-close-btn">${closeIconSvg}</button>
            </div>
            <div id="my-chatbot-messages">
                <div class="chatbot-message bot">
                    <p>${config.options.greeting}</p>
                </div>
                <!-- Messages will go here -->
            </div>
            <div id="my-chatbot-input-area">
                <input type="text" id="my-chatbot-input" placeholder="Type your message...">
                <button id="my-chatbot-send-btn">Send</button>
            </div>
        `;

        chatbotContainer.appendChild(chatButton);
        chatbotContainer.appendChild(chatWindow);
        document.body.appendChild(chatbotContainer);

        // --- Styling ---
        const style = document.createElement('style');
        const themeStyles = {
            light: {
                bgColor: '#ffffff',
                textColor: '#333333',
                headerBg: config.options.mainColor,
                headerText: config.options.textColor,
                inputBg: '#f1f1f1',
                borderColor: '#e0e0e0',
                botMessageBg: '#e9e9e9',
                botMessageText: '#333333',
                userMessageBg: config.options.mainColor,
                userMessageText: config.options.textColor,
            },
            dark: {
                bgColor: '#2c2c2c',
                textColor: '#ffffff',
                headerBg: config.options.mainColor, // Or a darker shade like '#1a1a1a',
                headerText: config.options.textColor,
                inputBg: '#3a3a3a',
                borderColor: '#444444',
                botMessageBg: '#404040',
                botMessageText: '#f1f1f1',
                userMessageBg: config.options.mainColor,
                userMessageText: config.options.textColor,
            }
        };
        const currentTheme = themeStyles[config.options.theme] || themeStyles.light;

        style.textContent = `
            #my-chatbot-button {
                background-color: ${currentTheme.headerBg};
                color: ${currentTheme.headerText};
                border: none;
                border-radius: 50%;
                width: 60px;
                height: 60px;
                font-size: 24px; /* For icon or text */
                cursor: pointer;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                display: flex;
                justify-content: center;
                align-items: center;
                transition: transform 0.2s ease-out;
            }
            #my-chatbot-button:hover {
                transform: scale(1.1);
            }
            #my-chatbot-window {
                width: 350px;
                max-height: 80vh;
                height: 500px;
                background-color: ${currentTheme.bgColor};
                color: ${currentTheme.textColor};
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                margin-bottom: 10px; /* Space between button and window if button is below */
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            #my-chatbot-window.open {
                display: flex; /* This is handled by JS for open/close */
                opacity: 1;
                transform: translateY(0);
            }
            #my-chatbot-header {
                background-color: ${currentTheme.headerBg};
                color: ${currentTheme.headerText};
                padding: 10px 15px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            #my-chatbot-header span {
                font-size: 1.1em;
            }
            #my-chatbot-close-btn {
                background: none;
                border: none;
                color: ${currentTheme.headerText};
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
                line-height: 1;
            }
            #my-chatbot-close-btn svg { fill: ${currentTheme.headerText}; }

            #my-chatbot-messages {
                flex-grow: 1;
                padding: 15px;
                overflow-y: auto;
                border-bottom: 1px solid ${currentTheme.borderColor};
            }
            .chatbot-message {
                margin-bottom: 10px;
                max-width: 80%;
                padding: 8px 12px;
                border-radius: 15px;
                line-height: 1.4;
            }
            .chatbot-message.bot {
                background-color: ${currentTheme.botMessageBg};
                color: ${currentTheme.botMessageText};
                border-bottom-left-radius: 2px;
                align-self: flex-start; /* if using flex */
                margin-right: auto;
            }
            .chatbot-message.user {
                background-color: ${currentTheme.userMessageBg};
                color: ${currentTheme.userMessageText};
                border-bottom-right-radius: 2px;
                align-self: flex-end; /* if using flex */
                margin-left: auto;
            }
            #my-chatbot-input-area {
                display: flex;
                padding: 10px;
                border-top: 1px solid ${currentTheme.borderColor};
                background-color: ${currentTheme.bgColor}; /* Or specific input area bg */
            }
            #my-chatbot-input {
                flex-grow: 1;
                padding: 10px;
                border: 1px solid ${currentTheme.borderColor};
                border-radius: 20px;
                margin-right: 10px;
                background-color: ${currentTheme.inputBg};
                color: ${currentTheme.textColor};
            }
            #my-chatbot-input::placeholder {
                color: ${currentTheme.textColor}99; /* Slightly transparent text color */
            }
            #my-chatbot-send-btn {
                background-color: ${currentTheme.headerBg};
                color: ${currentTheme.headerText};
                border: none;
                padding: 10px 15px;
                border-radius: 20px;
                cursor: pointer;
                font-weight: bold;
            }
            #my-chatbot-send-btn:hover {
                opacity: 0.9;
            }
        `;
        document.head.appendChild(style);

        // Positioning based on config
        if (config.options.position === 'bottom-left') {
            chatbotContainer.style.bottom = '20px';
            chatbotContainer.style.left = '20px';
            chatWindow.style.marginBottom = '10px'; // if button is below
        } else { // Default to bottom-right
            chatbotContainer.style.bottom = '20px';
            chatbotContainer.style.right = '20px';
            chatbotContainer.style.alignItems = 'flex-end'; // Aligns window to the right if button is also right
            chatWindow.style.marginBottom = '10px'; // if button is below
        }


        // --- Functionality ---
        const toggleChatWindow = () => {
            const isOpen = chatWindow.style.display === 'flex';
            if (isOpen) {
                chatWindow.classList.remove('open');
                // Wait for animation to finish before hiding
                setTimeout(() => {
                    chatWindow.style.display = 'none';
                }, 300); // Match transition duration
                chatButton.innerHTML = chatIconSvg;
            } else {
                chatWindow.style.display = 'flex';
                // Force reflow to ensure transition plays
                void chatWindow.offsetWidth;
                chatWindow.classList.add('open');
                chatButton.innerHTML = closeIconSvg;
            }
        };

        chatButton.addEventListener('click', toggleChatWindow);
        document.getElementById('my-chatbot-close-btn').addEventListener('click', toggleChatWindow);

        const messagesDiv = document.getElementById('my-chatbot-messages');
        const inputField = document.getElementById('my-chatbot-input');
        const sendButton = document.getElementById('my-chatbot-send-btn');

        const addMessage = (text, sender) => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('chatbot-message', sender); // sender is 'user' or 'bot'
            const p = document.createElement('p');
            p.textContent = text;
            messageElement.appendChild(p);
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
        };

        const handleSendMessage = () => {
            const messageText = inputField.value.trim();
            if (messageText) {
                addMessage(messageText, 'user');
                inputField.value = '';

                // --- THIS IS WHERE YOU'D INTEGRATE YOUR CHATBOT LOGIC ---
                // For now, a simple echo bot or canned response
                setTimeout(() => {
                    let botResponse = "I'm a simple demo bot. You said: " + messageText;
                    if (messageText.toLowerCase().includes('hello') || messageText.toLowerCase().includes('hi')) {
                        botResponse = "Hello there! How can I assist you?";
                    } else if (messageText.toLowerCase().includes('help')) {
                        botResponse = "Sure, I can try to help. What do you need assistance with?";
                    } else if (messageText.toLowerCase().includes('name')) {
                        botResponse = `My name is ${config.options.persona}.`;
                    }
                    addMessage(botResponse, 'bot');
                }, 500 + Math.random() * 500); // Simulate thinking
            }
        };

        sendButton.addEventListener('click', handleSendMessage);
        inputField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSendMessage();
            }
        });

        // --- API Connection (Placeholder) ---
        // You would connect to your backend here using config.siteId
        // Example:
        // fetch(`https://yourchatbotplatform.com/api/init?siteId=${config.siteId}`)
        //   .then(response => response.json())
        //   .then(data => {
        //     console.log('Connected to backend, initial data:', data);
        //     // Potentially update greeting or other config from backend
        //     if(data.greeting) {
        //         document.querySelector('#my-chatbot-messages .chatbot-message.bot p').textContent = data.greeting;
        //     }
        //   })
        //   .catch(error => console.error('Error connecting to chatbot backend:', error));

        console.log(`Chatbot for site ${config.siteId} initialized with language ${config.options.language}.`);
    });
})();