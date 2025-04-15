console.log("✅ Background script loaded successfully!");

// Check if a domain is valid
function isValidDomain(domain) {
    return domain && !domain.startsWith("chrome://") && !domain.startsWith("file://") && !domain.startsWith("extensions");
}

// Function to resolve a domain to an IP address using Google's Public DNS API
async function resolveDomainToIP(domain) {
    if (!isValidDomain(domain)) {
        console.warn(`Skipping IP resolution for invalid domain: ${domain}`);
        return null;
    }

    console.log(`Resolving IP for domain: ${domain}`);

    try {
        let response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
        let data = await response.json();
        console.log("Google DNS API Response (A Record):", data);

        if (data.Answer && data.Answer.length > 0) {
            return data.Answer[0].data; // Return IPv4 address
        }

        console.warn(`No IPv4 found for ${domain}, trying IPv6...`);
        response = await fetch(`https://dns.google/resolve?name=${domain}&type=AAAA`);
        data = await response.json();
        console.log("Google DNS API Response (AAAA Record):", data);

        if (data.Answer && data.Answer.length > 0) {
            return data.Answer[0].data; // Return IPv6 address
        }

        throw new Error(`No IP found for domain: ${domain} (IPv4 & IPv6 failed)`);
    } catch (error) {
        console.error(`Error resolving IP for ${domain}:`, error);
        return null;
    }
}

// Function to fetch WHOIS data from JSONWHOISAPI
async function fetchWhoisData(domain) {
    const apiKey = "hKbVNcvYw0kY3Za8Yj1v4g"; // Replace with actual API key
    const url = `https://jsonwhoisapi.com/api/v1/whois?identifier=${domain}`;

    console.log(`Fetching WHOIS data for: ${domain}`);
    
    try {
        let response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": apiKey }
        });

        if (!response.ok) {
            throw new Error(`WHOIS API failed. Status: ${response.status}, Message: ${await response.text()}`);
        }

        let data = await response.json();
        console.log("WHOIS Data Received:", data);

        if (!data || Object.keys(data).length === 0) {
            throw new Error("WHOIS API returned empty data.");
        }

        return data;
    } catch (error) {
        console.error("WHOIS Fetch Error:", error);
        return "WHOIS lookup failed"; // Ensure UI shows meaningful error
    }
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getWhoisData") {
        fetchWhoisData(request.domain).then(sendResponse);
        return true; // Keeps the message channel open for async response
    }
});


/*
//With Whoisxmlapi
let lastRequestTime = 0;
const REQUEST_DELAY = 5000; // 5 seconds delay to prevent rate limits

async function fetchWhoisData(domain) {
    const apiKey = "YOUR_WHOISXMLAPI_KEY"; // 🔹 Replace with your WhoisXMLAPI key
    const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=json`;

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < REQUEST_DELAY) {
        console.warn(`Rate limit detected! Waiting for ${REQUEST_DELAY - timeSinceLastRequest}ms`);
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
    }

    lastRequestTime = Date.now(); // Update request timestamp

    try {
        let response = await fetch(url);

        if (response.status === 429) {
            console.error("WHOIS API rate limit exceeded (429). Retrying after delay...");
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
            return fetchWhoisData(domain); // 🔹 Retry after delay
        }

        if (!response.ok) {
            throw new Error(`WHOIS API failed. Status: ${response.status}, Message: ${await response.text()}`);
        }

        let data = await response.json();
        console.log("WHOIS Data Received:", data);

        return data;
    } catch (error) {
        console.error("WHOIS Fetch Error:", error);
        return { error: "WHOIS lookup failed" };
    }
}

// Function to resolve a domain to an IP address using Google's Public DNS API
async function resolveDomainToIP(domain) {
    try {
        let response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
        let data = await response.json();

        if (data.Answer && data.Answer.length > 0) {
            return data.Answer[0].data; // Return IPv4 address
        }

        // Try IPv6 if no IPv4 is found
        response = await fetch(`https://dns.google/resolve?name=${domain}&type=AAAA`);
        data = await response.json();

        if (data.Answer && data.Answer.length > 0) {
            return data.Answer[0].data;
        }

        throw new Error(`No IP found for domain: ${domain}`);
    } catch (error) {
        console.error(`Error resolving IP for ${domain}:`, error);
        return null;
    }
}

// Listen for requests from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getWhoisData") {
        fetchWhoisData(message.domain)
            .then(data => sendResponse({ whois: data }))
            .catch(error => sendResponse({ error: "Failed to fetch WHOIS data" }));

        return true; // Keeps the message channel open for async response
    }

    if (message.action === "getIPInfo") {
        resolveDomainToIP(message.domain)
            .then(ip => {
                if (!ip) {
                    sendResponse({ error: "Failed to resolve IP" });
                    return;
                }
                fetch(`https://ipinfo.io/${ip}/json`)
                    .then(response => response.json())
                    .then(data => sendResponse({ ipInfo: data }))
                    .catch(error => sendResponse({ error: "Failed to fetch IP info" }));
            })
            .catch(error => sendResponse({ error: "IP resolution error" }));

        return true; // Keeps the message channel open
    }
});
*/