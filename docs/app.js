function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60)
        .replace(/-$/, '');
}

function convertToCollapsible(container) {
    const elements = Array.from(container.children);
    const result = document.createDocumentFragment();

    // Stack to track nested sections: [{details, content, level}]
    const stack = [];
    let introSection = null;
    let inIntro = true;
    const usedIds = new Set();

    function getCurrentContent() {
        if (stack.length === 0) return null;
        return stack[stack.length - 1].content;
    }

    function closeToLevel(targetLevel) {
        // Close sections until we're at or below target level
        while (stack.length > 0 && stack[stack.length - 1].level >= targetLevel) {
            const closed = stack.pop();
            const parent = getCurrentContent();
            if (parent) {
                parent.appendChild(closed.details);
            } else {
                result.appendChild(closed.details);
            }
        }
    }

    function getUniqueId(baseId) {
        let id = baseId;
        let counter = 1;
        while (usedIds.has(id)) {
            id = `${baseId}-${counter++}`;
        }
        usedIds.add(id);
        return id;
    }

    let pendingAnchorId = null;

    for (const el of elements) {
        const tagName = el.tagName.toLowerCase();
        const headingMatch = tagName.match(/^h([2-4])$/);

        // Capture anchor IDs that precede headings
        if (tagName === 'a' && el.id && !el.href) {
            pendingAnchorId = el.id;
            continue;
        }

        if (headingMatch) {
            const level = parseInt(headingMatch[1]);

            // End intro section when we hit first h2
            if (level === 2 && inIntro) {
                inIntro = false;
                if (introSection) {
                    result.appendChild(introSection);
                }
            }

            // Close any sections at same or deeper level
            closeToLevel(level);

            // Create new collapsible section
            const details = document.createElement('details');
            details.className = `level-${level}`;

            // Apply pending anchor ID or generate one from heading text
            if (pendingAnchorId) {
                details.id = getUniqueId(pendingAnchorId);
                pendingAnchorId = null;
            } else {
                details.id = getUniqueId(generateSlug(el.textContent));
            }

            const summary = document.createElement('summary');
            summary.textContent = el.textContent;
            details.appendChild(summary);

            // Update URL when clicking summary
            summary.addEventListener('click', () => {
                history.replaceState(null, '', '#' + details.id);
            });

            const content = document.createElement('div');
            content.className = 'section-content';
            details.appendChild(content);

            // Push onto stack
            stack.push({ details, content, level });

        } else if (inIntro) {
            // Add to intro section
            if (!introSection) {
                introSection = document.createElement('div');
                introSection.className = 'intro-section';
            }
            introSection.appendChild(el.cloneNode(true));

        } else {
            // Add content to current section
            const currentContent = getCurrentContent();
            if (currentContent) {
                currentContent.appendChild(el.cloneNode(true));
            } else {
                result.appendChild(el.cloneNode(true));
            }
        }
    }

    // Close all remaining sections
    closeToLevel(0);

    container.innerHTML = '';
    container.appendChild(result);
}

async function loadMarkdown() {
    const contentEl = document.getElementById('content');

    try {
        const response = await fetch('travel_guide_2026.md');

        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }

        const markdown = await response.text();
        contentEl.innerHTML = marked.parse(markdown);

        // Convert h2/h3/h4 headings to collapsible sections
        convertToCollapsible(contentEl);

    } catch (error) {
        contentEl.innerHTML = `
            <div class="error">
                <strong>Unable to load the travel guide.</strong><br>
                ${error.message}
            </div>
        `;
        console.error('Error loading markdown:', error);
    }
}

function setupToolbar() {
    document.getElementById('expand-all').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#content details').forEach(d => d.open = true);
    });

    document.getElementById('collapse-all').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#content details').forEach(d => d.open = false);
    });
}

// Expand all sections before printing, restore after
window.addEventListener('beforeprint', () => {
    document.querySelectorAll('#content details').forEach(d => {
        d.dataset.wasOpen = d.open;
        d.open = true;
    });
});

window.addEventListener('afterprint', () => {
    document.querySelectorAll('#content details').forEach(d => {
        d.open = d.dataset.wasOpen === 'true';
    });
});

function expandToAnchor(hash) {
    if (!hash) return;
    const target = document.querySelector(hash);
    if (!target) return;

    // Expand the target if it's a details element
    if (target.tagName === 'DETAILS') {
        target.open = true;
    }

    // Expand all parent details elements
    let el = target.parentElement;
    while (el) {
        if (el.tagName === 'DETAILS') {
            el.open = true;
        }
        el = el.parentElement;
    }

    // Scroll into view
    target.scrollIntoView({ behavior: 'smooth' });
}

window.addEventListener('hashchange', () => {
    expandToAnchor(window.location.hash);
});

document.addEventListener('DOMContentLoaded', async () => {
    await loadMarkdown();
    setupToolbar();

    // Handle initial hash on page load
    if (window.location.hash) {
        expandToAnchor(window.location.hash);
    }
});
