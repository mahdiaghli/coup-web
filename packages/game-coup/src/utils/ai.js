// توابع کمکی ساده برای تصمیم‌گیری ربات
export function aiChoiceWeight(weights){
  const sum = weights.reduce((s,w)=>s+w,0);
  let r = Math.random()*sum;
  for(let i=0;i<weights.length;i++){
    if(r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length-1;
}