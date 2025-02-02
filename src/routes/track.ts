import { getProjectConfiguration, logData, ProjectConfiguration } from "../db.ts";
import { getOrigin, getUserAgent } from "../helpers.ts";
import { config } from "../config.ts";

export async function track(body: string, req: Request) {
    const origin = getOrigin(req);
    const userAgent = getUserAgent(req);
    const data = JSON.parse(body);
    data.payload.userAgent = userAgent.toJSON();

    const { realm, project } = await getProjectConfiguration(data?.payload?.projectId, origin) as ProjectConfiguration;

    if (project && realm && realm.id && project.id) {
        logData(data);

        return new Response(body, {
            status: 200,
            headers: config.commonHeaders,
        });
    } else {
        return new Response(null, {
            status: 403,
            headers: config.commonHeaders,
        });
    }
}
