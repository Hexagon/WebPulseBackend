/**
 * Generate JavaScript that gets sent to the client.
 */
import { getProjectConfiguration, ProjectConfiguration } from "./db.ts";
import { genULID } from "./helpers.ts";
import { config } from "./config.ts";

export async function generateScript(projectId: string, origin: string): Promise<string | false> {
    const { realm, project } = await getProjectConfiguration(projectId, origin) as ProjectConfiguration;

    if (!project) {
        return false;
    }

    const loadId = genULID();
    const startBlock = `
    /* genscript v2 */
    function initTracking(realmId, projectId, reportBackURL) {
        function reportBack(data) {
            const url = reportBackURL;
            const payload = JSON.stringify(data);
            navigator.sendBeacon(url + "/track", payload);
        }
        
        function generateUUID() {
            if (self.crypto && typeof self.crypto.randomUUID === "function") {
                return self.crypto.randomUUID();
            }

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
                return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
            });
        }

        const loadId = "${loadId}";
        const deviceId = localStorage.getItem("deviceId") || generateUUID();
        localStorage.setItem("deviceId", deviceId);

        const sessionId = sessionStorage.getItem("sessionId") || generateUUID();
        sessionStorage.setItem("sessionId", sessionId);
    `;
    const endBlock = "} initTracking('" + realm.id + "', '" + project.id + "', '" +
        config.trackerURL + "');";
    let optionalBlock = "";

    if (project?.options?.pageLoads.enabled) {
        optionalBlock += `reportBack({
            type: "pageLoad",
            payload: {
                type: "pageLoad",
                realmId,
                projectId,
                deviceId,
                sessionId,
                referrer: document.referrer,
                title: document.title,
                url: window.location.href,
                timestamp: Date.now(),
            },
        });`;
    }

    if (project?.options?.pageClicks.enabled) {
        optionalBlock += `document.addEventListener("click", function (e) {
            const payload = {
                type: "pageClick",
                realmId,
                projectId,
                deviceId,
                sessionId,
                url: window.location.href,
                targetTag: e.target.tagName,
                targetId: e.target.id,
                targetHref: e.target.href,
                targetClass: e.target.classList.value,
                x: e.clientX,
                y: e.clientY,
                timestamp: Date.now(),
            };
            
            reportBack({ type: "pageClick", payload });
        }, { passive: true });`;
    }

    if (project?.options?.pageScrolls.enabled) {
        optionalBlock += `const trackedPercentages = [25, 50, 75, 100];
        const alreadyTracked = [];
    
        function throttle(func, delay) {
            let lastCall = 0;
            return function (...args) {
                const now = new Date().getTime();
                if (now - lastCall < delay) return;
                lastCall = now;
                return func(...args);
            };
        }
    
        document.addEventListener(
            "scroll",
            throttle(function () {
                const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPosition = window.scrollY;
                const scrollPercentage = (scrollPosition / pageHeight) * 100;
    
                for (const percent of trackedPercentages) {
                    if (scrollPercentage >= percent && !alreadyTracked.includes(percent)) {
                        const payload = {
                            type: "pageScroll",
                            realmId,
                            projectId,
                            deviceId,
                            sessionId,
                            url: window.location.href,
                            depth: percent,
                            timestamp: Date.now(),
                        };
    
                        reportBack({ type: "pageScroll", payload });
                        alreadyTracked.push(percent);
                    }
                }
            }, 200),
            { passive: true },
        );`;
    }

    return startBlock + optionalBlock + endBlock;
}
