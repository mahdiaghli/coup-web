// نقش‌ها و تصاویر کارت
export const ROLE_KEYS = ['Duke','Assassin','Captain','Ambassador','Contessa'];
export const ROLE_LABELS = {
  Duke: 'دوک',
  Assassin: 'آدم‌کش',
  Captain: 'کاپیتان',
  Ambassador: 'سفیر',
  Contessa: 'کنتسا'
};
export const ROLE_IMAGES = {
  Duke: '/cards/duke.png',
  Assassin: '/cards/assassin.png',
  Captain: '/cards/captain.png',
  Ambassador: '/cards/ambassador.png',
  Contessa: '/cards/contessa.png'
};

export function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

export function newDeck(){
  const deck=[];
  ROLE_KEYS.forEach(r=>{
    for(let i=0;i<3;i++) deck.push(r);
  });
  return shuffle(deck);
}

export function drawOne(state){
  // state: {deck: []} — تابع ساده برای بیرون کشیدن کارت
  if(!state.deck || state.deck.length===0){
    state.deck = shuffle(newDeck());
  }
  return state.deck.pop();
}

export function makeBotName(i){ return `ربات ${i}`; }