let active=false;

// Native dialog supplies focus trapping and Escape without blocking the browser.
function ask(message, initial) {
  if(active)return Promise.resolve(null);
  active=true;
  const previous=document.activeElement;
  const dialog=document.createElement('dialog');dialog.className='studio-dialog';
  dialog.setAttribute('aria-labelledby','studio-dialog-title');
  const form=document.createElement('form');form.method='dialog';
  const title=document.createElement('h2');title.id='studio-dialog-title';
  title.textContent=initial===undefined?'Confirm change':'Edit photograph';
  const label=document.createElement('p');label.id='studio-dialog-message';label.textContent=message;
  dialog.setAttribute('aria-describedby',label.id);form.append(title,label);
  let input;
  if(initial!==undefined){
    input=document.createElement('input');input.type='text';input.value=initial;
    input.setAttribute('aria-labelledby',label.id);form.append(input);
  }
  const actions=document.createElement('div');actions.className='studio-dialog-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent='Cancel';
  const submit=document.createElement('button');submit.type='submit';submit.className='btn';submit.textContent=input?'Save':'Continue';
  actions.append(cancel,submit);form.append(actions);dialog.append(form);document.body.append(dialog);
  return new Promise(resolve=>{
    let answer=null;
    cancel.addEventListener('click',()=>dialog.close());
    form.addEventListener('submit',event=>{event.preventDefault();answer=input?input.value:true;dialog.close();});
    dialog.addEventListener('close',()=>{dialog.remove();active=false;if(previous?.isConnected)previous.focus({preventScroll:true});resolve(answer);},{once:true});
    dialog.showModal();(input||cancel).focus();input?.select();
  });
}
export async function confirmChange(message){return (await ask(message))===true;}
export function promptValue(message,value=''){return ask(message,value);}
