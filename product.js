let product=null,images=[],imageIndex=0,qty=1,settings={},deliveryRates=[],selectedOptions={},lastOrderText='';

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('fr-DZ',{maximumFractionDigits:0}).format(Number(n)||0)+' DA';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const toast=m=>{const el=$('toast');if(!el)return;el.textContent=m;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)};
const imgUrl=path=>path?supabaseClient.storage.from('product-images').getPublicUrl(path).data.publicUrl:null;

function showError(message){$('productContent').hidden=true;$('productState').hidden=false;$('productState').textContent=message;$('productState').classList.add('error')}

async function loadProduct(id){
  const r=await supabaseClient.from('products').select('*').eq('id',id).eq('is_active',true).single();
  if(r.error||!r.data) throw r.error||new Error('Product not found');
  product=r.data;
  if(product.category_id){
    const c=await supabaseClient.from('categories').select('name,slug').eq('id',product.category_id).maybeSingle();
    product.categories=c.data||null;
  }
}

async function loadSupportData(){
  const [s,d,g]=await Promise.all([
    supabaseClient.from('site_settings').select('key,value'),
    supabaseClient.from('delivery_rates').select('wilaya_code,wilaya_name,delivery_price_dzd').eq('is_active',true).order('wilaya_code'),
    supabaseClient.from('product_images').select('*').eq('product_id',product.id).order('sort_order').order('created_at')
  ]);
  if(!s.error)(s.data||[]).forEach(x=>settings[x.key]=x.value);
  if(!d.error)deliveryRates=d.data||[];
  if(!g.error)images=(g.data||[]).map(x=>({id:x.id,url:imgUrl(x.storage_path),alt:x.alt_text||product.name,variant_color:x.variant_color||null}));
  if(product.image_url&&!images.some(x=>x.url===product.image_url))images.unshift({url:product.image_url,alt:product.name});
}

function render(){
  $('productState').hidden=true;
  $('productContent').hidden=false;
  document.title=product.name+' — TOP 1';
  $('pageTitle').textContent=product.name+' — TOP 1';
  $('metaDescription').setAttribute('content',(product.description||'Découvrez '+product.name)+' — TOP 1 Algérie.');
  $('productName').textContent=product.name;
  $('productCategory').textContent=product.categories?.name||'Produit';
  $('productSku').textContent=product.sku?'SKU · '+product.sku:'';
  $('productBadge').hidden=!product.is_featured;
  $('productDescriptionShort').textContent=(product.description||'').split(/\n+/)[0]||'Découvrez les détails de ce produit TOP 1.';
  $('productPrice').textContent=money(product.price_dzd);
  if(product.compare_at_price_dzd&&Number(product.compare_at_price_dzd)>Number(product.price_dzd)){ $('productCompare').textContent=money(product.compare_at_price_dzd);$('productCompare').hidden=false } else $('productCompare').hidden=true;
  const stock=Number(product.stock_qty||0);
  $('stockMessage').textContent=stock>0?(stock<5?'Plus que '+stock+' en stock.':'Disponible en stock.'):'Rupture de stock';
  $('stockMessage').classList.toggle('out',stock<=0);
  $('addToCart').disabled=stock<=0;
  $('qtyPlus').disabled=stock<=0;
  renderVariantOptions();
  renderImages();
  $('fullDescription').textContent=product.description||'Aucune description détaillée pour le moment.';
  renderSpecs(product.specifications||{});
  $('year').textContent=new Date().getFullYear();
  $('qtyValue').textContent=qty;
  updateOrderCalculator();
}

function normalizeOptions(){
  const v=product?.variant_options||{};
  return {
    sizes:Array.isArray(v.sizes)?v.sizes.filter(Boolean):[],
    colors:Array.isArray(v.colors)?v.colors.filter(Boolean):[]
  };
}

function requiredOptionsComplete(){
  const v=normalizeOptions();
  return (!v.sizes.length||!!selectedOptions.size)&&(!v.colors.length||!!selectedOptions.color);
}

