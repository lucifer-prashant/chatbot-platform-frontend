// content-scraper.js
window.ChatbotContentScraper = (function() {
    let scrapedData = {
        title: '',
        headings: [], // Now: {level: 1-6, text: "...", contentBelow: ["paragraph1", "list item a"]}
        paragraphs: [], // Still kept for broad search
        listItems: [],  // Still kept for broad search
        fullText: ''
    };
    let hasScraped = false;

    function cleanText(text) {
        if (!text) return '';
        return text.replace(/\s\s+/g, ' ').trim();
    }

    function scrapePageContent(options = {}) {
        if (hasScraped && !options.forceRescrape) {
            console.log("ChatbotContentScraper: Already scraped. Use forceRescrape to scrape again.");
            return scrapedData;
        }

        console.log("ChatbotContentScraper: Starting content scrape...");
        scrapedData = { title: '', headings: [], paragraphs: [], listItems: [], fullText: '' };
        let tempFullText = '';

        try {
            scrapedData.title = cleanText(document.title);
            let contentRoot = document.querySelector('main') || document.querySelector('article') || document.body;
            const clonedRoot = contentRoot.cloneNode(true);

            clonedRoot.querySelectorAll(
                'script, style, nav, header, footer, aside, form, button, input, textarea, label, noscript, svg, img, audio, video, canvas, iframe, [aria-hidden="true"], .chatbot-ignore-content, #my-chatbot-container'
            ).forEach(el => el.remove());
            
            let currentHeadingContent = [];
            let lastHeadingLevel = 0;
            let lastHeadingObject = null;

            // Iterate through direct children of relevant sections to maintain order for associating content with headings
            // This is a simplified approach; a full DOM traversal with state would be more robust
            // For now, we'll iterate all relevant elements and then try to associate them.

            const allElements = Array.from(clonedRoot.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li'));
            let tempHeadings = [];

            allElements.forEach(el => {
                if (el.tagName.match(/^H[1-6]$/)) {
                    const level = parseInt(el.tagName.substring(1), 10);
                    const text = cleanText(el.textContent);
                    if (text) {
                        const headingObj = { level, text, contentBelow: [] };
                        tempHeadings.push(headingObj);
                        tempFullText += text + '\n\n';
                    }
                } else if (el.tagName === 'P') {
                    const text = cleanText(el.textContent);
                    if (text && text.split(' ').length > 5) {
                        scrapedData.paragraphs.push(text);
                        tempFullText += text + '\n\n';
                        // Associate with the last heading if appropriate
                        if (tempHeadings.length > 0) {
                            tempHeadings[tempHeadings.length - 1].contentBelow.push(text);
                        }
                    }
                } else if (el.tagName === 'LI') {
                    let liText = '';
                    el.childNodes.forEach(child => {
                        if (child.nodeType === Node.TEXT_NODE) {
                            liText += child.textContent;
                        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'UL' && child.tagName !== 'OL') {
                            liText += child.textContent;
                        }
                    });
                    const text = cleanText(liText);
                    if (text && text.length > 3) {
                        scrapedData.listItems.push(text);
                        tempFullText += text + '\n';
                        // Associate with the last heading if appropriate
                         if (tempHeadings.length > 0) {
                            tempHeadings[tempHeadings.length - 1].contentBelow.push(text);
                        }
                    }
                }
            });
            
            scrapedData.headings = tempHeadings; // Now headings include their direct content

            // Fallback for other significant text blocks (less structured)
            if (tempFullText.length < 1000 && scrapedData.paragraphs.length < 5) {
                clonedRoot.querySelectorAll('div:not(:empty), span:not(:empty), td:not(:empty)').forEach(el => {
                    if (!el.querySelector('p, h1, h2, h3, h4, h5, h6, li, div')) {
                         const text = cleanText(el.textContent);
                         if (text && text.split(' ').length > 8 && tempFullText.indexOf(text.substring(0, 30)) === -1) {
                            // Don't add to paragraphs if it's too generic and not clearly a paragraph
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
            console.log(`ChatbotContentScraper: Scraped ${scrapedData.fullText.length} chars. Title: "${scrapedData.title}". Found ${scrapedData.headings.length} headings, ${scrapedData.paragraphs.length} paras, ${scrapedData.listItems.length} LIs.`);
        } else {
            console.log("ChatbotContentScraper: Scraped content is empty or minimal.");
        }
        return scrapedData;
    }

    function getScrapedData() {
        return hasScraped ? scrapedData : null;
    }

    function searchScrapedText(query, options = { type: 'general', topicHint: null }) {
        if (!hasScraped || !scrapedData.fullText) return null;

        const queryLower = query.toLowerCase().trim();
        if (!queryLower) return null;
        
        const queryKeywords = queryLower.split(/\s+/).filter(w => w.length > 2 && !['the', 'a', 'is', 'of', 'on', 'in', 'and', 'to', 'for', 'what', 'how', 'why', 'can', 'i', 'me', 'it', 'is', 'do', 'does', 'about'].includes(w));

        let potentialAnswers = [];

        function calculateScore(text, textLower, type = 'generic') {
            let score = 0;
            let directMatchBonus = 0;

            if (textLower.includes(queryLower)) {
                directMatchBonus = 100;
                score += queryLower.length * 2;
            }

            let keywordMatchCount = 0;
            queryKeywords.forEach(kw => {
                if (textLower.includes(kw)) {
                    keywordMatchCount++;
                    score += kw.length;
                }
            });
            
            if (keywordMatchCount === 0 && directMatchBonus === 0 && queryKeywords.length > 0) return 0;


            if (queryKeywords.length > 0) {
                 score += (keywordMatchCount / queryKeywords.length) * 50;
            }
           
            score += directMatchBonus;
            score -= Math.floor(text.length / (type === 'paragraph' || type === 'details' ? 50 : 100)); // Penalize long text less for details
            if (type === 'heading') score += 10; // Boost headings slightly
            if (type === 'paragraph') score += 5;
            if (type === 'details') score += 30; // Boost for detailed content

            return score;
        }

        // If specifically asked for details about a heading (options.topicHint is the heading text)
        if (options.type === 'details_for_heading' && options.topicHint) {
            const hintLower = options.topicHint.toLowerCase();
            const foundHeading = scrapedData.headings.find(h => h.text.toLowerCase().includes(hintLower));
            if (foundHeading && foundHeading.contentBelow && foundHeading.contentBelow.length > 0) {
                const content = foundHeading.contentBelow.join("\n");
                potentialAnswers.push({ 
                    text: content, 
                    score: 200 + content.length, // High score to prioritize this
                    type: 'details',
                    sectionContext: foundHeading.text + "\n\n" + content // For AI context
                });
            }
        }


        // Search in title
        if (scrapedData.title) {
            const titleLower = scrapedData.title.toLowerCase();
            const score = calculateScore(scrapedData.title, titleLower, 'title');
            if (score > 10) {
                potentialAnswers.push({ text: `The page title is "${scrapedData.title}".`, score: score + 20, type: 'title' });
            }
        }
        
        // Search in headings and their content
        scrapedData.headings.forEach(h => {
            const headingTextLower = h.text.toLowerCase();
            const score = calculateScore(h.text, headingTextLower, 'heading');
            if (score > 20) { // If heading itself is a good match
                if (h.contentBelow && h.contentBelow.length > 0 && (queryLower.includes("what is") || queryLower.includes("tell me about") || queryLower.includes("details") || queryKeywords.length <= 1)) {
                    // If query implies wanting details and content exists, prefer that
                    const content = h.contentBelow.join("\n");
                    const contentScore = calculateScore(content, content.toLowerCase(), 'details');
                     potentialAnswers.push({ 
                        text: content, 
                        score: contentScore + 20, // Boost for being under a relevant heading
                        type: 'details',
                        sectionContext: h.text + "\n\n" + content
                    });
                } else {
                     potentialAnswers.push({ 
                        text: `Regarding "${h.text}", this section might be relevant. Ask for details if you'd like to know more.`, 
                        score: score, 
                        type: 'heading_prompt',
                        headingText: h.text, // Store actual heading text
                        sectionContext: h.text + (h.contentBelow.length > 0 ? "\n\n" + h.contentBelow.join("\n") : "")
                    });
                }
            }
            // Also search content below headings even if heading itself isn't a perfect match
            if (h.contentBelow && h.contentBelow.length > 0) {
                const content = h.contentBelow.join("\n");
                const contentScore = calculateScore(content, content.toLowerCase(), 'paragraph'); // Treat as paragraph
                if (contentScore > 25) {
                    potentialAnswers.push({
                        text: content,
                        score: contentScore,
                        type: 'paragraph',
                        sectionContext: h.text + "\n\n" + content
                    });
                }
            }
        });

        // Search in standalone paragraphs (not directly under a matched heading already)
        scrapedData.paragraphs.forEach(p => {
            // Avoid re-adding if it was already part of a heading's contentBelow
            const alreadyAdded = potentialAnswers.some(pa => pa.text.includes(p.substring(0,50)));
            if (!alreadyAdded) {
                const textLower = p.toLowerCase();
                const score = calculateScore(p, textLower, 'paragraph');
                if (score > 30) {
                    potentialAnswers.push({ text: p, score: score, type: 'paragraph', sectionContext: p });
                }
            }
        });
        
        // Search in list items (not directly under a matched heading already)
        scrapedData.listItems.forEach(item => {
            const alreadyAdded = potentialAnswers.some(pa => pa.text.includes(item.substring(0,30)));
            if(!alreadyAdded) {
                const textLower = item.toLowerCase();
                const score = calculateScore(item, textLower, 'listitem');
                if (score > 15) {
                     potentialAnswers.push({ text: item, score: score, type: 'listitem', sectionContext: item });
                }
            }
        });

        if (potentialAnswers.length === 0) return null;

        potentialAnswers.sort((a, b) => b.score - a.score);
        
        const bestMatch = potentialAnswers[0];
        let bestAnswerText = bestMatch.text;
        
        // Truncate long answers for chat display
        if (bestAnswerText.length > 400 && bestMatch.type !== 'details') {
            bestAnswerText = bestAnswerText.substring(0, 397) + "...";
        } else if (bestAnswerText.length > 250 && bestMatch.type === 'paragraph') {
             bestAnswerText = bestAnswerText.substring(0, 247) + "...";
        }
        
        // Return an object with more info
        return {
            answer: `Based on this page: ${bestAnswerText}`,
            type: bestMatch.type, // e.g., 'heading_prompt', 'details', 'paragraph'
            headingText: bestMatch.headingText || null, // If it was a heading_prompt
            rawAnswer: bestMatch.text, // The untruncated, unprefixed answer
            sectionContext: bestMatch.sectionContext || scrapedData.fullText.substring(0,3000) // Context for AI
        };
    }

    return {
        scrape: scrapePageContent,
        getData: getScrapedData,
        search: searchScrapedText,
        isScraped: () => hasScraped
    };
})();