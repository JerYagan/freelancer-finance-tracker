import { purgeSoftDeletedRows } from "@/server/services/purge";

async function main() {
  console.info(
    "Starting maintenance purge for soft-deleted transactions older than 30 days...",
  );
  const startTime = Date.now();

  try {
    const result = await purgeSoftDeletedRows({ olderThanDays: 30 });
    const duration = Date.now() - startTime;

    console.info("Purge job finished successfully:");
    console.info(`  - Cutoff date: ${result.cutoffDate}`);
    console.info(`  - Transactions permanently deleted: ${result.purgedCount}`);
    console.info(
      `  - Receipt files removed from storage: ${result.receiptKeysDeleted.length}`,
    );
    console.info(`  - Execution time: ${duration}ms`);
    process.exit(0);
  } catch (error) {
    console.error("Purge job failed:", error);
    process.exit(1);
  }
}

void main();
