const PRODUCTS = [
  {id:1, title:'Veste Workwear Essential', cat:'Workwear', price:6900, tag:'NOUVEAU', type:'work', icon:'🧥'},
  {id:2, title:'Pantalon de travail Pro', cat:'Workwear', price:5200, tag:'POPULAIRE', type:'work', icon:'👖'},
  {id:3, title:'Chemise Daily Studio', cat:'Vêtements', price:3900, tag:'NOUVEAU', type:'fashion', icon:'👕'},
  {id:4, title:'Lampe décorative Aura', cat:'Maison', price:4800, tag:'ÉDITION', type:'home', icon:'💡'},
  {id:5, title:'Set cuisine Everyday', cat:'Maison & Cuisine', price:3200, tag:'PRATIQUE', type:'kitchen', icon:'🍴'},
  {id:6, title:'Kit créatif Mini Maker', cat:'Jouets', price:2700, tag:'KIDS', type:'toy', icon:'🧩'},
  {id:7, title:'Sweat Urban Layer', cat:'Vêtements', price:4500, tag:'ESSENTIEL', type:'fashion', icon:'🧢'},
  {id:8, title:'Boîte rangement Home', cat:'Maison', price:2300, tag:'BEST', type:'home', icon:'🏠'}
];

let cart = JSON.parse(localStorage.getItem('top1_cart') || '[]');
const els = {grid:document.getElementById('productGrid'), count:document.getElementById('cartCount'), drawer:document.getElementById('cartDrawer'), overlay:document.getElementById('overlay'), items:document.getElementById('cartItems'), total:document.getElementById('cartTotal'), toast:document.getElementById('toast')};
const money = n => new Intl.NumberFormat('fr-DZ').format(n) + ' DA';

function renderProducts(filter='Tous', query=''){
  const q = query.trim().toLowerCase();
  const list = PRODUCTS.filter(p => (filter==='Tous' || p.cat===filter) && (!q || p.title.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)));
  els.grid.innerHTML = list.length ? list.map(p=>`
    <article class="product-card">
      <div class="product-art ${p.type}"><span class="badge">${p.tag}</span><div class="shape">${p.icon}</div></div>
      <div class="product-info"><small>${p.cat.toUpperCase()}</small><h3>${p.title}</h3><div class="product-meta"><span class="price">${money(p.price)}</span><button class="add-btn" onclick="addToCart(${p.id})">Ajouter +</button></div></div>
    </article>`).join('') : '<div style="grid-column:1/-1;padding:30px 0;color:#777">Aucun produit trouvé.</div>';
}

function saveCart(){ localStorage.setItem('top1_cart', JSON.stringify(cart)); }
function renderCart(){
  els.count.textContent = cart.reduce((s,i)=>s+i.qty,0);
  if(!cart.length){ els.items.innerHTML='<div style="padding:30px 0;color:#777;text-align:center">Votre panier est vide.</div>'; els.total.textContent='0 DA'; return; }
  els.items.innerHTML = cart.map(i=>`<div class="cart-row"><div class="cart-thumb">${i.icon}</div><div><h4>${i.title}</h4><small>${money(i.price)}</small><div class="qty"><button onclick="changeQty(${i.id},-1)">−</button><b>${i.qty}</b><button onclick="changeQty(${i.id},1)">+</button></div></div><strong>${money(i.price*i.qty)}</strong></div>`).join('');
  els.total.textContent = money(cart.reduce((s,i)=>s+i.price*i.qty,0));
}
function addToCart(id){ const p=PRODUCTS.find(x=>x.id===id); const hit=cart.find(x=>x.id===id); if(hit) hit.qty++; else cart.push({...p,qty:1}); saveCart(); renderCart(); showToast(`${p.title} ajouté au panier`); }
function changeQty(id,delta){ const i=cart.find(x=>x.id===id); if(!i) return; i.qty+=delta; if(i.qty<=0) cart=cart.filter(x=>x.id!==id); saveCart(); renderCart(); }
function openCart(){ els.drawer.classList.add('open'); els.overlay.classList.add('open'); els.drawer.setAttribute('aria-hidden','false'); }
function closeCart(){ els.drawer.classList.remove('open'); els.overlay.classList.remove('open'); els.drawer.setAttribute('aria-hidden','true'); }
function showToast(msg){ els.toast.textContent=msg; els.toast.classList.add('show'); setTimeout(()=>els.toast.classList.remove('show'),2200); }
function checkout(){
  if(!cart.length){ showToast('Ajoutez au moins un produit.'); return; }
  const phone='213000000000';
  const lines=cart.map(i=>`• ${i.title} x${i.qty} — ${money(i.price*i.qty)}`).join('%0A');
  const total=money(cart.reduce((s,i)=>s+i.price*i.qty,0));
  const msg=`Bonjour TOP 1, je souhaite commander :%0A${lines}%0A%0ATotal : ${total}%0A%0ANom :%0ATéléphone :%0AWilaya / commune :%0AAdresse :`;
  window.open(`https://wa.me/${phone}?text=${msg}`,'_blank');
}

document.getElementById('cartBtn').addEventListener('click',openCart);
document.getElementById('closeCart').addEventListener('click',closeCart);
els.overlay.addEventListener('click',closeCart);
document.getElementById('checkoutBtn').addEventListener('click',checkout);
document.getElementById('searchBtn').addEventListener('click',()=>{const bar=document.getElementById('searchBar'); bar.hidden=!bar.hidden; if(!bar.hidden)document.getElementById('searchInput').focus();});
document.getElementById('searchInput').addEventListener('input',e=>renderProducts('Tous',e.target.value));
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderProducts(btn.dataset.filter,document.getElementById('searchInput').value)}));
document.querySelectorAll('.category-card').forEach(btn=>btn.addEventListener('click',()=>{document.querySelector('#featured').scrollIntoView({behavior:'smooth'}); const f=btn.dataset.category==='Maison & Cuisine'?'Tous':btn.dataset.category; const target=[...document.querySelectorAll('.filter')].find(b=>b.dataset.filter===f); if(target) target.click();}));
document.getElementById('newsletterForm').addEventListener('submit',e=>{e.preventDefault(); showToast('Merci ! Vous êtes inscrit.'); e.target.reset();});
document.getElementById('mobileMenuBtn').addEventListener('click',()=>document.getElementById('mainNav').classList.toggle('open'));
document.getElementById('year').textContent=new Date().getFullYear();
document.getElementById('whatsappFooter').addEventListener('click',e=>{e.preventDefault(); window.open('https://wa.me/213000000000','_blank');});
renderProducts(); renderCart();