function renderVariantOptions(){
  const v=normalizeOptions();
  const groups=[];
  if(v.sizes.length)groups.push({key:'size',label:'Taille',values:v.sizes});
  if(v.colors.length)groups.push({key:'color',label:'Couleur',values:v.colors});
  const box=$('variantOptions');
  selectedOptions={};
  if(!groups.length){box.innerHTML='';$('addToCart').disabled=Number(product.stock_qty||0)<=0;return}
  box.innerHTML=groups.map(g=>'<div class="variant-group"><div class="variant-label">'+g.label+'</div><div class="variant-choices">'+g.values.map((value,i)=>'<div class="variant-choice"><input type="radio" id="opt-'+g.key+'-'+i+'" name="option-'+g.key+'" value="'+esc(value)+'"><label for="opt-'+g.key+'-'+i+'">'+esc(value)+'</label></div>').join('')+'</div></div>').join('')+'<div class="variant-hint" id="variantHint">Veuillez sélectionner '+groups.map(g=>g.label.toLowerCase()).join(' et ')+'.</div>';
  box.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
    const type=input.name.replace('option-','');
    selectedOptions[type]=input.value;
    if(type==='color')selectColorImage(input.value);
    const missing=groups.filter(g=>!selectedOptions[g.key]);
    $('variantHint').textContent=missing.length?'Veuillez sélectionner '+missing.map(g=>g.label.toLowerCase()).join(' et ')+'.':'Sélection complète ✓';
    $('variantHint').style.color=missing.length?'#8c5c2d':'#396c4b';
    $('addToCart').disabled=missing.length>0||Number(product.stock_qty||0)<=0;
    updateOrderCalculator();
  }));
  $('addToCart').disabled=true;
}

function selectColorImage(color){
  const match=images.find(im=>im.variant_color===color);
  if(!match)return;
  const index=images.indexOf(match);
  if(index>=0){imageIndex=index;showImage();refreshThumbs()}
}

function renderImages(){
  const strip=$('thumbnailStrip');
  if(!images.length){
    $('mainImage').hidden=true;$('mainPlaceholder').hidden=false;$('imageCounter').hidden=true;
    $('prevImage').disabled=true;$('nextImage').disabled=true;strip.innerHTML='';return;
  }
  $('mainImage').hidden=false;$('mainPlaceholder').hidden=true;
  $('imageCounter').hidden=images.length<2;$('prevImage').disabled=images.length<2;$('nextImage').disabled=images.length<2;
  showImage();
  strip.innerHTML=images.map((im,i)=>'<button class="thumb-btn '+(i===imageIndex?'active':'')+'" data-i="'+i+'" aria-label="Photo '+(i+1)+'"><img src="'+esc(im.url)+'" alt="'+esc(im.alt)+'"></button>').join('');
  strip.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{imageIndex=Number(b.dataset.i);showImage();refreshThumbs()}));
}

function showImage(){
  if(!images.length)return;
  const im=images[imageIndex];
  $('mainImage').src=im.url;
  $('mainImage').alt=im.alt;
  $('imageCounter').textContent=(imageIndex+1)+' / '+images.length;
}

function refreshThumbs(){ $('thumbnailStrip').querySelectorAll('.thumb-btn').forEach((b,i)=>b.classList.toggle('active',i===imageIndex)) }

function renderSpecs(specs){
  const rows=Object.entries(specs).filter(([k,v])=>String(v).trim()!=='');
  $('specTable').innerHTML=rows.length?rows.map(([k,v])=>'<div class="spec-row"><span>'+esc(k)+'</span><span>'+esc(v)+'</span></div>').join(''):'<div class="spec-empty">Les spécifications seront ajoutées prochainement.</div>';
}

function populateProductWilayas(){
  const select=$('productWilaya');
  select.innerHTML='<option value="">Choisissez votre wilaya</option>'+deliveryRates.map(r=>'<option value="'+esc(r.wilaya_code)+'">'+esc(r.wilaya_code)+' — '+esc(r.wilaya_name)+'</option>').join('');
  select.addEventListener('change',updateOrderCalculator);
}

function selectedProductDelivery(){return deliveryRates.find(r=>r.wilaya_code===$('productWilaya').value)||null}

function updateOrderPreview(){
  if(!product)return;
  const colorImage=selectedOptions.color?images.find(im=>im.variant_color===selectedOptions.color):null;
  const img=colorImage?.url||product.image_url||images[0]?.url||null;
  $('miniProductName').textContent=product.name;
  $('miniProductQty').textContent=qty;
  $('miniProductLine').textContent=money(Number(product.price_dzd||0)*qty);
  const opts=[];if(selectedOptions.size)opts.push('Taille : '+selectedOptions.size);if(selectedOptions.color)opts.push('Couleur : '+selectedOptions.color);
  $('miniProductOptions').textContent=opts.join(' · ');
  if(img){$('miniProductImage').src=img;$('miniProductImage').hidden=false;$('miniProductPlaceholder').hidden=true}else{$('miniProductImage').hidden=true;$('miniProductPlaceholder').hidden=false}
}

function updateBuyButton(){
  $('buyNow').textContent='ACHETER MAINTENANT — '+($('orderTotalPrice').textContent||money(product?.price_dzd||0));
}

