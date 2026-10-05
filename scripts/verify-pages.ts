async function test() {
  const res = await fetch('http://localhost:3001/results');
  console.log('/results status:', res.status);
  const text = await res.text();
  console.log('/results has Dynamic Results Matrix Table:', text.includes('Dynamic Results Matrix Table'));

  const resCol = await fetch('http://localhost:3001/collection');
  console.log('/collection status:', resCol.status);
  const textCol = await resCol.text();
  console.log('/collection has REAL CCSU Mode:', textCol.includes('REAL CCSU Mode'));
  console.log('/collection has MOCK Mode:', textCol.includes('MOCK Mode'));
  console.log('/collection has Verification Panel text:', textCol.includes('SOURCE:'));
}
test().catch(console.error);
