import { exportTransactionsQuerySchema } from "@/lib/schemas/reports";
import { apiHandler } from "@/server/http";
import { exportTransactionsCsv } from "@/server/services/export";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(exportTransactionsQuerySchema);
  const csvContent = await exportTransactionsCsv(userId, query);

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
});
