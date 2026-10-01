fetch('https://fooddelivery-ryjf.onrender.com/').then(r=>r.text()).then(h => {
  const m = h.match(/src=\"(\/assets\/index-[^\"]*\.js)\"/);
  if(m){
    fetch('https://fooddelivery-ryjf.onrender.com'+m[1]).then(r=>r.text()).then(js => {
      console.log(js.includes('Delivery: ₹30') ? 'HARDCODED 30 FOUND' : 'NO HARDCODED 30');
      console.log(js.includes('deliveryFee??30') || js.includes('deliveryFee ?? 30') || js.includes('deliveryFee') ? 'DYNAMIC FOUND' : 'NO DYNAMIC');
      process.exit(0);
    });
  } else {
    console.log("No js bundle found");
  }
});
