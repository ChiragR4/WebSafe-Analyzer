/*chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentUrl = new URL(tabs[0].url);
    const domain = currentUrl.hostname;
    document.getElementById('domainName').textContent = domain;

    // You would fetch and update additional data here similar to background.js
    // For example, after receiving WHOIS info or other analysis results, populate:
    // document.getElementById('domainAge').textContent = fetchedAge;
    // document.getElementById('hostingInfo').textContent = fetchedHostingInfo;
    // etc.
});
*/

/*03/04/2025
// This script can fetch data or listen for messages from the background script and update the UI
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'setData') {
        document.getElementById('domain-info').textContent = 'Domain: ' + request.domain;
        document.getElementById('whois-info').textContent = 'WHOIS Info: ' + JSON.stringify(request.whoisData);
        document.getElementById('ip-info').textContent = 'IP Info: ' + JSON.stringify(request.ipData);
    }
});
*/

// Check if the domain is valid
function isValidDomain(domain) {
    return domain && !domain.startsWith("chrome://") && !domain.startsWith("file://") && !domain.startsWith("extensions");
}

// Function to resolve a domain to an IP address using Google's Public DNS API
function resolveDomainToIP(domain) {
    if (!isValidDomain(domain)) {
        console.warn(`Skipping IP resolution for invalid domain: ${domain}`);
        return Promise.reject(`Invalid domain: ${domain}`);
    }

    console.log(`Resolving IP for domain: ${domain}`);
    return fetch(`https://dns.google/resolve?name=${domain}&type=A`)
        .then(response => response.json())
        .then(data => {
            console.log("Google DNS API Response (A Record):", data);
            if (data.Answer && data.Answer.length > 0) {
                return data.Answer[0].data; // Return IPv4 address
            } else {
                console.warn(`No IPv4 found for ${domain}, trying IPv6...`);
                return fetch(`https://dns.google/resolve?name=${domain}&type=AAAA`)
                    .then(response => response.json())
                    .then(data => {
                        console.log("Google DNS API Response (AAAA Record):", data);
                        if (data.Answer && data.Answer.length > 0) {
                            return data.Answer[0].data; // Return IPv6 address
                        }
                        throw new Error(`No IP found for domain: ${domain} (IPv4 & IPv6 failed)`);
                    });
            }
        })
        .catch(error => {
            console.error(`Error resolving IP for ${domain}:`, error);
            return "Not Available";
        });
}

// Function to fetch WHOIS data from jsonwhoisapi.com
function fetchWhoisData(domain) {
    return fetch(`https://jsonwhoisapi.com/api/v1/whois?identifier=${domain}`, {
        method: 'GET',
        headers: {
            'Authorization': 'hKbVNcvYw0kY3Za8Yj1v4g'  // Replace with your actual API key
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`WHOIS API request failed with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('WHOIS Data:', data);
        return data;
    })
    .catch(error => {
        console.error('Error fetching WHOIS data:', error);
        return { error: "Failed to fetch WHOIS data" };
    });
}

// Function to update the popup UI
function updatePopupUI(domain, whoisData, ipInfo) {
    document.getElementById("domain-info").textContent = `Domain: ${domain}`;
    document.getElementById("whois-info").textContent = whoisData.error ? `WHOIS: ${whoisData.error}` : `WHOIS: ${whoisData.createdDate || "Unknown"}`;
    document.getElementById("ip-info").textContent = `IP: ${ipInfo}`;
}

// Main execution - Get the active tab's domain and fetch data
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) {
        console.error("No active tab found");
        return;
    }

    const currentUrl = new URL(tabs[0].url);
    const domain = currentUrl.hostname;
    
    if (!isValidDomain(domain)) {
        console.warn(`Skipping processing for invalid domain: ${domain}`);
        updatePopupUI(domain, { error: "Invalid Domain" }, "N/A");
        return;
    }

    // Fetch WHOIS Data
    fetchWhoisData(domain)
        .then(whoisData => {
            // Resolve domain to IP
            resolveDomainToIP(domain)
                .then(ipInfo => updatePopupUI(domain, whoisData, ipInfo))
                .catch(() => updatePopupUI(domain, whoisData, "Not Available"));
        })
        .catch(() => updatePopupUI(domain, { error: "WHOIS Fetch Error" }, "N/A"));
});

document.addEventListener("DOMContentLoaded", async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error("No active tab found");
            return;
        }

        const currentUrl = new URL(tabs[0].url);
        const domain = currentUrl.hostname;

        console.log("Extracted Domain:", domain);
        document.getElementById("domain-info").textContent = `Domain: ${domain}`;

        // Request WHOIS data from background.js
        chrome.runtime.sendMessage({ action: "getWhoisData", domain: domain }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("WHOIS Request Failed:", chrome.runtime.lastError);
                document.getElementById("whois-info").textContent = "WHOIS: Failed to fetch";
                return;
            }

            if (response.error) {
                console.error("WHOIS API Error:", response.error);
                document.getElementById("whois-info").textContent = "WHOIS: Failed to fetch";
                return;
            }

            console.log("WHOIS Data in Popup:", response);
            document.getElementById("whois-info").textContent = `WHOIS: ${JSON.stringify(response, null, 2)}`;
        });
    });
});
