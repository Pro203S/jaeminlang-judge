export async function register() {
    console.log("[update] " + process.env.NEXT_RUNTIME + " loading");
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await (await import('./instrumentation.node')).register();
    }
}