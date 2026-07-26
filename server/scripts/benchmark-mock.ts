const n_plus_1 = async (items: any[]) => {
  // Simulate db call
  for(const item of items) {
    await new Promise(r => setTimeout(r, 10)); // 10ms per query
  }
}

const in_array = async (items: any[]) => {
  // Simulate 1 db call for all
  await new Promise(r => setTimeout(r, 15)); // 15ms for slightly larger query
}

async function benchmark() {
  const items = Array.from({length: 20}).map((_, i) => i);

  const start1 = Date.now();
  await n_plus_1(items);
  const end1 = Date.now();

  const start2 = Date.now();
  await in_array(items);
  const end2 = Date.now();

  console.log(`N+1 Query Time (simulated): ${end1 - start1}ms`);
  console.log(`IN Array Query Time (simulated): ${end2 - start2}ms`);
  console.log(`Speedup: ${((end1 - start1) / (end2 - start2)).toFixed(2)}x`);
}
benchmark();
