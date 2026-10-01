const SUPA_URL='https://ejlhqayuwjtyvwddirwg.supabase.co';
const SUPA_KEY='sb_publishable_oqT3kZb75wHtNK8UTC4f6A_zAt3IGVE';

let product=null,images=[],imageIndex=0,qty=1,settings={},deliveryRates=[],selectedOptions={},lastOrderText='';

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('fr-DZ',{maximumFractionDigits:0}).format(Number(n)||0)+' DA';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const apiHeaders=()=>({'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'});
const apiGet=async(path)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),10000);try{const r=await fetch(SUPA_URL+path,{headers:apiHeaders(),signal:c.signal});const body=await r.text();if(!r.ok)throw new Error(body||('HTTP '+r.status));return body?JSON.parse(body):null}finally{clearTimeout(t)}};
const apiPost=async(path,payload)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),15000);try{const r=await fetch(SUPA_URL+path,{method:'POST',headers:apiHeaders(),body:JSON.stringify(payload),signal:c.signal});const body=await r.text();if(!r.ok)throw new Error(body||('HTTP '+r.status));return body?JSON.parse(body):null}finally{clearTimeout(t)}};
const toast=m=>{const el=$('toast');if(!el)return;el.textContent=m;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)};
const storageUrl=path=>path?SUPA_URL+'/storage/v1/object/public/product-images/'+path:null;

function showError(message){$('productContent').hidden=true;$('productState').hidden=false;$('productState').classList.add('error');$('productState').textContent=message}

async function loadProduct(id){
  const rows=await apiGet('/rest/v1/products?id=eq.'+encodeURIComponent(id)+'&is_active=eq.true&select=*');
  if(!Array.isArray(rows)||!rows.length)throw new Error('Produit introuvable');
  product=rows[0];
  if(product.category_id){
    const cats=await apiGet('/rest/v1/categories?id=eq.'+encodeURIComponent(product.category_id)+'&select=id,name,slug');
    product.categories=Array.isArray(cats)&&cats.length?cats[0]:null;
  }
}

async function loadSupportData(){
  const [s,d,g]=await Promise.all([
    apiGet('/rest/v1/site_settings?select=key,value'),
    apiGet('/rest/v1/delivery_rates?is_active=eq.true&select=wilaya_code,wilaya_name,delivery_price_dzd&order=wilaya_code'),
    apiGet('/rest/v1/product_images?product_id=eq.'+encodeURIComponent(product.id)+'&select=*&order=sort_order,created_at')
  ]);
  settings={};(s||[]).forEach(x=>settings[x.key]=x.value);
  deliveryRates=d||[];
  images=(g||[]).map(x=>({id:x.id,url:storageUrl(x.storage_path),alt:x.alt_text||product.name,variant_color:x.variant_color||null}));
  if(product.image_url&&!images.some(x=>x.url===product.image_url))images.unshift({url:product.image_url,alt:product.name,variant_color:null});
}

function render(){
  $('productState').hidden=true;$('productContent').hidden=false;
  document.title=product.name+' — TOP 1';$('pageTitle').textContent=product.name+' — TOP 1';
  $('metaDescription').setAttribute('content',(product.description||'Découvrez '+product.name)+' — TOP 1 Algérie.');
  $('productName').textContent=product.name;
  $('productCategory').textContent=product.categories?.name||'Produit';
  $('productSku').textContent=product.sku?'SKU · '+product.sku:'';
  $('productBadge').hidden=!product.is_featured;
  $('productDescriptionShort').textContent=(product.description||'').split(/\n+/)[0]||'Découvrez les détails de ce produit TOP 1.';
  $('productPrice').textContent=money(product.price_dzd);
  if(product.compare_at_price_dzd&&Number(product.compare_at_price_dzd)>Number(product.price_dzd)){$('productCompare').textContent=money(product.compare_at_price_dzd);$('productCompare').hidden=false}else $('productCompare').hidden=true;
  const stock=Number(product.stock_qty||0);
  $('stockMessage').textContent=stock>0?(stock<5?'Plus que '+stock+' en stock.':'Disponible en stock.'):'Rupture de stock';
  $('stockMessage').classList.toggle('out',stock<=0);
  $('addToCart').disabled=stock<=0;
  $('qtyPlus').disabled=stock<=0;
  renderVariantOptions();renderImages();
  $('fullDescription').textContent=product.description||'Aucune description détaillée pour le moment.';
  renderSpecs(product.specifications||{});
  $('year').textContent=new Date().getFullYear();
  $('qtyValue').textContent=qty;
  updateOrderCalculator();
}