function updateOrderCalculator(){
  if(!product)return;
  const subtotal=Number(product.price_dzd||0)*qty;
  const rate=selectedProductDelivery();
  $('orderProductPrice').textContent=money(subtotal);
  updateOrderPreview();
  if(!rate||rate.delivery_price_dzd===null||rate.delivery_price_dzd===undefined){
    $('orderDeliveryPrice').textContent='?';
    $('orderTotalPrice').textContent=money(subtotal);
    $('orderDeliveryHint').textContent=$('productWilaya').value?'Tarif Yalidine non configuré pour cette wilaya.':'Sélectionnez votre wilaya pour calculer la livraison.';
    $('buyNow').disabled=!requiredOptionsComplete()||!$('productWilaya').value;
    updateBuyButton();return;
  }
  const delivery=Number(rate.delivery_price_dzd);
  $('orderDeliveryPrice').textContent=money(delivery);
  $('orderTotalPrice').textContent=money(subtotal+delivery);
  $('orderDeliveryHint').textContent='Expédition Yalidine vers '+rate.wilaya_name+' : '+money(delivery);
  $('buyNow').disabled=!requiredOptionsComplete();
  updateBuyButton();
}

function orderSummaryText(data,form){
  const rate=selectedProductDelivery();
  return 'TOP 1 — Commande #'+(data?.order_number||'')+'\nProduit : '+product.name+' × '+qty+'\n'+(selectedOptions.size?'Taille : '+selectedOptions.size+'\n':'')+(selectedOptions.color?'Couleur : '+selectedOptions.color+'\n':'')+'Client : '+form.get('customer_name')+'\nTéléphone : '+form.get('phone')+'\nWilaya : '+(data?.wilaya||rate?.wilaya_name||'')+'\nPrix produits : '+money(data?.subtotal_dzd)+'\nLivraison Yalidine : '+money(data?.delivery_dzd)+'\nTotal : '+money(data?.total_dzd);
}

async function submitProductOrder(e){
  e.preventDefault();
  if(!requiredOptionsComplete()){toast('Sélectionnez la taille et la couleur.');return}
  const form=e.target,fd=new FormData(form),rate=selectedProductDelivery();
  if(!rate||rate.delivery_price_dzd===null||rate.delivery_price_dzd===undefined){toast('Choisissez une wilaya avec un tarif Yalidine configuré.');return}
  $('buyNow').disabled=true;$('buyNow').textContent='Enregistrement...';
  const {data,error}=await supabaseClient.rpc('place_order',{p_customer_name:String(fd.get('customer_name')),p_phone:String(fd.get('phone')),p_wilaya:String(fd.get('wilaya')),p_commune:'',p_address:'',p_notes:'',p_items:[{product_id:product.id,quantity:qty,selected_options:{...selectedOptions}}]});
  if(error){console.error(error);toast(error.message||'Impossible de créer la commande.');updateOrderCalculator();return}
  lastOrderText=orderSummaryText(data,fd);
  $('successOrderNumber').textContent='#'+(data?.order_number||'');
  $('successSummary').textContent=lastOrderText;
  $('orderSuccess').hidden=false;
  form.hidden=true;
  $('successWhatsapp').href='https://wa.me/'+((settings.whatsapp_phone||'213000000000').replace(/\D/g,''));
  toast('Commande enregistrée #'+(data?.order_number||''));
}

function copyOrderSummary(){
  if(!lastOrderText)return;
  const copy=navigator.clipboard?.writeText;
  if(copy)copy.call(navigator.clipboard,lastOrderText).then(()=>toast('Récapitulatif copié')).catch(fallbackCopy);else fallbackCopy();
}
function fallbackCopy(){const area=document.createElement('textarea');area.value=lastOrderText;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();toast('Récapitulatif copié')}

