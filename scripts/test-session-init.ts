export {};

async function main() {
  console.log('Testing collection session initialization on http://localhost:3001 ...');
  const res = await fetch('http://localhost:3001/api/collection/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      universityCode: 'CCSU',
      course: 'B.C.A.',
      semester: 'Sem I',
      marksheetType: 'NEP',
      academicYear: '2024-2025',
      mode: 'interactive',
      rollNumber: '250302002002',
    }),
  });

  const json = await res.json();
  console.log('Response status:', res.status);
  console.log('Session created:', json.success);
  if (json.runnerStatus) {
    console.log('Runner Status:', json.runnerStatus.status);
    console.log('Active Roll:', json.runnerStatus.activeRollNumber);
    console.log('Last Message:', json.runnerStatus.lastMessage);
  } else {
    console.log('Error:', json.error);
  }
}

main().catch(console.error);