function normalizeOptions(){const v=product?.variant_options||{};return{sizes:Array.isArray(v.sizes)?v.sizes.filter(Boolean):[],colors:Array.isArray(v.colors)?v.colors.filter(Boolean):[]}}
function requiredOptionsComplete(){const v=normalizeOptions();return(!v.sizes.length||!!selectedOptions.size)&&(!v.colors.length||!!selectedOptions.color)}

function renderVariantOptions(){
  const v=normalizeOptions(),groups=[];
  if(v.sizes.length)groups.push({key:'size',label:'Taille',values:v.sizes});
  if(v.colors.length)groups.push({key:'color',label:'Couleur',values:v.colors});
  const box=$('variantOptions');selectedOptions={};
  if(!groups.length){box.innerHTML='';$('addToCart').disabled=Number(product.stock_qty||0)<=0;updateOrderCalculator();return}
  box.innerHTML=groups.map(g=>'<div class="variant-group"><div class="variant-label">'+g.label+'</div><div class="variant-choices">'+g.values.map((value,i)=>'<div class="variant-choice"><input type="radio" id="opt-'+g.key+'-'+i+'" name="option-'+g.key+'" value="'+esc(value)+'"><label for="opt-'+g.key+'-'+i+'">'+esc(value)+'</label></div>').join('')+'</div></div>').join('')+'<div class="variant-hint" id="variantHint">Veuillez sélectionner '+groups.map(g=>g.label.toLowerCase()).join(' et ')+'.</div>';
  box.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
    const type=input.name.replace('option-','');selectedOptions[type]=input.value;
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
  const match=images.find(im=>im.variant_color===color);if(!match)return;
  const index=images.indexOf(match);if(index>=0){imageIndex=index;showImage();refreshThumbs()}
}
function renderImages(){
  const strip=$('thumbnailStrip');
  if(!images.length){$('mainImage').hidden=true;$('mainPlaceholder').hidden=false;$('imageCounter').hidden=true;$('prevImage').disabled=true;$('nextImage').disabled=true;strip.innerHTML='';return}
  $('mainImage').hidden=false;$('mainPlaceholder').hidden=true;$('imageCounter').hidden=images.length<2;$('prevImage').disabled=images.length<2;$('nextImage').disabled=images.length<2;showImage();
  strip.innerHTML=images.map((im,i)=>'<button class="thumb-btn '+(i===imageIndex?'active':'')+'" data-i="'+i+'" type="button" aria-label="Photo '+(i+1)+'"><img src="'+esc(im.url)+'" alt="'+esc(im.alt)+'"></button>').join('');
  strip.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{imageIndex=Number(b.dataset.i);showImage();refreshThumbs()});
}
function showImage(){if(!images.length)return;const im=images[imageIndex];$('mainImage').src=im.url;$('mainImage').alt=im.alt;$('imageCounter').textContent=(imageIndex+1)+' / '+images.length}
function refreshThumbs(){$('thumbnailStrip').querySelectorAll('.thumb-btn').forEach((b,i)=>b.classList.toggle('active',i===imageIndex))}
function renderSpecs(specs){const rows=Object.entries(specs).filter(([k,v])=>String(v).trim()!=='');$('specTable').innerHTML=rows.length?rows.map(([k,v])=>'<div class="spec-row"><span>'+esc(k)+'</span><span>'+esc(v)+'</span></div>').join(''):'<div class="spec-empty">Les spécifications seront ajoutées prochainement.</div>'}