function getCart(){try{return JSON.parse(localStorage.getItem('top1_cart')||'[]')}catch{return[]}}
function saveCart(c){localStorage.setItem('top1_cart',JSON.stringify(c))}
function renderProductCart(){
  const cart=getCart(),box=$('productCartItems');
  $('cartCount').textContent=cart.reduce((s,i)=>s+Number(i.qty||0),0);
  $('productCartTotal').textContent=money(cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0));
  if(!cart.length){box.innerHTML='<div class="product-cart-empty">Votre panier est vide.</div>';return}
  box.innerHTML=cart.map((i,idx)=>'<div class="product-cart-row"><div class="product-cart-thumb">'+(i.image_url?'<img src="'+esc(i.image_url)+'" alt="">':'<span>TOP 1</span>')+'</div><div class="product-cart-copy"><strong>'+esc(i.name)+'</strong>'+(i.selected_options&&Object.keys(i.selected_options).length?'<small>'+Object.entries(i.selected_options).map(([k,v])=>escapeOptionLabel(k)+': '+esc(v)).join(' · ')+'</small>':'')+'<small>'+money(i.price)+'</small><div class="product-cart-qty"><button type="button" data-cart-minus="'+idx+'">−</button><b>'+i.qty+'</b><button type="button" data-cart-plus="'+idx+'">+</button></div></div><strong>'+money(Number(i.price)*Number(i.qty))+'</strong></div>').join('');
  box.querySelectorAll('[data-cart-minus]').forEach(b=>b.onclick=()=>changeProductCartQty(Number(b.dataset.cartMinus),-1));
  box.querySelectorAll('[data-cart-plus]').forEach(b=>b.onclick=()=>changeProductCartQty(Number(b.dataset.cartPlus),1));
}
function escapeOptionLabel(k){return k==='size'?'Taille':'Couleur'}
function changeProductCartQty(index,delta){const cart=getCart(),item=cart[index];if(!item)return;item.qty=Number(item.qty)+delta;if(item.qty<=0)cart.splice(index,1);saveCart(cart);renderProductCart()}
function openProductCart(){renderProductCart();$('productCartDrawer').classList.add('open');$('productCartOverlay').classList.add('open');$('productCartDrawer').setAttribute('aria-hidden','false')}
function closeProductCart(){$('productCartDrawer').classList.remove('open');$('productCartOverlay').classList.remove('open');$('productCartDrawer').setAttribute('aria-hidden','true')}
function goToProductOrder(){closeProductCart();$('productOrderForm').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>{const first=$('productWilaya');if(first&&!first.value)first.focus()},450)}
function updateCartCount(){renderProductCart()}

function updateContact(){
  const phone=(settings.whatsapp_phone||'213000000000').replace(/\D/g,'');
  $('whatsappFooter').href='https://wa.me/'+phone;
  $('whatsappProduct').href='https://wa.me/'+phone;
  $('successWhatsapp').href='https://wa.me/'+phone;
}

$('prevImage').onclick=()=>{if(!images.length)return;imageIndex=(imageIndex-1+images.length)%images.length;showImage();refreshThumbs()};
$('nextImage').onclick=()=>{if(!images.length)return;imageIndex=(imageIndex+1)%images.length;showImage();refreshThumbs()};
$('qtyMinus').onclick=()=>{qty=Math.max(1,qty-1);$('qtyValue').textContent=qty;updateOrderCalculator()};
$('qtyPlus').onclick=()=>{const stock=Number(product?.stock_qty||0);qty=Math.min(stock||1,qty+1);$('qtyValue').textContent=qty;updateOrderCalculator()};
$('addToCart').onclick=()=>{
  const stock=Number(product.stock_qty||0);
  if(stock<=0)return toast('Produit indisponible.');
  if(!requiredOptionsComplete())return toast('Sélectionnez les options du produit.');
  const cart=getCart(),key=JSON.stringify(selectedOptions),hit=cart.find(x=>x.id===product.id&&JSON.stringify(x.selected_options||{})===key);
  if(hit)hit.qty=Math.min(stock,Number(hit.qty)+qty);
  else cart.push({id:product.id,name:product.name,price:Number(product.price_dzd),image_url:product.image_url||images[0]?.url||null,qty,selected_options:{...selectedOptions}});
  saveCart(cart);renderProductCart();toast('Produit ajouté au panier');
};
$('productOrderForm').onsubmit=submitProductOrder;
$('copyOrder').onclick=copyOrderSummary;
$('productCartBtn').onclick=openProductCart;
$('closeProductCart').onclick=closeProductCart;
$('productCartOverlay').onclick=closeProductCart;
$('productCartCheckout').onclick=goToProductOrder;

async function boot(){
  try{
    const id=new URLSearchParams(location.search).get('id');
    if(!id){showError('Produit introuvable.');return}
    await loadProduct(id);
    render();
    $('productContent').hidden=false;
    try{await loadSupportData();render();populateProductWilayas();updateOrderCalculator();updateContact()}catch(err){console.warn('Optional store data error',err)}
  }catch(err){
    console.error('TOP 1 product page fatal load',err);
    showError('Impossible de charger ce produit. Vérifiez votre connexion puis actualisez la page.');
  }
  updateCartCount();
}
window.addEventListener('error',e=>console.error('TOP 1 runtime error',e.error||e.message));
boot();
