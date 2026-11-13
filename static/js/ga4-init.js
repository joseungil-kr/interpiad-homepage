(() => {
 const id=document.currentScript?.dataset.ga4Id;
 if (!/^G-[A-Z0-9]+$/.test(id||'') || !['interpiad.com','www.interpiad.com'].includes(location.hostname) || (/^\/tools\/.+/.test(location.pathname) || /^\/pdf-compress(\/|$)/.test(location.pathname))) return;
 window.dataLayer=window.dataLayer||[];
 function gtag(){window.dataLayer.push(arguments);}
 gtag('js',new Date());
 gtag('config',id,{page_location:location.origin+location.pathname});
 const script=document.createElement('script');
 script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;
 document.head.appendChild(script);
})();