function populateProductWilayas(){
  const select=$('productWilaya');
  select.innerHTML='<option value="">Choisissez votre wilaya</option>'+deliveryRates.map(r=>'<option value="'+esc(r.wilaya_code)+'">'+esc(r.wilaya_code)+' — '+esc(r.wilaya_name)+'</option>').join('');
  select.onchange=updateOrderCalculator;
}
function selectedProductDelivery(){return deliveryRates.find(r=>r.wilaya_code===$('productWilaya').value)||null}
function updateOrderPreview(){
  const img=(selectedOptions.color&&images.find(im=>im.variant_color===selectedOptions.color)?.url)||product.image_url||images[0]?.url||null;
  $('miniProductName').textContent=product.name;$('miniProductQty').textContent=qty;$('miniProductLine').textContent=money(Number(product.price_dzd||0)*qty);
  const opts=[];if(selectedOptions.size)opts.push('Taille : '+selectedOptions.size);if(selectedOptions.color)opts.push('Couleur : '+selectedOptions.color);$('miniProductOptions').textContent=opts.join(' · ');
  if(img){$('miniProductImage').src=img;$('miniProductImage').hidden=false;$('miniProductPlaceholder').hidden=true}else{$('miniProductImage').hidden=true;$('miniProductPlaceholder').hidden=false}
}
function updateBuyButton(){$('buyNow').textContent='ACHETER MAINTENANT — '+($('orderTotalPrice').textContent||money(product?.price_dzd||0));$('buyNow').disabled=false}
function updateOrderCalculator(){
  if(!product)return;
  const subtotal=Number(product.price_dzd||0)*qty,rate=selectedProductDelivery();
  $('orderProductPrice').textContent=money(subtotal);updateOrderPreview();
  if(!rate||rate.delivery_price_dzd===null||rate.delivery_price_dzd===undefined){
    $('orderDeliveryPrice').textContent='?';$('orderTotalPrice').textContent=money(subtotal);
    $('orderDeliveryHint').textContent=$('productWilaya').value?'Tarif Yalidine non configuré pour cette wilaya.':'Sélectionnez votre wilaya pour calculer la livraison.';
    updateBuyButton();return;
  }
  const delivery=Number(rate.delivery_price_dzd);$('orderDeliveryPrice').textContent=money(delivery);$('orderTotalPrice').textContent=money(subtotal+delivery);
  $('orderDeliveryHint').textContent='Expédition Yalidine vers '+rate.wilaya_name+' : '+money(delivery);
  updateBuyButton();
}

function orderSummaryText(data,form){const rate=selectedProductDelivery();return 'TOP 1 — Commande #'+(data?.order_number||'')+'\nProduit : '+product.name+' × '+qty+'\n'+(selectedOptions.size?'Taille : '+selectedOptions.size+'\n':'')+(selectedOptions.color?'Couleur : '+selectedOptions.color+'\n':'')+'Client : '+form.get('customer_name')+'\nTéléphone : '+form.get('phone')+'\nWilaya : '+(data?.wilaya||rate?.wilaya_name||'')+'\nPrix produits : '+money(data?.subtotal_dzd)+'\nLivraison Yalidine : '+money(data?.delivery_dzd)+'\nTotal : '+money(data?.total_dzd)}

function setupOrderValidation(){
  const form=$('productOrderForm');
  if(!form)return;
  const fields=[
    {selector:'[name="customer_name"]',message:'Veuillez entrer votre nom complet.'},
    {selector:'[name="phone"]',message:'Veuillez entrer votre numéro de téléphone.'},
    {selector:'[name="wilaya"]',message:'Veuillez sélectionner votre wilaya.'}
  ];
  fields.forEach(({selector,message})=>{
    const field=form.querySelector(selector);
    if(!field)return;
    const setMessage=()=>{if(!String(field.value||'').trim())field.setCustomValidity(message);else field.setCustomValidity('')};
    field.addEventListener('invalid',setMessage);
    field.addEventListener('input',()=>{field.setCustomValidity('')});
    field.addEventListener('change',()=>{field.setCustomValidity('')});
  });
}
function validateOrderForm(){
  const form=$('productOrderForm');
  if(!form)return false;
  const name=form.elements.customer_name, phone=form.elements.phone, wilaya=form.elements.wilaya;
  [name,phone,wilaya].forEach(x=>x?.setCustomValidity(''));
  if(!String(name.value||'').trim()){name.setCustomValidity('Veuillez entrer votre nom complet.');name.reportValidity();return false}
  if(!String(phone.value||'').trim()){phone.setCustomValidity('Veuillez entrer votre numéro de téléphone.');phone.reportValidity();return false}
  if(!String(wilaya.value||'').trim()){wilaya.setCustomValidity('Veuillez sélectionner votre wilaya.');wilaya.reportValidity();return false}
  return true;
}
async function submitProductOrder(e){
  e.preventDefault();
  if(!validateOrderForm())return;
  if(!requiredOptionsComplete()){toast('Sélectionnez les options du produit avant de commander.');return}
  const form=e.target,fd=new FormData(form),rate=selectedProductDelivery();
  if(!rate||rate.delivery_price_dzd===null||rate.delivery_price_dzd===undefined){toast('Choisissez une wilaya avec un tarif Yalidine configuré.');return}
  $('buyNow').disabled=false;$('buyNow').textContent='ENREGISTREMENT EN COURS…';
  try{
    const data=await apiPost('/rest/v1/rpc/place_order',{p_customer_name:String(fd.get('customer_name')),p_phone:String(fd.get('phone')),p_wilaya:String(fd.get('wilaya')),p_commune:'',p_address:'',p_notes:'',p_items:[{product_id:product.id,quantity:qty,selected_options:{...selectedOptions}}]});
    lastOrderText=orderSummaryText(data,fd);$('successOrderNumber').textContent='#'+(data?.order_number||'');$('successSummary').textContent=lastOrderText;$('orderSuccess').hidden=false;form.hidden=true;
    const phone=(settings.whatsapp_phone||'213000000000').replace(/\D/g,'');$('successWhatsapp').href='https://wa.me/'+phone;
    toast('Commande enregistrée #'+(data?.order_number||''));
  }catch(err){console.error(err);toast('Impossible d’enregistrer la commande.');updateOrderCalculator()}
}
function copyOrderSummary(){if(!lastOrderText)return;const finish=()=>toast('Récapitulatif copié');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(lastOrderText).then(finish).catch(()=>{fallbackCopy();finish()});else{fallbackCopy();finish()}}
function fallbackCopy(){const area=document.createElement('textarea');area.value=lastOrderText;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}
function updateCartCount(){const cart=getCart();$('cartCount').textContent=cart.reduce((s,i)=>s+Number(i.qty||0),0)}
function getCart(){try{return JSON.parse(localStorage.getItem('top1_cart')||'[]')}catch{return[]}}
function saveCart(c){localStorage.setItem('top1_cart',JSON.stringify(c))}
function addToCart(){
  const stock=Number(product.stock_qty||0);if(stock<=0)return toast('Produit indisponible.');if(!requiredOptionsComplete())return toast('Sélectionnez les options du produit.');
  const cart=getCart(),key=JSON.stringify(selectedOptions),hit=cart.find(x=>x.id===product.id&&JSON.stringify(x.selected_options||{})===key);
  if(hit)hit.qty=Math.min(stock,Number(hit.qty)+qty);else cart.push({id:product.id,name:product.name,price:Number(product.price_dzd),image_url:product.image_url||images[0]?.url||null,qty,selected_options:{...selectedOptions}});
  saveCart(cart);updateCartCount();toast('Produit ajouté au panier');
}

