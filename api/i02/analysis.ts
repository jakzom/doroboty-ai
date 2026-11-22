import { createI02HostedHandler, hostedI02Options } from "../../server/i02-hosted.js";

export default { fetch: createI02HostedHandler("analysis", hostedI02Options) };
