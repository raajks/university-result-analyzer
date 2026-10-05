export {};

async function main() {
  const res = await fetch('http://localhost:3001/api/results');
  const json = await res.json();
  console.log('Results API Response:');
  console.log(`Success: ${json.success} | Total: ${json.totalCount} | Columns: ${json.columns.map((c: any) => c.code).join(', ')}`);
  json.results.forEach((r: any) => {
    console.log(`- Roll: ${r.rollNumber} | Name: ${r.studentName} | Source: ${r.source} | Status: ${r.resultStatus} | SGPA: ${r.sgpa}`);
  });
}
main().catch(console.error);