function updateContact(){const phone=(settings.whatsapp_phone||'213000000000').replace(/\D/g,'');$('whatsappFooter').href='https://wa.me/'+phone;$('whatsappProduct').href='https://wa.me/'+phone;$('successWhatsapp').href='https://wa.me/'+phone}

function attachEvents(){
  $('prevImage').onclick=()=>{if(!images.length)return;imageIndex=(imageIndex-1+images.length)%images.length;showImage();refreshThumbs()};
  $('nextImage').onclick=()=>{if(!images.length)return;imageIndex=(imageIndex+1)%images.length;showImage();refreshThumbs()};
  $('qtyMinus').onclick=()=>{qty=Math.max(1,qty-1);$('qtyValue').textContent=qty;updateOrderCalculator()};
  $('qtyPlus').onclick=()=>{const stock=Number(product?.stock_qty||0);qty=Math.min(stock||1,qty+1);$('qtyValue').textContent=qty;updateOrderCalculator()};
  $('addToCart').onclick=addToCart;
  $('productOrderForm').onsubmit=submitProductOrder;
  $('copyOrder').onclick=copyOrderSummary;
  setupOrderValidation();
}

async function loadRelatedProducts(){
  try{
    const rows=await apiGet('/rest/v1/products?is_active=eq.true&id=neq.'+encodeURIComponent(product.id)+'&select=id,name,price_dzd,image_url,categories(name)&order=is_featured.desc,created_at.desc&limit=4');
    if(!rows?.length)return;
    $('relatedSection').hidden=false;
    $('relatedGrid').innerHTML=rows.map(p=>'<article class="related-card"><a href="product.html?id='+encodeURIComponent(p.id)+'"><div class="related-image">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'">':'<div class="related-placeholder">TOP 1</div>')+'</div><div class="related-info"><small>'+esc(p.categories?.name||'Produit')+'</small><h3>'+esc(p.name)+'</h3><strong>'+money(p.price_dzd)+'</strong></div></a></article>').join('');
  }catch(err){console.warn('Related products error',err)}
}

async function boot(){
  try{
    attachEvents();
    const id=new URLSearchParams(location.search).get('id');
    if(!id){showError('Produit introuvable.');return}
    await loadProduct(id);
    render();
    try{await loadSupportData();render();}catch(err){console.warn('Support data error',err)}
    populateProductWilayas();
    updateOrderCalculator();
    updateContact();
    loadRelatedProducts();
    updateCartCount();
  }catch(err){
    console.error('TOP 1 product boot error',err);
    showError('Impossible de charger le produit. Actualisez la page.');
  }
}

document.addEventListener('DOMContentLoaded',boot);
