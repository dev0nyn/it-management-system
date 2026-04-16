export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorker, syncSchedulers } = await import(
      "@/lib/monitoring/worker"
    );
    startWorker();
    await syncSchedulers();
    console.log("[monitoring] worker started and schedulers synced");
  }
}
