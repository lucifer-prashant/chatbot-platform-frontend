// content-scraper.js
window.ChatbotContentScraper = (function() {
    let scrapedData = {
        title: '',
        headings: [], // {level: 1-6, text: "..."}
        paragraphs: [], // array of strings
        listItems: [], // array of strings
        fullText: '' // all combined, cleaned text
    };
    let hasScraped = false;

    function cleanText(text) {
        if (!text) return '';
        return text.replace(/\s\s+/g, ' ').trim(); // Replace multiple spaces with single, then trim
    }

    function scrapePageContent(options = {}) {
        if (hasScraped && !options.forceRescrape) {
            console.log("ChatbotContentScraper: Already scraped. Use forceRescrape to scrape again.");
            return scrapedData;
        }

        console.log("ChatbotContentScraper: Starting content scrape...");
        // Reset data
        scrapedData = { title: '', headings: [], paragraphs: [], listItems: [], fullText: '' };
        let tempFullText = '';

        try {
            scrapedData.title = cleanText(document.title);

            // Prioritize specific content elements if they exist
            let contentRoot = document.querySelector('main') || document.querySelector('article') || document.body;
            
            // Clone the content root to manipulate it without affecting the live page
            const clonedRoot = contentRoot.cloneNode(true);

            // Remove unwanted elements from the clone. Add any other selectors to ignore.
            // The class '.chatbot-ignore-content' can be added by website owners to exclude specific sections.
            clonedRoot.querySelectorAll(
                'script, style, nav, header, footer, aside, form, button, input, textarea, label, noscript, svg, img, audio, video, canvas, iframe, [aria-hidden="true"], .chatbot-ignore-content, #my-chatbot-container'
            ).forEach(el => el.remove());
            
            // Extract headings
            clonedRoot.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
                const level = parseInt(h.tagName.substring(1), 10);
                const text = cleanText(h.textContent);
                if (text) {
                    scrapedData.headings.push({ level, text });
                    tempFullText += text + '\n\n';
                }
            });

            // Extract paragraphs
            clonedRoot.querySelectorAll('p').forEach(p => {
                const text = cleanText(p.textContent);
                // Basic filter for meaningful content length
                if (text && text.split(' ').length > 5) { 
                    scrapedData.paragraphs.push(text);
                    tempFullText += text + '\n\n';
                }
            });

            // Extract list items
            clonedRoot.querySelectorAll('li').forEach(li => {
                // Attempt to get meaningful text from li, avoiding nested list markers if possible
                let liText = '';
                // Iterate child nodes to build text, excluding UL/OL to avoid their markers being duplicated
                li.childNodes.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        liText += child.textContent;
                    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'UL' && child.tagName !== 'OL') {
                        liText += child.textContent; // Could be SPAN, A, etc.
                    }
                });
                const text = cleanText(liText);
                if (text && text.length > 3) { 
                    scrapedData.listItems.push(text);
                    tempFullText += text + '\n';
                }
            });
            
            // Fallback for other significant text blocks (e.g., text directly in divs)
            // This is more prone to noise, so use cautiously or refine selectors
            if (tempFullText.length < 1000) { // If very little content found so far
                clonedRoot.querySelectorAll('div:not(:empty), span:not(:empty), td:not(:empty)').forEach(el => {
                    // Check if it's likely a text container and not processed (heuristic)
                    if (!el.querySelector('p, h1, h2, h3, h4, h5, h6, li, div')) {
                         const text = cleanText(el.textContent);
                         if (text && text.split(' ').length > 8 && tempFullText.indexOf(text.substring(0, 30)) === -1) {
                            tempFullText += text + '\n\n';
                         }
                    }
                });
            }
            
            scrapedData.fullText = cleanText(tempFullText);

        } catch (error) {
            console.error("ChatbotContentScraper: Error during content scraping:", error);
            hasScraped = false;
            return null;
        }
        
        hasScraped = true;
        if (scrapedData.fullText) {
            console.log(`ChatbotContentScraper: Scraped ${scrapedData.fullText.length} characters. Title: "${scrapedData.title}". Found ${scrapedData.headings.length} headings, ${scrapedData.paragraphs.length} paragraphs, ${scrapedData.listItems.length} list items.`);
        } else {
            console.log("ChatbotContentScraper: Scraped content is empty or minimal.");
        }
        return scrapedData;
    }

    function getScrapedData() {
        return hasScraped ? scrapedData : null;
    }

    function searchScrapedText(query) {
        if (!hasScraped || !scrapedData.fullText) return null;

        const queryLower = query.toLowerCase().trim();
        if (!queryLower) return null;

        const queryKeywords = queryLower.split(/\s+/).filter(w => w.length > 2 && !['the', 'a', 'is', 'of', 'on', 'in', 'and', 'to', 'for', 'what', 'how', 'why', 'can', 'i'].includes(w));

        let potentialAnswers = [];

        function calculateScore(text, textLower) {
            let score = 0;
            let directMatchBonus = 0;

            if (textLower.includes(queryLower)) { // Full query phrase match
                directMatchBonus = 100;
                score += queryLower.length * 2; // Longer direct matches are better
            }

            let keywordMatchCount = 0;
            queryKeywords.forEach(kw => {
                if (textLower.includes(kw)) {
                    keywordMatchCount++;
                    score += kw.length; // Weight by keyword length
                }
            });
            
            if (keywordMatchCount === 0 && directMatchBonus === 0) return 0;

            // Boost score if more query keywords are present
            if (queryKeywords.length > 0) {
                 score += (keywordMatchCount / queryKeywords.length) * 50;
            }
           
            score += directMatchBonus;
            // Penalize very long texts slightly, prefer concise answers
            score -= Math.floor(text.length / 100);
            return score;
        }

        // Search in title
        if (scrapedData.title) {
            const titleLower = scrapedData.title.toLowerCase();
            const score = calculateScore(scrapedData.title, titleLower);
            if (score > 10) { // Arbitrary threshold for relevance
                potentialAnswers.push({ text: `The page title is "${scrapedData.title}".`, score: score + 20, type: 'title' });
            }
        }
        
        // Search in headings
        scrapedData.headings.forEach(h => {
            const textLower = h.text.toLowerCase();
            const score = calculateScore(h.text, textLower);
            if (score > 20) {
                potentialAnswers.push({ text: `The page has a heading: "${h.text}".`, score: score + 10, type: 'heading' });
            }
        });

        // Search in paragraphs
        scrapedData.paragraphs.forEach(p => {
            const textLower = p.toLowerCase();
            const score = calculateScore(p, textLower);
            if (score > 30) {
                potentialAnswers.push({ text: p, score: score, type: 'paragraph' });
            }
        });
        
        // Search in list items
        scrapedData.listItems.forEach(item => {
            const textLower = item.toLowerCase();
            const score = calculateScore(item, textLower);
            if (score > 15) {
                 potentialAnswers.push({ text: item, score: score, type: 'listitem' });
            }
        });

        if (potentialAnswers.length === 0) return null;

        potentialAnswers.sort((a, b) => b.score - a.score);

        let bestAnswer = potentialAnswers[0].text;
        
        // Truncate long answers for chat display
        if (bestAnswer.length > 400) {
            bestAnswer = bestAnswer.substring(0, 397) + "... (see page for more details)";
        } else if (bestAnswer.length > 250 && potentialAnswers[0].type === 'paragraph') {
             bestAnswer = bestAnswer.substring(0, 247) + "...";
        }
        
        return `Based on this page: ${bestAnswer}`;
    }

    return {
        scrape: scrapePageContent,
        getData: getScrapedData,
        search: searchScrapedText,
        isScraped: () => hasScraped
    };
})();