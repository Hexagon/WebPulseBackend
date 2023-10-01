import { initTracking } from "../client.js";
import { config } from "../config.ts";
import { minifyJS } from "../helpers.ts";

export function getClient(trackId: string) {
    if (trackId && config.allowedProjects.includes(trackId)) {
        const [realmId, projectId] = trackId.split(".");

        const body = `
        ${minifyJS(initTracking.toString())}
            initTracking("${realmId}", "${projectId}", "${config.trackerURL}");
        `;
        
        return new Response(body, {
            status: 200,
            headers: {
                "content-type": "application/javascript",
                ...config.commonHeaders,
            },
        });
    } else {
        return new Response(null, {
            status: 403,
            headers: config.commonHeaders,
        });
    }
}
