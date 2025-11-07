import "dotenv/config";
import axios from "axios";

const API_BASE = process.env.API_BASE || "http://localhost:3001/api";
const LIMIT = Number(process.env.RP_LIMIT || 100);
const UNIDADE = process.env.RP_UNIDADE || "";
const BATCH = Number(process.env.RP_BATCH || 50);
const MAX_RETRIES = Number(process.env.RP_MAX_RETRIES || 1);
const INCR = (process.env.RP_INCREMENTAL_RETRY || "true").toLowerCase();
const DRY_RUN = (process.env.RP_DRY_RUN || "false").toLowerCase();

function asBool(s: string) {
  return ["1","true","yes","on"].includes(s.toLowerCase());
}

async function main() {
  console.log(`REST reprocess start (dryRun=${DRY_RUN})`);
  const params = new URLSearchParams({ limit: String(LIMIT) });
  if (UNIDADE) params.append("unidade", UNIDADE);

  const failedUrl = `${API_BASE}/v1/notifications/failed?${params.toString()}`;
  const list = await axios.get(failedUrl).then(r => r.data);
  console.log(`Selecionadas: ${list.total}`);

  if (!list.total) return;

  if (asBool(DRY_RUN)) {
    console.table(list.items.slice(0,10).map((x: any) => ({
      id: x.id, to: x.to, error: (x.errorMessage||"").slice(0,80)
    })));
    return;
  }

  const body = {
    limit: LIMIT,
    unidade: UNIDADE || undefined,
    batchSize: BATCH,
    maxRetries: MAX_RETRIES,
    incrementalRetry: asBool(INCR),
  };
  const resp = await axios.post(`${API_BASE}/v1/notifications/reprocess`, body).then(r => r.data);
  console.log("Resultado:", JSON.stringify(resp, null, 2));
}

main().catch(e => { console.error("Erro:", e.message); process.exit(1); });
